/**
 * 媒体库 HTTP API（对齐 OpenList-Frontend `src/utils/media_api.ts`）。
 *
 * 挂载：
 *   /api/fs/media/*      登录用户 / 访客
 *   /api/admin/media/*   管理员
 *   /api/public/media*   公开（状态、封面代理）
 */

import { Hono } from "hono"

import { getUserFromContext } from "./middlewares"
import { getDb } from "../internal/model/db"
import { getNearestMeta, canAccess } from "../pkg/meta"
import { isAdmin, isWithinUserRoot } from "../pkg/permission"
import { encodeDownloadPath } from "../pkg/path"
import { getSignExpiresIn, signDownloadPath } from "../pkg/sign"
import { putItem } from "../internal/op/storage"
import {
  extOf,
  isBookFile,
  isImageFile,
  isMusicFile,
  isVideoFile,
  mediaEnabled,
  mediaProtocolEnabled,
  MEDIA_TYPES,
  type MediaItem,
  type MediaType,
  type MediaUserData,
  type MediaConfig,
  type MediaScanPath,
} from "../internal/media/model"
import {
  ensureUserData,
  findItem,
  findScanPath,
  getConfig,
  getMediaDb,
  getSettingsMap,
  getUserData,
  isTypeEnabled,
  listFavorites,
  listScanPaths,
  nextId,
  queryItems,
  saveMediaDb,
  upsertItem,
} from "../internal/media/store"
import { getScanProgress, scanMedia } from "../internal/media/scan"
import { scrapeMedia } from "../internal/media/scrape"

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

async function canAccessItem(env: any, user: any, item: MediaItem) {
  if (!user || item.hidden) return false
  if (!isWithinUserRoot(user, item.folder_path)) return false
  try {
    const meta = await getNearestMeta(item.folder_path, env)
    return canAccess(user, meta, item.folder_path, "")
  } catch {
    return true
  }
}

async function accessibleItems(
  env: any,
  user: any,
  type: MediaType,
  items: MediaItem[],
) {
  const out: MediaItem[] = []
  for (const item of items) {
    if (await canAccessItem(env, user, item)) out.push(item)
  }
  return out
}

const itemPath = (item: MediaItem, ep?: number) => {
  const folder = item.folder_path.replace(/\/+$/, "") || ""
  let path = `${folder}/${item.file_name}`.replace(/\/+/g, "/")
  try {
    const eps = JSON.parse(item.episodes || "[]")
    if (eps.length > 0) {
      const found =
        ep && ep > 0
          ? eps.find((e: any) => e.index === ep || e.index === Number(ep))
          : eps[0]
      if (found?.file_name)
        path = `${folder}/${item.file_name}/${found.file_name}`
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
})

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
  const filtered = await accessibleItems(c.env, user, type, content)
  return ok(c, { content: filtered, total })
})

mediaRouter.get("/item/:id", async (c) => {
  const user = await getUserFromContext(c)
  if (!user) return fail(c, "Guest user is disabled, login please", 401)
  const db = await getMediaDb(c.env)
  const item = findItem(db, Number(c.req.param("id")))
  if (!item || !(await canAccessItem(c.env, user, item))) {
    return fail(c, "资源不存在", 404)
  }
  return ok(c, item)
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
      (!keyword || i.file_name.toLowerCase().includes(keyword)),
  )
  const map = new Map<string, any>()
  for (const item of items) {
    if (!(await canAccessItem(c.env, user, item))) continue
    const album = item.album_name || "未知专辑"
    const artist = item.album_artist || "未知艺术家"
    const key = `${album}\u0000${artist}`
    const row = map.get(key) || {
      album_name: album,
      album_artist: artist,
      cover: item.cover,
      release_date: item.release_date,
      genre: item.genre,
      track_count: 0,
      duration: 0,
    }
    row.track_count += 1
    row.duration += item.duration || 0
    if (!row.cover && item.cover) row.cover = item.cover
    map.set(key, row)
  }
  const page = Math.max(1, Number(c.req.query("page") || 1))
  const pageSize = Math.min(Number(c.req.query("page_size") || 40), 200)
  const all = Array.from(map.values())
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
    "music",
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
  return ok(c, list)
})

