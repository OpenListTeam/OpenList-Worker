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
      // sign 语义是「下载签名」（由 pkg/sign 签发），不是远程路径。
      // 之前误塞远程路径会让前端拼出 ?sign=/dav/xxx 这类无效签名，
      // 在 sign_all/link_expiration 开启时被判为「Invalid or expired sign」→ 401。
      sign: "",
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
    // srcPhys/dstPhys 已是源/目标项自身的路径，直接移动即可；
    // 再拼一次 name 会指向不存在的 <item>/<name>，MOVE 源/目标错位。
    // 仅当 names.length > 1 时才按「目录 + 多个 name」展开（防御分支）。
    const srcBasePath = this.getRemotePath(srcPhys)
    const dstBasePath = this.getRemotePath(dstPhys)
    const expand = names && names.length > 1
    const pairs = expand
      ? names.map(
          (n) => [joinPath(srcBasePath, n), joinPath(dstBasePath, n)] as const,
        )
      : [[srcBasePath, dstBasePath] as const]
    for (const [srcPath, dstPath] of pairs) {
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
    // srcPhys/dstPhys 已是源/目标项自身的路径，直接复制即可；
    // 再拼一次 name 会让 COPY 源/目标路径错位。
    // 仅当 names.length > 1 时才按「目录 + 多个 name」展开（防御分支）。
    const srcBasePath = this.getRemotePath(srcPhys)
    const dstBasePath = this.getRemotePath(dstPhys)
    const expand = names && names.length > 1
    const pairs = expand
      ? names.map(
          (n) => [joinPath(srcBasePath, n), joinPath(dstBasePath, n)] as const,
        )
      : [[srcBasePath, dstBasePath] as const]
    for (const [srcPath, dstPath] of pairs) {
      await this.client.copy(srcPath, dstPath, true)
    }
  }

  async remove(
    virtualPath: string,
    physicalPath: string,
    names: string[],
  ): Promise<void> {
    // physicalPath 已是目标项自身的路径（op/storage.ts 逐项解析后传入），
    // 再拼一次 name 会指向 <item>/<name>，WebDAV DELETE 对 404 视作成功，
    // 结果接口静默返回成功但对象仍在。多 name 时才按「目录 + name」展开。
    const expand = names && names.length > 1
    const targets = expand
      ? names.map((n) => joinPath(this.getRemotePath(physicalPath), n))
      : [this.getRemotePath(physicalPath)]
    for (const targetPath of targets) {
      await this.client.remove(targetPath)
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
