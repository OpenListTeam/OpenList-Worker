import {
  calcFileType,
  FileItem,
  StorageDriver,
} from "../../internal/driver/base"
import { sortFileItems } from "../../internal/driver/sort"
import { Pan115ShareAddition, Pan115ShareItem } from "./types"
import { Pan115ShareApiClient } from "./util"

export class Pan115ShareDriver implements StorageDriver {
  private addition: Pan115ShareAddition
  private client: Pan115ShareApiClient

  constructor(addition: Pan115ShareAddition) {
    this.addition = addition
    this.client = new Pan115ShareApiClient(addition)
  }

  async init(): Promise<void> {
    await this.client.init()
  }

  private cleanPath(p: string): string {
    const s = "/" + (p || "").split("/").filter(Boolean).join("/")
    return s === "/" ? "/" : s
  }

  private async resolveCid(physicalPath: string): Promise<string> {
    const clean = this.cleanPath(physicalPath)
    if (clean === "/") {
      return this.addition.root_folder_id || "0"
    }

    const parts = clean.split("/").filter(Boolean)
    let currentCid = this.addition.root_folder_id || "0"

    for (const part of parts) {
      const files = await this.client.getFiles(currentCid)
      const folder = files.find((f) => f.is_file === 0 && f.file_name === part)
      if (folder && folder.category_id) {
        currentCid = folder.category_id
      } else {
        break
      }
    }

    return currentCid
  }

  async list(virtualPath: string, physicalPath: string): Promise<FileItem[]> {
    const clean = this.cleanPath(physicalPath)
    const cid = await this.resolveCid(clean)
    const files = await this.client.getFiles(cid)

    const items: FileItem[] = files.map((f) => {
      const isDir = f.is_file === 0
      const sizeNum =
        typeof f.file_size === "number"
          ? f.file_size
          : parseInt(String(f.file_size || "0"), 10)
      const timeNum =
        typeof f.user_utime === "number"
          ? f.user_utime
          : parseInt(String(f.user_utime || "0"), 10)
      const name = f.file_name || "file"

      return {
        name,
        size: isDir ? 0 : isNaN(sizeNum) ? 0 : sizeNum,
        is_dir: isDir,
        modified:
          timeNum > 0
            ? new Date(timeNum * 1000).toISOString()
            : new Date().toISOString(),
        sign: isDir ? f.category_id || "" : f.file_id || "",
        type: calcFileType(name, isDir),
        thumb: f.thumb_url,
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
    const parentCid = await this.resolveCid(parentPath)
    const files = await this.client.getFiles(parentCid)

    const found = files.find((f) => f.file_name === name)
    if (!found) {
      throw new Error(`File not found: ${clean}`)
    }

    const isDir = found.is_file === 0
    const sizeNum =
      typeof found.file_size === "number"
        ? found.file_size
        : parseInt(String(found.file_size || "0"), 10)
    const timeNum =
      typeof found.user_utime === "number"
        ? found.user_utime
        : parseInt(String(found.user_utime || "0"), 10)

    let rawUrl = ""
    if (!isDir && found.file_id) {
      try {
        rawUrl = await this.client.getDownloadUrl(found.file_id)
      } catch (e) {
        console.warn("[115Share] failed to get download url:", e)
      }
    }

    return {
      name: found.file_name || name,
      size: isDir ? 0 : isNaN(sizeNum) ? 0 : sizeNum,
      is_dir: isDir,
      modified:
        timeNum > 0
          ? new Date(timeNum * 1000).toISOString()
          : new Date().toISOString(),
      sign: isDir ? found.category_id || "" : found.file_id || "",
      type: calcFileType(found.file_name || name, isDir),
      thumb: found.thumb_url,
      raw_url: rawUrl,
    }
  }

  async link(
    virtualPath: string,
    physicalPath: string,
  ): Promise<{ url: string; headers?: Record<string, string> }> {
    const item = await this.get(virtualPath, physicalPath)
    if (item.is_dir) {
      throw new Error(`Cannot get link for folder: ${physicalPath}`)
    }

    const url = await this.client.getDownloadUrl(item.sign)
    return {
      url,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        Referer: "https://115.com/",
      },
    }
  }

  async mkdir(virtualPath: string, physicalPath: string): Promise<void> {
    throw new Error("115 Share is read-only")
  }

  async rename(
    virtualPath: string,
    physicalPath: string,
    newName: string,
  ): Promise<void> {
    throw new Error("115 Share is read-only")
  }

  async remove(
    virtualPath: string,
    physicalPath: string,
    names: string[],
  ): Promise<void> {
    throw new Error("115 Share is read-only")
  }

  async move(
    srcDir: string,
    dstDir: string,
    names: string[],
    srcPhys: string,
    dstPhys: string,
  ): Promise<void> {
    throw new Error("115 Share is read-only")
  }

  async copy(
    srcDir: string,
    dstDir: string,
    names: string[],
    srcPhys: string,
    dstPhys: string,
  ): Promise<void> {
    throw new Error("115 Share is read-only")
  }

  async put(
    virtualPath: string,
    physicalPath: string,
    content: Buffer | Uint8Array,
  ): Promise<void> {
    throw new Error("115 Share is read-only")
  }
}
