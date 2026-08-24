// Tencent Weiyun Storage Driver
// Ported from OpenList: https://github.com/OpenListTeam/OpenList/tree/main/drivers/weiyun
import {
  StorageDriver,
  FileItem,
  calcFileType,
} from "../../internal/driver/base"
import { sortFileItems } from "../../internal/driver/sort"
import { WeiyunAddition, WeiyunFile, WeiyunFolder } from "./types"
import { WeiyunClient } from "./util"

const SUBREQUEST_LIMIT = 45
const UPLOAD_CHUNK_SIZE = 1024 * 1024 // 1MB per chunk

interface WeiyunUploadSession {
  uploadKey: string
  ex: string
  parentDirKey: string
  pdirKey: string
  fileName: string
  size: number
  partCount: number
  chunkSize: number
  channels: { id: number; offset: number; len: number }[]
}

function encodeUploadSession(session: WeiyunUploadSession): string {
  return Buffer.from(JSON.stringify(session), "utf8").toString("base64")
}

function decodeUploadSession(token: string): WeiyunUploadSession {
  try {
    const session = JSON.parse(
      Buffer.from(token, "base64").toString("utf8"),
    ) as WeiyunUploadSession
    if (
      !session ||
      !session.uploadKey ||
      !session.ex ||
      !Number.isInteger(session.partCount) ||
      session.partCount < 1
    ) {
      throw new Error("invalid upload session")
    }
    return session
  } catch {
    throw new Error("[WeiYun] 上传会话无效或已损坏")
  }
}

function parseWeiyunDate(timeVal?: number | string): string {
  if (!timeVal) return new Date().toISOString()
  try {
    const num = typeof timeVal === "string" ? parseInt(timeVal, 10) : timeVal
    if (!isNaN(num) && num > 0) {
      // If unix seconds (10 digits) vs millis (13 digits)
      const ms = num < 10000000000 ? num * 1000 : num
      return new Date(ms).toISOString()
    }
    const d = new Date(timeVal)
    if (!isNaN(d.getTime())) return d.toISOString()
  } catch {}
  return new Date().toISOString()
}

function weiyunFolderToFileItem(folder: WeiyunFolder): FileItem {
  return {
    name: folder.dir_name,
    size: 0,
    is_dir: true,
    modified: parseWeiyunDate(folder.dir_mtime || folder.dir_ctime),
    sign: folder.dir_key,
    type: 1,
    thumb: "",
    raw_url: "",
  }
}

function weiyunFileToFileItem(file: WeiyunFile): FileItem {
  return {
    name: file.filename,
    size: file.file_size || 0,
    is_dir: false,
    modified: parseWeiyunDate(file.file_mtime || file.file_ctime),
    sign: file.file_id,
    type: calcFileType(file.filename, false),
    thumb: file.ext_info?.thumb_url || "",
    raw_url: "",
  }
}

export function normalizeWeiyunAddition(a: any): WeiyunAddition {
  const norm = { ...(a || {}) } as any
  norm.root_folder_id = (norm.root_folder_id || "").trim()
  norm.cookies = (norm.cookies || "").trim()
  norm.order_by = norm.order_by || "name"
  norm.order_direction = norm.order_direction || "asc"
  norm.upload_thread = norm.upload_thread || "4"
  return norm as WeiyunAddition
}

interface ResolvedFolderInfo {
  dirKey: string
  pdirKey: string
  dirName: string
}

export class WeiyunDriver implements StorageDriver {
  private client: WeiyunClient
  private addition: WeiyunAddition
  private rootFolderId = ""
  private rootPdirKey = ""
  private uploadThreads = 4

  /** Cache: physicalPath -> ResolvedFolderInfo */
  private pathFolderCache = new Map<string, ResolvedFolderInfo>()
  /** CF Workers subrequest budget */
  private budget = { used: 0, limit: SUBREQUEST_LIMIT }

