import { Context } from "hono"
import { verify } from "hono/jwt"
import { checkAdminAuth, isStaticApiToken } from "../pkg/utils"
import { getDb } from "../internal/model/db"

// 不再硬编码 JWT 密钥。优先使用环境变量 JWT_SECRET（推荐在生产配置），
// 否则从 KV 持久化一个随机密钥（首次生成后复用，重启不失效），
// 开发环境（无 KV）回退到进程内随机密钥。
let cachedJwtSecret: string | null = null
const JWT_SECRET_KV_KEY = "openlist_jwt_secret"

function generateRandomSecret(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("")
}

async function readKvSecret(env: any): Promise<string | null> {
  try {
    const { getKvBinding } = await import("../internal/model/db")
    const kvInfo = await getKvBinding(env)
    if (kvInfo.mode === "none" || !kvInfo.binding) return null
    const { binding, mode } = kvInfo
    let val: any = null
    if (mode === "blob") {
      val = await binding.get(JWT_SECRET_KV_KEY)
    } else {
      try {
        val = await binding.get(JWT_SECRET_KV_KEY, "text")
      } catch {
        val = await binding.get(JWT_SECRET_KV_KEY)
      }
    }
    if (val && typeof val.text === "function") {
      val = await val.text()
    }
    return val ? String(val) : null
  } catch (e) {
    console.warn("[JWT] Failed to read secret from KV:", e)
    return null
  }
}

async function writeKvSecret(env: any, secret: string): Promise<boolean> {
  try {
    const { getKvBinding } = await import("../internal/model/db")
    const kvInfo = await getKvBinding(env)
    if (kvInfo.mode === "none" || !kvInfo.binding) return false
    const { binding, mode } = kvInfo
    if (mode === "blob") {
      if (typeof binding.set === "function")
        await binding.set(JWT_SECRET_KV_KEY, secret)
      else if (typeof binding.put === "function")
        await binding.put(JWT_SECRET_KV_KEY, secret)
    } else {
      if (typeof binding.put === "function")
        await binding.put(JWT_SECRET_KV_KEY, secret)
      else if (typeof binding.set === "function")
        await binding.set(JWT_SECRET_KV_KEY, secret)
    }
    return true
  } catch (e) {
    console.warn("[JWT] Failed to persist secret to KV:", e)
    return false
  }
}

/**
 * 获取 JWT 签名密钥。
 * 优先级：env.JWT_SECRET > KV 持久化随机密钥 > 进程内随机密钥。
 */
export async function getJwtSecret(c?: Context | any): Promise<string> {
  const env =
    c?.env || (typeof process !== "undefined" ? (process as any).env : {}) || {}

  // 1. 环境变量显式配置（最优先）
  const envSecret = env.JWT_SECRET
  if (envSecret && envSecret.length >= 16) {
    return envSecret
  }

  // 2. KV 持久化密钥（跨实例/重启稳定）
  const kvSecret = await readKvSecret(env)
  if (kvSecret && kvSecret.length >= 16) {
    return kvSecret
  }

  // 3. 生成随机密钥并持久化到 KV（若无 KV 则仅内存）
  if (!cachedJwtSecret) {
    cachedJwtSecret = generateRandomSecret()
    const persisted = await writeKvSecret(env, cachedJwtSecret)
    if (!persisted) {
      console.warn(
        "[JWT] JWT_SECRET 未配置且无法持久化到 KV：密钥仅存于当前进程，多实例/冷启动会导致已签发 token 失效。生产环境请配置 >=16 字符的 JWT_SECRET。",
      )
    }
  }
  return cachedJwtSecret
}

// ---- JWT 注销黑名单（尽力而为：进程内 Set + KV 持久化）----
// 说明：Serverless 多实例下各实例独立缓存，KV 持久化仅在冷启动时加载一次，
// 因此跨实例的「即时」失效不能保证精确，但能在单实例内立即生效，并随新实例
// 冷启动逐步收敛。exp 过期后条目自动清理，不会无限增长。
const REVOKED_KV_KEY = "openlist_revoked_tokens"
const revokedJtis = new Set<string>()
let revokedLoaded = false

async function ensureRevokedLoaded(env: any): Promise<void> {
  if (revokedLoaded) return
  revokedLoaded = true
  try {
    const { getKvBinding } = await import("../internal/model/db")
    const kvInfo = await getKvBinding(env)
    if (kvInfo.mode === "none" || !kvInfo.binding) return
    const { binding, mode } = kvInfo
    let val: any = null
    if (mode === "blob") {
      val = await binding.get(REVOKED_KV_KEY)
    } else {
      try {
        val = await binding.get(REVOKED_KV_KEY, "text")
      } catch {
        val = await binding.get(REVOKED_KV_KEY)
      }
    }
    if (val && typeof val.text === "function") val = await val.text()
    if (!val) return
    const arr = JSON.parse(String(val))
    const now = Math.floor(Date.now() / 1000)
    for (const item of arr) {
      if (item && item.jti && item.exp > now) revokedJtis.add(item.jti)
    }
  } catch {
    // 黑名单加载失败时降级为不拦截（不影响登录）
  }
}

