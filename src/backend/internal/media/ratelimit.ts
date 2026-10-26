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

// 与 Go 侧一致：5 次失败锁定 5 分钟（model.DefaultMaxAuthRetries / DefaultLockDuration）
const MAX_RETRIES = 5
const LOCK_MS = 5 * 60 * 1000
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
  if (buckets.size < MAX_BUCKETS) return
  // 仍然超限：按最早创建时间淘汰一批。
  // 用户名来自请求参数、可被随意伪造，只做 TTL 清理挡不住「每分钟换几千个
  // 用户名」的请求，必须给 Map 一个硬上限。
  const victims = Array.from(buckets.entries()).sort(
    (a, b) => a[1].firstAt - b[1].firstAt,
  )
  const drop = Math.max(1, Math.ceil(victims.length * 0.1))
  for (let i = 0; i < drop; i++) buckets.delete(victims[i][0])
}

/** 用户名维度的 key；空用户名返回空串（调用方跳过），并限制长度防止超长 key */
const usernameKey = (username: string) => {
  const name = String(username || "").trim().toLowerCase()
  if (!name) return ""
  return `media:user:${name.slice(0, 128)}`
}

const bucketOf = (key: string): Bucket => {
  let b = buckets.get(key)
  const now = Date.now()
  // 锁定到期或统计窗口过期都要重新计数。
  // 否则锁定结束后第一次失败就会累加到旧计数上、立刻再次锁定（Go 的缓存带 TTL，
  // 过期即清零，这里必须等价），用户会陷入「错一次锁五分钟」的循环。
  if (
    !b ||
    (b.lockedUntil && b.lockedUntil <= now) ||
    now - b.firstAt > WINDOW_MS
  ) {
    b = { count: 0, firstAt: now, lockedUntil: 0 }
    buckets.set(key, b)
    prune()
  }
  return b
}

/**
 * 客户端真实 IP。
 *
 * Workers 上 `cf-connecting-ip` 由边缘注入、客户端改不了；`x-forwarded-for`
 * 是客户端自带的请求头，只按它限流等于没限流——换个头就能绕过，还能把伪造
 * IP 当持久化 key 刷写入。优先级固定为 cf-connecting-ip → x-real-ip →
 * x-forwarded-for 首段（仅非 CF 部署才会走到最后一项）。
 */
export const clientIp = (c: any): string => {
  const h =
    c?.req?.header?.("cf-connecting-ip") ||
    c?.req?.header?.("x-real-ip") ||
    c?.req?.header?.("x-forwarded-for") ||
    ""
  return String(h).split(",")[0].trim() || "unknown"
}

const IPV4 = /^(\d{1,3}\.){3}\d{1,3}$/
const IPV6 = /^[0-9a-f:.]+$/i

/** 只有格式合法的 IP 才允许作为持久化 key，避免伪造串污染存储 */
const isPersistableIp = (ip: string) =>
  ip !== "unknown" && (IPV4.test(ip) || IPV6.test(ip))

// 持久化写入自限：每个 isolate 每分钟最多写 N 次。
// 没有这一层，攻击者轮换伪造 IP 就能把锁定状态变成写放大（KV/D1 计费 + 配额）。
const PERSIST_WINDOW_MS = 60_000
const MAX_PERSIST_PER_WINDOW = 60
let persistWindowAt = 0
let persistCount = 0
const allowPersist = () => {
  const now = Date.now()
  if (now - persistWindowAt > PERSIST_WINDOW_MS) {
    persistWindowAt = now
    persistCount = 0
  }
  if (persistCount >= MAX_PERSIST_PER_WINDOW) return false
  persistCount += 1
  return true
}

export const authLocked = async (c: any): Promise<boolean> => {
  const ip = clientIp(c)
  const key = `media:${ip}`
  const b = buckets.get(key)
  if (b?.lockedUntil && b.lockedUntil > Date.now()) return true
  if (!isPersistableIp(ip)) return false
  // 跨 isolate 的锁定状态（尽力而为，读失败不影响主流程）
  try {
    const raw = await readPersistedSecret(c?.env, PERSIST_PREFIX + ip)
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
  const key = usernameKey(username)
  if (!key) return false
  const b = buckets.get(key)
  return !!b?.lockedUntil && b.lockedUntil > Date.now()
}

export const authFailed = async (c: any, username = "") => {
  const ip = clientIp(c)
  const key = `media:${ip}`
  const b = bucketOf(key)
  b.count += 1
  if (b.count >= MAX_RETRIES) {
    b.lockedUntil = Date.now() + LOCK_MS
    if (isPersistableIp(ip) && allowPersist()) {
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
  }
  const userKey = usernameKey(username)
  if (userKey) {
    const ub = bucketOf(userKey)
    ub.count += 1
    if (ub.count >= MAX_RETRIES) ub.lockedUntil = Date.now() + LOCK_MS
  }
}

export const authSucceeded = (c: any, username = "") => {
  buckets.delete(`media:${clientIp(c)}`)
  const userKey = usernameKey(username)
  if (userKey) buckets.delete(userKey)
}

/** 测试/管理用：清空内存计数 */
export const resetAuthLimit = () => buckets.clear()
