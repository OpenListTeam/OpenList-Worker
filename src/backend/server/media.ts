/**
 * 媒体库 HTTP API（对齐 Go 版 server/handles/media*.go）。
 *
 * 挂载：
 *   /api/fs/media/*        登录用户（访客受 base_path/meta 限制）
 *   /api/admin/media/*     管理员
 *   /api/public/media*     公开（状态 / 封面代理 / 缩略图）
 *   /api/auth/me/appkey/*  当前用户自助签发应用密钥
 */

import { Hono } from "hono"

import { getUserFromContext, getJwtSecret } from "./middlewares"
import { getNearestMeta, canAccess } from "../pkg/meta"
import { isAdmin, isWithinUserRoot, UserRole } from "../pkg/permission"
import { encodeDownloadPath } from "../pkg/path"
import { getSignPolicy, signDownloadPath } from "../pkg/sign"
import { isSafeUrl } from "../pkg/http"
import { encrypt, decrypt } from "../pkg/crypto"
import { getItem, putItem, readFileRange } from "../internal/op/storage"
import {
  baseNameOf,
  extOf,
  MEDIA_TYPES,
  mediaEnabled,
  mediaProtocolEnabled,
  PLAYED_RATIO,
  PLAYED_RESET_SECONDS,
  settingBool,
  ticksToSeconds,
  type EpisodeInfo,
  type MediaAppKey,
  type MediaItem,
  type MediaType,
  type MediaUserData,
} from "../internal/media/model"
import {
  allocateIds,
  ensureUserData,
  findItem,
  findScanPath,
  getConfig,
  getMediaDb,
  getSettingsMap,
  getUserData,
  invalidateMediaCache,
  isTypeEnabled,
  listFavorites,
  listResume,
  listScanPaths,
  nextId,
  queryItems,
  readThumb,
  repairItemScanPath,
  saveMediaDb,
} from "../internal/media/store"
import { getScanProgress, isScanRunning, scanMedia } from "../internal/media/scan"
import { getScrapeStats, isScrapeRunning, scrapeMedia } from "../internal/media/scrape"
import { generateStrmForType, renderStrmContent } from "../internal/media/strm"
import { resolveCoverUrl, thumbOptionsOf } from "../internal/media/thumb"
import { sniffImageMime } from "../internal/media/tag"
import {
  authFailed,
  authLockedFor,
  authSucceeded,
} from "../internal/media/ratelimit"

const ok = (c: any, data: any = null) =>
  c.json({ code: 200, message: "success", data })
const fail = (c: any, message: string, status = 400) =>
  c.json({ code: status, message, data: null }, status as any)

const originOf = (c: any) => new URL(c.req.url).origin

const sha256Hex = async (value: string) => {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  )
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
}

const randomToken = (prefix: string) => {
  const bytes = new Uint8Array(24)
  crypto.getRandomValues(bytes)
  return (
    prefix +
    Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
  )
}

const pathPrefixOf = (user: any) => {
  const base = String(user?.base_path || "/").replace(/\/+$/, "")
  return base === "" ? "/" : base
}

/** 对外输出：cover 的 thumb: 标记转成可访问 URL */
export const serializeItem = (item: MediaItem, origin: string) => ({
  ...item,
  cover: resolveCoverUrl(item.cover || "", origin),
})

export async function canAccessItem(env: any, user: any, item: MediaItem) {
  if (!user || item.hidden) return false
  const db = await getMediaDb(env)
  if (!isTypeEnabled(db, item.media_type)) return false
  if (!isWithinUserRoot(user, item.folder_path)) return false
  // 目录合并条目要检查到具体文件路径，避免仅凭父目录判断绕过 meta
  const target = `${item.folder_path.replace(/\/+$/, "")}/${item.file_name}`
  try {
    const meta = await getNearestMeta(target, env)
    return canAccess(user, meta, target, "")
  } catch {
    return true
  }
}

async function accessibleItems(env: any, user: any, items: MediaItem[]) {
  const out: MediaItem[] = []
  for (const item of items) {
    if (await canAccessItem(env, user, item)) out.push(item)
  }
  return out
}

/** 条目对应的实际文件路径（剧集取第 ep 集） */
export const itemPath = (item: MediaItem, ep?: number) => {
  const folder = item.folder_path.replace(/\/+$/, "") || ""
  let path = `${folder}/${item.file_name}`.replace(/\/+/g, "/")
  if (!item.episodes) return path
  try {
    const eps: EpisodeInfo[] = JSON.parse(item.episodes)
    if (!Array.isArray(eps) || eps.length === 0) return path
    const found =
      ep && ep > 0
        ? eps.find((e) => e.index === ep || e.index === Number(ep))
        : eps[0]
    if (found?.file_name) {
      path = `${folder}/${item.file_name}/${found.file_name}`.replace(/\/+/g, "/")
    }
  } catch {
    /* ignore */
  }
  return path
}

const mapUserData = (row: MediaUserData) => ({
  item_id: row.item_id,
  episode_index: row.episode_index,
  played: row.played,
  play_count: row.play_count,
  is_favorite: row.is_favorite,
  position_ticks: row.position_ticks,
  duration_ticks: row.duration_ticks,
  rating: row.rating || 0,
  last_played_at: row.last_played_at || null,
  updated_at: row.updated_at,
})

