/**
 * 媒体库持久化（分片版）。
 *
 * 历史实现把整个媒体库塞进单个 JSON secret：任何一次播放进度上报都会重写
 * 全部条目。条目上万、或多 isolate 并发时会互相覆盖，且容易撞上 KV 单键
 * 写入频率限制。这里改为分片：
 *
 *   openlist_media_db_v1            meta（config/scan_path/appkey/device/playlist…）
 *   openlist_media_items_v1:<sid>   items（按 scan_path_id 分片）
 *   openlist_media_ud_v1:<uid>      user_data（按 user_id 分片）
 *   openlist_media_thumb_v1:<hash>  缩略图/封面字节（base64）
 *
 * 读取时按 meta 里的 shard 索引聚合，仍向业务层暴露「完整 MediaDb」，
 * 因此上层代码无需感知分片；写入时按内容比较只写发生变化的分片。
 *
 * 兼容：首次读取时若 meta 里还带着旧版 items/user_data（单文档格式），
 * 自动拆分落盘并清理旧字段，无需人工迁移。
 */

import {
  listPersistedSecrets,
  readPersistedSecret,
  writePersistedSecret,
} from "../model/store/json"
import {
  DEFAULT_CONFIG,
  emptyMediaDb,
  MEDIA_DB_VERSION,
  MEDIA_TYPES,
  type MediaConfig,
  type MediaDb,
  type MediaItem,
  type MediaPlaylist,
  type MediaPlaylistItem,
  type MediaScanPath,
  type MediaType,
  type MediaUserData,
} from "./model"

const META_KEY = "openlist_media_db_v1"
const ITEMS_PREFIX = "openlist_media_items_v1:"
const USERDATA_PREFIX = "openlist_media_ud_v1:"
const THUMB_PREFIX = "openlist_media_thumb_v1:"

/** 内存缓存 TTL：缩短跨 isolate 的陈旧窗口（写操作会立即刷新本地缓存） */
const CACHE_TTL_MS = 5_000

/** 单条缩略图上限，防止把几十 MB 的 base64 写进 KV */
export const MAX_THUMB_BYTES = 512 * 1024

interface CacheState {
  db: MediaDb
  loadedAt: number
  /** 上次成功写出的分片快照（用于 diff，避免无谓写） */
  itemSnapshots: Map<string, string>
  userSnapshots: Map<string, string>
  metaSnapshot: string
}

let cache: CacheState | null = null
let loadPromise: Promise<MediaDb> | null = null
let saveChain: Promise<void> = Promise.resolve()

const normalizeItem = (raw: any): MediaItem => ({
  id: Number(raw?.id) || 0,
  media_type: (raw?.media_type || "video") as MediaType,
  scan_path_id: Number(raw?.scan_path_id) || 0,
  folder_path: String(raw?.folder_path || "/"),
  file_name: String(raw?.file_name || ""),
  scraped_name: String(raw?.scraped_name || ""),
  cover: String(raw?.cover || ""),
  authors: String(raw?.authors || ""),
  plot: String(raw?.plot || ""),
  description: String(raw?.description || ""),
  genre: String(raw?.genre || ""),
  release_date: String(raw?.release_date || ""),
  rating: Number(raw?.rating) || 0,
  file_size: Number(raw?.file_size) || 0,
  duration: Number(raw?.duration) || 0,
  season: Number(raw?.season) || 0,
  episode: Number(raw?.episode) || 0,
  episodes: typeof raw?.episodes === "string" ? raw.episodes : "",
  album_name: String(raw?.album_name || ""),
  album_artist: String(raw?.album_artist || ""),
  track_number: Number(raw?.track_number) || 0,
  publisher: String(raw?.publisher || ""),
  isbn: String(raw?.isbn || ""),
  external_id: String(raw?.external_id || ""),
  hidden: !!raw?.hidden,
  scraper_source: String(raw?.scraper_source || ""),
  created_at: String(raw?.created_at || new Date().toISOString()),
  updated_at: String(raw?.updated_at || new Date().toISOString()),
  mime_type: String(raw?.mime_type || ""),
  reviews: String(raw?.reviews || ""),
  lyrics: String(raw?.lyrics || ""),
  video_type: String(raw?.video_type || ""),
  is_folder: !!raw?.is_folder,
  scraped_at: raw?.scraped_at || null,
  original_name: String(raw?.original_name || ""),
  thumb: String(raw?.thumb || ""),
  thumb_mime: String(raw?.thumb_mime || ""),
})

