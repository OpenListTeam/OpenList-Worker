import { Context } from "hono"
import { verify } from "hono/jwt"
import { checkAdminAuth, isStaticApiToken } from "../pkg/utils"
import { getDb } from "../internal/model/db"

// 不再硬编码 JWT 密钥。优先使用环境变量 JWT_SECRET（推荐在生产配置），
// 否则从 KV 持久化一个随机密钥（首次生成后复用，重启不失效），
// 开发环境（无 KV）回退到进程内随机密钥。
let cachedJwtSecret: string | null = null
const JWT_SECRET_KV_KEY = "openlistnext_jwt_secret"

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

async function writeKvSecret(env: any, secret: string): Promise<void> {
  try {
    const { getKvBinding } = await import("../internal/model/db")
    const kvInfo = await getKvBinding(env)
    if (kvInfo.mode === "none" || !kvInfo.binding) return
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
  } catch (e) {
    console.warn("[JWT] Failed to persist secret to KV:", e)
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
    await writeKvSecret(env, cachedJwtSecret)
  }
  return cachedJwtSecret
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
        message: "未授权，需要管理员权限",
        data: null,
      },
      401,
    )
  }
  await next()
}

/**
 * 从请求上下文解析当前用户：
 * - 静态 API Token（与 adminAuthMiddleware 同源）→ 视为管理员
 * - JWT（Authorization header 或 query parameter token/access_token）→ 查 DB 用户
 * - 无凭证时，仅当数据库中存在且未禁用的 guest 用户时才返回该游客信息；
 * - 若 guest 用户不存在（被删除）或被禁用，则返回 null（未授权状态）。
 */
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
