import {
  StorageDriver,
  FileItem,
  calcFileType,
} from "../../internal/driver/base"
import { DriverMisskeyAddition } from "./types"
import { ClientMisskey } from "./util"

export class DriverMisskey implements StorageDriver {
  private client: ClientMisskey
  private pathCache = new Map<string, string>()

  constructor(addition: DriverMisskeyAddition) {
    this.client = new ClientMisskey(addition)
  }

  async init(): Promise<void> {
    await this.client.init()
  }

  async list(_virtualPath: string, physicalPath: string): Promise<FileItem[]> {
    const folderId = await this.resolveFolderId(physicalPath)
    const [files, folders] = await Promise.all([
      this.client.getFiles(folderId),
      this.client.getFolders(folderId),
    ])
    const fileItems: FileItem[] = files.map((f) => ({
      name: f.name,
      size: f.size || 0,
      is_dir: false,
      modified: f.createdAt || new Date().toISOString(),
      sign: f.id,
      type: calcFileType(f.name, false),
      raw_url: f.url || "",
      thumb: f.thumbnailUrl || "",
    }))
    const folderItems: FileItem[] = folders.map((f) => ({
      name: f.name,
      size: 0,
      is_dir: true,
      modified: f.createdAt || new Date().toISOString(),
      sign: f.id,
      type: 1,
      raw_url: "",
    }))
    return [...folderItems, ...fileItems]
  }

  async get(_virtualPath: string, physicalPath: string): Promise<FileItem> {
    const parts = physicalPath.split("/").filter(Boolean)
    const rawName = parts[parts.length - 1] || "root"
    const parentPath = "/" + parts.slice(0, -1).join("/")
    try {
      const parentId = await this.resolveFolderId(parentPath)
      const [files, folders] = await Promise.all([
        this.client.getFiles(parentId),
        this.client.getFolders(parentId),
      ])
      const file = files.find((f) => f.name === rawName)
      if (file) {
        return {
          name: file.name,
          size: file.size || 0,
          is_dir: false,
          modified: file.createdAt || new Date().toISOString(),
          sign: file.id,
          type: calcFileType(file.name, false),
          raw_url: file.url || "",
          thumb: file.thumbnailUrl || "",
        }
      }
      const folder = folders.find((f) => f.name === rawName)
      if (folder) {
        return {
          name: folder.name,
          size: 0,
          is_dir: true,
          modified: folder.createdAt || new Date().toISOString(),
          sign: folder.id,
          type: 1,
          raw_url: "",
        }
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
    await this.client.createFolder(name, parentId)
    this.pathCache.clear()
  }

  async rename(
    _virtualPath: string,
    physicalPath: string,
    newName: string,
  ): Promise<void> {
    const { id, isDir } = await this.resolveEntry(physicalPath)
    if (isDir) await this.client.updateFolder(id, { name: newName })
    else await this.client.updateFile(id, { name: newName })
    this.pathCache.clear()
  }

  async remove(
    _virtualPath: string,
    physicalPath: string,
    _names: string[],
  ): Promise<void> {
    const { id, isDir } = await this.resolveEntry(physicalPath)
    if (isDir) await this.client.deleteFolder(id)
    else await this.client.deleteFile(id)
    this.pathCache.clear()
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
    if (isDir) await this.client.updateFolder(id, { parentId: dstId })
    else await this.client.updateFile(id, { folderId: dstId })
    this.pathCache.clear()
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
    if (isDir) {
      throw new Error("[Misskey] folder copy not supported")
    }
    const file = await this.client.showFile(id)
    await this.client.uploadFromUrl(file.url, dstId)
    this.pathCache.clear()
  }

  async put(
    _virtualPath: string,
    _physicalPath: string,
    _content: Buffer,
  ): Promise<void> {
    throw new Error("[Misskey] Direct put not supported in stateless environment")
  }

  private async resolveFolderId(physicalPath: string): Promise<string | undefined> {
    const clean = physicalPath.split("/").filter(Boolean).join("/")
    if (!clean) return undefined
    if (this.pathCache.has(clean)) return this.pathCache.get(clean)

    const parts = clean.split("/")
    let currentId: string | undefined
    for (let i = 0; i < parts.length; i++) {
      const folders = await this.client.getFolders(currentId)
      const target = folders.find((f) => f.name === parts[i])
      if (!target) throw new Error(`[Misskey] Folder '${parts[i]}' not found`)
      currentId = target.id
      const subPath = "/" + parts.slice(0, i + 1).join("/")
      this.pathCache.set(subPath, currentId)
    }
    return currentId
  }

  private async resolveEntry(physicalPath: string): Promise<{ id: string; isDir: boolean }> {
    const parts = physicalPath.split("/").filter(Boolean)
    const name = parts[parts.length - 1]
    const parentPath = "/" + parts.slice(0, -1).join("/")
    const parentId = await this.resolveFolderId(parentPath)
    const [files, folders] = await Promise.all([
      this.client.getFiles(parentId),
      this.client.getFolders(parentId),
    ])
    const file = files.find((f) => f.name === name)
    if (file) return { id: file.id, isDir: false }
    const folder = folders.find((f) => f.name === name)
    if (folder) return { id: folder.id, isDir: true }
    throw new Error(`[Misskey] '${name}' not found`)
  }
}