/** 进度写入语义（对齐 Go SaveMediaProgress） */
export function applyProgress(
  row: MediaUserData,
  positionSeconds: number,
  durationSeconds: number,
  playedFlag: boolean,
) {
  const now = new Date().toISOString()
  const pos = Math.max(0, Number(positionSeconds) || 0)
  const dur = Math.max(0, Number(durationSeconds) || 0)
  row.position_ticks = Math.round(
    (dur > 0 ? Math.min(pos, dur) : pos) * 10_000_000,
  )
  row.duration_ticks = Math.round(dur * 10_000_000)
  let finished = !!playedFlag
  if (dur > 0 && pos / dur >= PLAYED_RATIO) finished = true
  if (finished && !row.played) {
    row.played = true
    row.play_count += 1
  }
  // 重新播放：进度很小且此前已看 → 清除已看标记
  if (!finished && pos < PLAYED_RESET_SECONDS && row.played) {
    row.played = false
  }
  row.last_played_at = now
  row.updated_at = now
}

// ==================== 用户侧路由 ====================

export const mediaRouter = new Hono()

mediaRouter.use("*", async (c, next) => {
  const settings = await getSettingsMap(c.env)
  if (!mediaEnabled(settings)) return c.notFound()
  await next()
})

mediaRouter.get("/list", async (c) => {
  const user = await getUserFromContext(c)
  if (!user) return fail(c, "Guest user is disabled, login please", 401)
  const type = (c.req.query("media_type") || "") as MediaType
  if (!type || !MEDIA_TYPES.includes(type)) return fail(c, "invalid media_type")
  const db = await getMediaDb(c.env)
  if (!isTypeEnabled(db, type)) return ok(c, { content: [], total: 0 })
  const q = {
    media_type: type,
    scan_path_id: Number(c.req.query("scan_path_id") || 0) || undefined,
    folder_path: c.req.query("folder_path") || undefined,
    keyword: c.req.query("keyword") || undefined,
    type_tag: c.req.query("type_tag") || undefined,
    content_tag: c.req.query("content_tag") || undefined,
    path_prefix: pathPrefixOf(user),
    hidden: false,
    order_by: c.req.query("order_by") || "name",
    order_dir: c.req.query("order_dir") || "asc",
    page: Number(c.req.query("page") || 1),
    page_size: Math.min(Number(c.req.query("page_size") || 40), 200),
  }
  const { content, total } = queryItems(db, q)
  const filtered = await accessibleItems(c.env, user, content)
  const origin = originOf(c)
  return ok(c, {
    content: filtered.map((i) => serializeItem(i, origin)),
    total,
  })
})

mediaRouter.get("/item/:id", async (c) => {
  const user = await getUserFromContext(c)
  if (!user) return fail(c, "Guest user is disabled, login please", 401)
  const db = await getMediaDb(c.env)
  const item = findItem(db, Number(c.req.param("id")))
  if (!item || !(await canAccessItem(c.env, user, item))) {
    return fail(c, "资源不存在", 404)
  }
  return ok(c, serializeItem(item, originOf(c)))
})

mediaRouter.get("/albums", async (c) => {
  const user = await getUserFromContext(c)
  if (!user) return fail(c, "Guest user is disabled, login please", 401)
  const db = await getMediaDb(c.env)
  if (!isTypeEnabled(db, "music")) return ok(c, { content: [], total: 0 })
  const keyword = (c.req.query("keyword") || "").toLowerCase()
  const scanPathId = Number(c.req.query("scan_path_id") || 0)
  const items = db.items.filter(
    (i) =>
      i.media_type === "music" &&
      (!scanPathId || i.scan_path_id === scanPathId) &&
      (!keyword ||
        i.file_name.toLowerCase().includes(keyword) ||
        (i.scraped_name || "").toLowerCase().includes(keyword) ||
        (i.album_name || "").toLowerCase().includes(keyword)),
  )
  const map = new Map<string, any>()
  for (const item of items) {
    const album = item.album_name || "未知专辑"
    const artist = item.album_artist || "未知艺术家"
    const key = `${album}\u0000${artist}`
    let row = map.get(key)
    if (!row) {
      // 每个专辑只做一次 meta 校验（逐曲校验在上万首时会明显超时）
      if (!(await canAccessItem(c.env, user, item))) continue
      row = {
        album_name: album,
        album_artist: artist,
        cover: resolveCoverUrl(item.cover || "", originOf(c)),
        release_date: item.release_date,
        genre: item.genre,
        track_count: 0,
        duration: 0,
      }
      map.set(key, row)
    }
    row.track_count += 1
    row.duration += item.duration || 0
    if (!row.cover && item.cover) {
      row.cover = resolveCoverUrl(item.cover, originOf(c))
    }
  }
  const page = Math.max(1, Number(c.req.query("page") || 1))
  const pageSize = Math.min(Number(c.req.query("page_size") || 40), 200)
  const all = Array.from(map.values()).sort((a, b) =>
    String(a.album_name).localeCompare(String(b.album_name), "zh-CN"),
  )
  return ok(c, {
    content: all.slice((page - 1) * pageSize, page * pageSize),
    total: all.length,
  })
})

mediaRouter.get("/album", async (c) => {
  const user = await getUserFromContext(c)
  if (!user) return fail(c, "Guest user is disabled, login please", 401)
  const db = await getMediaDb(c.env)
  const album = c.req.query("album_name") || ""
  const artist = c.req.query("album_artist") || ""
  const list = await accessibleItems(
    c.env,
    user,
    db.items.filter(
      (i) =>
        i.media_type === "music" &&
        i.album_name === album &&
        (!artist || i.album_artist === artist),
    ),
  )
  list.sort(
    (a, b) =>
      a.track_number - b.track_number || a.file_name.localeCompare(b.file_name),
  )
  const origin = originOf(c)
  return ok(c, list.map((i) => serializeItem(i, origin)))
})

