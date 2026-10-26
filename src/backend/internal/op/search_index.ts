/**
 * 站内搜索索引（Search Index）—— 高性能 / 低占用 / 低存储。
 *
 * 设计目标（对齐「优化索引功能」）：
 *   1. 低存储：索引条目只保留搜索/列表必需字段（name/parent/size/mtime/
 *      is_dir/type），以紧凑 JSON tuple(数组) 序列化 —— 无 JSON 对象键重复；
 *      gzip 压缩 + base64 分片，写入独立的 KV key，不再内嵌进主配置 JSON。
 *      旧实现把带 raw_url/sign/thumb/hash 的全量 FileItem 象数组塞进
 *      db.search_index，随 saveDb 全量重写主配置，体积数 MB 且每个请求
 *      getDb() 都要读回 —— 索引成了全站性能黑洞。
 *   2. 高性能：构建为有界并发 BFS（默认 4），复用 listItems 的文件树缓存与
 *      singleflight；单次请求处理不完时分片游标续建（serverless 无后台任务），
 *      不再像旧实现一样靠 max_results=2000 静默截断。
 *   3. 低占用：/fs/search 命中索引时改为内存过滤 + 分页（不打下游网盘 API）；
 *      未建好索引时回退实时遍历，行为与旧版完全兼容。
 *
 * 存储布局（跨 KV/D1/MySQL 层一致，经 getStorageBackend().driver 直写）：
 *   openlist_search_index_meta    → { v,total,is_done,updated_at,error, shards, building_at }
 *   openlist_search_index_shard_i → base64(gzip(JSON tuple[]))
 *   openlist_search_index_cursor  → { queue, scanned, total, started_at }
 *
 * 可调环境变量（均可选；非法值回退默认，不会中断构建）：
 *
 * | 变量 | 默认值 | 说明 |
 * | :-- | :-- | :-- |
 * | `INDEX_SHARD_SIZE` | `4000` | 每个分片的条目数 |
 * | `INDEX_MAX_SHARDS` | `200` | 分片数上限（防御异常大库写出过多 key） |
 * | `INDEX_MAX_ENTRIES` | `600000` | 总条目硬上限（防御超大挂载打爆内存） |
 * | `INDEX_PASS_DIR_BUDGET` | `400` | 单 pass 处理的目录数预算 |
 * | `INDEX_WALK_CONCURRENCY` | `4` | BFS 目录并发（1–8） |
 * | `INDEX_PASS_WALL_MS` | `45000` | 单 pass 墙钟预算（毫秒） |
 * | `INDEX_MAX_ERRORS` | `100` | 连续 list 失败目录数阈值；`0` = 不限制 |
 * | `INDEX_BUILD_LEASE_MS` | `max(300000, 5×PASS_WALL_MS)` | 跨 isolate 构建租约时长；超时视为陈旧锁 |
 * | `INDEX_LOG_STATS` | `false` | 输出分片压缩率等调试统计 |
 */
import { listItems } from "./storage"
import type { FileItem } from "../driver/base"
import { canAccess, getNearestMeta } from "../../pkg/meta"
import type { Meta } from "../../pkg/meta"
import type { UserPermissionObj } from "../../pkg/permission"
import { getStorageBackend } from "../model/store/backend"

// ―― 存储键前缀 ――――――――――――――――――――――――――――――――――――
export const INDEX_META_KEY = "openlist_search_index_meta"
export const INDEX_SHARD_PREFIX = "openlist_search_index_shard_"
export const INDEX_CURSOR_KEY = "openlist_search_index_cursor"

/** 每个分片最多容纳的条目数（原始 tuple 数，编码后 ~百 KB） */
const SHARD_MAX_ITEMS = 4000
/** 分片数上限（防御异常大库写出 500 个 key） */
const SHARD_MAX_COUNT = 200
/** 总条目数上限（防御超大挂载把 Worker 内存打爆） */
const ITEMS_HARD_CAP = 600_000
/** 默认单 pass 处理目录数预算 */
export const DEFAULT_PASS_DIR_BUDGET = 400
/** 默认 BFS 目录并发 */
export const DEFAULT_WALK_CONCURRENCY = 4
/** 单 pass 的墙钟预算（毫秒）——到点必须写 cursor 交还控制权 */
export const DEFAULT_PASS_WALL_MS = 45_000
/** 默认 list 失败目录数阈值（<=0 表示不限制） */
const DEFAULT_MAX_ERRORS = 100
/** 默认跨 isolate 构建租约时长（毫秒） */
const DEFAULT_BUILD_LEASE_MS = 300_000

