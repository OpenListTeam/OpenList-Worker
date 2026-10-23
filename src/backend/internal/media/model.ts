/**
 * 媒体库数据模型。
 *
 * 字段与 Go 版 internal/model/media*.go 保持一一对应（snake_case json tag），
 * 前端（OpenList-Frontend `dev-media`）与 Emby / Subsonic 协议层直接按这些
 * JSON 字段渲染，因此命名不要随意调整。
 *
 * 与 Go 的差异（有意）：
 *   - 新增 `thumb` / `thumb_mime`，用于 Worker 无法解码图片时直接缓存原始封面字节；
 *   - `episodes` 内的 EpisodeInfo 增加 `season`，用于多季剧集；
 *   - 保留旧版字段（cover/duration/...）以便已部署实例的数据可直接迁移。
 */

export type MediaType = "video" | "music" | "image" | "book"

export interface MediaItem {
  id: number
  media_type: MediaType
  scan_path_id: number
  folder_path: string
  file_name: string
  scraped_name: string
  cover: string
  authors: string
  plot: string
  description: string
  genre: string
  release_date: string
  rating: number
  file_size: number
  duration: number
  season: number
  episode: number
  episodes: string
  album_name: string
  album_artist: string
  track_number: number
  publisher: string
  isbn: string
  external_id: string
  hidden: boolean
  scraper_source: string
  created_at: string
  updated_at: string

  // ===== v2 新增（对齐 Go） =====
  /** MIME 类型（扫描时按扩展名推断） */
  mime_type?: string
  /** 豆瓣/Google Books 评价，JSON 数组字符串 */
  reviews?: string
  /** LRC 歌词（同目录 .lrc 优先，回退内嵌） */
  lyrics?: string
  /** video: "movie" | "tv" */
  video_type?: string
  /** 目录合并模式条目（Go 的 is_folder） */
  is_folder?: boolean
  /** 上次刮削成功时间（ISO）；为空表示未刮削 */
  scraped_at?: string | null
  /** 原始文件名（目录合并模式下 file_name 是目录名） */
  original_name?: string
  /** 提示：前端可直接用 thumb 显示（Worker 侧原图缓存） */
  thumb?: string
  thumb_mime?: string
}

export interface EpisodeInfo {
  index: number
  title: string
  file_name: string
  /** 季号（未识别时为 1） */
  season?: number
  duration?: number
}

export interface MediaScraperConfig {
  store_thumbnail?: string
  thumbnail_mode?: string
  thumbnail_path?: string
}

export interface MediaConfig {
  media_type: MediaType
  enabled: boolean
  thumbnail_mode: string
  thumbnail_path: string
  store_thumbnail: boolean
  scrape_concurrency: number
  created_at: string
  updated_at: string
  /** 上次扫描时间（ISO） */
  last_scan_at?: string | null
  /** 上次刮削时间（ISO） */
  last_scrape_at?: string | null
  /** 该类型独立的缩略图配置（JSON 字符串，对齐 Go 的 scraper_config） */
  scraper_config?: string
}

export interface MediaScanPath {
  id: number
  media_type: MediaType
  name: string
  path: string
  type_tag: string
  content_tags: string
  created_at: string
  updated_at: string

  // ===== v2 新增（对齐 Go） =====
  /** 路径合并模式：子文件夹作为一个条目（带 episodes 选集） */
  path_merge?: boolean
  /** 是否启用刮削（默认 true） */
  enable_scrape?: boolean
  /** 上次扫描时间（ISO） */
  last_scan_at?: string | null
}

export interface MediaUserData {
  id: number
  user_id: number
  item_id: number
  episode_index: number
  position_ticks: number
  duration_ticks: number
  played: boolean
  play_count: number
  is_favorite: boolean
  updated_at: string

  // ===== v2 新增（对齐 Go） =====
  /** 0-5（Subsonic 语义） */
  rating?: number
  last_played_at?: string | null
}

export interface MediaAppKey {
  id: number
  user_id: number
  name: string
  prefix: string
  /** SHA-256(token)，用于 Emby / Subsonic apiKey 校验 */
  secret: string
  /** AES-GCM 密文（JWT secret 派生密钥），用于 Subsonic token 认证 */
  enc?: string
  /** 明文 token（仅旧数据兼容；新数据不写） */
  plain?: string
  last_used_at: string | null
  created_at: string
}

