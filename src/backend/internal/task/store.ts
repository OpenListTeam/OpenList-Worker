/**
 * 任务存储抽象。
 *
 * 有两套实现：
 *   1. `store_do.ts`——Durable Object 内置 SQLite（Cloudflare 首选，强一致、
 *      行级更新、alarm 自驱）；
 *   2. `store_doc.ts`——把每个类型存成一份 JSON 文档（EdgeOne / ESA / Vercel /
 *      Node 等没有 DO 的运行时）。
 *
 * 两者都实现 `TaskRunnerStore`，因此 runner 与各 handler 只依赖接口，不感知
 * 具体后端。API 层用 `TaskAdmin`（不需要 claim）。
 */
import type { TaskRecord, TaskType } from "./types"

export interface TaskListQuery {
  type: TaskType
  states?: number[]
  creator?: number
  limit?: number
}

export interface TaskClaimQuery {
  /** 按顺序尝试的类型 */
  types: TaskType[]
  now: number
  owner: string
  /** 文档存储的租约时长；DO 实现忽略（用 updated_at 判僵尸） */
  leaseMs: number
  /** running 超过该时长视为僵尸任务，可被重新认领 */
  staleMs: number
}

/** API 侧需要的操作 */
export interface TaskAdmin {
  enqueue(record: TaskRecord): Promise<void>
  list(query: TaskListQuery): Promise<TaskRecord[]>
  /** 按 type 定位文档（DO 实现忽略 type，主键全局唯一） */
  get(type: TaskType, id: string): Promise<TaskRecord | null>
  /**
   * 列级更新：只写传入的字段，避免把 runner 刚写入的进度覆盖掉。
   * 文档存储按 type 定位文档；DO 存储忽略 type。
   */
  patch(
    type: TaskType,
    id: string,
    patch: Partial<TaskRecord>,
  ): Promise<TaskRecord | null>
  remove(type: TaskType, id: string): Promise<void>
  removeMany(entries: Array<{ type: TaskType; id: string }>): Promise<void>
  countActive(creatorId?: number): Promise<number>
  /** 淘汰该类型的已完成任务，只保留最近 keepDone 条 */
  prune?(type: TaskType, keepDone: number): Promise<void>
}

/** runner 侧额外需要原子认领 */
export interface TaskRunnerStore extends TaskAdmin {
  claim(query: TaskClaimQuery): Promise<TaskRecord | null>
}

/** 是否到点可执行（不含 running 僵尸判定，那需要 staleMs） */
export function isRunnableAt(record: TaskRecord, now: number): boolean {
  if (record.state === 0 || record.state === 8) {
    return (record.next_run_at || 0) <= now
  }
  return false
}

/**
 * 选择可认领的任务。
 *
 * - pending / waiting_retry：到点即可；
 * - running：只有「租约过期」或「updated_at 超过 staleMs」才算僵尸。
 *   这条是崩溃恢复的关键：isolate 被杀后没有 finally，只能靠超时判定。
 */
export function pickRunnable(
  tasks: TaskRecord[],
  query: TaskClaimQuery,
): TaskRecord | null {
  const now = query.now
  for (const task of tasks) {
    if (task.state === 0 || task.state === 8) {
      if ((task.next_run_at || 0) <= now) return task
      continue
    }
    if (task.state === 1) {
      const leaseExpired =
        !task.lease || !task.lease.expires_at || task.lease.expires_at <= now
      const stale = now - (task.updated_at || 0) > query.staleMs
      if (leaseExpired || stale) return task
    }
  }
  return null
}

/**
 * 淘汰已完成任务，保留最近 `keepDone` 条。
 *
 * 只淘汰终态，绝不淘汰活跃任务——否则用户会看到「任务凭空消失」。
 */
export function pruneDoneTasks(
  tasks: TaskRecord[],
  keepDone: number,
): TaskRecord[] {
  const done: TaskRecord[] = []
  const keep: TaskRecord[] = []
  for (const task of tasks) {
    if (task.state === 2 || task.state === 4 || task.state === 7) {
      done.push(task)
    } else {
      keep.push(task)
    }
  }
  if (done.length <= keepDone) return tasks
  done.sort((a, b) => (b.updated_at || 0) - (a.updated_at || 0))
  return [...keep, ...done.slice(0, keepDone)]
}

/** 单类型文档的任务条数上限：防止一份文档无限增长（KV/D1 都有大小限制） */
export const MAX_TASKS_PER_DOC = 200

export function capTasks(tasks: TaskRecord[]): TaskRecord[] {
  if (tasks.length <= MAX_TASKS_PER_DOC) return tasks
  // 活跃任务永远不裁（裁掉会让用户以为任务丢失），只用剩余名额保留终态任务
  const active = tasks.filter(
    (t) => t.state !== 2 && t.state !== 4 && t.state !== 7,
  )
  const done = tasks
    .filter((t) => t.state === 2 || t.state === 4 || t.state === 7)
    .sort((a, b) => (b.updated_at || 0) - (a.updated_at || 0))
  const room = Math.max(0, MAX_TASKS_PER_DOC - active.length)
  return [...active, ...done.slice(0, room)]
}
