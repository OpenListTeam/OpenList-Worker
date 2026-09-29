import {
  StorageDriver,
  FileItem,
  calcFileType,
} from "../../internal/driver/base"
import { DriverCloudreveV3Addition, CloudreveV3Object } from "./types"
import { ClientCloudreveV3 } from "./util"

function fileToItem(f: CloudreveV3Object): FileItem {
  const isDir = f.type === "dir"
  return {
    name: f.name,
    size: f.size || 0,
    is_dir: isDir,
    modified: f.date || f.create_date || new Date().toISOString(),
    sign: f.id,
    type: calcFileType(f.name, isDir),
    raw_url: "",
  }
}

/** 规范化 uri（根为 "/"） */
function normUri(p: string): string {
  if (!p || p === "/") return "/"
  return p.startsWith("/") ? p : "/" + p
}

export class DriverCloudreveV3 implements StorageDriver {
  private client: ClientCloudreveV3

  constructor(
    addition: DriverCloudreveV3Addition,
    persistCookie?: (cookie: string) => void | Promise<void>,
  ) {
    this.client = new ClientCloudreveV3(addition, persistCookie)
  }

  async init(): Promise<void> {
    await this.client.init()
  }

  async list(_virtualPath: string, physicalPath: string): Promise<FileItem[]> {
    const files = await this.client.listFiles(normUri(physicalPath))
    return files.map(fileToItem)
  }

  async get(_virtualPath: string, physicalPath: string): Promise<FileItem> {
    const uri = normUri(physicalPath)
    const parts = uri.split("/").filter(Boolean)
    const name = parts[parts.length - 1] || "root"
    const parentUri = "/" + parts.slice(0, -1).join("/")

    try {
      const files = await this.client.listFiles(
        parentUri === "//" ? "/" : parentUri,
      )
      const file = files.find((f) => f.name === name)
      if (file) {
        const item = fileToItem(file)
        if (!item.is_dir) {
          try {
            item.raw_url = await this.client.getDownloadUrl(file.id)
            item.raw_url_headers = this.client.downloadHeaders()
          } catch (e: any) {
            item.raw_url_error = e.message
          }
        }
        return item
      }
    } catch {
      // fall through
    }

    return {
      name,
      size: 0,
      is_dir: true,
      modified: new Date().toISOString(),
      sign: "",
      type: 1,
      raw_url: "",
    }
  }

  async mkdir(_virtualPath: string, physicalPath: string): Promise<void> {
    await this.client.mkdir(normUri(physicalPath))
  }

  async rename(
    _virtualPath: string,
    physicalPath: string,
    newName: string,
  ): Promise<void> {
    const entry = await this.resolveEntry(physicalPath)
    await this.client.rename(entry.src, newName)
  }

  async remove(
    _virtualPath: string,
    physicalPath: string,
    _names: string[],
  ): Promise<void> {
    const entry = await this.resolveEntry(physicalPath)
    await this.client.remove(entry.src)
  }

  async move(
    _srcDir: string,
    dstDir: string,
    _names: string[],
    srcPhysical: string,
    _dstPhysical: string,
  ): Promise<void> {
    const entry = await this.resolveEntry(srcPhysical)
    const parts = srcPhysical.split("/").filter(Boolean)
    const srcDir = "/" + parts.slice(0, -1).join("/")
    await this.client.move(srcDir, normUri(dstDir), entry.src)
  }

  async copy(
    _srcDir: string,
    dstDir: string,
    _names: string[],
    srcPhysical: string,
    _dstPhysical: string,
  ): Promise<void> {
    const entry = await this.resolveEntry(srcPhysical)
    const parts = srcPhysical.split("/").filter(Boolean)
    const srcDir = "/" + parts.slice(0, -1).join("/")
    await this.client.copy(srcDir, normUri(dstDir), entry.src)
  }

  async put(): Promise<void> {
    throw new Error(
      "[Cloudreve] Direct put not supported in stateless environment",
    )
  }

  private async resolveEntry(
    physicalPath: string,
  ): Promise<{ src: { dirs: string[]; items: string[] }; isDir: boolean }> {
    const uri = normUri(physicalPath)
    const parts = uri.split("/").filter(Boolean)
    const name = parts[parts.length - 1]
    const parentUri = "/" + parts.slice(0, -1).join("/")
    const files = await this.client.listFiles(
      parentUri === "//" ? "/" : parentUri,
    )
    const target = files.find((f) => f.name === name)
    if (!target) throw new Error(`[Cloudreve] '${name}' not found`)
    const isDir = target.type === "dir"
    const src = isDir
      ? { dirs: [target.id], items: [] }
      : { dirs: [], items: [target.id] }
    return { src, isDir }
  }
}
