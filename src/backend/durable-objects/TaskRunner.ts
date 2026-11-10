/**
 * TaskRunner：任务队列的 Durable Object（Cloudflare 上的主执行器）。
 *
 * 为什么用 DO：
 *   - 强一致 + 串行化：任务状态不需要跨实例 CAS/租约；
 *   - 内置 SQLite：进度按行更新，不必重写整份文档；
 *   - alarm：入队即可 setAlarm(now) 立即开跑，跑完再排下一次，几乎连续执行；
 *     alarm 处理器墙钟上限 15 分钟，足够覆盖多个 tick。
 *
 * 结构：
 *   - SQLite `tasks` 表是唯一真相；
 *   - alarm() / tick() 调同一个 runner（与无 DO 平台共用的代码）；
 *   - 对 Worker 暴露 RPC（enqueue/list/get/patch/remove/tick）。
 */
import { setEnvCtx } from "../internal/model/db"
import { getTaskSettings, resolveTickBudget } from "../internal/task/settings"
import { runTick } from "../internal/task/runner"
import type {
  TaskClaimQuery,
  TaskListQuery,
  TaskRunnerStore,
} from "../internal/task/store"
import { pruneDoneTasks } from "../internal/task/store"
import type { TaskRecord, TaskType } from "../internal/task/types"
import { DONE_STATES, TASK_STATE } from "../internal/task/types"
import type { TaskRuntime } from "../internal/op/transfer"

const COLUMNS = [
  "id",
  "type",
  "name",
  "creator_id",
  "creator",
  "creator_role",
  "state",
  "status",
  "progress",
  "total_bytes",
  "done_bytes",
  "start_time",
  "end_time",
  "error",
  "retry",
  "max_retry",
  "created_at",
  "updated_at",
  "next_run_at",
  "attempts",
  "verified",
  "cursor",
  "payload",
  "lease_owner",
  "lease_until",
] as const

/** 允许通过 patch() 更新的列（白名单，避免把 id/type 改坏） */
const PATCHABLE = new Set([
  "state",
  "status",
  "progress",
  "total_bytes",
  "done_bytes",
  "start_time",
  "end_time",
  "error",
  "retry",
  "max_retry",
  "updated_at",
  "next_run_at",
  "attempts",
  "verified",
  "cursor",
  "payload",
  "lease",
])

function parseJson(value: any, fallback: any): any {
  if (value === null || value === undefined || value === "") return fallback
  if (typeof value !== "string") return value
  try {
    return JSON.parse(value)
  } catch {
    return fallback
  }
}

function rowToRecord(row: any): TaskRecord {
  return {
    id: String(row.id),
    type: String(row.type) as TaskType,
    name: String(row.name || ""),
    creator_id: Number(row.creator_id) || 0,
    creator: String(row.creator || ""),
    creator_role: Number(row.creator_role ?? -1),
    state: Number(row.state) || 0,
    status: String(row.status || ""),
    progress: Number(row.progress) || 0,
    total_bytes: Number(row.total_bytes) || 0,
    done_bytes: Number(row.done_bytes) || 0,
    start_time: row.start_time ?? null,
    end_time: row.end_time ?? null,
    error: String(row.error || ""),
    retry: Number(row.retry) || 0,
    max_retry: Number(row.max_retry) || 0,
    created_at: Number(row.created_at) || 0,
    updated_at: Number(row.updated_at) || 0,
    next_run_at: Number(row.next_run_at) || 0,
    attempts: Number(row.attempts) || 0,
    verified: Boolean(row.verified),
    cursor: parseJson(row.cursor, null),
    payload: parseJson(row.payload, null),
    lease:
      row.lease_owner || row.lease_until
        ? {
            owner: String(row.lease_owner || ""),
            expires_at: Number(row.lease_until) || 0,
          }
        : null,
  }
}

/** SQLite 存储实现（只在 DO 内使用） */
class SqliteTaskStore implements TaskRunnerStore {
  constructor(
    private readonly sql: any,
    private readonly env: any,
  ) {}

  private exec(query: string, ...params: any[]): any {
    return this.sql.exec(query, ...params)
  }

  private rows(query: string, ...params: any[]): any[] {
    return this.exec(query, ...params).toArray()
  }

