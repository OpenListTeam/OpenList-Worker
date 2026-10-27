// 书生云盘 (InternAI Discovery Cloud Disk) driver.
//
// Read/write path-based driver: the cloud-disk API is addressed by absolute
// paths (`dir_path` / `file_key`), which maps 1:1 onto OpenList's physical
// paths (already prefixed with the storage root_folder_path by resolvePath).
import {
  calcFileType,
  FileItem,
  StorageDriver,
} from "../../internal/driver/base"
import { sortFileItems } from "../../internal/driver/sort"
import { InternAIAddition } from "./types"
import { cleanKey, InternAIClient } from "./util"

const EPOCH_ISO = "1970-01-01T00:00:00Z"

function nameOf(fileKey: string, fileName?: string): string {
  if (fileName) return fileName
  const parts = cleanKey(fileKey).split("/").filter(Boolean)
  return parts[parts.length - 1] || "root"
}

/** Normalize the platform timestamp into an ISO string (epoch fallback). */
function toIso(ts?: string | number | null): string {
  if (ts !== undefined && ts !== null && ts !== "") {
    // production returns unix-seconds numbers; also accept ms numbers,
    // numeric strings and RFC3339 strings
    const n = typeof ts === "number" ? ts : Number(String(ts).trim())
    if (Number.isFinite(n) && String(ts).trim() !== "") {
      const ms = n < 1e12 ? n * 1000 : n
      if (n > 0) return new Date(ms).toISOString()
    }
    const ms = Date.parse(String(ts))
    if (Number.isFinite(ms)) return new Date(ms).toISOString()
  }
  return EPOCH_ISO
}

export class DriverInternAI implements StorageDriver {
  private client: InternAIClient
  private addition: InternAIAddition

  constructor(addition: InternAIAddition) {
    this.addition = addition || ({} as InternAIAddition)
    this.client = new InternAIClient(this.addition)
  }

  async init(): Promise<void> {
    this.addition.root_folder_path = cleanPathRoot(
      this.addition.root_folder_path || "/",
    )
    await this.client.init()
  }

  async list(_virtualPath: string, physicalPath: string): Promise<FileItem[]> {
    const p = cleanKey(physicalPath)
    const files = await this.client.listAll(p)
    const items: FileItem[] = files.map((f) => {
      const name = nameOf(f.file_key, f.file_name)
      const isDir = !!f.is_dir
      return {
        name,
        size: Number(f.size) || 0,
        is_dir: isDir,
        modified: toIso(f.modified_at || f.created_at),
        sign: "",
        type: calcFileType(name, isDir),
        raw_url: "",
      }
    })
    return sortFileItems(
      items,
      (this.addition as any).order_by,
      (this.addition as any).order_direction,
    )
  }

  async get(_virtualPath: string, physicalPath: string): Promise<FileItem> {
    const p = cleanKey(physicalPath)
    // 存储根目录：resolvePath 已钳制在 root_folder_path 内，直接视为文件夹
    if (p === "/") {
      return {
        name: "root",
        size: 0,
        is_dir: true,
        modified: EPOCH_ISO,
        sign: "",
        type: 1,
        raw_url: "",
      }
    }
    const parent = cleanKey(p.split("/").slice(0, -1).join("/")) || "/"
    const entries = await this.client.listAll(parent)
    const name = nameOf(p)
    const hit = entries.find(
      (f) => nameOf(f.file_key, f.file_name) === name,
    )
    if (!hit) {
      throw new Error(`[InternAI] object not found: ${p}`)
    }
    const isDir = !!hit.is_dir
    const rawUrl = isDir ? "" : await this.client.getDownloadUrl(p)
    return {
      name,
      size: Number(hit.size) || 0,
      is_dir: isDir,
      modified: toIso(hit.modified_at || hit.created_at),
      sign: "",
      type: calcFileType(name, isDir),
      raw_url: rawUrl,
    }
  }

  async mkdir(_virtualPath: string, physicalPath: string): Promise<void> {
    const p = cleanKey(physicalPath)
    const parent = cleanKey(p.split("/").slice(0, -1).join("/")) || "/"
    const name = nameOf(p)
    if (!name || name === "root") {
      throw new Error("[InternAI] cannot create the storage root")
    }
    await this.client.mkdir(parent, name)
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
    _names: string[],
  ): Promise<void> {
    await this.client.remove([physicalPath])
  }

  async move(
    _srcDir: string,
    _dstDir: string,
    _names: string[],
    srcPhys: string,
    dstPhys: string,
  ): Promise<void> {
    // dstPhys 是含文件名的完整目标路径（resolvePath(dstDir/name)），
    // API 需要的是目标目录：取父目录
    const dstDirKey = cleanKey(dstPhys.split("/").slice(0, -1).join("/")) || "/"
    await this.client.move([srcPhys], dstDirKey)
  }

  async copy(
    _srcDir: string,
    _dstDir: string,
    _names: string[],
    srcPhys: string,
    dstPhys: string,
  ): Promise<void> {
    const dstDirKey = cleanKey(dstPhys.split("/").slice(0, -1).join("/")) || "/"
    await this.client.copy([srcPhys], dstDirKey)
  }

  async put(
    _virtualPath: string,
    physicalPath: string,
    content: Buffer,
  ): Promise<void> {
    const p = cleanKey(physicalPath)
    const parent = cleanKey(p.split("/").slice(0, -1).join("/")) || "/"
    const name = nameOf(p)
    const uploadUrl = await this.client.getUploadUrl(
      parent,
      name,
      content.byteLength,
    )
    await this.client.putRaw(uploadUrl, new Uint8Array(content))
  }
}

function cleanPathRoot(p: string): string {
  const cleaned = cleanKey(p)
  return cleaned
}
