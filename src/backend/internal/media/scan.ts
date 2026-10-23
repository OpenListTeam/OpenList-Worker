/**
 * 媒体扫描（对齐 Go 版 internal/media/scanner.go）。
 *
 * 与旧实现的差异：
 *   1. 不再硬编码「视频目录 ≥2 个文件自动聚合」，改为每个扫描路径的
 *      `path_merge` 开关（对齐 Go 的 MediaScanPath.PathMerge）；
 *   2. 音乐扫描读取 ID3 / Vorbis 标签、内嵌封面与同目录 .lrc；
 *   3. 视频按 `SxxExx` / `EPxx` / 开头数字解析季号与集号；
 *   4. 写入 mime_type / is_folder / video_type / scraped_at 等字段；
 *   5. 记录 last_scan_at，并在进度里暴露 Skipped 计数。
 *
 * Worker 限制：扫描在请求内（waitUntil）执行，受 CPU/时长约束。这里限制
 * 单路径条目数（MAX_ITEMS）与深度（MAX_DEPTH），超限时通过 Skipped 提示。
 */

import { listItems, readFileRange } from "../op/storage"
import {
  baseNameOf,
  extOf,
  mediaTypeOfFile,
  mimeOfFile,
  type EpisodeInfo,
  type MediaItem,
  type MediaScanPath,
  type MediaType,
} from "./model"
import {
  allocateIds,
  getConfig,
  getMediaDb,
  isTypeEnabled,
  saveMediaDb,
} from "./store"
import {
  extractCbzCover,
  extractEpubCover,
  extractPdfCover,
  mergeTags,
  normalizeLyrics,
  parseMusicTags,
  sniffImageMime,
  type MusicTag,
} from "./tag"
import {
  persistCover,
  thumbOptionsOf,
  type ThumbOptions,
} from "./thumb"

const MAX_DEPTH = 12
const MAX_ITEMS = 20000
/** 标签读取：头部 2MB（覆盖 FLAC PICTURE）+ 尾部 128B（ID3v1） */
const TAG_HEAD_BYTES = 2 * 1024 * 1024
const TAG_TAIL_BYTES = 128
const LRC_MAX_BYTES = 512 * 1024
const BOOK_MAX_BYTES = 16 * 1024 * 1024

export interface ScanProgress {
  media_type: MediaType
  scan_path_id: number
  running: boolean
  total: number
  current: number
  done: number
  skipped: number
  message: string
  error: string
  started_at: string
  finished_at: string
}

const progressMap = new Map<string, ScanProgress>()

const progressKey = (type: MediaType, scanPathId: number) =>
  `${type}:${scanPathId}`

const emptyProgress = (
  type: MediaType,
  scanPathId = 0,
): ScanProgress => ({
  media_type: type,
  scan_path_id: scanPathId,
  running: false,
  total: 0,
  current: 0,
  done: 0,
  skipped: 0,
  message: "",
  error: "",
  started_at: "",
  finished_at: "",
})

export const getScanProgress = (type: MediaType, scanPathId = 0) => {
  if (scanPathId) {
    return progressMap.get(progressKey(type, scanPathId)) || emptyProgress(type, scanPathId)
  }
  let latest: ScanProgress | undefined
  for (const [key, p] of progressMap) {
    if (!key.startsWith(`${type}:`)) continue
    if (!latest || p.started_at > latest.started_at) latest = p
  }
  return latest || emptyProgress(type)
}

/** Worker 内同一类型同时只允许一个扫描任务，避免重复扫描互相覆盖 */
export function isScanRunning(type: MediaType) {
  for (const [key, p] of progressMap) {
    if (key.startsWith(`${type}:`) && p.running) return true
  }
  return false
}

const joinPath = (dir: string, name: string) =>
  `${dir.replace(/\/+$/, "")}/${name}`.replace(/\/+/g, "/")

const dirOf = (path: string) => {
  const idx = path.lastIndexOf("/")
  return idx <= 0 ? "/" : path.slice(0, idx)
}

interface Target {
  path: string
  name: string
  isDir: boolean
  size: number
  modified: string
}

