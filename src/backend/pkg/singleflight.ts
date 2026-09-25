/**
 * singleflight（单飞）—— 把「同一时刻的同一个调用」合并成一次执行。
 *
 * ## 为什么 TS 侧需要它（Go 侧不需要）
 *
 * Go 后端是**单进程**模型，`golang.org/x/sync/singleflight` 用一个进程内 Map
 * 就够了：同一时刻只有一个 goroutine 真正执行，其余等待者共享结果。
 *
 * 本仓库跑在 Cloudflare Workers / EdgeOne Edge Functions 上，**一个部署会同时
 * 存在多个 isolate / 实例**，且请求会被随机分发到不同 isolate。进程内 Map 只能
 * 合并「落在同一个 isolate 且时间重叠」的调用，跨 isolate 的重复请求依然会各自
 * 打一次上游网盘 API —— 这正是限流、封号、CPU 超时的主要来源。
 *
 * ## 两级去重
 *
 *   L1 进程内（永远开启）：`Map<key, Promise>`，零成本，同一 isolate 内直接复用
 *                          同一个 Promise。任何模式下都生效。
 *   L2 跨实例（仅 db 模式）：用数据库表 `x_singleflight` 做协调 —— 抢到行的一方
 *                          执行，其余实例轮询该行，执行完成后**直接读取结果**，
 *                          因此上游只被调用一次。
 *
 * ## 模式（环境变量 SINGLEFLIGHT）
 *
 *   auto（默认）有 SQL 库（d1 / mysql / do）→ db；否则 → memory
 *   db          强制走数据库表协调；协调层出错时自动降级为直接执行
 *   memory      仅进程内合并（等价于 Go 的进程内 singleflight）
 *   off         关闭去重，每次调用都直接执行
 *
 * ## 可用性优先
 *
 * 单飞是**优化**而非**依赖**：任何协调层面的异常（表不存在、DB 超时、结果无法
 * 序列化、执行者崩溃、等待超时）都不会让业务失败，最坏情况退化为「各自执行一次」。
 * 但**业务函数自身的异常会原样抛出**，且不会被误判为协调失败而重试 —— 见
 * `FlightOutcome` 的三态设计。
 */

import type { Driver } from "../internal/model/store/types"
import { getStorageBackend } from "../internal/model/store/backend"
import { singleflightTableName } from "../internal/model/store/schema"

/** 单飞模式。 */
export type SingleFlightMode = "off" | "memory" | "db"

/** 模式 + auto（由运行时探测决定实际模式）。 */
export type SingleFlightModeInput = SingleFlightMode | "auto"

/** 支持 SQL 的驱动子集（d1 / mysql / do 具备 query + execute）。 */
type SqlDriverLike = Pick<Driver, "name"> &
  Partial<Pick<Driver, "query" | "execute">>

/** 单次调用的可选项（多数场景无需传，用默认值 + 环境变量即可）。 */
export interface SingleFlightOptions {
  /** 覆盖模式；默认取环境变量 SINGLEFLIGHT（缺省 auto）。 */
  mode?: SingleFlightModeInput
  /** 环境上下文（用于读取环境变量、探测存储驱动）。 */
  env?: any
  /**
   * 显式指定用于协调的 SQL 驱动。
   * 一般不需要：留空时自动取当前存储后端（见 getStorageBackend）。
   */
  driver?: SqlDriverLike | null
  /**
   * 结果交接窗口（ms，默认 1000）。
   *
   * 执行完成后，结果/错误在表中保留这么久，供**正在等待的**并发实例读取。
   * 它**不是**结果缓存：新到达的调用若看到已结束的记录，会回收该行并重新执行
   * （见 dbFlight 注释），因此不存在「窗口内读到旧数据」的脏读。
   * 设 0 表示执行完立即释放，此时等待方基本拿不到结果、会各自执行一次。
   */
  handoffMs?: number
  /**
   * 执行者持有锁的最长时间（ms，默认 30000）。
   * 期间执行者会按 1/3 周期续租；若执行者崩溃，锁到期后其他实例可接管。
   */
  lockTtlMs?: number
  /** 等待方的轮询间隔（ms，默认 50）。 */
  pollMs?: number
  /**
   * 等待方最长等待时间（ms，默认 15000）。
   * 超时后不再等待，自行执行（保证请求不会因为别人慢而被拖死）。
   */
  waitTimeoutMs?: number
}

