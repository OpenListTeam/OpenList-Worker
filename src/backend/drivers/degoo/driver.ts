import {
  StorageDriver,
  FileItem,
  calcFileType,
} from "../../internal/driver/base"
import { DriverDegooAddition, DegooFileItem } from "./types"
import { ClientDegoo } from "./util"

function isFolder(category: number): boolean {
  return category === 1 || category === 2 || category === 10
}

function fileToItem(f: DegooFileItem): FileItem {
  const dir = isFolder(f.Category)
  const size = Number(f.Size) || 0
  const modMillis = Number(f.LastModificationTime)
  return {
    name: f.Name,
    size: dir ? 0 : size,
    is_dir: dir,
    modified: modMillis
      ? new Date(modMillis).toISOString()
      : new Date().toISOString(),
    sign: f.ID,
    type: calcFileType(f.Name, dir),
    raw_url: "",
  }
}

export class DriverDegoo implements StorageDriver {
  private client: ClientDegoo
  private pathCache = new Map<string, string>()

  constructor(
    addition: DriverDegooAddition,
    persist?: (tokens: {
      accessToken?: string
      refreshToken?: string
    }) => void | Promise<void>,
  ) {
    this.client = new ClientDegoo(addition, persist)
  }

  async init(): Promise<void> {
    await this.client.init()
  }

  async list(_virtualPath: string, physicalPath: string): Promise<FileItem[]> {
    const parentId = await this.pathToId(physicalPath)
    const files = await this.client.getFileChildren5(parentId)
    return files.map((f) => fileToItem(f))
  }

  async get(_virtualPath: string, physicalPath: string): Promise<FileItem> {
    const parts = physicalPath.split("/").filter(Boolean)
    const rawName = parts[parts.length - 1] || "root"
    const parentPath = "/" + parts.slice(0, -1).join("/")

    try {
      const parentId = await this.pathToId(parentPath)
      const files = await this.client.getFileChildren5(parentId)
      const target = files.find((f) => f.Name === rawName)
      if (target) {
        const item = fileToItem(target)
        if (!item.is_dir) {
          try {
            const overlay = await this.client.getOverlay4(target.ID)
            item.raw_url = overlay.URL || ""
          } catch {
            item.raw_url_error = "[Degoo] failed to resolve download url"
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
    await this.client.mkdir(await this.pathToId(parentPath), name)
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

  async copy(): Promise<void> {
    throw new Error("[Degoo] copy not supported")
  }

  async put(): Promise<void> {
    throw new Error("[Degoo] upload not supported in stateless environment")
  }

  private async resolveEntry(
    physicalPath: string,
  ): Promise<{ id: string; isDir: boolean }> {
    const parts = physicalPath.split("/").filter(Boolean)
    const name = parts[parts.length - 1]
    const parentPath = "/" + parts.slice(0, -1).join("/")
    const parentId = await this.pathToId(parentPath)
    const files = await this.client.getFileChildren5(parentId)
    const target = files.find((f) => f.Name === name)
    if (!target) throw new Error(`[Degoo] '${name}' not found`)
    return { id: target.ID, isDir: isFolder(target.Category) }
  }

  /** 物理路径 → 目录 ID（根目录返回解析后的设备 ID） */
  private async pathToId(physicalPath: string): Promise<string> {
    const clean = physicalPath.split("/").filter(Boolean).join("/")
    if (!clean) return this.client.getRootId()
    if (this.pathCache.has(clean)) return this.pathCache.get(clean)!

    const parts = clean.split("/")
    let currentId = this.client.getRootId()
    for (let i = 0; i < parts.length; i++) {
      const files = await this.client.getFileChildren5(currentId)
      const target = files.find(
        (f) => f.Name === parts[i] && isFolder(f.Category),
      )
      if (!target) {
        throw new Error(`[Degoo] Directory '${parts[i]}' not found`)
      }
      currentId = target.ID
      const subPath = "/" + parts.slice(0, i + 1).join("/")
      this.pathCache.set(subPath, currentId)
    }
    return currentId
  }
}
