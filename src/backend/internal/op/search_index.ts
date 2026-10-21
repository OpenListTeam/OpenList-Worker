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
 *   openlist_search_index_meta    → { v,total,is_done,updated_at,error, shards }
 *   openlist_search_index_shard_i → base64(gzip(JSON tuple[]))
 *   openlist_search_index_cursor  → { queue, scanned, total, started_at }
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

export interface IndexMeta {
  /** 编码版本 */
  v: number
  total: number
  is_done: boolean
  updated_at: string | null
  error: string
  shards: number
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
  const stream = new Blob([bytes as any])
    .stream()
    .pipeThrough(new DS("gzip"))
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
export async function encodeShard(
  tuples: IndexTuple[],
): Promise<string> {
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
  return { pending: [{ path: root || "/", depth: 0, parentKey: normalizeParentKey(root || "/") }] }
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
export async function loadIndexTuples(
  env?: any,
): Promise<IndexTuple[] | null> {
  const meta = await readIndexMeta(env)
  if (!meta) return null
  const driver = await getDriver(env)
  const shards: Promise<string | null>[] = []
  for (let i = 0; i < Math.min(meta.shards || 0, SHARD_MAX_COUNT); i++) {
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

async function deleteAllShards(env?: any): Promise<void> {
  const driver = await getDriver(env)
  let keys: string[] = []
  try {
    keys = await driver.list(INDEX_SHARD_PREFIX, env)
  } catch {
    keys = []
  }
  // list 不可用时按已知最大分片数兜底清除
  if (keys.length === 0) {
    keys = Array.from({ length: SHARD_MAX_COUNT }, (_, i) => `${INDEX_SHARD_PREFIX}${i}`)
  }
  await Promise.all(keys.map((k) => driver.delete(k, env).catch(() => {})))
}

async function writeIndex(env?: any, tuples: IndexTuple[] = [], metaPatch: Partial<IndexMeta> = {}): Promise<IndexMeta> {
  const driver = await getDriver(env)
  await deleteAllShards(env)
  const shards: string[] = []
  for (let i = 0; i < tuples.length; i += SHARD_MAX_ITEMS) {
    if (shards.length >= SHARD_MAX_COUNT) break
    const chunk = tuples.slice(i, i + SHARD_MAX_ITEMS)
    shards.push(await encodeShard(chunk))
  }
  await Promise.all(shards.map((s, i) => driver.put(`${INDEX_SHARD_PREFIX}${i}`, s, env)))
  const meta: IndexMeta = {
    v: 1,
    total: tuples.length,
    is_done: metaPatch.is_done !== false,
    updated_at: metaPatch.updated_at || new Date().toISOString(),
    error: metaPatch.error || "",
    shards: shards.length,
  }
  await driver.put(INDEX_META_KEY, JSON.stringify(meta), env)
  return meta
}

export async function clearSearchIndex(env?: any): Promise<void> {
  const driver = await getDriver(env)
  await deleteAllShards(env)
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
    const maxDepth = Math.min(30, Math.max(0, opts.max_depth ?? 20))
    const dirBudget = Math.max(1, opts.dir_budget ?? DEFAULT_PASS_DIR_BUDGET)
    const concurrency = Math.min(8, Math.max(1, opts.concurrency ?? DEFAULT_WALK_CONCURRENCY))
    const wallMs = Math.max(1_000, opts.wall_ms ?? DEFAULT_PASS_WALL_MS)

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
        cursor = { queue: [{ path: "/", depth: 0 }], scanned: 0, total: 0, started_at: new Date().toISOString(), max_depth: maxDepth, failed: 0 }
      }
    } else {
      cursor = { queue: [{ path: "/", depth: 0 }], scanned: 0, total: 0, started_at: new Date().toISOString(), max_depth: maxDepth, failed: 0 }
    }

    // 统一 pending 形态到 WalkState
    const state: WalkState = {
      pending: (cursor.queue.length
        ? cursor.queue
        : [{ path: "/", depth: 0, parentKey: "" }]
      ).map(
        (q: any) => ({
          path: q.path,
          depth: q.depth || 0,
          parentKey: normalizeParentKey(q.path),
        }),
      ),
    }

    const res = await walkPass(state, col, lister, {
      maxDepth: cursor.max_depth || maxDepth,
      dirBudget,
      concurrency,
      wallMs,
      hardCap: ITEMS_HARD_CAP,
      deadlineAt: Date.now() + wallMs,
    })

    cursor.scanned += res.scanned
    // aggressive dedupe: pending 队列中同一目录靠 singleflight 与 BFS 去重已够
    cursor.failed += res.failed
    cursor.total = col.length

    if (res.exhausted) {
      // 完成：写正式分片 + meta，清 cursor
      const meta = await writeIndex(env, col, {
        is_done: true,
        error: res.failed > 0 ? `${res.failed} directories failed to list` : "",
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
    await writeIndex(env, col, { is_done: false })
    await driver.put(INDEX_CURSOR_KEY, JSON.stringify(cursor), env)
    return {
      done: false,
      total: col.length,
      scanned: cursor.scanned,
      failed: cursor.failed,
      error: "",
    }
  })()

  passInflight.set(inflightKeyObj, exec)
  exec.finally(() => {
    if (passInflight.get(inflightKeyObj) === exec) passInflight.delete(inflightKeyObj)
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
  const parents = (opts.parents && opts.parents.length
    ? opts.parents
    : ["/"]
  ).map((p) => (p || "/").replace(/\/+/g, "/"))
  const maxDepth = Math.min(30, Math.max(0, opts.max_depth ?? 20))
  const lister: ListFn = opts.lister || ((p) => listItems(p, { env }))

  const prev = (await loadIndexTuples(env)) || []
  const isUnder = (itemParent: string, root: string) => {
    const r = normalizeParentKey(root)
    if (r === "") return true
    return itemParent === r || itemParent.startsWith(`${r}/`)
  }
  const kept = prev.filter((t) => !parents.some((p) => isUnder(t.p, p)))

  // 收集所有子树的条目（内部受 ITEMS_HARD_CAP 保护）
  const collected: IndexTuple[] = []
  for (const root of parents) {
    const state = newWalkState(root)
    // 完整遍历：dir 预算给足（索引更新通常范围远小于全库）
    await walkPass(state, collected, lister, {
      maxDepth,
      dirBudget: 2_000_000,
      concurrency: opts.concurrency ?? DEFAULT_WALK_CONCURRENCY,
      wallMs: DEFAULT_PASS_WALL_MS * 4,
      hardCap: ITEMS_HARD_CAP,
      deadlineAt: Date.now() + DEFAULT_PASS_WALL_MS * 4,
    })
  }
  const total = kept.length + collected.length
  if (total > ITEMS_HARD_CAP) {
    return {
      done: false,
      total: kept.length,
      scanned: 0,
      failed: 0,
      error: `index exceeds hard cap (${ITEMS_HARD_CAP}); use /index/clear`,
    }
  }
  const meta = await writeIndex(env, [...kept, ...collected], {
    is_done: true,
    error: "",
  })
  return { done: true, total: meta.total, scanned: collected.length, failed: 0, error: "" }
}

export interface StopResult {
  done: boolean
}

/** /index/stop：标记完成并丢弃 cursor（若存在进行中的构建） */
export async function stopIndex(env?: any): Promise<StopResult> {
  const driver = await getDriver(env)
  const hadCursor = !!(await driver.get(INDEX_CURSOR_KEY, env).catch(() => null))
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
  const keyword = String(opts.keywords || "").trim().toLowerCase()
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
      if (!canAccess(opts.user!, dirMeta, subPath, opts.password || "")) continue
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
