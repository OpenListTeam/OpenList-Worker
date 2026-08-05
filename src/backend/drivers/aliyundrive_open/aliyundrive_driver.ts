import { StorageDriver, FileItem } from "../../internal/driver/base"
import { AlidriveAddition, AliyunFileItem } from "./types"
import { AlidriveClient } from "./util"

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

export class Aliyundrive implements StorageDriver {
  private client: AlidriveClient
  private pathFileIdCache = new Map<string, string>()

  constructor(addition: AlidriveAddition) {
    this.client = new AlidriveClient(addition)
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
    // For files, get download URL
    const url = await this.client.getDownloadUrl(fileId).catch(() => "")
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
    srcDir: string,
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
    srcDir: string,
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
    // Use multipart upload via web API
    const size = content.length
    const createResp = await this.client.request<any>(
      "/adrive/v2/file/createWithFolders",
      {
        check_name_mode: "auto_rename",
        drive_id: this.client.driveId,
        name,
        parent_file_id: parentId,
        type: "file",
        size,
        part_info_list: [{ part_number: 1 }],
      },
    )
    const uploadUrl = createResp.part_info_list?.[0]?.upload_url
    if (!uploadUrl) return
    const putRes = await fetch(uploadUrl, { method: "PUT", body: content })
    if (!putRes.ok) {
      throw new Error(`[Aliyundrive] Upload failed: ${putRes.status}`)
    }
    await this.client.request("/v2/file/complete", {
      drive_id: this.client.driveId,
      file_id: createResp.file_id,
      upload_id: createResp.upload_id,
    })
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
      if (!target) throw new Error(`[Aliyundrive] Path '${part}' not found`)
      currentId = target.file_id
      this.pathFileIdCache.set(subPath, currentId)
    }
    return currentId
  }
}
