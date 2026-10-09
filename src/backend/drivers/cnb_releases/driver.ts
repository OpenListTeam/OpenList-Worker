import {
  StorageDriver,
  FileItem,
  calcFileType,
} from "../../internal/driver/base"
import { DriverCnbReleasesAddition, CNBAsset } from "./types"
import { ClientCnbReleases } from "./util"

export class DriverCnbReleases implements StorageDriver {
  private client: ClientCnbReleases
  private addition: DriverCnbReleasesAddition

  constructor(addition: DriverCnbReleasesAddition) {
    this.addition = addition
    this.client = new ClientCnbReleases(addition)
  }

  async init(): Promise<void> {
    await this.client.init()
  }

  async list(_virtualPath: string, physicalPath: string): Promise<FileItem[]> {
    const clean = physicalPath.split("/").filter(Boolean).join("/")
    if (!clean) {
      // 根目录：所有 release
      const releases = await this.client.listReleases()
      return releases.map((r) => ({
        name: this.client.releaseName(r),
        size: r.assets.reduce((s, a) => s + a.size, 0),
        is_dir: true,
        modified: r.updated_at || r.created_at || new Date().toISOString(),
        sign: r.id,
        type: 1,
        raw_url: "",
      }))
    }
    // release 目录：先按名称解析出 ID
    const release = await this.client.findRelease(clean.split("/")[0])
    if (!release) return []
    return release.assets.map((a) => ({
      name: a.name,
      size: a.size,
      is_dir: false,
      modified: a.updated_at || a.created_at || new Date().toISOString(),
      sign: a.id,
      type: calcFileType(a.name, false),
      raw_url: this.client.assetDownloadUrl(a),
    }))
  }

  async get(_virtualPath: string, physicalPath: string): Promise<FileItem> {
    const parts = physicalPath.split("/").filter(Boolean)
    const name = parts[parts.length - 1] || "root"
    const clean = parts.join("/")

    // release 目录
    if (parts.length === 1) {
      const release = await this.client.findRelease(parts[0])
      if (release) {
        return {
          name: this.client.releaseName(release),
          size: release.assets.reduce((s, a) => s + a.size, 0),
          is_dir: true,
          modified:
            release.updated_at ||
            release.created_at ||
            new Date().toISOString(),
          sign: release.id,
          type: 1,
          raw_url: "",
        }
      }
    }
    // asset 文件
    if (parts.length === 2) {
      const release = await this.client.findRelease(parts[0])
      const asset = release ? this.client.findAsset(release, parts[1]) : null
      if (release && asset) {
        return {
          name: asset.name,
          size: asset.size,
          is_dir: false,
          modified:
            asset.updated_at || asset.created_at || new Date().toISOString(),
          sign: asset.id,
          type: calcFileType(asset.name, false),
          raw_url: this.client.assetDownloadUrl(asset),
        }
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

  async mkdir(_virtualPath: string, physicalPath: string): Promise<void> {
    const parts = physicalPath.split("/").filter(Boolean)
    if (parts.length === 1) {
      await this.client.createRelease(
        parts[0],
        this.addition.default_branch || "main",
      )
      return
    }
    throw new Error("[CNB Releases] only supports creating releases at root")
  }

  async rename(
    _virtualPath: string,
    physicalPath: string,
    newName: string,
  ): Promise<void> {
    const parts = physicalPath.split("/").filter(Boolean)
    if (parts.length === 1 && !this.addition.use_tag_name) {
      const release = await this.client.findRelease(parts[0])
      if (release) {
        await this.client.renameRelease(release.id, newName)
        return
      }
    }
    throw new Error("[CNB Releases] only release name can be renamed")
  }

  async remove(
    _virtualPath: string,
    physicalPath: string,
    _names: string[],
  ): Promise<void> {
    const parts = physicalPath.split("/").filter(Boolean)
    if (parts.length === 1) {
      const release = await this.client.findRelease(parts[0])
      if (release) {
        await this.client.deleteRelease(release.id)
        return
      }
    }
    if (parts.length === 2) {
      const release = await this.client.findRelease(parts[0])
      const asset = release ? this.client.findAsset(release, parts[1]) : null
      if (release && asset) {
        await this.client.deleteAsset(release.id, asset.id)
        return
      }
    }
    throw new Error("[CNB Releases] invalid path")
  }

  async move(): Promise<void> {
    throw new Error("[CNB Releases] move not supported")
  }

  async copy(): Promise<void> {
    throw new Error("[CNB Releases] copy not supported")
  }

  async put(): Promise<void> {
    throw new Error(
      "[CNB Releases] asset upload not supported in stateless environment",
    )
  }
}
