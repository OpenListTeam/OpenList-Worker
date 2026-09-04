import {
  StorageDriver,
  FileItem,
  calcFileType,
} from "../../internal/driver/base"
import { Driver123OpenAddition, File123 } from "./types"
import { Client123Open } from "./util"

const DEFAULT_ROOT = "0"

function parseTime(s?: string): string {
  if (!s) return new Date().toISOString()
  // "2006-01-02 15:04:05" (UTC+8)
  const t = new Date(s.replace(" ", "T") + "+08:00")
  return isNaN(t.getTime()) ? new Date().toISOString() : t.toISOString()
}

export class Driver123Open implements StorageDriver {
  private client: Client123Open
  private pathCache = new Map<string, string>()

  constructor(addition: Driver123OpenAddition) {
    this.client = new Client123Open(addition)
  }

  async init(): Promise<void> {
    await this.client.init()
  }

  private fileToItem(f: File123): FileItem {
    const isDir = f.type === 1
    return {
      name: f.filename,
      size: f.size || 0,
      is_dir: isDir,
      modified: parseTime(f.update_at),
      sign: "",
      type: calcFileType(f.filename, isDir),
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
            item.raw_url = await this.client.getDownloadUrl(file.fileId)
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

  async mkdir(_virtualPath: string, physicalPath: string): Promise<void> {
    const parts = physicalPath.split("/").filter(Boolean)
    const name = parts.pop() || "new_folder"
    const parentPath = "/" + parts.join("/")
    const parentId = await this.resolveDirId(parentPath)
    await this.client.mkdir(parentId, name)
    this.pathCache.clear()
  }

  async rename(
    _virtualPath: string,
    physicalPath: string,
    newName: string,
  ): Promise<void> {
    const entry = await this.resolveEntry(physicalPath)
    await this.client.rename(entry.id, newName)
    this.pathCache.clear()
  }

  async remove(
    _virtualPath: string,
    physicalPath: string,
    _names: string[],
  ): Promise<void> {
    const entry = await this.resolveEntry(physicalPath)
    await this.client.remove(entry.id)
    this.pathCache.clear()
  }

  async move(
    _srcDir: string,
    dstDir: string,
    _names: string[],
    srcPhysical: string,
    _dstPhysical: string,
  ): Promise<void> {
    const entry = await this.resolveEntry(srcPhysical)
    const dstId = await this.resolveDirId(dstDir)
    await this.client.move(entry.id, dstId)
    this.pathCache.clear()
  }

  async copy(): Promise<void> {
    throw new Error("[123Open] copy not supported")
  }

  async put(): Promise<void> {
    throw new Error("[123Open] upload not supported in stateless environment")
  }

  private async resolveDirId(physicalPath: string): Promise<string> {
    const clean = physicalPath.split("/").filter(Boolean).join("/")
    if (!clean) return DEFAULT_ROOT
    if (this.pathCache.has(clean)) return this.pathCache.get(clean)!

    const parts = clean.split("/")
    let currentId = DEFAULT_ROOT
    for (let i = 0; i < parts.length; i++) {
      const files = await this.client.getFiles(currentId)
      const target = files.find((f) => f.type === 1 && f.filename === parts[i])
      if (!target) throw new Error(`[123Open] Directory '${parts[i]}' not found`)
      currentId = String(target.fileId)
      const subPath = "/" + parts.slice(0, i + 1).join("/")
      this.pathCache.set(subPath, currentId)
    }
    return currentId
  }

  private async resolveEntry(physicalPath: string): Promise<{ id: number; isDir: boolean }> {
    const parts = physicalPath.split("/").filter(Boolean)
    const name = parts[parts.length - 1]
    const parentPath = "/" + parts.slice(0, -1).join("/")
    const parentId = await this.resolveDirId(parentPath)
    const files = await this.client.getFiles(parentId)
    const file = files.find((f) => f.filename === name)
    if (!file) throw new Error(`[123Open] '${name}' not found`)
    return { id: file.fileId, isDir: file.type === 1 }
  }
}
