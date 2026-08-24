import {
  calcFileType,
  FileItem,
  StorageDriver,
} from "../../internal/driver/base"
import { sortFileItems } from "../../internal/driver/sort"
import { PikPakShareAddition, PikPakShareFileItem } from "./types"
import { PikPakShareApiClient } from "./util"

export class PikPakShareDriver implements StorageDriver {
  private addition: PikPakShareAddition
  private client: PikPakShareApiClient

  constructor(addition: PikPakShareAddition) {
    this.addition = addition
    this.client = new PikPakShareApiClient(addition)
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
      return this.addition.root_folder_id || ""
    }

    const parts = clean.split("/").filter(Boolean)
    let currentId = this.addition.root_folder_id || ""

    for (const part of parts) {
      const files = await this.client.getFiles(currentId)
      const folder = files.find(
        (f) => f.kind === "drive#folder" && f.name === part,
      )
      if (folder) {
        currentId = folder.id
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
      const isDir = f.kind === "drive#folder"
      const sizeNum =
        typeof f.size === "number"
          ? f.size
          : parseInt(String(f.size || "0"), 10)

      return {
        name: f.name,
        size: isDir ? 0 : isNaN(sizeNum) ? 0 : sizeNum,
        is_dir: isDir,
        modified: f.modified_time || new Date().toISOString(),
        sign: f.id,
        type: calcFileType(f.name, isDir),
        thumb: f.thumbnail_link,
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
        sign: "root",
        type: 1,
        raw_url: "",
      }
    }

    const parentPath = clean.substring(0, clean.lastIndexOf("/")) || "/"
    const parentId = await this.resolveParentId(parentPath)
    const files = await this.client.getFiles(parentId)

    const found = files.find((f) => f.name === name)
    if (!found) {
      throw new Error(`File not found: ${clean}`)
    }

    const isDir = found.kind === "drive#folder"
    const sizeNum =
      typeof found.size === "number"
        ? found.size
        : parseInt(String(found.size || "0"), 10)

    let rawUrl = ""
    if (!isDir) {
      try {
        rawUrl = await this.client.getDownloadUrl(found)
      } catch (e) {
        console.warn("[PikPakShare] failed to get download url in get():", e)
      }
    }

    return {
      name: found.name,
      size: isDir ? 0 : isNaN(sizeNum) ? 0 : sizeNum,
      is_dir: isDir,
      modified: found.modified_time || new Date().toISOString(),
      sign: found.id,
      type: calcFileType(found.name, isDir),
      thumb: found.thumbnail_link,
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

    const found = files.find((f) => f.name === name)
    if (!found || found.kind === "drive#folder") {
      throw new Error(`Cannot get link for: ${physicalPath}`)
    }

    const url = await this.client.getDownloadUrl(found)
    return { url }
  }

  async mkdir(virtualPath: string, physicalPath: string): Promise<void> {
    throw new Error("PikPak Share is read-only")
  }

  async rename(
    virtualPath: string,
    physicalPath: string,
    newName: string,
  ): Promise<void> {
    throw new Error("PikPak Share is read-only")
  }

  async remove(
    virtualPath: string,
    physicalPath: string,
    names: string[],
  ): Promise<void> {
    throw new Error("PikPak Share is read-only")
  }

  async move(
    srcDir: string,
    dstDir: string,
    names: string[],
    srcPhys: string,
    dstPhys: string,
  ): Promise<void> {
    throw new Error("PikPak Share is read-only")
  }

  async copy(
    srcDir: string,
    dstDir: string,
    names: string[],
    srcPhys: string,
    dstPhys: string,
  ): Promise<void> {
    throw new Error("PikPak Share is read-only")
  }

  async put(
    virtualPath: string,
    physicalPath: string,
    content: Buffer | Uint8Array,
  ): Promise<void> {
    throw new Error("PikPak Share is read-only")
  }
}
