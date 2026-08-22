// Based on: https://github.com/OpenListTeam/OpenList/tree/main/drivers/s3
import {
  StorageDriver,
  FileItem,
  calcFileType,
} from "../../internal/driver/base"
import { sortFileItems } from "../../internal/driver/sort"
import { S3Addition, S3File } from "./types"
import {
  S3Client,
  joinPath,
  getKey,
  getPlaceholderName,
  getBaseName,
  getDirName,
  isSubPath,
} from "./util"
import { getDogeCredentials } from "./sigv4"

export function normalizeS3Addition(a: any): S3Addition {
  const norm = { ...(a || {}) } as any
  norm.bucket = (norm.bucket || "").trim()
  norm.endpoint = (norm.endpoint || "").trim()
  norm.region = (norm.region || "").trim() || "openlist"
  norm.access_key_id = (norm.access_key_id || "").trim()
  norm.secret_access_key = (norm.secret_access_key || "").trim()
  norm.session_token = (norm.session_token || "").trim()
  norm.root_folder_path = (norm.root_folder_path || "/").trim()
  if (!norm.root_folder_path.startsWith("/")) {
    norm.root_folder_path = "/" + norm.root_folder_path
  }
  norm.custom_host = (norm.custom_host || "").trim()
  norm.enable_custom_host_presign = !!norm.enable_custom_host_presign
  norm.sign_url_expire = Number(norm.sign_url_expire) || 4
  norm.placeholder = (norm.placeholder || "").trim()
  norm.force_path_style = !!norm.force_path_style
  norm.list_object_version = (norm.list_object_version || "v1").toLowerCase()
  norm.remove_bucket = !!norm.remove_bucket
  norm.add_filename_to_disposition = !!norm.add_filename_to_disposition
  norm.enable_direct_upload = !!norm.enable_direct_upload
  norm.direct_upload_host = (norm.direct_upload_host || "").trim()
  norm.user_agent = (norm.user_agent || "").trim()
  norm.order_by = norm.order_by || "name"
  norm.order_direction = norm.order_direction || "asc"
  return norm as S3Addition
}

export class S3Driver implements StorageDriver {
  private client: S3Client
  private addition: S3Addition
  private driverName: string
  private dogeExpiredAt?: number
  private dogeTimer?: any

  constructor(addition: S3Addition, driverName = "S3") {
    this.addition = normalizeS3Addition(addition)
    this.driverName = driverName
    this.client = new S3Client(this.addition)
  }

  async init(): Promise<void> {
    if (this.driverName.toLowerCase().includes("doge")) {
      await this.refreshDogeToken()
    }
  }

  private async refreshDogeToken(): Promise<void> {
    try {
      const creds = await getDogeCredentials(
        this.addition.access_key_id,
        this.addition.secret_access_key,
      )
      this.dogeExpiredAt = creds.expiredAt
      this.client.updateCredentials({
        accessKeyId: creds.accessKeyId,
        secretAccessKey: creds.secretAccessKey,
        sessionToken: creds.sessionToken,
      })
    } catch (e) {
      console.error("[S3Driver] DogeCloud init/refresh session error:", e)
      throw e
    }
  }

  private async checkDogeToken(): Promise<void> {
    if (this.driverName.toLowerCase().includes("doge")) {
      const nowSec = Math.floor(Date.now() / 1000)
      if (!this.dogeExpiredAt || this.dogeExpiredAt - nowSec < 120) {
        await this.refreshDogeToken()
      }
    }
  }

  drop(): void {
    if (this.dogeTimer) {
      clearInterval(this.dogeTimer)
      this.dogeTimer = undefined
    }
  }

  private getRemotePath(physicalPath: string): string {
    const root = this.addition.root_folder_path || "/"
    let combined = physicalPath || "/"
    if (root !== "/" && !isSubPath(root, combined)) {
      combined = joinPath(root, combined)
    }
    return getKey(combined, false)
  }