export interface MediaPlaylist {
  id: number
  user_id: number
  name: string
  comment: string
  public: boolean
  item_count: number
  created_at: string
  updated_at: string
}

export interface MediaPlaylistItem {
  id: number
  playlist_id: number
  item_id: number
  episode_index: number
  order: number
}

export interface EmbyDevice {
  id: number
  user_id: number
  device_id: string
  device_name: string
  client: string
  version: string
  token: string
  last_seen_at: string
  created_at: string
  /** 通过应用密钥认证时为对应 key，否则为 0 */
  app_key_id?: number
}

export interface MediaPlayQueue {
  user_id: number
  current: string
  position: number
  changed: string
  entry_ids: number[]
}

export interface MediaDb {
  version: number
  next_id: number
  configs: MediaConfig[]
  scan_paths: MediaScanPath[]
  items: MediaItem[]
  user_data: MediaUserData[]
  app_keys: MediaAppKey[]
  emby_devices: EmbyDevice[]
  playlists: MediaPlaylist[]
  playlist_items: MediaPlaylistItem[]
  play_queues: MediaPlayQueue[]
  /** 分片索引：scan_path_id 列表 */
  item_shards: string[]
  /** 分片索引：user_id 列表 */
  user_shards: string[]
}

export const MEDIA_TYPES: MediaType[] = ["video", "music", "image", "book"]

export const MEDIA_DB_VERSION = 2

export const DEFAULT_CONFIG = (mediaType: MediaType): MediaConfig => ({
  media_type: mediaType,
  enabled: false,
  thumbnail_mode: "runtime",
  thumbnail_path: "imgs",
  store_thumbnail: true,
  scrape_concurrency: 5,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  last_scan_at: null,
  last_scrape_at: null,
  scraper_config: "",
})

export const emptyMediaDb = (): MediaDb => ({
  version: MEDIA_DB_VERSION,
  next_id: 1,
  configs: [],
  scan_paths: [],
  items: [],
  user_data: [],
  app_keys: [],
  emby_devices: [],
  playlists: [],
  playlist_items: [],
  play_queues: [],
  item_shards: [],
  user_shards: [],
})

const VIDEO_EXT = new Set([
  "mp4",
  "mkv",
  "avi",
  "mov",
  "wmv",
  "flv",
  "webm",
  "ts",
  "m2ts",
  "mts",
  "rmvb",
  "rm",
  "iso",
  "m4v",
  "mpg",
  "mpeg",
  "3gp",
  "asf",
  "vob",
  "ogv",
  "f4v",
])
const MUSIC_EXT = new Set([
  "mp3",
  "flac",
  "wav",
  "aac",
  "m4a",
  "ogg",
  "opus",
  "wma",
  "ape",
  "dsf",
  "dff",
  "aiff",
  "alac",
  "mid",
  "midi",
])
const IMAGE_EXT = new Set([
  "jpg",
  "jpeg",
  "png",
  "gif",
  "webp",
  "bmp",
  "avif",
  "svg",
  "tif",
  "tiff",
  "heic",
  "heif",
])
const BOOK_EXT = new Set([
  "epub",
  "pdf",
  "mobi",
  "azw",
  "azw3",
  "txt",
  "fb2",
  "djvu",
  "cbz",
  "cbr",
  "doc",
  "docx",
])

export const extOf = (name: string) => {
  const idx = name.lastIndexOf(".")
  return idx >= 0 ? name.slice(idx + 1).toLowerCase() : ""
}

export const baseNameOf = (name: string) => {
  const idx = name.lastIndexOf(".")
  return idx > 0 ? name.slice(0, idx) : name
}

export const mediaTypeOfExt = (ext: string): MediaType | null => {
  const e = ext.replace(/^\./, "").toLowerCase()
  if (VIDEO_EXT.has(e)) return "video"
  if (MUSIC_EXT.has(e)) return "music"
  if (IMAGE_EXT.has(e)) return "image"
  if (BOOK_EXT.has(e)) return "book"
  return null
}

