// FTP Storage Driver for OpenListNext
// Ported from OpenList: https://github.com/OpenListTeam/OpenList/tree/main/drivers/ftp

import {
  StorageDriver,
  FileItem,
  calcFileType,
} from "../../internal/driver/base"
import { FTPAddition, FTPFileEntry } from "./types"
import { FTPClient } from "./ftp-client"

export function normalizeFTPAddition(a: any): FTPAddition {
  const norm = { ...(a || {}) } as any
  norm.address = (norm.address || "").trim()
  norm.username = (norm.username || "").trim()
  norm.password = norm.password || ""
  norm.encoding = (norm.encoding || "utf-8").trim()
  norm.cwd_list = norm.cwd_list === true || norm.cwd_list === "true"
  norm.root_folder_path = (norm.root_folder_path || "/").trim()
  if (!norm.root_folder_path.startsWith("/")) {
    norm.root_folder_path = "/" + norm.root_folder_path
  }
  return norm as FTPAddition
}

function cleanPosixPath(p: string): string {
  const normalized = (p || "").replace(/\\/g, "/")
  const parts = normalized.split("/").filter(Boolean)
  return "/" + parts.join("/")
}

function posixDirname(p: string): string {
  const clean = cleanPosixPath(p)
  const lastSlash = clean.lastIndexOf("/")
  if (lastSlash <= 0) return "/"
  return clean.slice(0, lastSlash)
}

function posixJoin(...parts: string[]): string {
  const joined = parts.map((p) => (p || "").replace(/\\/g, "/")).join("/")
  return cleanPosixPath(joined)
}

export class FTPDriver implements StorageDriver {
  private client: FTPClient
  private addition: FTPAddition

  constructor(addition: FTPAddition) {
    this.addition = normalizeFTPAddition(addition)
    this.client = new FTPClient(this.addition)
  }

  async init(): Promise<void> {
    if (!this.addition.address || !this.addition.username) {
      throw new Error("[FTP] address and username are required")
    }
    await this.client.connect()
  }

  async list(_virtualPath: string, physicalPath: string): Promise<FileItem[]> {
    const dir = cleanPosixPath(
      physicalPath || this.addition.root_folder_path || "/",
    )
    const cwdList = Boolean(this.addition.cwd_list)
    const entries = await this.client.list(dir, cwdList)

    const items: FileItem[] = []
    for (const entry of entries) {
      const fullPath = posixJoin(dir, entry.name)
      const mtime = entry.modified
        ? new Date(entry.modified).toISOString()
        : new Date().toISOString()

      items.push({
        name: entry.name,
        size: entry.is_dir ? 0 : entry.size,
        is_dir: entry.is_dir,
        modified: mtime,
        sign: fullPath,
        type: calcFileType(entry.name, entry.is_dir),
        raw_url: "",
      })
    }
    return items
  }

  async get(_virtualPath: string, physicalPath: string): Promise<FileItem> {
    const targetPath = cleanPosixPath(
      physicalPath || this.addition.root_folder_path || "/",
    )
    if (
      targetPath === "/" ||
      targetPath === cleanPosixPath(this.addition.root_folder_path || "/")
    ) {
      return {
        name: "root",
        size: 0,
        is_dir: true,
        modified: new Date().toISOString(),
        sign: targetPath,
        type: 1,
        raw_url: "",
      }
    }

    const stat = await this.client.stat(targetPath)
    const name = targetPath.split("/").filter(Boolean).pop() || "root"
    const mtime = stat.modified
      ? new Date(stat.modified).toISOString()
      : new Date().toISOString()

    return {
      name,
      size: stat.is_dir ? 0 : stat.size,
      is_dir: stat.is_dir,
      modified: mtime,
      sign: targetPath,
      type: calcFileType(name, stat.is_dir),
      raw_url: "",
    }
  }

  async mkdir(_virtualPath: string, physicalPath: string): Promise<void> {
    const dir = cleanPosixPath(physicalPath)
    await this.client.mkdirAll(dir)
  }

  async rename(
    _virtualPath: string,
    physicalPath: string,
    newName: string,
  ): Promise<void> {
    const src = cleanPosixPath(physicalPath)
    const dst = posixJoin(posixDirname(src), newName)
    await this.client.rename(src, dst)
  }

  async remove(
    _virtualPath: string,
    physicalPath: string,
    names: string[],
  ): Promise<void> {
    const targetDir = cleanPosixPath(physicalPath)
    if (names && names.length > 0) {
      for (const name of names) {
        await this.client.removeRecursive(posixJoin(targetDir, name))
      }
    } else {
      await this.client.removeRecursive(targetDir)
    }
  }

  async move(
    _srcDir: string,
    dstDir: string,
    names: string[],
    srcPhys: string,
    dstPhys: string,
  ): Promise<void> {
    if (names && names.length > 0) {
      for (const name of names) {
        const src = posixJoin(srcPhys, name)
        const dst = posixJoin(dstPhys, name)
        await this.client.rename(src, dst)
      }
    } else {
      const filename = srcPhys.split("/").filter(Boolean).pop() || ""
      const dst = posixJoin(dstDir, filename)
      await this.client.rename(cleanPosixPath(srcPhys), dst)
    }
  }

  async copy(
    _srcDir: string,
    _dstDir: string,
    _names: string[],
    _srcPhys: string,
    _dstPhys: string,
  ): Promise<void> {
    throw new Error("[FTP] Copy not supported")
  }

  async put(
    _virtualPath: string,
    physicalPath: string,
    content: Buffer,
  ): Promise<void> {
    const target = cleanPosixPath(physicalPath)
    await this.client.mkdirAll(posixDirname(target))
    await this.client.upload(target, content)
  }

  async createReadStream(
    physicalPath: string,
    options?: { start?: number; end?: number },
  ): Promise<any> {
    const target = cleanPosixPath(physicalPath)
    return this.client.download(target, options)
  }
}