mediaRouter.get("/folders", async (c) => {
  const user = await getUserFromContext(c)
  if (!user) return fail(c, "Guest user is disabled, login please", 401)
  const type = (c.req.query("media_type") || "") as MediaType
  const db = await getMediaDb(c.env)
  if (type && !isTypeEnabled(db, type)) return ok(c, [])
  const set = new Set<string>()
  for (const item of db.items) {
    if (type && item.media_type !== type) continue
    if (item.hidden) continue
    if (!isWithinUserRoot(user, item.folder_path)) continue
    set.add(item.folder_path)
  }
  // 只对去重后的目录做 meta 校验（逐条校验在上万条时会超时）
  const out: string[] = []
  for (const folder of set) {
    try {
      const meta = await getNearestMeta(folder, c.env)
      if (canAccess(user, meta, folder, "")) out.push(folder)
    } catch {
      out.push(folder)
    }
  }
  return ok(c, out.sort())
})

mediaRouter.get("/scan_paths", async (c) => {
  const user = await getUserFromContext(c)
  if (!user) return fail(c, "Guest user is disabled, login please", 401)
  const type = c.req.query("media_type") as MediaType | undefined
  const db = await getMediaDb(c.env)
  const paths = listScanPaths(db, type).filter((p) =>
    isWithinUserRoot(user, p.path),
  )
  return ok(c, paths)
})

mediaRouter.get("/userdata", async (c) => {
  const user = await getUserFromContext(c)
  if (!user?.id) return fail(c, "Guest user is disabled, login please", 401)
  const db = await getMediaDb(c.env)
  const ids = (c.req.query("ids") || "")
    .split(",")
    .map((s) => Number(s))
    .filter((n) => Number.isFinite(n) && n > 0)
    .slice(0, 500)
  const rows = db.user_data
    .filter((d) => d.user_id === user.id && ids.includes(d.item_id))
    .map(mapUserData)
  return ok(c, rows)
})

mediaRouter.get("/progress", async (c) => {
  const user = await getUserFromContext(c)
  if (!user?.id) return fail(c, "Guest user is disabled, login please", 401)
  const db = await getMediaDb(c.env)
  const itemId = Number(c.req.query("item_id") || 0)
  if (!itemId) return ok(c, null)
  const item = findItem(db, itemId)
  if (!item || !(await canAccessItem(c.env, user, item))) return ok(c, null)
  const row = getUserData(
    db,
    user.id,
    itemId,
    Number(c.req.query("episode_index") || 0),
  )
  return ok(c, row ? mapUserData(row) : null)
})

mediaRouter.post("/progress", async (c) => {
  const user = await getUserFromContext(c)
  if (!user?.id) return fail(c, "Guest user is disabled, login please", 401)
  const body = await c.req.json().catch(() => ({}))
  const db = await getMediaDb(c.env)
  const item = findItem(db, Number(body.item_id))
  if (!item || !(await canAccessItem(c.env, user, item))) {
    return fail(c, "资源不存在", 404)
  }
  const row = ensureUserData(
    db,
    user.id,
    item.id,
    Number(body.episode_index) || 0,
  )
  applyProgress(
    row,
    Number(body.position) || 0,
    Number(body.duration) || 0,
    !!body.played,
  )
  await saveMediaDb(c.env, db)
  return ok(c, mapUserData(row))
})

mediaRouter.post("/favorite", async (c) => {
  const user = await getUserFromContext(c)
  if (!user?.id) return fail(c, "Guest user is disabled, login please", 401)
  const body = await c.req.json().catch(() => ({}))
  const db = await getMediaDb(c.env)
  const item = findItem(db, Number(body.item_id))
  if (!item || !(await canAccessItem(c.env, user, item))) {
    return fail(c, "资源不存在", 404)
  }
  const row = ensureUserData(
    db,
    user.id,
    item.id,
    Number(body.episode_index) || 0,
  )
  row.is_favorite = !!body.favorite
  row.updated_at = new Date().toISOString()
  await saveMediaDb(c.env, db)
  return ok(c, { favorite: row.is_favorite })
})

mediaRouter.get("/favorites", async (c) => {
  const user = await getUserFromContext(c)
  if (!user?.id) return fail(c, "Guest user is disabled, login please", 401)
  const type = c.req.query("media_type") as MediaType | undefined
  const db = await getMediaDb(c.env)
  // 对齐 Go：只返回条目级收藏（episode_index === 0）
  const ids = listFavorites(db, user.id)
    .filter((d) => d.episode_index === 0)
    .map((d) => d.item_id)
  const page = Math.max(1, Number(c.req.query("page") || 1))
  const size = Math.min(Number(c.req.query("page_size") || 20), 100)
  const filtered = await accessibleItems(
    c.env,
    user,
    db.items.filter(
      (i) => ids.includes(i.id) && (!type || i.media_type === type),
    ),
  )
  filtered.sort((a, b) => a.id - b.id)
  const origin = originOf(c)
  return ok(c, {
    content: filtered
      .slice((page - 1) * size, page * size)
      .map((i) => serializeItem(i, origin)),
    total: filtered.length,
  })
})

mediaRouter.get("/resume", async (c) => {
  const user = await getUserFromContext(c)
  if (!user?.id) return fail(c, "Guest user is disabled, login please", 401)
  const type = c.req.query("media_type") as MediaType | undefined
  const limit = Math.min(Number(c.req.query("limit") || 20), 100)
  const db = await getMediaDb(c.env)
  const rows = listResume(db, user.id, 200)
  const out: any[] = []
  for (const row of rows) {
    const item = findItem(db, row.item_id)
    if (!item || (type && item.media_type !== type)) continue
    if (!(await canAccessItem(c.env, user, item))) continue
    out.push({
      ...serializeItem(item, originOf(c)),
      position_ticks: row.position_ticks,
      episode_index: row.episode_index,
    })
    if (out.length >= limit) break
  }
  return ok(c, out)
})