const normalizeScanPath = (raw: any): MediaScanPath => ({
  id: Number(raw?.id) || 0,
  media_type: (raw?.media_type || "video") as MediaType,
  name: String(raw?.name || ""),
  path: String(raw?.path || "/"),
  type_tag: String(raw?.type_tag || ""),
  content_tags: String(raw?.content_tags || ""),
  created_at: String(raw?.created_at || new Date().toISOString()),
  updated_at: String(raw?.updated_at || new Date().toISOString()),
  path_merge: !!raw?.path_merge,
  enable_scrape: raw?.enable_scrape === undefined ? true : !!raw.enable_scrape,
  last_scan_at: raw?.last_scan_at || null,
})

const normalizeConfig = (raw: any): MediaConfig => ({
  ...DEFAULT_CONFIG((raw?.media_type || "video") as MediaType),
  ...raw,
  media_type: (raw?.media_type || "video") as MediaType,
  enabled: !!raw?.enabled,
  thumbnail_mode: String(raw?.thumbnail_mode || "runtime"),
  thumbnail_path: String(raw?.thumbnail_path || "imgs"),
  store_thumbnail: raw?.store_thumbnail === undefined ? true : !!raw.store_thumbnail,
  scrape_concurrency: Number(raw?.scrape_concurrency) || 5,
  created_at: String(raw?.created_at || new Date().toISOString()),
  updated_at: String(raw?.updated_at || new Date().toISOString()),
  last_scan_at: raw?.last_scan_at || null,
  last_scrape_at: raw?.last_scrape_at || null,
  scraper_config: String(raw?.scraper_config || ""),
})

const normalizeUserData = (raw: any): MediaUserData => ({
  id: Number(raw?.id) || 0,
  user_id: Number(raw?.user_id) || 0,
  item_id: Number(raw?.item_id) || 0,
  episode_index: Number(raw?.episode_index) || 0,
  position_ticks: Number(raw?.position_ticks) || 0,
  duration_ticks: Number(raw?.duration_ticks) || 0,
  played: !!raw?.played,
  play_count: Number(raw?.play_count) || 0,
  is_favorite: !!raw?.is_favorite,
  updated_at: String(raw?.updated_at || new Date().toISOString()),
  rating: Number(raw?.rating) || 0,
  last_played_at: raw?.last_played_at || null,
})

const normalizeDb = (raw: any): MediaDb => {
  const base = emptyMediaDb()
  if (!raw || typeof raw !== "object") return base
  return {
    version: Number(raw.version) || MEDIA_DB_VERSION,
    next_id: Number(raw.next_id) || 1,
    configs: Array.isArray(raw.configs) ? raw.configs.map(normalizeConfig) : [],
    scan_paths: Array.isArray(raw.scan_paths)
      ? raw.scan_paths.map(normalizeScanPath)
      : [],
    items: Array.isArray(raw.items) ? raw.items.map(normalizeItem) : [],
    user_data: Array.isArray(raw.user_data)
      ? raw.user_data.map(normalizeUserData)
      : [],
    app_keys: Array.isArray(raw.app_keys) ? raw.app_keys : [],
    emby_devices: Array.isArray(raw.emby_devices) ? raw.emby_devices : [],
    playlists: Array.isArray(raw.playlists) ? raw.playlists : [],
    playlist_items: Array.isArray(raw.playlist_items)
      ? raw.playlist_items
      : [],
    play_queues: Array.isArray(raw.play_queues) ? raw.play_queues : [],
    item_shards: Array.isArray(raw.item_shards) ? raw.item_shards.map(String) : [],
    user_shards: Array.isArray(raw.user_shards) ? raw.user_shards.map(String) : [],
  }
}

const itemShardKey = (scanPathId: number) => `${ITEMS_PREFIX}${scanPathId}`
const userShardKey = (userId: number) => `${USERDATA_PREFIX}${userId}`
const thumbKey = (hash: string) => `${THUMB_PREFIX}${hash}`

/** 按 scan_path_id 分组（scan_path_id=0 兜底为一组） */
const groupItems = (items: MediaItem[]) => {
  const map = new Map<number, MediaItem[]>()
  for (const item of items) {
    const sid = Number(item.scan_path_id) || 0
    const list = map.get(sid) || []
    list.push(item)
    map.set(sid, list)
  }
  return map
}