/** 运行期统计，用于 /debug/info 与排障。 */
export interface SingleFlightStats {
  /** 最近一次生效的模式（off/memory/db）。 */
  mode: SingleFlightMode
  /** 真正执行了业务函数的次数。 */
  executed: number
  /** 被进程内合并掉的次数（L1 命中）。 */
  coalesced: number
  /** 从数据库表读到他人结果的次数（L2 命中）。 */
  shared: number
  /** DB 协调异常而降级的次数。 */
  fallback: number
  /** 业务函数抛错的次数。 */
  failed: number
  /** 当前在途键数量。 */
  active: number
}

// ── 默认值与环境变量 ────────────────────────────────────────────────────────

const DEFAULT_HANDOFF_MS = 1000
const DEFAULT_LOCK_TTL_MS = 30_000
const DEFAULT_POLL_MS = 50
const DEFAULT_WAIT_TIMEOUT_MS = 15_000

/** 读取配置：env 绑定优先，其次 process.env（Node / 本地开发）。 */
function readEnvValue(env: any, name: string): string | undefined {
  try {
    const fromEnv = env && typeof env === "object" ? env[name] : undefined
    if (fromEnv !== undefined && fromEnv !== null && String(fromEnv) !== "") {
      return String(fromEnv)
    }
  } catch {
    // env 可能是 Proxy 等异常对象，忽略
  }
  try {
    const proc = typeof process !== "undefined" ? (process as any) : undefined
    const v = proc?.env?.[name]
    if (v !== undefined && v !== null && String(v) !== "") return String(v)
  } catch {
    // 忽略
  }
  return undefined
}

function readEnvInt(env: any, name: string, fallback: number): number {
  const raw = readEnvValue(env, name)
  if (raw === undefined) return fallback
  const n = parseInt(raw, 10)
  return Number.isFinite(n) && n >= 0 ? n : fallback
}

/** 解析 SINGLEFLIGHT 环境变量（非法值按 auto 处理并告警一次）。 */
let warnedBadMode = false
function readModeInput(env: any): SingleFlightModeInput {
  const raw = readEnvValue(env, "SINGLEFLIGHT")?.trim().toLowerCase()
  if (!raw) return "auto"
  if (raw === "auto") return "auto"
  if (raw === "off" || raw === "false" || raw === "0" || raw === "none") {
    return "off"
  }
  if (raw === "memory" || raw === "mem" || raw === "local" || raw === "proc") {
    return "memory"
  }
  if (raw === "db" || raw === "database" || raw === "sql" || raw === "table") {
    return "db"
  }
  if (!warnedBadMode) {
    warnedBadMode = true
    console.warn(
      `[singleflight] Unknown SINGLEFLIGHT="${raw}", falling back to auto ` +
        `(expected one of: auto, off, memory, db)`,
    )
  }
  return "auto"
}

// ── 实例标识 ────────────────────────────────────────────────────────────────

/**
 * 本实例（isolate / 进程）的随机标识。
 *
 * 用途：只有写入该值的执行者才能回写结果，避免「锁被接管后，原执行者迟到写回」
 * 造成结果错乱。
 */
const INSTANCE_ID = (() => {
  try {
    const c: any = typeof crypto !== "undefined" ? crypto : undefined
    if (c && typeof c.randomUUID === "function") return c.randomUUID()
  } catch {
    // 忽略
  }
  return `inst-${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`
})()

// ── 统计 ────────────────────────────────────────────────────────────────────

