import {
  StorageDriver,
  FileItem,
  calcFileType,
} from "../../internal/driver/base"
import { Driver115Addition, Cloud115File } from "./types"
import { Client115 } from "./util"

function fileToItem(f: Cloud115File): FileItem {
  const isDir = f.Fc === "0"
  const modTime = f.Upt ? new Date(f.Upt * 1000).toISOString() : new Date().toISOString()
  return {
    name: f.Fn,
    size: f.FS || 0,
    is_dir: isDir,
    modified: modTime,
    sign: "",
    type: calcFileType(f.Fn, isDir),
    thumb: f.Thumbnail || "",
    raw_url: "",
  }
}

export class Driver115 implements StorageDriver {
  private client: Client115
  private pathCache = new Map<string, string>()

  constructor(addition: Driver115Addition) {
    this.client = new Client115(addition)
  }

  async init(): Promise<void> {
    await this.client.init()
  }

  async list(_virtualPath: string, physicalPath: string): Promise<FileItem[]> {
    const cid = await this.client.resolvePathId(physicalPath, this.pathCache)
    const files = await this.client.getFiles(cid)
    return files.map(fileToItem)
  }

  async get(_virtualPath: string, physicalPath: string): Promise<FileItem> {
    const parts = physicalPath.split("/").filter(Boolean)
    const rawName = parts[parts.length - 1] || "root"
    const decodedName = (() => {
      try {
        return decodeURIComponent(rawName)
      } catch {
        return rawName
      }
    })()
    const parentPath = "/" + parts.slice(0, -1).join("/")
    const parentId = await this.client.resolvePathId(parentPath, this.pathCache)
    const files = await this.client.getFiles(parentId)
    const file = files.find(
      (f) => f.Fn === rawName || f.Fn === decodedName || f.Fid === rawName,
    )

    if (file) {
      const item = fileToItem(file)
      if (!item.is_dir && file.Pc) {
        try {
          const url = await this.client.getDownloadUrl(file.Pc)
          item.raw_url = url
        } catch (e: any) {
          item.raw_url_error = e.message
        }
      }
      return item
    }

    // Fallback: path 可能是文件夹（根目录等未在父目录列出）
    try {
      const fid = await this.client.resolvePathId(physicalPath, this.pathCache)
      await this.client.getFiles(fid)
      return {
        name: decodedName || "root",
        size: 0,
        is_dir: true,
        modified: new Date().toISOString(),
        sign: "",
        type: 1,
        raw_url: "",
      }
    } catch {
      return {
        name: decodedName || "root",
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
    const parentId = await this.client.resolvePathId(parentPath, this.pathCache)
    await this.client.mkdir(parentId, name)
  }

  async rename(
    _virtualPath: string,
    physicalPath: string,
    newName: string,
  ): Promise<void> {
    const fid = await this.client.resolvePathId(physicalPath, this.pathCache)
    await this.client.rename(fid, newName)
  }

  async remove(
    _virtualPath: string,
    physicalPath: string,
    _names: string[],
  ): Promise<void> {
    const fid = await this.client.resolvePathId(physicalPath, this.pathCache)
    await this.client.remove([fid])
  }

  async move(
    _srcDir: string,
    dstDir: string,
    _names: string[],
    srcPhysical: string,
    _dstPhysical: string,
  ): Promise<void> {
    const fid = await this.client.resolvePathId(srcPhysical, this.pathCache)
    const dstId = await this.client.resolvePathId(dstDir, this.pathCache)
    await this.client.move(dstId, [fid])
  }

  async copy(
    _srcDir: string,
    dstDir: string,
    _names: string[],
    srcPhysical: string,
    _dstPhysical: string,
  ): Promise<void> {
    const fid = await this.client.resolvePathId(srcPhysical, this.pathCache)
    const dstId = await this.client.resolvePathId(dstDir, this.pathCache)
    await this.client.copy(dstId, [fid])
  }

  async put(
    _virtualPath: string,
    _physicalPath: string,
    _content: Buffer,
  ): Promise<void> {
    throw new Error("[115] Direct put not supported in stateless environment")
  }
}
