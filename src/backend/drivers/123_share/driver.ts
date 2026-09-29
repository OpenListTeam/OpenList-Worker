import {
  calcFileType,
  FileItem,
  StorageDriver,
} from "../../internal/driver/base"
import { sortFileItems } from "../../internal/driver/sort"
import { Pan123ShareAddition, Pan123ShareFileInfo } from "./types"
import { Pan123ShareApiClient } from "./util"

export class Pan123ShareDriver implements StorageDriver {
  private addition: Pan123ShareAddition
  private client: Pan123ShareApiClient

  constructor(addition: Pan123ShareAddition) {
    this.addition = addition
    this.client = new Pan123ShareApiClient(addition)
  }

  async init(): Promise<void> {
    await this.client.init()
  }

  private cleanPath(p: string): string {
    const s = "/" + (p || "").split("/").filter(Boolean).join("/")
    return s === "/" ? "/" : s
  }

  private async resolveParentId(physicalPath: string): Promise<string> {
    const clean = this.cleanPath(physicalPath)
    if (clean === "/") {
      return this.addition.root_folder_id || "0"
    }

    const parts = clean.split("/").filter(Boolean)
    let currentId = this.addition.root_folder_id || "0"

    for (const part of parts) {
      const files = await this.client.getFiles(currentId)
      const folder = files.find((f) => f.Type === 1 && f.FileName === part)
      if (folder) {
        currentId = String(folder.FileId)
      } else {
        break
      }
    }

    return currentId
  }

  async list(virtualPath: string, physicalPath: string): Promise<FileItem[]> {
    const clean = this.cleanPath(physicalPath)
    const parentId = await this.resolveParentId(clean)
    const files = await this.client.getFiles(parentId)

    const items: FileItem[] = files.map((f) => {
      const isDir = f.Type === 1
      return {
        name: f.FileName,
        size: isDir ? 0 : f.Size || 0,
        is_dir: isDir,
        modified: f.UpdateAt || f.CreateAt || new Date().toISOString(),
        sign: String(f.FileId),
        type: calcFileType(f.FileName, isDir),
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
    const name = clean.split("/").filter(Boolean).pop() || "root"

    if (clean === "/") {
      return {
        name: "root",
        size: 0,
        is_dir: true,
        modified: new Date().toISOString(),
        sign: "0",
        type: 1,
        raw_url: "",
      }
    }

    const parentPath = clean.substring(0, clean.lastIndexOf("/")) || "/"
    const parentId = await this.resolveParentId(parentPath)
    const files = await this.client.getFiles(parentId)

    const found = files.find((f) => f.FileName === name)
    if (!found) {
      throw new Error(`File not found: ${clean}`)
    }

    const isDir = found.Type === 1
    let rawUrl = ""
    if (!isDir) {
      try {
        rawUrl = await this.client.getDownloadUrl(found)
      } catch (e) {
        console.warn("[123Share] failed to get download url in get():", e)
      }
    }

    return {
      name: found.FileName,
      size: isDir ? 0 : found.Size || 0,
      is_dir: isDir,
      modified: found.UpdateAt || found.CreateAt || new Date().toISOString(),
      sign: String(found.FileId),
      type: calcFileType(found.FileName, isDir),
      raw_url: rawUrl,
    }
  }

  async link(
    virtualPath: string,
    physicalPath: string,
  ): Promise<{ url: string; headers?: Record<string, string> }> {
    const clean = this.cleanPath(physicalPath)
    const parentPath = clean.substring(0, clean.lastIndexOf("/")) || "/"
    const name = clean.substring(clean.lastIndexOf("/") + 1)
    const parentId = await this.resolveParentId(parentPath)
    const files = await this.client.getFiles(parentId)

    const found = files.find((f) => f.FileName === name)
    if (!found || found.Type === 1) {
      throw new Error(`Cannot get link for: ${physicalPath}`)
    }

    const url = await this.client.getDownloadUrl(found)
    return {
      url,
      headers: {
        Referer: "https://yun.123pan.com/",
      },
    }
  }

  async mkdir(virtualPath: string, physicalPath: string): Promise<void> {
    throw new Error("123Pan Share is read-only")
  }

  async rename(
    virtualPath: string,
    physicalPath: string,
    newName: string,
  ): Promise<void> {
    throw new Error("123Pan Share is read-only")
  }

  async remove(
    virtualPath: string,
    physicalPath: string,
    names: string[],
  ): Promise<void> {
    throw new Error("123Pan Share is read-only")
  }

  async move(
    srcDir: string,
    dstDir: string,
    names: string[],
    srcPhys: string,
    dstPhys: string,
  ): Promise<void> {
    throw new Error("123Pan Share is read-only")
  }

  async copy(
    srcDir: string,
    dstDir: string,
    names: string[],
    srcPhys: string,
    dstPhys: string,
  ): Promise<void> {
    throw new Error("123Pan Share is read-only")
  }

  async put(
    virtualPath: string,
    physicalPath: string,
    content: Buffer | Uint8Array,
  ): Promise<void> {
    throw new Error("123Pan Share is read-only")
  }
}
