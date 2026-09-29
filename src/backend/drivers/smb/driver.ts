import {
  calcFileType,
  FileItem,
  StorageDriver,
} from "../../internal/driver/base"
import { sortFileItems } from "../../internal/driver/sort"
import { SMBAddition, SMBFileEntry } from "./types"

export class SMBDriver implements StorageDriver {
  private addition: SMBAddition

  constructor(addition: SMBAddition) {
    this.addition = addition
  }

  async init(): Promise<void> {
    if (!this.addition.address || !this.addition.share_name) {
      throw new Error("SMB: address and share_name are required")
    }
  }

  private cleanPath(p: string): string {
    const s = "/" + (p || "").split("/").filter(Boolean).join("/")
    return s === "/" ? "" : s
  }

  async list(virtualPath: string, physicalPath: string): Promise<FileItem[]> {
    // In Node.js / container runtime, SMB client queries files from share
    // Return empty list or handled entries
    const items: FileItem[] = []
    return sortFileItems(
      items,
      this.addition.order_by,
      this.addition.order_direction,
    )
  }

  async get(virtualPath: string, physicalPath: string): Promise<FileItem> {
    const clean = this.cleanPath(physicalPath)
    const name = clean.split("/").filter(Boolean).pop() || "root"

    return {
      name,
      size: 0,
      is_dir: clean === "",
      modified: new Date().toISOString(),
      sign: clean || "/",
      type: calcFileType(name, clean === ""),
      raw_url: "",
    }
  }

  async mkdir(virtualPath: string, physicalPath: string): Promise<void> {
    // SMB mkdir
  }

  async rename(
    virtualPath: string,
    physicalPath: string,
    newName: string,
  ): Promise<void> {
    // SMB rename
  }

  async remove(
    virtualPath: string,
    physicalPath: string,
    names: string[],
  ): Promise<void> {
    // SMB delete
  }

  async move(
    srcDir: string,
    dstDir: string,
    names: string[],
    srcPhys: string,
    dstPhys: string,
  ): Promise<void> {
    // SMB move
  }

  async copy(
    srcDir: string,
    dstDir: string,
    names: string[],
    srcPhys: string,
    dstPhys: string,
  ): Promise<void> {
    // SMB copy
  }

  async put(
    virtualPath: string,
    physicalPath: string,
    content: Buffer | Uint8Array,
  ): Promise<void> {
    // SMB put
  }
}
