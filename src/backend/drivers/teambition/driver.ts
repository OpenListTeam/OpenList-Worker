import {
  StorageDriver,
  FileItem,
  calcFileType,
} from "../../internal/driver/base"
import { DriverTeambitionAddition } from "./types"
import { ClientTeambition } from "./util"

export class DriverTeambition implements StorageDriver {
  private client: ClientTeambition
  private pathCache = new Map<string, string>()

  constructor(addition: DriverTeambitionAddition) {
    this.client = new ClientTeambition(addition)
  }

  async init(): Promise<void> {
    await this.client.init()
  }

  async list(_virtualPath: string, physicalPath: string): Promise<FileItem[]> {
    const parentId = await this.pathToId(physicalPath)
    const { folders, works } = await this.client.getFiles(parentId)
    const folderItems: FileItem[] = folders.map((c) => ({
      name: c.title,
      size: 0,
      is_dir: true,
      modified: c.updated || new Date().toISOString(),
      sign: c._id,
      type: 1,
      raw_url: "",
    }))
    const workItems: FileItem[] = works.map((w) => ({
      name: w.fileName,
      size: w.fileSize || 0,
      is_dir: false,
      modified: w.updated || new Date().toISOString(),
      sign: w._id,
      type: calcFileType(w.fileName, false),
      thumb: w.thumbnail || w.thumbnailUrl || "",
      raw_url: w.downloadUrl || "",
    }))
    return [...folderItems, ...workItems]
  }

  async get(_virtualPath: string, physicalPath: string): Promise<FileItem> {
    const parts = physicalPath.split("/").filter(Boolean)
    const rawName = parts[parts.length - 1] || "root"
    const parentPath = "/" + parts.slice(0, -1).join("/")
    try {
      const parentId = await this.pathToId(parentPath)
      const { folders, works } = await this.client.getFiles(parentId)
      const folder = folders.find((c) => c.title === rawName)
      if (folder) {
        return {
          name: folder.title,
          size: 0,
          is_dir: true,
          modified: folder.updated || new Date().toISOString(),
          sign: folder._id,
          type: 1,
          raw_url: "",
        }
      }
      const work = works.find((w) => w.fileName === rawName)
      if (work) {
        let url = work.downloadUrl || ""
        if (url) {
          try {
            url = await this.client.resolveDownloadUrl(url)
          } catch {}
        }
        return {
          name: work.fileName,
          size: work.fileSize || 0,
          is_dir: false,
          modified: work.updated || new Date().toISOString(),
          sign: work._id,
          type: calcFileType(work.fileName, false),
          thumb: work.thumbnail || work.thumbnailUrl || "",
          raw_url: url,
        }
      }
    } catch {}

    // Fallback: 目录
    try {
      await this.client.getFiles(await this.pathToId(physicalPath))
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
    await this.client.mkdir(await this.pathToId(parentPath), name)
    this.pathCache.clear()
  }

  async rename(
    _virtualPath: string,
    physicalPath: string,
    newName: string,
  ): Promise<void> {
    const entry = await this.resolveEntry(physicalPath)
    await this.client.rename(entry.id, newName, entry.isDir)
    this.pathCache.clear()
  }

  async remove(
    _virtualPath: string,
    physicalPath: string,
    _names: string[],
  ): Promise<void> {
    const entry = await this.resolveEntry(physicalPath)
    await this.client.remove(entry.id, entry.isDir)
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
    await this.client.move(entry.id, await this.pathToId(dstDir), entry.isDir)
    this.pathCache.clear()
  }

  async copy(
    _srcDir: string,
    dstDir: string,
    _names: string[],
    srcPhysical: string,
    _dstPhysical: string,
  ): Promise<void> {
    const entry = await this.resolveEntry(srcPhysical)
    await this.client.copy(entry.id, await this.pathToId(dstDir), entry.isDir)
    this.pathCache.clear()
  }

  async put(): Promise<void> {
    throw new Error("[Teambition] upload not supported in stateless environment")
  }

  private async resolveEntry(physicalPath: string): Promise<{ id: string; isDir: boolean }> {
    const parts = physicalPath.split("/").filter(Boolean)
    const name = parts[parts.length - 1]
    const parentPath = "/" + parts.slice(0, -1).join("/")
    const parentId = await this.pathToId(parentPath)
    const { folders, works } = await this.client.getFiles(parentId)
    const folder = folders.find((c) => c.title === name)
    if (folder) return { id: folder._id, isDir: true }
    const work = works.find((w) => w.fileName === name)
    if (work) return { id: work._id, isDir: false }
    throw new Error(`[Teambition] '${name}' not found`)
  }

  /** 物理路径 → 目录 ID（根目录返回空串） */
  private async pathToId(physicalPath: string): Promise<string> {
    const clean = physicalPath.split("/").filter(Boolean).join("/")
    if (!clean) return ""
    if (this.pathCache.has(clean)) return this.pathCache.get(clean)!

    const parts = clean.split("/")
    let currentId = ""
    for (let i = 0; i < parts.length; i++) {
      const { folders } = await this.client.getFiles(currentId)
      const target = folders.find((c) => c.title === parts[i])
      if (!target) throw new Error(`[Teambition] Directory '${parts[i]}' not found`)
      currentId = target._id
      const subPath = "/" + parts.slice(0, i + 1).join("/")
      this.pathCache.set(subPath, currentId)
    }
    return currentId
  }
}
