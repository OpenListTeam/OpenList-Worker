import { Context } from "hono"
import { getDb } from "../internal/model/db"

/**
 * Common utilities for OpenList backend services.
 */

export * from "./xml"
export * from "./path"
export * from "./errs"
export * from "./generic"
export * from "./http"
export * from "./crypto"
export * from "./stream"

// Format byte sizes to human-readable strings
export function formatBytes(bytes: number, decimals = 2): string {
  // 非法输入（NaN/Infinity/负数）按 0 处理，避免返回 "NaN undefined"
  if (!Number.isFinite(bytes) || bytes < 0) return "0 Bytes"
  if (bytes === 0) return "0 Bytes"
  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB"]
  let i = Math.floor(Math.log(bytes) / Math.log(k))
  // bytes >= 1024PB 时 i 会越界到 sizes.length 之外，需钳制到最后一档
  if (i < 0) i = 0
  if (i >= sizes.length) i = sizes.length - 1
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i]
}

// Check administrator authorization from context
export async function checkAdminAuth(c: Context): Promise<boolean> {
  // 静态 API token（settings.token）
  if (await isStaticApiToken(c)) return true

  const authHeader = c.req.header("Authorization")
  if (!authHeader) return false
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.substring(7)
    : authHeader

  // JWT：管理员登录用户也视为管理员（登录用户变管理员判定）
  try {
    const { verify } = await import("hono/jwt")
    const { getJwtSecret } = await import("../server/middlewares")
    const secret = await getJwtSecret(c)
    const payload: any = await verify(token, secret, "HS256")
    if (payload && payload.role === 2) {
      // 确认该用户存在于 DB 且未被禁用
      const db = await getDb(c.env)
      const user = (db.users || []).find(
        (u: any) => u.id === payload.id || u.username === payload.username,
      )
      return !!(user && !user.disabled)
    }
  } catch {}
  return false
}

/**
 * 仅判断请求是否携带匹配的静态 API token（settings.token）。
 * 与 checkAdminAuth 不同：不含 JWT 判定，供身份解析（getUserFromContext）
 * 区分「静态 token 调用方」与「登录用户」，避免 JWT 管理员被误判为 api-token。
 */
export async function isStaticApiToken(c: Context): Promise<boolean> {
  const authHeader = c.req.header("Authorization")
  if (!authHeader) return false
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.substring(7)
    : authHeader
  const db = await getDb(c.env)
  const tokenSetting = db.settings.find((s: any) => s.key === "token")
  if (!tokenSetting || !tokenSetting.value) return false
  const tokenBytes = new TextEncoder().encode(token)
  const expectedBytes = new TextEncoder().encode(String(tokenSetting.value))
  if (tokenBytes.length !== expectedBytes.length) return false
  let match = 0
  for (let i = 0; i < tokenBytes.length; i++) {
    match |= tokenBytes[i] ^ expectedBytes[i]
  }
  return match === 0
}
