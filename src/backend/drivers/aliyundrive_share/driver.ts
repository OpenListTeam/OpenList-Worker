import {
  calcFileType,
  FileItem,
  StorageDriver,
} from "../../internal/driver/base"
import { sortFileItems } from "../../internal/driver/sort"
import { AliyundriveShareAddition } from "./types"
import { AliyundriveShareApiClient } from "./util"

export class AliyundriveShareDriver implements StorageDriver {
  private addition: AliyundriveShareAddition
  private client: AliyundriveShareApiClient

  constructor(addition: AliyundriveShareAddition) {
    this.addition = addition
    this.client = new AliyundriveShareApiClient(addition)
  }

  async init(): Promise<void> {
    await this.client.init()
  }

  private cleanPath(p: string): string {
    const s = "/" + (p || "").split("/").filter(Boolean).join("/")
    return s === "/" ? "/" : s
  }

  private async resolveFileId(physicalPath: string): Promise<string> {
    const clean = this.cleanPath(physicalPath)
    if (clean === "/") {
      return this.addition.root_folder_id || "root"
    }

    const parts = clean.split("/").filter(Boolean)
    let currentId = this.addition.root_folder_id || "root"

    for (const part of parts) {
      const files = await this.client.getFiles(currentId)
      const folder = files.find((f) => f.type === "folder" && f.name === part)
      if (folder) {
        currentId = folder.file_id
      } else {
        break
      }
    }

    return currentId
  }

  async list(virtualPath: string, physicalPath: string): Promise<FileItem[]> {
    const clean = this.cleanPath(physicalPath)
    const parentId = await this.resolveFileId(clean)
    const files = await this.client.getFiles(parentId)

    const items: FileItem[] = files.map((f) => {
      const isDir = f.type === "folder"
      return {
        name: f.name,
        size: isDir ? 0 : f.size || 0,
        is_dir: isDir,
        modified: f.updated_at || f.created_at || new Date().toISOString(),
        sign: f.file_id,
        type: calcFileType(f.name, isDir),
        thumb: f.thumbnail,
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
    const parentId = await this.resolveFileId(parentPath)
    const files = await this.client.getFiles(parentId)

    const found = files.find((f) => f.name === name)
    if (!found) {
      throw new Error(`File not found: ${clean}`)
    }

    const isDir = found.type === "folder"
    let rawUrl = ""
    if (!isDir) {
      try {
        rawUrl = await this.client.getDownloadUrl(found.file_id)
      } catch (e) {
        console.warn(
          "[AliyundriveShare] failed to get download url in get():",
          e,
        )
      }
    }

    return {
      name: found.name,
      size: isDir ? 0 : found.size || 0,
      is_dir: isDir,
      modified:
        found.updated_at || found.created_at || new Date().toISOString(),
      sign: found.file_id,
      type: calcFileType(found.name, isDir),
      thumb: found.thumbnail,
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
    const parentId = await this.resolveFileId(parentPath)
    const files = await this.client.getFiles(parentId)

    const found = files.find((f) => f.name === name)
    if (!found || found.type === "folder") {
      throw new Error(`Cannot get link for: ${physicalPath}`)
    }

    const url = await this.client.getDownloadUrl(found.file_id)
    return {
      url,
      headers: {
        Referer: "https://www.aliyundrive.com/",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    }
  }

  async mkdir(virtualPath: string, physicalPath: string): Promise<void> {
    throw new Error("Aliyundrive Share is read-only")
  }

  async rename(
    virtualPath: string,
    physicalPath: string,
    newName: string,
  ): Promise<void> {
    throw new Error("Aliyundrive Share is read-only")
  }

  async remove(
    virtualPath: string,
    physicalPath: string,
    names: string[],
  ): Promise<void> {
    throw new Error("Aliyundrive Share is read-only")
  }

  async move(
    srcDir: string,
    dstDir: string,
    names: string[],
    srcPhys: string,
    dstPhys: string,
  ): Promise<void> {
    throw new Error("Aliyundrive Share is read-only")
  }

  async copy(
    srcDir: string,
    dstDir: string,
    names: string[],
    srcPhys: string,
    dstPhys: string,
  ): Promise<void> {
    throw new Error("Aliyundrive Share is read-only")
  }

  async put(
    virtualPath: string,
    physicalPath: string,
    content: Buffer | Uint8Array,
  ): Promise<void> {
    throw new Error("Aliyundrive Share is read-only")
  }
}