  constructor(
    addition: WeiyunAddition,
    onCookieUpdate?: (cookie: string) => void,
  ) {
    this.addition = normalizeWeiyunAddition(addition)
    this.client = new WeiyunClient(this.addition, onCookieUpdate)
  }

  async init(): Promise<void> {
    const threadNum = parseInt(this.addition.upload_thread || "4", 10)
    this.uploadThreads = Math.min(
      32,
      Math.max(4, isNaN(threadNum) ? 4 : threadNum),
    )
    this.addition.upload_thread = String(this.uploadThreads)

    await this.client.refreshCtoken()

    if (!this.addition.root_folder_id) {
      const userInfo = await this.client.diskUserInfoGet()
      this.rootFolderId = userInfo.main_dir_key || userInfo.root_dir_key || ""
      this.addition.root_folder_id = this.rootFolderId
    } else {
      this.rootFolderId = this.addition.root_folder_id
    }

    if (!this.rootFolderId) {
      throw new Error("[WeiYun] Failed to obtain root folder ID")
    }

    const folders = await this.client.libDirPathGet(this.rootFolderId)
    if (!folders || folders.length === 0) {
      throw new Error(
        `[WeiYun] Invalid root directory ID: ${this.rootFolderId}`,
      )
    }

    const last = folders[folders.length - 1]
    this.rootPdirKey = last.pdir_key || ""
    this.pathFolderCache.set("/", {
      dirKey: this.rootFolderId,
      pdirKey: this.rootPdirKey,
      dirName: last.dir_name || "root",
    })
  }

  consumePendingCookie(): string | null {
    return this.client.consumePendingCookie()
  }

  private async resolveFolder(
    physicalPath: string,
  ): Promise<ResolvedFolderInfo> {
    const clean =
      "/" +
      String(physicalPath || "")
        .split("/")
        .filter(Boolean)
        .join("/")

    if (clean === "/" || clean === `/${this.rootFolderId}`) {
      return {
        dirKey: this.rootFolderId,
        pdirKey: this.rootPdirKey,
        dirName: "root",
      }
    }

    if (this.pathFolderCache.has(clean)) {
      return this.pathFolderCache.get(clean)!
    }

    const segs = clean.split("/").filter(Boolean)
    let current = {
      dirKey: this.rootFolderId,
      pdirKey: this.rootPdirKey,
      dirName: "root",
    }
    let currentPath = ""

    for (let i = 0; i < segs.length; i++) {
      const rawPart = segs[i]
      const decodedPart = (() => {
        try {
          return decodeURIComponent(rawPart)
        } catch {
          return rawPart
        }
      })()

      currentPath = "/" + segs.slice(0, i + 1).join("/")
      if (this.pathFolderCache.has(currentPath)) {
        current = this.pathFolderCache.get(currentPath)!
        continue
      }

      this.budget.used++
      if (this.budget.used >= this.budget.limit) {
        console.warn(
          `[WeiYun] Cloudflare Worker subrequest budget limit (${this.budget.limit}) reached.`,
        )
      }

      const listData = await this.client.diskDirFileList(current.dirKey, {
        count: 500,
        getType: 1, // Only directories
      })

      const dirs = listData.dir_list || []
      const target = dirs.find(
        (d) =>
          d.dir_name === rawPart ||
          d.dir_name === decodedPart ||
          d.dir_key === rawPart,
      )

      if (!target) {
        throw new Error(
          `[WeiYun] Directory '${rawPart}' not found in folder '${current.dirKey}'`,
        )
      }

      current = {
        dirKey: target.dir_key,
        pdirKey: current.dirKey,
        dirName: target.dir_name,
      }
      this.pathFolderCache.set(currentPath, current)
    }

    return current
  }

