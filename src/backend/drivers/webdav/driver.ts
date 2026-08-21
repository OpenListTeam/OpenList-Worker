import {
  StorageDriver,
  FileItem,
  calcFileType,
} from "../../internal/driver/base"
import { sortFileItems } from "../../internal/driver/sort"
import { WebdavAddition, WebdavFile } from "./types"
import { WebdavClient, joinPath } from "./util"

export function normalizeWebdavAddition(a: any): WebdavAddition {
  const norm = { ...(a || {}) } as any
  norm.vendor = norm.vendor || "other"
  norm.address = (norm.address || "").trim()
  norm.username = (norm.username || "").trim()
  norm.password = norm.password || ""
  norm.root_folder_path = (norm.root_folder_path || "/").trim()
  if (!norm.root_folder_path.startsWith("/")) {
    norm.root_folder_path = "/" + norm.root_folder_path
  }
  norm.tls_insecure_skip_verify = !!norm.tls_insecure_skip_verify
  norm.order_by = norm.order_by || "name"
  norm.order_direction = norm.order_direction || "asc"
  return norm as WebdavAddition
}

export class WebdavDriver implements StorageDriver {
  private client: WebdavClient
  private addition: WebdavAddition

  constructor(addition: WebdavAddition) {
    this.addition = normalizeWebdavAddition(addition)
    this.client = new WebdavClient(this.addition)
  }

  async init(): Promise<void> {
    await this.client.init()
  }

  private getRemotePath(physicalPath: string): string {
    const root = this.addition.root_folder_path || "/"
    return joinPath(root, physicalPath || "/")
  }

  private fileItemFromWebdav(item: WebdavFile, remotePath: string): FileItem {
    const link = this.client.getLink(remotePath)
    return {
      name: item.name,
      size: item.size,
      is_dir: item.isFolder,
      modified: item.modified,
      sign: item.path || remotePath,
      type: calcFileType(item.name, item.isFolder),
      thumb: "",
      raw_url: item.isFolder ? undefined : link.url,
      raw_url_headers: item.isFolder ? undefined : link.headers,
    }
  }

  async list(virtualPath: string, physicalPath: string): Promise<FileItem[]> {
    const remotePath = this.getRemotePath(physicalPath)
    const rawFiles = await this.client.readDir(remotePath)

    const items: FileItem[] = rawFiles.map((file) => {
      const itemRemotePath = joinPath(remotePath, file.name)
      return this.fileItemFromWebdav(file, itemRemotePath)
    })

    return sortFileItems(
      items,
      this.addition.order_by || "name",
      this.addition.order_direction || "asc",
    )
  }

  async get(virtualPath: string, physicalPath: string): Promise<FileItem> {
    const remotePath = this.getRemotePath(physicalPath)
    const file = await this.client.stat(remotePath)
    return this.fileItemFromWebdav(file, remotePath)
  }

  async mkdir(virtualPath: string, physicalPath: string): Promise<void> {
    const remotePath = this.getRemotePath(physicalPath)
    await this.client.mkdirAll(remotePath)
  }

  async rename(
    virtualPath: string,
    physicalPath: string,
    newName: string,
  ): Promise<void> {
    const oldPath = this.getRemotePath(physicalPath)
    const lastSlash = oldPath.lastIndexOf("/")
    const parentDir = lastSlash >= 0 ? oldPath.substring(0, lastSlash) : "/"
    const newPath = joinPath(parentDir, newName)
    await this.client.move(oldPath, newPath, true)
  }

  async move(
    srcDir: string,
    dstDir: string,
    names: string[],
    srcPhys: string,
    dstPhys: string,
  ): Promise<void> {
    const srcBasePath = this.getRemotePath(srcPhys)
    const dstBasePath = this.getRemotePath(dstPhys)
    for (const name of names) {
      const srcPath = joinPath(srcBasePath, name)
      const dstPath = joinPath(dstBasePath, name)
      await this.client.move(srcPath, dstPath, true)
    }
  }

  async copy(
    srcDir: string,
    dstDir: string,
    names: string[],
    srcPhys: string,
    dstPhys: string,
  ): Promise<void> {
    const srcBasePath = this.getRemotePath(srcPhys)
    const dstBasePath = this.getRemotePath(dstPhys)
    for (const name of names) {
      const srcPath = joinPath(srcBasePath, name)
      const dstPath = joinPath(dstBasePath, name)
      await this.client.copy(srcPath, dstPath, true)
    }
  }

  async remove(
    virtualPath: string,
    physicalPath: string,
    names: string[],
  ): Promise<void> {
    const basePath = this.getRemotePath(physicalPath)
    if (names && names.length > 0) {
      for (const name of names) {
        const targetPath = joinPath(basePath, name)
        await this.client.remove(targetPath)
      }
    } else {
      await this.client.remove(basePath)
    }
  }

  async put(
    virtualPath: string,
    physicalPath: string,
    content: Buffer,
  ): Promise<void> {
    const remotePath = this.getRemotePath(physicalPath)
    await this.client.put(remotePath, content)
  }
}
