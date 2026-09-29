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
  if (bytes === 0) return "0 Bytes"
  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
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

  // JWT：以**数据库当前状态**为权威来源判定管理员。
  //
  // 安全不变量（必须长期保持）：管理员授权必须同时满足
  //   1. 令牌签名有效且未过期（HS256，alg 已 pin）；
  //   2. 令牌未被注销（jti 不在吊销名单）；
  //   3. 用户在库中存在且未被禁用；
  //   4. 用户的**当前** role 仍是管理员。
  //
  // 历史缺陷：只读取 JWT 里的 `payload.role`，且完全不检查 jti。后果是
  // 「退出登录」和「把管理员降权为普通用户」都不会立即生效 —— 旧令牌在 7 天
  // 有效期内继续拥有完整后台权限（实测：注销后 /api/admin/* 仍返回 200）。
  // 注意不能反过来只信 JWT：那样降权/禁用同样无效。
  try {
    const { verify } = await import("hono/jwt")
    const { getJwtSecret, isTokenRevoked } = await import(
      "../server/middlewares"
    )
    const secret = await getJwtSecret(c)
    const payload: any = await verify(token, secret, "HS256")
    if (!payload) return false

    // 注销黑名单：与 getUserFromContext 使用同一套判定
    if (await isTokenRevoked(payload.jti, c.env)) return false

    // DB 为权威：存在 + 未禁用 + 当前角色仍为管理员
    const db = await getDb(c.env)
    const user = (db.users || []).find(
      (u: any) => u.id === payload.id || u.username === payload.username,
    )
    if (!user || user.disabled) return false
    return user.role === 2
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