  private async resolveFile(physicalPath: string): Promise<{
    file?: WeiyunFile
    folder?: WeiyunFolder
    parent: ResolvedFolderInfo
    isDir: boolean
  }> {
    const segs = String(physicalPath || "")
      .split("/")
      .filter(Boolean)
    if (segs.length === 0) throw new Error("[WeiYun] 路径无效")

    const rawName = segs[segs.length - 1]
    const decodedName = (() => {
      try {
        return decodeURIComponent(rawName)
      } catch {
        return rawName
      }
    })()

    const parentPath = "/" + segs.slice(0, segs.length - 1).join("/")
    const parent = await this.resolveFolder(parentPath)

    this.budget.used++
    const listData = await this.client.diskDirFileList(parent.dirKey, {
      count: 500,
      getType: 0, // File and dir
    })

    const file = (listData.file_list || []).find(
      (f) =>
        f.filename === rawName ||
        f.filename === decodedName ||
        f.file_id === rawName,
    )
    if (file) {
      return { file, parent, isDir: false }
    }

    const folder = (listData.dir_list || []).find(
      (d) =>
        d.dir_name === rawName ||
        d.dir_name === decodedName ||
        d.dir_key === rawName,
    )
    if (folder) {
      return { folder, parent, isDir: true }
    }

    throw new Error(`[WeiYun] 文件或目录未找到: ${rawName}`)
  }

  async list(_virtualPath: string, physicalPath: string): Promise<FileItem[]> {
    this.budget.used = 0
    const folderInfo = await this.resolveFolder(physicalPath)

    const allFolders: WeiyunFolder[] = []
    const allFiles: WeiyunFile[] = []

    let start = 0
    while (true) {
      this.budget.used++
      if (this.budget.used >= this.budget.limit) {
        console.warn(
          `[WeiYun] Subrequest budget limit (${this.budget.limit}) reached while listing ${physicalPath}`,
        )
        break
      }

      const sortField =
        this.addition.order_by === "size"
          ? 3
          : this.addition.order_by === "updated_at"
            ? 2
            : 1
      const reverseOrder = this.addition.order_direction === "desc"

      const data = await this.client.diskDirFileList(folderInfo.dirKey, {
        start,
        count: 500,
        sortField,
        reverseOrder,
        getType: 0,
      })

      const dirs = data.dir_list || []
      const files = data.file_list || []

      for (const d of dirs) {
        d.pdir_key = folderInfo.dirKey
        allFolders.push(d)
      }
      for (const f of files) {
        f.pdir_key = folderInfo.dirKey
        allFiles.push(f)
      }

      start = allFolders.length + allFiles.length
      if (data.finish_flag || (dirs.length === 0 && files.length === 0)) {
        break
      }
    }

    const items: FileItem[] = [
      ...allFolders.map(weiyunFolderToFileItem),
      ...allFiles.map(weiyunFileToFileItem),
    ]

    return sortFileItems(
      items,
      this.addition.order_by === "size"
        ? "size"
        : this.addition.order_by === "updated_at"
          ? "updated_at"
          : "name",
      this.addition.order_direction,
    )
  }

  async get(_virtualPath: string, physicalPath: string): Promise<FileItem> {
    this.budget.used = 0
    const clean =
      "/" +
      String(physicalPath || "")
        .split("/")
        .filter(Boolean)
        .join("/")

    if (clean === "/" || clean === `/${this.rootFolderId}`) {
      return {
        name: "root",
        size: 0,
        is_dir: true,
        modified: new Date().toISOString(),
        sign: this.rootFolderId,
        type: 1,
        raw_url: "",
      }
    }

    const { file, folder, parent, isDir } = await this.resolveFile(physicalPath)

    if (isDir && folder) {
      return weiyunFolderToFileItem(folder)
    }

    if (file) {
      const item = weiyunFileToFileItem(file)
      try {
        const downloadData = await this.client.diskFileDownload({
          ppdir_key: parent.pdirKey,
          pdir_key: parent.dirKey,
          file_id: file.file_id,
          filename: file.filename,
        })
        item.raw_url = downloadData.download_url
        item.raw_url_headers = {
          Cookie: `${downloadData.cookie_name}=${downloadData.cookie_value}`,
        }
      } catch (e: any) {
        console.warn(`[WeiYun] 获取 ${file.filename} 下载链接失败:`, e.message)
        item.raw_url_error = e.message
      }
      return item
    }

    throw new Error(`[WeiYun] 条目未找到: ${physicalPath}`)
  }

