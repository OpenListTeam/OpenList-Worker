/**
 * 任务执行器：分片推进 + 断点续跑 + 取消/重试 + 完成前校验。
 *
 * 设计约束：
 *   - 一次 tick 有硬时间预算（默认 2s，可配），预算内可执行多个 unit；
 *   - 每个 unit 完成后只写「变化的列」，避免整条记录重写（DO 按行计费）；
 *   - 崩溃恢复：running 且超时未见更新的任务会被重新认领（见各 store 的 claim）；
 *   - 连续无进展会被熔断，避免无限重试烧配额。
 */
import { getTaskSettings, type TaskSettings } from "./settings"
import type { TaskRunnerStore } from "./store"
import {
  TASK_STATE,
  computeProgress,
  isTerminalState,
  RUNNABLE_TYPES,
  type TaskRecord,
  type TaskType,
} from "./types"
import type { TaskRuntime } from "../op/transfer"
import { copyTaskHandler, moveTaskHandler } from "./handlers/copy_move"
import { offlineDownloadHandler } from "./handlers/offline_download"

export interface TaskUnitResult {
  cursor?: unknown
  totalBytes?: number
  doneBytes?: number
  progress?: number
  status?: string
  /** 所有 unit 已完成（runner 会接着跑 verify） */
  finished?: boolean
}

export interface TaskVerifyResult {
  ok: boolean
  error?: string
}

export interface TaskHandler {
  type: TaskType
  /** 执行一个最小单元（一个文件 / 一个目录 / 一个条目 / 一个 URL） */
  runUnit(
    rt: TaskRuntime,
    task: TaskRecord,
    deadline: number,
  ): Promise<TaskUnitResult>
  /** 置为 succeeded 之前的一致性校验 */
  verify(rt: TaskRuntime, task: TaskRecord): Promise<TaskVerifyResult>
}

const HANDLERS: Partial<Record<TaskType, TaskHandler>> = {
  copy: copyTaskHandler,
  move: moveTaskHandler,
  offline_download: offlineDownloadHandler,
}

/** 仅供测试：注入/移除 handler（生产代码不要调用） */
export function __setTaskHandlerForTest(
  type: TaskType,
  handler: TaskHandler | null,
): void {
  if (handler) HANDLERS[type] = handler
  else delete HANDLERS[type]
}

export function getHandler(type: TaskType): TaskHandler | undefined {
  return HANDLERS[type]
}

export function hasHandler(type: TaskType): boolean {
  return Boolean(HANDLERS[type])
}

/** 进度落盘最小间隔：过于频繁会打满 DO 的「行写」/ KV 的写配额 */
const PROGRESS_FLUSH_MS = 3000
/** 取消检查间隔 */
const CANCEL_CHECK_MS = 3000
/** running 超过该时长没更新，视为僵尸任务 */
export const TASK_STALE_MS = 5 * 60 * 1000
/** 文档存储的租约时长（DO 存储忽略） */
export const TASK_LEASE_MS = 90 * 1000
/** 连续多少轮 tick 无进展就熔断 */
const MAX_STALLED_ATTEMPTS = 3

export interface TickOptions {
  budgetMs: number
  concurrency: number
  owner: string
}

export interface TickResult {
  ran: number
  remaining: number
  progressed: boolean
}

function retryDelayMs(retry: number): number {
  return Math.min(5 * 60 * 1000, 5000 * Math.pow(3, Math.max(0, retry - 1)))
}

function errorText(err: any): string {
  const message = String(err?.message || err || "unknown error")
  return message.length > 2000 ? `${message.slice(0, 2000)}…` : message
}

/**
 * 执行一个已认领的任务，直到预算用尽或任务结束。
 * 返回「本轮是否有实际进展」，用于熔断与 tick 统计。
 */
