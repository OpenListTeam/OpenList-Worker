import { StorageDriver, FileItem } from "../../internal/driver/base"
import { AliyundriveShareAddition, AliyunFileItem } from "./types"
import { AliyunShareClient } from "./util"

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

export class AliyundriveShare implements StorageDriver {
  private client: AliyunShareClient
  private addition: AliyundriveShareAddition

  constructor(addition: AliyundriveShareAddition) {
    this.addition = addition
    this.client = new AliyunShareClient(
      addition.share_id,
      addition.share_pwd || "",
    )
  }

  async init(): Promise<void> {
    await this.client.init()
  }

  async list(_virtualPath: string, physicalPath: string): Promise<FileItem[]> {
    // For share, physicalPath is relative to share root
    const clean = physicalPath.split("/").filter(Boolean).join("/")
    // For simplicity we list from root; deep navigation requires file_id resolution
    const rootId = this.addition.root_folder_id || "root"
    const folderId = !clean
      ? rootId
      : await this.resolveShareFileId(clean, rootId)
    const files = await this.client.listFiles(folderId)
    return files.map(aliyunFileToFileItem)
  }

  async get(_virtualPath: string, physicalPath: string): Promise<FileItem> {
    const clean = physicalPath.split("/").filter(Boolean).join("/")
    const rootId = this.addition.root_folder_id || "root"
    const fileId = !clean
      ? rootId
      : await this.resolveShareFileId(clean, rootId)
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

  // Share drives are read-only; write operations throw
  async mkdir(): Promise<void> {
    throw new Error(
      "[AliyundriveShare] Read-only: cannot create directory on shared drive",
    )
  }

  async rename(): Promise<void> {
    throw new Error(
      "[AliyundriveShare] Read-only: cannot rename on shared drive",
    )
  }

  async remove(): Promise<void> {
    throw new Error(
      "[AliyundriveShare] Read-only: cannot delete on shared drive",
    )
  }

  async move(): Promise<void> {
    throw new Error("[AliyundriveShare] Read-only: cannot move on shared drive")
  }

  async copy(): Promise<void> {
    throw new Error("[AliyundriveShare] Read-only: cannot copy on shared drive")
  }

  async put(): Promise<void> {
    throw new Error(
      "[AliyundriveShare] Read-only: cannot upload to shared drive",
    )
  }

  private async resolveShareFileId(
    cleanPath: string,
    rootId: string,
  ): Promise<string> {
    const parts = cleanPath.split("/").filter(Boolean)
    let currentId = rootId
    for (const part of parts) {
      const items = await this.client.listFiles(currentId)
      const target = items.find((f) => f.name === part)
      if (!target)
        throw new Error(`[AliyundriveShare] Path '${part}' not found`)
      currentId = target.file_id
    }
    return currentId
  }
}
