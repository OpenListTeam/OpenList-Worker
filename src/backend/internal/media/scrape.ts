/**
 * 媒体刮削（TMDB / Google Books / OpenLibrary / 豆瓣 / Discogs）。
 *
 * Worker 没有 ffprobe / ID3 库，音乐只按目录与文件名推断专辑/艺术家；
 * 影视、书籍使用外部 API。
 */

import type { MediaItem, MediaType } from "./model"
import { getMediaDb, saveMediaDb } from "./store"

interface ScrapeContext {
  env: any
  settings: Record<string, string>
}

const lang = (settings: Record<string, string>) =>
  settings.media_scrape_language || "zh-CN"

const cleanName = (item: MediaItem) => {
  let name = item.scraped_name || item.file_name || ""
  name = name.replace(/\.[^.]+$/, "")
  // 去掉常见压制组后缀与分辨率标记，提高搜索命中率
  name = name.replace(
    /[.\s_-]+(2160p|1080p|720p|480p|bluray|web-?dl|webrip|hdrip|remux|x26[45]|h26[45]|hevc|avc|aac|dts|truehd|atmos).*$/i,
    "",
  )
  return name.replace(/[._]/g, " ").trim()
}

const jsonFetch = async (url: string, init?: RequestInit) => {
  const res = await fetch(url, {
    ...init,
    headers: { Accept: "application/json", ...(init?.headers || {}) },
    signal: AbortSignal.timeout(20_000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

async function scrapeTmdb(ctx: ScrapeContext, item: MediaItem) {
  const key = (ctx.settings.media_tmdb_key || "").trim()
  if (!key) return false
  const api = (
    ctx.settings.media_tmdb_api_url || "https://api.themoviedb.org/3"
  ).replace(/\/+$/, "")
  const type = item.media_type === "video" ? "movie" : "tv"
  const query = encodeURIComponent(cleanName(item))
  const search = await jsonFetch(
    `${api}/search/${type}?api_key=${encodeURIComponent(key)}&language=${encodeURIComponent(lang(ctx.settings))}&query=${query}`,
  )
  const hit = search?.results?.[0]
  if (!hit) return false
  const detail = await jsonFetch(
    `${api}/${type}/${hit.id}?api_key=${encodeURIComponent(key)}&language=${encodeURIComponent(lang(ctx.settings))}&append_to_response=credits`,
  )
  item.scraped_name =
    detail.title || detail.name || hit.title || hit.name || item.scraped_name
  item.plot = detail.overview || ""
  item.description = detail.tagline || item.plot
  item.rating = Number(detail.vote_average) || 0
  item.release_date = detail.release_date || detail.first_air_date || ""
  item.genre = (detail.genres || []).map((g: any) => g.name).join(",")
  item.external_id = String(detail.id)
  item.scraper_source = "tmdb"
  item.cover = detail.poster_path
    ? `https://image.tmdb.org/t/p/w500${detail.poster_path}`
    : item.cover
  const cast = (detail.credits?.cast || []).slice(0, 8).map((c: any) => c.name)
  item.authors = cast.join(",")
  if (detail.number_of_seasons) item.season = detail.number_of_seasons
  return true
}

async function scrapeDiscogs(ctx: ScrapeContext, item: MediaItem) {
  const token = (ctx.settings.media_discogs_token || "").trim()
  if (!token) return false
  const api = (
    ctx.settings.media_discogs_api_url || "https://api.discogs.com"
  ).replace(/\/+$/, "")
  const q = encodeURIComponent(
    `${item.album_artist || ""} ${item.album_name || cleanName(item)}`.trim(),
  )
  const res = await jsonFetch(
    `${api}/database/search?q=${q}&type=release&per_page=1`,
    {
      headers: { Authorization: `Discogs token=${token}` },
    },
  )
  const hit = res?.results?.[0]
  if (!hit) return false
  item.scraped_name = hit.title || item.scraped_name
  item.cover = hit.cover_image || hit.thumb || item.cover
  item.release_date = hit.year ? `${hit.year}-01-01` : item.release_date
  item.genre = (hit.genre || []).join(",")
  item.scraper_source = "discogs"
  return true
}

async function scrapeGoogleBooks(ctx: ScrapeContext, item: MediaItem) {
  const key = (ctx.settings.media_google_books_key || "").trim()
  const q = encodeURIComponent(cleanName(item))
  const url = `https://www.googleapis.com/books/v1/volumes?maxResults=1&printType=books&langRestrict=${encodeURIComponent(lang(ctx.settings))}&q=${q}${key ? `&key=${encodeURIComponent(key)}` : ""}`
  const res = await jsonFetch(url)
  const v = res?.items?.[0]?.volumeInfo
  if (!v) return false
  item.scraped_name = v.title || item.scraped_name
  item.authors = (v.authors || []).join(",")
  item.description = v.description || ""
  item.plot = v.description || ""
  item.publisher = v.publisher || ""
  item.release_date = v.publishedDate || ""
  item.genre = (v.categories || []).join(",")
  item.isbn =
    (v.industryIdentifiers || []).find((x: any) => x.type === "ISBN_13")
      ?.identifier ||
    (v.industryIdentifiers || [])[0]?.identifier ||
    ""
  item.external_id = v.id || res.items[0].id
  item.scraper_source = "google"
  item.cover =
    v.imageLinks?.thumbnail?.replace("http://", "https://") || item.cover
  return true
}

async function scrapeOpenLibrary(ctx: ScrapeContext, item: MediaItem) {
  const q = encodeURIComponent(cleanName(item))
  const res = await jsonFetch(
    `https://openlibrary.org/search.json?q=${q}&limit=1`,
  )
  const doc = res?.docs?.[0]
  if (!doc) return false
  item.scraped_name = doc.title || item.scraped_name
  item.authors = (doc.author_name || []).slice(0, 3).join(",")
  item.publisher = (doc.publisher || [])[0] || ""
  item.release_date = doc.first_publish_year
    ? `${doc.first_publish_year}-01-01`
    : ""
  item.genre = (doc.subject || []).slice(0, 3).join(",")
  item.external_id = doc.key || ""
  item.scraper_source = "openlibrary"
  item.cover = doc.cover_i
    ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg`
    : item.cover
  return true
}

async function scrapeDouban(ctx: ScrapeContext, item: MediaItem) {
  const q = encodeURIComponent(cleanName(item))
  const res = await fetch(`https://www.douban.com/search?cat=1002&q=${q}`, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122 Safari/537.36",
    },
    signal: AbortSignal.timeout(20_000),
  })
  if (!res.ok) return false
  const html = await res.text()
  const title = html.match(/<a[^>]*class="title"[^>]*>([\s\S]*?)<\/a>/i)?.[1]
  const cover = html.match(/<img[^>]+src="(https:\/\/[^"]+)"/i)?.[1]
  if (!title && !cover) return false
  item.scraped_name = title?.replace(/<[^>]+>/g, "").trim() || item.scraped_name
  item.cover = cover || item.cover
  item.scraper_source = "douban"
  return true
}

