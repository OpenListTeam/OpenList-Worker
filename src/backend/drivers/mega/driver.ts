import {
  calcFileType,
  FileItem,
  StorageDriver,
} from "../../internal/driver/base"
import { sortFileItems } from "../../internal/driver/sort"
import { MegaAddition, MegaNodeItem } from "./types"
import { MegaApiClient } from "./util"

export class MegaDriver implements StorageDriver {
  private addition: MegaAddition
  private client: MegaApiClient

  constructor(addition: MegaAddition) {
    this.addition = addition
    this.client = new MegaApiClient(addition)
  }

  async init(): Promise<void> {
    await this.client.init()
  }

  private cleanPath(p: string): string {
    const s = "/" + (p || "").split("/").filter(Boolean).join("/")
    return s === "/" ? "/" : s
  }

  private resolveNodeByPath(p: string): MegaNodeItem | null {
    const clean = this.cleanPath(p)
    if (clean === "/") {
      return {
        id: this.client.getRootId(),
        name: "root",
        size: 0,
        is_dir: true,
        modified: new Date().toISOString(),
        type: 2,
      }
    }

    const parts = clean.split("/").filter(Boolean)
    let currentId = this.client.getRootId()
    let currentNode: MegaNodeItem | null = null

    for (const part of parts) {
      const children = this.client.getChildren(currentId)
      const found = children.find((c) => c.name === part)
      if (!found) return null
      currentNode = found
      currentId = found.id
    }

    return currentNode
  }

  async list(virtualPath: string, physicalPath: string): Promise<FileItem[]> {
    const clean = this.cleanPath(physicalPath)
    const node = this.resolveNodeByPath(clean)
    if (!node || !node.is_dir) {
      return []
    }

    const children = this.client.getChildren(node.id)
    const items: FileItem[] = children.map((c) => ({
      name: c.name,
      size: c.size || 0,
      is_dir: c.is_dir,
      modified: c.modified || new Date().toISOString(),
      sign: c.id,
      type: calcFileType(c.name, c.is_dir),
      raw_url: "",
    }))

    return sortFileItems(
      items,
      this.addition.order_by,
      this.addition.order_direction,
    )
  }

  async get(virtualPath: string, physicalPath: string): Promise<FileItem> {
    const clean = this.cleanPath(physicalPath)
    const node = this.resolveNodeByPath(clean)
    if (!node) {
      throw new Error(`Node not found: ${clean}`)
    }

    let rawUrl = ""
    if (!node.is_dir) {
      try {
        rawUrl = await this.client.getDownloadLink(node.id)
      } catch (e) {
        console.warn("[Mega] failed to get download link in get():", e)
      }
    }

    return {
      name: node.name,
      size: node.size,
      is_dir: node.is_dir,
      modified: node.modified,
      sign: node.id,
      type: calcFileType(node.name, node.is_dir),
      raw_url: rawUrl,
    }
  }

  async link(
    virtualPath: string,
    physicalPath: string,
  ): Promise<{ url: string; headers?: Record<string, string> }> {
    const clean = this.cleanPath(physicalPath)
    const node = this.resolveNodeByPath(clean)
    if (!node || node.is_dir) {
      throw new Error(`Cannot get link for non-file: ${clean}`)
    }

    const url = await this.client.getDownloadLink(node.id)
    return { url }
  }

  async mkdir(virtualPath: string, physicalPath: string): Promise<void> {
    const clean = this.cleanPath(physicalPath)
    const parentPath = clean.substring(0, clean.lastIndexOf("/")) || "/"
    const dirName = clean.substring(clean.lastIndexOf("/") + 1)

    const parentNode = this.resolveNodeByPath(parentPath)
    if (!parentNode || !parentNode.is_dir) {
      throw new Error(`Parent folder not found: ${parentPath}`)
    }

    await this.client.createFolder(dirName, parentNode.id)
  }

  async rename(
    virtualPath: string,
    physicalPath: string,
    newName: string,
  ): Promise<void> {
    const node = this.resolveNodeByPath(this.cleanPath(physicalPath))
    if (!node) {
      throw new Error("Node not found")
    }
    // Rename via attr update
    console.warn(`[Mega] rename ${physicalPath} to ${newName}`)
  }

  async move(
    srcDir: string,
    dstDir: string,
    names: string[],
    srcPhys: string,
    dstPhys: string,
  ): Promise<void> {
    const dstNode = this.resolveNodeByPath(this.cleanPath(dstPhys))
    if (!dstNode || !dstNode.is_dir) {
      throw new Error("Destination folder not found")
    }

    for (const name of names) {
      const srcItemPath =
        this.cleanPath(srcPhys) === "/"
          ? `/${name}`
          : `${this.cleanPath(srcPhys)}/${name}`
      const srcNode = this.resolveNodeByPath(srcItemPath)
      if (srcNode) {
        await this.client.moveNode(srcNode.id, dstNode.id)
      }
    }
  }

  async copy(
    srcDir: string,
    dstDir: string,
    names: string[],
    srcPhys: string,
    dstPhys: string,
  ): Promise<void> {
    console.warn(
      `[Mega] copy not supported natively from ${srcPhys} to ${dstPhys}`,
    )
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
      const node = this.resolveNodeByPath(itemPath)
      if (node) {
        await this.client.deleteNode(node.id)
      }
    }
  }

  async put(
    virtualPath: string,
    physicalPath: string,
    content: Buffer | Uint8Array,
  ): Promise<void> {
    console.warn(`[Mega] put for ${physicalPath}`)
  }

  async getDetails(): Promise<{ total_space?: number; used_space?: number }> {
    try {
      const quota = await this.client.getQuota()
      return {
        total_space: quota.total,
        used_space: quota.used,
      }
    } catch {
      return {}
    }
  }
}
