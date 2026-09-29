import {
  StorageDriver,
  FileItem,
  calcFileType,
} from "../../internal/driver/base"
import { sortFileItems } from "../../internal/driver/sort"
import { AliyundriveOpenAddition, AliyunFileItem } from "./types"
import { AliyunOpenClient } from "./util"

function aliyunFileToFileItem(f: AliyunFileItem): FileItem {
  const isDir = f.type === "folder"
  return {
    name: f.name,
    size: f.size || 0,
    is_dir: isDir,
    modified: f.updated_at || f.created_at || new Date().toISOString(),
    sign: "",
    type: calcFileType(f.name, isDir),
    thumb: f.thumbnail || "",
    raw_url: f.download_url || "",
  }
}

export class AliyundriveOpen implements StorageDriver {
  private client: AliyunOpenClient
  private addition: AliyundriveOpenAddition
  private pathFileIdCache = new Map<string, string>()

  constructor(addition: AliyundriveOpenAddition) {
    this.addition = addition
    this.client = new AliyunOpenClient(addition)
  }

  async init(): Promise<void> {
    await this.client.init()
  }

  async list(_virtualPath: string, physicalPath: string): Promise<FileItem[]> {
    const folderId = await this.resolveFileId(physicalPath)
    const files = await this.client.listFiles(folderId)
    const items = files.map(aliyunFileToFileItem)
    return sortFileItems(
      items,
      this.addition.order_by,
      this.addition.order_direction,
    )
  }

  async get(_virtualPath: string, physicalPath: string): Promise<FileItem> {
    const fileId = await this.resolveFileId(physicalPath)
    const file = await this.client.getFile(fileId).catch(() => null)
    const url = await this.client.getDownloadUrl(fileId).catch(() => "")

    if (file) {
      const item = aliyunFileToFileItem(file)
      item.raw_url = url || item.raw_url
      return item
    }

    // Fallback: the path may be a folder that isn't listed in its parent
    // (e.g. the storage root). Probe it by listing — if it lists, it's a folder.
    try {
      await this.client.listFiles(fileId)
      const parts = physicalPath.split("/").filter(Boolean)
      const name = parts[parts.length - 1] || "root"
      return {
        name,
        size: 0,
        is_dir: true,
        modified: new Date().toISOString(),
        sign: "",
        type: 1,
        raw_url: "",
      }
    } catch {}

    const parts = physicalPath.split("/").filter(Boolean)
    const name = parts[parts.length - 1] || "root"
    return {
      name,
      size: 0,
      is_dir: false,
      modified: new Date().toISOString(),
      sign: "",
      type: 0,
      raw_url: url,
    }
  }

  async mkdir(_virtualPath: string, physicalPath: string): Promise<void> {
    const parts = physicalPath.split("/").filter(Boolean)
    const name = parts.pop() || "新文件夹"
    const parentPath = "/" + parts.join("/")
    const parentId = await this.resolveFileId(parentPath)
    await this.client.mkdir(parentId, name)
  }

  async rename(
    _virtualPath: string,
    physicalPath: string,
    newName: string,
  ): Promise<void> {
    const fileId = await this.resolveFileId(physicalPath)
    await this.client.rename(fileId, newName)
  }

  async remove(
    _virtualPath: string,
    physicalPath: string,
    _names: string[],
  ): Promise<void> {
    const fileId = await this.resolveFileId(physicalPath)
    await this.client.remove(fileId)
  }

  async move(
    _srcDir: string,
    dstDir: string,
    _names: string[],
    srcPhysical: string,
    _dstPhysical: string,
  ): Promise<void> {
    const fileId = await this.resolveFileId(srcPhysical)
    const dstId = await this.resolveFileId(dstDir)
    await this.client.move(fileId, dstId)
  }

  async copy(
    _srcDir: string,
    dstDir: string,
    _names: string[],
    srcPhysical: string,
    _dstPhysical: string,
  ): Promise<void> {
    const fileId = await this.resolveFileId(srcPhysical)
    const dstId = await this.resolveFileId(dstDir)
    await this.client.copy(fileId, dstId)
  }

  async put(
    _virtualPath: string,
    physicalPath: string,
    content: Buffer,
  ): Promise<void> {
    const parts = physicalPath.split("/").filter(Boolean)
    const name = parts.pop() || "upload"
    const parentPath = "/" + parts.join("/")
    const parentId = await this.resolveFileId(parentPath)
    await this.client.putFile(parentId, name, content)
  }

  private async resolveFileId(physicalPath: string): Promise<string> {
    const clean = physicalPath.split("/").filter(Boolean).join("/")
    if (!clean) return this.client.getRootFolderId()
    if (this.pathFileIdCache.has(clean)) return this.pathFileIdCache.get(clean)!
    const parts = clean.split("/")
    let currentId = this.client.getRootFolderId()
    for (let i = 0; i < parts.length; i++) {
      const rawPart = parts[i]
      const decodedPart = (() => {
        try {
          return decodeURIComponent(rawPart)
        } catch {
          return rawPart
        }
      })()
      const subPath = parts.slice(0, i + 1).join("/")
      if (this.pathFileIdCache.has(subPath)) {
        currentId = this.pathFileIdCache.get(subPath)!
        continue
      }
      const items = await this.client.listFiles(currentId)
      const target = items.find(
        (f) =>
          f.name === rawPart || f.name === decodedPart || f.file_id === rawPart,
      )
      if (!target)
        throw new Error(`[AliyundriveOpen] Path '${rawPart}' not found`)
      currentId = target.file_id
      this.pathFileIdCache.set(subPath, currentId)
    }
    return currentId
  }
}