const groupUserData = (rows: MediaUserData[]) => {
  const map = new Map<number, MediaUserData[]>()
  for (const row of rows) {
    const uid = Number(row.user_id) || 0
    const list = map.get(uid) || []
    list.push(row)
    map.set(uid, list)
  }
  return map
}

/** meta 文档（不含条目与用户数据） */
const buildMetaPayload = (db: MediaDb) => {
  const {
    items: _items,
    user_data: _userData,
    ...rest
  } = db
  return {
    ...rest,
    version: MEDIA_DB_VERSION,
    item_shards: Array.from(groupItems(db.items).keys())
      .sort((a, b) => a - b)
      .map(String),
    user_shards: Array.from(groupUserData(db.user_data).keys())
      .sort((a, b) => a - b)
      .map(String),
  }
}

/** 从 list() 返回的键名里还原分片 id（只接受纯数字，忽略损坏键） */
const shardIdsOf = (keys: string[], prefix: string) => {
  const out: string[] = []
  for (const key of keys) {
    if (!key.startsWith(prefix)) continue
    const id = key.slice(prefix.length)
    if (/^\d+$/.test(id)) out.push(id)
  }
  return out
}

/** 合并分片索引：去重、按数字序排列，只增不减 */
const mergeShardIds = (...lists: any[]) => {
  const set = new Set<string>()
  for (const list of lists) {
    if (!Array.isArray(list)) continue
    for (const value of list) {
      const id = String(value ?? "").trim()
      if (/^\d+$/.test(id)) set.add(id)
    }
  }
  return Array.from(set).sort((a, b) => Number(a) - Number(b))
}

/**
 * 提交前把本地 meta 与持久化版本合并。
 *
 * saveChain 只串行化**本实例**的写入：另一个实例可能在我们读取之后新增了
 * 分片（例如某用户首次上报播放进度）并写入 meta。若直接用本地快照覆盖，
 * 全局索引就会丢掉对方的条目，冷启动后那些分片不再被读取。
 * 这里在写入前重新读一次持久化 meta，把分片索引与 id 水位合并进去；
 * 分片本身还会在 getMediaDb 里按前缀枚举（见 listPersistedSecrets），
 * 因此即使索引仍然写丢，数据也不会不可见。
 */
async function mergeMetaForCommit(
  env: any,
  local: Record<string, any>,
): Promise<Record<string, any>> {
  const raw = await readPersistedSecret(env, META_KEY)
  if (!raw) return local
  try {
    const persisted = JSON.parse(raw)
    if (!persisted || typeof persisted !== "object") return local
    return {
      ...local,
      // next_id 只取更大值：避免把全局水位写回去，导致 id 被重复分配
      next_id: Math.max(
        Number(local.next_id) || 1,
        Number(persisted.next_id) || 1,
      ),
      item_shards: mergeShardIds(local.item_shards, persisted.item_shards),
      user_shards: mergeShardIds(local.user_shards, persisted.user_shards),
    }
  } catch {
    // 持久化内容损坏：按本地快照提交，至少不让本次写入失败
    return local
  }
}

function ensureConfigs(db: MediaDb) {
  for (const type of MEDIA_TYPES) {
    if (!db.configs.some((c) => c.media_type === type)) {
      db.configs.push(DEFAULT_CONFIG(type))
    }
  }
}

/**
 * 读取单个分片；分片内容可能因手工编辑/版本升级损坏，统一静默降级。
 */
async function readShardItems(env: any, sid: string): Promise<MediaItem[]> {
  try {
    const raw = await readPersistedSecret(env, itemShardKey(Number(sid)))
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.map(normalizeItem) : []
  } catch (e: any) {
    console.warn(`[media] read items shard ${sid} failed:`, e?.message || e)
    return []
  }
}

async function readShardUserData(env: any, uid: string): Promise<MediaUserData[]> {
  try {
    const raw = await readPersistedSecret(env, userShardKey(Number(uid)))
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.map(normalizeUserData) : []
  } catch (e: any) {
    console.warn(`[media] read userdata shard ${uid} failed:`, e?.message || e)
    return []
  }
}