async function walk(
  env: any,
  root: string,
  type: MediaType,
  collect: (t: Target) => void,
  depth = 0,
) {
  if (depth > MAX_DEPTH) return
  let content: any[] = []
  try {
    const res = await listItems(root, { env })
    content = res.content || []
  } catch (e: any) {
    console.warn(`[media] list ${root} failed:`, e?.message || e)
    return
  }
  for (const item of content) {
    if (item.is_dir) {
      if (String(item.name).startsWith(".")) continue
      await walk(env, joinPath(root, item.name), type, collect, depth + 1)
    } else if (mediaTypeOfFile(item.name) === type) {
      collect({
        path: root,
        name: item.name,
        isDir: false,
        size: Number(item.size) || 0,
        modified: item.modified || "",
      })
    }
  }
}

/** path_merge：只看扫描根的一层子项（目录 → 合并条目，文件 → 独立条目） */
async function listTopLevel(
  env: any,
  root: string,
  type: MediaType,
  collect: (t: Target) => void,
) {
  let content: any[] = []
  try {
    const res = await listItems(root, { env })
    content = res.content || []
  } catch (e: any) {
    console.warn(`[media] list ${root} failed:`, e?.message || e)
    return
  }
  for (const item of content) {
    if (item.is_dir) {
      if (String(item.name).startsWith(".")) continue
      collect({
        path: root,
        name: item.name,
        isDir: true,
        size: 0,
        modified: item.modified || "",
      })
    } else if (mediaTypeOfFile(item.name) === type) {
      collect({
        path: root,
        name: item.name,
        isDir: false,
        size: Number(item.size) || 0,
        modified: item.modified || "",
      })
    }
  }
}

// ==================== 集号 / 季号 ====================

const SEASON_EP_RE =
  /(?:^|[^a-z0-9])s(\d{1,2})[\s._-]*e(\d{1,4})(?:[^0-9]|$)/i
const EP_RE = /(?:^|[^a-z0-9])e(?:p|pisode)?[\s._-]*(\d{1,4})(?:[^0-9]|$)/i
const CHINESE_EP_RE = /第\s*([0-9一二三四五六七八九十百零两]{1,6})\s*[集话話期]/
const LEADING_NUM_RE = /^(\d{1,4})[、.\-\s_]+(.*)$/
const SEASON_DIR_RE = /(?:^|[/\s._-])(?:season|s)\s*(\d{1,2})(?:[^0-9]|$)/i

const CN_DIGITS: Record<string, number> = {
  零: 0,
  一: 1,
  二: 2,
  两: 2,
  三: 3,
  四: 4,
  五: 5,
  六: 6,
  七: 7,
  八: 8,
  九: 9,
}

/** 中文数字 → 阿拉伯数字（支持 1-999，如 十一 / 二十三 / 一百零五） */
export function chineseNumberToInt(raw: string): number {
  const s = String(raw || "").trim()
  if (!s) return 0
  if (/^\d+$/.test(s)) return parseInt(s, 10) || 0
  let total = 0
  let current = 0
  for (const ch of s) {
    if (ch === "百") {
      total += (current || 1) * 100
      current = 0
    } else if (ch === "十") {
      total += (current || 1) * 10
      current = 0
    } else if (CN_DIGITS[ch] !== undefined) {
      current = CN_DIGITS[ch]
    } else {
      return 0
    }
  }
  return total + current
}

export function parseEpisodeInfo(
  fileName: string,
  fallbackIndex: number,
  fallbackSeason = 1,
): EpisodeInfo {
  const base = baseNameOf(fileName)
  let season = fallbackSeason || 1
  let index = 0
  let title = base

  const se = base.match(SEASON_EP_RE)
  if (se) {
    season = parseInt(se[1], 10) || season
    index = parseInt(se[2], 10) || 0
    title = base.slice(se.index! + se[0].length).trim() || base
  } else {
    const ep = base.match(EP_RE)
    const cn = base.match(CHINESE_EP_RE)
    if (ep) {
      index = parseInt(ep[1], 10) || 0
      title = base.slice(ep.index! + ep[0].length).trim() || base
    } else if (cn) {
      index = chineseNumberToInt(cn[1])
      title = base.slice(cn.index! + cn[0].length).trim() || base
    } else {
      const lead = base.match(LEADING_NUM_RE)
      if (lead) {
        const n = parseInt(lead[1], 10)
        // 避免把 "1080p" 之类误判：数字后面必须紧跟分隔符
        if (Number.isFinite(n) && n > 0 && n < 10000) {
          index = n
          title = lead[2].trim() || base
        }
      }
    }
  }

  if (!index) index = fallbackIndex
  return {
    index,
    title: title || base,
    file_name: fileName,
    season,
  }
}

