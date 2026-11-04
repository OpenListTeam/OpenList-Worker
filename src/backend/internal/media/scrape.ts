/**
 * 媒体刮削（对齐 Go 版 internal/media/scraper/*）。
 *
 * 支持：
 *   - video: TMDB（模糊匹配 + 多候选打分 + 电影/剧集区分 + 语言）
 *   - music: ID3/Vorbis 本地兜底 → Discogs
 *   - book : 豆瓣 / Google Books / OpenLibrary + EPUB/CBZ 内嵌封面
 *   - image: 原图缓存（缩略图）+ EXIF 拍摄日期
 *
 * 与旧实现的差异：
 *   1. 并发刮削（media_scrape_concurrency，默认 5），单协程写回；
 *   2. 只刮 `scraped_at` 为空的条目（对齐 Go 的 GetUnscrappedItems）；
 *   3. 远端失败但本地兜底拿到数据时仍然落库（不写 scraped_at，便于重试）；
 *   4. 命中率/耗时等统计（对齐 Go 的 MediaScrapeStats）。
 */

import { readFileRange } from "../op/storage"
import {
  extOf,
  settingBool,
  type MediaItem,
  type MediaType,
} from "./model"
import { getMediaDb, saveMediaDb } from "./store"
import {
  extractCbzCover,
  extractEpubCover,
  extractPdfCover,
  normalizeLyrics,
  parseJpegExifDate,
  parseMusicTags,
  sniffImageMime,
} from "./tag"
import { persistCover, thumbOptionsOf } from "./thumb"

interface ScrapeContext {
  env: any
  settings: Record<string, string>
  thumb: ReturnType<typeof thumbOptionsOf>
}

export interface ScrapeStats {
  media_type: MediaType | ""
  running: boolean
  total_scraped: number
  hit_count: number
  low_confidence_count: number
  no_match_count: number
  total_attempts: number
  total_search_millis: number
  last_error: string
  started_at: string
  finished_at: string
}

const statsMap = new Map<MediaType, ScrapeStats>()

const emptyStats = (type: MediaType): ScrapeStats => ({
  media_type: type,
  running: false,
  total_scraped: 0,
  hit_count: 0,
  low_confidence_count: 0,
  no_match_count: 0,
  total_attempts: 0,
  total_search_millis: 0,
  last_error: "",
  started_at: "",
  finished_at: "",
})

export function getScrapeStats(type: MediaType) {
  return statsMap.get(type) || emptyStats(type)
}

export function isScrapeRunning(type: MediaType) {
  return !!statsMap.get(type)?.running
}

const lang = (settings: Record<string, string>) =>
  settings.media_scrape_language || "zh-CN"

/** 去掉压制组后缀/分辨率标记，提高搜索命中率 */
export const cleanName = (name: string) => {
  let s = String(name || "").replace(/\.[^.]+$/, "")
  s = s.replace(
    /[.\s_-]+(2160p|1080p|720p|480p|bluray|blu-ray|web-?dl|webrip|hdrip|dvdrip|remux|x26[45]|h\.?26[45]|hevc|avc|aac|ac3|dts|truehd|atmos|10bit|hdr).*$/i,
    "",
  )
  s = s.replace(/[\[\]【】()（）]/g, " ")
  return s.replace(/[._]/g, " ").replace(/\s+/g, " ").trim()
}

/** 中文发布信息噪声：字幕/语言/版本/压制组 */
const CN_NOISE_RE =
  /(双语字幕|中英字幕|中英双字|中英双语|国英双语|国英双轨|国粤双语|粤语中字|国语中字|英语中字|日语中字|韩语中字|内封字幕|外挂字幕|简繁字幕|完整版|未删减版|加长版|导演剪辑版|蓝光版|高清版|公映版|译制版|国配版|台配版|港配版|原声版|原盘|国语|粤语|英语|日语|韩语|中字|双语|字幕|压制组|字幕组|发布组|高清影视|高清电影)/g

/** 英文发布信息噪声：分辨率/编码/音轨/发布组 */
const EN_NOISE_RE =
  /(?<![a-z0-9])(2160p|1080p|720p|480p|bluray|blu-?ray|bdrip|web-?dl|webrip|hdrip|dvdrip|remux|uhd|x264|x265|h\.?264|h\.?265|hevc|avc|aac|ac3|eac3|dts|truehd|atmos|10bit|8bit|hdr10|hdr|sdr|repack|proper|extended|uncut|multi|chs|cht|eng|yyets|frds|rarbg|yify|yts)(?![a-z0-9])/gi

