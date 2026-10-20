// CtFile (城通网盘) driver
// OpenAPI: https://openapi.ctfile.com/ — 统一 POST JSON + 开放接口 Session 鉴权
import {
  StorageDriver,
  FileItem,
  calcFileType,
} from "../../internal/driver/base"
import { sortFileItems } from "../../internal/driver/sort"
import { CtFileAddition, CtFileFile, CtFileFolder } from "./types"
import { CtFileClient, ROOT_FOLDER_ID } from "./util"

const DEFAULT_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36"

export function normalizeCtFileAddition(a: any): CtFileAddition {
  const norm = { ...(a || {}) } as any
  norm.session = String(norm.session || norm.token || norm.api_key || "").trim()
  norm.cloud_type = norm.cloud_type === "private" ? "private" : "public"
  norm.base_url = norm.base_url || norm.baseUrl || "https://rest.ctfile.com/v1"
  norm.order_by = norm.order_by || "name"
  norm.order_direction = norm.order_direction || "asc"
  norm.user_agent = norm.user_agent || DEFAULT_USER_AGENT
  return norm as CtFileAddition
}

/**
 * 城通网盘时间字段兼容转换：
 * - unix 秒（数字/纯数字字符串）→ ISO
 * - "YYYY-MM-DD HH:mm:ss" 字符串 → ISO
 * - 其他/缺失 → 当前时间
 */
function ctfileDateToIso(date?: number | string): string {
  if (date === undefined || date === null || date === "") {
    return new Date().toISOString()
  }
  const raw = String(date).trim()
  if (/^\d+$/.test(raw)) {
    const n = Number(raw)
    if (n > 0) {
      // 超过 1e12 视为毫秒，否则按秒处理
      return new Date(n > 1e12 ? n : n * 1000).toISOString()
    }
  }
  const parsed = new Date(raw.replace(" ", "T"))
  if (!isNaN(parsed.getTime())) return parsed.toISOString()
  return new Date().toISOString()
}

/** folder/list 或 file/list 条目 → FileItem */
function ctfileItemToFileItem(
  item: CtFileFolder | CtFileFile,
  isDir: boolean,
): FileItem {
  const name = item.name || ""
  const key = item.key || ""
  const file = (isDir ? null : (item as CtFileFile)) || undefined

  return {
    name,
    size: isDir ? 0 : Number(file?.size || 0),
    is_dir: isDir,
    modified: ctfileDateToIso(item.date),
    sign: key,
    type: calcFileType(name, isDir),
    thumb: !isDir && file?.imgsrc ? String(file.imgsrc) : "",
    raw_url: "",
  }
}

/** 去掉路径段的 URL 编码（失败时返回原值） */
function decodeSegment(raw: string): string {
  try {
    return decodeURIComponent(raw)
  } catch {
    return raw
  }
}

function splitPath(path: string): string[] {
  return String(path || "")
    .split("/")
    .filter(Boolean)
}

export class CtFileDriver implements StorageDriver {
  private client: CtFileClient
  private addition: CtFileAddition
  /** 缓存：物理路径（/名称/名称）→ 文件夹 key（d 开头） */
  private pathKeyCache = new Map<string, string>()

  constructor(addition: CtFileAddition) {
    this.addition = normalizeCtFileAddition(addition)
    this.client = new CtFileClient(this.addition)
  }

  async init(): Promise<void> {
    // 启动即校验 Session，配置错误第一时间暴露
    await this.client.profile()
  }

  /**
   * 校验当前 Session 是否有效（供 /task/refresh 状态刷新调用）。
   * 有效返回 true；失效返回 false 并附重新生成 Session 的提示。
   */
  async checkCookieValid(): Promise<{ valid: boolean; error?: string }> {
    return this.client.checkValid()
  }

  private getRootId(): string {
    return ROOT_FOLDER_ID
  }

  /**
   * 将物理路径解析为文件夹 key。
   * 路径段按「名称或 ID」匹配，逐级解析并写入缓存。
   */
  private async resolveFolderKey(physicalPath: string): Promise<string> {
    const segs = splitPath(physicalPath)
    if (segs.length === 0) return this.getRootId()

    // 先走缓存找最长已知前缀
    let cachedLen = 0
    let parentKey = this.getRootId()
    for (let i = 0; i < segs.length; i++) {
      const p = "/" + segs.slice(0, i + 1).join("/")
      const cached = this.pathKeyCache.get(p)
      if (cached !== undefined) {
        parentKey = cached
        cachedLen = i + 1
      } else {
        break
      }
    }

    for (let i = cachedLen; i < segs.length; i++) {
      const rawName = segs[i]
      const decodedName = decodeSegment(rawName)
      const folders = await this.client.listFolders(parentKey)

      const folder = folders.find(
        (f) =>
          f.name === rawName ||
          f.name === decodedName ||
          f.key === rawName ||
          f.key === decodedName,
      )
      if (!folder) {
        throw new Error(`[CtFile] 目录未找到: ${decodedName}`)
      }

      parentKey = folder.key
      this.pathKeyCache.set("/" + segs.slice(0, i + 1).join("/"), parentKey)
    }

    return parentKey
  }

