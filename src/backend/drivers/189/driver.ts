// 189 Cloud Drive (天翼云盘) driver
// Re-ported from: https://github.com/OpenListTeam/OpenList/tree/main/drivers/189
import {
  StorageDriver,
  FileItem,
  calcFileType,
} from "../../internal/driver/base"
import { sortFileItems } from "../../internal/driver/sort"
import { Cloud189Addition, FileItem189, FolderItem189 } from "./types"
import { Pan189Client } from "./util"
import { md5Hex } from "./crypto"

const SUBREQUEST_LIMIT = 45
const UPLOAD_CHUNK_SIZE = 10 * 1024 * 1024

interface Cloud189UploadSession {
  uploadFileId: string
  sessionKey: string
  fileMd5: string
  size: number
  partCount: number
  chunkSize: number
}

function encodeUploadSession(session: Cloud189UploadSession): string {
  return Buffer.from(JSON.stringify(session), "utf8").toString("base64")
}

function decodeUploadSession(token: string): Cloud189UploadSession {
  try {
    const session = JSON.parse(
      Buffer.from(token, "base64").toString("utf8"),
    ) as Cloud189UploadSession
    if (
      !session ||
      !session.uploadFileId ||
      !session.sessionKey ||
      !session.fileMd5 ||
      !Number.isInteger(session.partCount) ||
      session.partCount < 1 ||
      !Number.isInteger(session.chunkSize) ||
      session.chunkSize < 1
    ) {
      throw new Error("invalid upload session")
    }
    return session
  } catch {
    throw new Error("[189Cloud] 上传会话无效或已损坏")
  }
}

function parse189Date(dateStr: string): string {
  if (!dateStr) return new Date().toISOString()
  try {
    const d = new Date(dateStr)
    if (!isNaN(d.getTime())) return d.toISOString()
  } catch {}
  return new Date().toISOString()
}

function pan189FolderToFileItem(folder: FolderItem189): FileItem {
  return {
    name: folder.name,
    size: 0,
    is_dir: true,
    modified: parse189Date(folder.lastOpTime),
    sign: String(folder.id),
    type: 1,
    thumb: "",
    raw_url: "",
  }
}

function pan189FileToFileItem(file: FileItem189): FileItem {
  return {
    name: file.name,
    size: file.size || 0,
    is_dir: false,
    modified: parse189Date(file.lastOpTime),
    sign: String(file.id),
    type: calcFileType(file.name, false),
    thumb: file.icon?.smallUrl || file.icon?.largeUrl || "",
    raw_url: "",
  }
}

export function normalizeCloud189Addition(a: any): Cloud189Addition {
  const norm = { ...(a || {}) } as any
  norm.username = norm.username || ""
  norm.password = norm.password || ""
  norm.cookie = (norm.cookie || "").trim()
  norm.root_folder_id = norm.root_folder_id || "-11"
  norm.order_by = norm.order_by || "lastOpTime"
  norm.order_direction = norm.order_direction || "desc"
  return norm as Cloud189Addition
}

export class Cloud189Driver implements StorageDriver {
  private client: Pan189Client
  private addition: Cloud189Addition
  /** cache: physical path -> folderId (string) */
  private pathIdCache = new Map<string, string>()
  /** CF Workers subrequest budget */
  private budget = { used: 0, limit: SUBREQUEST_LIMIT }

  constructor(
    addition: Cloud189Addition,
    onCookieUpdate?: (cookie: string) => void,
  ) {
    this.addition = normalizeCloud189Addition(addition)
    this.client = new Pan189Client(this.addition, onCookieUpdate)
  }

  async init(): Promise<void> {
    await this.client.login()
  }

  /**
   * Expose a one-shot Cookie update for the storage layer.  The driver keeps
   * the live Cookie in memory, while request handling decides when and where
   * to persist it.
   */
  consumePendingCookie(): string | null {
    return this.client.consumePendingCookie()
  }

