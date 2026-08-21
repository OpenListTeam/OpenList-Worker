import { StorageDriver, FileItem } from "../../internal/driver/base"
import { sortFileItems } from "../../internal/driver/sort"
import {
  GoogleDriveAddition,
  GoogleFile,
  GOOGLE_DRIVE_FOLDER_MIME,
} from "./types"
import { GoogleDriveClient } from "./util"

function googleFileToFileItem(f: GoogleFile): FileItem {
  return {
    name: f.name,
    size: f.size ? parseInt(f.size, 10) : 0,
    is_dir: f.mimeType === GOOGLE_DRIVE_FOLDER_MIME,
    modified: f.modifiedTime || f.createdTime || new Date().toISOString(),
    sign: "",
    type: f.mimeType === GOOGLE_DRIVE_FOLDER_MIME ? 1 : 0,
    thumb: f.thumbnailLink || "",
    raw_url: "",
  }
}

export class GoogleDrive implements StorageDriver {
  private client: GoogleDriveClient
  private addition: GoogleDriveAddition

  constructor(addition: GoogleDriveAddition) {
    this.addition = addition
    this.client = new GoogleDriveClient(addition)
  }

  async init(): Promise<void> {
    await this.client.init()
  }

  async list(_virtualPath: string, physicalPath: string): Promise<FileItem[]> {
    const folderId = await this.client.resolveFileId(physicalPath)
    const files = await this.client.listFiles(folderId)
    const items = files.map(googleFileToFileItem)
    return sortFileItems(
      items,
      this.addition.order_by,
      this.addition.order_direction,
    )
  }

  async get(_virtualPath: string, physicalPath: string): Promise<FileItem> {
    const fileId = await this.client.resolveFileId(physicalPath)
    const file = await this.client.getFile(fileId).catch(() => null)
    if (file) {
      const item = googleFileToFileItem(file)
      // Attach download URL + auth header
      item.raw_url = this.client.getDownloadUrl(fileId)
      item.raw_url_headers = this.client.getDownloadHeaders()
      return item
    }
    // Fallback: the path may be a folder that isn't found via getFile
    // (e.g. the storage root). Probe it by listing.
    const parts = physicalPath.split("/").filter(Boolean)
    const name = parts[parts.length - 1] || "root"
    try {
      await this.client.listFiles(fileId)
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
    return {
      name,
      size: 0,
      is_dir: false,
      modified: new Date().toISOString(),
      sign: "",
      type: 0,
      raw_url: "",
    }
  }

  async mkdir(_virtualPath: string, physicalPath: string): Promise<void> {
    const { parentId, name } =
      await this.client.resolveParentAndName(physicalPath)
    await this.client.mkdir(parentId, name)
  }

  async rename(
    _virtualPath: string,
    physicalPath: string,
    newName: string,
  ): Promise<void> {
    const fileId = await this.client.resolveFileId(physicalPath)
    await this.client.rename(fileId, newName)
  }

  async remove(
    _virtualPath: string,
    physicalPath: string,
    _names: string[],
  ): Promise<void> {
    const fileId = await this.client.resolveFileId(physicalPath)
    await this.client.remove(fileId)
  }

  async move(
    srcDir: string,
    dstDir: string,
    _names: string[],
    srcPhysical: string,
    _dstPhysical: string,
  ): Promise<void> {
    const fileId = await this.client.resolveFileId(srcPhysical)
    const srcParts = srcPhysical.split("/").filter(Boolean)
    srcParts.pop()
    const srcParentId = await this.client.resolveFileId(
      "/" + srcParts.join("/"),
    )
    const dstParentId = await this.client.resolveFileId(dstDir)
    await this.client.move(fileId, srcParentId, dstParentId)
  }

  async copy(
    _srcDir: string,
    dstDir: string,
    _names: string[],
    srcPhysical: string,
    _dstPhysical: string,
  ): Promise<void> {
    const fileId = await this.client.resolveFileId(srcPhysical)
    const name = srcPhysical.split("/").filter(Boolean).pop() || "copy"
    const dstParentId = await this.client.resolveFileId(dstDir)
    await this.client.copy(fileId, dstParentId, name)
  }

  async put(
    _virtualPath: string,
    physicalPath: string,
    content: Buffer,
  ): Promise<void> {
    const { parentId, name } =
      await this.client.resolveParentAndName(physicalPath)
    await this.client.putFile(parentId, name, content)
  }
}