mediaRouter.get("/stream_url", async (c) => {
  const user = await getUserFromContext(c)
  if (!user) return fail(c, "Guest user is disabled, login please", 401)
  const db = await getMediaDb(c.env)
  const id = Number(c.req.query("id") || 0)
  const rawPath = c.req.query("path") || ""
  const episode = Number(c.req.query("episode") || 0)
  let path = rawPath
  let name = baseNameOf(rawPath)
  if (id) {
    const item = findItem(db, id)
    if (!item || !(await canAccessItem(c.env, user, item))) {
      return fail(c, "资源不存在", 404)
    }
    path = itemPath(item, episode)
    name = item.file_name
  }
  if (!path || !isWithinUserRoot(user, path)) return fail(c, "invalid path")
  if (!(await pathReadable(c.env, user, path))) {
    return fail(c, "资源不存在", 404)
  }
  const policy = await getSignPolicy(c)
  const expires = policy.expiresIn
  const sign = await signDownloadPath(c, path, expires)
  const origin = originOf(c)
  const url = `${origin}/d${encodeDownloadPath(path)}?sign=${encodeURIComponent(sign)}`
  return ok(c, {
    url,
    path,
    name: name || baseNameOf(path),
    proxied: `${origin}/p${encodeDownloadPath(path)}?sign=${encodeURIComponent(sign)}`,
  })
})

mediaRouter.get("/strm", async (c) => {
  const user = await getUserFromContext(c)
  if (!user) return fail(c, "Guest user is disabled, login please", 401)
  const db = await getMediaDb(c.env)
  const item = findItem(db, Number(c.req.query("id") || 0))
  if (!item || !(await canAccessItem(c.env, user, item))) {
    return fail(c, "资源不存在", 404)
  }
  const settings = await getSettingsMap(c.env)
  const ep = Number(c.req.query("episode") || 0)
  const path = itemPath(item, ep)
  const content = await renderStrmContent(
    c.env,
    settings.media_strm_template || "{site_url}/d{path}?sign={sign}",
    originOf(c),
    path,
  )
  const title =
    item.video_type === "tv" && ep > 0
      ? `${item.scraped_name || item.file_name} S${String(item.season || 1).padStart(2, "0")}E${String(ep).padStart(2, "0")}.strm`
      : `${item.scraped_name || baseNameOf(item.file_name)}.strm`
  c.header("Content-Type", "text/plain; charset=utf-8")
  c.header(
    "Content-Disposition",
    `attachment; filename*=UTF-8''${encodeURIComponent(title)}`,
  )
  return c.body(content)
})

/** 单文件路径的 meta 可读性（/stream_url?path= 分支） */
async function pathReadable(env: any, user: any, path: string) {
  try {
    const meta = await getNearestMeta(path, env)
    return canAccess(user, meta, path, "")
  } catch {
    return true
  }
}

// ==================== 管理端路由 ====================

export const mediaAdminRouter = new Hono()

mediaAdminRouter.use("*", async (c, next) => {
  const user = await getUserFromContext(c)
  if (!isAdmin(user)) return fail(c, "Permission denied", 403)
  await next()
})

mediaAdminRouter.get("/config/list", async (c) => {
  const db = await getMediaDb(c.env)
  return ok(c, db.configs)
})

mediaAdminRouter.post("/config/save", async (c) => {
  const body = await c.req.json().catch(() => ({}))
  const type = body.media_type as MediaType
  if (!MEDIA_TYPES.includes(type)) return fail(c, "invalid media_type")
  const db = await getMediaDb(c.env)
  const cfg = getConfig(db, type)
  for (const key of [
    "enabled",
    "thumbnail_mode",
    "thumbnail_path",
    "store_thumbnail",
    "scrape_concurrency",
  ] as const) {
    if (body[key] !== undefined) (cfg as any)[key] = body[key]
  }
  if (body.scraper_config !== undefined) {
    cfg.scraper_config =
      typeof body.scraper_config === "string"
        ? body.scraper_config
        : JSON.stringify(body.scraper_config || {})
  }
  cfg.updated_at = new Date().toISOString()
  await saveMediaDb(c.env, db)
  return ok(c)
})

mediaAdminRouter.get("/scan_paths", async (c) => {
  const db = await getMediaDb(c.env)
  return ok(
    c,
    listScanPaths(db, c.req.query("media_type") as MediaType | undefined),
  )
})

mediaAdminRouter.post("/scan_paths/create", async (c) => {
  const body = await c.req.json().catch(() => ({}))
  const type = body.media_type as MediaType
  if (!MEDIA_TYPES.includes(type) || !String(body.path || "").startsWith("/")) {
    return fail(c, "invalid scan path")
  }
  const db = await getMediaDb(c.env)
  const now = new Date().toISOString()
  const sp = {
    id: nextId(db),
    media_type: type,
    name: body.name || body.path,
    path: body.path,
    type_tag: body.type_tag || "",
    content_tags: body.content_tags || "",
    created_at: now,
    updated_at: now,
    path_merge: !!body.path_merge,
    enable_scrape: body.enable_scrape === undefined ? true : !!body.enable_scrape,
    last_scan_at: null,
  }
  db.scan_paths.push(sp)
  await saveMediaDb(c.env, db)
  return ok(c, sp)
})

mediaAdminRouter.post("/scan_paths/update", async (c) => {
  const body = await c.req.json().catch(() => ({}))
  const db = await getMediaDb(c.env)
  const sp = findScanPath(db, Number(body.id))
  if (!sp) return fail(c, "not found", 404)
  for (const key of [
    "name",
    "path",
    "type_tag",
    "content_tags",
    "path_merge",
    "enable_scrape",
  ] as const) {
    if (body[key] !== undefined) (sp as any)[key] = body[key]
  }
  sp.updated_at = new Date().toISOString()
  await saveMediaDb(c.env, db)
  return ok(c)
})

