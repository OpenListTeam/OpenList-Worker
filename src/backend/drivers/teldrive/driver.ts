import {
  StorageDriver,
  FileItem,
  calcFileType,
} from "../../internal/driver/base"
import { DriverTeldriveAddition, TeldriveFile } from "./types"
import { ClientTeldrive } from "./util"

function fileToItem(f: TeldriveFile): FileItem {
  const isDir = f.type === "folder"
  return {
    name: f.name,
    size: f.size || 0,
    is_dir: isDir,
    modified: f.updatedAt || f.createdAt || new Date().toISOString(),
    sign: "",
    type: calcFileType(f.name, isDir),
    raw_url: "",
  }
}

export class DriverTeldrive implements StorageDriver {
  private client: ClientTeldrive
  private pathCache = new Map<string, string>()

  constructor(addition: DriverTeldriveAddition) {
    this.client = new ClientTeldrive(addition)
  }

  async init(): Promise<void> {
    await this.client.init()
  }

  async list(_virtualPath: string, physicalPath: string): Promise<FileItem[]> {
    const files = await this.client.listFiles(physicalPath)
    return files.map(fileToItem)
  }

  async get(_virtualPath: string, physicalPath: string): Promise<FileItem> {
    const parts = physicalPath.split("/").filter(Boolean)
    const rawName = parts[parts.length - 1] || "root"
    const parentPath = "/" + parts.slice(0, -1).join("/")
    try {
      const files = await this.client.listFiles(parentPath === "//" ? "/" : parentPath)
      const file = files.find((f) => f.name === rawName)
      if (file) {
        const item = fileToItem(file)
        if (!item.is_dir) {
          item.raw_url = this.client.downloadUrl(file.id)
          item.raw_url_headers = this.client.downloadHeaders()
        }
        return item
      }
    } catch {}

    // Fallback: 目录
    try {
      await this.client.listFiles(physicalPath)
      return {
        name: rawName,
        size: 0,
        is_dir: true,
        modified: new Date().toISOString(),
        sign: "",
        type: 1,
        raw_url: "",
      }
    } catch {
      return {
        name: rawName,
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
    await this.client.mkdir(physicalPath)
  }

  async rename(
    _virtualPath: string,
    _physicalPath: string,
    _newName: string,
  ): Promise<void> {
    throw new Error("[TelDrive] rename not supported")
  }

  async remove(
    _virtualPath: string,
    physicalPath: string,
    _names: string[],
  ): Promise<void> {
    const id = await this.resolveFileId(physicalPath)
    await this.client.remove(id)
  }

  async move(
    _srcDir: string,
    dstDir: string,
    _names: string[],
    srcPhysical: string,
    _dstPhysical: string,
  ): Promise<void> {
    const srcId = await this.resolveFileId(srcPhysical)
    const dstId = await this.resolveFileId(dstDir)
    await this.client.move([srcId], dstId)
  }

  async copy(
    _srcDir: string,
    _dstDir: string,
    _names: string[],
    _srcPhysical: string,
    _dstPhysical: string,
  ): Promise<void> {
    throw new Error("[TelDrive] copy not supported")
  }

  async put(
    _virtualPath: string,
    _physicalPath: string,
    _content: Buffer,
  ): Promise<void> {
    throw new Error("[TelDrive] Direct put not supported in stateless environment")
  }

  private async resolveFileId(physicalPath: string): Promise<string> {
    const clean = physicalPath.split("/").filter(Boolean).join("/")
    if (!clean) return "/"
    if (this.pathCache.has(clean)) return this.pathCache.get(clean)!

    const parts = clean.split("/")
    let currentPath = ""
    let currentId = "/"
    for (let i = 0; i < parts.length; i++) {
      const files = await this.client.listFiles(currentPath === "" ? "/" : currentPath)
      const target = files.find((f) => f.name === parts[i])
      if (!target) {
        throw new Error(`[TelDrive] Path '${parts[i]}' not found`)
      }
      currentId = target.id
      currentPath = currentPath ? `${currentPath}/${parts[i]}` : `/${parts[i]}`
      this.pathCache.set(currentPath, currentId)
    }
    return currentId
  }
}
