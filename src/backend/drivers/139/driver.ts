import {
  calcFileType,
  FileItem,
  StorageDriver,
} from "../../internal/driver/base"
import { sortFileItems } from "../../internal/driver/sort"
import { Yun139Addition } from "./types"
import { Yun139ApiClient } from "./util"

export class Yun139Driver implements StorageDriver {
  private addition: Yun139Addition
  private client: Yun139ApiClient

  constructor(addition: Yun139Addition) {
    this.addition = addition
    this.client = new Yun139ApiClient(addition)
  }

  async init(): Promise<void> {
    await this.client.init()
  }

  private cleanPath(p: string): string {
    const s = "/" + (p || "").split("/").filter(Boolean).join("/")
    return s === "/" ? "/" : s
  }

  private getRootId(): string {
    if (this.addition.root_folder_id) {
      return this.addition.root_folder_id
    }
    return this.client.isPersonalNew() ? "/" : ""
  }

  private async resolveCatalogId(physicalPath: string): Promise<string> {
    const clean = this.cleanPath(physicalPath)
    if (clean === "/") {
      return this.getRootId()
    }

    const parts = clean.split("/").filter(Boolean)
    let currentCatalogId = this.getRootId()

    for (const part of parts) {
      const disk = await this.client.listFiles(currentCatalogId)
      const foundFolder = disk.folders.find((f) => f.catalogName === part)
      if (foundFolder) {
        currentCatalogId = foundFolder.catalogID
      } else {
        break
      }
    }

    return currentCatalogId
  }

  async list(virtualPath: string, physicalPath: string): Promise<FileItem[]> {
    const clean = this.cleanPath(physicalPath)
    const catalogId = await this.resolveCatalogId(clean)
    const disk = await this.client.listFiles(catalogId)

    const folderItems: FileItem[] = disk.folders.map((f) => ({
      name: f.catalogName,
      size: 0,
      is_dir: true,
      modified: f.updateTime || new Date().toISOString(),
      sign: f.catalogID,
      type: 1,
      raw_url: "",
    }))

    const fileItems: FileItem[] = disk.files.map((f) => {
      const sizeNum =
        typeof f.contentSize === "number"
          ? f.contentSize
          : parseInt(String(f.contentSize || "0"), 10)
      const name = f.contentName || "file"
      return {
        name,
        size: isNaN(sizeNum) ? 0 : sizeNum,
        is_dir: false,
        modified: f.updateTime || f.createTime || new Date().toISOString(),
        sign: f.contentID || name,
        type: calcFileType(name, false),
        thumb: f.thumbnailURL || f.bigThumbnailURL,
        raw_url: "",
      }
    })

    const items = [...folderItems, ...fileItems]
    return sortFileItems(
      items,
      this.addition.order_by,
      this.addition.order_direction,
    )
  }

  async get(virtualPath: string, physicalPath: string): Promise<FileItem> {
    const clean = this.cleanPath(physicalPath)
    const name = clean.split("/").filter(Boolean).pop() || "root"

    if (clean === "/") {
      return {
        name: "root",
        size: 0,
        is_dir: true,
        modified: new Date().toISOString(),
        sign: this.getRootId(),
        type: 1,
        raw_url: "",
      }
    }

    const parentPath = clean.substring(0, clean.lastIndexOf("/")) || "/"
    const parentCatalogId = await this.resolveCatalogId(parentPath)
    const disk = await this.client.listFiles(parentCatalogId)

    const foundFolder = disk.folders.find((f) => f.catalogName === name)
    if (foundFolder) {
      return {
        name: foundFolder.catalogName,
        size: 0,
        is_dir: true,
        modified: foundFolder.updateTime || new Date().toISOString(),
        sign: foundFolder.catalogID,
        type: 1,
        raw_url: "",
      }
    }

    const foundFile = disk.files.find((f) => f.contentName === name)
    if (foundFile) {
      const sizeNum =
        typeof foundFile.contentSize === "number"
          ? foundFile.contentSize
          : parseInt(String(foundFile.contentSize || "0"), 10)
      let rawUrl = ""
      if (foundFile.contentID) {
        try {
          rawUrl = await this.client.getDownloadUrl(foundFile.contentID)
        } catch (e) {
          console.warn("[139] failed to get download url in get():", e)
        }
      }
      return {
        name: foundFile.contentName || name,
        size: isNaN(sizeNum) ? 0 : sizeNum,
        is_dir: false,
        modified:
          foundFile.updateTime ||
          foundFile.createTime ||
          new Date().toISOString(),
        sign: foundFile.contentID || name,
        type: calcFileType(name, false),
        thumb: foundFile.thumbnailURL || foundFile.bigThumbnailURL,
        raw_url: rawUrl,
      }
    }

    throw new Error(`Item not found: ${clean}`)
  }

  async link(
    virtualPath: string,
    physicalPath: string,
  ): Promise<{ url: string; headers?: Record<string, string> }> {
    const item = await this.get(virtualPath, physicalPath)
    if (item.is_dir) {
      throw new Error(`Cannot get link for folder: ${physicalPath}`)
    }

    const url = await this.client.getDownloadUrl(item.sign)
    return {
      url,
      headers: {
        Referer: "https://yun.139.com/",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    }
  }

  async mkdir(virtualPath: string, physicalPath: string): Promise<void> {
    const clean = this.cleanPath(physicalPath)
    const parentPath = clean.substring(0, clean.lastIndexOf("/")) || "/"
    const dirName = clean.substring(clean.lastIndexOf("/") + 1)
    const parentCatalogId = await this.resolveCatalogId(parentPath)

    await this.client.createCatalog(parentCatalogId, dirName)
  }

  async rename(
    virtualPath: string,
    physicalPath: string,
    newName: string,
  ): Promise<void> {
    const item = await this.get(virtualPath, physicalPath)
    await this.client.rename(item.sign, newName)
  }

  async remove(
    virtualPath: string,
    physicalPath: string,
    names: string[],
  ): Promise<void> {
    const clean = this.cleanPath(physicalPath)
    const catalogId = await this.resolveCatalogId(clean)
    const disk = await this.client.listFiles(catalogId)

    for (const name of names) {
      const folder = disk.folders.find((f) => f.catalogName === name)
      if (folder) {
        await this.client.deleteCatalog(folder.catalogID)
      } else {
        const file = disk.files.find((f) => f.contentName === name)
        if (file && file.contentID) {
          await this.client.deleteFile(file.contentID)
        }
      }
    }
  }

  async move(
    srcDir: string,
    dstDir: string,
    names: string[],
    srcPhys: string,
    dstPhys: string,
  ): Promise<void> {
    console.warn(`[139] move from ${srcPhys} to ${dstPhys}`)
  }

  async copy(
    srcDir: string,
    dstDir: string,
    names: string[],
    srcPhys: string,
    dstPhys: string,
  ): Promise<void> {
    console.warn(`[139] copy from ${srcPhys} to ${dstPhys}`)
  }

  async put(
    virtualPath: string,
    physicalPath: string,
    content: Buffer | Uint8Array,
  ): Promise<void> {
    console.warn(`[139] put for ${physicalPath}`)
  }

  async getDetails(): Promise<{ total_space?: number; used_space?: number }> {
    try {
      const details = await this.client.getStorageDetails()
      return {
        total_space: details.total,
        used_space: details.used,
      }
    } catch {
      return {}
    }
  }
}