mediaAdminRouter.post("/scan_paths/delete", async (c) => {
  const id = Number(c.req.query("id") || 0)
  const db = await getMediaDb(c.env)
  db.scan_paths = db.scan_paths.filter((p) => p.id !== id)
  db.items = db.items.filter((i) => i.scan_path_id !== id)
  repairItemScanPath(db)
  await saveMediaDb(c.env, db)
  return ok(c)
})

mediaAdminRouter.post("/scan_paths/clear", async (c) => {
  const id = Number(c.req.query("id") || 0)
  const db = await getMediaDb(c.env)
  db.items = db.items.filter((i) => i.scan_path_id !== id)
  repairItemScanPath(db)
  await saveMediaDb(c.env, db)
  return ok(c)
})

mediaAdminRouter.get("/items", async (c) => {
  const db = await getMediaDb(c.env)
  const result = queryItems(db, {
    media_type: (c.req.query("media_type") || undefined) as
      | MediaType
      | undefined,
    scan_path_id: Number(c.req.query("scan_path_id") || 0) || undefined,
    keyword: c.req.query("keyword") || undefined,
    order_by: c.req.query("order_by") || "name",
    order_dir: c.req.query("order_dir") || "asc",
    page: Number(c.req.query("page") || 1),
    page_size: Math.min(Number(c.req.query("page_size") || 20), 500),
  })
  const origin = originOf(c)
  return ok(c, {
    ...result,
    content: result.content.map((i) => serializeItem(i, origin)),
  })
})

mediaAdminRouter.post("/items/update", async (c) => {
  const body = await c.req.json().catch(() => ({}))
  const db = await getMediaDb(c.env)
  const item = findItem(db, Number(body.id))
  if (!item) return fail(c, "not found", 404)
  const editable = [
    "scraped_name",
    "cover",
    "authors",
    "plot",
    "description",
    "genre",
    "release_date",
    "rating",
    "publisher",
    "isbn",
    "external_id",
    "hidden",
    "album_name",
    "album_artist",
    "track_number",
    "lyrics",
    "video_type",
    "season",
    "episode",
    "reviews",
    "mime_type",
  ] as const
  for (const key of editable) {
    if (body[key] !== undefined) (item as any)[key] = body[key]
  }
  item.updated_at = new Date().toISOString()
  await saveMediaDb(c.env, db)
  return ok(c)
})

mediaAdminRouter.post("/items/delete", async (c) => {
  const id = Number(c.req.query("id") || 0)
  const db = await getMediaDb(c.env)
  db.items = db.items.filter((i) => i.id !== id)
  repairItemScanPath(db)
  await saveMediaDb(c.env, db)
  return ok(c)
})

const runBackground = (c: any, task: Promise<unknown>) => {
  try {
    c.executionCtx.waitUntil(task)
  } catch {
    return task
  }
  return Promise.resolve()
}

mediaAdminRouter.post("/scan/start", async (c) => {
  const body = await c.req.json().catch(() => ({}))
  const type = body.media_type as MediaType
  if (!MEDIA_TYPES.includes(type)) return fail(c, "invalid media_type")
  if (isScanRunning(type)) return fail(c, "scan already running", 409)
  const id = Number(body.scan_path_id || 0)
  const task = scanMedia(c.env, type, id).catch((e) =>
    console.error("[media] scan failed:", e?.message || e),
  )
  await runBackground(c, task)
  return ok(c)
})

mediaAdminRouter.get("/scan/progress", async (c) => {
  const type = (c.req.query("media_type") || "video") as MediaType
  return ok(c, getScanProgress(type, Number(c.req.query("scan_path_id") || 0)))
})

mediaAdminRouter.post("/scrape/start", async (c) => {
  const body = await c.req.json().catch(() => ({}))
  const type = body.media_type as MediaType
  if (!MEDIA_TYPES.includes(type)) return fail(c, "invalid media_type")
  if (isScrapeRunning(type)) return fail(c, "scrape already running", 409)
  const settings = await getSettingsMap(c.env)
  const task = scrapeMedia(c.env, settings, type, Number(body.item_id || 0)).catch(
    (e) => console.error("[media] scrape failed:", e?.message || e),
  )
  await runBackground(c, task)
  return ok(c)
})

mediaAdminRouter.get("/scrape/stats", async (c) => {
  const type = (c.req.query("media_type") || "video") as MediaType
  const db = await getMediaDb(c.env)
  const list = db.items.filter((i) => i.media_type === type)
  return ok(c, {
    ...getScrapeStats(type),
    total: list.length,
    scraped: list.filter((i) => !!i.scraped_at).length,
  })
})

mediaAdminRouter.post("/clear", async (c) => {
  const type = c.req.query("media_type") as MediaType
  const db = await getMediaDb(c.env)
  if (type) db.items = db.items.filter((i) => i.media_type !== type)
  else db.items = []
  repairItemScanPath(db)
  await saveMediaDb(c.env, db)
  return ok(c)
})

mediaAdminRouter.post("/clear_scrape", async (c) => {
  const type = c.req.query("media_type") as MediaType | undefined
  const db = await getMediaDb(c.env)
  let affected = 0
  for (const item of db.items) {
    if (type && item.media_type !== type) continue
    item.cover = ""
    item.thumb = ""
    item.thumb_mime = ""
    item.scraped_name = ""
    item.authors = ""
    item.plot = ""
    item.description = ""
    item.genre = ""
    item.release_date = ""
    item.rating = 0
    item.publisher = ""
    item.isbn = ""
    item.external_id = ""
    item.scraper_source = ""
    item.lyrics = ""
    item.reviews = ""
    item.scraped_at = null
    affected += 1
  }
  await saveMediaDb(c.env, db)
  return ok(c, { affected })
})

