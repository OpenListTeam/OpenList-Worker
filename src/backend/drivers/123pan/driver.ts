// 123 Cloud Drive (123Pan) driver
// Based on: https://github.com/OpenListTeam/OpenList/tree/main/drivers/123
import {
  StorageDriver,
  FileItem,
  calcFileType,
} from "../../internal/driver/base"
import { sortFileItems } from "../../internal/driver/sort"
import { Pan123Addition, Pan123File, Pan123UploadResp } from "./types"
import { Pan123Client } from "./util"

/** 分片会话上传：会话令牌中携带的数据（不透明地往返于前后端） */
interface Pan123SessionData {
  bucket: string
  key: string
  uploadId: string
  fileId: number
  storageNode: string
  size: number
  partCount: number
  chunkSize: number
}

function encodeSession(s: Pan123SessionData): string {
  return Buffer.from(JSON.stringify(s), "utf8").toString("base64")
}

function decodeSession(token: string): Pan123SessionData {
  const s = JSON.parse(Buffer.from(token, "base64").toString("utf8"))
  if (!s || !s.bucket || !s.key || !s.uploadId) {
    throw new Error("[123Pan] invalid upload session")
  }
  return s as Pan123SessionData
}

function sessionToUpload(s: Pan123SessionData): Pan123UploadResp["data"] {
  return {
    AccessKeyId: "",
    SecretAccessKey: "",
    SessionToken: "",
    Bucket: s.bucket,
    Key: s.key,
    UploadId: s.uploadId,
    FileId: s.fileId,
    StorageNode: s.storageNode,
    EndPoint: "",
    Reuse: false,
  }
}

function pan123FileToFileItem(f: Pan123File): FileItem {
  const isDir = f.Type === 1
  return {
    name: f.FileName,
    size: f.Size || 0,
    is_dir: isDir,
    modified: f.UpdateAt
      ? new Date(f.UpdateAt).toISOString()
      : new Date().toISOString(),
    sign: String(f.FileId),
    type: calcFileType(f.FileName, isDir),
    thumb: "",
    raw_url: "",
  }
}

export class Pan123Driver implements StorageDriver {
  private client: Pan123Client
  private addition: Pan123Addition
  /** cache: physical path → folder FileId (string) */
  private pathIdCache = new Map<string, string>()
  /**
   * Cloudflare Workers subrequest 预算（免费版单次 invocation 最多 50 个子请求）。
   * 所有分页/路径解析调用共享该预算；超出时截断并告警，避免
   * "Too many subrequests by single Worker invocation" 错误。
   */
  private budget = { used: 0, limit: 45 }

  constructor(
    addition: Pan123Addition,
    onTokenUpdate?: (token: string) => void,
  ) {
    // 官方驱动方式：必填 123 网盘手机号 + 密码登录（无默认令牌）。
    // access_token 为登录后自动持久化的会话令牌（可选，用户无需手动填写）。
    this.addition = addition
    this.client = new Pan123Client(addition, onTokenUpdate)
  }

  async init(): Promise<void> {
    await this.client.login()
  }