  async enqueue(record: TaskRecord): Promise<void> {
    this.exec(
      `INSERT OR REPLACE INTO tasks (${COLUMNS.join(",")}) VALUES (${COLUMNS.map(() => "?").join(",")})`,
      record.id,
      record.type,
      record.name,
      record.creator_id,
      record.creator,
      record.creator_role,
      record.state,
      record.status,
      record.progress,
      record.total_bytes,
      record.done_bytes,
      record.start_time,
      record.end_time,
      record.error,
      record.retry,
      record.max_retry,
      record.created_at,
      record.updated_at,
      record.next_run_at,
      record.attempts,
      record.verified ? 1 : 0,
      record.cursor === undefined ? null : JSON.stringify(record.cursor),
      record.payload === undefined ? null : JSON.stringify(record.payload),
      record.lease?.owner ?? null,
      record.lease?.expires_at ?? null,
    )
  }

  async list(query: TaskListQuery): Promise<TaskRecord[]> {
    const clauses = ["type = ?"]
    const params: any[] = [query.type]
    if (query.states?.length) {
      clauses.push(`state IN (${query.states.map(() => "?").join(",")})`)
      params.push(...query.states)
    }
    if (query.creator !== undefined && query.creator !== null) {
      clauses.push("creator_id = ?")
      params.push(query.creator)
    }
    const limit = Math.min(Math.max(1, query.limit ?? 200), 500)
    params.push(limit)
    return this.rows(
      `SELECT * FROM tasks WHERE ${clauses.join(" AND ")} ORDER BY created_at DESC LIMIT ?`,
      ...params,
    ).map(rowToRecord)
  }

  async get(_type: TaskType, id: string): Promise<TaskRecord | null> {
    const row = this.rows("SELECT * FROM tasks WHERE id = ?", id)[0]
    return row ? rowToRecord(row) : null
  }

  async patch(
    _type: TaskType,
    id: string,
    patch: Partial<TaskRecord>,
  ): Promise<TaskRecord | null> {
    const sets: string[] = []
    const params: any[] = []
    for (const [key, value] of Object.entries(patch)) {
      if (!PATCHABLE.has(key)) continue
      if (key === "lease") {
        sets.push("lease_owner = ?", "lease_until = ?")
        params.push((value as any)?.owner ?? null, (value as any)?.expires_at ?? null)
        continue
      }
      sets.push(`${key} = ?`)
      if (key === "cursor" || key === "payload") {
        params.push(value === undefined ? null : JSON.stringify(value))
      } else if (key === "verified") {
        params.push(value ? 1 : 0)
      } else {
        params.push(value ?? null)
      }
    }
    if (sets.length === 0) return this.get(_type, id)
    params.push(id)
    const row = this.exec(
      `UPDATE tasks SET ${sets.join(", ")} WHERE id = ? RETURNING *`,
      ...params,
    ).toArray()[0]
    return row ? rowToRecord(row) : null
  }

  async remove(_type: TaskType, id: string): Promise<void> {
    this.exec("DELETE FROM tasks WHERE id = ?", id)
  }

  async removeMany(entries: Array<{ type: TaskType; id: string }>): Promise<void> {
    for (const entry of entries) {
      this.exec("DELETE FROM tasks WHERE id = ?", entry.id)
    }
  }

  async countActive(creatorId?: number): Promise<number> {
    const params: any[] = [TASK_STATE.succeeded, TASK_STATE.canceled, TASK_STATE.failed]
    let query = "SELECT COUNT(*) AS c FROM tasks WHERE state NOT IN (?,?,?)"
    if (creatorId !== undefined && creatorId !== null) {
      query += " AND creator_id = ?"
      params.push(creatorId)
    }
    return Number(this.rows(query, ...params)[0]?.c) || 0
  }

  async prune(type: TaskType, keepDone: number): Promise<void> {
    const done = this.rows(
      "SELECT * FROM tasks WHERE type = ? AND state IN (?,?,?) ORDER BY updated_at DESC",
      type,
      TASK_STATE.succeeded,
      TASK_STATE.canceled,
      TASK_STATE.failed,
    ).map(rowToRecord)
    if (done.length <= keepDone) return
    const active = this.rows(
      "SELECT * FROM tasks WHERE type = ? AND state NOT IN (?,?,?)",
      type,
      TASK_STATE.succeeded,
      TASK_STATE.canceled,
      TASK_STATE.failed,
    ).map(rowToRecord)
    const keep = new Set(pruneDoneTasks([...active, ...done], keepDone).map((r) => r.id))
    for (const record of done) {
      if (!keep.has(record.id)) {
        this.exec("DELETE FROM tasks WHERE id = ?", record.id)
      }
    }
  }