mediaRouter.get("/folders", async (c) => {
  const user = await getUserFromContext(c)
  if (!user) return fail(c, "Guest user is disabled, login please", 401)
  const type = (c.req.query("media_type") || "") as MediaType
  const db = await getMediaDb(c.env)
  const set = new Set<string>()
  for (const item of db.items) {
    if (type && item.media_type !== type) continue
    if (await canAccessItem(c.env, user, item)) set.add(item.folder_path)
  }
  return ok(c, Array.from(set).sort())
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
  const row = getUserData(
    db,
    user.id,
    Number(c.req.query("item_id") || 0),
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
  row.position_ticks = Math.max(0, Math.round(Number(body.position) || 0))
  row.duration_ticks = Math.max(0, Math.round(Number(body.duration) || 0))
  row.played = !!body.played
  if (row.played) row.play_count += 1
  row.updated_at = new Date().toISOString()
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
  const ids = listFavorites(db, user.id).map((d) => d.item_id)
  const page = Math.max(1, Number(c.req.query("page") || 1))
  const size = Math.min(Number(c.req.query("page_size") || 40), 200)
  const filtered = await accessibleItems(
    c.env,
    user,
    type || "video",
    db.items.filter(
      (i) => ids.includes(i.id) && (!type || i.media_type === type),
    ),
  )
  filtered.sort((a, b) => a.id - b.id)
  return ok(c, {
    content: filtered.slice((page - 1) * size, page * size),
    total: filtered.length,
  })
})

mediaRouter.get("/resume", async (c) => {
  const user = await getUserFromContext(c)
  if (!user?.id) return fail(c, "Guest user is disabled, login please", 401)
  const type = c.req.query("media_type") as MediaType | undefined
  const limit = Math.min(Number(c.req.query("limit") || 20), 100)
  const db = await getMediaDb(c.env)
  const rows = db.user_data
    .filter((d) => d.user_id === user.id && !d.played && d.position_ticks > 0)
    .sort((a, b) => (a.updated_at < b.updated_at ? 1 : -1))
    .slice(0, limit)
  const out: any[] = []
  for (const row of rows) {
    const item = findItem(db, row.item_id)
    if (!item || (type && item.media_type !== type)) continue
    if (!(await canAccessItem(c.env, user, item))) continue
    out.push({ ...item, position_ticks: row.position_ticks })
  }
  return ok(c, out)
})

mediaRouter.get("/stream_url", async (c) => {
  const user = await getUserFromContext(c)
  if (!user) return fail(c, "Guest user is disabled, login please", 401)
  const db = await getMediaDb(c.env)
  const id = Number(c.req.query("id") || 0)
  let path = c.req.query("path") || ""
  let name = "media"
  if (id) {
    const item = findItem(db, id)
    if (!item || !(await canAccessItem(c.env, user, item))) {
      return fail(c, "资源不存在", 404)
    }
    path = itemPath(item, Number(c.req.query("episode") || 0))
    name = item.file_name
  }
  if (!path || !isWithinUserRoot(user, path)) return fail(c, "invalid path")
  const expires = await getSignExpiresIn(c)
  const sign = await signDownloadPath(c, path, expires)
  const url = `${originOf(c)}/d${encodeDownloadPath(path)}?sign=${encodeURIComponent(sign)}`
  return ok(c, {
    url,
    path,
    name,
    proxied: `${originOf(c)}/p${encodeDownloadPath(path)}?sign=${encodeURIComponent(sign)}`,
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
  const ep = Number(c.req.query("episode") || 0)
  const path = itemPath(item, ep)
  const expires = await getSignExpiresIn(c)
  const sign = await signDownloadPath(c, path, expires)
  const url = `${originOf(c)}/d${encodeDownloadPath(path)}?sign=${encodeURIComponent(sign)}`
  c.header("Content-Type", "text/plain; charset=utf-8")
  c.header(
    "Content-Disposition",
    `attachment; filename="${encodeURIComponent(item.scraped_name || item.file_name)}.strm"`,
  )
  return c.body(url)
})

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
  const sp: MediaScanPath = {
    id: nextId(db),
    media_type: type,
    name: body.name || body.path,
    path: body.path,
    type_tag: body.type_tag || "",
    content_tags: body.content_tags || "",
    created_at: now,
    updated_at: now,
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
  for (const key of ["name", "path", "type_tag", "content_tags"] as const) {
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
  await saveMediaDb(c.env, db)
  return ok(c)
})

mediaAdminRouter.post("/scan_paths/clear", async (c) => {
  const id = Number(c.req.query("id") || 0)
  const db = await getMediaDb(c.env)
  db.items = db.items.filter((i) => i.scan_path_id !== id)
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
  return ok(c, result)
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
  const settings = await getSettingsMap(c.env)
  const task = scrapeMedia(
    c.env,
    settings,
    type,
    Number(body.item_id || 0),
  ).catch((e) => console.error("[media] scrape failed:", e?.message || e))
  await runBackground(c, task)
  return ok(c)
})

mediaAdminRouter.get("/scrape/stats", async (c) => {
  const type = (c.req.query("media_type") || "video") as MediaType
  const db = await getMediaDb(c.env)
  const list = db.items.filter((i) => i.media_type === type)
  return ok(c, {
    total: list.length,
    scraped: list.filter((i) => !!i.scraper_source).length,
  })
})

mediaAdminRouter.post("/clear", async (c) => {
  const type = c.req.query("media_type") as MediaType
  const db = await getMediaDb(c.env)
  if (type) db.items = db.items.filter((i) => i.media_type !== type)
  else db.items = []
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
    affected += 1
  }
  await saveMediaDb(c.env, db)
  return ok(c, { affected })
})

mediaAdminRouter.post("/delete_invalid", async (c) => {
  // Worker 侧无法廉价校验远端文件是否存在，交由重新扫描覆盖；这里只清空隐藏项
  const type = c.req.query("media_type") as MediaType | undefined
  const db = await getMediaDb(c.env)
  const before = db.items.length
  db.items = db.items.filter(
    (i) => (type ? i.media_type !== type : true) || !i.hidden,
  )
  await saveMediaDb(c.env, db)
  return ok(c, { checked: before, deleted: before - db.items.length })
})

mediaAdminRouter.get("/export", async (c) => {
  const type = c.req.query("media_type") as MediaType | undefined
  const db = await getMediaDb(c.env)
  const data = {
    version: 1,
    export_at: new Date().toISOString(),
    scope: type ? "media_type" : "all",
    media_type: type || "",
    scan_paths: listScanPaths(db, type),
    items: db.items.filter((i) => !type || i.media_type === type),
  }
  c.header("Content-Type", "application/json")
  c.header("Content-Disposition", "attachment; filename=media-export.json")
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
  if (!body?.items) return fail(c, "invalid import file")
  const db = await getMediaDb(c.env)
  let created = 0
  let updated = 0
  for (const raw of body.items as MediaItem[]) {
    const exists = db.items.find(
      (i) =>
        i.folder_path === raw.folder_path &&
        i.file_name === raw.file_name &&
        i.album_name === raw.album_name,
    )
    if (exists) {
      Object.assign(exists, raw, { id: exists.id })
      updated += 1
    } else {
      db.items.push({ ...raw, id: nextId(db) })
      created += 1
    }
  }
  await saveMediaDb(c.env, db)
  return ok(c, {
    scan_paths_created: 0,
    scan_paths_updated: 0,
    items_created: created,
    items_updated: updated,
  })
})

mediaAdminRouter.get("/appkey/list", async (c) => {
  const db = await getMediaDb(c.env)
  return ok(
    c,
    db.app_keys.map((k) => ({
      id: k.id,
      name: k.name,
      prefix: k.prefix,
      last_used_at: k.last_used_at,
      created_at: k.created_at,
    })),
  )
})

mediaAdminRouter.post("/appkey/create", async (c) => {
  const body = await c.req.json().catch(() => ({}))
  const user = await getUserFromContext(c)
  const db = await getMediaDb(c.env)
  const key = randomToken("olmp_")
  const row = {
    id: nextId(db),
    user_id: user?.id || 1,
    name: body.name || "Media Key",
    prefix: key.slice(0, 10),
    secret: await sha256Hex(key),
    plain: key,
    last_used_at: null,
    created_at: new Date().toISOString(),
  }
  db.app_keys.push(row)
  await saveMediaDb(c.env, db)
  return ok(c, {
    id: row.id,
    name: row.name,
    prefix: row.prefix,
    key,
  })
})

mediaAdminRouter.post("/appkey/delete", async (c) => {
  const id = Number(c.req.query("id") || 0)
  const db = await getMediaDb(c.env)
  db.app_keys = db.app_keys.filter((k) => k.id !== id)
  await saveMediaDb(c.env, db)
  return ok(c)
})

mediaAdminRouter.post("/strm/generate", async (c) => {
  const body = await c.req.json().catch(() => ({}))
  const type = body.media_type as MediaType | ""
  const settings = await getSettingsMap(c.env)
  const sameDir = String(settings.media_strm_same_dir || "true") === "true"
  const outDir = (settings.media_strm_path || "/strm").replace(/\/+$/, "")
  const db = await getMediaDb(c.env)
  let written = 0
  for (const item of db.items) {
    if (type && item.media_type !== type) continue
    const src = itemPath(item)
    const expires = 0
    const sign = await signDownloadPath(c, src, expires)
    const url = `${originOf(c)}/d${encodeDownloadPath(src)}?sign=${encodeURIComponent(sign)}`
    const target = sameDir
      ? `${item.folder_path.replace(/\/+$/, "")}/${item.file_name.replace(/\.[^.]+$/, "")}.strm`
      : `${outDir}/${item.id}.strm`
    try {
      await putItem(target, new TextEncoder().encode(url) as any, {
        env: c.env,
      })
      written += 1
    } catch (e: any) {
      console.warn("[media] strm write failed", target, e?.message || e)
    }
  }
  return ok(c, { written, path: sameDir ? "同目录" : outDir })
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
    proxy_cover: String(settings.media_proxy_cover || "false") === "true",
    strm_path: settings.media_strm_path || "",
    strm_same_dir: String(settings.media_strm_same_dir || "true") === "true",
  })
})

