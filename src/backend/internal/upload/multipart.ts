/**
 * 服务层 Multipart 上传会话管理器。
 *
 * 目标：让 TS 后端提供与官方前端 `multipart.ts` 完全一致的 API 契约
 * （/fs/multipart/init | chunk | complete | status），内部桥接到驱动层的
 * createUploadSession / uploadPart / completeUploadSession（会话式分片）。
 *
 * 说明：
 * - 会话状态存于进程内 Map（Worker 单实例存活期间可断点续传）。
 *   跨实例/冷启动恢复依赖驱动 session token 的自包含性，本层不做 KV 持久化。
 * - chunk 按 index（0-based）桥接到驱动 uploadPart(partNumber = index + 1)，
 *   与官方前端 multipart.ts 的 chunk index 语义对齐。
 * - received 以区间数组 [number, number][] 表示，供前端断点续传跳过已收分片。
 */

export type MultipartState =
  | "receiving"
  | "completed"
  | "failed_retriable"
  | "failed_permanent"
  | "aborted"

export interface MultipartSession {
  upload_id: string
  state: MultipartState
  attempt: number
  path: string
  size: number
  chunk_size: number
  total_chunks: number
  /** 已收到分片 index 集合（0-based） */
  received: Set<number>
  /** 驱动层 session token（createUploadSession 返回） */
  driver_session: string
  /** 驱动层分片 md5（complete 时传给 completeUploadSession） */
  partMd5s: (string | undefined)[]
  /** 驱动名 + 存储引用，用于 chunk/complete 时重新 resolve 驱动 */
  storage_driver: string
  /**
   * 会话所有者的用户 id。
   *
   * 安全不变量：分片会话是**用户私有状态**，续传/完成/查询都必须校验所有者。
   * 历史缺陷：会话只按 `path + size` 复用，不含用户维度，导致不同用户（即使
   * base_path 不同）会命中同一个会话并互相续传（实测：两个不同根目录的用户
   * 拿到同一个 upload_id，且 resumed=true）。
   */
  owner_id?: number
  /** 创建会话时的用户根目录，用于校验会话未被跨根复用 */
  owner_root?: string
  created_at: number
  error?: string
}

export interface MultipartSnapshot {
  upload_id: string
  state: MultipartState
  attempt: number
  path: string
  size: number
  chunk_size: number
  total_chunks: number
  received: [number, number][]
  received_bytes: number
  frontier: number
  storage_progress: number
  error?: string
}

const sessions = new Map<string, MultipartSession>()

const CHUNK_MIN = 1 * 1024 * 1024 // 1MB
const CHUNK_MAX = 64 * 1024 * 1024 // 64MB
const CHUNK_DEFAULT = 10 * 1024 * 1024 // 10MB

/** 将前端建议的 chunk_size clamp 到 [1MB, 64MB] */
export function clampChunkSize(raw: number): number {
  if (!Number.isFinite(raw) || raw <= 0) return CHUNK_DEFAULT
  return Math.min(CHUNK_MAX, Math.max(CHUNK_MIN, Math.floor(raw)))
}

/** 区间数组 → 有序区间列表（合并相邻） */
function intervalsOf(set: Set<number>): [number, number][] {
  const arr = Array.from(set).sort((a, b) => a - b)
  if (arr.length === 0) return []
  const out: [number, number][] = []
  let start = arr[0]
  let end = arr[0]
  for (let i = 1; i < arr.length; i++) {
    if (arr[i] === end + 1) {
      end = arr[i]
    } else {
      out.push([start, end])
      start = end = arr[i]
    }
  }
  out.push([start, end])
  return out
}

export function snapshot(s: MultipartSession): MultipartSnapshot {
  const intervals = intervalsOf(s.received)
  const receivedBytes = s.received.size * s.chunk_size
  // frontier：连续已收的最大 index + 1（驱动顺序写入进度）
  let frontier = 0
  for (let i = 0; i < s.total_chunks; i++) {
    if (!s.received.has(i)) break
    frontier = i + 1
  }
  const storageProgress =
    s.total_chunks > 0
      ? Math.floor((s.received.size / s.total_chunks) * 100)
      : 0
  return {
    upload_id: s.upload_id,
    state: s.state,
    attempt: s.attempt,
    path: s.path,
    size: s.size,
    chunk_size: s.chunk_size,
    total_chunks: s.total_chunks,
    received: intervals,
    received_bytes: receivedBytes,
    frontier,
    storage_progress: storageProgress,
    error: s.error,
  }
}

export function getSession(uploadId: string): MultipartSession | undefined {
  return sessions.get(uploadId)
}

/**
 * 查找同 owner + path + size 的未完成会话（用于断点续传）。
 *
 * `ownerId` 必填：会话必须按所有者隔离，否则不同用户会共享同一上传会话。
 * 未绑定所有者的历史会话（本改动之前创建的）不再被复用，避免跨用户命中。
 */
export function findReceivingSession(
  path: string,
  size: number,
  ownerId?: number,
): MultipartSession | undefined {
  if (ownerId === undefined) return undefined
  for (const s of sessions.values()) {
    if (s.owner_id !== ownerId) continue
    if (
      s.path === path &&
      s.size === size &&
      (s.state === "receiving" || s.state === "failed_retriable")
    ) {
      return s
    }
  }
  return undefined
}

export function putSession(s: MultipartSession): void {
  sessions.set(s.upload_id, s)
}

export function deleteSession(uploadId: string): void {
  sessions.delete(uploadId)
}

/** 生成 upload_id */
export function newUploadId(): string {
  const rnd =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2) + Date.now().toString(36)
  return `mp_${rnd}`
}

/** 清理过期的 completed / aborted 会话（简单防内存泄漏） */
export function pruneSessions(maxAgeMs = 60 * 60 * 1000): void {
  const now = Date.now()
  for (const [id, s] of sessions) {
    if (
      (s.state === "completed" || s.state === "aborted") &&
      now - s.created_at > maxAgeMs
    ) {
      sessions.delete(id)
    }
  }
}