/** 已解析的索引运行参数（全部可由 INDEX_* 环境变量覆盖） */
export interface SearchIndexConfig {
  shardSize: number
  shardMaxCount: number
  itemsHardCap: number
  passDirBudget: number
  walkConcurrency: number
  passWallMs: number
  maxErrors: number
  buildLeaseMs: number
  logStats: boolean
}

/** 读取环境变量（同时兼容注入的 env 对象与 process.env）。 */
function readRawConfig(key: string, env?: any): string {
  const e = env && typeof env === "object" ? env : {}
  const fromEnv = e[key]
  if (fromEnv !== undefined && fromEnv !== null && String(fromEnv) !== "") {
    return String(fromEnv)
  }
  if (typeof process !== "undefined" && process.env) {
    const fromProcess = (process.env as any)[key]
    if (fromProcess !== undefined && fromProcess !== null) {
      return String(fromProcess)
    }
  }
  return ""
}

/** 读取整数配置并夹到 [min,max]；无法解析时回退默认值。 */
function readIntConfig(
  key: string,
  fallback: number,
  min: number,
  max: number,
  env?: any,
): number {
  const raw = readRawConfig(key, env).trim()
  if (!raw) return fallback
  const n = parseInt(raw, 10)
  if (!Number.isFinite(n)) return fallback
  return Math.min(max, Math.max(min, n))
}

/** 读取布尔配置（1/true/yes/on 为真）。 */
function readBoolConfig(key: string, fallback: boolean, env?: any): boolean {
  const raw = readRawConfig(key, env).trim().toLowerCase()
  if (!raw) return fallback
  if (["1", "true", "yes", "on", "enable", "enabled"].includes(raw)) return true
  if (["0", "false", "no", "off", "disable", "disabled"].includes(raw))
    return false
  return fallback
}

/** 解析索引运行参数（每次调用都读取 env，便于按部署覆盖）。 */
export function getSearchIndexConfig(env?: any): SearchIndexConfig {
  const passWallMs = readIntConfig(
    "INDEX_PASS_WALL_MS",
    DEFAULT_PASS_WALL_MS,
    1_000,
    300_000,
    env,
  )
  return {
    shardSize: readIntConfig(
      "INDEX_SHARD_SIZE",
      SHARD_MAX_ITEMS,
      1,
      100_000,
      env,
    ),
    shardMaxCount: readIntConfig(
      "INDEX_MAX_SHARDS",
      SHARD_MAX_COUNT,
      1,
      10_000,
      env,
    ),
    itemsHardCap: readIntConfig(
      "INDEX_MAX_ENTRIES",
      ITEMS_HARD_CAP,
      1,
      10_000_000,
      env,
    ),
    passDirBudget: readIntConfig(
      "INDEX_PASS_DIR_BUDGET",
      DEFAULT_PASS_DIR_BUDGET,
      1,
      2_000_000,
      env,
    ),
    walkConcurrency: readIntConfig(
      "INDEX_WALK_CONCURRENCY",
      DEFAULT_WALK_CONCURRENCY,
      1,
      8,
      env,
    ),
    passWallMs,
    maxErrors: readIntConfig(
      "INDEX_MAX_ERRORS",
      DEFAULT_MAX_ERRORS,
      0,
      100_000,
      env,
    ),
    buildLeaseMs: readIntConfig(
      "INDEX_BUILD_LEASE_MS",
      // 租约必须覆盖最长的单次操作（update 使用 passWallMs * 4）
      Math.max(DEFAULT_BUILD_LEASE_MS, passWallMs * 5),
      10_000,
      3_600_000,
      env,
    ),
    logStats: readBoolConfig("INDEX_LOG_STATS", false, env),
  }
}

export interface IndexMeta {
  /** 编码版本 */
  v: number
  total: number
  is_done: boolean
  updated_at: string | null
  error: string
  shards: number
  /** 构建租约开始时间；非空表示有 pass 正在写索引（用于跨 isolate 防并发） */
  building_at?: string | null
}

export interface IndexCursor {
  /** 待处理队列 [{物理/虚拟目录路径, 层级}] */
  queue: { path: string; depth: number }[]
  scanned: number
  total: number
  started_at: string
  max_depth: number
  /** 启动以来 list 失败的目录数（诊断用） */
  failed: number
}

