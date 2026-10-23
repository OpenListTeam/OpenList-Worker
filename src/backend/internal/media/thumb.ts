/**
 * 封面/缩略图落盘。
 *
 * Worker 没有 sharp / canvas，无法真正缩放图片，因此这里做的是「原图缓存」：
 *   - store_thumbnail=true  → 把原始封面字节写入持久化存储（KV/D1/DO），
 *     cover 写 `thumb:<hash>`，由 API 层解析为 /api/public/media/thumb?path=<hash>
 *   - store_thumbnail=false → 小于 256KB 的图直接 base64 内联，否则丢弃
 *
 * 与 Go 的差异：Go 会把图片解码后按 thumbnail_mode 存成小图；Worker 侧
 * 保持原图（体积有上限），语义上仍满足「不依赖第三方图床」。
 */

import { saveThumb } from "./store"
import { sniffImageMime } from "./tag"

/**
 * 与 OpenList 客户端的约定：
 *   `thumb:<hash>` 是一个内部标记，不是可访问 URL。
 * 前端渲染前需调用 `/api/public/media/thumb?path=<hash>`。
 */
export interface CoverResult {
  cover: string
  thumb: string
  thumb_mime: string
}

export interface ThumbOptions {
  storeThumbnail: boolean
  mode: string
}

const MAX_INLINE_BYTES = 256 * 1024

export const emptyCover = (): CoverResult => ({
  cover: "",
  thumb: "",
  thumb_mime: "",
})

export async function sha256Hex(data: Uint8Array): Promise<string> {
  const buf = data.buffer.slice(
    data.byteOffset,
    data.byteOffset + data.byteLength,
  ) as ArrayBuffer
  const digest = await crypto.subtle.digest("SHA-256", buf)
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
}

export function bytesToBase64(bytes: Uint8Array): string {
  let bin = ""
  const chunk = 0x2000
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return btoa(bin)
}

/** 把图片字节转成 cover 字段值（落盘或内联） */
export async function persistCover(
  env: any,
  data: Uint8Array | undefined,
  opts: ThumbOptions,
): Promise<CoverResult> {
  if (!data || data.length === 0) return emptyCover()
  // 只信魔数。调用方给的 MIME 来自文件元数据（ID3 APIC / 刮削站点），
  // 采信它就会把 image/svg+xml 这类可执行内容存成封面，
  // 最终在 serveCover 的 data: 分支变成可执行的 Content-Type。
  const realMime = sniffImageMime(data)
  if (!realMime) return emptyCover()

  if (!opts.storeThumbnail) {
    if (data.length > MAX_INLINE_BYTES) return emptyCover()
    return {
      cover: `data:${realMime};base64,${bytesToBase64(data)}`,
      thumb: "",
      thumb_mime: realMime,
    }
  }

  const hash = (await sha256Hex(data)).slice(0, 32)
  const stored = await saveThumb(env, hash, data, realMime)
  if (!stored) return emptyCover()
  return { cover: stored, thumb: hash, thumb_mime: realMime }
}

/** `thumb:<hash>` / `data:` / `http(s):` 统一解析为可直接访问的 URL */
export function resolveCoverUrl(cover: string, origin: string): string {
  if (!cover) return ""
  if (cover.startsWith("thumb:")) {
    const hash = cover.slice("thumb:".length)
    return `${origin}/api/public/media/thumb?path=${encodeURIComponent(hash)}`
  }
  return cover
}

export interface ThumbOptionsSource {
  store_thumbnail?: boolean
  thumbnail_mode?: string
  scraper_config?: string
}

/** 从媒体库配置解析缩略图选项（类型级 scraper_config 优先） */
export function thumbOptionsOf(cfg: ThumbOptionsSource | null | undefined): ThumbOptions {
  let storeThumbnail = cfg?.store_thumbnail !== false
  let mode = String(cfg?.thumbnail_mode || "runtime")
  const raw = cfg?.scraper_config
  if (raw) {
    try {
      const sc = typeof raw === "string" ? JSON.parse(raw) : raw
      if (sc?.store_thumbnail !== undefined && sc.store_thumbnail !== "") {
        storeThumbnail = String(sc.store_thumbnail) === "true"
      }
      if (sc?.thumbnail_mode) mode = String(sc.thumbnail_mode)
    } catch {
      /* ignore */
    }
  }
  return { storeThumbnail, mode }
}