export async function getMediaDb(env: any): Promise<MediaDb> {
  if (cache && Date.now() - cache.loadedAt < CACHE_TTL_MS) return cache.db
  if (cache && loadPromise) return cache.db
  if (loadPromise) return loadPromise

  loadPromise = (async () => {
    let db: MediaDb
    let legacyItems: MediaItem[] = []
    let legacyUserData: MediaUserData[] = []
    try {
      const raw = await readPersistedSecret(env, META_KEY)
      const parsed = raw ? JSON.parse(raw) : null
      db = normalizeDb(parsed)
      // 旧版单文档格式：items/user_data 直接挂在 meta 上
      if (Array.isArray(parsed?.items) && parsed.items.length > 0) {
        legacyItems = parsed.items.map(normalizeItem)
      }
      if (Array.isArray(parsed?.user_data) && parsed.user_data.length > 0) {
        legacyUserData = parsed.user_data.map(normalizeUserData)
      }
    } catch {
      db = emptyMediaDb()
    }

    ensureConfigs(db)

    // 分片本身才是权威来源：meta 里的索引会被其它实例覆盖（多实例各自保存时
    // 只写自己的条目），只按索引读取会永久丢掉对方的分片。这里按前缀枚举一遍
    // 并与索引取并集，索引退化为「少一次 list 的提示」。
    const [itemKeys, userKeys] = await Promise.all([
      listPersistedSecrets(env, ITEMS_PREFIX),
      listPersistedSecrets(env, USERDATA_PREFIX),
    ])
    const itemShardIds = mergeShardIds(
      db.item_shards,
      shardIdsOf(itemKeys, ITEMS_PREFIX),
    )
    const userShardIds = mergeShardIds(
      db.user_shards,
      shardIdsOf(userKeys, USERDATA_PREFIX),
    )
    // 补全后的索引写回内存快照，下一次保存会把它一起提交
    db.item_shards = itemShardIds
    db.user_shards = userShardIds

    const itemGroups: MediaItem[] = []
    if (legacyItems.length > 0) {
      itemGroups.push(...legacyItems)
    } else {
      for (const sid of itemShardIds) {
        itemGroups.push(...(await readShardItems(env, sid)))
      }
    }
    const userRows: MediaUserData[] = []
    if (legacyUserData.length > 0) {
      userRows.push(...legacyUserData)
    } else {
      for (const uid of userShardIds) {
        userRows.push(...(await readShardUserData(env, uid)))
      }
    }
    db.items = itemGroups
    db.user_data = userRows

    // 迁移：把旧单文档中的条目/用户数据拆分落盘，并清理 meta 中的大字段
    if (legacyItems.length > 0 || legacyUserData.length > 0) {
      const state: CacheState = {
        db,
        loadedAt: Date.now(),
        itemSnapshots: new Map(),
        userSnapshots: new Map(),
        metaSnapshot: "",
      }
      cache = state
      // 迁移写失败不能连带丢掉刚读出来的数据（否则下面的 catch 会回退到空库）
      try {
        await saveMediaDb(env, db)
      } catch (e: any) {
        console.warn("[media] legacy migration failed:", e?.message || e)
      }
    }

    cache = {
      db,
      loadedAt: Date.now(),
      itemSnapshots: cache?.itemSnapshots || new Map(),
      userSnapshots: cache?.userSnapshots || new Map(),
      metaSnapshot: cache?.metaSnapshot || "",
    }
    return db
  })()
    .catch((e) => {
      console.warn("[media] load db failed, fallback to empty:", e?.message || e)
      cache = {
        db: emptyMediaDb(),
        loadedAt: Date.now(),
        itemSnapshots: new Map(),
        userSnapshots: new Map(),
        metaSnapshot: "",
      }
      ensureConfigs(cache.db)
      return cache.db
    })
    .finally(() => {
      loadPromise = null
    })

  return loadPromise
}

/** 立即失效缓存（管理端导入/清除后调用，避免读到旧值） */
export function invalidateMediaCache() {
  cache = null
}

const serializeItems = (list: MediaItem[]) => JSON.stringify(list)
const serializeUsers = (list: MediaUserData[]) => JSON.stringify(list)