export async function scrapeItem(ctx: ScrapeContext, item: MediaItem) {
  try {
    if (item.media_type === "video") {
      if (await scrapeTmdb(ctx, item)) return true
    } else if (item.media_type === "book") {
      const source = (ctx.settings.media_book_source || "douban").toLowerCase()
      if (source === "google" && (await scrapeGoogleBooks(ctx, item)))
        return true
      if (source === "openlibrary" && (await scrapeOpenLibrary(ctx, item)))
        return true
      if (await scrapeGoogleBooks(ctx, item)) return true
      if (await scrapeOpenLibrary(ctx, item)) return true
      if (await scrapeDouban(ctx, item)) return true
    } else if (item.media_type === "music") {
      if (await scrapeDiscogs(ctx, item)) return true
    }
  } catch (e: any) {
    console.warn(`[media] scrape item ${item.id} failed:`, e?.message || e)
  }
  return false
}

export async function scrapeMedia(
  env: any,
  settings: Record<string, string>,
  type: MediaType,
  itemId = 0,
) {
  const db = await getMediaDb(env)
  const list = db.items.filter(
    (i) => i.media_type === type && (!itemId || i.id === itemId),
  )
  let scraped = 0
  const ctx: ScrapeContext = { env, settings }
  for (const item of list) {
    if (await scrapeItem(ctx, item)) {
      item.updated_at = new Date().toISOString()
      scraped += 1
    }
  }
  await saveMediaDb(env, db)
  return { scraped, total: list.length }
}
