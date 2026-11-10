/**
 * 任务管理：入队、查询、取消/重试/删除、配额与清理。
 *
 * 这一层同时服务两个入口：
 *   - `/api/task/*`（前端任务页）
 *   - `/fs/*`（复制/移动等写操作在判定为 async 后入队）
 *
 * 存储选择：有 TASK_DO 绑定用 Durable Object，否则用文档存储。
 */
import {
  ACTIVE_STATES,
  DONE_STATES,
  TASK_STATE,
  createTaskRecord,
  toTaskInfo,
  type TaskInfo,
  type TaskRecord,
  type TaskType,
} from "./types"
import type { TaskAdmin } from "./store"
import { DocTaskStore } from "./store_doc"
import { DoTaskClient, getTaskDoStub, hasTaskDo } from "./store_do_client"
import { getTaskSettings, resolveTickBudget, type TaskSettings } from "./settings"
import { TASK_LEASE_MS, TASK_STALE_MS, runTick } from "./runner"
import { setEnvCtx } from "../model/db"
import type { TaskRuntime } from "../op/transfer"

/** 单个用户同时存在的未完成任务上限，防止刷爆存储配额 */
export const MAX_ACTIVE_TASKS_PER_USER = 100

export class TaskError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
  ) {
    super(message)
    this.name = "TaskError"
  }
}

export interface TaskActor {
  id: number
  username: string
  role: number
  isAdmin: boolean
}

export async function getTaskAdmin(env?: any): Promise<TaskAdmin> {
  const stub = getTaskDoStub(env)
  if (stub) return new DoTaskClient(stub)
  return DocTaskStore.create(env)
}

function assertOwner(record: TaskRecord | null, actor: TaskActor): TaskRecord {
  // 与 Go 一致：非本人一律 404，避免用错误码差异探测 tid 是否存在
  if (!record) throw new TaskError("task not found", 404, "NOT_FOUND")
  if (!actor.isAdmin && record.creator_id !== actor.id) {
    throw new TaskError("task not found", 404, "NOT_FOUND")
  }
  return record
}

export interface EnqueueInput {
  type: TaskType
  name: string
  creator_id: number
  creator: string
  creator_role: number
  payload: unknown
  cursor?: unknown
  total_bytes?: number
}

/** 入队；调用方负责判定 sync/async 与权限校验（此时已完成） */
export async function enqueueTask(
  env: any,
  input: EnqueueInput,
): Promise<TaskRecord> {
  const settings = await getTaskSettings()
  if (!settings.enabled) {
    throw new TaskError(
      "task system is disabled by settings (task_enabled=false)",
      503,
      "TASKS_DISABLED",
    )
  }
  const store = await getTaskAdmin(env)
  const active = await store.countActive(input.creator_id)
  if (active >= MAX_ACTIVE_TASKS_PER_USER) {
    throw new TaskError(
      `too many active tasks (${active}); wait for some to finish or clear them`,
      429,
      "TASK_LIMIT",
    )
  }
  const record = createTaskRecord({
    type: input.type,
    name: input.name,
    creator_id: input.creator_id,
    creator: input.creator,
    creator_role: input.creator_role,
    max_retry: settings.maxRetry[input.type],
    payload: input.payload,
    cursor: input.cursor,
    total_bytes: input.total_bytes,
  })
  await store.enqueue(record)
  if (store.prune) {
    try {
      await store.prune(input.type, settings.keepDone)
    } catch (err) {
      console.warn("[Task] prune failed:", err)
    }
  }
  return record
}

function stateFilter(which: "undone" | "done"): number[] {
  return which === "done" ? DONE_STATES : ACTIVE_STATES
}

/**
 * 记录一条「已在请求内完成」的任务（同步路径）。
 *
 * 对齐 Go 的行为：小操作虽然同步完成，也会出现在任务页的 done 列表里。
 * 写失败绝不影响主操作——任务历史是附加信息，不是正确性的一部分。
 */
export async function recordCompletedTask(
  env: any,
  input: EnqueueInput,
  status = "completed",
): Promise<void> {
  try {
    const settings = await getTaskSettings()
    if (!settings.enabled) return
    const store = await getTaskAdmin(env)
    const record = createTaskRecord({
      type: input.type,
      name: input.name,
      creator_id: input.creator_id,
      creator: input.creator,
      creator_role: input.creator_role,
      max_retry: 0,
      payload: input.payload,
      total_bytes: input.total_bytes,
    })
    const now = Date.now()
    record.state = TASK_STATE.succeeded
    record.progress = 100
    record.done_bytes = record.total_bytes
    record.start_time = new Date(now).toISOString()
    record.end_time = new Date(now).toISOString()
    record.status = status
    record.verified = true
    record.updated_at = now
    await store.enqueue(record)
    if (store.prune) {
      try {
        await store.prune(input.type, settings.keepDone)
      } catch {}
    }
  } catch (err) {
    console.warn("[Task] failed to record completed task:", err)
  }
}

export async function listTaskInfos(
  env: any,
  type: TaskType,
  which: "undone" | "done",
  actor: TaskActor,
): Promise<TaskInfo[]> {
  const store = await getTaskAdmin(env)
  const records = await store.list({
    type,
    states: stateFilter(which),
    creator: actor.isAdmin ? undefined : actor.id,
    limit: 200,
  })
  return records.map(toTaskInfo)
}

export async function getTaskDetail(
  env: any,
  type: TaskType,
  id: string,
  actor: TaskActor,
): Promise<TaskInfo> {
  const store = await getTaskAdmin(env)
  return toTaskInfo(assertOwner(await store.get(type, id), actor))
}