export const mediaTypeOfFile = (name: string) => mediaTypeOfExt(extOf(name))

export const isMediaFile = (name: string, type: MediaType) =>
  mediaTypeOfFile(name) === type

export const isVideoFile = (name: string) => VIDEO_EXT.has(extOf(name))
export const isMusicFile = (name: string) => MUSIC_EXT.has(extOf(name))
export const isImageFile = (name: string) => IMAGE_EXT.has(extOf(name))
export const isBookFile = (name: string) => BOOK_EXT.has(extOf(name))

export const mimeOfFile = (name: string): string => {
  const ext = extOf(name)
  const map: Record<string, string> = {
    mp4: "video/mp4",
    m4v: "video/mp4",
    mkv: "video/x-matroska",
    avi: "video/x-msvideo",
    mov: "video/quicktime",
    wmv: "video/x-ms-wmv",
    flv: "video/x-flv",
    webm: "video/webm",
    ts: "video/mp2t",
    m2ts: "video/mp2t",
    mts: "video/mp2t",
    rmvb: "application/vnd.rn-realmedia-vbr",
    rm: "application/vnd.rn-realmedia",
    "3gp": "video/3gpp",
    mp3: "audio/mpeg",
    flac: "audio/flac",
    wav: "audio/wav",
    aac: "audio/aac",
    m4a: "audio/mp4",
    ogg: "audio/ogg",
    opus: "audio/opus",
    wma: "audio/x-ms-wma",
    ape: "audio/x-ape",
    aiff: "audio/aiff",
    alac: "audio/mp4",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    gif: "image/gif",
    webp: "image/webp",
    bmp: "image/bmp",
    avif: "image/avif",
    svg: "image/svg+xml",
    tif: "image/tiff",
    tiff: "image/tiff",
    heic: "image/heic",
    heif: "image/heif",
    epub: "application/epub+zip",
    pdf: "application/pdf",
    mobi: "application/x-mobipocket-ebook",
    azw: "application/vnd.amazon.ebook",
    azw3: "application/vnd.amazon.ebook",
    txt: "text/plain",
    cbz: "application/vnd.comicbook+zip",
    cbr: "application/vnd.comicbook-rar",
    djvu: "image/vnd.djvu",
    fb2: "application/x-fictionbook+xml",
    doc: "application/msword",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  }
  return map[ext] || "application/octet-stream"
}

/** 媒体文件总开关：关闭时所有媒体接口按 404 处理 */
export const mediaEnabled = (settings: Record<string, string>) =>
  String(settings.media_enabled ?? "false").toLowerCase() === "true"

export const settingBool = (
  settings: Record<string, string>,
  key: string,
  def = false,
) => {
  const raw = settings[key]
  if (raw === undefined || raw === null || raw === "") return def
  return String(raw).toLowerCase() === "true"
}

export const mediaProtocolEnabled = (
  settings: Record<string, string>,
  key: "media_emby_enabled" | "media_subsonic_enabled",
) => mediaEnabled(settings) && settingBool(settings, key)

/** Emby 版本号：客户端会按版本判断能力，固定为一个较新的 4.8 分支 */
// 与 Go 的 embyCompatVersion 保持一致：返回客户端可接受的兼容版本
export const EMBY_VERSION = "4.10.0.5"

/** Subsonic 协议版本 */
export const SUBSONIC_VERSION = "1.16.1"

/** Emby/Subsonic 进度单位：100ns tick */
export const TICKS_PER_SECOND = 10_000_000
export const secondsToTicks = (seconds: number) =>
  Math.max(0, Math.round((Number(seconds) || 0) * TICKS_PER_SECOND))
export const ticksToSeconds = (ticks: number) =>
  Math.max(0, Math.round((Number(ticks) || 0) / TICKS_PER_SECOND))

/** 片头曲/广告等「不算真正开始播放」的秒数阈值（对齐 Go 的 5s） */
export const PLAYED_RESET_SECONDS = 5
/** 播放进度达到 90% 视为已看完（对齐 Go） */
export const PLAYED_RATIO = 0.9

export interface StrmOptions {
  apiRoot: string
  template: string
  overwrite: boolean
  sameDir: boolean
  outputPath: string
}