/** 从目录名推断季号（"Season 2" / "S02" / "第二季"） */
export function parseSeasonFromPath(path: string): number {
  const segs = String(path || "").split("/").filter(Boolean)
  for (let i = segs.length - 1; i >= 0; i--) {
    const m = segs[i].match(SEASON_DIR_RE)
    if (m) {
      const n = parseInt(m[1], 10)
      if (Number.isFinite(n) && n > 0) return n
    }
  }
  return 1
}

// ==================== 标签读取 ====================

async function readMusicTag(
  env: any,
  filePath: string,
  ext: string,
  fileSize: number,
): Promise<MusicTag> {
  const head = await readFileRange(filePath, 0, TAG_HEAD_BYTES, { env })
  let tailBytes: Uint8Array | null = null
  if (fileSize > TAG_HEAD_BYTES && fileSize > TAG_TAIL_BYTES) {
    tailBytes = await readFileRange(
      filePath,
      fileSize - TAG_TAIL_BYTES,
      TAG_TAIL_BYTES,
      { env },
    )
  } else if (head && head.length >= TAG_TAIL_BYTES) {
    tailBytes = head.subarray(head.length - TAG_TAIL_BYTES)
  }
  return parseMusicTags(ext, head, tailBytes)
}

/** 读取同目录同名 .lrc（限制 512KB） */
async function readLyrics(env: any, audioPath: string, tag: MusicTag) {
  const lrcPath = `${audioPath.replace(/\.[^.]+$/, "")}.lrc`
  const data = await readFileRange(lrcPath, 0, LRC_MAX_BYTES, { env })
  if (data && data.length > 0) {
    try {
      const text = new TextDecoder("utf-8", { fatal: false }).decode(data)
      const lrc = normalizeLyrics(text)
      if (lrc) return lrc
    } catch {
      /* ignore */
    }
  }
  return normalizeLyrics(tag.lyrics || "")
}

// ==================== 条目构建 ====================