/** 索引条目（存储/搜索统一形态） */
export interface IndexTuple {
  /** 文件/目录名 */
  n: string
  /** 所在的虚拟父目录（不以 / 结尾，根为 ""） */
  p: string
  size: number
  /** ISO 时间字符串（gzip 对重复前缀友好） */
  m: string
  is_dir: boolean
  /** FileItem.type（前端按类型展示图标） */
  t: number
}

// ―― gzip 编解码（Workers / Node 18+ 内建 CompressionStream）――――――――

async function gzipEncode(text: string): Promise<Uint8Array> {
  const CS = (globalThis as any).CompressionStream
  if (!CS) throw new Error("CompressionStream unavailable in this runtime")
  const stream = new Blob([text]).stream().pipeThrough(new CS("gzip"))
  const buf = await new Response(stream).arrayBuffer()
  return new Uint8Array(buf)
}

async function gzipDecode(bytes: Uint8Array): Promise<string> {
  const DS = (globalThis as any).DecompressionStream
  if (!DS) throw new Error("DecompressionStream unavailable in this runtime")
  const stream = new Blob([bytes as any]).stream().pipeThrough(new DS("gzip"))
  return await new Response(stream).text()
}

function u8ToBase64(bytes: Uint8Array): string {
  let bin = ""
  const CH = 0x8000
  for (let i = 0; i < bytes.length; i += CH) {
    bin += String.fromCharCode(
      ...(bytes.subarray(i, Math.min(i + CH, bytes.length)) as any),
    )
  }
  return btoa(bin)
}

