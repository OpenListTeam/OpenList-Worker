import {
  StorageDriver,
  FileItem,
  calcFileType,
} from "../../internal/driver/base"
import { Driver189TVAddition, Cloud189TVFile, Cloud189TVFolder } from "./types"
import { Client189TV } from "./util"

function parseTime(value: string | undefined): string {
  if (!value) return new Date().toISOString()
  const cleaned = value.trim().replace(/["']/g, "")
  // 格式如 "2024-01-15 10:30:00 +08" 或 "Jan 15, 2024 10:30:00 AM +08"
  const normalized = cleaned.replace(/ +08$/, "+08:00")
  const d = new Date(normalized)
  if (!isNaN(d.getTime())) return d.toISOString()
  return cleaned
}

function fileToItem(f: Cloud189TVFile | Cloud189TVFolder): FileItem {
  if ("parentId" in f || !("size" in f)) {
    const folder = f as Cloud189TVFolder
    return {
      name: folder.name,
      size: 0,
      is_dir: true,
      modified: parseTime(folder.lastOpTime || folder.createDate),
      sign: folder.id,
      type: 1,
    }
  }
  const file = f as Cloud189TVFile
  return {
    name: file.name,
    size: file.size,
    is_dir: false,
    modified: parseTime(file.lastOpTime || file.createDate),
    sign: file.id,
    type: calcFileType(file.name, false),
    thumb: file.icon?.smallUrl || "",
    raw_url: "",
  }
}

export class Driver189TV implements StorageDriver {
  private client: Client189TV
  private pathCache = new Map<string, string>()

  constructor(
    addition: Driver189TVAddition,
    persistAccessToken?: (accessToken: string) => void | Promise<void>,
  ) {
    this.client = new Client189TV(addition, persistAccessToken)
  }

  async init(): Promise<void> {
    await this.client.init()
  }

  private isFamily(): boolean {
    return this.client.isFamily()
  }

  async list(_virtualPath: string, physicalPath: string): Promise<FileItem[]> {
    const parentId = await this.pathToId(physicalPath)
    const files = await this.client.getFiles(parentId, this.isFamily())
    return files.map(fileToItem)
  }

  async get(_virtualPath: string, physicalPath: string): Promise<FileItem> {
    const parts = physicalPath.split("/").filter(Boolean)
    const rawName = parts[parts.length - 1] || "root"
    const parentPath = "/" + parts.slice(0, -1).join("/")

    try {
      const parentId = await this.pathToId(parentPath)
      const files = await this.client.getFiles(parentId, this.isFamily())
      const target = files.find((f) => f.name === rawName)
      if (target) {
        const item = fileToItem(target)
        if (!item.is_dir) {
          try {
            item.raw_url = await this.client.getFileDownloadUrl(
              target.id,
              this.isFamily(),
            )
            item.raw_url_headers = {
              "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            }
          } catch {
            item.raw_url_error = "[189TV] failed to resolve download url"
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
    await this.client.mkdir(
      await this.pathToId(parentPath),
      name,
      this.isFamily(),
    )
    this.pathCache.clear()
  }

  async rename(
    _virtualPath: string,
    physicalPath: string,
    newName: string,
  ): Promise<void> {
    const entry = await this.resolveEntry(physicalPath)
    await this.client.rename(entry.id, entry.isDir, newName, this.isFamily())
    this.pathCache.clear()
  }

  async remove(
    _virtualPath: string,
    physicalPath: string,
    _names: string[],
  ): Promise<void> {
    const entry = await this.resolveEntry(physicalPath)
    const name = physicalPath.split("/").filter(Boolean).pop() || ""
    await this.client.remove(entry.id, entry.isDir, name, this.isFamily())
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
    const name = srcPhysical.split("/").filter(Boolean).pop() || ""
    await this.client.move(
      entry.id,
      entry.isDir,
      name,
      await this.pathToId(dstDir),
      this.isFamily(),
    )
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
    const name = srcPhysical.split("/").filter(Boolean).pop() || ""
    await this.client.copy(
      entry.id,
      entry.isDir,
      name,
      await this.pathToId(dstDir),
      this.isFamily(),
    )
    this.pathCache.clear()
  }

  async put(
    _virtualPath: string,
    physicalPath: string,
    content: Buffer,
  ): Promise<void> {
    const parts = physicalPath.split("/").filter(Boolean)
    const name = parts.pop() || "file"
    const parentPath = "/" + parts.join("/")
    await this.client.upload(
      await this.pathToId(parentPath),
      name,
      new Uint8Array(content),
      this.isFamily(),
    )
    this.pathCache.clear()
  }

  private async resolveEntry(
    physicalPath: string,
  ): Promise<{ id: string; isDir: boolean }> {
    const parts = physicalPath.split("/").filter(Boolean)
    const name = parts[parts.length - 1]
    const parentPath = "/" + parts.slice(0, -1).join("/")
    const parentId = await this.pathToId(parentPath)
    const files = await this.client.getFiles(parentId, this.isFamily())
    const target = files.find((f) => f.name === name)
    if (!target) throw new Error(`[189TV] '${name}' not found`)
    const isDir = "parentId" in target || !("size" in target)
    return { id: target.id, isDir }
  }

  /** 物理路径 → 目录 ID（根目录默认 "-11"，家庭云为 ""） */
  private async pathToId(physicalPath: string): Promise<string> {
    const clean = physicalPath.split("/").filter(Boolean).join("/")
    if (!clean) {
      return this.isFamily() ? "" : "-11"
    }
    if (this.pathCache.has(clean)) return this.pathCache.get(clean)!

    const parts = clean.split("/")
    let currentId = this.isFamily() ? "" : "-11"
    for (let i = 0; i < parts.length; i++) {
      const files = await this.client.getFiles(currentId, this.isFamily())
      const target = files.find(
        (f) => f.name === parts[i] && "parentId" in f,
      ) as Cloud189TVFolder | undefined
      if (!target) {
        throw new Error(`[189TV] Directory '${parts[i]}' not found`)
      }
      currentId = target.id
      const subPath = "/" + parts.slice(0, i + 1).join("/")
      this.pathCache.set(subPath, currentId)
    }
    return currentId
  }
}
