import {
  StorageDriver,
  FileItem,
  calcFileType,
} from "../../internal/driver/base"
import { DriverOpenlistShareAddition, OLShareFile } from "./types"
import { ClientOpenlistShare } from "./util"

function fileToItem(f: OLShareFile): FileItem {
  return {
    name: f.name,
    size: f.size || 0,
    is_dir: f.is_dir,
    modified: f.modified || new Date().toISOString(),
    sign: f.sign || "",
    type: calcFileType(f.name, f.is_dir),
    thumb: f.thumb || "",
    raw_url: "",
  }
}

/** 规范化路径（根为 "/"） */
function normPath(p: string): string {
  if (!p || p === "/") return "/"
  return p.startsWith("/") ? p : "/" + p
}

export class DriverOpenlistShare implements StorageDriver {
  private client: ClientOpenlistShare

  constructor(addition: DriverOpenlistShareAddition) {
    this.client = new ClientOpenlistShare(addition)
  }

  async init(): Promise<void> {
    this.client.init()
  }

  async list(_virtualPath: string, physicalPath: string): Promise<FileItem[]> {
    const files = await this.client.list(normPath(physicalPath))
    return files.map(fileToItem)
  }

  async get(_virtualPath: string, physicalPath: string): Promise<FileItem> {
    const path = normPath(physicalPath)
    const parts = path.split("/").filter(Boolean)
    const name = parts[parts.length - 1] || "root"
    const parentPath = "/" + parts.slice(0, -1).join("/")

    try {
      const files = await this.client.list(
        parentPath === "//" ? "/" : parentPath,
      )
      const target = files.find((f) => f.name === name)
      if (target) {
        const item = fileToItem(target)
        if (!item.is_dir) {
          item.raw_url = this.client.downloadUrl(path)
        }
        return item
      }
    } catch {
      // fall through
    }

    return {
      name,
      size: 0,
      is_dir: true,
      modified: new Date().toISOString(),
      sign: "",
      type: 1,
      raw_url: "",
    }
  }

  async mkdir(): Promise<void> {
    throw new Error("[OpenListShare] read-only share, mkdir not supported")
  }

  async rename(): Promise<void> {
    throw new Error("[OpenListShare] read-only share, rename not supported")
  }

  async remove(): Promise<void> {
    throw new Error("[OpenListShare] read-only share, remove not supported")
  }

  async move(): Promise<void> {
    throw new Error("[OpenListShare] read-only share, move not supported")
  }

  async copy(): Promise<void> {
    throw new Error("[OpenListShare] read-only share, copy not supported")
  }

  async put(): Promise<void> {
    throw new Error("[OpenListShare] read-only share, upload not supported")
  }
}