  /** 解析具体文件或文件夹（路径最后一段为条目本身） */
  private async resolveEntry(physicalPath: string): Promise<{
    item: CtFileFolder | CtFileFile
    parentKey: string
    isDir: boolean
    key: string
  }> {
    const segs = splitPath(physicalPath)
    if (segs.length === 0) throw new Error("[CtFile] 路径无效")

    const rawName = segs[segs.length - 1]
    const decodedName = decodeSegment(rawName)
    const parentKey = await this.resolveFolderKey(
      "/" + segs.slice(0, segs.length - 1).join("/"),
    )

    const folders = await this.client.listFolders(parentKey)
    const folder = folders.find(
      (f) =>
        f.name === rawName ||
        f.name === decodedName ||
        f.key === rawName ||
        f.key === decodedName,
    )
    if (folder) {
      this.pathKeyCache.set("/" + segs.join("/"), folder.key)
      return { item: folder, parentKey, isDir: true, key: folder.key }
    }

    const files = await this.client.listFiles(parentKey)
    const file = files.find(
      (f) =>
        f.name === rawName ||
        f.name === decodedName ||
        f.key === rawName ||
        f.key === decodedName,
    )
    if (!file) {
      throw new Error(`[CtFile] 文件或目录未找到: ${decodedName}`)
    }
    return { item: file, parentKey, isDir: false, key: file.key }
  }

  async list(_virtualPath: string, physicalPath: string): Promise<FileItem[]> {
    const folderKey = await this.resolveFolderKey(physicalPath)
    const entries = await this.client.listAll(folderKey)

    const items = entries.map((entry) => {
      const isDir = Boolean(entry.key && entry.key.startsWith("d"))
      return ctfileItemToFileItem(entry, isDir)
    })

    return sortFileItems(
      items,
      this.addition.order_by === "size"
        ? "size"
        : this.addition.order_by === "time"
          ? "time"
          : "name",
      this.addition.order_direction,
    )
  }

  async get(_virtualPath: string, physicalPath: string): Promise<FileItem> {
    const segs = splitPath(physicalPath)
    if (segs.length === 0) {
      return {
        name: this.getRootId(),
        size: 0,
        is_dir: true,
        modified: new Date().toISOString(),
        sign: this.getRootId(),
        type: 1,
        raw_url: "",
      }
    }

    const { item, isDir, key } = await this.resolveEntry(physicalPath)
    const fileItem = ctfileItemToFileItem(item, isDir)
    if (isDir) return fileItem

    try {
      fileItem.raw_url = await this.client.fetchDownloadUrl(key)
    } catch (err: any) {
      const msg = err?.message || String(err)
      fileItem.raw_url_error = msg
      throw new Error(`[CtFile] 获取下载直链失败 (${item.name}): ${msg}`)
    }

    fileItem.raw_url_headers = {
      "User-Agent": this.client.getUserAgent(),
    }
    return fileItem
  }

  async mkdir(_virtualPath: string, physicalPath: string): Promise<void> {
    const segs = splitPath(physicalPath)
    if (segs.length === 0) throw new Error("[CtFile] 路径无效")
    const dirName = decodeSegment(segs[segs.length - 1])
    const parentPath = "/" + segs.slice(0, segs.length - 1).join("/")
    const parentKey = await this.resolveFolderKey(parentPath)
    await this.client.mkdir(parentKey, dirName)
  }

  async rename(
    _virtualPath: string,
    physicalPath: string,
    newName: string,
  ): Promise<void> {
    const { isDir, key } = await this.resolveEntry(physicalPath)
    if (isDir) {
      await this.client.renameFolder(key, newName)
      // 文件夹改名后缓存的路径映射全部失效
      this.pathKeyCache.clear()
      return
    }
    await this.client.renameFile(key, newName)
  }

  async remove(
    _virtualPath: string,
    physicalPath: string,
    _names: string[],
  ): Promise<void> {
    const { isDir, key } = await this.resolveEntry(physicalPath)
    await this.client.remove([key])
    if (isDir) this.pathKeyCache.clear()
  }

  async move(
    _srcDir: string,
    dstDir: string,
    _names: string[],
    srcPhysical: string,
    _dstPhysical: string,
  ): Promise<void> {
    const { isDir, key } = await this.resolveEntry(srcPhysical)
    const dstKey = await this.resolveFolderKey(dstDir)
    await this.client.move([key], dstKey)
    if (isDir) this.pathKeyCache.clear()
  }

  async copy(): Promise<void> {
    throw new Error("[CtFile] 城通网盘不支持直接复制文件")
  }

  async put(
    _virtualPath: string,
    physicalPath: string,
    content: Buffer,
  ): Promise<void> {
    const segs = splitPath(physicalPath)
    if (segs.length === 0) throw new Error("[CtFile] 路径无效")
    const fileName = decodeSegment(segs[segs.length - 1])
    const parentPath = "/" + segs.slice(0, segs.length - 1).join("/")
    const parentKey = await this.resolveFolderKey(parentPath)

    const data = new Uint8Array(content)
    const ticket = await this.client.uploadTicket(parentKey, fileName, data)
    if (Number(ticket.exists || 0) > 0) {
      // 秒传命中：文件已存在，无需真正上传
      return
    }
    const uploadUrl = String(ticket.upload_url || "")
    if (!uploadUrl) {
      throw new Error("[CtFile] 获取上传地址失败：服务端未返回 upload_url")
    }
    await this.client.upload(uploadUrl, fileName, data)
  }
}
