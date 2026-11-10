/**
 * 任务模型：字段与状态数值严格对齐 Go 版（tache + server/handles/task.go）。
 *
 * 为什么状态用数值：前端任务页直接展示 `state`，Go 的 tache.State 是
 * 0..9 的整数枚举。若改成字符串，前端会出现无法识别的状态（任务永远显示
 * 「未知」），因此这里保持数值不变。
 */

/** 与 github.com/OpenListTeam/tache 的 State 一一对应 */
export const TASK_STATE = {
  pending: 0,
  running: 1,
  succeeded: 2,
  canceling: 3,
  canceled: 4,
  errored: 5,
  failing: 6,
  failed: 7,
  waitingRetry: 8,
  beforeRetry: 9,
} as const

/** 未完成（undone）状态集合，对齐 Go taskRoute 的 /undone 过滤条件 */
export const ACTIVE_STATES: number[] = [
  TASK_STATE.pending,
  TASK_STATE.running,
  TASK_STATE.canceling,
  TASK_STATE.errored,
  TASK_STATE.failing,
  TASK_STATE.waitingRetry,
  TASK_STATE.beforeRetry,
]

/** 已完成（done）状态集合 */
export const DONE_STATES: number[] = [
  TASK_STATE.canceled,
  TASK_STATE.failed,
  TASK_STATE.succeeded,
]

/** 可被 runner 认领的状态 */
export const RUNNABLE_STATES: number[] = [
  TASK_STATE.pending,
  TASK_STATE.running,
  TASK_STATE.waitingRetry,
]

/**
 * 任务类型白名单：与 Go `SetupTaskRoute` 注册的分组完全一致。
 *
 * `upload`/`decompress_upload`/`offline_download_transfer` 在 TS 端暂无生产者，
 * 但必须保留，否则前端任务页切换标签会拿到 404。
 */
export const TASK_TYPES = [
  "upload",
  "copy",
  "move",
  "offline_download",
  "offline_download_transfer",
  "decompress",
  "decompress_upload",
  "seed_generate",
  "seed_save",
] as const

export type TaskType = (typeof TASK_TYPES)[number]

const TASK_TYPE_SET = new Set<string>(TASK_TYPES)

export function isTaskType(value: unknown): value is TaskType {
  return typeof value === "string" && TASK_TYPE_SET.has(value)
}

/**
 * 当前真正会被调度的类型。
 *
 * 顺序即执行优先级：下载/解压优先（用户在前台等待结果），其次 move（源端
 * 会被删除，越早完成越安全），再 copy，最后是种子计算。
 */
export const RUNNABLE_TYPES: TaskType[] = [
  "offline_download",
  "decompress",
  "move",
  "copy",
  "seed_generate",
  "seed_save",
]

export interface TaskLease {
  owner: string
  expires_at: number
}

/** 持久化的任务记录（payload/cursor 仅供内部使用，绝不通过 API 返回） */
export interface TaskRecord {
  id: string
  type: TaskType
  name: string
  creator_id: number
  creator: string
  creator_role: number
  state: number
  status: string
  progress: number
  total_bytes: number
  done_bytes: number
  start_time: string | null
  end_time: string | null
  error: string
  retry: number
  max_retry: number
  created_at: number
  updated_at: number
  next_run_at: number
  /** 连续无进展次数：用于退避与熔断 */
  attempts: number
  /** 完整性校验是否通过（仅 succeeded 前有意义） */
  verified: boolean
  cursor: unknown
  payload: unknown
  lease?: TaskLease | null
}

/** 对外暴露的任务信息（字段与 Go TaskInfo 完全一致） */
export interface TaskInfo {
  id: string
  name: string
  creator: string
  creator_role: number
  state: number
  status: string
  progress: number
  start_time: string | null
  end_time: string | null
  total_bytes: number
  error: string
}

export function isDoneState(state: number): boolean {
  return DONE_STATES.includes(state)
}

export function isActiveState(state: number): boolean {
  return ACTIVE_STATES.includes(state)
}

export function isTerminalState(state: number): boolean {
  return isDoneState(state)
}

/**
 * 转成前端契约对象。
 *
 * 注意：payload/cursor 一律不返回（可能含源路径、下载 URL 等敏感信息）。
 * progress 为 NaN 时按 100 处理，与 Go getTaskInfo 的行为一致。
 */
export function toTaskInfo(record: TaskRecord): TaskInfo {
  const progress = Number.isFinite(record.progress) ? record.progress : 100
  return {
    id: record.id,
    name: record.name,
    creator: record.creator || "",
    creator_role: Number.isFinite(record.creator_role)
      ? record.creator_role
      : -1,
    state: record.state,
    status: record.status || "",
    progress,
    start_time: record.start_time || null,
    end_time: record.end_time || null,
    total_bytes: Number.isFinite(record.total_bytes) ? record.total_bytes : 0,
    error: record.error || "",
  }
}

/** 新建记录：所有字段给全，避免不同存储实现各自补默认值导致漂移 */
export function createTaskRecord(input: {
  type: TaskType
  name: string
  creator_id?: number
  creator?: string
  creator_role?: number
  max_retry?: number
  payload?: unknown
  cursor?: unknown
  total_bytes?: number
}): TaskRecord {
  const now = Date.now()
  return {
    id: crypto.randomUUID(),
    type: input.type,
    name: input.name,
    creator_id: input.creator_id ?? 0,
    creator: input.creator ?? "",
    creator_role: input.creator_role ?? -1,
    state: TASK_STATE.pending,
    status: "",
    progress: 0,
    total_bytes: input.total_bytes ?? 0,
    done_bytes: 0,
    start_time: null,
    end_time: null,
    error: "",
    retry: 0,
    max_retry: input.max_retry ?? 2,
    created_at: now,
    updated_at: now,
    next_run_at: now,
    attempts: 0,
    verified: false,
    cursor: input.cursor ?? null,
    payload: input.payload ?? null,
    lease: null,
  }
}

/**
 * 计算进度百分比。
 *
 * 优先按字节（跨存储复制/下载/解压都能给出 total_bytes），字节未知时退回
 * 百分比 0（前端会显示「进行中」而不是假的 100%）。完成时调用方显式写 100。
 */
export function computeProgress(
  doneBytes: number,
  totalBytes: number,
): number {
  if (!Number.isFinite(totalBytes) || totalBytes <= 0) return 0
  const value = (Math.max(0, doneBytes) / totalBytes) * 100
  if (!Number.isFinite(value)) return 0
  return Math.min(100, Math.max(0, value))
}