  private async fileItemFromS3(
    file: S3File,
    remotePath: string,
  ): Promise<FileItem> {
    let rawUrl: string | undefined
    let rawUrlHeaders: Record<string, string> | undefined

    if (!file.isFolder) {
      const linkRes = await this.client.getLink(
        remotePath,
        file.name,
        Number(this.addition.sign_url_expire) || 4,
        this.addition.custom_host,
        this.addition.enable_custom_host_presign,
        this.addition.remove_bucket,
        this.addition.add_filename_to_disposition,
      )
      rawUrl = linkRes.url
      rawUrlHeaders = linkRes.headers
    }

    return {
      name: file.name,
      size: file.size,
      is_dir: file.isFolder,
      modified: file.modified,
      sign: file.etag || remotePath,
      type: calcFileType(file.name, file.isFolder),
      thumb: "",
      raw_url: rawUrl,
      raw_url_headers: rawUrlHeaders,
    }
  }

  async list(virtualPath: string, physicalPath: string): Promise<FileItem[]> {
    await this.checkDogeToken()
    const remotePath = this.getRemotePath(physicalPath)
    const version = this.addition.list_object_version === "v2" ? "v2" : "v1"
    const rawFiles = await this.client.listObjects(remotePath, version, false)

    const items: FileItem[] = []
    for (const file of rawFiles) {
      const itemRemotePath = joinPath(remotePath, file.name)
      const item = await this.fileItemFromS3(file, itemRemotePath)
      items.push(item)
    }

    return sortFileItems(
      items,
      this.addition.order_by || "name",
      this.addition.order_direction || "asc",
    )
  }

  async get(virtualPath: string, physicalPath: string): Promise<FileItem> {
    await this.checkDogeToken()
    const remotePath = this.getRemotePath(physicalPath)
    const head = await this.client.headObject(remotePath)

    if (head) {
      const fileName = getBaseName(remotePath)
      return this.fileItemFromS3(
        {
          name: fileName,
          size: head.size,
          isFolder: false,
          modified: head.modified,
          path: remotePath,
          etag: head.etag,
        },
        remotePath,
      )
    }

    // Check if it's a directory
    const version = this.addition.list_object_version === "v2" ? "v2" : "v1"
    const isDir = await this.client.listPrefixProbe(remotePath, version)
    if (isDir || remotePath === "" || remotePath === "/") {
      const dirName = getBaseName(remotePath)
      return {
        name: dirName,
        size: 0,
        is_dir: true,
        modified: new Date().toISOString(),
        sign: remotePath,
        type: 1,
      }
    }

    throw new Error(`Object not found: ${physicalPath}`)
  }

  async mkdir(virtualPath: string, physicalPath: string): Promise<void> {
    await this.checkDogeToken()
    const remotePath = this.getRemotePath(physicalPath)
    const placeholderName = getPlaceholderName(this.addition.placeholder)
    const placeholderKey = joinPath(remotePath, placeholderName)
    await this.client.putObject(placeholderKey, new Uint8Array(0))
  }

  async rename(
    virtualPath: string,
    physicalPath: string,
    newName: string,
  ): Promise<void> {
    await this.checkDogeToken()
    const oldPath = this.getRemotePath(physicalPath)
    const parentDir = getDirName(oldPath)
    const newPath = joinPath(parentDir, newName)

    const head = await this.client.headObject(oldPath)
    if (head) {
      // File rename
      await this.client.copyObject(oldPath, newPath, head.size)
      await this.client.deleteObject(oldPath)
    } else {
      // Directory rename
      await this.copyDirRecursive(oldPath, newPath)
      await this.removeDirRecursive(oldPath)
    }
  }

  async move(
    srcDir: string,
    dstDir: string,
    names: string[],
    srcPhys: string,
    dstPhys: string,
  ): Promise<void> {
    await this.checkDogeToken()
    const srcBase = this.getRemotePath(srcPhys)
    const dstBase = this.getRemotePath(dstPhys)

    for (const name of names) {
      const srcPath = joinPath(srcBase, name)
      const dstPath = joinPath(dstBase, name)
      const head = await this.client.headObject(srcPath)
      if (head) {
        await this.client.copyObject(srcPath, dstPath, head.size)
        await this.client.deleteObject(srcPath)
      } else {
        await this.copyDirRecursive(srcPath, dstPath)
        await this.removeDirRecursive(srcPath)
      }
    }
  }