/**
 * 保存媒体库。按分片 diff，只写发生变化的部分。
 *
 * 写入顺序与失败语义：
 *   1. 先写条目 / 用户数据分片，任何一个失败立即终止（不再写 meta）；
 *   2. 全部分片成功后才提交 meta（分片索引 + 配置等）；
 *   3. 快照只在写入成功后才推进，失败时保持旧值，下一次保存会重新尝试。
 * 这样既不会「把失败当成功」，也不会发布指向未写入分片的索引。
 *
 * 注意：`db` 若与缓存不是同一对象，会先合并（调用方通常是同一个）。
 */
export function saveMediaDb(env: any, db?: MediaDb): Promise<void> {
  const target = db ?? cache?.db
  if (!target) return Promise.resolve()
  const state: CacheState =
    cache ??
    ({
      db: target,
      loadedAt: Date.now(),
      itemSnapshots: new Map(),
      userSnapshots: new Map(),
      metaSnapshot: "",
    } as CacheState)
  state.db = target
  state.loadedAt = Date.now()
  cache = state

  // diff 与写入都放进串行队列：快照只在真正写成功后才推进，因此排队的后续保存
  // 能看到前一次的结果；失败后重试同一份数据也不会被误判成「无变化」。
  saveChain = saveChain
    .catch(() => undefined)
    .then(async () => {
      const itemGroups = groupItems(target.items)
      const userGroups = groupUserData(target.user_data)

      const itemWrites: Array<{ sid: number; payload: string }> = []
      for (const [sid, list] of itemGroups) {
        const payload = serializeItems(list)
        if (state.itemSnapshots.get(String(sid)) !== payload) {
          itemWrites.push({ sid, payload })
        }
      }
      // 被清空的分片也要写空数组，否则删除 scan_path 后旧条目会「复活」
      for (const sid of Array.from(state.itemSnapshots.keys())) {
        if (!itemGroups.has(Number(sid))) {
          itemWrites.push({ sid: Number(sid), payload: "[]" })
        }
      }

      const userWrites: Array<{ uid: number; payload: string }> = []
      for (const [uid, list] of userGroups) {
        const payload = serializeUsers(list)
        if (state.userSnapshots.get(String(uid)) !== payload) {
          userWrites.push({ uid, payload })
        }
      }
      for (const uid of Array.from(state.userSnapshots.keys())) {
        if (!userGroups.has(Number(uid))) {
          userWrites.push({ uid: Number(uid), payload: "[]" })
        }
      }

      const localMeta = buildMetaPayload(target) as Record<string, any>
      const localMetaStr = JSON.stringify(localMeta)
      const metaChanged = state.metaSnapshot !== localMetaStr

      if (itemWrites.length === 0 && userWrites.length === 0 && !metaChanged) {
        return
      }

      try {
        for (const w of itemWrites) {
          if (!(await writePersistedSecret(env, itemShardKey(w.sid), w.payload))) {
            throw new Error(`items shard ${w.sid} write failed`)
          }
        }
        for (const w of userWrites) {
          if (!(await writePersistedSecret(env, userShardKey(w.uid), w.payload))) {
            throw new Error(`userdata shard ${w.uid} write failed`)
          }
        }
        // 所有分片都成功后才提交 meta，避免发布指向未写入分片的索引
        if (metaChanged) {
          const meta = await mergeMetaForCommit(env, localMeta)
          const metaStr = JSON.stringify(meta)
          if (!(await writePersistedSecret(env, META_KEY, metaStr))) {
            throw new Error("media meta write failed")
          }
          // 快照记录**本地视图**：持久化版本里可能含别的实例的分片，若拿合并
          // 结果当基准，之后每次保存都会误判成「meta 有变化」而反复重写。
          state.metaSnapshot = localMetaStr
          // 采纳其它实例推进过的 id 水位，避免后续分配复用已被占用的 id
          const nextId = Number(meta.next_id) || 1
          if (nextId > (Number(target.next_id) || 1)) target.next_id = nextId
        }
        // 只有全部写成功才推进快照；失败时保持旧值，重试会重新写入
        for (const w of itemWrites) {
          state.itemSnapshots.set(String(w.sid), w.payload)
        }
        for (const w of userWrites) {
          state.userSnapshots.set(String(w.uid), w.payload)
        }
      } catch (err: any) {
        console.error("[media] save failed:", err?.message || err)
        // 内存里的改动没有落盘：让下一次读取回到持久化版本，
        // 避免界面继续展示「看起来已保存」的进度。
        state.loadedAt = 0
        throw err
      }
    })

  return saveChain
}