  /**
   * 将 physicalPath 解析为对应的 folderId。
   * 逐级向下解析并缓存路径 ID 映射。
   */
  private async resolveFolderId(physicalPath: string): Promise<string> {
    const rootId = this.client.getRootId()
    const clean =
      "/" +
      String(physicalPath || "")
        .split("/")
        .filter(Boolean)
        .join("/")

    if (clean === "/" || clean === `/${rootId}`) {
      return rootId
    }

    const segs = clean.split("/").filter(Boolean)
    let cachedLen = 0
    let parentId = rootId
    let prefix = ""

    for (let i = 0; i < segs.length; i++) {
      const p = "/" + segs.slice(0, i + 1).join("/")
      const id = this.pathIdCache.get(p)
      if (id !== undefined) {
        parentId = id
        cachedLen = i + 1
        prefix = p
      } else {
        break
      }
    }

    for (let i = cachedLen; i < segs.length; i++) {
      const rawName = segs[i]
      const decodedName = (() => {
        try {
          return decodeURIComponent(rawName)
        } catch {
          return rawName
        }
      })()

      const { folders } = await this.client.getFiles(parentId, {
        findName: decodedName,
        findIsDir: true,
        budget: this.budget,
      })

      const folder = folders.find(
        (f) =>
          f.name === rawName ||
          f.name === decodedName ||
          String(f.id) === rawName ||
          String(f.id) === decodedName,
      )
      if (!folder) {
        throw new Error(`[189Cloud] 目录未找到: ${rawName}`)
      }

      parentId = String(folder.id)
      prefix = "/" + segs.slice(0, i + 1).join("/")
      this.pathIdCache.set(prefix, parentId)
    }

    return parentId
  }

  /**
   * 将 physicalPath 解析为对应的文件对象及其父目录 ID
   */
  private async resolveFile(physicalPath: string): Promise<{
    file: FileItem189 | FolderItem189
    parentId: string
    isDir: boolean
  }> {
    const segs = String(physicalPath || "")
      .split("/")
      .filter(Boolean)
    if (segs.length === 0) throw new Error("[189Cloud] 路径无效")

    const rawName = segs[segs.length - 1]
    const decodedName = (() => {
      try {
        return decodeURIComponent(rawName)
      } catch {
        return rawName
      }
    })()
    const parentPath = "/" + segs.slice(0, segs.length - 1).join("/")
    const parentId = await this.resolveFolderId(parentPath)

    const { files, folders } = await this.client.getFiles(parentId, {
      findName: decodedName,
      budget: this.budget,
    })

    const file = files.find(
      (f) =>
        f.name === rawName ||
        f.name === decodedName ||
        String(f.id) === rawName ||
        String(f.id) === decodedName,
    )
    if (file) {
      return { file, parentId, isDir: false }
    }

    const folder = folders.find(
      (f) =>
        f.name === rawName ||
        f.name === decodedName ||
        String(f.id) === rawName ||
        String(f.id) === decodedName,
    )
    if (folder) {
      return { file: folder, parentId, isDir: true }
    }

    throw new Error(`[189Cloud] 文件或目录未找到: ${rawName}`)
  }

  async list(_virtualPath: string, physicalPath: string): Promise<FileItem[]> {
    this.budget.used = 0
    const folderId = await this.resolveFolderId(physicalPath)
    const { files, folders } = await this.client.getFiles(folderId, {
      budget: this.budget,
    })

    const items: FileItem[] = [
      ...folders.map(pan189FolderToFileItem),
      ...files.map(pan189FileToFileItem),
    ]

    return sortFileItems(
      items,
      this.addition.order_by === "filename"
        ? "file_name"
        : this.addition.order_by === "fileSize"
          ? "size"
          : "updated_at",
      this.addition.order_direction,
    )
  }