  async claim(query: TaskClaimQuery): Promise<TaskRecord | null> {
    for (let attempt = 0; attempt < 5; attempt++) {
      const candidates = this.rows(
        `SELECT * FROM tasks
         WHERE (state = ? AND next_run_at <= ?)
            OR (state = ? AND next_run_at <= ?)
            OR (state = ? AND updated_at < ?)
         ORDER BY CASE state WHEN ? THEN 0 WHEN ? THEN 1 ELSE 2 END, created_at ASC
         LIMIT 1`,
        TASK_STATE.pending,
        query.now,
        TASK_STATE.waitingRetry,
        query.now,
        TASK_STATE.running,
        query.now - query.staleMs,
        TASK_STATE.pending,
        TASK_STATE.waitingRetry,
      )
      const row = candidates[0]
      if (!row) return null
      const candidate = rowToRecord(row)
      // running 且已超时 = 上次执行被杀。累计 attempts，超过阈值直接判失败，
      // 避免一个永远跑不完的任务把整个队列卡住。
      if (candidate.state === TASK_STATE.running) {
        const attempts = (candidate.attempts || 0) + 1
        if (attempts > 3) {
          this.exec(
            "UPDATE tasks SET state = ?, status = ?, error = ?, end_time = ?, updated_at = ?, lease_owner = NULL, lease_until = NULL WHERE id = ?",
            TASK_STATE.failed,
            "stalled",
            `stalled: no completion after ${attempts} attempts (last update ${new Date(candidate.updated_at).toISOString()})`,
            new Date(query.now).toISOString(),
            query.now,
            candidate.id,
          )
          continue
        }
        return this.markRunning(candidate, query, attempts)
      }
      return this.markRunning(candidate, query, candidate.attempts || 0)
    }
    return null
  }

  private markRunning(
    candidate: TaskRecord,
    query: TaskClaimQuery,
    attempts: number,
  ): TaskRecord | null {
    const row = this.exec(
      `UPDATE tasks SET state = ?, start_time = COALESCE(start_time, ?), updated_at = ?,
         attempts = ?, lease_owner = ?, lease_until = ?
       WHERE id = ? RETURNING *`,
      TASK_STATE.running,
      candidate.start_time || new Date(query.now).toISOString(),
      query.now,
      attempts,
      query.owner,
      query.now + query.leaseMs,
      candidate.id,
    ).toArray()[0]
    return row ? rowToRecord(row) : null
  }
}

export class TaskRunner {
  private state: any
  private env: any
  private storeRef: SqliteTaskStore | null = null
  private ready = false
  private noProgressStreak = 0

  constructor(state: any, env: any) {
    this.state = state
    this.env = env
  }

  private get sql(): any {
    return (this.state.storage as any).sql
  }

  private ensureSchema(): void {
    if (this.ready) return
    this.sql.exec(`
      CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        name TEXT NOT NULL DEFAULT '',
        creator_id INTEGER NOT NULL DEFAULT 0,
        creator TEXT NOT NULL DEFAULT '',
        creator_role INTEGER NOT NULL DEFAULT -1,
        state INTEGER NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT '',
        progress REAL NOT NULL DEFAULT 0,
        total_bytes INTEGER NOT NULL DEFAULT 0,
        done_bytes INTEGER NOT NULL DEFAULT 0,
        start_time TEXT,
        end_time TEXT,
        error TEXT NOT NULL DEFAULT '',
        retry INTEGER NOT NULL DEFAULT 0,
        max_retry INTEGER NOT NULL DEFAULT 2,
        created_at INTEGER NOT NULL DEFAULT 0,
        updated_at INTEGER NOT NULL DEFAULT 0,
        next_run_at INTEGER NOT NULL DEFAULT 0,
        attempts INTEGER NOT NULL DEFAULT 0,
        verified INTEGER NOT NULL DEFAULT 0,
        cursor TEXT,
        payload TEXT,
        lease_owner TEXT,
        lease_until INTEGER
      )
    `)
    this.sql.exec(
      "CREATE INDEX IF NOT EXISTS idx_tasks_state ON tasks (state, next_run_at)",
    )
    this.sql.exec(
      "CREATE INDEX IF NOT EXISTS idx_tasks_type_state ON tasks (type, state, created_at)",
    )
    this.sql.exec(
      "CREATE INDEX IF NOT EXISTS idx_tasks_creator ON tasks (creator_id, state)",
    )
    this.ready = true
  }