/** 构建视频/图片/书籍条目（非音乐） */
async function buildItem(
  env: any,
  target: Target,
  sp: MediaScanPath,
  opts: { thumb: ThumbOptions; existing?: MediaItem },
): Promise<Partial<MediaItem>> {
  const folder = target.path
  const fullPath = joinPath(target.path, target.name)
  const existing = opts.existing

  let episodes: EpisodeInfo[] = []
  let size = target.size
  let videoType = ""
  let releaseDate = ""
  let duration = existing?.duration || 0

  if (target.isDir) {
    const files = await listDirMedia(env, fullPath, sp.media_type)
    if (files.length === 0) return {}
    videoType = "tv"
    const season = parseSeasonFromPath(fullPath)
    episodes = files
      .sort((a, b) => a.name.localeCompare(b.name, "zh-CN", { numeric: true }))
      .map((f, idx) => parseEpisodeInfo(f.name, idx + 1, season))
    size = files.reduce((sum, f) => sum + f.size, 0)
  } else if (sp.media_type === "video") {
    videoType = SEASON_EP_RE.test(target.name) || EP_RE.test(target.name) || CHINESE_EP_RE.test(target.name)
      ? "tv"
      : "movie"
    const ep = parseEpisodeInfo(target.name, 1, parseSeasonFromPath(fullPath))
    releaseDate = existing?.release_date || ""
    if (videoType === "tv") {
      size = target.size
      duration = existing?.duration || 0
      episodes = []
      // 单集文件：季/集写入条目本身
      return {
        media_type: sp.media_type,
        scan_path_id: sp.id,
        folder_path: folder,
        file_name: target.name,
        scraped_name: existing?.scraped_name || ep.title,
        original_name: target.name,
        file_size: size,
        mime_type: mimeOfFile(target.name),
        is_folder: false,
        video_type: videoType,
        season: ep.season || 1,
        episode: ep.index || 1,
        episodes: "",
        cover: existing?.cover || "",
        authors: existing?.authors || "",
        plot: existing?.plot || "",
        description: existing?.description || "",
        genre: existing?.genre || "",
        release_date: releaseDate,
        rating: existing?.rating || 0,
        duration,
        album_name: "",
        album_artist: "",
        track_number: 0,
        publisher: "",
        isbn: "",
        external_id: existing?.external_id || "",
        hidden: existing?.hidden || false,
        scraper_source: existing?.scraper_source || "",
        scraped_at: existing?.scraped_at || null,
        lyrics: existing?.lyrics || "",
        reviews: existing?.reviews || "",
        thumb: existing?.thumb || "",
        thumb_mime: existing?.thumb_mime || "",
      }
    }
  }

  let cover = existing?.cover || ""
  let thumb = existing?.thumb || ""
  let thumbMime = existing?.thumb_mime || ""

  // 图片：按魔数校验 + 生成可缓存的缩略图（Worker 缩放不了，直接缓存原图）
  if (sp.media_type === "image" && !target.isDir) {
    const head = await readFileRange(fullPath, 0, 256 * 1024, { env })
    const mime = head ? sniffImageMime(head) : ""
    if (!cover && head && mime) {
      const stored = await persistCover(env, head, opts.thumb)
      cover = stored.cover
      thumb = stored.thumb
      thumbMime = stored.thumb_mime
    }
    if (!mime) {
      // 伪造扩展名的非图片文件不入库
      return {}
    }
    if (!releaseDate) {
      const d = (target.modified || "").slice(0, 10)
      if (d) releaseDate = d
    }
  }

  // 书籍：EPUB / CBZ / PDF 提取内嵌封面
  if (sp.media_type === "book" && !target.isDir && !cover) {
    const ext = extOf(target.name)
    if (ext === "epub" || ext === "cbz" || ext === "pdf") {
      const data = await readFileRange(fullPath, 0, BOOK_MAX_BYTES, { env })
      if (data) {
        const found =
          ext === "epub"
            ? await extractEpubCover(data)
            : ext === "cbz"
              ? await extractCbzCover(data)
              : await extractPdfCover(data)
        if (found) {
          const stored = await persistCover(env, found.data, opts.thumb)
          cover = stored.cover
          thumb = stored.thumb
          thumbMime = stored.thumb_mime
        }
      }
    }
  }

  const title = existing?.scraped_name || baseNameOf(target.name)
  const episodeCount = episodes.length
  return {
    media_type: sp.media_type,
    scan_path_id: sp.id,
    folder_path: folder,
    file_name: target.name,
    scraped_name: title,
    original_name: target.name,
    file_size: size,
    mime_type: target.isDir ? "" : mimeOfFile(target.name),
    is_folder: target.isDir,
    video_type: videoType,
    season: target.isDir ? parseSeasonFromPath(fullPath) : existing?.season || 0,
    episode: target.isDir ? 0 : existing?.episode || 0,
    episodes: target.isDir ? JSON.stringify(episodes) : "",
    cover,
    authors: existing?.authors || "",
    plot: existing?.plot || "",
    description: existing?.description || "",
    genre: existing?.genre || "",
    release_date: releaseDate || existing?.release_date || "",
    rating: existing?.rating || 0,
    duration,
    album_name: existing?.album_name || "",
    album_artist: existing?.album_artist || "",
    track_number: existing?.track_number || 0,
    publisher: existing?.publisher || "",
    isbn: existing?.isbn || "",
    external_id: existing?.external_id || "",
    hidden: existing?.hidden || false,
    scraper_source: existing?.scraper_source || "",
    scraped_at: existing?.scraped_at || null,
    lyrics: existing?.lyrics || "",
    reviews: existing?.reviews || "",
    thumb,
    thumb_mime: thumbMime,
    ...(target.isDir && episodeCount === 0 ? { file_size: 0 } : {}),
  }
}

async function listDirMedia(env: any, dir: string, type: MediaType) {
  try {
    const res = await listItems(dir, { env })
    return (res.content || [])
      .filter((i: any) => !i.is_dir && mediaTypeOfFile(i.name) === type)
      .map((i: any) => ({
        name: String(i.name),
        size: Number(i.size) || 0,
        modified: i.modified || "",
      }))
  } catch {
    return []
  }
}