/**
 * 删除失效条目：逐条确认文件/目录在存储中是否还存在。
 *
 * Worker 没有遍历整库的时间预算，因此限制单次检查条数（默认 500，最大 2000）。
 * 对齐 Go 的 f80b7cdb：只删除「确认不存在」的记录；查询异常时保留。
 */
mediaAdminRouter.post("/delete_invalid", async (c) => {
  const type = c.req.query("media_type") as MediaType | undefined
  // 每条都要向存储换链 + 探测，Worker 单请求时间有限，默认只查 200 条
  const limit = Math.min(Number(c.req.query("limit") || 200) || 200, 1000)
  const db = await getMediaDb(c.env)
  const candidates = db.items
    .filter((i) => !type || i.media_type === type)
    .slice(0, limit)
  const gone = new Set<number>()
  for (const item of candidates) {
    const path = item.is_folder
      ? `${item.folder_path.replace(/\/+$/, "")}/${item.file_name}`
      : `${item.folder_path.replace(/\/+$/, "")}/${item.file_name}`
    try {
      await getItem(path, { env: c.env })
    } catch (e: any) {
      // 目录条目：getItem 对目录可能失败，退化为 list 一次
      if (item.is_folder) {
        try {
          const { listItems } = await import("../internal/op/storage")
          await listItems(path, { env: c.env })
          continue
        } catch {
          gone.add(item.id)
          continue
        }
      }
      const msg = String(e?.message || "")
      // 明确 404 / not found 才删除；网络/鉴权错误保留（对齐 Go）
      if (/not\s*found|不存在|404/i.test(msg)) gone.add(item.id)
    }
  }
  const before = db.items.length
  if (gone.size > 0) {
    db.items = db.items.filter((i) => !gone.has(i.id))
    repairItemScanPath(db)
    await saveMediaDb(c.env, db)
  }
  return ok(c, {
    checked: candidates.length,
    deleted: before - db.items.length,
    remaining: db.items.length,
  })
})

/** 修复孤儿数据（导入/删除后使用） */
mediaAdminRouter.post("/repair", async (c) => {
  const db = await getMediaDb(c.env)
  const result = repairItemScanPath(db)
  await saveMediaDb(c.env, db)
  return ok(c, result)
})

mediaAdminRouter.get("/export", async (c) => {
  const type = c.req.query("media_type") as MediaType | undefined
  const scanPathId = Number(c.req.query("scan_path_id") || 0)
  const db = await getMediaDb(c.env)
  let items = db.items
  if (scanPathId) items = items.filter((i) => i.scan_path_id === scanPathId)
  if (type) items = items.filter((i) => i.media_type === type)
  const scope = scanPathId ? "scan_path" : type ? "media_type" : "all"
  const data = {
    version: 2,
    export_at: new Date().toISOString(),
    scope,
    media_type: type || "",
    scan_path_id: scanPathId || 0,
    scan_paths: scanPathId
      ? db.scan_paths.filter((p) => p.id === scanPathId)
      : listScanPaths(db, type),
    items,
  }
  const name =
    scope === "scan_path"
      ? `media-scanpath-${scanPathId}.json`
      : scope === "media_type"
        ? `media-${type}.json`
        : "media-export.json"
  c.header("Content-Type", "application/json")
  c.header("Content-Disposition", `attachment; filename=${name}`)
  return c.body(JSON.stringify(data, null, 2))
})

mediaAdminRouter.post("/import", async (c) => {
  let body: any = null
  try {
    body = await c.req.json()
  } catch {
    try {
      const form = await c.req.formData()
      const file = form.get("file") as File | null
      if (file) body = JSON.parse(await file.text())
    } catch {
      body = null
    }
  }
  if (!body || !Array.isArray(body.items)) return fail(c, "invalid import file")

  const db = await getMediaDb(c.env)
  const redirectScanPathId = Number(c.req.query("scan_path_id") || 0)
  const now = new Date().toISOString()
  let spCreated = 0
  let spUpdated = 0
  let created = 0
  let updated = 0

  // 1) 扫描路径：按 (media_type, path) 去重，建立旧 id → 新 id 映射
  const idMap = new Map<number, number>()
  const rawPaths: any[] = Array.isArray(body.scan_paths) ? body.scan_paths : []
  for (const raw of rawPaths) {
    const mediaType = (raw?.media_type || body.media_type || "video") as MediaType
    if (!MEDIA_TYPES.includes(mediaType)) continue
    const path = String(raw?.path || "")
    if (!path.startsWith("/")) continue
    const exists = db.scan_paths.find(
      (p) => p.media_type === mediaType && p.path === path,
    )
    if (exists) {
      exists.name = raw.name || exists.name
      exists.type_tag = raw.type_tag ?? exists.type_tag
      exists.content_tags = raw.content_tags ?? exists.content_tags
      if (raw.path_merge !== undefined) exists.path_merge = !!raw.path_merge
      if (raw.enable_scrape !== undefined) {
        exists.enable_scrape = !!raw.enable_scrape
      }
      exists.updated_at = now
      if (raw.id !== undefined) idMap.set(Number(raw.id), exists.id)
      spUpdated += 1
    } else {
      const sp = {
        id: nextId(db),
        media_type: mediaType,
        name: raw.name || path,
        path,
        type_tag: raw.type_tag || "",
        content_tags: raw.content_tags || "",
        created_at: now,
        updated_at: now,
        path_merge: !!raw.path_merge,
        enable_scrape: raw.enable_scrape === undefined ? true : !!raw.enable_scrape,
        last_scan_at: null,
      }
      db.scan_paths.push(sp)
      if (raw.id !== undefined) idMap.set(Number(raw.id), sp.id)
      spCreated += 1
    }
  }

  // 2) 条目
  for (const raw of body.items as MediaItem[]) {
    if (!raw || !raw.folder_path || !raw.file_name) continue
    let scanPathId = Number(raw.scan_path_id) || 0
    if (redirectScanPathId) scanPathId = redirectScanPathId
    else if (idMap.has(scanPathId)) scanPathId = idMap.get(scanPathId)!
    const exists = db.items.find(
      (i) =>
        i.folder_path === raw.folder_path &&
        i.file_name === raw.file_name &&
        i.media_type === raw.media_type &&
        (i.album_name || "") === (raw.album_name || ""),
    )
    if (exists) {
      Object.assign(exists, raw, {
        id: exists.id,
        scan_path_id: scanPathId || exists.scan_path_id,
        created_at: exists.created_at,
        updated_at: now,
      })
      updated += 1
    } else {
      const [id] = allocateIds(db, 1)
      db.items.push({
        ...raw,
        id,
        scan_path_id: scanPathId,
        created_at: raw.created_at || now,
        updated_at: now,
      })
      created += 1
    }
  }

  repairItemScanPath(db)
  invalidateMediaCache()
  await saveMediaDb(c.env, db)
  return ok(c, {
    scan_paths_created: spCreated,
    scan_paths_updated: spUpdated,
    items_created: created,
    items_updated: updated,
  })
})