  async copy(
    srcDir: string,
    dstDir: string,
    names: string[],
    srcPhys: string,
    dstPhys: string,
  ): Promise<void> {
    await this.checkDogeToken()
    const srcBase = this.getRemotePath(srcPhys)
    const dstBase = this.getRemotePath(dstPhys)

    for (const name of names) {
      const srcPath = joinPath(srcBase, name)
      const dstPath = joinPath(dstBase, name)
      const head = await this.client.headObject(srcPath)
      if (head) {
        await this.client.copyObject(srcPath, dstPath, head.size)
      } else {
        await this.copyDirRecursive(srcPath, dstPath)
      }
    }
  }

  private async copyDirRecursive(src: string, dst: string): Promise<void> {
    const version = this.addition.list_object_version === "v2" ? "v2" : "v1"
    const rawFiles = await this.client.listObjects(src, version, true)
    for (const file of rawFiles) {
      const childSrc = joinPath(src, file.name)
      const childDst = joinPath(dst, file.name)
      if (file.isFolder) {
        await this.copyDirRecursive(childSrc, childDst)
      } else {
        await this.client.copyObject(childSrc, childDst, file.size)
      }
    }
  }

  async remove(
    virtualPath: string,
    physicalPath: string,
    names: string[],
  ): Promise<void> {
    await this.checkDogeToken()
    const basePath = this.getRemotePath(physicalPath)

    if (names && names.length > 0) {
      for (const name of names) {
        const targetPath = joinPath(basePath, name)
        const head = await this.client.headObject(targetPath)
        if (head) {
          await this.client.deleteObject(targetPath)
        } else {
          await this.removeDirRecursive(targetPath)
        }
      }
    } else {
      const head = await this.client.headObject(basePath)
      if (head) {
        await this.client.deleteObject(basePath)
      } else {
        await this.removeDirRecursive(basePath)
      }
    }
  }

  private async removeDirRecursive(dirPath: string): Promise<void> {
    const version = this.addition.list_object_version === "v2" ? "v2" : "v1"
    const rawFiles = await this.client.listObjects(dirPath, version, true)
    for (const file of rawFiles) {
      const childPath = joinPath(dirPath, file.name)
      if (file.isFolder) {
        await this.removeDirRecursive(childPath)
      } else {
        await this.client.deleteObject(childPath)
      }
    }
    const placeholderName = getPlaceholderName(this.addition.placeholder)
    await this.client
      .deleteObject(joinPath(dirPath, placeholderName))
      .catch(() => {})
    if (this.addition.placeholder) {
      await this.client
        .deleteObject(joinPath(dirPath, this.addition.placeholder))
        .catch(() => {})
    }
  }

  async put(
    virtualPath: string,
    physicalPath: string,
    content: Buffer | Uint8Array,
  ): Promise<void> {
    await this.checkDogeToken()
    const remotePath = this.getRemotePath(physicalPath)
    await this.client.putObject(remotePath, content)
  }

  async getDirectUploadInfo(
    dstDir: string,
    fileName: string,
  ): Promise<{ upload_url: string; method: string }> {
    if (!this.addition.enable_direct_upload) {
      throw new Error("Direct upload is not enabled")
    }
    await this.checkDogeToken()
    const remoteDir = this.getRemotePath(dstDir)
    return await this.client.getDirectUploadInfo(
      remoteDir,
      fileName,
      Number(this.addition.sign_url_expire) || 4,
      this.addition.direct_upload_host,
    )
  }

  async other(method: string, path: string, body?: any): Promise<any> {
    if (method === "direct_upload" || method === "get_direct_upload_info") {
      const fileName = body?.name || body?.fileName || getBaseName(path)
      const dstDir = getDirName(path)
      return await this.getDirectUploadInfo(dstDir, fileName)
    }
    throw new Error(`Unsupported method ${method}`)
  }
}
