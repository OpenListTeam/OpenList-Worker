import {
  calcFileType,
  FileItem,
  StorageDriver,
} from "../../internal/driver/base"
import { sortFileItems } from "../../internal/driver/sort"
import { OnedriveSharelinkAddition } from "./types"
import { OnedriveSharelinkApiClient } from "./util"

export class OnedriveSharelinkDriver implements StorageDriver {
  private addition: OnedriveSharelinkAddition
  private client: OnedriveSharelinkApiClient

  constructor(addition: OnedriveSharelinkAddition) {
    this.addition = addition
    this.client = new OnedriveSharelinkApiClient(addition)
  }

  async init(): Promise<void> {
    await this.client.init()
  }

  private cleanPath(p: string): string {
    const s = "/" + (p || "").split("/").filter(Boolean).join("/")
    return s === "/" ? "/" : s
  }

  async list(virtualPath: string, physicalPath: string): Promise<FileItem[]> {
    const clean = this.cleanPath(physicalPath)
    const files = await this.client.getFiles(clean)

    const items: FileItem[] = files.map((f) => ({
      name: f.name,
      size: f.size || 0,
      is_dir: f.is_folder,
      modified: f.modified || new Date().toISOString(),
      sign: f.id || f.name,
      type: calcFileType(f.name, f.is_folder),
      raw_url: f.download_url || "",
    }))

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
        sign: "root",
        type: 1,
        raw_url: "",
      }
    }

    const files = await this.client.getFiles("/")
    const found = files.find((f) => f.name === name)
    if (!found) {
      throw new Error(`File not found: ${clean}`)
    }

    return {
      name: found.name,
      size: found.size || 0,
      is_dir: found.is_folder,
      modified: found.modified || new Date().toISOString(),
      sign: found.id || found.name,
      type: calcFileType(found.name, found.is_folder),
      raw_url:
        found.download_url ||
        this.client.getDirectDownloadLink(this.addition.url),
    }
  }

  async link(
    virtualPath: string,
    physicalPath: string,
  ): Promise<{ url: string; headers?: Record<string, string> }> {
    const item = await this.get(virtualPath, physicalPath)
    if (item.is_dir) {
      throw new Error(`Cannot get link for folder: ${physicalPath}`)
    }

    const url =
      item.raw_url || this.client.getDirectDownloadLink(this.addition.url)
    return { url }
  }

  async mkdir(virtualPath: string, physicalPath: string): Promise<void> {
    throw new Error("OneDrive Sharelink is read-only")
  }

  async rename(
    virtualPath: string,
    physicalPath: string,
    newName: string,
  ): Promise<void> {
    throw new Error("OneDrive Sharelink is read-only")
  }

  async remove(
    virtualPath: string,
    physicalPath: string,
    names: string[],
  ): Promise<void> {
    throw new Error("OneDrive Sharelink is read-only")
  }

  async move(
    srcDir: string,
    dstDir: string,
    names: string[],
    srcPhys: string,
    dstPhys: string,
  ): Promise<void> {
    throw new Error("OneDrive Sharelink is read-only")
  }

  async copy(
    srcDir: string,
    dstDir: string,
    names: string[],
    srcPhys: string,
    dstPhys: string,
  ): Promise<void> {
    throw new Error("OneDrive Sharelink is read-only")
  }

  async put(
    virtualPath: string,
    physicalPath: string,
    content: Buffer | Uint8Array,
  ): Promise<void> {
    throw new Error("OneDrive Sharelink is read-only")
  }
}
