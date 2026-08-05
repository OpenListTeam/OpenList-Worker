import { StorageDriver, FileItem } from "../../internal/driver/base"
import { AliyundriveOpenAddition, AliyunFileItem } from "./types"
import { AliyunOpenClient } from "./util"

function aliyunFileToFileItem(f: AliyunFileItem): FileItem {
  return {
    name: f.name,
    size: f.size || 0,
    is_dir: f.type === "folder",
    modified: f.updated_at || f.created_at || new Date().toISOString(),
    sign: "",
    type: f.type === "folder" ? 1 : 0,
    thumb: f.thumbnail || "",
    raw_url: f.download_url || "",
  }
}

export class AliyundriveOpen implements StorageDriver {
  private client: AliyunOpenClient
  private pathFileIdCache = new Map<string, string>()

  constructor(addition: AliyundriveOpenAddition) {
    this.client = new AliyunOpenClient(addition)
  }

  async init(): Promise<void> {
    await this.client.init()
  }

  async list(_virtualPath: string, physicalPath: string): Promise<FileItem[]> {
    const folderId = await this.resolveFileId(physicalPath)
    const files = await this.client.listFiles(folderId)
    return files.map(aliyunFileToFileItem)
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
      const part = parts[i]
      const subPath = parts.slice(0, i + 1).join("/")
      if (this.pathFileIdCache.has(subPath)) {
        currentId = this.pathFileIdCache.get(subPath)!
        continue
      }
      const items = await this.client.listFiles(currentId)
      const target = items.find((f) => f.name === part)
      if (!target) throw new Error(`[AliyundriveOpen] Path '${part}' not found`)
      currentId = target.file_id
      this.pathFileIdCache.set(subPath, currentId)
    }
    return currentId
  }
}