// ==================== 应用密钥（管理员 + 用户自助） ====================

const appKeyPlainOf = async (c: any, row: MediaAppKey): Promise<string> => {
  if (row.enc) {
    try {
      return await decrypt(row.enc, await getJwtSecret(c))
    } catch {
      return ""
    }
  }
  return row.plain || ""
}

const listKeysDto = (db: any, userId?: number) =>
  db.app_keys
    .filter((k: MediaAppKey) => !userId || k.user_id === userId)
    .map((k: MediaAppKey) => ({
      id: k.id,
      name: k.name,
      prefix: k.prefix,
      user_id: k.user_id,
      last_used_at: k.last_used_at,
      created_at: k.created_at,
    }))

const createKey = async (c: any, user: any, name: string) => {
  const db = await getMediaDb(c.env)
  const plain = randomToken("olmp_")
  const row: MediaAppKey = {
    id: nextId(db),
    user_id: user?.id || 1,
    name: name || "Media Key",
    prefix: plain.slice(0, 10),
    secret: await sha256Hex(plain),
    enc: await encrypt(plain, await getJwtSecret(c)),
    last_used_at: null,
    created_at: new Date().toISOString(),
  }
  db.app_keys.push(row)
  await saveMediaDb(c.env, db)
  return {
    id: row.id,
    name: row.name,
    prefix: row.prefix,
    key: plain,
  }
}

mediaAdminRouter.get("/appkey/list", async (c) => {
  const db = await getMediaDb(c.env)
  return ok(c, listKeysDto(db))
})

mediaAdminRouter.post("/appkey/create", async (c) => {
  const body = await c.req.json().catch(() => ({}))
  const user = await getUserFromContext(c)
  return ok(c, await createKey(c, user, body.name))
})

mediaAdminRouter.post("/appkey/delete", async (c) => {
  const id = Number(c.req.query("id") || 0)
  const db = await getMediaDb(c.env)
  db.app_keys = db.app_keys.filter((k) => k.id !== id)
  await saveMediaDb(c.env, db)
  return ok(c)
})

/** 普通用户自助管理自己的密钥（对齐 Go 的 /api/me/appkey/*） */
export const meAppkeyRouter = new Hono()

meAppkeyRouter.use("*", async (c, next) => {
  const user = await getUserFromContext(c)
  if (!user) return fail(c, "未登录", 401)
  await next()
})

meAppkeyRouter.get("/list", async (c) => {
  const user = await getUserFromContext(c)
  const db = await getMediaDb(c.env)
  return ok(c, listKeysDto(db, user?.id))
})

meAppkeyRouter.post("/create", async (c) => {
  const body = await c.req.json().catch(() => ({}))
  const user = await getUserFromContext(c)
  return ok(c, await createKey(c, user, body.name))
})

meAppkeyRouter.post("/delete", async (c) => {
  const user = await getUserFromContext(c)
  const id = Number(c.req.query("id") || 0)
  const db = await getMediaDb(c.env)
  const row = db.app_keys.find((k) => k.id === id)
  if (!row) return fail(c, "not found", 404)
  if (row.user_id !== user?.id && !isAdmin(user)) return fail(c, "forbidden", 403)
  db.app_keys = db.app_keys.filter((k) => k.id !== id)
  await saveMediaDb(c.env, db)
  return ok(c)
})

mediaAdminRouter.post("/strm/generate", async (c) => {
  const body = await c.req.json().catch(() => ({}))
  const type = (body.media_type || "") as MediaType | ""
  if (type && !MEDIA_TYPES.includes(type)) return fail(c, "invalid media_type")
  const scanPathId = Number(body.scan_path_id || 0)
  try {
    const result = await generateStrmForType(
      c.env,
      type,
      scanPathId,
      originOf(c),
    )
    return ok(c, { written: result.written, failed: result.failed, path: result.path })
  } catch (e: any) {
    return fail(c, e?.message || "strm generate failed", 500)
  }
})

// ==================== 公开路由 ====================

export const mediaPublicRouter = new Hono()

