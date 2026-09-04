import {
  StorageDriver,
  FileItem,
  calcFileType,
} from "../../internal/driver/base"
import { DriverMediafireAddition } from "./types"
import { ClientMediafire } from "./util"

export class DriverMediafire implements StorageDriver {
  private client: ClientMediafire
  private pathCache = new Map<string, string>()

  constructor(addition: DriverMediafireAddition) {
    this.client = new ClientMediafire(addition)
  }

  async init(): Promise<void> {
    await this.client.init()
  }

  async list(_virtualPath: string, physicalPath: string): Promise<FileItem[]> {
    const folderKey = await this.resolveFolderId(physicalPath)
    const entries = await this.client.list(folderKey)
    return entries.map((e) => ({
      name: e.name,
      size: e.size,
      is_dir: e.isDir,
      modified: e.created ? new Date(e.created).toISOString() : new Date().toISOString(),
      sign: "",
      type: calcFileType(e.name, e.isDir),
      raw_url: "",
    }))
  }

  async get(_virtualPath: string, physicalPath: string): Promise<FileItem> {
    const parts = physicalPath.split("/").filter(Boolean)
    const rawName = parts[parts.length - 1] || "root"
    const parentPath = "/" + parts.slice(0, -1).join("/")
    try {
      const parentId = await this.resolveFolderId(parentPath)
      const entries = await this.client.list(parentId)
      const entry = entries.find((e) => e.name === rawName)
      if (entry) {
        const item: FileItem = {
          name: entry.name,
          size: entry.size,
          is_dir: entry.isDir,
          modified: entry.created ? new Date(entry.created).toISOString() : new Date().toISOString(),
          sign: "",
          type: calcFileType(entry.name, entry.isDir),
          raw_url: "",
        }
        if (!entry.isDir) {
          try {
            item.raw_url = await this.client.getDownloadUrl(entry.id)
          } catch (e: any) {
            item.raw_url_error = e.message
          }
        }
        return item
      }
    } catch {}

    // Fallback: 目录
    try {
      await this.resolveFolderId(physicalPath)
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
    const parentId = await this.resolveFolderId(parentPath)
    await this.client.mkdir(parentId, name)
  }

  async rename(
    _virtualPath: string,
    physicalPath: string,
    newName: string,
  ): Promise<void> {
    const { id, isDir } = await this.resolveEntry(physicalPath)
    await this.client.rename(id, newName, isDir)
  }

  async remove(
    _virtualPath: string,
    physicalPath: string,
    _names: string[],
  ): Promise<void> {
    const { id, isDir } = await this.resolveEntry(physicalPath)
    await this.client.remove(id, isDir)
  }

  async move(
    _srcDir: string,
    dstDir: string,
    _names: string[],
    srcPhysical: string,
    _dstPhysical: string,
  ): Promise<void> {
    const { id, isDir } = await this.resolveEntry(srcPhysical)
    const dstId = await this.resolveFolderId(dstDir)
    await this.client.move(id, dstId, isDir)
  }

  async copy(
    _srcDir: string,
    dstDir: string,
    _names: string[],
    srcPhysical: string,
    _dstPhysical: string,
  ): Promise<void> {
    const { id, isDir } = await this.resolveEntry(srcPhysical)
    const dstId = await this.resolveFolderId(dstDir)
    await this.client.copy(id, dstId, isDir)
  }

  async put(
    _virtualPath: string,
    _physicalPath: string,
    _content: Buffer,
  ): Promise<void> {
    throw new Error("[MediaFire] Direct put not supported in stateless environment")
  }

  /** 通过路径逐级解析文件夹 ID（根为 ""） */
  private async resolveFolderId(physicalPath: string): Promise<string> {
    const clean = physicalPath.split("/").filter(Boolean).join("/")
    if (!clean) return ""
    if (this.pathCache.has(clean)) return this.pathCache.get(clean)!

    const parts = clean.split("/")
    let currentId = ""
    for (let i = 0; i < parts.length; i++) {
      const entries = await this.client.list(currentId)
      const target = entries.find((e) => e.isDir && e.name === parts[i])
      if (!target) throw new Error(`[MediaFire] Folder '${parts[i]}' not found`)
      currentId = target.id
      const subPath = "/" + parts.slice(0, i + 1).join("/")
      this.pathCache.set(subPath, currentId)
    }
    return currentId
  }

  /** 解析文件/目录的 id 与类型 */
  private async resolveEntry(physicalPath: string): Promise<{ id: string; isDir: boolean }> {
    const parts = physicalPath.split("/").filter(Boolean)
    const name = parts[parts.length - 1]
    const parentPath = "/" + parts.slice(0, -1).join("/")
    const parentId = await this.resolveFolderId(parentPath)
    const entries = await this.client.list(parentId)
    const entry = entries.find((e) => e.name === name)
    if (!entry) throw new Error(`[MediaFire] '${name}' not found`)
    return { id: entry.id, isDir: entry.isDir }
  }
}
