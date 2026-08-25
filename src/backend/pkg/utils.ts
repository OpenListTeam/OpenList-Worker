/**
 * Shared constants and utility functions for OpenListNext backend.
 * No dependencies on server/middlewares to avoid circular imports.
 */

export * from "./xml"
export * from "./errs"
export * from "./generic"
export * from "./http"
export * from "./crypto"
export * from "./stream"

import { Context } from "hono"
import { verify } from "hono/jwt"
import { getDb } from "../internal/model/db"

// Format byte sizes to human-readable strings
export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return "0 Bytes"
  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i]
}

const DEFAULT_JWT_SECRET = "super-secret-openlistnext-key"

let _generatedSecret: string | null = null

export function getJwtSecret(env?: any): string {
  // 1. Explicit env override takes highest priority
  if (env?.JWT_SECRET) return env.JWT_SECRET
  // 2. Return cached auto-generated secret (persists for the lifetime of
  //    this isolate; re-generated on cold start if DB doesn't have one yet)
  if (_generatedSecret) return _generatedSecret
  // 3. Fall back to legacy default — callers that need auto-generation
  //    should call ensureJwtSecret() once at startup instead.
  return DEFAULT_JWT_SECRET
}

/**
 * Ensure a per-deployment JWT secret exists. Called once per request in
 * index.ts. On first call it reads from DB settings; if missing it
 * generates a cryptographically random 256-bit secret and persists it.
 * Returns the secret to use for signing/verification.
 */
export async function ensureJwtSecret(env?: any): Promise<string> {
  if (env?.JWT_SECRET) return env.JWT_SECRET
  if (_generatedSecret) return _generatedSecret

  try {
    const { getDb, saveDb } = await import("../internal/model/db")
    const db = await getDb(env)
    const existing = (db.settings || []).find(
      (s: any) => s.key === "jwt_secret",
    )
    if (existing?.value) {
      _generatedSecret = existing.value as string
      return _generatedSecret
    }
    // Generate 256-bit random secret
    const randBytes = crypto.getRandomValues(new Uint8Array(32))
    const secret = Array.from(randBytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
    // Persist to DB
    if (!db.settings) db.settings = []
    db.settings.push({ key: "jwt_secret", value: secret })
    await saveDb(db, env)
    _generatedSecret = secret
    return secret
  } catch {
    // KV unavailable (dev mode) — use in-memory random secret
    if (!_generatedSecret) {
      const randBytes = crypto.getRandomValues(new Uint8Array(32))
      _generatedSecret = Array.from(randBytes)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("")
    }
    return _generatedSecret
  }
}

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
  // Constant-time comparison to prevent timing attacks
  const tokenBytes = new TextEncoder().encode(token)
  const expectedBytes = new TextEncoder().encode(String(tokenSetting.value))
  if (tokenBytes.length !== expectedBytes.length) return false
  try {
    if (typeof (crypto.subtle as any)?.timingSafeEqual === "function") {
      return (crypto.subtle as any).timingSafeEqual(
        tokenBytes.buffer,
        expectedBytes.buffer,
      )
    }
  } catch {}
  // Constant-time fallback comparison
  let match = 0
  for (let i = 0; i < tokenBytes.length; i++) {
    match |= tokenBytes[i] ^ expectedBytes[i]
  }
  return match === 0
}
