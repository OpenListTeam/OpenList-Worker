import {
  calcFileType,
  FileItem,
  StorageDriver,
} from "../../internal/driver/base"
import { sortFileItems } from "../../internal/driver/sort"
import { WpsAddition, WpsFileInfo } from "./types"
import { WpsApiClient } from "./util"

interface ResolvedNode {
  kind: "root" | "group" | "folder" | "file"
  groupId: number
  fileId: number
  name: string
  isDir: boolean
  size: number
  modified: string
}

export class WpsDriver implements StorageDriver {
  private addition: WpsAddition
  private client: WpsApiClient

  constructor(addition: WpsAddition) {
    this.addition = addition
    this.client = new WpsApiClient(addition)
  }

  async init(): Promise<void> {
    await this.client.init()
  }

  private cleanPath(p: string): string {
    const s = "/" + (p || "").split("/").filter(Boolean).join("/")
    return s === "/" ? "/" : s
  }

  private async resolvePath(p: string): Promise<ResolvedNode | null> {
    const clean = this.cleanPath(p)
    if (clean === "/") {
      return {
        kind: "root",
        groupId: 0,
        fileId: 0,
        name: "root",
        isDir: true,
        size: 0,
        modified: new Date().toISOString(),
      }
    }

    const parts = clean.split("/").filter(Boolean)
    const groups = await this.client.getGroups()
    const group = groups.find((g) => g.name === parts[0])
    if (!group) return null

    const groupId = group.group_id || group.id || 0
    if (parts.length === 1) {
      return {
        kind: "group",
        groupId,
        fileId: 0,
        name: group.name,
        isDir: true,
        size: 0,
        modified: new Date().toISOString(),
      }
    }

    let currentParentId = 0
    let currentNode: ResolvedNode | null = null

    for (let i = 1; i < parts.length; i++) {
      const partName = parts[i]
      const files = await this.client.getFiles(groupId, currentParentId)
      const found: WpsFileInfo | undefined = files.find(
        (f) => f.fname === partName,
      )
      if (!found) return null

      const isDir = found.ftype === "folder"
      currentNode = {
        kind: isDir ? "folder" : "file",
        groupId,
        fileId: found.id,
        name: found.fname,
        isDir,
        size: found.fsize || 0,
        modified: found.mtime
          ? new Date(found.mtime * 1000).toISOString()
          : new Date().toISOString(),
      }
      currentParentId = found.id
    }

    return currentNode
  }

  async list(virtualPath: string, physicalPath: string): Promise<FileItem[]> {
    const clean = this.cleanPath(physicalPath)
    const node = await this.resolvePath(clean)
    if (!node || !node.isDir) {
      return []
    }

    if (node.kind === "root") {
      const groups = await this.client.getGroups()
      const items: FileItem[] = groups.map((g) => ({
        name: g.name,
        size: 0,
        is_dir: true,
        modified: new Date().toISOString(),
        sign: String(g.group_id || g.id),
        type: 1,
        raw_url: "",
      }))
      return sortFileItems(
        items,
        this.addition.order_by,
        this.addition.order_direction,
      )
    }

    const files = await this.client.getFiles(node.groupId, node.fileId)
    const items: FileItem[] = files.map((f) => {
      const isDir = f.ftype === "folder"
      return {
        name: f.fname,
        size: f.fsize || 0,
        is_dir: isDir,
        modified: f.mtime
          ? new Date(f.mtime * 1000).toISOString()
          : new Date().toISOString(),
        sign: String(f.id),
        type: calcFileType(f.fname, isDir),
        raw_url: "",
      }
    })

    return sortFileItems(
      items,
      this.addition.order_by,
      this.addition.order_direction,
    )
  }

  async get(virtualPath: string, physicalPath: string): Promise<FileItem> {
    const clean = this.cleanPath(physicalPath)
    const node = await this.resolvePath(clean)
    if (!node) {
      throw new Error(`Path not found: ${clean}`)
    }

    let rawUrl = ""
    if (!node.isDir && node.kind === "file") {
      try {
        rawUrl = await this.client.getDownloadUrl(node.groupId, node.fileId)
      } catch (e) {
        console.warn("[WPS] failed to get download url in get():", e)
      }
    }

    return {
      name: node.name,
      size: node.size,
      is_dir: node.isDir,
      modified: node.modified,
      sign: String(node.fileId || node.groupId),
      type: calcFileType(node.name, node.isDir),
      raw_url: rawUrl,
    }
  }

