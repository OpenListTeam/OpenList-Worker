// SFTP Storage Driver
// Ported from OpenList: https://github.com/OpenListTeam/OpenList/tree/main/drivers/sftp

import {
  StorageDriver,
  FileItem,
  calcFileType,
} from "../../internal/driver/base"
import { SFTPAddition, SFTPFileEntry } from "./types"
import { SFTPClientWrapper } from "./util"

export function normalizeSFTPAddition(a: any): SFTPAddition {
  const norm = { ...(a || {}) } as any
  norm.address = (norm.address || "").trim()
  norm.username = (norm.username || "").trim()
  norm.password = norm.password || ""
  norm.private_key = norm.private_key || ""
  norm.passphrase = norm.passphrase || ""
  norm.root_folder_path = (norm.root_folder_path || "/").trim()
  if (!norm.root_folder_path.startsWith("/")) {
    norm.root_folder_path = "/" + norm.root_folder_path
  }
  norm.ignore_symlink_error =
    norm.ignore_symlink_error === true || norm.ignore_symlink_error === "true"
  return norm as SFTPAddition
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

export class SFTPDriver implements StorageDriver {
  private client: SFTPClientWrapper
  private addition: SFTPAddition

  constructor(addition: SFTPAddition) {
    this.addition = normalizeSFTPAddition(addition)
    this.client = new SFTPClientWrapper(this.addition)
  }

  async init(): Promise<void> {
    if (!this.addition.address || !this.addition.username) {
      throw new Error("[SFTP] address and username are required")
    }
    await this.client.getSFTP()
  }

  private async fileToItem(
    entry: SFTPFileEntry,
    parentDir: string,
  ): Promise<FileItem | null> {
    const filename = entry.filename
    if (filename === "." || filename === "..") return null

    const fullPath = posixJoin(parentDir, filename)
    const mode = entry.attrs?.mode || 0
    const isSymlink = (mode & 0o170000) === 0o120000
    const isDir = (mode & 0o170000) === 0o040000
    const mtime = entry.attrs?.mtime
      ? new Date(entry.attrs.mtime * 1000).toISOString()
      : new Date().toISOString()

    if (!isSymlink) {
      return {
        name: filename,
        size: isDir ? 0 : entry.attrs?.size || 0,
        is_dir: isDir,
        modified: mtime,
        sign: fullPath,
        type: calcFileType(filename, isDir),
        raw_url: "",
      }
    }

    // Handle symlink
    try {
      let target = await this.client.readlink(fullPath)
      if (!target.startsWith("/")) {
        target = posixJoin(parentDir, target)
      }
      const targetStats = await this.client.stat(target)
      const targetIsDir = targetStats.isDirectory()
      return {
        name: filename,
        size: targetIsDir ? 0 : targetStats.size || 0,
        is_dir: targetIsDir,
        modified: targetStats.mtime
          ? new Date(targetStats.mtime * 1000).toISOString()
          : mtime,
        sign: fullPath,
        type: calcFileType(filename, targetIsDir),
        raw_url: "",
      }
    } catch (err) {
      if (this.addition.ignore_symlink_error) {
        return {
          name: filename,
          size: 0,
          is_dir: false,
          modified: mtime,
          sign: fullPath,
          type: calcFileType(filename, false),
          raw_url: "",
        }
      }
      throw err
    }
  }

  async list(_virtualPath: string, physicalPath: string): Promise<FileItem[]> {
    const dir = cleanPosixPath(
      physicalPath || this.addition.root_folder_path || "/",
    )
    const entries = await this.client.readdir(dir)

    const items: FileItem[] = []
    for (const entry of entries) {
      const item = await this.fileToItem(entry, dir)
      if (item) items.push(item)
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

    const stats = await this.client.stat(targetPath)
    const isDir = stats.isDirectory()
    const name = targetPath.split("/").filter(Boolean).pop() || "root"
    const mtime = stats.mtime
      ? new Date(stats.mtime * 1000).toISOString()
      : new Date().toISOString()

    return {
      name,
      size: isDir ? 0 : stats.size || 0,
      is_dir: isDir,
      modified: mtime,
      sign: targetPath,
      type: calcFileType(name, isDir),
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
    throw new Error("[SFTP] Copy not supported")
  }

  async put(
    _virtualPath: string,
    physicalPath: string,
    content: Buffer,
  ): Promise<void> {
    const target = cleanPosixPath(physicalPath)
    await this.client.mkdirAll(posixDirname(target))
    await this.client.writeFile(target, content)
  }

  async createReadStream(
    physicalPath: string,
    options?: { start?: number; end?: number },
  ): Promise<any> {
    const target = cleanPosixPath(physicalPath)
    return this.client.createReadStream(target, options)
  }
}