/**
 * 只写 meta（配置/扫描路径/播放列表变更时用，避免触碰条目分片）。
 *
 * 与 saveMediaDb 共用 saveChain：meta 里带着分片索引，若它抢在排队中的分片
 * 写入之前落盘，就会发布指向尚未写入分片的索引（冷启动后读到空分片）。
 * 失败语义同 saveMediaDb：抛错 + 不推进快照 + 失效缓存，下一次保存重试。
 */
export function saveMediaMeta(env: any, db: MediaDb): Promise<void> {
  const state: CacheState =
    cache ??
    ({
      db,
      loadedAt: Date.now(),
      itemSnapshots: new Map(),
      userSnapshots: new Map(),
      metaSnapshot: "",
    } as CacheState)

  saveChain = saveChain
    .catch(() => undefined)
    .then(async () => {
      const localMeta = buildMetaPayload(db) as Record<string, any>
      const localMetaStr = JSON.stringify(localMeta)
      if (state.metaSnapshot === localMetaStr) return
      try {
        const meta = await mergeMetaForCommit(env, localMeta)
        const metaStr = JSON.stringify(meta)
        if (!(await writePersistedSecret(env, META_KEY, metaStr))) {
          throw new Error("media meta write failed")
        }
        // 成功后才推进快照（记录本地视图，理由同 saveMediaDb），
        // 失败时下一次保存会重新写入。
        state.metaSnapshot = localMetaStr
        state.db = db
        state.loadedAt = Date.now()
        // 采纳其它实例推进过的 id 水位，避免后续分配复用已被占用的 id
        const nextId = Number(meta.next_id) || 1
        if (nextId > (Number(db.next_id) || 1)) db.next_id = nextId
      } catch (err: any) {
        console.error("[media] save meta failed:", err?.message || err)
        // meta 没落盘：让下一次读取回到持久化版本，避免界面继续展示未保存的改动
        state.loadedAt = 0
        throw err
      }
    })

  return saveChain
}

export function getNextId(db: MediaDb) {
  const id = db.next_id || 1
  db.next_id = id + 1
  return id
}

export function nextId(db: MediaDb) {
  return getNextId(db)
}

/** 批量分配 id（扫描时避免每条都推进 next_id 后反复写 meta） */
export function allocateIds(db: MediaDb, count: number): number[] {
  const start = db.next_id || 1
  db.next_id = start + count
  return Array.from({ length: count }, (_, i) => start + i)
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
  unscraped?: boolean
  missing_scrape?: boolean
}

const compare = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0)