export async function revokeToken(
  jti: string,
  exp: number,
  env: any,
): Promise<void> {
  if (!jti) return
  revokedJtis.add(jti)
  try {
    const { getKvBinding } = await import("../internal/model/db")
    const kvInfo = await getKvBinding(env)
    if (kvInfo.mode === "none" || !kvInfo.binding) return
    const { binding, mode } = kvInfo
    let arr: Array<{ jti: string; exp: number }> = []
    if (mode === "blob") {
      const val = await binding.get(REVOKED_KV_KEY)
      if (val) arr = typeof val === "string" ? JSON.parse(val) : val
    } else {
      try {
        const val = await binding.get(REVOKED_KV_KEY, "text")
        if (val) arr = JSON.parse(String(val))
      } catch {
        const val = await binding.get(REVOKED_KV_KEY)
        if (val) arr = typeof val === "string" ? JSON.parse(val) : val
      }
    }
    const now = Math.floor(Date.now() / 1000)
    arr = arr.filter((i) => i && i.exp > now)
    arr.push({ jti, exp })
    const payload = JSON.stringify(arr)
    if (mode === "blob") {
      if (typeof binding.set === "function")
        await binding.set(REVOKED_KV_KEY, payload)
      else if (typeof binding.put === "function")
        await binding.put(REVOKED_KV_KEY, payload)
    } else {
      if (typeof binding.put === "function")
        await binding.put(REVOKED_KV_KEY, payload)
      else if (typeof binding.set === "function")
        await binding.set(REVOKED_KV_KEY, payload)
    }
  } catch (e) {
    console.warn("[JWT] Failed to persist revoked token to KV:", e)
  }
}

export async function isTokenRevoked(jti: string, env: any): Promise<boolean> {
  if (!jti) return false
  await ensureRevokedLoaded(env)
  return revokedJtis.has(jti)
}