async function executeTask(
  store: TaskRunnerStore,
  rt: TaskRuntime,
  initial: TaskRecord,
  deadline: number,
  settings: TaskSettings,
  owner: string,
): Promise<boolean> {
  const handler = getHandler(initial.type)
  if (!handler) {
    await store.patch(initial.type, initial.id, {
      state: TASK_STATE.failed,
      status: "unsupported task type",
      error: `no handler registered for task type "${initial.type}"`,
      end_time: new Date().toISOString(),
      updated_at: Date.now(),
      lease: null,
    })
    return false
  }

  let record = initial
  let totalBytes = record.total_bytes
  let doneBytes = record.done_bytes
  let progressed = false
  let lastFlush = 0
  let lastCancelCheck = 0

  // 每个任务一份 runtime 副本：checkpoint 只能写自己的 cursor
  const taskRt: TaskRuntime = {
    ...rt,
    checkpoint: async (cursor: unknown) => {
      record = { ...record, cursor }
      await store.patch(initial.type, initial.id, {
        cursor,
        updated_at: Date.now(),
        lease: { owner, expires_at: Date.now() + TASK_LEASE_MS },
      })
    },
  }

  const flush = async (extra: Partial<TaskRecord> = {}) => {
    const progress =
      extra.progress ?? computeProgress(doneBytes, totalBytes)
    const patch: Partial<TaskRecord> = {
      cursor: record.cursor,
      total_bytes: totalBytes,
      done_bytes: doneBytes,
      progress,
      updated_at: Date.now(),
      lease: {
        owner,
        expires_at: Date.now() + TASK_LEASE_MS,
      },
      ...extra,
    }
    record = { ...record, ...patch }
    lastFlush = Date.now()
    await store.patch(initial.type, initial.id, patch)
  }

  try {
    while (Date.now() < deadline) {
      // 取消检查：每 3s 读一次最新状态（读比写便宜得多）
      if (Date.now() - lastCancelCheck > CANCEL_CHECK_MS) {
        lastCancelCheck = Date.now()
        const fresh = await store.get(initial.type, initial.id)
        if (!fresh) return progressed
        if (fresh.state === TASK_STATE.canceling) {
          record = { ...record, ...fresh }
          await store.patch(initial.type, initial.id, {
            state: TASK_STATE.canceled,
            status: "canceled",
            end_time: new Date().toISOString(),
            updated_at: Date.now(),
            lease: null,
          })
          return progressed
        }
        record = { ...record, ...fresh, cursor: record.cursor }
      }

      const result = await handler.runUnit(taskRt, record, deadline)
      progressed = true

      if (result.cursor !== undefined) record.cursor = result.cursor
      if (typeof result.totalBytes === "number") {
        totalBytes = Math.max(totalBytes, result.totalBytes)
      }
      if (typeof result.doneBytes === "number") {
        doneBytes = Math.max(doneBytes, result.doneBytes)
      }

      if (result.finished) {
        await flush({
          state: TASK_STATE.running,
          status: result.status || record.status,
        })
        const verdict = await handler.verify(taskRt, record)
        const now = Date.now()
        if (verdict.ok) {
          await store.patch(initial.type, initial.id, {
            state: TASK_STATE.succeeded,
            status: result.status || record.status || "completed",
            progress: 100,
            done_bytes: totalBytes > 0 ? totalBytes : doneBytes,
            verified: true,
            error: "",
            end_time: new Date(now).toISOString(),
            updated_at: now,
            lease: null,
          })
        } else {
          await store.patch(initial.type, initial.id, {
            state: TASK_STATE.failed,
            status: "verification failed",
            error: verdict.error || "post-transfer verification failed",
            verified: false,
            end_time: new Date(now).toISOString(),
            updated_at: now,
            lease: null,
          })
        }
        return true
      }

      if (Date.now() - lastFlush > PROGRESS_FLUSH_MS) {
        await flush({ state: TASK_STATE.running, status: result.status ?? record.status })
      } else if (result.status !== undefined) {
        record = { ...record, status: result.status }
      }
    }

    // 预算用尽：保存游标并续租，下一次 tick 从这里继续
    await flush({ state: TASK_STATE.running })
    return progressed
  } catch (err: any) {
    const now = Date.now()
    const retry = (initial.retry || 0) + 1
    const pending = err?.pending
    const cursor = pending
      ? { ...(record.cursor as any), upload: pending }
      : record.cursor
    const attempts = (initial.attempts || 0) + 1
    const stalled = !progressed && attempts >= MAX_STALLED_ATTEMPTS
    // 记录里的 max_retry 在入队时已由设置填充；这里必须尊重它（包括 0）。
    // 历史实现用 Math.max 会让「用户把重试设为 0」失效。
    const maxRetry = Number.isFinite(initial.max_retry)
      ? initial.max_retry
      : settings.maxRetry[initial.type] || 0

    if (!stalled && retry <= maxRetry) {
      await store.patch(initial.type, initial.id, {
        state: TASK_STATE.waitingRetry,
        retry,
        attempts,
        cursor,
        error: errorText(err),
        status: `retry ${retry}/${maxRetry} scheduled`,
        next_run_at: now + retryDelayMs(retry),
        updated_at: now,
        lease: null,
      })
    } else {
      await store.patch(initial.type, initial.id, {
        state: TASK_STATE.failed,
        retry,
        attempts,
        cursor,
        error: stalled
          ? `stalled: no progress after ${attempts} attempts; last error: ${errorText(err)}`
          : errorText(err),
        status: stalled ? "stalled" : "failed",
        end_time: new Date(now).toISOString(),
        updated_at: now,
        lease: null,
      })
    }
    return false
  }
}

/**
 * 跑一个 tick。
 *
 * @param budgetMs 本次 tick 的墙钟预算（会再按 deadline 精确截断）
 * @param concurrency 并发任务数（1~4；受「每次调用 6 条出站连接」限制）
 */
export async function runTick(
  store: TaskRunnerStore,
  rt: TaskRuntime,
  options: TickOptions,
): Promise<TickResult> {
  const settings = await getTaskSettings()
  if (!settings.enabled) {
    return { ran: 0, remaining: 0, progressed: false }
  }
  const deadline = Date.now() + Math.max(0, options.budgetMs)
  let ran = 0
  let progressed = false
  let stop = false

  const worker = async () => {
    while (!stop && Date.now() < deadline) {
      let claimed: TaskRecord | null = null
      try {
        claimed = await store.claim({
          types: RUNNABLE_TYPES,
          now: Date.now(),
          owner: options.owner,
          leaseMs: TASK_LEASE_MS,
          staleMs: TASK_STALE_MS,
        })
      } catch (err) {
        console.error("[Task] claim failed:", err)
        stop = true
        return
      }
      if (!claimed) {
        stop = true
        return
      }
      ran += 1
      if (isTerminalState(claimed.state)) continue
      const did = await executeTask(
        store,
        rt,
        claimed,
        deadline,
        settings,
        options.owner,
      )
      if (did) progressed = true
    }
  }

  const concurrency = Math.min(4, Math.max(1, options.concurrency || 1))
  await Promise.all(Array.from({ length: concurrency }, () => worker()))

  let remaining = 0
  try {
    remaining = await store.countActive()
  } catch {
    remaining = 0
  }
  return { ran, remaining, progressed }
}

/** 是否有可继续执行的任务（DO 用来决定是否继续排 alarm） */
export async function hasRunnableWork(store: TaskRunnerStore): Promise<boolean> {
  const settings = await getTaskSettings()
  if (!settings.enabled) return false
  return (await store.countActive()) > 0
}
