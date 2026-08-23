import { getDb } from "../internal/model/db"
import { getJwtSecret } from "../server/middlewares"
import { hmacSha256 } from "./crypto"

/**
 * 下载链接签名（防盗链 / 链接过期）。
 *
 * 启用条件（管理后台设置）：
 * - sign_all === "true"：所有下载链接签发 HMAC 签名；
 * - link_expiration > 0：链接有效期（秒），超期失效。
 * 两者都关闭时本模块完全静默（enabled=false），行为与未启用完全一致。
 *
 * 签名格式：`${expires}.${hmacSha256(virtualPath:expires, secret)}`
 * secret 复用 getJwtSecret（env.JWT_SECRET → KV 持久化随机 → 进程内随机），
 * 与 JWT 同源但用途独立，无需额外配置。
 */

const DEFAULT_SIGN_EXPIRES_SECONDS = 24 * 3600 // sign_all 开启但未配过期时默认 24h

export interface SignPolicy {
  enabled: boolean
  expiresIn: number
}

export async function getSignPolicy(c: any): Promise<SignPolicy> {
  try {
    const db = await getDb(c?.env)
    const settings: Record<string, string> = {}
    for (const s of db.settings || []) settings[s.key] = s.value
    const signAll = settings.sign_all === "true"
    const linkExp = parseInt(settings.link_expiration, 10) || 0
    if (!signAll && linkExp <= 0) {
      return { enabled: false, expiresIn: 0 }
    }
    return {
      enabled: true,
      expiresIn: linkExp > 0 ? linkExp : DEFAULT_SIGN_EXPIRES_SECONDS,
    }
  } catch {
    return { enabled: false, expiresIn: 0 }
  }
}

export async function signDownloadPath(
  c: any,
  virtualPath: string,
  expiresIn: number,
): Promise<string> {
  const secret = await getJwtSecret(c)
  const expires = Math.floor(Date.now() / 1000) + expiresIn
  const hmac = await hmacSha256(`${virtualPath}:${expires}`, secret)
  return `${expires}.${hmac}`
}

export async function verifyDownloadSign(
  c: any,
  virtualPath: string,
  sign: string,
): Promise<boolean> {
  const dot = sign.lastIndexOf(".")
  if (dot <= 0) return false
  const expires = parseInt(sign.slice(0, dot), 10)
  const hmac = sign.slice(dot + 1)
  if (!Number.isFinite(expires) || expires <= Math.floor(Date.now() / 1000)) {
    return false
  }
  const secret = await getJwtSecret(c)
  const expect = await hmacSha256(`${virtualPath}:${expires}`, secret)
  return expect === hmac
}