/** 构建音乐条目：merge=true 时目录整体为专辑，false 时每首独立 */
async function buildMusicItems(
  env: any,
  target: Target,
  sp: MediaScanPath,
  opts: { thumb: ThumbOptions; existing: MediaItem[] },
): Promise<Array<Partial<MediaItem>>> {
  const out: Array<Partial<MediaItem>> = []

  if (target.isDir) {
    const files = await listDirMedia(env, joinPath(target.path, target.name), "music")
    if (files.length === 0) return out
    files.sort((a, b) => a.name.localeCompare(b.name, "zh-CN", { numeric: true }))

    const firstPath = joinPath(joinPath(target.path, target.name), files[0].name)
    const tag = await readMusicTag(
      env,
      firstPath,
      extOf(files[0].name),
      files[0].size,
    )

    let cover = ""
    let thumb = ""
    let thumbMime = ""
    if (tag.coverData) {
      const stored = await persistCover(env, tag.coverData, opts.thumb)
      cover = stored.cover
      thumb = stored.thumb
      thumbMime = stored.thumb_mime
    }
    const lyrics = await readLyrics(env, firstPath, tag)

    const episodes: EpisodeInfo[] = files.map((f, idx) =>
      parseEpisodeInfo(f.name, idx + 1, 1),
    )
    const prev = opts.existing[0]
    out.push({
      media_type: "music",
      scan_path_id: sp.id,
      folder_path: dirOf(joinPath(target.path, target.name)),
      file_name: target.name,
      scraped_name: tag.album || target.name,
      original_name: target.name,
      file_size: files.reduce((s, f) => s + f.size, 0),
      mime_type: "",
      is_folder: true,
      episodes: JSON.stringify(episodes),
      album_name: tag.album || target.name,
      album_artist: tag.albumArtist || tag.artist || "",
      track_number: 0,
      authors: tag.artist ? JSON.stringify([tag.artist]) : "",
      genre: tag.genre || "",
      release_date: tag.year ? `${tag.year}-01-01` : "",
      duration: tag.duration || 0,
      cover: cover || prev?.cover || "",
      thumb: thumb || prev?.thumb || "",
      thumb_mime: thumbMime || prev?.thumb_mime || "",
      lyrics: lyrics || prev?.lyrics || "",
      video_type: "",
      season: 0,
      episode: 0,
      hidden: prev?.hidden || false,
      scraper_source: prev?.scraper_source || "",
      scraped_at: prev?.scraped_at || null,
      rating: prev?.rating || 0,
      plot: prev?.plot || "",
      description: prev?.description || "",
      publisher: "",
      isbn: "",
      external_id: prev?.external_id || "",
      reviews: prev?.reviews || "",
    })
    return out
  }

  // 单曲
  const fullPath = joinPath(target.path, target.name)
  const ext = extOf(target.name)
  const tag = await readMusicTag(env, fullPath, ext, target.size)
  let cover = ""
  let thumb = ""
  let thumbMime = ""
  if (tag.coverData) {
    const stored = await persistCover(env, tag.coverData, opts.thumb)
    cover = stored.cover
    thumb = stored.thumb
    thumbMime = stored.thumb_mime
  }
  const lyrics = await readLyrics(env, fullPath, tag)
  const prev = opts.existing[0]
  if (!tag.album && !tag.artist && !tag.title) {
    // 无标签时退化为「目录名作专辑、文件名作标题」
    tag.album = target.path.split("/").filter(Boolean).pop() || ""
  }
  out.push({
    media_type: "music",
    scan_path_id: sp.id,
    folder_path: target.path,
    file_name: target.name,
    scraped_name: tag.title || baseNameOf(target.name),
    original_name: target.name,
    file_size: target.size,
    mime_type: mimeOfFile(target.name),
    is_folder: false,
    episodes: "",
    album_name: tag.album || "",
    album_artist: tag.albumArtist || tag.artist || "",
    track_number: tag.trackNumber || 0,
    authors: tag.artist ? JSON.stringify([tag.artist]) : "",
    genre: tag.genre || "",
    release_date: tag.year ? `${tag.year}-01-01` : "",
    duration: tag.duration || prev?.duration || 0,
    cover: cover || prev?.cover || "",
    thumb: thumb || prev?.thumb || "",
    thumb_mime: thumbMime || prev?.thumb_mime || "",
    lyrics: lyrics || prev?.lyrics || "",
    video_type: "",
    season: 0,
    episode: 0,
    hidden: prev?.hidden || false,
    scraper_source: prev?.scraper_source || "",
    scraped_at: prev?.scraped_at || null,
    rating: prev?.rating || 0,
    plot: prev?.plot || "",
    description: prev?.description || "",
    publisher: "",
    isbn: "",
    external_id: prev?.external_id || "",
    reviews: prev?.reviews || "",
  })
  return out
}

function findExisting(db: any, type: MediaType, folder: string, name: string) {
  return db.items.find(
    (i: MediaItem) =>
      i.media_type === type &&
      i.folder_path === folder &&
      i.file_name === name,
  )
}