  async mkdir(_virtualPath: string, physicalPath: string): Promise<void> {
    this.budget.used = 0
    const parts = String(physicalPath || "")
      .split("/")
      .filter(Boolean)
    const dirName = parts.pop() || "新建文件夹"
    const parentPath = "/" + parts.join("/")
    const parent = await this.resolveFolder(parentPath)

    await this.client.diskDirCreate({
      ppdir_key: parent.pdirKey,
      pdir_key: parent.dirKey,
      dir_name: dirName,
    })
  }

  async rename(
    _virtualPath: string,
    physicalPath: string,
    newName: string,
  ): Promise<void> {
    this.budget.used = 0
    const { file, folder, parent, isDir } = await this.resolveFile(physicalPath)
    if (isDir && folder) {
      await this.client.diskDirAttrModify(
        {
          ppdir_key: parent.pdirKey,
          pdir_key: parent.dirKey,
          dir_key: folder.dir_key,
          dir_name: folder.dir_name,
        },
        newName,
      )
    } else if (file) {
      await this.client.diskFileRename(
        {
          ppdir_key: parent.pdirKey,
          pdir_key: parent.dirKey,
          file_id: file.file_id,
          filename: file.filename,
        },
        newName,
      )
    }
  }

  async remove(
    _virtualPath: string,
    physicalPath: string,
    _names: string[],
  ): Promise<void> {
    this.budget.used = 0
    const { file, folder, parent, isDir } = await this.resolveFile(physicalPath)
    if (isDir && folder) {
      await this.client.diskDirDelete({
        ppdir_key: parent.pdirKey,
        pdir_key: parent.dirKey,
        dir_key: folder.dir_key,
        dir_name: folder.dir_name,
      })
    } else if (file) {
      await this.client.diskFileDelete({
        ppdir_key: parent.pdirKey,
        pdir_key: parent.dirKey,
        file_id: file.file_id,
        filename: file.filename,
      })
    }
  }

  async move(
    _srcDir: string,
    dstDir: string,
    _names: string[],
    srcPhysical: string,
    _dstPhysical: string,
  ): Promise<void> {
    this.budget.used = 0
    const {
      file,
      folder,
      parent: srcParent,
      isDir,
    } = await this.resolveFile(srcPhysical)
    const dstParent = await this.resolveFolder(dstDir)

    if (isDir && folder) {
      await this.client.diskDirMove(
        {
          ppdir_key: srcParent.pdirKey,
          pdir_key: srcParent.dirKey,
          dir_key: folder.dir_key,
          dir_name: folder.dir_name,
        },
        {
          pdir_key: dstParent.pdirKey,
          dir_key: dstParent.dirKey,
        },
      )
    } else if (file) {
      await this.client.diskFileMove(
        {
          ppdir_key: srcParent.pdirKey,
          pdir_key: srcParent.dirKey,
          file_id: file.file_id,
          filename: file.filename,
        },
        {
          pdir_key: dstParent.pdirKey,
          dir_key: dstParent.dirKey,
        },
      )
    }
  }

