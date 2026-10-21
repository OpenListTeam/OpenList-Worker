/**
 * 媒体库数据模型。
 *
 * 与 Go 版 internal/model/media*.go 字段保持一致，前端（OpenList-Frontend
 * dev-media）直接按这些 JSON 字段渲染，因此命名不要随意调整。
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
}

export interface EpisodeInfo {
  index: number
  title: string
  file_name: string
  duration?: number
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
}

export interface MediaAppKey {
  id: number
  user_id: number
  name: string
  prefix: string
  /** SHA-256(token)，用于 Emby api_key 校验 */
  secret: string
  /** 明文 token，仅用于 Subsonic token 认证（md5(password+salt)） */
  plain?: string
  last_used_at: string | null
  created_at: string
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
}

export const MEDIA_TYPES: MediaType[] = ["video", "music", "image", "book"]

export const DEFAULT_CONFIG = (mediaType: MediaType): MediaConfig => ({
  media_type: mediaType,
  enabled: false,
  thumbnail_mode: "runtime",
  thumbnail_path: "imgs",
  store_thumbnail: true,
  scrape_concurrency: 5,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
})

export const emptyMediaDb = (): MediaDb => ({
  version: 1,
  next_id: 1,
  configs: [],
  scan_paths: [],
  items: [],
  user_data: [],
  app_keys: [],
  emby_devices: [],
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

export const mediaTypeOfExt = (ext: string): MediaType | null => {
  if (VIDEO_EXT.has(ext)) return "video"
  if (MUSIC_EXT.has(ext)) return "music"
  if (IMAGE_EXT.has(ext)) return "image"
  if (BOOK_EXT.has(ext)) return "book"
  return null
}

export const mediaTypeOfFile = (name: string) => mediaTypeOfExt(extOf(name))

export const isMediaFile = (name: string, type: MediaType) =>
  mediaTypeOfFile(name) === type

export const isVideoFile = (name: string) => VIDEO_EXT.has(extOf(name))
export const isMusicFile = (name: string) => MUSIC_EXT.has(extOf(name))
export const isImageFile = (name: string) => IMAGE_EXT.has(extOf(name))
export const isBookFile = (name: string) => BOOK_EXT.has(extOf(name))

/** 媒体文件总开关：关闭时所有媒体接口按 404 处理 */
export const mediaEnabled = (settings: Record<string, string>) =>
  String(settings.media_enabled ?? "false").toLowerCase() === "true"

export const mediaProtocolEnabled = (
  settings: Record<string, string>,
  key: "media_emby_enabled" | "media_subsonic_enabled",
) =>
  mediaEnabled(settings) &&
  String(settings[key] ?? "false").toLowerCase() === "true"
