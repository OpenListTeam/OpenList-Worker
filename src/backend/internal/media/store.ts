/**
 * 媒体库持久化。
 *
 * Worker 的通用 DB 抽象只认识 settings/storages/users/... 这几张表，
 * 媒体库数据整体作为一个 JSON 文档存到当前后端（KV / Blob / D1 secret
 * 兼容层），避免为 9 张新表改 SQL/Key/Map 三种格式。
 */

import { readPersistedSecret, writePersistedSecret } from "../model/store/json"
import { getDb } from "../model/db"
import {
  DEFAULT_CONFIG,
  emptyMediaDb,
  MEDIA_TYPES,
  type MediaConfig,
  type MediaDb,
  type MediaItem,
  type MediaScanPath,
  type MediaType,
  type MediaUserData,
} from "./model"

const MEDIA_DB_KEY = "openlist_media_db_v1"

let cache: MediaDb | null = null
let loadPromise: Promise<MediaDb> | null = null
let saveChain: Promise<void> = Promise.resolve()

const normalize = (db: any): MediaDb => {
  const base = emptyMediaDb()
  if (!db || typeof db !== "object") return base
  return {
    version: Number(db.version) || 1,
    next_id: Number(db.next_id) || 1,
    configs: Array.isArray(db.configs) ? db.configs : [],
    scan_paths: Array.isArray(db.scan_paths) ? db.scan_paths : [],
    items: Array.isArray(db.items) ? db.items : [],
    user_data: Array.isArray(db.user_data) ? db.user_data : [],
    app_keys: Array.isArray(db.app_keys) ? db.app_keys : [],
    emby_devices: Array.isArray(db.emby_devices) ? db.emby_devices : [],
  }
}

export async function getMediaDb(env: any): Promise<MediaDb> {
  if (cache) return cache
  if (loadPromise) return loadPromise
  loadPromise = (async () => {
    try {
      const raw = await readPersistedSecret(env, MEDIA_DB_KEY)
      cache = normalize(raw ? JSON.parse(raw) : null)
    } catch {
      cache = emptyMediaDb()
    }
    if (!cache) cache = emptyMediaDb()
    ensureConfigs(cache)
    return cache
  })().finally(() => {
    loadPromise = null
  })
  return loadPromise
}

export function ensureConfigs(db: MediaDb) {
  for (const type of MEDIA_TYPES) {
    if (!db.configs.some((c) => c.media_type === type)) {
      db.configs.push(DEFAULT_CONFIG(type))
    }
  }
}

/** 串行化写入，避免同一 isolate 内并发覆盖 */
export function saveMediaDb(env: any, db?: MediaDb): Promise<void> {
  const target = db ?? cache
  if (!target) return Promise.resolve()
  cache = target
  const payload = JSON.stringify(target)
  saveChain = saveChain
    .catch(() => undefined)
    .then(() => writePersistedSecret(env, MEDIA_DB_KEY, payload))
    .then(() => undefined)
    .catch((err) => {
      console.error("[media] save failed:", err?.message || err)
    })
  return saveChain
}

export function nextId(db: MediaDb) {
  const id = db.next_id || 1
  db.next_id = id + 1
  return id
}

export function getConfig(db: MediaDb, type: MediaType): MediaConfig {
  let cfg = db.configs.find((c) => c.media_type === type)
  if (!cfg) {
    cfg = DEFAULT_CONFIG(type)
    db.configs.push(cfg)
  }
  return cfg
}

export function isTypeEnabled(db: MediaDb, type: MediaType) {
  return !!getConfig(db, type).enabled
}

export function listScanPaths(db: MediaDb, type?: MediaType) {
  return db.scan_paths
    .filter((p) => !type || p.media_type === type)
    .sort((a, b) => a.id - b.id)
}

export interface MediaQuery {
  media_type?: MediaType
  scan_path_id?: number
  folder_path?: string
  keyword?: string
  type_tag?: string
  content_tag?: string
  path_prefix?: string
  hidden?: boolean
  order_by?: string
  order_dir?: string
  page?: number
  page_size?: number
  ids?: number[]
}