/**
 * 从文件名/目录名解析出可搜索的标题候选（对齐 Go scraper 的 parsedVideoTitle）。
 *
 * Go 的实现会生成「中文标题 / 英文标题 / 关键词」多组候选并逐个尝试；
 * TS 之前直接把整个文件名（含 SxxExx、中英双字、压制组）当 query，
 * TMDB 基本搜不到，于是刮削表现为「全部失败」。
 */
export function parseMediaTitle(raw: string): {
  primary: string
  candidates: string[]
  year: string
} {
  let s = String(raw || "").replace(/\.[^.]+$/, "")
  // 括号里的中文通常是片名别名，留作候选后再从主串里去掉
  const bracket: string[] = []
  s = s.replace(/[\(（\[【]([^\)）\]】]{2,40})[\)）\]】]/g, (_m, inner: string) => {
    if (/[\u4e00-\u9fff]/.test(inner)) bracket.push(inner)
    return " "
  })
  const year = (s.match(/(?<!\d)((?:19|20)\d{2})(?!\d)/) || [])[1] || ""
  s = s
    // 集号标记：S01E05 / 第5集 / EP05
    .replace(/(?<![a-z0-9])s\d{1,2}[\s._-]*e\d{1,4}(?![0-9])/gi, " ")
    .replace(/第\s*[0-9一二三四五六七八九十百零两]{1,4}\s*[集话話期季]/g, " ")
    .replace(/(?:^|[\s._-])ep?\s*\d{1,4}(?=$|[\s._-])/gi, " ")
    .replace(CN_NOISE_RE, " ")
    .replace(EN_NOISE_RE, " ")
    .replace(/[._\-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
  // 年份通常不是片名的一部分；但「2012」「1917」这类片名要保留原串作为兜底
  const withoutYear = s
    .replace(/(?<!\d)(?:19|20)\d{2}(?!\d)/g, " ")
    .replace(/\s+/g, " ")
    .trim()
  const candidates: string[] = []
  const push = (value: string) => {
    const t = value.replace(/\s+/g, " ").trim()
    if (t && !candidates.includes(t)) candidates.push(t)
  }
  // 中文片段优先：TMDB 的 zh-CN 数据对中文片名命中率最高
  const cn = withoutYear.match(/[\u4e00-\u9fff][\u4e00-\u9fff0-9：:·\s]*/)
  if (cn) push(cn[0])
  for (const b of bracket) push(b)
  push(withoutYear)
  push(s)
  return { primary: candidates[0] || s, candidates, year }
}

const normalizeTitle = (value: string) =>
  cleanName(value)
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()

/** token 交集 / 并集，兼顾中文（按字符 2-gram） */
function similarity(a: string, b: string): number {
  const x = normalizeTitle(a)
  const y = normalizeTitle(b)
  if (!x || !y) return 0
  if (x === y) return 1
  if (x.includes(y) || y.includes(x)) return 0.85
  const tokens = (s: string) => {
    const out = new Set<string>()
    for (const part of s.split(" ")) {
      if (!part) continue
      if (/[\u4e00-\u9fff]/.test(part) && part.length > 2) {
        for (let i = 0; i < part.length - 1; i++) out.add(part.slice(i, i + 2))
      } else {
        out.add(part)
      }
    }
    return out
  }
  const ta = tokens(x)
  const tb = tokens(y)
  if (ta.size === 0 || tb.size === 0) return 0
  let inter = 0
  for (const t of ta) if (tb.has(t)) inter += 1
  return inter / (ta.size + tb.size - inter)
}

const jsonFetch = async (
  url: string,
  init?: RequestInit,
  timeout = 20_000,
): Promise<any> => {
  const res = await fetch(url, {
    ...init,
    headers: {
      Accept: "application/json",
      "User-Agent": "OpenList-Media/1.0",
      ...(init?.headers || {}),
    },
    signal: AbortSignal.timeout(timeout),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

const tmdbBase = (settings: Record<string, string>) => {
  const raw = (settings.media_tmdb_api_url || "https://api.themoviedb.org/3").trim()
  const base = raw.replace(/\/+$/, "")
  return /\/3$/.test(base) ? base : `${base}/3`
}

const isTvItem = (item: MediaItem) =>
  item.video_type === "tv" ||
  /(?:^|[^a-z0-9])s\d{1,2}[\s._-]*e\d{1,4}/i.test(item.file_name || "")

/** TMDB 搜索 + 候选打分，返回最佳候选 */
async function tmdbSearch(
  ctx: ScrapeContext,
  item: MediaItem,
): Promise<{ hit: any; score: number; type: "movie" | "tv" } | null> {
  const key = (ctx.settings.media_tmdb_key || "").trim()
  if (!key) return null
  const type = isTvItem(item) ? "tv" : "movie"
  const parsed = parseMediaTitle(item.scraped_name || item.file_name)
  if (parsed.candidates.length === 0) return null
  const api = tmdbBase(ctx.settings)
  const preferred = lang(ctx.settings)
  // 先用配置语言，再退到「不限定语言」：TMDB 不带 language 时会用所有别名
  // 匹配，中文片名/港台译名搜不到时的召回明显更高。
  const languages = preferred ? [preferred, ""] : [""]
  const stats = statsMap.get(item.media_type)
  const wantYear =
    Number((item.release_date || "").slice(0, 4)) || Number(parsed.year) || 0
  let best: { hit: any; score: number } | null = null
  const tried = new Set<string>()

  for (const query of parsed.candidates.slice(0, 3)) {
    for (const language of languages) {
      // 年份过滤会让「文件名年份写错」直接零结果，所以先不带年份搜一遍
      for (const withYear of parsed.year ? [false, true] : [false]) {
        const cacheKey = `${query}\u0000${language}\u0000${withYear}`
        if (tried.has(cacheKey)) continue
        tried.add(cacheKey)
        try {
          const params = new URLSearchParams({
            api_key: key,
            query,
            include_adult: "false",
          })
          if (language) params.set("language", language)
          if (withYear) {
            if (type === "movie") params.set("primary_release_year", parsed.year)
            else params.set("first_air_date_year", parsed.year)
          }
          const started = Date.now()
          const search = await jsonFetch(
            `${api}/search/${type}?${params.toString()}`,
          )
          if (stats) {
            stats.total_attempts += 1
            stats.total_search_millis += Date.now() - started
          }
          const results: any[] = Array.isArray(search?.results)
            ? search.results
            : []
          for (const hit of results.slice(0, 8)) {
            const title =
              hit.title || hit.name || hit.original_title || hit.original_name || ""
            let score = similarity(query, title)
            const year = Number(
              String(hit.release_date || hit.first_air_date || "").slice(0, 4),
            )
            if (wantYear && year) {
              if (year === wantYear) score += 0.15
              else if (Math.abs(year - wantYear) <= 1) score += 0.05
            }
            if (type === "tv" && hit.first_air_date) score += 0.05
            if (type === "movie" && hit.release_date) score += 0.05
            score += Math.min(0.05, (Number(hit.popularity) || 0) / 2000)
            if (!best || score > best.score) best = { hit, score }
          }
          // 已经足够强就不再枚举剩余候选，避免刮削把请求数打满
          if (best && best.score >= 0.6) return { ...best, type }
        } catch (e: any) {
          if (stats) stats.last_error = e?.message || String(e)
        }
      }
    }
  }
  if (!best || best.score < 0.35) return null
  return { ...best, type }
}

async function scrapeTmdb(
  ctx: ScrapeContext,
  item: MediaItem,
): Promise<{ ok: boolean; low: boolean }> {
  const key = (ctx.settings.media_tmdb_key || "").trim()
  if (!key) {
    // 静默失败是「刮削全部失败」最常见的误报来源：把原因写进 stats，
    // 前端统计面板才能显示「未配置 Key」而不是一片 0。
    const stats = statsMap.get(item.media_type)
    if (stats && !stats.last_error) {
      stats.last_error =
        "未配置 TMDB API Key（管理 → 媒体库 → media_tmdb_key），已回退豆瓣"
    }
    return { ok: false, low: false }
  }
  const found = await tmdbSearch(ctx, item)
  if (!found) return { ok: false, low: false }
  const { hit, score, type } = found
  const api = tmdbBase(ctx.settings)
  const language = lang(ctx.settings)
  const detail = await jsonFetch(
    `${api}/${type}/${hit.id}?api_key=${encodeURIComponent(key)}&language=${encodeURIComponent(language)}&append_to_response=credits,external_ids`,
  )

  item.scraped_name =
    detail.title || detail.name || hit.title || hit.name || item.scraped_name
  item.plot = detail.overview || item.plot || ""
  item.description = detail.tagline || item.plot
  item.rating = Number(detail.vote_average) || item.rating || 0
  item.release_date =
    detail.release_date || detail.first_air_date || item.release_date || ""
  item.genre = (detail.genres || []).map((g: any) => g.name).join(",") || item.genre
  item.external_id = String(detail.id || hit.id)
  item.scraper_source = "tmdb"
  item.video_type = type === "tv" ? "tv" : "movie"

  const poster = detail.poster_path
    ? `https://image.tmdb.org/t/p/w500${detail.poster_path}`
    : ""
  if (poster) item.cover = poster

  const cast = (detail.credits?.cast || [])
    .slice(0, 8)
    .map((c: any) => c.name)
    .filter(Boolean)
  if (cast.length) item.authors = JSON.stringify(cast)

  if (type === "tv") {
    const seasons = Number(detail.number_of_seasons) || 0
    if (seasons > 0) item.season = item.season || seasons
    // 单集信息：文件名带 SxxExx 时补该集标题/简介
    const m = (item.file_name || "").match(
      /s(\d{1,2})[\s._-]*e(\d{1,4})/i,
    )
    if (m) {
      const s = parseInt(m[1], 10)
      const e = parseInt(m[2], 10)
      try {
        const ep = await jsonFetch(
          `${api}/tv/${hit.id}/season/${s}/episode/${e}?api_key=${encodeURIComponent(key)}&language=${encodeURIComponent(language)}`,
        )
        if (ep?.name) {
          // 集名不能覆盖 scraped_name：Series 身份由 scraped_name 决定，
          // 覆盖会让同一部剧的每集各自变成一个 Series。
          item.episode_title = ep.name
          if (ep.overview) item.plot = ep.overview
          if (ep.still_path) {
            item.cover = `https://image.tmdb.org/t/p/w500${ep.still_path}`
          }
        }
        item.season = s
        item.episode = e
      } catch {
        /* 单集失败不影响主流程 */
      }
    }
  }
  return { ok: true, low: score < 0.6 }
}

async function scrapeDiscogs(ctx: ScrapeContext, item: MediaItem) {
  const token = (ctx.settings.media_discogs_token || "").trim()
  if (!token) return false
  const raw = (ctx.settings.media_discogs_api_url || "https://api.discogs.com").trim()
  const api = raw.replace(/\/+$/, "")
  const q = `${item.album_artist || ""} ${item.album_name || cleanName(item.file_name)}`.trim()
  if (!q) return false

  const headers = { Authorization: `Discogs token=${token}` }
  const res = await jsonFetch(
    `${api}/database/search?q=${encodeURIComponent(q)}&type=release&per_page=3`,
    { headers },
  )
  const hit = (res?.results || [])[0]
  if (!hit) return false

  // Discogs 搜索返回的是**发行版/专辑**标题。单曲条目已有 ID3 标题时必须保留，
  // 否则整张专辑的歌会被写成同一个名字，在 Subsonic/Emby 里无法区分。
  if (item.is_folder) item.scraped_name = hit.title || item.scraped_name
  item.cover = hit.cover_image || hit.thumb || item.cover
  if (hit.year) item.release_date = `${hit.year}-01-01`
  if (hit.genre?.length) item.genre = hit.genre.join(",")
  if (hit.style?.length) {
    item.genre = [item.genre, ...hit.style].filter(Boolean).join(",")
  }
  item.external_id = String(hit.id || "")
  item.scraper_source = "discogs"

  // release detail：拿到 artists / label / tracklist
  if (hit.id && (!item.album_artist || !item.publisher)) {
    try {
      const detail = await jsonFetch(`${api}/releases/${hit.id}`, { headers })
      const artists = (detail.artists || [])
        .map((a: any) => String(a.name || "").replace(/\s*\(\d+\)$/, ""))
        .filter(Boolean)
      if (artists.length && !item.album_artist) {
        item.album_artist = artists.join(", ")
      }
      if (artists.length && !item.authors) {
        item.authors = JSON.stringify(artists)
      }
      const label = (detail.labels || [])[0]?.name
      if (label && !item.publisher) item.publisher = label
      if (detail.year) item.release_date = `${detail.year}-01-01`
      if (!item.album_name && detail.title) item.album_name = detail.title
    } catch {
      /* detail 失败可接受 */
    }
  }
  return true
}

async function scrapeGoogleBooks(ctx: ScrapeContext, item: MediaItem) {
  const key = (ctx.settings.media_google_books_key || "").trim()
  const q = encodeURIComponent(
    parseMediaTitle(item.scraped_name || item.file_name).primary,
  )
  const url = `https://www.googleapis.com/books/v1/volumes?maxResults=3&printType=books&langRestrict=${encodeURIComponent(lang(ctx.settings))}&q=${q}${key ? `&key=${encodeURIComponent(key)}` : ""}`
  const res = await jsonFetch(url)
  const items: any[] = Array.isArray(res?.items) ? res.items : []
  if (items.length === 0) return false

  let best: any = null
  let bestScore = 0
  for (const it of items.slice(0, 3)) {
    const v = it?.volumeInfo || {}
    const score = similarity(item.file_name, v.title || "")
    if (score > bestScore) {
      bestScore = score
      best = it
    }
  }
  if (!best || bestScore < 0.3) return false
  const v = best.volumeInfo || {}
  item.scraped_name = v.title || item.scraped_name
  item.authors = (v.authors || []).join(",") || item.authors
  item.description = v.description || item.description
  item.plot = v.description || item.plot
  item.publisher = v.publisher || item.publisher
  item.release_date = v.publishedDate || item.release_date
  item.genre = (v.categories || []).join(",") || item.genre
  item.isbn =
    (v.industryIdentifiers || []).find((x: any) => x.type === "ISBN_13")
      ?.identifier ||
    (v.industryIdentifiers || [])[0]?.identifier ||
    item.isbn
  item.external_id = best.id || item.external_id
  item.scraper_source = "google"
  const thumb = v.imageLinks?.thumbnail || v.imageLinks?.smallThumbnail
  if (thumb) item.cover = String(thumb).replace("http://", "https://")
  return true
}

async function scrapeOpenLibrary(ctx: ScrapeContext, item: MediaItem) {
  const q = encodeURIComponent(
    parseMediaTitle(item.scraped_name || item.file_name).primary,
  )
  const res = await jsonFetch(
    `https://openlibrary.org/search.json?q=${q}&limit=3`,
  )
  const docs: any[] = Array.isArray(res?.docs) ? res.docs : []
  if (docs.length === 0) return false
  let best: any = null
  let bestScore = 0
  for (const d of docs) {
    const score = similarity(item.file_name, d.title || "")
    if (score > bestScore) {
      bestScore = score
      best = d
    }
  }
  if (!best || bestScore < 0.3) return false
  item.scraped_name = best.title || item.scraped_name
  item.authors = (best.author_name || []).slice(0, 3).join(",") || item.authors
  item.publisher = (best.publisher || [])[0] || item.publisher
  item.release_date = best.first_publish_year
    ? `${best.first_publish_year}-01-01`
    : item.release_date
  item.genre = (best.subject || []).slice(0, 3).join(",") || item.genre
  item.external_id = best.key || item.external_id
  item.scraper_source = "openlibrary"
  if (best.cover_i) {
    item.cover = `https://covers.openlibrary.org/b/id/${best.cover_i}-L.jpg`
  }
  return true
}

const stripTags = (html: string) => html.replace(/<[^>]+>/g, "").trim()

async function scrapeDouban(ctx: ScrapeContext, item: MediaItem) {
  const q = encodeURIComponent(
    parseMediaTitle(item.scraped_name || item.file_name).primary,
  )
  // 豆瓣搜索分类：1001 书籍 / 1002 电影。旧实现一律用 1002 搜书，
  // 结果里全是同名电影，解析出的「作者/出版社/ISBN」自然为空。
  const cat = item.media_type === "book" ? 1001 : 1002
  const res = await fetch(`https://www.douban.com/search?cat=${cat}&q=${q}`, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122 Safari/537.36",
      Accept: "text/html",
    },
    signal: AbortSignal.timeout(20_000),
  })
  if (!res.ok) return false
  let html = await res.text()
  if (html.length > 2 * 1024 * 1024) html = html.slice(0, 2 * 1024 * 1024)

  const title = html.match(/<a[^>]*class="title"[^>]*>([\s\S]*?)<\/a>/i)?.[1]
  const cover = html.match(/<img[^>]+src="(https:\/\/[^"]+)"[^>]*>/i)?.[1]
  const rating = html.match(/<span class="rating_nums">([\d.]+)<\/span>/i)?.[1]
  const info = html.match(/<div class="subject-cast">([\s\S]*?)<\/div>/i)?.[1]
  const abstract = html.match(/<p>([\s\S]*?)<\/p>/i)?.[1]
  if (!title && !cover) return false

  if (title) item.scraped_name = stripTags(title) || item.scraped_name
  if (cover) item.cover = cover.replace(/\/s\//, "/l/")
  if (rating) item.rating = Number(rating) || item.rating
  if (abstract) {
    const text = stripTags(abstract)
    item.plot = text || item.plot
    item.description = text || item.description
  }
  if (info) {
    const text = stripTags(info)
    // 豆瓣格式：作者: xxx / 出版社: xxx / 出版年: 2020-1 / ISBN: xxx
    const part = (label: string) => {
      const m = text.match(new RegExp(`${label}[:：]\\s*([^/]+)`))
      return m ? m[1].trim() : ""
    }
    const author = part("作者")
    if (author) item.authors = author
    const publisher = part("出版社")
    if (publisher) item.publisher = publisher
    // 豆瓣电影条目的字段是「导演 / 主演 / 年份 / 类型」，与书籍不同
    const director = part("导演")
    const actors = part("主演")
    const cast = [director, actors].filter(Boolean).join(",").trim()
    if (cast) item.authors = cast
    const genre = part("类型")
    if (genre) item.genre = genre.replace(/\s*\/\s*/g, ",")
    const year = part("出版年") || part("年份")
    const ym = year.match(/(\d{4})/)
    if (ym) item.release_date = `${ym[1]}-01-01`
    const isbn = part("ISBN")
    if (isbn) item.isbn = isbn
  }
  item.scraper_source = "douban"
  return true
}

/** 图片：原图缓存 + EXIF 拍摄日期（无法缩放，语义上等同 runtime 缩略图） */
async function scrapeImage(ctx: ScrapeContext, item: MediaItem): Promise<boolean> {
  const path = `${item.folder_path.replace(/\/+$/, "")}/${item.file_name}`
  const head = await readFileRange(path, 0, 256 * 1024, { env: ctx.env })
  if (!head || head.length === 0) return false
  const mime = sniffImageMime(head)
  if (!mime) return false

  item.mime_type = mime
  if (!item.cover && item.file_size > 0 && item.file_size <= 8 * 1024 * 1024) {
    const full = await readFileRange(path, 0, item.file_size, { env: ctx.env })
    if (full) {
      const stored = await persistCover(ctx.env, full, ctx.thumb)
      if (stored.cover) {
        item.cover = stored.cover
        item.thumb = stored.thumb
        item.thumb_mime = stored.thumb_mime
      }
    }
  }
  if (!item.release_date) {
    const exif = parseJpegExifDate(head)
    if (exif) item.release_date = exif
  }
  item.scraper_source = item.scraper_source || "local"
  return true
}

/** 音乐：ID3/Vorbis + .lrc 本地兜底（只填空字段） */
async function fillMusicFromLocal(ctx: ScrapeContext, item: MediaItem) {
  const folder = item.folder_path.replace(/\/+$/, "") || "/"
  let audioPath = `${folder}/${item.file_name}`
  if (item.is_folder) {
    try {
      const eps = JSON.parse(item.episodes || "[]")
      if (Array.isArray(eps) && eps[0]?.file_name) {
        audioPath = `${folder}/${item.file_name}/${eps[0].file_name}`
      }
    } catch {
      /* ignore */
    }
  }
  const ext = extOf(audioPath)
  const head = await readFileRange(audioPath, 0, 2 * 1024 * 1024, {
    env: ctx.env,
  })
  const size = item.file_size || 0
  let tail: Uint8Array | null = null
  if (size > 2 * 1024 * 1024) {
    tail = await readFileRange(audioPath, size - 128, 128, { env: ctx.env })
  } else if (head && head.length >= 128) {
    tail = head.subarray(head.length - 128)
  }
  const tag = parseMusicTags(ext, head, tail)

  if (!item.album_name && tag.album) item.album_name = tag.album
  if (!item.album_artist) {
    item.album_artist = tag.albumArtist || tag.artist || ""
  }
  if (!item.scraped_name && tag.title) item.scraped_name = tag.title
  if (!item.track_number && tag.trackNumber) item.track_number = tag.trackNumber
  if (!item.release_date && tag.year) item.release_date = `${tag.year}-01-01`
  if (!item.genre && tag.genre) item.genre = tag.genre
  if (!item.authors && tag.artist) item.authors = JSON.stringify([tag.artist])
  if (!item.duration && tag.duration) item.duration = tag.duration
  if (!item.cover && tag.coverData) {
    const stored = await persistCover(ctx.env, tag.coverData, ctx.thumb)
    if (stored.cover) {
      item.cover = stored.cover
      item.thumb = stored.thumb
      item.thumb_mime = stored.thumb_mime
    }
  }

  if (!item.lyrics) {
    const lrcPath = audioPath.replace(/\.[^.]+$/, ".lrc")
    const lrc = await readFileRange(lrcPath, 0, 512 * 1024, { env: ctx.env })
    if (lrc && lrc.length > 0) {
      try {
        item.lyrics = normalizeLyrics(new TextDecoder().decode(lrc))
      } catch {
        /* ignore */
      }
    }
    if (!item.lyrics && tag.lyrics) item.lyrics = normalizeLyrics(tag.lyrics)
  }
  return tag
}

/** 书籍本地封面：EPUB / CBZ / PDF */
async function fillBookCoverFromLocal(ctx: ScrapeContext, item: MediaItem) {
  if (item.cover) return
  const ext = extOf(item.file_name)
  if (ext !== "epub" && ext !== "cbz" && ext !== "pdf") return
  const path = `${item.folder_path.replace(/\/+$/, "")}/${item.file_name}`
  const data = await readFileRange(path, 0, 16 * 1024 * 1024, { env: ctx.env })
  if (!data) return
  const found =
    ext === "epub"
      ? await extractEpubCover(data)
      : ext === "cbz"
        ? await extractCbzCover(data)
        : await extractPdfCover(data)
  if (!found) return
  const stored = await persistCover(ctx.env, found.data, ctx.thumb)
  if (stored.cover) {
    item.cover = stored.cover
    item.thumb = stored.thumb
    item.thumb_mime = stored.thumb_mime
  }
}

/** 远程封面下载到本地（media_download_cover） */
async function maybeDownloadCover(ctx: ScrapeContext, item: MediaItem) {
  if (!settingBool(ctx.settings, "media_download_cover", false)) return
  if (!/^https?:\/\//i.test(item.cover || "")) return
  try {
    const res = await fetch(item.cover, {
      headers: { "User-Agent": "OpenList-Media/1.0" },
      signal: AbortSignal.timeout(20_000),
    })
    if (!res.ok) return
    const buf = new Uint8Array(await res.arrayBuffer())
    if (buf.length === 0 || buf.length > 8 * 1024 * 1024) return
    const mime = sniffImageMime(buf)
    if (!mime) return
    const stored = await persistCover(ctx.env, buf, ctx.thumb)
    if (stored.cover) {
      item.cover = stored.cover
      item.thumb = stored.thumb
      item.thumb_mime = stored.thumb_mime
    }
  } catch (e: any) {
    console.warn("[media] download cover failed:", e?.message || e)
  }
}

export interface ScrapeOutcome {
  ok: boolean
  low: boolean
}

export async function scrapeItem(
  ctx: ScrapeContext,
  item: MediaItem,
): Promise<ScrapeOutcome> {
  try {
    if (item.media_type === "video") {
      const res = await scrapeTmdb(ctx, item)
      if (res.ok) {
        await maybeDownloadCover(ctx, item)
        return res
      }
      // TMDB 没命中（未配 key、中文片名、冷门片）时用豆瓣兜底：
      // Go 的视频刮削同样是 TMDB + 豆瓣双源，只挂 TMDB 会导致国产片全灭。
      try {
        const ok = await scrapeDouban(ctx, item)
        if (ok) {
          await maybeDownloadCover(ctx, item)
          return { ok: true, low: true }
        }
      } catch (e: any) {
        console.warn("[media] douban fallback failed:", e?.message || e)
      }
      return { ok: false, low: false }
    }

    if (item.media_type === "music") {
      const tag = await fillMusicFromLocal(ctx, item)
      let ok = false
      try {
        ok = await scrapeDiscogs(ctx, item)
      } catch (e: any) {
        console.warn("[media] discogs failed:", e?.message || e)
      }
      await maybeDownloadCover(ctx, item)
      const localHit = !!(tag.album || tag.artist || tag.title)
      return { ok: ok || localHit, low: !ok && localHit }
    }

    if (item.media_type === "book") {
      const source = (ctx.settings.media_book_source || "douban").toLowerCase()
      let ok = false
      try {
        if (source === "google") ok = await scrapeGoogleBooks(ctx, item)
        else if (source === "openlibrary") ok = await scrapeOpenLibrary(ctx, item)
        else ok = await scrapeDouban(ctx, item)
        if (!ok && source !== "google") ok = await scrapeGoogleBooks(ctx, item)
        if (!ok && source !== "openlibrary") ok = await scrapeOpenLibrary(ctx, item)
      } catch (e: any) {
        console.warn("[media] book scrape failed:", e?.message || e)
      }
      if (ok) await maybeDownloadCover(ctx, item)
      await fillBookCoverFromLocal(ctx, item)
      return { ok: ok || !!item.cover, low: !ok && !!item.cover }
    }

    if (item.media_type === "image") {
      return { ok: await scrapeImage(ctx, item), low: false }
    }
  } catch (e: any) {
    console.warn(`[media] scrape item ${item.id} failed:`, e?.message || e)
  }
  return { ok: false, low: false }
}

export interface ScrapeResult {
  scraped: number
  total: number
  hit: number
  low_confidence: number
  no_match: number
}

/** 简单并发池 */
async function runPool<T>(
  items: T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<void>,
) {
  let cursor = 0
  const size = Math.max(1, Math.min(concurrency, items.length || 1))
  const runners = Array.from({ length: size }, async () => {
    for (;;) {
      const idx = cursor++
      if (idx >= items.length) return
      try {
        await worker(items[idx], idx)
      } catch (e: any) {
        console.warn("[media] scrape worker failed:", e?.message || e)
      }
    }
  })
  await Promise.all(runners)
}

export async function scrapeMedia(
  env: any,
  settings: Record<string, string>,
  type: MediaType,
  itemId = 0,
): Promise<ScrapeResult> {
  const db = await getMediaDb(env)
  const cfg = db.configs.find((c) => c.media_type === type)
  const concurrency = Math.max(
    1,
    Math.min(
      10,
      Number(cfg?.scrape_concurrency) ||
        Number(settings.media_scrape_concurrency) ||
        5,
    ),
  )
  const ctx: ScrapeContext = {
    env,
    settings,
    thumb: thumbOptionsOf(cfg),
  }

  const stats: ScrapeStats = {
    ...(statsMap.get(type) || emptyStats(type)),
    media_type: type,
    running: true,
    last_error: "",
    started_at: new Date().toISOString(),
    finished_at: "",
  }
  statsMap.set(type, stats)

  let list = db.items.filter((i) => i.media_type === type)
  if (itemId) {
    list = list.filter((i) => i.id === itemId)
  } else {
    // 只刮未刮削的条目（对齐 Go 的 GetUnscrappedItems）
    list = list.filter((i) => !i.scraped_at)
  }

  const pathsOfType = db.scan_paths.filter((p) => p.media_type === type)
  const enabledPaths = new Set(
    pathsOfType.filter((p) => p.enable_scrape !== false).map((p) => p.id),
  )
  // 只有「完全没有配置扫描路径」才不做限制；只要配置了路径，
  // 显式关闭刮削的路径就必须排除。旧实现把「空集」当作放行，
  // 于是把唯一路径的 enable_scrape 关掉反而触发整库刮削。
  list = list.filter(
    (i) => pathsOfType.length === 0 || enabledPaths.has(i.scan_path_id),
  )

  let scraped = 0
  let hit = 0
  let low = 0
  let noMatch = 0
  let sinceSave = 0

  try {
    await runPool(list, concurrency, async (item) => {
      stats.total_scraped += 1
      const outcome = await scrapeItem(ctx, item)
      if (outcome.ok) {
        item.updated_at = new Date().toISOString()
        // 本地兜底（ID3/lrc/EPUB 封面）不写 scraped_at，便于下次继续尝试远端刮削
        if (!outcome.low) item.scraped_at = new Date().toISOString()
        scraped += 1
        hit += 1
        if (outcome.low) low += 1
      } else {
        noMatch += 1
        // 本地兜底已经写入了内容：保留数据但不标记 scraped_at
        if (item.cover || item.lyrics || item.album_name || item.album_artist) {
          item.updated_at = new Date().toISOString()
        }
      }
      sinceSave += 1
      if (sinceSave >= 20) {
        sinceSave = 0
        await saveMediaDb(env, db)
      }
    })

    if (cfg) cfg.last_scrape_at = new Date().toISOString()
    await saveMediaDb(env, db)

    return {
      scraped,
      total: list.length,
      hit,
      low_confidence: low,
      no_match: noMatch,
    }
  } finally {
    // 保存失败（saveMediaDb 会抛错）也必须清掉运行态，否则该类型会永远
    // 卡在 "scrape already running"，存储恢复后也无法重试。
    stats.running = false
    stats.hit_count = stats.hit_count + hit
    stats.low_confidence_count = stats.low_confidence_count + low
    stats.no_match_count = stats.no_match_count + noMatch
    stats.finished_at = new Date().toISOString()
  }
}