  /**
   * Resolve a physical path ("0/a/b") to the FileId of its last folder.
   * Walks the tree from the root id, listing each level to find the
   * folder by name, caching results. Each level consumes at most one
   * page of subrequests (findName early-termination).
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

    // Find the longest cached prefix
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

      const files = await this.client.getFiles(parentId, {
        findName: decodedName,
        findIsDir: true,
        budget: this.budget,
      })
      const folder = files.find(
        (f) =>
          f.Type === 1 &&
          (f.FileName === rawName ||
            f.FileName === decodedName ||
            String(f.FileId) === rawName ||
            String(f.FileId) === decodedName),
      )
      if (!folder) {
        throw new Error(`folder not found: ${rawName}`)
      }
      parentId = String(folder.FileId)
      prefix = "/" + segs.slice(0, i + 1).join("/")
      this.pathIdCache.set(prefix, parentId)
    }
    return parentId
  }

  /**
   * 上传场景：确保目录存在，缺失的层级自动递归创建。
   * 与 resolveFolderId 的区别是——目录不存在时不抛 "folder not found"，
   * 而是调用 mkdir 创建。用于上传文件夹 / 上传到尚不存在的子目录。
   */
  private async ensureFolderId(physicalPath: string): Promise<string> {
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
    let parentId = rootId
    let prefix = ""
    for (let i = 0; i < segs.length; i++) {
      const rawName = segs[i]
      const decodedName = (() => {
        try {
          return decodeURIComponent(rawName)
        } catch {
          return rawName
        }
      })()
      prefix = "/" + segs.slice(0, i + 1).join("/")

      let id = this.pathIdCache.get(prefix)
      if (id === undefined) {
        let files = await this.client.getFiles(parentId, {
          findName: decodedName,
          findIsDir: true,
          budget: this.budget,
        })
        let folder = files.find(
          (f) =>
            f.Type === 1 &&
            (f.FileName === rawName || f.FileName === decodedName),
        )
        if (folder) {
          id = String(folder.FileId)
        } else {
          // 目录不存在：创建。并发上传多个文件时可能被别的请求抢先创建，
          // mkdir 报"已存在"则忽略，随后重新查询拿到 FileId。
          try {
            const createdId = await this.client.mkdir(parentId, decodedName)
            if (createdId) {
              id = createdId
            }
          } catch {
            // ignore: directory may already exist
          }
          if (id === undefined) {
            files = await this.client.getFiles(parentId, {
              findName: decodedName,
              findIsDir: true,
              budget: this.budget,
            })
            folder = files.find(
              (f) => f.Type === 1 && f.FileName === decodedName,
            )
            if (!folder) {
              throw new Error(`[123Pan] 自动创建目录失败: ${rawName}`)
            }
            id = String(folder.FileId)
          }
        }
        this.pathIdCache.set(prefix, id)
      }
      parentId = id
    }
    return parentId
  }

  /**
   * Resolve a physical path to a file: parent folder id + matching file.
   * physicalPath segments: rootId/name1/name2/.../targetName
   */
  private async resolveFile(physicalPath: string): Promise<{
    file: Pan123File
    parentId: string
    name: string
  }> {
    const segs = String(physicalPath || "")
      .split("/")
      .filter(Boolean)
    if (segs.length === 0) throw new Error("invalid path")
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
    const files = await this.client.getFiles(parentId, {
      findName: decodedName,
      budget: this.budget,
    })
    const file = files.find(
      (f) =>
        String(f.FileId) === rawName ||
        String(f.FileId) === decodedName ||
        f.FileName === rawName ||
        f.FileName === decodedName,
    )
    if (!file) throw new Error(`file not found: ${rawName}`)
    return { file, parentId, name: rawName }
  }

  async list(_virtualPath: string, physicalPath: string): Promise<FileItem[]> {
    // 每次外部调用重置 subrequest 预算（45 页上限，低于 CF 50 次限制）
    this.budget.used = 0
    const folderId = await this.resolveFolderId(physicalPath)
    const files = await this.client.getFiles(folderId, { budget: this.budget })
    const items = files.map(pan123FileToFileItem)
    return sortFileItems(
      items,
      this.addition.order_by || "file_name",
      this.addition.order_direction,
    )
  }

