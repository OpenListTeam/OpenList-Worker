import { StorageDriver, FileItem } from "../../internal/driver/base"
import { QuarkAddition, QuarkFile } from "./types"
import { QuarkClient } from "./util"

function quarkFileToFileItem(f: QuarkFile): FileItem {
  const isDir = !f.file
  const modTime = f.updated_at
    ? new Date(f.updated_at).toISOString()
    : new Date().toISOString()

  return {
    name: f.file_name,
    size: f.size || 0,
    is_dir: isDir,
    modified: modTime,
    sign: "",
    type: isDir ? 1 : 0,
    thumb: f.thumbnail || "",
    raw_url: "",
  }
}

export class QuarkDriver implements StorageDriver {
  private client: QuarkClient
  private pathFileIdCache = new Map<string, string>()

  constructor(addition: QuarkAddition) {
    this.client = new QuarkClient(addition)
  }

  async init(): Promise<void> {
    await this.client.init()
  }

  async list(_virtualPath: string, physicalPath: string): Promise<FileItem[]> {
    const folderId = await this.resolveFileId(physicalPath)
    const files = await this.client.getFiles(folderId)
    return files.map(quarkFileToFileItem)
  }

  async get(_virtualPath: string, physicalPath: string): Promise<FileItem> {
    const fileId = await this.resolveFileId(physicalPath)
    const parts = physicalPath.split("/").filter(Boolean)
    const name = parts[parts.length - 1] || "root"
    const parentPath = "/" + parts.slice(0, parts.length - 1).join("/")
    const parentId = await this.resolveFileId(parentPath)

    const files = await this.client.getFiles(parentId)
    const file = files.find((f) => f.fid === fileId || f.file_name === name)

    let downloadLink = ""
    try {
      const linkRes = await this.client.getDownloadUrl(fileId, name)
      downloadLink = linkRes.url
    } catch (e: any) {
      console.warn(`[Quark/UC] getDownloadUrl warning for ${name}:`, e.message)
    }

    if (file) {
      const item = quarkFileToFileItem(file)
      item.raw_url = downloadLink
      return item
    }

    return {
      name,
      size: 0,
      is_dir: false,
      modified: new Date().toISOString(),
      sign: "",
      type: 0,
      raw_url: downloadLink,
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
    await this.client.remove([fileId])
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
    await this.client.move([fileId], dstId)
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
    await this.client.copy([fileId], dstId)
  }

  async put(
    _virtualPath: string,
    _physicalPath: string,
    _content: Buffer,
  ): Promise<void> {
    throw new Error(
      "[Quark/UC] Direct put not supported in stateless environment",
    )
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

      const items = await this.client.getFiles(currentId)
      const target = items.find((f) => f.file_name === part)
      if (!target) {
        throw new Error(
          `[Quark/UC] Path '${part}' not found in folder '${currentId}'`,
        )
      }
      currentId = target.fid
      this.pathFileIdCache.set(subPath, currentId)
    }

    return currentId
  }
}
