import {
  StorageDriver,
  FileItem,
  calcFileType,
} from "../../internal/driver/base"
import { DriverQuarkUcTvAddition, QuarkTvFile } from "./types"
import { ClientQuarkUcTv } from "./util"

const DEFAULT_ROOT = "0"

/** 只读驱动：仅 list + get（下载） */
export class DriverQuarkUcTv implements StorageDriver {
  private client: ClientQuarkUcTv
  private pathCache = new Map<string, string>()

  constructor(addition: DriverQuarkUcTvAddition) {
    this.client = new ClientQuarkUcTv(addition)
  }

  async init(): Promise<void> {
    await this.client.init()
  }

  private fileToItem(f: QuarkTvFile): FileItem {
    const isDir = f.isdir === 1
    return {
      name: f.filename,
      size: f.size || 0,
      is_dir: isDir,
      modified: f.updated_at
        ? new Date(f.updated_at).toISOString()
        : new Date().toISOString(),
      sign: "",
      type: calcFileType(f.filename, isDir),
      thumb: f.thumbnail_url || "",
      raw_url: "",
    }
  }

  async list(_virtualPath: string, physicalPath: string): Promise<FileItem[]> {
    const fid = await this.resolveDirId(physicalPath)
    const files = await this.client.getFiles(fid)
    return files.map((f) => this.fileToItem(f))
  }

  async get(_virtualPath: string, physicalPath: string): Promise<FileItem> {
    const parts = physicalPath.split("/").filter(Boolean)
    const rawName = parts[parts.length - 1] || "root"
    const parentPath = "/" + parts.slice(0, -1).join("/")
    try {
      const parentId = await this.resolveDirId(parentPath)
      const files = await this.client.getFiles(parentId)
      const file = files.find((f) => f.filename === rawName)
      if (file) {
        const item = this.fileToItem(file)
        if (!item.is_dir) {
          try {
            item.raw_url = await this.client.getDownloadUrl(file.fid)
          } catch (e: any) {
            item.raw_url_error = e.message
          }
        }
        return item
      }
    } catch {}

    // Fallback: 目录
    try {
      await this.resolveDirId(physicalPath)
      return {
        name: rawName,
        size: 0,
        is_dir: true,
        modified: new Date().toISOString(),
        sign: "",
        type: 1,
        raw_url: "",
      }
    } catch {
      return {
        name: rawName,
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
    throw new Error("[QuarkTV] read-only storage")
  }

  async rename(): Promise<void> {
    throw new Error("[QuarkTV] read-only storage")
  }

  async remove(): Promise<void> {
    throw new Error("[QuarkTV] read-only storage")
  }

  async move(): Promise<void> {
    throw new Error("[QuarkTV] read-only storage")
  }

  async copy(): Promise<void> {
    throw new Error("[QuarkTV] read-only storage")
  }

  async put(): Promise<void> {
    throw new Error("[QuarkTV] read-only storage")
  }

  private async resolveDirId(physicalPath: string): Promise<string> {
    const clean = physicalPath.split("/").filter(Boolean).join("/")
    if (!clean) return DEFAULT_ROOT
    if (this.pathCache.has(clean)) return this.pathCache.get(clean)!

    const parts = clean.split("/")
    let currentId = DEFAULT_ROOT
    for (let i = 0; i < parts.length; i++) {
      const files = await this.client.getFiles(currentId)
      const target = files.find((f) => f.isdir === 1 && f.filename === parts[i])
      if (!target) throw new Error(`[QuarkTV] Directory '${parts[i]}' not found`)
      currentId = target.fid
      const subPath = "/" + parts.slice(0, i + 1).join("/")
      this.pathCache.set(subPath, currentId)
    }
    return currentId
  }
}
