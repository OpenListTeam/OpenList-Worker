import {
  StorageDriver,
  FileItem,
  calcFileType,
} from "../../internal/driver/base"
import { DriverFebBoxAddition, FebBoxFile } from "./types"
import { ClientFebBox } from "./util"

function fileToItem(f: FebBoxFile): FileItem {
  const isDir = f.is_dir === 1
  return {
    name: f.file_name,
    size: f.file_size,
    is_dir: isDir,
    modified: f.file_update_time
      ? new Date(f.file_update_time * 1000).toISOString()
      : new Date().toISOString(),
    sign: String(f.fid),
    type: calcFileType(f.file_name, isDir),
    thumb: f.thumb || "",
    raw_url: "",
  }
}

export class DriverFebBox implements StorageDriver {
  private client: ClientFebBox
  private userIp: string
  private pathCache = new Map<string, string>()

  constructor(
    addition: DriverFebBoxAddition,
    persist?: (refreshToken: string) => void | Promise<void>,
  ) {
    this.client = new ClientFebBox(addition, persist)
    this.userIp = addition.user_ip || ""
  }

  async init(): Promise<void> {
    await this.client.init()
  }

  async list(_virtualPath: string, physicalPath: string): Promise<FileItem[]> {
    const parentId = await this.pathToId(physicalPath)
    const files = await this.client.getFilesList(parentId)
    return files.map((f) => fileToItem(f))
  }

  async get(_virtualPath: string, physicalPath: string): Promise<FileItem> {
    const parts = physicalPath.split("/").filter(Boolean)
    const rawName = parts[parts.length - 1] || "root"
    const parentPath = "/" + parts.slice(0, -1).join("/")

    try {
      const parentId = await this.pathToId(parentPath)
      const files = await this.client.getFilesList(parentId)
      const target = files.find((f) => f.file_name === rawName)
      if (target) {
        const item = fileToItem(target)
        if (!item.is_dir) {
          try {
            item.raw_url = await this.client.getDownloadLink(
              item.sign,
              this.userIp,
            )
          } catch {
            item.raw_url_error = "[FebBox] failed to resolve download url"
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

  async mkdir(_virtualPath: string, physicalPath: string): Promise<void> {
    const parts = physicalPath.split("/").filter(Boolean)
    const name = parts.pop() || "new_folder"
    const parentPath = "/" + parts.join("/")
    await this.client.makeDir(await this.pathToId(parentPath), name)
    this.pathCache.clear()
  }

  async rename(
    _virtualPath: string,
    physicalPath: string,
    newName: string,
  ): Promise<void> {
    const entry = await this.resolveEntry(physicalPath)
    await this.client.rename(entry.id, newName)
    this.pathCache.clear()
  }

  async remove(
    _virtualPath: string,
    physicalPath: string,
    _names: string[],
  ): Promise<void> {
    const entry = await this.resolveEntry(physicalPath)
    await this.client.remove(entry.id)
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
    await this.client.move(entry.id, await this.pathToId(dstDir))
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
    await this.client.copy(entry.id, await this.pathToId(dstDir))
    this.pathCache.clear()
  }

  async put(): Promise<void> {
    throw new Error("[FebBox] upload not supported")
  }

  private async resolveEntry(
    physicalPath: string,
  ): Promise<{ id: string; isDir: boolean }> {
    const parts = physicalPath.split("/").filter(Boolean)
    const name = parts[parts.length - 1]
    const parentPath = "/" + parts.slice(0, -1).join("/")
    const parentId = await this.pathToId(parentPath)
    const files = await this.client.getFilesList(parentId)
    const target = files.find((f) => f.file_name === name)
    if (!target) throw new Error(`[FebBox] '${name}' not found`)
    return { id: String(target.fid), isDir: target.is_dir === 1 }
  }

  /** 物理路径 → 目录 ID（根目录返回 "0"） */
  private async pathToId(physicalPath: string): Promise<string> {
    const clean = physicalPath.split("/").filter(Boolean).join("/")
    if (!clean) return "0"
    if (this.pathCache.has(clean)) return this.pathCache.get(clean)!

    const parts = clean.split("/")
    let currentId = "0"
    for (let i = 0; i < parts.length; i++) {
      const files = await this.client.getFilesList(currentId)
      const target = files.find(
        (f) => f.file_name === parts[i] && f.is_dir === 1,
      )
      if (!target) {
        throw new Error(`[FebBox] Directory '${parts[i]}' not found`)
      }
      currentId = String(target.fid)
      const subPath = "/" + parts.slice(0, i + 1).join("/")
      this.pathCache.set(subPath, currentId)
    }
    return currentId
  }
}
