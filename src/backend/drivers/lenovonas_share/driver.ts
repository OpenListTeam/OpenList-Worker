import {
  StorageDriver,
  FileItem,
  calcFileType,
} from "../../internal/driver/base"
import { DriverLenovoNasShareAddition } from "./types"
import { ClientLenovoNasShare } from "./util"

/** 只读分享驱动 */
export class DriverLenovoNasShare implements StorageDriver {
  private client: ClientLenovoNasShare

  constructor(addition: DriverLenovoNasShareAddition) {
    this.client = new ClientLenovoNasShare(addition)
  }

  async init(): Promise<void> {
    await this.client.init()
  }

  async list(_virtualPath: string, physicalPath: string): Promise<FileItem[]> {
    const files = await this.client.list(physicalPath)
    return files.map((f) => {
      const isDir = f.type === "dir"
      return {
        name: f.name,
        size: f.size || 0,
        is_dir: isDir,
        modified: f.chtime
          ? new Date(f.chtime * 1000).toISOString()
          : new Date().toISOString(),
        sign: "",
        type: calcFileType(f.name, isDir),
        raw_url: "",
      }
    })
  }

  async get(_virtualPath: string, physicalPath: string): Promise<FileItem> {
    const parts = physicalPath.split("/").filter(Boolean)
    const name = parts[parts.length - 1] || "root"
    const parentPath = "/" + parts.slice(0, -1).join("/")
    try {
      const files = await this.client.list(parentPath === "//" ? "/" : parentPath)
      const file = files.find((f) => f.name === name || f.path === physicalPath)
      if (file) {
        const isDir = file.type === "dir"
        const item: FileItem = {
          name: file.name,
          size: file.size || 0,
          is_dir: isDir,
          modified: file.chtime
            ? new Date(file.chtime * 1000).toISOString()
            : new Date().toISOString(),
          sign: "",
          type: calcFileType(file.name, isDir),
          raw_url: "",
        }
        if (!isDir) {
          item.raw_url = await this.client.getDownloadUrl(file.path)
          item.raw_url_headers = this.client.downloadHeaders()
        }
        return item
      }
    } catch {}

    // Fallback: 目录
    try {
      await this.client.list(physicalPath)
      return {
        name,
        size: 0,
        is_dir: true,
        modified: new Date().toISOString(),
        sign: "",
        type: 1,
        raw_url: "",
      }
    } catch {
      return {
        name,
        size: 0,
        is_dir: false,
        modified: new Date().toISOString(),
        sign: "",
        type: 0,
        raw_url: "",
      }
    }
  }

  async mkdir(): Promise<void> {
    throw new Error("[Lenovo NAS Share] read-only storage")
  }

  async rename(): Promise<void> {
    throw new Error("[Lenovo NAS Share] read-only storage")
  }

  async remove(): Promise<void> {
    throw new Error("[Lenovo NAS Share] read-only storage")
  }

  async move(): Promise<void> {
    throw new Error("[Lenovo NAS Share] read-only storage")
  }

  async copy(): Promise<void> {
    throw new Error("[Lenovo NAS Share] read-only storage")
  }

  async put(): Promise<void> {
    throw new Error("[Lenovo NAS Share] read-only storage")
  }
}
