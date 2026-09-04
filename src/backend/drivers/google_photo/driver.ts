import {
  StorageDriver,
  FileItem,
  calcFileType,
} from "../../internal/driver/base"
import { DriverGooglePhotoAddition, GooglePhotoMediaItem } from "./types"
import { ClientGooglePhoto } from "./util"

function fileToItem(f: GooglePhotoMediaItem): FileItem {
  if (f.filename) {
    return {
      name: f.filename,
      size: 0,
      is_dir: false,
      modified: f.mediaMetadata?.creationTime || new Date().toISOString(),
      sign: f.id,
      type: calcFileType(f.filename, false),
      thumb: f.baseUrl ? f.baseUrl + "=w100-h100-c" : "",
      raw_url: "",
    }
  }
  return {
    name: f.title || f.id,
    size: 0,
    is_dir: true,
    modified: new Date().toISOString(),
    sign: f.id,
    type: 1,
  }
}

export class DriverGooglePhoto implements StorageDriver {
  private client: ClientGooglePhoto
  private pathCache = new Map<string, string>()

  constructor(addition: DriverGooglePhotoAddition) {
    this.client = new ClientGooglePhoto(addition)
  }

  async init(): Promise<void> {
    await this.client.init()
  }

  async list(_virtualPath: string, physicalPath: string): Promise<FileItem[]> {
    const id = await this.pathToId(physicalPath)
    const files = await this.client.getFiles(id)
    return files.map((f) => fileToItem(f))
  }

  async get(_virtualPath: string, physicalPath: string): Promise<FileItem> {
    const parts = physicalPath.split("/").filter(Boolean)
    const rawName = parts[parts.length - 1] || "root"
    const parentPath = "/" + parts.slice(0, -1).join("/")

    try {
      const parentId = await this.pathToId(parentPath)
      const files = await this.client.getFiles(parentId)
      const target = files.find((f) => (f.filename || f.title) === rawName)
      if (target) {
        const item = fileToItem(target)
        if (!item.is_dir) {
          try {
            item.raw_url = await this.client.link(target.id)
          } catch {
            item.raw_url_error = "[GooglePhoto] failed to resolve download url"
          }
        }
        return item
      }
    } catch {
      // fall through
    }

    return {
      name: rawName,
      size: 0,
      is_dir: true,
      modified: new Date().toISOString(),
      sign: "",
      type: 1,
      raw_url: "",
    }
  }

  async mkdir(): Promise<void> {
    throw new Error("[GooglePhoto] mkdir not supported")
  }

  async rename(): Promise<void> {
    throw new Error("[GooglePhoto] rename not supported")
  }

  async remove(): Promise<void> {
    throw new Error("[GooglePhoto] remove not supported")
  }

  async move(): Promise<void> {
    throw new Error("[GooglePhoto] move not supported")
  }

  async copy(): Promise<void> {
    throw new Error("[GooglePhoto] copy not supported")
  }

  async put(): Promise<void> {
    throw new Error("[GooglePhoto] upload not supported")
  }

  /** 物理路径 → 目录 ID（根目录返回 "root"） */
  private async pathToId(physicalPath: string): Promise<string> {
    const clean = physicalPath.split("/").filter(Boolean).join("/")
    if (!clean) return "root"
    if (this.pathCache.has(clean)) return this.pathCache.get(clean)!

    const parts = clean.split("/")
    let currentId = parts[0]
    for (let i = 1; i < parts.length; i++) {
      const files = await this.client.getFiles(currentId)
      const target = files.find((f) => (f.filename || f.title) === parts[i])
      if (!target) {
        throw new Error(`[GooglePhoto] Directory '${parts[i]}' not found`)
      }
      currentId = target.id
      const subPath = "/" + parts.slice(0, i + 1).join("/")
      this.pathCache.set(subPath, currentId)
    }
    this.pathCache.set(clean, currentId)
    return currentId
  }
}