  async copy(
    _srcDir: string,
    _dstDir: string,
    _names: string[],
    _srcPhys: string,
    _dstPhys: string,
  ): Promise<void> {
    throw new Error("[WeiYun] 微云接口不支持复制操作 (Copy not supported)")
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
    if (!fileName) throw new Error("[WeiYun] 上传路径无效")

    const parentPath = "/" + parts.join("/")
    const parent = await this.resolveFolder(parentPath)

    const preData = await this.client.preUpload(
      parent.pdirKey,
      parent.dirKey,
      fileName,
      content.length,
      content,
      4,
      1,
    )

    if (preData.file_exist) {
      return // Fast upload succeeded
    }

    const auth = {
      upload_key: preData.upload_key || "",
      ex: preData.ex || "",
    }

    let channels = preData.channel_list || []
    if (channels.length === 0) {
      channels = [{ id: 0, offset: 0, len: content.length }]
    }

    for (const ch of channels) {
      let cur = { ...ch }
      while (cur.offset < content.length) {
        const sliceLen = Math.min(
          cur.len || UPLOAD_CHUNK_SIZE,
          content.length - cur.offset,
        )
        const chunk = content.subarray(cur.offset, cur.offset + sliceLen)
        const res = await this.client.uploadPiece(cur, auth, chunk)
        if (res.upload_state === 2) {
          break
        }
        if (res.channel) {
          cur = res.channel
        } else {
          cur.offset += sliceLen
        }
      }
    }
  }

  // ---- 分片会话上传接口（支持边缘与网页前端大文件直接分片上传） ----

  async createUploadSession(
    _virtualDir: string,
    physicalDir: string,
    fileName: string,
    size: number,
    _md5?: string,
  ): Promise<{
    reuse: boolean
    partCount: number
    chunkSize: number
    session: string
  }> {
    this.budget.used = 0
    const parent = await this.resolveFolder(physicalDir || "/")
    const chunkSize = UPLOAD_CHUNK_SIZE
    const partCount = Math.max(
      1,
      Math.ceil(Math.max(0, Number(size) || 0) / chunkSize),
    )

    // Send preUpload with empty dummy content or minimal block list
    const dummyContent = new Uint8Array(0)
    const preData = await this.client.preUpload(
      parent.pdirKey,
      parent.dirKey,
      fileName,
      Math.max(0, Number(size) || 0),
      dummyContent,
      4,
      1,
    )

    if (preData.file_exist) {
      return { reuse: true, partCount: 0, chunkSize, session: "" }
    }

    const auth = {
      upload_key: preData.upload_key || "",
      ex: preData.ex || "",
    }

    let channels = preData.channel_list || []
    if (channels.length < this.uploadThreads && auth.upload_key) {
      try {
        const addCh = await this.client.addUploadChannel(
          channels.length,
          this.uploadThreads,
          auth,
        )
        if (addCh.channels) {
          channels = [...channels, ...addCh.channels]
        }
      } catch {}
    }

    return {
      reuse: false,
      partCount,
      chunkSize,
      session: encodeUploadSession({
        uploadKey: auth.upload_key,
        ex: auth.ex,
        parentDirKey: parent.pdirKey,
        pdirKey: parent.dirKey,
        fileName,
        size: Math.max(0, Number(size) || 0),
        partCount,
        chunkSize,
        channels,
      }),
    }
  }

  async uploadPart(
    sessionToken: string,
    partNumber: number,
    content: Buffer,
  ): Promise<{ partNumber: number }> {
    const session = decodeUploadSession(sessionToken)
    if (
      !Number.isInteger(partNumber) ||
      partNumber < 1 ||
      partNumber > session.partCount
    ) {
      throw new Error(`[WeiYun] 分片序号无效: ${partNumber}`)
    }

    const offset = (partNumber - 1) * session.chunkSize
    const channel = {
      id: partNumber - 1,
      offset,
      len: content.length,
    }

    const auth = {
      upload_key: session.uploadKey,
      ex: session.ex,
    }

    await this.client.uploadPiece(channel, auth, content)
    return { partNumber }
  }

  async completeUploadSession(
    _sessionToken: string,
    _partTokens: any[] = [],
  ): Promise<void> {
    // Weiyun commits chunks incrementally during UploadPiece; no separate commit call required
  }
}