  async get(_virtualPath: string, physicalPath: string): Promise<FileItem> {
    this.budget.used = 0
    const segs = String(physicalPath || "")
      .split("/")
      .filter(Boolean)

    if (
      segs.length === 0 ||
      segs[segs.length - 1] === this.client.getRootId()
    ) {
      const rootId = this.client.getRootId()
      return {
        name: rootId,
        size: 0,
        is_dir: true,
        modified: new Date().toISOString(),
        sign: rootId,
        type: 1,
        raw_url: "",
      }
    }

    const { file, isDir } = await this.resolveFile(physicalPath)
    if (isDir) {
      return pan189FolderToFileItem(file as FolderItem189)
    }

    const item = pan189FileToFileItem(file as FileItem189)
    try {
      item.raw_url = await this.client.getDownloadUrl(String(file.id))
      item.raw_url_headers = this.client.getDownloadHeaders()
    } catch (e: any) {
      console.warn(`[189Cloud] 获取 ${file.name} 下载地址失败:`, e.message)
    }
    return item
  }

  async mkdir(_virtualPath: string, physicalPath: string): Promise<void> {
    this.budget.used = 0
    const segs = String(physicalPath || "")
      .split("/")
      .filter(Boolean)
    const dirName = segs.pop() || "新文件夹"
    const parentPath = "/" + segs.join("/")
    const parentId = await this.resolveFolderId(parentPath)
    await this.client.mkdir(parentId, dirName)
  }

  async rename(
    _virtualPath: string,
    physicalPath: string,
    newName: string,
  ): Promise<void> {
    this.budget.used = 0
    const { file, isDir } = await this.resolveFile(physicalPath)
    await this.client.rename(String(file.id), isDir, newName)
  }

  async remove(
    _virtualPath: string,
    physicalPath: string,
    _names: string[],
  ): Promise<void> {
    this.budget.used = 0
    const { file, isDir } = await this.resolveFile(physicalPath)
    await this.client.remove(String(file.id), isDir, file.name)
  }

  async move(
    _srcDir: string,
    dstDir: string,
    _names: string[],
    srcPhysical: string,
    _dstPhysical: string,
  ): Promise<void> {
    this.budget.used = 0
    const { file, isDir } = await this.resolveFile(srcPhysical)
    const dstParts = String(dstDir).split("/").filter(Boolean)
    const targetParentId = await this.resolveFolderId("/" + dstParts.join("/"))
    await this.client.move(String(file.id), isDir, file.name, targetParentId)
  }

  async copy(
    _srcDir: string,
    dstDir: string,
    _names: string[],
    srcPhysical: string,
    _dstPhysical: string,
  ): Promise<void> {
    this.budget.used = 0
    const { file, isDir } = await this.resolveFile(srcPhysical)
    const dstParts = String(dstDir).split("/").filter(Boolean)
    const targetParentId = await this.resolveFolderId("/" + dstParts.join("/"))
    await this.client.copy(String(file.id), isDir, file.name, targetParentId)
  }

  async put(
    _virtualPath: string,
    physicalPath: string,
    content: Buffer,
  ): Promise<void> {
    const parts = String(physicalPath || "")
      .split("/")
      .filter(Boolean)
    const fileName = parts.pop()
    if (!fileName) throw new Error("[189Cloud] 上传路径无效")
    const parentPath = "/" + parts.join("/")
    const info = await this.createUploadSession(
      parentPath,
      parentPath,
      fileName,
      content.length,
      md5Hex(content),
    )
    if (info.reuse) return

    const partMd5s: string[] = []
    for (let i = 1; i <= info.partCount; i++) {
      const start = (i - 1) * info.chunkSize
      const chunk = content.subarray(
        start,
        Math.min(start + info.chunkSize, content.length),
      )
      const result = await this.uploadPart(info.session, i, chunk)
      partMd5s.push(result.partMd5)
    }
    await this.completeUploadSession(info.session, partMd5s)
  }

  // ---- 分片会话上传（与 OpenList 原 189Cloud 驱动一致）----