type TaskAction = "cancel" | "delete" | "retry"

export async function applyTaskAction(
  env: any,
  type: TaskType,
  id: string,
  actor: TaskActor,
  action: TaskAction,
): Promise<void> {
  const store = await getTaskAdmin(env)
  const record = assertOwner(await store.get(type, id), actor)
  await finishAction(store, record, action)
}

async function finishAction(
  store: TaskAdmin,
  record: TaskRecord,
  action: TaskAction,
): Promise<void> {
  const now = Date.now()
  if (action === "delete") {
    // 先置 canceled 再删：runner 下一次读不到记录会自行停止
    if (!DONE_STATES.includes(record.state)) {
      await store.patch(record.type, record.id, {
        state: TASK_STATE.canceled,
        status: "deleted",
        updated_at: now,
        lease: null,
      })
    }
    await store.remove(record.type, record.id)
    return
  }

  if (action === "cancel") {
    if (DONE_STATES.includes(record.state)) return
    // 正在执行 → canceling，让 runner 在下一个 unit 边界收尾；
    // 未执行 → 直接 canceled，不依赖是否有 runner 在跑。
    const running = record.state === TASK_STATE.running
    await store.patch(record.type, record.id, {
      state: running ? TASK_STATE.canceling : TASK_STATE.canceled,
      status: running ? "canceling" : "canceled",
      end_time: running ? null : new Date(now).toISOString(),
      updated_at: now,
      lease: running ? record.lease || null : null,
    })
    return
  }

  // retry
  if (!DONE_STATES.includes(record.state)) {
    throw new TaskError(
      "task is still active; cancel it before retrying",
      400,
      "TASK_ACTIVE",
    )
  }
  await store.patch(record.type, record.id, {
    state: TASK_STATE.pending,
    status: "retrying",
    retry: 0,
    attempts: 0,
    error: "",
    end_time: null,
    next_run_at: now,
    updated_at: now,
    lease: null,
  })
}

export interface BulkResult {
  [tid: string]: string
}

export async function applyBulkAction(
  env: any,
  type: TaskType,
  ids: string[],
  actor: TaskActor,
  action: TaskAction,
): Promise<BulkResult> {
  const store = await getTaskAdmin(env)
  const result: BulkResult = {}
  for (const id of ids) {
    try {
      const record = assertOwner(await store.get(type, id), actor)
      await finishAction(store, record, action)
    } catch (err: any) {
      result[id] = String(err?.message || err)
    }
  }
  return result
}

export async function clearDoneTasks(
  env: any,
  type: TaskType,
  actor: TaskActor,
  onlySucceeded: boolean,
): Promise<void> {
  const store = await getTaskAdmin(env)
  const states = onlySucceeded ? [TASK_STATE.succeeded] : DONE_STATES
  const records = await store.list({
    type,
    states,
    creator: actor.isAdmin ? undefined : actor.id,
    limit: 500,
  })
  await store.removeMany(records.map((r) => ({ type: r.type, id: r.id })))
}

export async function retryFailedTasks(
  env: any,
  type: TaskType,
  actor: TaskActor,
): Promise<void> {
  const store = await getTaskAdmin(env)
  const records = await store.list({
    type,
    states: [TASK_STATE.failed],
    creator: actor.isAdmin ? undefined : actor.id,
    limit: 200,
  })
  for (const record of records) {
    await finishAction(store, record, "retry")
  }
}

/**
 * 入队后立即启动执行。
 *
 * - 有 DO：RPC 让 DO 自己排 alarm（入队请求返回后任务马上开始）；
 * - 无 DO：用 waitUntil 跑一个内联时间片（EdgeOne/Node 等）。
 */
export async function kickTaskPump(
  env: any,
  runtime: TaskRuntime = {},
): Promise<void> {
  const stub = getTaskDoStub(env)
  if (stub) {
    const promise = Promise.resolve(stub.tick({}))
    if (runtime.waitUntil) runtime.waitUntil(promise)
    else await promise
    return
  }
  const settings = await getTaskSettings()
  if (!settings.enabled) return
  const store = await DocTaskStore.create(env)
  const tick = runTick(store, { ...runtime, env }, {
    budgetMs: resolveTickBudget(settings, "inline"),
    concurrency: 1,
    owner: `inline:${Date.now()}`,
  })
  if (runtime.waitUntil) runtime.waitUntil(tick)
  else await tick
}

/** `/api/task/run` 使用：同步跑一个 tick 并返回结果 */
export async function runTaskPump(
  env: any,
  runtime: TaskRuntime,
  options: { budgetMs?: number; pump?: "http" | "cron" | "esa" | "node" } = {},
): Promise<{ ran: number; remaining: number; progressed: boolean; driver: string }> {
  setEnvCtx(env)
  const settings = await getTaskSettings()
  const budgetMs =
    options.budgetMs && options.budgetMs > 0
      ? Math.min(60000, Math.max(200, options.budgetMs))
      : resolveTickBudget(settings, options.pump || "http")
  const stub = getTaskDoStub(env)
  if (stub) {
    const result = await stub.tick({ budgetMs })
    return { ...result, driver: "do" }
  }
  const store = await DocTaskStore.create(env)
  const result = await runTick(store, runtime, {
    budgetMs,
    concurrency: settings.parallelUnits,
    owner: `http:${Date.now()}`,
  })
  return { ...result, driver: "doc" }
}

/** 是否存在 DO（用于诊断与前端提示） */
export function taskStoreKind(env?: any): "do" | "doc" {
  return hasTaskDo(env) ? "do" : "doc"
}

export { TASK_LEASE_MS, TASK_STALE_MS }
export type { TaskSettings }
