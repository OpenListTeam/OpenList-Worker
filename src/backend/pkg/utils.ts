import { Context } from "hono"
import { getDb } from "../internal/model/db"

/**
 * Common utilities for OpenListNext backend services.
 */

export * from "./xml"
export * from "./errs"
export * from "./generic"
export * from "./http"
export * from "./crypto"
export * from "./stream"

// Format byte sizes to human-readable strings
export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return "0 Bytes"
  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i]
}

// Check administrator authorization from context
export async function checkAdminAuth(c: Context): Promise<boolean> {
  const authHeader = c.req.header("Authorization")
  if (!authHeader) return false
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.substring(7)
    : authHeader

  if (!token) return false

  // 1. 显式环境变量配置的高权限管理员 API 密钥（如配置了 ADMIN_API_TOKEN）
  const env =
    (c as any).env || (typeof process !== "undefined" ? process.env : {}) || {}
  const envAdminToken = env.ADMIN_API_TOKEN
  if (envAdminToken && envAdminToken.length >= 16 && token === envAdminToken) {
    return true
  }

  // 2. JWT：管理员用户凭证校验（严格检查 role === 2 且用户未被禁用）
  try {
    const { verify } = await import("hono/jwt")
    const { getJwtSecret } = await import("../server/middlewares")
    const secret = await getJwtSecret(c)
    const payload: any = await verify(token, secret, "HS256")
    if (payload && payload.role === 2) {
      const db = await getDb(c.env)
      const user = (db.users || []).find(
        (u: any) => u.id === payload.id || u.username === payload.username,
      )
      return !!(user && !user.disabled)
    }
  } catch {}
  return false
}
