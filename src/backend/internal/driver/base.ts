export interface FileItem {
  name: string
  size: number
  is_dir: boolean
  created?: string
  modified: string
  sign: string
  type: number // 1: FOLDER, 2: VIDEO, 3: AUDIO, 4: TEXT, 5: IMAGE, 0: UNKNOWN
  thumb?: string
  raw_url?: string
  /** Headers that must accompany the raw_url request (e.g. Cookie, Referer for cloud drives) */
  raw_url_headers?: Record<string, string>
  /** When the driver could not obtain a download link, the concrete reason (for better 404 reporting) */
  raw_url_error?: string
  /** Whole-file hash (e.g. md5) used for rapid upload */
  hash?: string
  /**
   * Whole-file hashes by algorithm, populated by drivers whose file listings
   * expose hashes (e.g. md5, sha1, sha256). Prefer this over the legacy `hash`
   * field; seed capability preflight consumes these to avoid re-downloading.
   */
  hashes?: {
    md5?: string
    sha1?: string
    sha256?: string
    /** Piece hashes when the driver exposes them (optional). */
    pieces?: {
      md5?: string[]
      sha1?: string[]
      sha256?: string[]
    }
  }
}

/**
 * FileItem 的对外安全视图（Issue #204）。
 *
 * FileItem 是驱动层结构，其中 raw_url / raw_url_headers 是驱动内部字段：
 * raw_url 指向上游存储直链（S3 场景下甚至是带签名的预签名 URL），
 * raw_url_headers 携带访问上游所需的鉴权头（WebDAV Basic、云盘 Cookie、
 * Referer/UA 等）。它们一旦随 API 响应外泄，攻击者即可绕过本站的权限、
 * 签名与审计直接访问后端存储——且管理员事后收紧 OpenList 权限也无法止损。
 *
 * 因此所有对外响应都必须经过 toPublicFileItem() 的**显式白名单**序列化，
 * 而不是黑名单删除：将来驱动新增字段（可能携带敏感信息）时默认不会外泄，
 * 需要透出的字段必须在这里逐一放行。历史教训：/fs/search 曾直接序列化
 * 驱动返回的 FileItem，把上游 WebDAV 的 Authorization 头原样泄露给未认证
 * 访客；此外部分驱动会把内部 ID 塞进 sign，同样不应透出——下载签名一律
 * 由 server 层（pkg/sign）统一签发。
 */
export interface PublicFileItem {
  name: string
  size: number
  is_dir: boolean
  created?: string
  modified: string
  /** 下载签名由 server 层统一签发；驱动侧的 sign 不对外透出，恒为空 */
  sign: string
  type: number // 1: FOLDER, 2: VIDEO, 3: AUDIO, 4: TEXT, 5: IMAGE, 0: UNKNOWN
  thumb?: string
}

export function toPublicFileItem(item: FileItem): PublicFileItem {
  return {
    name: item.name,
    size: item.size,
    is_dir: item.is_dir,
    created: item.created,
    modified: item.modified,
    sign: "",
    type: item.type,
    thumb: item.thumb || "",
  }
}

export function calcFileType(name: string, isDir: boolean): number {
  if (isDir) return 1 // FOLDER
  const ext = (name.split(".").pop() || "").toLowerCase()
  const videoExts = [
    "mp4",
    "mkv",
    "avi",
    "mov",
    "flv",
    "wmv",
    "ts",
    "m2ts",
    "m4v",
    "rmvb",
    "webm",
    "3gp",
    "asf",
    "vob",
    "ogv",
    "rm",
    "f4v",
  ]
  if (videoExts.includes(ext)) return 2 // VIDEO

  const audioExts = [
    "mp3",
    "flac",
    "aac",
    "wav",
    "ogg",
    "m4a",
    "opus",
    "wma",
    "ape",
    "alac",
    "aiff",
    "mid",
    "midi",
  ]
  if (audioExts.includes(ext)) return 3 // AUDIO

  const textExts = [
    "txt",
    "md",
    "markdown",
    "json",
    "js",
    "ts",
    "jsx",
    "tsx",
    "css",
    "scss",
    "html",
    "htm",
    "xml",
    "yaml",
    "yml",
    "ini",
    "conf",
    "env",
    "log",
    "sql",
    "py",
    "java",
    "c",
    "cpp",
    "h",
    "hpp",
    "go",
    "rs",
    "sh",
    "bat",
    "cmd",
    "ps1",
    "php",
    "rb",
    "swift",
    "kt",
    "cs",
    "vue",
    "svelte",
    "json5",
    "toml",
  ]
  if (textExts.includes(ext)) return 4 // TEXT

  const imageExts = [
    "jpg",
    "jpeg",
    "png",
    "gif",
    "bmp",
    "webp",
    "svg",
    "ico",
    "tiff",
    "tif",
    "heic",
    "heif",
    "avif",
    "vvc",
    "avc",
    "psd",
    "ai",
  ]
  if (imageExts.includes(ext)) return 5 // IMAGE

  return 0 // UNKNOWN
}

export interface StorageDriver {
  init?(): Promise<void>
  list(virtualPath: string, physicalPath: string): Promise<FileItem[]>
  get(virtualPath: string, physicalPath: string): Promise<FileItem>
  mkdir(virtualPath: string, physicalPath: string): Promise<void>
  rename(
    virtualPath: string,
    physicalPath: string,
    newName: string,
  ): Promise<void>
  remove(
    virtualPath: string,
    physicalPath: string,
    names: string[],
  ): Promise<void>
  move(
    srcDir: string,
    dstDir: string,
    names: string[],
    srcPhys: string,
    dstPhys: string,
  ): Promise<void>
  copy(
    srcDir: string,
    dstDir: string,
    names: string[],
    srcPhys: string,
    dstPhys: string,
  ): Promise<void>
  // 上传内容统一用 Uint8Array：ESA 边缘运行时没有全局 Buffer（Issue #169）。
  // 实现方**不得使用 Buffer 专有方法**（toString(encoding) / Buffer.from /
  // Buffer.concat 等）：Cloudflare 靠 nodejs_compat 注入 Buffer，ESA 没有，
  // 同一段代码在两边行为不同。需要文本请用 TextDecoder，需要 base64 请用 btoa。
  put(
    virtualPath: string,
    physicalPath: string,
    content: Uint8Array,
  ): Promise<void>
}
