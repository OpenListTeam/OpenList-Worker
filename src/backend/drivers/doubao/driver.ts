import {
  StorageDriver,
  FileItem,
  calcFileType,
} from "../../internal/driver/base"
import { DriverDoubaoAddition, DoubaoFile } from "./types"
import { ClientDoubao } from "./util"

const DEFAULT_ROOT = "0"

export class DriverDoubao implements StorageDriver {
  private client: ClientDoubao
  private pathCache = new Map<string, string>()

  constructor(addition: DriverDoubaoAddition) {
    this.client = new ClientDoubao(addition)
  }

  async init(): Promise<void> {
    await this.client.init()
  }

  private fileToItem(f: DoubaoFile): FileItem {
    const isDir = f.node_type === 1
    return {
      name: f.name,
      size: f.size || 0,
      is_dir: isDir,
      modified: f.update_time
        ? new Date(f.update_time * 1000).toISOString()
        : new Date().toISOString(),
      sign: "",
      type: calcFileType(f.name, isDir),
      raw_url: "",
    }
  }

  async list(_virtualPath: string, physicalPath: string): Promise<FileItem[]> {
    const dirId = await this.resolveDirId(physicalPath)
    const files = await this.client.getFiles(dirId)
    return files.map((f) => this.fileToItem(f))
  }

  async get(_virtualPath: string, physicalPath: string): Promise<FileItem> {
    const parts = physicalPath.split("/").filter(Boolean)
    const rawName = parts[parts.length - 1] || "root"
    const parentPath = "/" + parts.slice(0, -1).join("/")
    try {
      const parentId = await this.resolveDirId(parentPath)
      const files = await this.client.getFiles(parentId)
      const file = files.find((f) => f.name === rawName)
      if (file) {
        const item = this.fileToItem(file)
        if (!item.is_dir) {
          try {
            item.raw_url = await this.client.getDownloadUrl(file)
            item.raw_url_headers = this.client.downloadHeaders()
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
    const nodeId = await this.resolveDirId(physicalPath)
    await this.client.rename(nodeId, newName)
    this.pathCache.clear()
  }

  async remove(
    _virtualPath: string,
    physicalPath: string,
    _names: string[],
  ): Promise<void> {
    const nodeId = await this.resolveDirId(physicalPath)
    await this.client.remove(nodeId)
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
    await this.client.move(entry.id, entry.parentId, dstId)
    this.pathCache.clear()
  }

  async copy(): Promise<void> {
    throw new Error("[Doubao] copy not supported")
  }

  async put(): Promise<void> {
    throw new Error("[Doubao] upload not supported in stateless environment")
  }

  private async resolveDirId(physicalPath: string): Promise<string> {
    const clean = physicalPath.split("/").filter(Boolean).join("/")
    if (!clean) return DEFAULT_ROOT
    if (this.pathCache.has(clean)) return this.pathCache.get(clean)!

    const parts = clean.split("/")
    let currentId = DEFAULT_ROOT
    for (let i = 0; i < parts.length; i++) {
      const files = await this.client.getFiles(currentId)
      const target = files.find((f) => f.node_type === 1 && f.name === parts[i])
      if (!target) throw new Error(`[Doubao] Directory '${parts[i]}' not found`)
      currentId = target.id
      const subPath = "/" + parts.slice(0, i + 1).join("/")
      this.pathCache.set(subPath, currentId)
    }
    return currentId
  }

  private async resolveEntry(physicalPath: string): Promise<{ id: string; parentId: string; isDir: boolean }> {
    const parts = physicalPath.split("/").filter(Boolean)
    const name = parts[parts.length - 1]
    const parentPath = "/" + parts.slice(0, -1).join("/")
    const parentId = await this.resolveDirId(parentPath)
    const files = await this.client.getFiles(parentId)
    const file = files.find((f) => f.name === name)
    if (!file) throw new Error(`[Doubao] '${name}' not found`)
    return { id: file.id, parentId: file.parent_id || parentId, isDir: file.node_type === 1 }
  }
}