  private store(): SqliteTaskStore {
    this.ensureSchema()
    if (!this.storeRef) {
      this.storeRef = new SqliteTaskStore(this.sql, this.env)
    }
    return this.storeRef
  }

  private runtime(): TaskRuntime {
    return {
      env: this.env,
      origin: this.env?.PUBLIC_ORIGIN,
    }
  }

  // ───────────────────────── RPC（Worker 调用） ─────────────────────────

  async enqueue(record: TaskRecord): Promise<void> {
    setEnvCtx(this.env)
    this.store().enqueue(record)
    // 只有「待执行」的记录需要唤醒 alarm：同步完成的历史记录不排期，
    // 否则每次小文件复制都会白醒一次 DO（免费计划的行写/请求配额很紧）。
    const actionable =
      record.state === TASK_STATE.pending ||
      record.state === TASK_STATE.waitingRetry ||
      record.state === TASK_STATE.running
    if (!actionable) return
    const current = await this.state.storage.getAlarm()
    if (current === null || current > Date.now() + 1000) {
      await this.state.storage.setAlarm(Date.now())
    }
  }

  async list(query: TaskListQuery): Promise<TaskRecord[]> {
    setEnvCtx(this.env)
    return this.store().list(query)
  }

  async get(type: TaskType, id: string): Promise<TaskRecord | null> {
    setEnvCtx(this.env)
    return this.store().get(type, id)
  }

  async patch(
    type: TaskType,
    id: string,
    patch: Partial<TaskRecord>,
  ): Promise<TaskRecord | null> {
    setEnvCtx(this.env)
    return this.store().patch(type, id, patch)
  }

  async remove(type: TaskType, id: string): Promise<void> {
    setEnvCtx(this.env)
    await this.store().remove(type, id)
  }

  async removeMany(entries: Array<{ type: TaskType; id: string }>): Promise<void> {
    setEnvCtx(this.env)
    await this.store().removeMany(entries)
  }

  async countActive(creatorId?: number): Promise<number> {
    setEnvCtx(this.env)
    return this.store().countActive(creatorId)
  }

  async prune(type: TaskType, keepDone: number): Promise<void> {
    setEnvCtx(this.env)
    await this.store().prune(type, keepDone)
  }

  /**
   * 跑一个 tick。`budgetMs` 可由调用方显式指定（/api/task/run 支持），
   * 否则按设置/泵的默认值。
   */
  async tick(
    options: { budgetMs?: number } = {},
  ): Promise<{ ran: number; remaining: number; progressed: boolean }> {
    setEnvCtx(this.env)
    const settings = await getTaskSettings()
    if (!settings.enabled) {
      return { ran: 0, remaining: 0, progressed: false }
    }
    const budgetMs =
      options.budgetMs && options.budgetMs > 0
        ? Math.min(60000, Math.max(200, options.budgetMs))
        : resolveTickBudget(settings, "do")
    const result = await runTick(this.store(), this.runtime(), {
      budgetMs,
      concurrency: settings.parallelUnits,
      owner: `do:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`,
    })

    if (result.remaining > 0) {
      if (result.progressed) this.noProgressStreak = 0
      else this.noProgressStreak += 1
      const delay = result.progressed
        ? 50
        : Math.min(60000, 1000 * Math.pow(2, Math.min(6, this.noProgressStreak)))
      await this.state.storage.setAlarm(Date.now() + delay)
    } else {
      this.noProgressStreak = 0
      try {
        await this.state.storage.deleteAlarm()
      } catch {
        // deleteAlarm 在 alarm 处理器内可能失败，属正常
      }
    }
    return result
  }

  // ───────────────────────── Alarm ─────────────────────────

  async alarm(): Promise<void> {
    try {
      await this.tick({})
    } catch (err) {
      // alarm 的自动重试只有 6 次；这里自己吞掉并重新排期，保证长跑任务不会
      // 因为一次下游抖动就永久停摆。
      console.error("[TaskRunner] alarm tick failed:", err)
      try {
        await this.state.storage.setAlarm(Date.now() + 30000)
      } catch {}
    }
  }

  /** 非 RPC 入口的兜底（某些平台会以 HTTP 方式探测） */
  async fetch(): Promise<Response> {
    return new Response(
      JSON.stringify({ code: 200, message: "task runner", data: null }),
      { headers: { "content-type": "application/json" } },
    )
  }
}