const COVER_HOSTS = [
  "image.tmdb.org",
  "tmdb.org",
  "doubanio.com",
  "douban.com",
  "discogs.com",
  "openlibrary.org",
  "googleusercontent.com",
  "books.google.com",
]

const coverHostAllowed = (host: string) => {
  const h = host.toLowerCase()
  return COVER_HOSTS.some((x) => h === x || h.endsWith(`.${x}`))
}

mediaPublicRouter.get("/media/proxy", async (c) => {
  const raw = c.req.query("url") || ""
  let u: URL
  try {
    u = new URL(raw)
  } catch {
    return c.body(null, 400)
  }
  if (!/^https?:$/.test(u.protocol) || !coverHostAllowed(u.hostname)) {
    return c.body(null, 403)
  }
  const res = await fetch(u.toString(), {
    headers: { "User-Agent": "OpenList-Media/1.0" },
    redirect: "follow",
  }).catch(() => null)
  if (!res || !res.ok) return c.body(null, 502)
  const ct = res.headers.get("content-type") || ""
  if (!ct.startsWith("image/")) return c.body(null, 415)
  c.header("Content-Type", ct)
  c.header("Cache-Control", "public, max-age=604800")
  return c.body(await res.arrayBuffer())
})

mediaPublicRouter.get("/media/thumb", async (c) => {
  // 当前 Worker 版本不做本地缩略图落盘，封面统一走原始 URL / proxy
  return c.body(null, 404)
})

// ==================== Emby / Subsonic 需要的小工具 ====================

export const mediaHelpers = {
  itemPath,
  canAccessItem,
  sha256Hex,
  randomToken,
}