export function queryItems(db: MediaDb, q: MediaQuery) {
  let list = db.items.filter((item) => {
    if (q.media_type && item.media_type !== q.media_type) return false
    if (q.scan_path_id && item.scan_path_id !== q.scan_path_id) return false
    if (q.folder_path && item.folder_path !== q.folder_path) return false
    if (q.ids && !q.ids.includes(item.id)) return false
    if (q.hidden !== undefined && item.hidden !== q.hidden) return false
    if (q.path_prefix && q.path_prefix !== "/") {
      const prefix = q.path_prefix.replace(/\/+$/, "") + "/"
      if (!`${item.folder_path}/`.startsWith(prefix)) return false
    }
    if (q.keyword) {
      const k = q.keyword.toLowerCase()
      if (
        !item.file_name.toLowerCase().includes(k) &&
        !(item.scraped_name || "").toLowerCase().includes(k)
      ) {
        return false
      }
    }
    if (q.type_tag || q.content_tag) {
      const sp = db.scan_paths.find((p) => p.id === item.scan_path_id)
      if (!sp) return false
      if (q.type_tag && sp.type_tag !== q.type_tag) return false
      if (q.content_tag && !sp.content_tags.includes(q.content_tag))
        return false
    }
    return true
  })
  const page = Math.max(1, q.page || 1)
  const pageSize = Math.min(500, Math.max(1, q.page_size || 40))
  const dir = q.order_dir === "desc" ? -1 : 1
  const by = q.order_by || "name"
  list = list.sort((a, b) => {
    let av: any = 0
    let bv: any = 0
    if (by === "date") {
      av = a.release_date || ""
      bv = b.release_date || ""
    } else if (by === "size") {
      av = a.file_size
      bv = b.file_size
    } else {
      av = (a.scraped_name || a.file_name).toLowerCase()
      bv = (b.scraped_name || b.file_name).toLowerCase()
    }
    return av < bv ? -1 * dir : av > bv ? 1 * dir : 0
  })
  return {
    content: list.slice((page - 1) * pageSize, page * pageSize),
    total: list.length,
  }
}

export function findItem(db: MediaDb, id: number) {
  return db.items.find((i) => i.id === id)
}

export function findScanPath(db: MediaDb, id: number) {
  return db.scan_paths.find((p) => p.id === id)
}

export function upsertItem(
  db: MediaDb,
  data: Omit<MediaItem, "id" | "created_at" | "updated_at">,
): MediaItem {
  const existing = db.items.find(
    (i) =>
      i.folder_path === data.folder_path &&
      i.file_name === data.file_name &&
      i.album_name === data.album_name,
  )
  const now = new Date().toISOString()
  if (existing) {
    Object.assign(existing, data, { updated_at: now })
    return existing
  }
  const item: MediaItem = {
    ...data,
    id: nextId(db),
    created_at: now,
    updated_at: now,
  } as MediaItem
  db.items.push(item)
  return item
}

export function getUserData(
  db: MediaDb,
  userId: number,
  itemId: number,
  episodeIndex = 0,
) {
  return db.user_data.find(
    (d) =>
      d.user_id === userId &&
      d.item_id === itemId &&
      d.episode_index === episodeIndex,
  )
}

export function ensureUserData(
  db: MediaDb,
  userId: number,
  itemId: number,
  episodeIndex = 0,
): MediaUserData {
  let row = getUserData(db, userId, itemId, episodeIndex)
  if (!row) {
    row = {
      id: nextId(db),
      user_id: userId,
      item_id: itemId,
      episode_index: episodeIndex,
      position_ticks: 0,
      duration_ticks: 0,
      played: false,
      play_count: 0,
      is_favorite: false,
      updated_at: new Date().toISOString(),
    }
    db.user_data.push(row)
  }
  return row
}

export function listFavorites(db: MediaDb, userId: number) {
  return db.user_data.filter((d) => d.user_id === userId && d.is_favorite)
}

export async function getSettingsMap(
  env: any,
): Promise<Record<string, string>> {
  const db = await getDb(env)
  const map: Record<string, string> = {}
  for (const s of db.settings || []) map[s.key] = String(s.value ?? "")
  return map
}