export function queryItems(db: MediaDb, q: MediaQuery) {
  let list = db.items.filter((item) => {
    if (q.media_type && item.media_type !== q.media_type) return false
    if (q.scan_path_id && item.scan_path_id !== q.scan_path_id) return false
    if (q.folder_path && item.folder_path !== q.folder_path) return false
    if (q.ids && !q.ids.includes(item.id)) return false
    if (q.hidden !== undefined && item.hidden !== q.hidden) return false
    if (q.unscraped && item.scraped_at) return false
    if (q.missing_scrape && item.scraped_at) return false
    if (q.path_prefix && q.path_prefix !== "/") {
      const prefix = q.path_prefix.replace(/\/+$/, "") + "/"
      if (!`${item.folder_path}/`.startsWith(prefix)) return false
    }
    if (q.keyword) {
      const k = q.keyword.toLowerCase()
      if (
        !item.file_name.toLowerCase().includes(k) &&
        !(item.scraped_name || "").toLowerCase().includes(k) &&
        !(item.album_name || "").toLowerCase().includes(k) &&
        !(item.album_artist || "").toLowerCase().includes(k)
      ) {
        return false
      }
    }
    if (q.type_tag || q.content_tag) {
      const sp = db.scan_paths.find((p) => p.id === item.scan_path_id)
      if (!sp) return false
      if (q.type_tag && sp.type_tag !== q.type_tag) return false
      if (q.content_tag) {
        const tags = String(sp.content_tags || "")
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
        if (!tags.includes(q.content_tag)) return false
      }
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
    } else if (by === "rating") {
      av = a.rating
      bv = b.rating
    } else if (by === "updated") {
      av = a.updated_at || ""
      bv = b.updated_at || ""
    } else {
      av = (a.scraped_name || a.file_name).toLowerCase()
      bv = (b.scraped_name || b.file_name).toLowerCase()
    }
    const cmp = typeof av === "number" ? av - bv : compare(av, bv)
    return cmp * dir
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
  data: Partial<MediaItem> &
    Pick<MediaItem, "media_type" | "folder_path" | "file_name">,
): MediaItem {
  const existing = db.items.find(
    (i) =>
      i.folder_path === data.folder_path &&
      i.file_name === data.file_name &&
      i.media_type === data.media_type &&
      (i.album_name || "") === (data.album_name || ""),
  )
  const now = new Date().toISOString()
  if (existing) {
    Object.assign(existing, data, { updated_at: now })
    return existing
  }
  const item: MediaItem = {
    id: data.id || nextId(db),
    media_type: data.media_type,
    scan_path_id: data.scan_path_id || 0,
    folder_path: data.folder_path,
    file_name: data.file_name,
    scraped_name: data.scraped_name || "",
    cover: data.cover || "",
    authors: data.authors || "",
    plot: data.plot || "",
    description: data.description || "",
    genre: data.genre || "",
    release_date: data.release_date || "",
    rating: data.rating || 0,
    file_size: data.file_size || 0,
    duration: data.duration || 0,
    season: data.season || 0,
    episode: data.episode || 0,
    episodes: data.episodes || "",
    album_name: data.album_name || "",
    album_artist: data.album_artist || "",
    track_number: data.track_number || 0,
    publisher: data.publisher || "",
    isbn: data.isbn || "",
    external_id: data.external_id || "",
    hidden: !!data.hidden,
    scraper_source: data.scraper_source || "",
    created_at: data.created_at || now,
    updated_at: now,
    mime_type: data.mime_type || "",
    reviews: data.reviews || "",
    lyrics: data.lyrics || "",
    video_type: data.video_type || "",
    is_folder: !!data.is_folder,
    scraped_at: data.scraped_at || null,
    original_name: data.original_name || "",
    thumb: data.thumb || "",
    thumb_mime: data.thumb_mime || "",
  }
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
      rating: 0,
      last_played_at: null,
    }
    db.user_data.push(row)
  }
  return row
}

export function listFavorites(db: MediaDb, userId: number) {
  return db.user_data.filter((d) => d.user_id === userId && d.is_favorite)
}

export function listResume(db: MediaDb, userId: number, limit = 200) {
  return db.user_data
    .filter(
      (d) =>
        d.user_id === userId &&
        !d.played &&
        d.position_ticks > 0 &&
        d.episode_index !== undefined,
    )
    .sort((a, b) => (a.updated_at < b.updated_at ? 1 : -1))
    .slice(0, Math.max(1, limit))
}

// ==================== 播放列表 ====================

export function listPlaylists(db: MediaDb, userId: number) {
  return db.playlists
    .filter((p) => p.user_id === userId || p.public)
    .sort((a, b) => a.id - b.id)
}

export function getPlaylist(db: MediaDb, id: number) {
  return db.playlists.find((p) => p.id === id)
}

export function playlistItems(db: MediaDb, playlistId: number) {
  return db.playlist_items
    .filter((i) => i.playlist_id === playlistId)
    .sort((a, b) => a.order - b.order)
}

export function createPlaylist(
  db: MediaDb,
  userId: number,
  name: string,
  itemIds: number[] = [],
  comment = "",
  isPublic = false,
): MediaPlaylist {
  const now = new Date().toISOString()
  const playlist: MediaPlaylist = {
    id: nextId(db),
    user_id: userId,
    name,
    comment,
    public: isPublic,
    item_count: 0,
    created_at: now,
    updated_at: now,
  }
  db.playlists.push(playlist)
  replacePlaylistItems(db, playlist.id, itemIds)
  playlist.item_count = playlistItems(db, playlist.id).length
  return playlist
}

export function replacePlaylistItems(
  db: MediaDb,
  playlistId: number,
  itemIds: number[],
) {
  db.playlist_items = db.playlist_items.filter(
    (i) => i.playlist_id !== playlistId,
  )
  itemIds.forEach((itemId, idx) => {
    if (!findItem(db, itemId)) return
    db.playlist_items.push({
      id: nextId(db),
      playlist_id: playlistId,
      item_id: itemId,
      episode_index: 0,
      order: idx,
    })
  })
}

