// FTP Storage Driver for OpenList
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
    // physicalPath 已是目标项自身的物理路径（op/storage.ts 逐项解析后传入），
    // 再拼一次 name 会指向不存在的 <item>/<name>，导致静默删除失败。
    // 仅当 names.length > 1 时才按「目录 + 多个 name」展开（防御分支）。
    const expand = names && names.length > 1
    const targets = expand
      ? names.map((n) => posixJoin(physicalPath, n))
      : [cleanPosixPath(physicalPath)]
    for (const target of targets) {
      await this.client.removeRecursive(target)
    }
  }

  async move(
    _srcDir: string,
    _dstDir: string,
    names: string[],
    srcPhys: string,
    dstPhys: string,
  ): Promise<void> {
    // srcPhys/dstPhys 已是源/目标项自身的物理路径，直接重命名即可；
    // 再拼 name 会让源/目标路径错位。多 name 时才按「目录 + name」展开。
    const expand = names && names.length > 1
    const pairs = expand
      ? names.map(
          (n) => [posixJoin(srcPhys, n), posixJoin(dstPhys, n)] as const,
        )
      : [[cleanPosixPath(srcPhys), cleanPosixPath(dstPhys)] as const]
    for (const [src, dst] of pairs) {
      await this.client.rename(src, dst)
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
