// Baidu Netdisk driver
// Based on: https://github.com/OpenListTeam/OpenList/tree/main/drivers/baidu_netdisk
import {
  StorageDriver,
  FileItem,
  calcFileType,
} from "../../internal/driver/base"
import { BaiduAddition, BaiduFile } from "./types"
import { BaiduClient } from "./util"

function baiduFileToFileItem(f: BaiduFile): FileItem {
  const isDir = f.isdir === 1
  const name =
    f.server_filename || f.path.split("/").filter(Boolean).pop() || "root"
  const mtime = f.server_mtime || f.mtime || 0
  return {
    name,
    size: f.size || 0,
    is_dir: isDir,
    modified: mtime
      ? new Date(mtime * 1000).toISOString()
      : new Date().toISOString(),
    sign: "",
    type: calcFileType(name, isDir),
    thumb: f.thumbs?.url3 || "",
    raw_url: "",
  }
}

export class BaiduDriver implements StorageDriver {
  private client: BaiduClient
  private addition: BaiduAddition
  private vipType = 0

  constructor(addition: BaiduAddition) {
    this.addition = addition
    this.client = new BaiduClient(addition)
  }

  async init(): Promise<void> {
    try {
      this.vipType = await this.client.uinfo()
    } catch (e: any) {
      console.warn("[baidu_netdisk] init uinfo failed:", e.message)
    }
  }

  async list(_virtualPath: string, physicalPath: string): Promise<FileItem[]> {
    const files = await this.client.getFiles(physicalPath)
    return files.map(baiduFileToFileItem)
  }

  async get(_virtualPath: string, physicalPath: string): Promise<FileItem> {
    const parts = physicalPath.split("/").filter(Boolean)
    const name = parts[parts.length - 1] || "root"
    const parentDir = "/" + parts.slice(0, parts.length - 1).join("/")

    let file: BaiduFile | undefined
    try {
      const files = await this.client.getFiles(parentDir)
      file = files.find(
        (f) => f.server_filename === name || f.path === physicalPath,
      )
    } catch (e) {
      console.warn(
        `[baidu_netdisk] getFiles failed for '${parentDir}':`,
        (e as Error).message,
      )
    }

    if (file) {
      const item = baiduFileToFileItem(file)
      if (file.isdir !== 1) {
        try {
          const link = await this.client.getDownloadLink(file, physicalPath)
          item.raw_url = link.url
          item.raw_url_headers = link.headers
        } catch (e: any) {
          console.warn(
            `[baidu_netdisk] getDownloadLink warning for ${name}:`,
            e.message,
          )
        }
      }
      return item
    }

    // Fallback: the path may be a folder that isn't listed in its parent
    // (e.g. the storage root). Probe it by listing — if it lists, it's a folder.
    try {
      await this.client.getFiles(physicalPath)
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
    await this.client.create(physicalPath, 0, 1)
  }

  async rename(
    _virtualPath: string,
    physicalPath: string,
    newName: string,
  ): Promise<void> {
    await this.client.manage("rename", [
      { path: physicalPath, newname: newName },
    ])
  }

  async remove(
    _virtualPath: string,
    physicalPath: string,
    _names: string[],
  ): Promise<void> {
    await this.client.manage("delete", [physicalPath])
  }

  async move(
    _srcDir: string,
    dstDir: string,
    _names: string[],
    srcPhysical: string,
    _dstPhysical: string,
  ): Promise<void> {
    const name = srcPhysical.split("/").filter(Boolean).pop() || ""
    await this.client.manage("move", [
      { path: srcPhysical, dest: dstDir, newname: name },
    ])
  }

  async copy(
    _srcDir: string,
    dstDir: string,
    _names: string[],
    srcPhysical: string,
    _dstPhysical: string,
  ): Promise<void> {
    const name = srcPhysical.split("/").filter(Boolean).pop() || ""
    await this.client.manage("copy", [
      { path: srcPhysical, dest: dstDir, newname: name },
    ])
  }

  async put(
    _virtualPath: string,
    _physicalPath: string,
    _content: Buffer,
  ): Promise<void> {
    throw new Error(
      "[BaiduNetdisk] Direct put not supported in stateless environment",
    )
  }
}