function base64ToU8(b64: string): Uint8Array {
  const bin = atob(b64)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

/** tuple → JSON → gzip → base64 */
export async function encodeShard(tuples: IndexTuple[]): Promise<string> {
  const gz = await gzipEncode(JSON.stringify(tuples))
  return u8ToBase64(gz)
}

/** base64 → gunzip → JSON → tuple（对非法数据容错为 null） */
export async function decodeShard(b64: string): Promise<IndexTuple[] | null> {
  try {
    const parsed = JSON.parse(await gzipDecode(base64ToU8(b64)))
    return Array.isArray(parsed) ? (parsed as IndexTuple[]) : null
  } catch {
    return null
  }
}

/** 传入虚拟父目录（root 为 ""），得到与 c 侧一致的纯 parent 键值 */
export function normalizeParentKey(dirPath: string): string {
  const p = (dirPath || "").replace(/\/+/g, "/")
  return p === "/" ? "" : p.replace(/\/+$/, "")
}

/** 拼接子路径，与 op/search.ts 的 walk 保持一致：
 * "/"  + name → "/name"；"/a/" → "/a/name"（多余斜杠归一） */
export function joinChildPath(dirPath: string, name: string): string {
  const base = dirPath === "/" ? "" : dirPath
  return `${base.replace(/\/+$/, "")}/${name}`
}

// ―― 构建：有界并发 BFS + 游标续建 ―――――――――――――――――

export interface ListFn {
  (dirPath: string): Promise<{ content: FileItem[] }>
}

interface WalkState {
  /** BFS 队列（含 depth 语义，aggregate 需要同步知道当前深度） */
  pending: { path: string; depth: number; parentKey: string }[]
}

/**
 * 泛型化遍历：仅处理 `state.pending` 中的目录直至预算耗尽或队列清空，
 * 追加条目到 col，子目录压回 state.pending。
 */
export async function walkPass(
  state: WalkState,
  col: IndexTuple[],
  lister: ListFn,
  opts: {
    maxDepth: number
    dirBudget: number
    concurrency: number
    wallMs: number
    hardCap: number
    deadlineAt: number
  },
): Promise<{ scanned: number; failed: number; exhausted: boolean }> {
  let scanned = 0
  let failed = 0
  for (;;) {
    if (state.pending.length === 0) return { scanned, failed, exhausted: true }
    if (scanned >= opts.dirBudget) return { scanned, failed, exhausted: false }
    if (Date.now() > opts.deadlineAt)
      return { scanned, failed, exhausted: false }

    // 一批：按并发上限切队列
    const batch = state.pending.splice(0, Math.max(1, opts.concurrency))
    const results = await Promise.all(
      batch.map(async (job) => {
        try {
          const res = await lister(job.path)
          return { job, items: res.content || [], ok: true }
        } catch {
          return { job, items: [] as FileItem[], ok: false }
        }
      }),
    )

    const nextJobs: { path: string; depth: number; parentKey: string }[] = []
    for (const { job, items, ok } of results) {
      scanned++
      if (!ok) failed++
      const parentKey = job.parentKey
      for (const item of items) {
        const isMountPoint = item.is_dir && !item.sign
        if (!isMountPoint) {
          if (col.length < opts.hardCap) {
            col.push({
              n: item.name,
              p: parentKey,
              size: Number(item.size) || 0,
              m: item.modified || "",
              is_dir: !!item.is_dir,
              t: item.type ?? 0,
            })
          }
        }
        if (item.is_dir && job.depth + 1 <= opts.maxDepth) {
          // 挂载点不作为条目，但仍要递归进入（与实时搜索 walk 语义一致）
          const childPath = joinChildPath(
            parentKey === "" ? "/" : parentKey,
            item.name,
          )
          nextJobs.push({
            path: childPath,
            depth: job.depth + 1,
            parentKey: childPath.replace(/\/+$/, ""),
          })
        }
      }
    }

    state.pending.push(...nextJobs)
  }
}

/** 供测试 / 内部重放的便捷包装 */
export function newWalkState(root: string): WalkState {
  return {
    pending: [
      {
        path: root || "/",
        depth: 0,
        parentKey: normalizeParentKey(root || "/"),
      },
    ],
  }
}

async function getDriver(env?: any) {
  const { driver } = await getStorageBackend(env)
  return driver
}

export async function readIndexMeta(env?: any): Promise<IndexMeta | null> {
  try {
    const driver = await getDriver(env)
    const raw = await driver.get(INDEX_META_KEY, env)
    if (!raw) return null
    const meta = JSON.parse(raw)
    if (!meta || typeof meta !== "object") return null
    return meta as IndexMeta
  } catch {
    return null
  }
}

/** 兼容旧调用：保序读取（未建索引时返回 null） */
export async function loadIndexTuples(env?: any): Promise<IndexTuple[] | null> {
  const meta = await readIndexMeta(env)
  if (!meta) return null
  const driver = await getDriver(env)
  const shards: Promise<string | null>[] = []
  // 以 meta.shards 为准读取：即使管理员后来调小 INDEX_MAX_SHARDS，
  // 也不能把已建好的索引截断。仅保留 10000 的绝对防御上限。
  for (let i = 0; i < Math.min(meta.shards || 0, 10_000); i++) {
    shards.push(driver.get(`${INDEX_SHARD_PREFIX}${i}`, env))
  }
  const raws = await Promise.all(shards)
  const out: IndexTuple[] = []
  for (const raw of raws) {
    if (!raw) continue
    const decoded = await decodeShard(raw)
    if (decoded) out.push(...decoded)
  }
  return out
}

async function deleteAllShards(env?: any, knownShards = 0): Promise<void> {
  const cfg = getSearchIndexConfig(env)
  const driver = await getDriver(env)
  let keys: string[] = []
  let listed = false
  try {
    keys = await driver.list(INDEX_SHARD_PREFIX, env)
    listed = true
  } catch {
    listed = false
  }
  // list 不可用时按「旧 meta 分片数 / 当前上限」兜底清除，避免降配后残留孤儿分片
  if (!listed) {
    const limit = Math.max(knownShards, cfg.shardMaxCount)
    keys = Array.from({ length: limit }, (_, i) => `${INDEX_SHARD_PREFIX}${i}`)
  }
  await Promise.all(keys.map((k) => driver.delete(k, env).catch(() => {})))
}

async function writeIndex(
  env?: any,
  tuples: IndexTuple[] = [],
  metaPatch: Partial<IndexMeta> = {},
): Promise<IndexMeta> {
  const cfg = getSearchIndexConfig(env)
  const driver = await getDriver(env)
  const existing = await readIndexMeta(env)
  await deleteAllShards(env, existing?.shards || 0)
  const shards: string[] = []
  for (let i = 0; i < tuples.length; i += cfg.shardSize) {
    if (shards.length >= cfg.shardMaxCount) break
    const chunk = tuples.slice(i, i + cfg.shardSize)
    const b64 = await encodeShard(chunk)
    if (cfg.logStats) {
      const rawBytes = new TextEncoder().encode(JSON.stringify(chunk)).length
      // base64 长度换算回压缩后字节数（不含末尾 padding 的误差可忽略）
      const gzBytes = Math.floor((b64.length * 3) / 4)
      console.debug(
        `[search-index] shard=${i / cfg.shardSize} entries=${chunk.length} ` +
          `raw=${rawBytes}B gzip=${gzBytes}B ratio=${rawBytes ? (gzBytes / rawBytes).toFixed(3) : "-"}`,
      )
    }
    shards.push(b64)
  }
  await Promise.all(
    shards.map((s, i) => driver.put(`${INDEX_SHARD_PREFIX}${i}`, s, env)),
  )
  const meta: IndexMeta = {
    v: 1,
    total: tuples.length,
    is_done: metaPatch.is_done !== false,
    updated_at: metaPatch.updated_at || new Date().toISOString(),
    error: metaPatch.error || "",
    shards: shards.length,
    building_at: metaPatch.building_at ?? null,
  }
  await driver.put(INDEX_META_KEY, JSON.stringify(meta), env)
  return meta
}

/**
 * 跨 isolate 构建租约（best-effort）。
 *
 * 进程内的并发已由 passInflight 合并；但 serverless 会同时跑多个 isolate，
 * 仅靠内存锁无法阻止两个 pass 同时写分片 / 游标。这里在 meta 里写 building_at，
 * 其它 isolate 看到未过期的租约就直接返回 busy，避免互相覆盖。
 *
 * 注：通用 driver 没有 CAS，KV 还是最终一致性，因此这是「尽力而为」的软锁：
 * 极端竞态下仍可能双写，但能把常见的多标签页连点 / 重试放大挡在门外。
 */
type LeaseResult =
  | { ok: true; leaseAt: string }
  | { ok: false; meta: IndexMeta }

async function acquireBuildLease(
  env: any,
  cfg: SearchIndexConfig,
): Promise<LeaseResult> {
  const driver = await getDriver(env)
  const meta = await readIndexMeta(env)
  if (meta?.building_at) {
    const at = Date.parse(meta.building_at)
    if (Number.isFinite(at) && Date.now() - at < cfg.buildLeaseMs) {
      return { ok: false, meta }
    }
  }
  const leaseAt = new Date().toISOString()
  const base: IndexMeta = meta || {
    v: 1,
    total: 0,
    is_done: false,
    updated_at: null,
    error: "",
    shards: 0,
  }
  await driver.put(
    INDEX_META_KEY,
    JSON.stringify({ ...base, building_at: leaseAt }),
    env,
  )
  // KV 最终一致：写入后稍等再读回，若租约已被并发写者覆盖则让出，
  // 避免两个 isolate 在空/陈旧锁上同时认为自己拿到了锁。
  await new Promise((r) => setTimeout(r, 100))
  const check = await readIndexMeta(env)
  if (check?.building_at && check.building_at !== leaseAt) {
    return { ok: false, meta: check }
  }
  return { ok: true, leaseAt }
}

async function releaseBuildLease(env: any, leaseAt: string): Promise<void> {
  try {
    const meta = await readIndexMeta(env)
    if (meta?.building_at !== leaseAt) return
    const driver = await getDriver(env)
    await driver.put(
      INDEX_META_KEY,
      JSON.stringify({ ...meta, building_at: null }),
      env,
    )
  } catch {
    // 释放失败只会让租约在 buildLeaseMs 后自然过期，不影响正确性
  }
}

export async function clearSearchIndex(env?: any): Promise<void> {
  const driver = await getDriver(env)
  const meta = await readIndexMeta(env)
  await deleteAllShards(env, meta?.shards || 0)
  await Promise.all([
    driver.delete(INDEX_META_KEY, env).catch(() => {}),
    driver.delete(INDEX_CURSOR_KEY, env).catch(() => {}),
  ])
}

/** 内存级 inflight 合并，避免管理员连点 build 时多个 pass 并行写分片 */
const passInflight = new WeakMap<object, Promise<PassResult>>()

export interface PassResult {
  done: boolean
  total: number
  scanned: number
  failed: number
  error: string
  /** 有其它 pass 持有构建租约（本调用未执行） */
  busy?: boolean
}

/**
 * 推进一 pass 索引构建。可并发安全（同 env 的并发调用共享同一个 Promise）。
 *
 * 语义：
 *   - 首次调用：以 "/" 为根建立 cursor（全量重建）。
 *   - cursor 已存在：从 cursor pending 队列续建。
 *   - 队列清空时写 meta(shards) 且 done；写空_tuples 或 cursor 都遵循同一
 *     写入路径 —— db 主配置 JSON 不再有索引字段。
 */
export async function runIndexPass(
  env?: any,
  opts: {
    max_depth?: number
    dir_budget?: number
    concurrency?: number
    wall_ms?: number
    /** 测试注入的 lister；缺省 = listItems（走文件树缓存 + singleflight） */
    lister?: ListFn
  } = {},
): Promise<PassResult> {
  const inflightKeyObj = (env && typeof env === "object" ? env : {}) as object
  const pending = passInflight.get(inflightKeyObj)
  if (pending) return pending

  const exec = (async (): Promise<PassResult> => {
    const cfg = getSearchIndexConfig(env)
    const maxDepth = Math.min(30, Math.max(0, opts.max_depth ?? 20))
    const dirBudget = Math.max(1, opts.dir_budget ?? cfg.passDirBudget)
    const concurrency = Math.min(
      8,
      Math.max(1, opts.concurrency ?? cfg.walkConcurrency),
    )
    const wallMs = Math.max(1_000, opts.wall_ms ?? cfg.passWallMs)

    const lease = await acquireBuildLease(env, cfg)
    if (!lease.ok) {
      return {
        done: false,
        total: lease.meta.total || 0,
        scanned: 0,
        failed: 0,
        error: "",
        busy: true,
      }
    }

    try {
      const driver = await getDriver(env)
      const lister: ListFn = opts.lister || ((p) => listItems(p, { env }))

      // 恢复 / 初始 cursor
      let cursorRaw: string | null = null
      try {
        cursorRaw = await driver.get(INDEX_CURSOR_KEY, env)
      } catch {
        cursorRaw = null
      }
      let cursor: IndexCursor
      let col: IndexTuple[] = []
      if (cursorRaw) {
        try {
          const parsed = JSON.parse(cursorRaw)
          // 从 cursor 恢复：分片里已有部分条目，需要先解码已写入部分
          const meta = await readIndexMeta(env)
          const loaded = meta ? await loadIndexTuples(env) : []
          col = loaded || []
          cursor = {
            queue: (parsed.queue || []).filter(
              (q: any) => q && typeof q.path === "string",
            ),
            scanned: parsed.scanned || 0,
            total: parsed.total || 0,
            started_at: parsed.started_at || new Date().toISOString(),
            max_depth: parsed.max_depth,
            failed: parsed.failed || 0,
          }
        } catch {
          cursor = {
            queue: [{ path: "/", depth: 0 }],
            scanned: 0,
            total: 0,
            started_at: new Date().toISOString(),
            max_depth: maxDepth,
            failed: 0,
          }
        }
      } else {
        cursor = {
          queue: [{ path: "/", depth: 0 }],
          scanned: 0,
          total: 0,
          started_at: new Date().toISOString(),
          max_depth: maxDepth,
          failed: 0,
        }
      }

      // 统一 pending 形态到 WalkState
      const state: WalkState = {
        pending: (cursor.queue.length
          ? cursor.queue
          : [{ path: "/", depth: 0, parentKey: "" }]
        ).map((q: any) => ({
          path: q.path,
          depth: q.depth || 0,
          parentKey: normalizeParentKey(q.path),
        })),
      }

      const res = await walkPass(state, col, lister, {
        maxDepth: cursor.max_depth || maxDepth,
        dirBudget,
        concurrency,
        wallMs,
        hardCap: cfg.itemsHardCap,
        deadlineAt: Date.now() + wallMs,
      })

      cursor.scanned += res.scanned
      // aggressive dedupe: pending 队列中同一目录靠 singleflight 与 BFS 去重已够
      cursor.failed += res.failed
      cursor.total = col.length

      // 失败目录过多通常意味着 ACL / 下游网盘故障：中止本次构建并清掉游标，
      // 避免前端重试时反复撞同一批失败目录。已写入的 partial 分片保留，
      // 但 meta.is_done=false 会让搜索回退实时遍历。
      if (cfg.maxErrors > 0 && cursor.failed >= cfg.maxErrors) {
        const msg = `Too many failed directories (${cursor.failed} >= ${cfg.maxErrors}); index build aborted`
        await writeIndex(env, col, {
          is_done: false,
          error: msg,
          building_at: lease.leaseAt,
        })
        await driver.delete(INDEX_CURSOR_KEY, env).catch(() => {})
        return {
          done: false,
          total: col.length,
          scanned: cursor.scanned,
          failed: cursor.failed,
          error: msg,
        }
      }

      if (res.exhausted) {
        // 完成：写正式分片 + meta，清 cursor
        const meta = await writeIndex(env, col, {
          is_done: true,
          error:
            res.failed > 0 ? `${res.failed} directories failed to list` : "",
          building_at: lease.leaseAt,
        })
        await driver.delete(INDEX_CURSOR_KEY, env).catch(() => {})
        return {
          done: true,
          total: meta.total,
          scanned: cursor.scanned,
          failed: cursor.failed,
          error: meta.error,
        }
      }

      // 预算/时限耗尽：把已扫描条目与 pending 队列写回（分片未完成也先写，
      // 让搜索在 build 进行中没有索引可用——live fallback 顶上）
      cursor.queue = state.pending
      await writeIndex(env, col, { is_done: false, building_at: lease.leaseAt })
      await driver.put(INDEX_CURSOR_KEY, JSON.stringify(cursor), env)
      return {
        done: false,
        total: col.length,
        scanned: cursor.scanned,
        failed: cursor.failed,
        error: "",
      }
    } finally {
      await releaseBuildLease(env, lease.leaseAt)
    }
  })()

  passInflight.set(inflightKeyObj, exec)
  exec.finally(() => {
    if (passInflight.get(inflightKeyObj) === exec)
      passInflight.delete(inflightKeyObj)
  })
  return exec
}

export interface UpdateOptions {
  /** 要重建的虚拟路径（目录）。旧实现是全量重扫 /，此处为真增量。 */
  parents?: string[]
  max_depth?: number
  lister?: ListFn
  concurrency?: number
}

/**
 * 增量更新：先从既有索引剔除落在给定 parents 前缀内的条目，
 * 再只对 parents 子树做受预算的完整遍历并合并写回。
 *
 * 修复旧 /index/update 的三处浪费：
 *   1. 名义「指定路径」实际全量重扫 "/"；
 *   2. startsWith(p) 会误删兄弟目录（/a 剔除 /ab 前缀混淆）；
 *   3. 把新旧索引 items 双份常驻 db JSON。
 */
export async function updateIndexSubtree(
  env?: any,
  opts: UpdateOptions = {},
): Promise<PassResult> {
  const cfg = getSearchIndexConfig(env)
  const parents = (
    opts.parents && opts.parents.length ? opts.parents : ["/"]
  ).map((p) => (p || "/").replace(/\/+/g, "/"))
  const maxDepth = Math.min(30, Math.max(0, opts.max_depth ?? 20))
  const lister: ListFn = opts.lister || ((p) => listItems(p, { env }))

  const lease = await acquireBuildLease(env, cfg)
  if (!lease.ok) {
    return {
      done: false,
      total: lease.meta.total || 0,
      scanned: 0,
      failed: 0,
      error: "",
      busy: true,
    }
  }

  try {
    const prev = (await loadIndexTuples(env)) || []
    const isUnder = (itemParent: string, root: string) => {
      const r = normalizeParentKey(root)
      if (r === "") return true
      return itemParent === r || itemParent.startsWith(`${r}/`)
    }
    const kept = prev.filter((t) => !parents.some((p) => isUnder(t.p, p)))

    // 收集所有子树的条目（内部受 itemsHardCap 保护）
    const collected: IndexTuple[] = []
    let failed = 0
    const wallMs = cfg.passWallMs * 4
    for (const root of parents) {
      const state = newWalkState(root)
      // 完整遍历：dir 预算给足（索引更新通常范围远小于全库）
      const r = await walkPass(state, collected, lister, {
        maxDepth,
        dirBudget: 2_000_000,
        concurrency: opts.concurrency ?? cfg.walkConcurrency,
        wallMs,
        hardCap: cfg.itemsHardCap,
        deadlineAt: Date.now() + wallMs,
      })
      failed += r.failed
    }

    // 失败目录过多：保持旧索引不变（更新是全量合并写，不能落半成品）
    if (cfg.maxErrors > 0 && failed >= cfg.maxErrors) {
      return {
        done: false,
        total: kept.length,
        scanned: 0,
        failed,
        error: `Too many failed directories (${failed} >= ${cfg.maxErrors}); index update aborted`,
      }
    }

    const total = kept.length + collected.length
    if (total > cfg.itemsHardCap) {
      return {
        done: false,
        total: kept.length,
        scanned: 0,
        failed,
        error: `index exceeds hard cap (${cfg.itemsHardCap}); use /index/clear`,
      }
    }
    const meta = await writeIndex(env, [...kept, ...collected], {
      is_done: true,
      error: "",
      building_at: lease.leaseAt,
    })
    return {
      done: true,
      total: meta.total,
      scanned: collected.length,
      failed,
      error: "",
    }
  } finally {
    await releaseBuildLease(env, lease.leaseAt)
  }
}

export interface StopResult {
  done: boolean
}

/** /index/stop：标记完成并丢弃 cursor（若存在进行中的构建） */
export async function stopIndex(env?: any): Promise<StopResult> {
  const driver = await getDriver(env)
  const hadCursor = !!(await driver
    .get(INDEX_CURSOR_KEY, env)
    .catch(() => null))
  if (hadCursor) {
    await driver.delete(INDEX_CURSOR_KEY, env).catch(() => {})
    // 保留已写入的 partial 分片，供搜索读 —— is_done false 时读侧自动回退，
    // 但老前端可能会读出 is_done=false 困惑 —— 明确置 done 取决于 meta 是否存在。
    const meta = await readIndexMeta(env)
    if (meta && !meta.is_done) {
      meta.is_done = true
      meta.updated_at = new Date().toISOString()
      meta.error = meta.error || "stopped before completion"
      await driver.put(INDEX_META_KEY, JSON.stringify(meta), env)
    }
  }
  return { done: true }
}

// ―― 搜索：索引优先，实时回退 ――――――――――――――――――――

export interface IndexedSearchOptions {
  parent?: string
  keywords?: string
  /** 0 = all, 1 = folder only, 2 = file only */
  scope?: number
  page?: number
  per_page?: number
  user?: UserPermissionObj | null
  password?: string
  env?: any
}

export interface IndexedSearchResult {
  content: any[]
  total: number
}

/**
 * 用索引执行搜索。索引不可用（未建/未完成/读取失败）时返回 null，
 * 调用方回退实时遍历。
 *
 * 权限：与实时搜索语义一致 —— 结果按条目所在唯一父目录做一次
 * getNearestMeta + canAccess 判定（目录级判定，成本 ≤ per_page 级别的
 * meta 查询 —— 使用 Set<parent> 去重）。无 user（管理员内部调用）不过滤，
 * 历史行为一致。
 */
export async function searchIndexed(
  opts: IndexedSearchOptions,
  env?: any,
): Promise<IndexedSearchResult | null> {
  const meta = await readIndexMeta(env)
  if (!meta || !meta.is_done || (meta.total || 0) <= 0) return null

  const tuples = await loadIndexTuples(env)
  if (!tuples || tuples.length === 0) return null

  const rootPath = (opts.parent || "/").replace(/\/+/g, "/") || "/"
  const rootNorm = normalizeParentKey(rootPath)
  const keyword = String(opts.keywords || "")
    .trim()
    .toLowerCase()
  const scope = opts.scope ?? 0
  const page = Math.max(1, opts.page || 1)
  const perPage = Math.max(1, Math.min(100, opts.per_page || 30))

  // username/meta 缓存 —— 唯一 parent 一次
  const enforceAcl = opts.user !== undefined
  const metaCache = new Map<string, Meta | null>()
  async function nearest(parentKey: string): Promise<Meta | null> {
    if (!enforceAcl) return null
    const key = parentKey === "" ? "/" : parentKey
    const hit = metaCache.get(key)
    if (hit !== undefined) return hit
    let m: Meta | null = null
    try {
      m = await getNearestMeta(key, env)
    } catch {
      m = null
    }
    metaCache.set(key, m)
    return m
  }

  const matches: IndexTuple[] = []
  for (const t of tuples) {
    // 范围：parent 前缀筛（root="/" 时包含全部）
    if (rootNorm !== "") {
      if (t.p !== rootNorm && !t.p.startsWith(`${rootNorm}/`)) continue
    }
    const nameMatch = !keyword || t.n.toLowerCase().includes(keyword)
    if (!nameMatch) continue
    let scopeMatch = true
    if (scope === 1 && !t.is_dir) scopeMatch = false
    if (scope === 2 && t.is_dir) scopeMatch = false
    if (!scopeMatch) continue
    if (enforceAcl) {
      const dirMeta = await nearest(t.p)
      const subPath = t.p === "" ? `/${t.n}` : `${t.p}/${t.n}`
      if (!canAccess(opts.user!, dirMeta, subPath, opts.password || ""))
        continue
    }
    matches.push(t)
  }

  const total = matches.length
  const offset = (page - 1) * perPage
  const pageItems = matches.slice(offset, offset + perPage).map((t) => ({
    name: t.n,
    parent: t.p === "" ? "/" : t.p,
    size: t.size,
    modified: t.m,
    is_dir: t.is_dir,
    type: t.t,
    sign: "",
  }))
  return { content: pageItems, total }
}
