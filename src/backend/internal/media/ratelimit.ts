/**
 * 媒体协议认证限流（对齐 Go 版 server/handles/media_ratelimit.go）。
 *
 * Emby / Subsonic 的认证入口不经过 /api/auth/login，必须自行复用失败计数，
 * 否则等于附送一个无限次爆破接口。
 *
 * 与 Go 的差异：Go 用全局 LoginCache（进程内），TS 的一个部署会跑多个 isolate，
 * 进程内计数只能做到「尽力而为」。这里仍然按 IP + 用户名双维度计数，
 * 并额外把已锁定的 IP 写入持久化存储（限流键单独存，避免污染媒体库文档）。
 */

import { readPersistedSecret, writePersistedSecret } from "../model/store/json"

const MAX_RETRIES = 10
const LOCK_MS = 15 * 60 * 1000
const WINDOW_MS = 15 * 60 * 1000
const PERSIST_PREFIX = "openlist_media_authlock_v1:"

interface Bucket {
  count: number
  firstAt: number
  lockedUntil: number
}

const buckets = new Map<string, Bucket>()
const MAX_BUCKETS = 5000

const prune = () => {
  const now = Date.now()
  if (buckets.size < MAX_BUCKETS) return
  for (const [key, b] of buckets) {
    if (b.lockedUntil && b.lockedUntil > now) continue
    if (now - b.firstAt > WINDOW_MS) buckets.delete(key)
  }
}

const bucketOf = (key: string): Bucket => {
  let b = buckets.get(key)
  const now = Date.now()
  if (!b || (now - b.firstAt > WINDOW_MS && (!b.lockedUntil || b.lockedUntil < now))) {
    b = { count: 0, firstAt: now, lockedUntil: 0 }
    buckets.set(key, b)
    prune()
  }
  return b
}

export const clientIp = (c: any): string => {
  const h = c?.req?.header?.("x-forwarded-for") || c?.req?.header?.("x-real-ip") || ""
  return String(h).split(",")[0].trim() || "unknown"
}

export const authLocked = async (c: any): Promise<boolean> => {
  const key = `media:${clientIp(c)}`
  const b = buckets.get(key)
  if (b?.lockedUntil && b.lockedUntil > Date.now()) return true
  // 跨 isolate 的锁定状态（尽力而为，读失败不影响主流程）
  try {
    const raw = await readPersistedSecret(c?.env, PERSIST_PREFIX + clientIp(c))
    if (raw) {
      const until = Number(raw) || 0
      if (until > Date.now()) {
        const local = bucketOf(key)
        local.lockedUntil = until
        return true
      }
    }
  } catch {
    /* ignore */
  }
  return false
}

export const authLockedFor = async (c: any, username: string) => {
  if (await authLocked(c)) return true
  const name = String(username || "").trim().toLowerCase()
  if (!name) return false
  const b = buckets.get(`media:user:${name}`)
  return !!b?.lockedUntil && b.lockedUntil > Date.now()
}

export const authFailed = async (c: any, username = "") => {
  const ip = clientIp(c)
  const key = `media:${ip}`
  const b = bucketOf(key)
  b.count += 1
  if (b.count >= MAX_RETRIES) {
    b.lockedUntil = Date.now() + LOCK_MS
    try {
      await writePersistedSecret(
        c?.env,
        PERSIST_PREFIX + ip,
        String(b.lockedUntil),
      )
    } catch {
      /* ignore */
    }
  }
  const name = String(username || "").trim().toLowerCase()
  if (name) {
    const ub = bucketOf(`media:user:${name}`)
    ub.count += 1
    if (ub.count >= MAX_RETRIES) ub.lockedUntil = Date.now() + LOCK_MS
  }
}

export const authSucceeded = (c: any, username = "") => {
  buckets.delete(`media:${clientIp(c)}`)
  const name = String(username || "").trim().toLowerCase()
  if (name) buckets.delete(`media:user:${name}`)
}

/** 测试/管理用：清空内存计数 */
export const resetAuthLimit = () => buckets.clear()