mediaPublicRouter.get("/media_status", async (c) => {
  const settings = await getSettingsMap(c.env)
  const db = await getMediaDb(c.env)
  const origin = originOf(c)
  return ok(c, {
    enabled: mediaEnabled(settings),
    version: String(settings.version || "worker"),
    types: MEDIA_TYPES.filter((t) => getConfig(db, t).enabled),
    emby_enabled: mediaProtocolEnabled(settings, "media_emby_enabled"),
    subsonic_enabled: mediaProtocolEnabled(settings, "media_subsonic_enabled"),
    emby_base_url: `${origin}/@emby`,
    subsonic_base_url: `${origin}/@rest`,
    proxy_cover: settingBool(settings, "media_proxy_cover", false),
    strm_path: settings.media_strm_path || "",
    strm_same_dir: settingBool(settings, "media_strm_same_dir", true),
    strm_on_scan: settingBool(settings, "media_strm_on_scan", false),
    thumb_path: settings.media_thumbnail_path || "/imgs",
    cover_gateway: settingBool(settings, "media_cover_gateway", false),
  })
})

/** 允许代理的封面来源（与 Go 一致 + Google Books / OpenLibrary） */
const COVER_HOSTS = [
  "image.tmdb.org",
  "tmdb.org",
  "doubanio.com",
  "douban.com",
  "discogs.com",
  "openlibrary.org",
  "googleusercontent.com",
  "books.google.com",
  "books.googleusercontent.com",
]

const coverHostAllowed = (host: string) => {
  const h = host.toLowerCase().replace(/\.$/, "")
  if (!h) return false
  return COVER_HOSTS.some((x) => h === x || h.endsWith(`.${x}`))
}

/** 逐跳校验的封面拉取：禁止域名跳到内网 / 非图片内容 */
async function fetchCoverSafely(
  rawUrl: string,
  maxRedirects = 4,
): Promise<{ data: Uint8Array; mime: string } | null> {
  let current = rawUrl
  for (let i = 0; i < maxRedirects; i++) {
    let u: URL
    try {
      u = new URL(current)
    } catch {
      return null
    }
    if (!/^https?:$/.test(u.protocol)) return null
    if (!coverHostAllowed(u.hostname)) return null
    if (!isSafeUrl(current, COVER_HOSTS)) return null

    const res = await fetch(current, {
      headers: { "User-Agent": "OpenList-Media/1.0", Accept: "image/*" },
      redirect: "manual",
      signal: AbortSignal.timeout(20_000),
    }).catch(() => null)
    if (!res) return null
    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get("location")
      if (!loc) return null
      current = new URL(loc, current).toString()
      continue
    }
    if (!res.ok) return null
    const data = new Uint8Array(await res.arrayBuffer())
    if (data.length === 0 || data.length > 8 * 1024 * 1024) return null
    const mime = sniffImageMime(data)
    if (!mime) return null
    return { data, mime }
  }
  return null
}

mediaPublicRouter.get("/media/proxy", async (c) => {
  const settings = await getSettingsMap(c.env)
  if (!mediaEnabled(settings)) return c.body(null, 404)
  const raw = c.req.query("url") || ""
  if (!raw) return c.body(null, 400)

  let found = await fetchCoverSafely(raw)
  // 直连失败时可选回退公共图片网关（默认关闭，涉及第三方）
  if (!found && settingBool(settings, "media_cover_gateway", false)) {
    const gateway = `https://wsrv.nl/?url=${encodeURIComponent(raw.replace(/^https?:\/\//, ""))}`
    found = await fetchCoverSafely(gateway)
  }
  if (!found) return c.body(null, 502)

  c.header("Content-Type", found.mime)
  c.header("Cache-Control", "public, max-age=604800")
  c.header("X-Content-Type-Options", "nosniff")
  c.header("Content-Disposition", 'inline; filename="cover"')
  c.header("Content-Security-Policy", "default-src 'none'; sandbox")
  return c.body(found.data as any)
})

/**
 * 本地缩略图读取。
 *
 * Worker 侧缩略图存在持久化存储里（`thumb:<hash>`），因此这里接受两种参数：
 *   - path=<hash>（本实现）
 *   - path=/imgs/<name>（Go 语义，Worker 无本地盘 → 404）
 */
mediaPublicRouter.get("/media/thumb", async (c) => {
  const settings = await getSettingsMap(c.env)
  if (!mediaEnabled(settings)) return c.body(null, 404)
  const raw = String(c.req.query("path") || "").trim()
  if (!raw) return c.body(null, 400)
  const hash = raw.startsWith("thumb:")
    ? raw.slice("thumb:".length)
    : raw.replace(/^\/+/, "")
  if (!/^[a-f0-9]{16,64}$/i.test(hash)) return c.body(null, 404)
  const thumb = await readThumb(c.env, hash)
  if (!thumb) return c.body(null, 404)
  c.header("Content-Type", thumb.mime)
  c.header("Cache-Control", "public, max-age=604800")
  c.header("X-Content-Type-Options", "nosniff")
  c.header("Content-Disposition", 'inline; filename="thumb"')
  c.header("Content-Security-Policy", "default-src 'none'; sandbox")
  return c.body(thumb.bytes as any)
})

// ==================== 供 Emby / Subsonic 复用 ====================

export const mediaHelpers = {
  itemPath,
  canAccessItem,
  serializeItem,
  applyProgress,
  sha256Hex,
  randomToken,
  appKeyPlainOf,
  accessibleItems,
  resolveCoverUrl,
  thumbOptionsOf,
  authLockedFor,
  authFailed,
  authSucceeded,
  sniffImageMime,
  ticksToSeconds,
  extOf,
  UserRole,
  readFileRange,
  putItem,
}
