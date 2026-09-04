import {
  StorageDriver,
  FileItem,
  calcFileType,
} from "../../internal/driver/base"
import { DriverOpenlistAddition } from "./types"
import { ClientOpenlist } from "./util"

export class DriverOpenlist implements StorageDriver {
  private client: ClientOpenlist

  constructor(addition: DriverOpenlistAddition) {
    this.client = new ClientOpenlist(addition)
  }

  async init(): Promise<void> {
    await this.client.init()
  }

  async list(_virtualPath: string, physicalPath: string): Promise<FileItem[]> {
    const files = await this.client.list(physicalPath)
    return files.map((f) => ({
      name: f.name,
      size: f.size || 0,
      is_dir: !!f.is_dir,
      modified: f.modified || new Date().toISOString(),
      sign: f.sign || "",
      type: calcFileType(f.name, !!f.is_dir),
      thumb: f.thumb || "",
      raw_url: f.raw_url || "",
    }))
  }

  async get(_virtualPath: string, physicalPath: string): Promise<FileItem> {
    try {
      const data = await this.client.get(physicalPath)
      return {
        name: data.name,
        size: data.size || 0,
        is_dir: !!data.is_dir,
        modified: data.modified || new Date().toISOString(),
        sign: data.sign || "",
        type: calcFileType(data.name, !!data.is_dir),
        raw_url: data.raw_url || "",
      }
    } catch {
      // Fallback: 可能是目录
      try {
        await this.client.list(physicalPath)
        const parts = physicalPath.split("/").filter(Boolean)
        return {
          name: parts[parts.length - 1] || "root",
          size: 0,
          is_dir: true,
          modified: new Date().toISOString(),
          sign: "",
          type: 1,
          raw_url: "",
        }
      } catch {
        const parts = physicalPath.split("/").filter(Boolean)
        return {
          name: parts[parts.length - 1] || "root",
          size: 0,
          is_dir: false,
          modified: new Date().toISOString(),
          sign: "",
          type: 0,
          raw_url: "",
        }
      }
    }
  }

  async mkdir(_virtualPath: string, physicalPath: string): Promise<void> {
    await this.client.mkdir(physicalPath)
  }

  async rename(
    _virtualPath: string,
    physicalPath: string,
    newName: string,
  ): Promise<void> {
    await this.client.rename(physicalPath, newName)
  }

  async remove(
    _virtualPath: string,
    physicalPath: string,
    names: string[],
  ): Promise<void> {
    const parts = physicalPath.split("/").filter(Boolean)
    const dir = "/" + parts.slice(0, -1).join("/")
    await this.client.remove(dir, names.length ? names : [parts[parts.length - 1]])
  }

  async move(
    srcDir: string,
    dstDir: string,
    names: string[],
    _srcPhysical: string,
    _dstPhysical: string,
  ): Promise<void> {
    await this.client.move(srcDir, dstDir, names)
  }

  async copy(
    srcDir: string,
    dstDir: string,
    names: string[],
    _srcPhysical: string,
    _dstPhysical: string,
  ): Promise<void> {
    await this.client.copy(srcDir, dstDir, names)
  }

  async put(
    _virtualPath: string,
    _physicalPath: string,
    _content: Buffer,
  ): Promise<void> {
    throw new Error("[OpenList] Direct put not supported in stateless environment")
  }
}