  async get(_virtualPath: string, physicalPath: string): Promise<FileItem> {
    // 每次外部调用重置 subrequest 预算
    this.budget.used = 0
    const segs = String(physicalPath || "")
      .split("/")
      .filter(Boolean)
    // Storage root → folder
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

    const { file } = await this.resolveFile(physicalPath)
    const item = pan123FileToFileItem(file)
    if (file.Type !== 1) {
      try {
        item.raw_url = await this.client.getDownloadLink(file)
        if (!item.raw_url) {
          item.raw_url_error =
            "123 网盘未返回下载链接（DownloadUrl 为空）。常见原因：access_token/cookie 失效，或该文件已删除/被限制下载。请到管理后台更新 access_token 后重试。"
        }
      } catch (e: any) {
        item.raw_url_error =
          `123 网盘获取下载链接失败：${e?.message || String(e)}。` +
          (String(e?.message || "").includes("登录失败")
            ? "当前部署出口 IP 可能被 123 风控，请配置有效的 access_token（浏览器登录 123 网盘后复制 Bearer 令牌）。"
            : "请检查 access_token/cookie 是否有效，或在 123 网盘网页端确认该文件可下载。")
        console.warn(
          `[123Pan] getDownloadLink warning for ${file.FileName}:`,
          e.message,
        )
      }
    } else {
      item.raw_url_error = "该条目是文件夹，不可作为文件下载。"
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
    const { file } = await this.resolveFile(physicalPath)
    await this.client.rename(String(file.FileId), newName)
  }

  async remove(
    _virtualPath: string,
    physicalPath: string,
    _names: string[],
  ): Promise<void> {
    this.budget.used = 0
    const { file } = await this.resolveFile(physicalPath)
    await this.client.remove(String(file.FileId), file)
  }

  async move(
    _srcDir: string,
    dstDir: string,
    _names: string[],
    srcPhysical: string,
    _dstPhysical: string,
  ): Promise<void> {
    this.budget.used = 0
    const { file } = await this.resolveFile(srcPhysical)
    const dstParts = String(dstDir).split("/").filter(Boolean)
    const targetParentId = await this.resolveFolderId("/" + dstParts.join("/"))
    await this.client.move([String(file.FileId)], targetParentId)
  }

  async copy(): Promise<void> {
    throw new Error("[123Pan] Copy is not supported by 123 Cloud Drive API")
  }

  async put(
    _virtualPath: string,
    physicalPath: string,
    content: Buffer,
  ): Promise<void> {
    this.budget.used = 0
    const segs = String(physicalPath || "")
      .split("/")
      .filter(Boolean)
    if (segs.length === 0) throw new Error("invalid upload path")
    const rawName = segs[segs.length - 1]
    const decodedName = (() => {
      try {
        return decodeURIComponent(rawName)
      } catch {
        return rawName
      }
    })()
    const parentPath = "/" + segs.slice(0, segs.length - 1).join("/")
    const parentId = await this.ensureFolderId(parentPath)
    await this.client.uploadFile(parentId, decodedName, content)
  }

  // ---- 分片会话上传（解决大文件整体缓冲导致的内存/请求体超限卡死）----

  /**
   * 创建分片上传会话。前端逐片上传，每片独立 HTTP 请求：
   * Worker 内存占用恒定（单片大小），不受 CF 请求体/内存上限约束，
   * 且浏览器端能看到每片的真实上传进度。
   * @param physicalDir 目标目录的物理路径（不含文件名）
   * @param fileName 文件名
   * @param size 文件总字节数
   * @param md5 文件 MD5（启用秒传时由前端计算；可为空）
   */
  async createUploadSession(
    _virtualDir: string,
    physicalDir: string,
    fileName: string,
    size: number,
    md5: string,
  ): Promise<{
    reuse: boolean
    partCount: number
    chunkSize: number
    session: string
  }> {
    this.budget.used = 0
    const parentId = await this.ensureFolderId(physicalDir || "/")
    const upload = await this.client.createUpload(
      fileName,
      parentId,
      size,
      md5 || "",
    )
    const chunkSize = 16 * 1024 * 1024 // 16MB
    // 秒传命中或未分配 Key：文件已存在，无需实际上传
    if (upload.Reuse || upload.Key === "") {
      return { reuse: true, partCount: 0, chunkSize, session: "" }
    }
    const partCount = Math.max(1, Math.ceil(size / chunkSize))
    const session = encodeSession({
      bucket: upload.Bucket,
      key: upload.Key,
      uploadId: upload.UploadId,
      fileId: upload.FileId,
      storageNode: upload.StorageNode,
      size,
      partCount,
      chunkSize,
    })
    return { reuse: false, partCount, chunkSize, session }
  }

  /**
   * 上传单个分片：获取该片的预签名 URL 并把内容转发给 123pan。
   */
  async uploadPart(
    session: string,
    partNumber: number,
    content: Buffer,
  ): Promise<void> {
    this.budget.used = 0
    const s = decodeSession(session)
    const url = await this.client.getPartUploadUrl(
      sessionToUpload(s),
      partNumber,
      s.partCount,
    )
    const res = await fetch(url, { method: "PUT", body: content as any })
    if (res.status !== 200) {
      const text = await res.text().catch(() => "")
      throw new Error(
        `[123Pan] 上传第 ${partNumber}/${s.partCount} 分片失败：HTTP ${res.status} ${text}`,
      )
    }
  }

  /**
   * 完成分片上传会话。
   */
  async completeUploadSession(session: string): Promise<void> {
    this.budget.used = 0
    const s = decodeSession(session)
    await this.client.completeUpload(
      sessionToUpload(s),
      s.size,
      s.partCount > 1,
    )
  }
}