const stats: SingleFlightStats = {
  mode: "memory",
  executed: 0,
  coalesced: 0,
  shared: 0,
  fallback: 0,
  failed: 0,
  active: 0,
}

/** 当前统计快照（含当前在途键数量）。 */
export function getSingleFlightStats(): SingleFlightStats {
  return { ...stats, active: inflight.size }
}

// ── L1：进程内合并 ──────────────────────────────────────────────────────────

/** key → 在途 Promise。同一 isolate 内所有模式共用。 */
const inflight = new Map<string, Promise<any>>()

/**
 * 进程内合并：命中则复用已有 Promise；未命中则执行 factory 并登记。
 *
 * 清理用 `then(onOk, onErr)` 而非 `finally()`：后者会产生一个「派生 Promise」，
 * 若业务失败而调用方只 await 了原 Promise，派生 Promise 的 rejection 无人处理，
 * 在 Node 下会触发 unhandledRejection 告警。
 */
function coalesce<T>(key: string, factory: () => Promise<T>): Promise<T> {
  const existing = inflight.get(key)
  if (existing) {
    stats.coalesced++
    return existing as Promise<T>
  }

  const pending = factory()
  inflight.set(key, pending)
  const release = () => {
    // 仅清理自己登记的那一个，避免误删后来者的在途项
    if (inflight.get(key) === pending) inflight.delete(key)
  }
  pending.then(release, release)
  return pending
}

// ── L2：数据库表协调 ────────────────────────────────────────────────────────

/**
 * 协调层的结果三态。
 *
 * 关键点：**业务异常与协调异常必须分开**。
 *   - 业务异常：原样抛给调用方，绝不重试（否则上游会被打两次）；
 *   - 协调异常：降级为「自己直接执行一次」，保证业务可用。
 * 用三态返回值而非异常标记，可避免给用户错误对象打标记（可能被冻结）的坑。
 */
type FlightOutcome<T> =
  | { kind: "value"; value: T }
  /** 执行失败；error 为业务函数抛出的原始异常，或等待方收到的远端失败原因 */
  | { kind: "business-error"; error: unknown }
  /** 抢锁 / 轮询 / 写回等协调环节出错 —— 调用方应降级为直接执行 */
  | { kind: "coordination-error"; error: unknown }

/** 反引号包裹标识符（SQLite 与 MySQL 均支持）。 */
function q(name: string): string {
  return "`" + name + "`"
}

function supportsSql(driver: any): driver is SqlDriverLike {
  return (
    !!driver &&
    typeof driver.query === "function" &&
    typeof driver.execute === "function"
  )
}

/** SQL 方言：mysql 驱动用 `INSERT IGNORE`，其余（d1 / do，均 SQLite）用 `INSERT OR IGNORE`。 */
function insertIgnoreClause(driver: SqlDriverLike): string {
  return String(driver.name || "").toLowerCase() === "mysql"
    ? "INSERT IGNORE"
    : "INSERT OR IGNORE"
}

/** 解析用于协调的 SQL 驱动；不可用时返回 null（调用方降级为内存级）。 */
async function resolveSqlDriver(
  env: any,
  explicit: SqlDriverLike | null | undefined,
): Promise<SqlDriverLike | null> {
  if (explicit !== undefined) return explicit
  try {
    const { driver } = await getStorageBackend(env)
    return supportsSql(driver) ? driver : null
  } catch {
    // 无可用存储后端（如 serverless 未绑定）→ 内存级
    return null
  }
}

interface ResolvedOptions {
  mode: SingleFlightMode
  /** 解析出的协调驱动（仅 db 模式有值）。 */
  driver: SqlDriverLike | null
  handoffMs: number
  lockTtlMs: number
  pollMs: number
  waitTimeoutMs: number
}