  async link(
    virtualPath: string,
    physicalPath: string,
  ): Promise<{ url: string; headers?: Record<string, string> }> {
    const clean = this.cleanPath(physicalPath)
    const node = await this.resolvePath(clean)
    if (!node || node.isDir || node.kind !== "file") {
      throw new Error(`Cannot get link for non-file: ${clean}`)
    }

    const url = await this.client.getDownloadUrl(node.groupId, node.fileId)
    return {
      url,
      headers: {
        "User-Agent": this.client.getUA(),
        Referer: this.client.driveHost(),
      },
    }
  }

  async mkdir(virtualPath: string, physicalPath: string): Promise<void> {
    const clean = this.cleanPath(physicalPath)
    const parentPath = clean.substring(0, clean.lastIndexOf("/")) || "/"
    const dirName = clean.substring(clean.lastIndexOf("/") + 1)

    const parentNode = await this.resolvePath(parentPath)
    if (!parentNode || !parentNode.isDir || parentNode.kind === "root") {
      throw new Error(
        `Cannot create folder directly in root (groups are read-only)`,
      )
    }

    await this.client.createFolder(
      parentNode.groupId,
      parentNode.fileId,
      dirName,
    )
  }

  async move(
    srcDir: string,
    dstDir: string,
    names: string[],
    srcPhys: string,
    dstPhys: string,
  ): Promise<void> {
    const dstNode = await this.resolvePath(this.cleanPath(dstPhys))
    if (!dstNode || !dstNode.isDir || dstNode.kind === "root") {
      throw new Error("Target destination directory not found")
    }

    for (const name of names) {
      const srcItemPath =
        this.cleanPath(srcPhys) === "/"
          ? `/${name}`
          : `${this.cleanPath(srcPhys)}/${name}`
      const srcNode = await this.resolvePath(srcItemPath)
      if (srcNode) {
        await this.client.move(
          srcNode.groupId,
          srcNode.fileId,
          dstNode.groupId,
          dstNode.fileId,
        )
      }
    }
  }

  async rename(
    virtualPath: string,
    physicalPath: string,
    newName: string,
  ): Promise<void> {
    const srcNode = await this.resolvePath(this.cleanPath(physicalPath))
    if (!srcNode) {
      throw new Error("Source node not found")
    }

    await this.client.rename(srcNode.groupId, srcNode.fileId, newName)
  }

  async copy(
    srcDir: string,
    dstDir: string,
    names: string[],
    srcPhys: string,
    dstPhys: string,
  ): Promise<void> {
    const dstNode = await this.resolvePath(this.cleanPath(dstPhys))
    if (!dstNode || !dstNode.isDir || dstNode.kind === "root") {
      throw new Error("Target destination directory not found")
    }

    for (const name of names) {
      const srcItemPath =
        this.cleanPath(srcPhys) === "/"
          ? `/${name}`
          : `${this.cleanPath(srcPhys)}/${name}`
      const srcNode = await this.resolvePath(srcItemPath)
      if (srcNode) {
        await this.client.copy(
          srcNode.groupId,
          srcNode.fileId,
          dstNode.groupId,
          dstNode.fileId,
        )
      }
    }
  }

  async remove(
    virtualPath: string,
    physicalPath: string,
    names: string[],
  ): Promise<void> {
    for (const name of names) {
      const itemPath =
        this.cleanPath(physicalPath) === "/"
          ? `/${name}`
          : `${this.cleanPath(physicalPath)}/${name}`
      const node = await this.resolvePath(itemPath)
      if (node && node.kind !== "root" && node.kind !== "group") {
        await this.client.delete(node.groupId, node.fileId)
      }
    }
  }

  async put(
    virtualPath: string,
    physicalPath: string,
    content: Buffer | Uint8Array,
  ): Promise<void> {
    // WPS direct upload requires chunked upload protocol
    const clean = this.cleanPath(physicalPath)
    const parentPath = clean.substring(0, clean.lastIndexOf("/")) || "/"
    const fileName = clean.substring(clean.lastIndexOf("/") + 1)
    const parentNode = await this.resolvePath(parentPath)
    if (!parentNode || !parentNode.isDir) {
      throw new Error(`Parent directory not found: ${parentPath}`)
    }

    // Direct upload stub
    console.warn(`[WPS] direct small upload for ${fileName}`)
  }

  async getDetails(): Promise<{ total_space?: number; used_space?: number }> {
    try {
      const usage = await this.client.getStorageDetails()
      return {
        total_space: usage.total,
        used_space: usage.used,
      }
    } catch {
      return {}
    }
  }
}
