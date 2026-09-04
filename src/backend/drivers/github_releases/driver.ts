import {
  StorageDriver,
  FileItem,
  calcFileType,
} from "../../internal/driver/base"
import { DriverGithubReleasesAddition } from "./types"
import { ClientGithubReleases } from "./util"

/** 只读发布源驱动：不支持写入操作 */
export class DriverGithubReleases implements StorageDriver {
  private client: ClientGithubReleases

  constructor(addition: DriverGithubReleasesAddition) {
    this.client = new ClientGithubReleases(addition)
  }

  async init(): Promise<void> {
    await this.client.init()
  }

  async list(_virtualPath: string, physicalPath: string): Promise<FileItem[]> {
    const files = await this.client.list(physicalPath)
    return files.map((f) => ({
      name: f.name,
      size: f.size,
      is_dir: f.isDir,
      modified: f.modified || new Date().toISOString(),
      sign: "",
      type: calcFileType(f.name, f.isDir),
      raw_url: f.url || "",
    }))
  }

  async get(_virtualPath: string, physicalPath: string): Promise<FileItem> {
    const parts = physicalPath.split("/").filter(Boolean)
    const name = parts[parts.length - 1] || "root"
    const files = await this.client.list(physicalPath)
    // 目录：list 成功返回非空或目录项
    if (files.length > 0 || physicalPath === "/") {
      const dir = files.find((f) => f.isDir && f.name === name)
      if (!dir && files.some((f) => !f.isDir)) {
        // 可能是文件
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
    // 文件：获取下载链接
    const url = await this.client.getDownloadUrl(physicalPath)
    if (url) {
      return {
        name,
        size: 0,
        is_dir: false,
        modified: new Date().toISOString(),
        sign: "",
        type: calcFileType(name, false),
        raw_url: url,
      }
    }
    return {
      name,
      size: 0,
      is_dir: false,
      modified: new Date().toISOString(),
      sign: "",
      type: calcFileType(name, false),
      raw_url: "",
    }
  }

  async mkdir(): Promise<void> {
    throw new Error("[GitHub Releases] read-only storage")
  }

  async rename(): Promise<void> {
    throw new Error("[GitHub Releases] read-only storage")
  }

  async remove(): Promise<void> {
    throw new Error("[GitHub Releases] read-only storage")
  }

  async move(): Promise<void> {
    throw new Error("[GitHub Releases] read-only storage")
  }

  async copy(): Promise<void> {
    throw new Error("[GitHub Releases] read-only storage")
  }

  async put(): Promise<void> {
    throw new Error("[GitHub Releases] read-only storage")
  }
}