async function resolveOptions(
  options: SingleFlightOptions,
): Promise<ResolvedOptions> {
  const env = options.env
  const input = options.mode ?? readModeInput(env)

  // 只在需要时才探测存储驱动：off / memory 模式完全不需要碰存储层。
  const needsDriver = input === "auto" || input === "db"
  const driver = needsDriver
    ? await resolveSqlDriver(env, options.driver)
    : null

  const mode: SingleFlightMode =
    input === "auto" ? (driver ? "db" : "memory") : input

  return {
    mode,
    driver,
    handoffMs:
      options.handoffMs ??
      readEnvInt(env, "SINGLEFLIGHT_HANDOFF_MS", DEFAULT_HANDOFF_MS),
    lockTtlMs:
      options.lockTtlMs ??
      readEnvInt(env, "SINGLEFLIGHT_LOCK_TTL_MS", DEFAULT_LOCK_TTL_MS),
    pollMs:
      options.pollMs ??
      readEnvInt(env, "SINGLEFLIGHT_POLL_MS", DEFAULT_POLL_MS),
    waitTimeoutMs:
      options.waitTimeoutMs ??
      readEnvInt(env, "SINGLEFLIGHT_WAIT_MS", DEFAULT_WAIT_TIMEOUT_MS),
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * 抢占 key。
 *
 * 三步走，全部依赖数据库自身的原子性（不依赖「读后写」，因此无需事务）：
 *   1. 回收可回收的行 —— 崩溃残留的过期 running 行，以及**已结束**的
 *      done/error 行（它们只是留给等待方读取的交接记录，谁先来谁回收）；
 *   2. `INSERT OR IGNORE` —— 主键冲突即表示已有他人在执行，我们成为等待方；
 *   3. 回读 owner 确认归属 —— 避免「插入被忽略但仍以为自己是执行者」。
 *
 * 注意第 1 步的删除条件：**未过期的 running 行绝不能被删**，否则正在执行的
 * 调用会被并发接管，单飞形同虚设。
 */
async function dbAcquire(
  driver: SqlDriverLike,
  table: string,
  key: string,
  owner: string,
  opts: ResolvedOptions,
  env: any,
): Promise<boolean> {
  const t = q(table)
  const now = Date.now()

  await driver.execute!(
    `DELETE FROM ${t} WHERE ${q("key")} = ? AND (` +
      `${q("expires_at")} <= ? OR ${q("state")} <> ?)`,
    [key, now, "running"],
    env,
  )

  await driver.execute!(
    `${insertIgnoreClause(driver)} INTO ${t} (` +
      `${q("key")},${q("owner")},${q("state")},${q("started_at")},${q("expires_at")},` +
      `${q("result")},${q("error")}) VALUES (?,?,?,?,?,NULL,NULL)`,
    [key, owner, "running", now, now + opts.lockTtlMs],
    env,
  )

  const rows = await driver.query!(
    `SELECT ${q("owner")} FROM ${t} WHERE ${q("key")} = ?`,
    [key],
    env,
  )
  return rows.length > 0 && String((rows[0] as any).owner) === owner
}

/**
 * 执行者续租：把 expires_at 往后推。
 *
 * 为什么需要：目录很大时上游 list 可能超过 lockTtl，若不续租，等待方会误判
 * 「执行者已崩溃」而接管，导致上游被调用两次 —— 恰好是单飞要消除的行为。
 */
function startHeartbeat(
  driver: SqlDriverLike,
  table: string,
  key: string,
  owner: string,
  opts: ResolvedOptions,
  env: any,
): any {
  try {
    const interval = Math.max(1000, Math.floor(opts.lockTtlMs / 3))
    const timer = setInterval(() => {
      Promise.resolve(
        driver.execute!(
          `UPDATE ${q(table)} SET ${q("expires_at")} = ? ` +
            `WHERE ${q("key")} = ? AND ${q("owner")} = ? AND ${q("state")} = ?`,
          [Date.now() + opts.lockTtlMs, key, owner, "running"],
          env,
        ),
      ).catch(() => {
        // 续租失败不影响业务：最坏情况是被接管后多执行一次
      })
    }, interval)
    // Node 下不要因为心跳定时器而阻止进程退出（Workers 无此方法，可选调用）
    ;(timer as any)?.unref?.()
    return timer
  } catch {
    // 运行时不支持定时器（极端环境）：放弃续租，退化为「锁到期可被接管」
    return null
  }
}

/** 停止心跳；定时器不可用时为 no-op。 */
function stopHeartbeat(timer: any): void {
  if (timer === null || timer === undefined) return
  try {
    clearInterval(timer)
  } catch {
    // 忽略
  }
}

/**
 * 执行者写回结果。
 *
 * `WHERE key = ? AND owner = ?` 是必需的：若锁已被接管（原执行者卡顿超过
 * lockTtl 被他人接管），迟到写回必须作废，否则会覆盖接管者的正确结果。
 *
 * 写回失败只告警不抛出：协调是尽力而为，业务结果已拿到，不该因为写不进去而失败。
 */
async function dbPublish(
  driver: SqlDriverLike,
  table: string,
  key: string,
  owner: string,
  state: "done" | "error",
  result: string | null,
  error: string | null,
  opts: ResolvedOptions,
  env: any,
): Promise<void> {
  const t = q(table)
  try {
    if (opts.handoffMs <= 0) {
      // 交接窗口为 0：直接释放，让等待方立刻可以重新抢锁
      await driver.execute!(
        `DELETE FROM ${t} WHERE ${q("key")} = ? AND ${q("owner")} = ?`,
        [key, owner],
        env,
      )
      return
    }
    await driver.execute!(
      `UPDATE ${t} SET ${q("state")} = ?, ${q("result")} = ?, ${q("error")} = ?, ` +
        `${q("expires_at")} = ? WHERE ${q("key")} = ? AND ${q("owner")} = ?`,
      [state, result, error, Date.now() + opts.handoffMs, key, owner],
      env,
    )
  } catch (err) {
    console.warn(
      `[singleflight] Failed to publish result for "${key}" (ignored):`,
      err instanceof Error ? err.message : err,
    )
  }
}

/** 等待方的等待结果。 */
type WaitOutcome =
  | { status: "ok"; value: any }
  | { status: "error"; error: string }
  /** 行消失 / 执行者疑似崩溃 / 等待超时 —— 交给调用方自行处理 */
  | { status: "give-up" }

/** 表中某个 key 的当前行（null 表示不存在）。 */
interface ProbeRow {
  state: string
  result: any
  error: any
  expires_at: number
}

async function dbProbe(
  driver: SqlDriverLike,
  table: string,
  key: string,
  env: any,
): Promise<ProbeRow | null> {
  const rows = await driver.query!(
    `SELECT ${q("state")},${q("result")},${q("error")},${q("expires_at")} ` +
      `FROM ${q(table)} WHERE ${q("key")} = ?`,
    [key],
    env,
  )
  if (rows.length === 0) return null
  const row: any = rows[0]
  return {
    state: String(row.state ?? ""),
    result: row.result,
    error: row.error,
    expires_at: Number(row.expires_at),
  }
}

/**
 * 轮询等待执行者写回结果。
 *
 * 仅在「确认执行者处于 running 状态」后调用，因此这里读到 done/error 就是
 * 本次并发去重的目标结果。
 */
async function dbWait(
  driver: SqlDriverLike,
  table: string,
  key: string,
  opts: ResolvedOptions,
  env: any,
): Promise<WaitOutcome> {
  const deadline = Date.now() + opts.waitTimeoutMs

  for (;;) {
    const now = Date.now()
    if (now >= deadline) return { status: "give-up" }
    await sleep(Math.max(1, Math.min(opts.pollMs, deadline - now)))

    const row = await dbProbe(driver, table, key, env)
    // 行已被回收（交接记录被新到达者回收，或执行者主动释放）→ 不再等待
    if (!row) return { status: "give-up" }

    if (row.state === "done") {
      if (row.result === null || row.result === undefined) {
        return { status: "give-up" }
      }
      try {
        return { status: "ok", value: JSON.parse(String(row.result)) }
      } catch {
        // 结果不可反序列化（理论上不该发生）→ 自行执行
        return { status: "give-up" }
      }
    }
    if (row.state === "error") {
      return { status: "error", error: String(row.error ?? "") }
    }
    // running 且已过期 → 执行者疑似崩溃
    if (row.expires_at <= Date.now()) return { status: "give-up" }
  }
}

/** 执行者路径：真正调用业务函数，并把结果/异常写回表。 */
async function dbLead<T>(
  driver: SqlDriverLike,
  table: string,
  key: string,
  owner: string,
  fn: () => Promise<T>,
  opts: ResolvedOptions,
  env: any,
): Promise<FlightOutcome<T>> {
  const heartbeat = startHeartbeat(driver, table, key, owner, opts, env)

  let value: T
  try {
    value = await fn()
  } catch (err) {
    stopHeartbeat(heartbeat)
    await dbPublish(
      driver,
      table,
      key,
      owner,
      "error",
      null,
      err instanceof Error ? err.message : String(err),
      opts,
      env,
    )
    return { kind: "business-error", error: err }
  }
  stopHeartbeat(heartbeat)

  // 结果必须可 JSON 往返才能共享给其他实例；不可序列化时直接释放锁，
  // 让等待方自行执行（本次调用方仍然拿到正确的返回值）。
  let payload: string | null = null
  try {
    payload = JSON.stringify(value === undefined ? null : value)
  } catch {
    payload = null
  }
  if (payload === null) {
    await dbPublish(
      driver,
      table,
      key,
      owner,
      "done",
      null,
      null,
      {
        ...opts,
        handoffMs: 0,
      },
      env,
    )
  } else {
    await dbPublish(driver, table, key, owner, "done", payload, null, opts, env)
  }
  return { kind: "value", value }
}

/**
 * 数据库表协调的完整流程。
 *
 * ## 关键判定：什么情况下才接受「别人的结果」
 *
 * 只有在**本调用到达时执行者正处于 running 状态**时，才等待并接受它的结果 ——
 * 这代表两者确实并发重叠，是真正的「单飞去重」。
 *
 * 反过来，如果到达时该 key 上已经是一行**已结束**的 done/error（上一轮调用留下的
 * 交接记录），本次调用**绝不接受**它，而是回收该行、自己成为新的执行者。
 *
 * 这一点是「不引入脏读」的核心：交接记录因此只是给**正在等待的**并发者读取的，
 * 不会变成一个有 TTL 的结果缓存。否则会出现「删除文件后 1 秒内刷新列表仍看到
 * 被删文件」这类问题（handoffMs 窗口内命中旧结果）。
 *
 * @returns 三态结果，由调用方决定是否降级
 */
async function dbFlight<T>(
  driver: SqlDriverLike,
  key: string,
  fn: () => Promise<T>,
  opts: ResolvedOptions,
  env: any,
): Promise<FlightOutcome<T>> {
  const table = singleflightTableName(env)
  const owner = INSTANCE_ID

  try {
    // 最多三轮：足够覆盖「探测到 running → 等待」「等待落空 → 接管」
    // 「抢占失败（别人刚抢到）→ 再探测」这几种交错。
    for (let attempt = 0; attempt < 3; attempt++) {
      const row = await dbProbe(driver, table, key, env)

      if (row && row.state === "running" && row.expires_at > Date.now()) {
        // 到达时正在执行 → 并发去重，等待并接受其结果
        const wait = await dbWait(driver, table, key, opts, env)
        if (wait.status === "ok") {
          stats.shared++
          return { kind: "value", value: wait.value as T }
        }
        if (wait.status === "error") {
          // 共享他人的失败：与 Go singleflight 语义一致，等待方同样收到错误，
          // 而不是各自再打一次上游（那正是要消除的行为）。
          stats.shared++
          return {
            kind: "business-error",
            error: new Error(wait.error || "singleflight: shared call failed"),
          }
        }
        // 执行者崩溃 / 等待超时 → 下一轮尝试接管
        continue
      }

      // 无行，或行已结束（done/error 交接记录）→ 回收并抢占，成为新执行者
      if (await dbAcquire(driver, table, key, owner, opts, env)) {
        stats.executed++
        const outcome = await dbLead(driver, table, key, owner, fn, opts, env)
        if (outcome.kind === "business-error") stats.failed++
        return outcome
      }
      // 抢占失败：别人刚成为执行者 → 下一轮会探测到 running 并等待
    }
    return { kind: "coordination-error", error: null }
  } catch (err) {
    return { kind: "coordination-error", error: err }
  }
}

// ── 公开 API ────────────────────────────────────────────────────────────────

/**
 * 以 `key` 为粒度执行 `fn`，同一时刻相同 key 只执行一次。
 *
 * @param key      去重键。**必须能唯一标识一次调用的语义**，
 *                 例如 `fs.list:12:/movies`（存储 id + 物理路径）。
 *                 不同 env / 不同存储务必使用不同 key。
 * @param fn       业务函数。注意其返回值需要可 JSON 往返（db 模式下要共享给
 *                 其他实例），因此不要返回函数、Symbol、循环引用等。
 * @param options  可选覆盖项，见 SingleFlightOptions。
 *
 * @example
 *   const items = await singleflight(`fs.list:${storage.id}:${path}`, () =>
 *     driver.list(path),
 *   )
 */
export async function singleflight<T>(
  key: string,
  fn: () => Promise<T>,
  options: SingleFlightOptions = {},
): Promise<T> {
  const opts = await resolveOptions(options)
  stats.mode = opts.mode

  if (opts.mode === "off") {
    stats.executed++
    try {
      return await fn()
    } catch (err) {
      stats.failed++
      throw err
    }
  }

  // L1：进程内合并。db 模式同样先走这一步 —— 同一 isolate 内没必要为同一个
  // key 反复往返数据库。
  return coalesce(key, async () => {
    if (opts.mode === "memory") {
      stats.executed++
      try {
        return await fn()
      } catch (err) {
        stats.failed++
        throw err
      }
    }

    const driver = opts.driver
    if (!driver) {
      // 探测不到 SQL 驱动 → 降级为内存级（L1 仍然生效）
      stats.fallback++
      stats.executed++
      try {
        return await fn()
      } catch (err) {
        stats.failed++
        throw err
      }
    }

    const outcome = await dbFlight(driver, key, fn, opts, options.env)
    switch (outcome.kind) {
      case "value":
        return outcome.value
      case "business-error":
        throw outcome.error
      default:
        // 协调失败 → 降级为直接执行，业务照常可用
        stats.fallback++
        stats.executed++
        try {
          return await fn()
        } catch (err) {
          stats.failed++
          throw err
        }
    }
  })
}

/**
 * 仅测试用：清空进程内在途表与统计，避免用例间互相污染。
 */
export function __resetSingleFlightForTest(): void {
  inflight.clear()
  stats.mode = "memory"
  stats.executed = 0
  stats.coalesced = 0
  stats.shared = 0
  stats.fallback = 0
  stats.failed = 0
  warnedBadMode = false
}

/**
 * 仅测试用：暴露 SQL 方言分支（mysql 与 sqlite 的 INSERT 语法差异）。
 */
export function __singleFlightInsertIgnoreForTest(driverName: string): string {
  return insertIgnoreClause({ name: driverName })
}

/** 仅测试用：暴露实例标识，便于断言 owner 写入。 */
export function __singleFlightInstanceIdForTest(): string {
  return INSTANCE_ID
}