export async function adminAuthMiddleware(
  c: Context,
  next: () => Promise<void>,
) {
  const isAdmin = await checkAdminAuth(c)
  if (!isAdmin) {
    return c.json(
      {
        code: 401,
        message: "Unauthorized admin privilege required",
        data: null,
      },
      401,
    )
  }
  await next()
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

/**
 * 定时调度鉴权通道：EdgeOne Schedules 只能携带 path/method/payload，
 * 无法附加 Authorization 头。当环境变量 CRON_SECRET 已设置时，
 * 允许请求通过 query（?cron_secret=）、JSON body { cron_secret }
 * 或 X-Cron-Secret 头携带匹配值触发受保护的任务接口。
 */
export async function matchCronSecret(c: Context): Promise<boolean> {
  const env = (c as any)?.env || {}
  const secret =
    env.CRON_SECRET ||
    (typeof process !== "undefined" ? process.env?.CRON_SECRET : "")
  if (!secret || typeof secret !== "string") return false

  const header = c.req.header("x-cron-secret")
  if (header && timingSafeEqual(header, secret)) return true

  const query = c.req.query("cron_secret")
  if (query && timingSafeEqual(query, secret)) return true

  try {
    const body = await c.req.json()
    const provided = body?.cron_secret
    if (
      typeof provided === "string" &&
      provided.length > 0 &&
      timingSafeEqual(provided, secret)
    ) {
      return true
    }
  } catch {}

  return false
}

/**
 * 从请求上下文解析当前用户：
 * - 静态 API Token（与 adminAuthMiddleware 同源）→ 视为管理员
 * - JWT（Authorization header 或 query parameter token/access_token）→ 查 DB 用户
 * - 无凭证时，仅当数据库中存在且未禁用的 guest 用户时才返回该游客信息；
 * - 若 guest 用户不存在（被删除）或被禁用，则返回 null（未授权状态）。
 */
// ============ CSRF 防护 (添加日期: 2026-09-05) ============
/**
 * 生成 CSRF Token（短期有效，1小时过期）
 */
export async function generateCSRFToken(c: Context): Promise<string> {
  const { sign } = await import("hono/jwt")
  const secret = await getJwtSecret(c)
  const token = await sign(
    {
      type: "csrf",
      jti: crypto.randomUUID ? crypto.randomUUID() : generateRandomSecret().slice(0, 16),
      exp: Math.floor(Date.now() / 1000) + 3600, // 1 小时过期
    },
    secret,
  )
  return token
}

/**
 * CSRF 保护中间件：对 POST/PUT/DELETE/PATCH 请求验证 CSRF token
 * GET/HEAD/OPTIONS 请求豁免检查
 */
export async function csrfProtection(
  c: Context,
  next: () => Promise<void>,
) {
  const method = c.req.method.toUpperCase()

  // GET/HEAD/OPTIONS 请求无需 CSRF 验证
  if (["GET", "HEAD", "OPTIONS"].includes(method)) {
    return next()
  }

  // 获取 CSRF token（支持 Header、Query、Body 三种方式）
  let token =
    c.req.header("x-csrf-token") ||
    c.req.header("X-CSRF-Token") ||
    c.req.query("csrf_token")

  // 尝试从 JSON body 中获取
  if (!token) {
    try {
      const body = await c.req.json()
      token = body?.csrf_token
      // 重要：重新设置 body 供后续处理（Hono 的 req.json() 会消耗 body）
      ;(c.req as any).bodyCache = body
    } catch {
      // 非 JSON body，继续
    }
  }

  if (!token) {
    return c.json(
      {
        code: 403,
        message: "CSRF token missing. Please include X-CSRF-Token header or csrf_token parameter.",
        data: null,
      },
      403,
    )
  }

  try {
    const { verify } = await import("hono/jwt")
    const secret = await getJwtSecret(c)
    const payload: any = await verify(token, secret, "HS256")

    if (payload.type !== "csrf") {
      throw new Error("Invalid token type")
    }

    // Token 有效，继续处理
    await next()
  } catch (err: any) {
    return c.json(
      {
        code: 403,
        message: "Invalid or expired CSRF token",
        data: null,
      },
      403,
    )
  }
}

// ============ 审计日志中间件 (添加日期: 2026-09-05) ============
/**
 * 审计日志中间件：记录所有状态修改操作
 * 仅记录 POST/PUT/DELETE/PATCH 请求
 */
export async function auditMiddleware(
  c: Context,
  next: () => Promise<void>,
) {
  const startTime = Date.now()
  const method = c.req.method.toUpperCase()
  const path = c.req.path

  // 仅记录状态修改操作
  const shouldAudit = ["POST", "PUT", "DELETE", "PATCH"].includes(method)

  await next()

  if (shouldAudit) {
    try {
      const { logAudit } = await import("../internal/model/audit")
      const user = await getUserFromContext(c).catch(() => null)
      const duration = Date.now() - startTime
      const statusCode = c.res.status || 200
      const status = statusCode >= 200 && statusCode < 400 ? "success" : "failure"

      // 获取客户端 IP
      const ip =
        c.req.header("cf-connecting-ip") ||
        c.req.header("x-real-ip") ||
        c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ||
        "unknown"

      await logAudit(
        {
          user_id: user?.id,
          username: user?.username || "anonymous",
          ip,
          action: `${method} ${path}`,
          resource: path,
          method,
          status,
          status_code: statusCode,
          details: JSON.stringify({ duration_ms: duration }),
          user_agent: c.req.header("user-agent"),
          duration_ms: duration,
        },
        c.env,
      )
    } catch (err) {
      // 审计日志失败不影响业务流程
      console.warn("[Audit] Failed to log:", err)
    }
  }
}

export async function getUserFromContext(c: Context): Promise<{
  id?: number
  role: number
  permission: number
  disabled?: boolean
  username?: string
  base_path?: string
  sso_id?: string
  allow_ldap?: boolean
  otp_secret?: string
} | null> {
  // 仅静态 API token（settings.token）命中才视为匿名管理员；
  // JWT 管理员走下方正常解析，避免用户名被硬编码成 "api-token"。
  if (await isStaticApiToken(c)) {
    return {
      role: 2,
      permission: 0,
      disabled: false,
      username: "api-token",
      base_path: "/",
    }
  }

  let authHeader = c.req.header("Authorization")
  if (!authHeader) {
    const queryToken = c.req.query("token") || c.req.query("access_token")
    if (queryToken) {
      authHeader = `Bearer ${queryToken}`
    }
  }

  if (!authHeader) {
    try {
      const db = await getDb(c.env)
      const guest = (db.users || []).find((u: any) => u.username === "guest")
      if (guest && !guest.disabled) {
        return {
          id: guest.id,
          role: guest.role ?? 1,
          permission: guest.permission ?? 0,
          disabled: !!guest.disabled,
          username: guest.username,
          base_path: guest.base_path || "/",
          sso_id: guest.sso_id || "",
          allow_ldap: !!guest.allow_ldap,
          otp_secret: guest.otp_secret,
        }
      }
    } catch {}
    return null
  }

  const token = authHeader.startsWith("Bearer ")
    ? authHeader.substring(7)
    : authHeader
  try {
    const secret = await getJwtSecret(c)
    const payload: any = await verify(token, secret, "HS256")
    if (await isTokenRevoked(payload?.jti, c.env)) return null
    const db = await getDb(c.env)
    const user = (db.users || []).find(
      (u: any) => u.id === payload.id || u.username === payload.username,
    )
    if (!user || user.disabled) return null
    return {
      id: user.id,
      role: user.role,
      permission: user.permission ?? 0,
      disabled: !!user.disabled,
      username: user.username,
      base_path: user.base_path || "/",
      sso_id: user.sso_id || "",
      allow_ldap: !!user.allow_ldap,
      otp_secret: user.otp_secret,
    }
  } catch {
    return null
  }
}