export async function scanMedia(
  env: any,
  type: MediaType,
  scanPathId = 0,
): Promise<{ scanned: number; created: number; updated: number; skipped: number }> {
  const db = await getMediaDb(env)
  if (!isTypeEnabled(db, type)) {
    throw new Error(`media type ${type} is disabled`)
  }
  if (isScanRunning(type)) {
    throw new Error(`media type ${type} is already scanning`)
  }

  const cfg = getConfig(db, type)
  const thumb = thumbOptionsOf(cfg)
  const paths = db.scan_paths.filter(
    (p) => p.media_type === type && (!scanPathId || p.id === scanPathId),
  )

  let scanned = 0
  let created = 0
  let updated = 0
  let skipped = 0

  for (const sp of paths) {
    const key = progressKey(type, sp.id)
    const progress: ScanProgress = {
      ...emptyProgress(type, sp.id),
      running: true,
      message: "正在扫描...",
      started_at: new Date().toISOString(),
    }
    progressMap.set(key, progress)

    try {
      const targets: Target[] = []
      if (sp.path_merge) {
        await listTopLevel(env, sp.path, type, (t) => {
          if (targets.length < MAX_ITEMS) targets.push(t)
        })
      } else {
        await walk(env, sp.path, type, (t) => {
          if (targets.length < MAX_ITEMS) targets.push(t)
        })
      }
      progress.total = targets.length

      for (const target of targets) {
        progress.current += 1
        progress.message = `已扫描: ${target.name}`
        try {
          const existingItems = db.items.filter(
            (i) =>
              i.media_type === type &&
              i.folder_path ===
                (target.isDir
                  ? dirOf(joinPath(target.path, target.name))
                  : target.path) &&
              i.file_name === target.name,
          )
          const results =
            type === "music"
              ? await buildMusicItems(env, target, sp, {
                  thumb,
                  existing: existingItems,
                })
              : [
                  await buildItem(env, target, sp, {
                    thumb,
                    existing: existingItems[0],
                  }),
                ]

          let produced = 0
          for (const data of results) {
            if (!data || !data.file_name || !data.folder_path) continue
            const folder = String(data.folder_path)
            const name = String(data.file_name)
            const prev = findExisting(db, type, folder, name)
            if (prev) {
              Object.assign(prev, data, {
                id: prev.id,
                created_at: prev.created_at,
                updated_at: new Date().toISOString(),
              })
              updated += 1
            } else {
              const [id] = allocateIds(db, 1)
              db.items.push({
                ...(data as MediaItem),
                id,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              })
              created += 1
            }
            produced += 1
          }
          if (produced === 0) skipped += 1
          else scanned += produced
        } catch (e: any) {
          skipped += 1
          console.warn(
            `[media] build item failed ${target.path}/${target.name}:`,
            e?.message || e,
          )
        }
      }

      sp.last_scan_at = new Date().toISOString()
      cfg.last_scan_at = sp.last_scan_at
      progress.done = scanned
      progress.skipped = skipped
      progress.running = false
      progress.message =
        skipped > 0 ? `扫描完成（跳过 ${skipped} 条）` : "扫描完成"
      progress.finished_at = new Date().toISOString()
      await saveMediaDb(env, db)
    } catch (e: any) {
      progress.running = false
      progress.error = e?.message || String(e)
      progress.message = "扫描失败"
      progress.finished_at = new Date().toISOString()
      console.error(`[media] scan path ${sp.path} failed:`, e?.message || e)
    }
  }

  // 扫描结束后按需自动生成 STRM（对齐 Go 的 media_strm_on_scan）
  if (paths.length > 0) {
    const { maybeGenerateStrmOnScan } = await import("./strm")
    await maybeGenerateStrmOnScan(env, type).catch((e) =>
      console.warn("[media] strm on scan failed:", e?.message || e),
    )
  }

  return { scanned, created, updated, skipped }
}

export const __scanTest = { parseEpisodeInfo, parseSeasonFromPath }

export function isImageExt(name: string) {
  return mediaTypeOfFile(name) === "image"
}
export function isBookExt(name: string) {
  return mediaTypeOfFile(name) === "book"
}
export function isMusicExt(name: string) {
  return mediaTypeOfFile(name) === "music"
}
export function isVideoExt(name: string) {
  return mediaTypeOfFile(name) === "video"
}
export function extName(name: string) {
  return extOf(name)
}
export { mergeTags }