export function updatePlaylist(
  db: MediaDb,
  playlist: MediaPlaylist,
  patch: {
    name?: string
    comment?: string
    public?: boolean
    itemIds?: number[]
  },
) {
  if (patch.name !== undefined) playlist.name = patch.name
  if (patch.comment !== undefined) playlist.comment = patch.comment
  if (patch.public !== undefined) playlist.public = patch.public
  if (patch.itemIds !== undefined) {
    replacePlaylistItems(db, playlist.id, patch.itemIds)
  }
  playlist.item_count = playlistItems(db, playlist.id).length
  playlist.updated_at = new Date().toISOString()
}

export function deletePlaylist(db: MediaDb, id: number) {
  db.playlists = db.playlists.filter((p) => p.id !== id)
  db.playlist_items = db.playlist_items.filter((i) => i.playlist_id !== id)
}

// ==================== 播放队列 ====================

export function savePlayQueue(
  db: MediaDb,
  userId: number,
  entryIds: number[],
  current = "",
  position = 0,
) {
  let queue = db.play_queues.find((q) => q.user_id === userId)
  if (!queue) {
    queue = {
      user_id: userId,
      current,
      position,
      changed: new Date().toISOString(),
      entry_ids: [],
    }
    db.play_queues.push(queue)
  }
  queue.entry_ids = entryIds
  queue.current = current
  queue.position = position
  queue.changed = new Date().toISOString()
  return queue
}

export function getPlayQueue(db: MediaDb, userId: number) {
  return db.play_queues.find((q) => q.user_id === userId) || null
}

// ==================== 缩略图 ====================

export async function saveThumb(
  env: any,
  hash: string,
  bytes: Uint8Array,
  mime: string,
): Promise<string> {
  if (!hash || bytes.length === 0 || bytes.length > MAX_THUMB_BYTES) return ""
  const payload = JSON.stringify({
    mime,
    data: bytesToBase64(bytes),
  })
  const ok = await writePersistedSecret(env, thumbKey(hash), payload)
  return ok ? `thumb:${hash}` : ""
}

export async function readThumb(
  env: any,
  hash: string,
): Promise<{ mime: string; bytes: Uint8Array } | null> {
  const raw = await readPersistedSecret(env, thumbKey(hash))
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw)
    if (!parsed?.data) return null
    return {
      mime: String(parsed.mime || "image/jpeg"),
      bytes: base64ToBytes(String(parsed.data)),
    }
  } catch {
    return null
  }
}

function bytesToBase64(bytes: Uint8Array): string {
  let bin = ""
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return btoa(bin)
}

function base64ToBytes(value: string): Uint8Array {
  const bin = atob(value)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

// ==================== 设置 ====================

export async function getSettingsMap(
  env: any,
): Promise<Record<string, string>> {
  const { getDb } = await import("../model/db")
  const { disableTranscodeSettings } = await import("../model/transcode-guard")
  const db = await getDb(env)
  const map: Record<string, string> = {}
  for (const s of db.settings || []) map[s.key] = String(s.value ?? "")
  // Worker 无 ffmpeg：转码开关一律按关闭处理
  return disableTranscodeSettings(map) as Record<string, string>
}

/** 数据一致性检查：items 引用不存在的 scan_path 时归零，供导入/删除后修复 */
export function repairItemScanPath(db: MediaDb) {
  const ids = new Set(db.scan_paths.map((p) => p.id))
  let fixed = 0
  for (const item of db.items) {
    if (item.scan_path_id && !ids.has(item.scan_path_id)) {
      item.scan_path_id = 0
      fixed += 1
    }
  }
  // 清理孤儿用户数据与播放列表条目
  const itemIds = new Set(db.items.map((i) => i.id))
  const beforeUser = db.user_data.length
  db.user_data = db.user_data.filter((d) => itemIds.has(d.item_id))
  const beforePlaylist = db.playlist_items.length
  db.playlist_items = db.playlist_items.filter((i) => itemIds.has(i.item_id))
  for (const p of db.playlists) {
    p.item_count = db.playlist_items.filter((i) => i.playlist_id === p.id).length
  }
  return {
    fixed_scan_path: fixed,
    removed_user_data: beforeUser - db.user_data.length,
    removed_playlist_items: beforePlaylist - db.playlist_items.length,
  }
}