  async createUploadSession(
    _virtualDir: string,
    physicalDir: string,
    fileName: string,
    size: number,
    md5: string,
  ): Promise<{
    reuse: boolean
    requiresMd5?: boolean
    partCount: number
    chunkSize: number
    session: string
  }> {
    const chunkSize = UPLOAD_CHUNK_SIZE
    const normalizedMd5 = String(md5 || "")
      .trim()
      .toLowerCase()
    if (!/^[a-f0-9]{32}$/.test(normalizedMd5)) {
      // The 189 API requires fileMd5 at init time. Ask the browser to hash
      // the file so the Worker never needs to buffer the complete payload.
      return {
        reuse: false,
        requiresMd5: true,
        partCount: 0,
        chunkSize,
        session: "",
      }
    }

    this.budget.used = 0
    const partCount = Math.max(
      1,
      Math.ceil(Math.max(0, Number(size) || 0) / chunkSize),
    )
    const parentFolderId = await this.resolveFolderId(physicalDir || "/")
    const upload = await this.client.createMultiUpload(
      parentFolderId,
      fileName,
      Math.max(0, Number(size) || 0),
      normalizedMd5,
    )
    if (upload.fileDataExists) {
      await this.client.commitMultiUpload(
        upload.uploadFileId,
        normalizedMd5,
        normalizedMd5,
      )
      return { reuse: true, partCount: 0, chunkSize, session: "" }
    }

    return {
      reuse: false,
      partCount,
      chunkSize,
      session: encodeUploadSession({
        uploadFileId: upload.uploadFileId,
        sessionKey: upload.sessionKey,
        fileMd5: normalizedMd5,
        size: Math.max(0, Number(size) || 0),
        partCount,
        chunkSize,
      }),
    }
  }

  async uploadPart(
    sessionToken: string,
    partNumber: number,
    content: Buffer,
  ): Promise<{ partMd5: string }> {
    const session = decodeUploadSession(sessionToken)
    if (
      !Number.isInteger(partNumber) ||
      partNumber < 1 ||
      partNumber > session.partCount
    ) {
      throw new Error(`[189Cloud] 分片序号无效: ${partNumber}`)
    }
    this.client.setSessionKey(session.sessionKey)
    const uploadData = await this.client.getMultiUploadUrls(
      session.uploadFileId,
      partNumber,
      content,
    )
    let requestHeaders: Record<string, string> = {}
    if (uploadData.requestHeader) {
      let decoded = uploadData.requestHeader
      try {
        decoded = decodeURIComponent(decoded)
      } catch {}
      for (const item of decoded.split("&")) {
        const separator = item.indexOf("=")
        if (separator <= 0) continue
        requestHeaders[item.slice(0, separator)] = item.slice(separator + 1)
      }
    }
    const response = await fetch(uploadData.requestURL, {
      method: "PUT",
      headers: requestHeaders,
      body: content as unknown as BodyInit,
    })
    if (!response.ok) {
      const body = await response.text().catch(() => "")
      throw new Error(
        `[189Cloud] 上传第 ${partNumber}/${session.partCount} 分片失败: HTTP ${response.status} ${body}`,
      )
    }
    return { partMd5: md5Hex(content) }
  }

  async completeUploadSession(
    sessionToken: string,
    partMd5s: string[] = [],
  ): Promise<void> {
    const session = decodeUploadSession(sessionToken)
    this.client.setSessionKey(session.sessionKey)
    const normalizedParts = partMd5s
      .map((part) =>
        String(part || "")
          .trim()
          .toLowerCase(),
      )
      .filter((part) => /^[a-f0-9]{32}$/.test(part))
    if (normalizedParts.length !== session.partCount) {
      throw new Error("[189Cloud] 分片校验信息不完整，无法提交上传")
    }
    const sliceMd5 =
      session.partCount === 1
        ? session.fileMd5
        : md5Hex(normalizedParts.join("\n")).toUpperCase()
    await this.client.commitMultiUpload(
      session.uploadFileId,
      session.fileMd5,
      sliceMd5,
    )
  }
}
