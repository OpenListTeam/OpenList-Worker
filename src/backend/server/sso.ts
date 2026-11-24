import { Hono } from "hono"
import { sign } from "hono/jwt"
import { getDb, saveDb } from "../internal/model/db"
import { getJwtSecret } from "./middlewares"
import { generateRandomPassword } from "./auth"
import { setUserPassword, passwordStampOf } from "../pkg/password"

/**
 * SSO 登录（OAuth2 授权码流 + OIDC）。
 *
 * 支持平台：Github / Microsoft / Google / Dingtalk / Casdoor / OIDC。
 * 纯 fetch + Web Crypto 实现，无外部依赖（OIDC discovery 手写，不验证
 * id_token 签名——code 已通过 client_secret 交换，且走 userinfo 端点，
 * 身份可信）。
 *
 * 两种模式：
 *  - 默认（弹窗）：回调后 postMessage 回传 { token | sso_id } 给 opener 并关闭。
 *  - 兼容模式：redirect 到 /@login?token=... 或 /@manage?sso_id=...。
 */

export const ssoRouter = new Hono()

const STATE_EXPIRE_MS = 5 * 60 * 1000
const MAX_USED_NONCE_CACHE = 1000
const usedStateNonces = new Map<string, number>()

function randomHex(byteLen = 16): string {
  const bytes = new Uint8Array(byteLen)
  crypto.getRandomValues(bytes)
  return bytesToHex(bytes)
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("")
}

function hexToBytes(hex: string): Uint8Array | null {
  if (!hex || hex.length % 2 !== 0 || !/^[0-9a-f]+$/i.test(hex)) {
    return null
  }
  const out = new Uint8Array(hex.length / 2)
  for (let i = 0; i < out.length; i++) {
    out[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16)
  }
  return out
}

function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) {
    diff |= a[i] ^ b[i]
  }
  return diff === 0
}

async function hmacSha256(secret: string, message: string): Promise<Uint8Array> {
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  )
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message))
  return new Uint8Array(sig)
}

function pruneUsedStateNonces(now: number): void {
  if (usedStateNonces.size <= MAX_USED_NONCE_CACHE) return
  for (const [nonce, exp] of usedStateNonces) {
    if (exp <= now) usedStateNonces.delete(nonce)
  }
}

function getSetting(db: any, key: string, def = ""): string {
  const item = (db.settings || []).find((s: any) => s.key === key)
  if (!item || item.value === undefined || item.value === null) return def
  return String(item.value)
}

function getBool(db: any, key: string): boolean {
  const v = getSetting(db, key, "false")
  return v === "true" || v === "1"
}

function clientIpOf(c: any): string {
  return (
    c.req.header("CF-Connecting-IP") ||
    c.req.header("x-real-ip") ||
    c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  )
}

function apiOrigin(c: any): string {
  try {
    return new URL(c.req.url).origin
  } catch {
    return "http://localhost"
  }
}

/**
 * 生成无状态签名 OIDC state（`<expHex>.<nonceHex>.<hmacHex>`）。
 *
 * Workers / Serverless 多实例与冷启动不共享进程内存，使用基于 JWT 密钥的
 * HMAC-SHA256 绑定 clientId、客户端 IP 与过期时间，避免跨实例校验失败。
 */
export async function generateOidcState(
  secret: string,
  clientId: string,
  ip: string,
  now = Date.now(),
): Promise<string> {
  const expHex = (now + STATE_EXPIRE_MS).toString(16)
  const nonceHex = randomHex(16)
  const mac = await hmacSha256(
    secret,
    `sso-oidc-state:v1:${expHex}:${nonceHex}:${clientId}:${ip}`,
  )
  return `${expHex}.${nonceHex}.${bytesToHex(mac)}`
}

/** 校验无状态签名 OIDC state，并在单实例内做一次性重放拦截 */
export async function verifyOidcState(
  secret: string,
  clientId: string,
  ip: string,
  state: string,
  now = Date.now(),
): Promise<boolean> {
  const parts = state.split(".")
  if (parts.length !== 3 || parts.some((p) => !p)) return false
  const [expHex, nonceHex, macHex] = parts
  if (
    !/^[0-9a-f]+$/i.test(expHex) ||
    !/^[0-9a-f]{32}$/i.test(nonceHex) ||
    !/^[0-9a-f]{64}$/i.test(macHex)
  ) {
    return false
  }
  const exp = Number.parseInt(expHex, 16)
  if (!Number.isFinite(exp) || exp <= now || exp > now + STATE_EXPIRE_MS + 60_000) {
    return false
  }
  const normalizedNonce = nonceHex.toLowerCase()
  const usedExp = usedStateNonces.get(normalizedNonce)
  if (usedExp !== undefined && usedExp > now) {
    return false
  }
  const providedMac = hexToBytes(macHex)
  if (!providedMac) return false
  const expectedMac = await hmacSha256(
    secret,
    `sso-oidc-state:v1:${expHex}:${nonceHex}:${clientId}:${ip}`,
  )
  if (!timingSafeEqual(providedMac, expectedMac)) {
    return false
  }
  // hmacSha256 为异步调用，同一隔离区内并发携带同一 state 的请求可能同时通过上方预检；
  // 在无 await 的同步临界区内再次确认并占坑，消除竞态重放。
  const usedExpAfter = usedStateNonces.get(normalizedNonce)
  if (usedExpAfter !== undefined && usedExpAfter > now) {
    return false
  }
  usedStateNonces.set(normalizedNonce, exp)
  pruneUsedStateNonces(now)
  return true
}

/** 平台预设端点 */
interface PlatformDef {
  authUrl: string
  tokenUrl: string
  userUrl: string
  scope: string
  authField: string
  idField: string
  usernameField: string
  extraAuth?: Record<string, string>
  extraForm?: Record<string, string>
  tokenStyle?: "form" | "json" // Dingtalk 用 JSON
}

function platformDef(platform: string, ssoLoginUrl: string, ssoTokenUrl: string, ssoUserinfoUrl: string, ssoScopes: string): PlatformDef | null {
  switch (platform) {
    case "Github":
      return {
        authUrl: "https://github.com/login/oauth/authorize",
        tokenUrl: "https://github.com/login/oauth/access_token",
        userUrl: "https://api.github.com/user",
        scope: ssoScopes || "read:user",
        authField: "code",
        idField: "id",
        usernameField: "login",
      }
    case "Microsoft":
      return {
        authUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
        tokenUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/token",
        userUrl: "https://graph.microsoft.com/v1.0/me",
        scope: ssoScopes || "user.read",
        authField: "code",
        idField: "id",
        usernameField: "displayName",
        extraAuth: { response_mode: "query" },
        extraForm: { grant_type: "authorization_code" },
      }
    case "Google":
      return {
        authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
        tokenUrl: "https://oauth2.googleapis.com/token",
        userUrl: "https://www.googleapis.com/oauth2/v1/userinfo",
        scope: ssoScopes || "https://www.googleapis.com/auth/userinfo.profile",
        authField: "code",
        idField: "id",
        usernameField: "name",
        extraForm: { grant_type: "authorization_code" },
      }
    case "Dingtalk":
      return {
        authUrl: "https://login.dingtalk.com/oauth2/auth",
        tokenUrl: "https://api.dingtalk.com/v1.0/oauth2/userAccessToken",
        userUrl: "https://api.dingtalk.com/v1.0/contact/users/me",
        scope: ssoScopes || "openid",
        authField: "authCode",
        idField: "unionId",
        usernameField: "nick",
        extraAuth: { prompt: "consent" },
        tokenStyle: "json",
      }
    case "Casdoor":
      return {
        authUrl: (ssoLoginUrl || "").replace(/\/login\/oauth\/authorize$/, "") + "/login/oauth/authorize",
        tokenUrl: (ssoTokenUrl || "").replace(/\/api\/login\/oauth\/access_token$/, "") + "/api/login/oauth/access_token",
        userUrl: (ssoUserinfoUrl || "").replace(/\/api\/userinfo$/, "") + "/api/userinfo",
        scope: ssoScopes || "profile",
        authField: "code",
        idField: "sub",
        usernameField: "preferred_username",
        extraForm: { grant_type: "authorization_code" },
      }
    case "OIDC":
      return null // 走 discovery，单独处理
    default:
      return null
  }
}

/** OIDC discovery：获取授权/令牌/userinfo 端点 */
async function oidcDiscovery(discoveryUrl: string): Promise<{
  authUrl: string
  tokenUrl: string
  userUrl: string
}> {
  const url = discoveryUrl.endsWith("/.well-known/openid-configuration")
    ? discoveryUrl
    : discoveryUrl.replace(/\/+$/, "") + "/.well-known/openid-configuration"
  const resp = await fetch(url, { headers: { Accept: "application/json" } })
  if (!resp.ok) throw new Error(`OIDC discovery failed: HTTP ${resp.status}`)
  const doc: any = await resp.json()
  if (!doc.authorization_endpoint || !doc.token_endpoint) {
    throw new Error("OIDC discovery returned incomplete metadata")
  }
  return {
    authUrl: doc.authorization_endpoint,
    tokenUrl: doc.token_endpoint,
    userUrl: doc.userinfo_endpoint || "",
  }
}

/** 生成 JWT token（与 /auth/login 一致） */
async function generateToken(user: any, c: any): Promise<string> {
  const payload = {
    id: user.id,
    username: user.username,
    role: user.role,
    // 密码指纹（对齐 Go PwdTS）：改密后旧令牌立即失效
    pwd_ts: passwordStampOf(user),
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7,
    jti:
      typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : generateRandomPassword(),
  }
  const secret = await getJwtSecret(c)
  return await sign(payload, secret)
}

/** SSO 自动注册 */
async function autoRegister(
  db: any,
  username: string,
  ssoId: string,
  env: any,
): Promise<any> {
  if (!Array.isArray(db.users)) db.users = []
  let uname = username || ssoId
  if (db.users.some((u: any) => u.username === uname)) {
    uname = `${uname}_${ssoId}`
  }
  const id = db.users.length
    ? Math.max(...db.users.map((u: any) => Number(u.id) || 0)) + 1
    : 1
  const defaultDir = getSetting(db, "sso_default_dir", "/") || "/"
  const parsedPerm = Number.parseInt(
    getSetting(db, "sso_default_permission", "0"),
    10,
  )
  const defaultPermission =
    Number.isFinite(parsedPerm) && parsedPerm >= 0 ? parsedPerm : 0
  const user: any = {
    id,
    username: uname,
    password: "",
    role: 0,
    permission: defaultPermission,
    base_path: defaultDir,
    disabled: false,
    sso_id: ssoId,
    allow_ldap: false,
    pwd_update_at: new Date().toISOString(),
  }
  // SSO 用户不通过本地口令登录，但仍以双层哈希存储随机口令，避免存明文
  await setUserPassword(user, generateRandomPassword())
  db.users.push(user)
  await saveDb(db, env)
  return user
}

function serializeJsLiteral(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029")
}

/** 解析弹窗模式 postMessage 允许接收令牌的可信前端 Origin（同源 + ALLOW_URLS 白名单，永不使用 "*"） */
export function resolvePopupTargetOrigins(c: any): string[] {
  const origins = new Set<string>()
  const addOrigin = (raw: string) => {
    const trimmed = raw.trim()
    if (!trimmed || trimmed === "*") return
    try {
      const u = new URL(trimmed)
      if ((u.protocol === "http:" || u.protocol === "https:") && u.origin !== "null") {
        origins.add(u.origin)
      }
    } catch {}
  }

  addOrigin(c.req?.url || "")

  const env = c?.env || {}
  const allowedRaw =
    env.ALLOW_URLS ||
    (typeof process !== "undefined" ? process.env?.ALLOW_URLS : "") ||
    ""
  for (const entry of String(allowedRaw).split(",")) {
    addOrigin(entry)
  }

  return Array.from(origins)
}

function postMessageHtml(
  field: string,
  value: string,
  nonce: string,
  targetOrigins: string[],
): string {
  const safePayload = serializeJsLiteral({ [field]: String(value) })
  const safeOrigins = serializeJsLiteral(targetOrigins)
  return `<!DOCTYPE html>
<head></head>
<body>
<script nonce="${nonce}">
if (window.opener) {
  var payload = ${safePayload};
  var origins = ${safeOrigins};
  for (var i = 0; i < origins.length; i++) {
    try {
      window.opener.postMessage(payload, origins[i]);
    } catch (e) {}
  }
}
window.close()
</script>
</body>`
}

function postMessageResponse(c: any, field: string, value: string) {
  const nonce = randomHex(16)
  const targetOrigins = resolvePopupTargetOrigins(c)
  return c.html(postMessageHtml(field, value, nonce, targetOrigins), 200, {
    "Content-Security-Policy": `default-src 'none'; script-src 'nonce-${nonce}'; frame-ancestors 'none'`,
    "Cache-Control": "no-store",
  })
}

// GET /api/auth/sso?method=sso_get_token | get_sso_id
ssoRouter.get("/sso", async (c) => {
  const db = await getDb(c.env)
  if (!getBool(db, "sso_login_enabled")) {
    return c.json({ code: 403, message: "Single sign-on is not enabled", data: null }, 403)
  }
  const method = c.req.query("method") || ""
  if (!method) {
    return c.json({ code: 400, message: "no method provided", data: null }, 400)
  }
  const platform = getSetting(db, "sso_login_platform")
  const clientId = getSetting(db, "sso_client_id")
  const useCompat = getBool(db, "sso_compatibility_mode")
  const redirectUri = useCompat
    ? `${apiOrigin(c)}/api/auth/${method}`
    : `${apiOrigin(c)}/api/auth/sso_callback?method=${method}`

  const ssoLoginUrl = getSetting(db, "sso_login_url")
  const ssoTokenUrl = getSetting(db, "sso_token_url")
  const ssoUserinfoUrl = getSetting(db, "sso_userinfo_url")
  const ssoScopes = getSetting(db, "sso_scopes")
  const discoveryUrl = getSetting(db, "sso_oidc_discovery_url")

  try {
    if (platform === "OIDC") {
      const ep = await oidcDiscovery(discoveryUrl || ssoLoginUrl)
      const secret = await getJwtSecret(c)
      const state = await generateOidcState(secret, clientId, clientIpOf(c))
      const params = new URLSearchParams({
        response_type: "code",
        client_id: clientId,
        redirect_uri: redirectUri,
        scope: ssoScopes || "openid profile",
        state,
      })
      return c.redirect(`${ep.authUrl}?${params.toString()}`, 302)
    }

    const def = platformDef(platform, ssoLoginUrl, ssoTokenUrl, ssoUserinfoUrl, ssoScopes)
    if (!def) {
      return c.json({ code: 400, message: "invalid platform", data: null }, 400)
    }
    const params = new URLSearchParams({
      response_type: "code",
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: def.scope,
    })
    for (const [k, v] of Object.entries(def.extraAuth || {})) params.set(k, v)
    return c.redirect(`${def.authUrl}?${params.toString()}`, 302)
  } catch (e: any) {
    return c.json({ code: 400, message: e.message || "SSO error", data: null }, 400)
  }
})

async function handleSsoCallback(
  c: any,
  forcedMethod?: "get_sso_id" | "sso_get_token",
) {
  const db = await getDb(c.env)
  if (!getBool(db, "sso_login_enabled")) {
    return c.text("Single sign-on is not enabled", 403)
  }
  const method = forcedMethod || c.req.query("method") || ""
  if (method !== "get_sso_id" && method !== "sso_get_token") {
    return c.text("invalid request", 400)
  }
  const oauthError = c.req.query("error")
  if (oauthError) {
    const desc = c.req.query("error_description")
    return c.text(
      desc ? `SSO error: ${oauthError} (${desc})` : `SSO error: ${oauthError}`,
      400,
    )
  }
  const platform = getSetting(db, "sso_login_platform")
  const clientId = getSetting(db, "sso_client_id")
  const clientSecret = getSetting(db, "sso_client_secret")
  const useCompat = !!forcedMethod || getBool(db, "sso_compatibility_mode")
  const redirectUri = forcedMethod
    ? `${apiOrigin(c)}/api/auth/${forcedMethod}`
    : useCompat
      ? `${apiOrigin(c)}/api/auth/${method}`
      : `${apiOrigin(c)}/api/auth/sso_callback?method=${method}`

  const ssoLoginUrl = getSetting(db, "sso_login_url")
  const ssoTokenUrl = getSetting(db, "sso_token_url")
  const ssoUserinfoUrl = getSetting(db, "sso_userinfo_url")
  const ssoScopes = getSetting(db, "sso_scopes")
  const discoveryUrl = getSetting(db, "sso_oidc_discovery_url")

  try {
    let tokenUrl: string
    let userUrl: string
    let idField: string
    let usernameField: string
    let scope: string
    let accessToken: string
    let userInfo: any

    if (platform === "OIDC") {
      const ep = await oidcDiscovery(discoveryUrl || ssoLoginUrl)
      tokenUrl = ep.tokenUrl
      userUrl = ep.userUrl
      idField = "sub"
      usernameField = "preferred_username"
      scope = ssoScopes || "openid profile"
      const secret = await getJwtSecret(c)
      if (
        !(await verifyOidcState(
          secret,
          clientId,
          clientIpOf(c),
          c.req.query("state") || "",
        ))
      ) {
        return c.text("incorrect or expired state parameter", 400)
      }
      const code = c.req.query("code") || ""
      if (!code) {
        return c.text("No code provided", 400)
      }
      const tokenResp = await fetch(tokenUrl, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          scope,
        }).toString(),
      })
      const tokenData: any = await tokenResp.json().catch(() => ({}))
      accessToken = tokenData.access_token
      if (!accessToken) {
        const detail =
          tokenData.error_description || tokenData.error || `HTTP ${tokenResp.status}`
        throw new Error(`OIDC token exchange failed: ${detail}`)
      }
      if (userUrl) {
        const uResp = await fetch(userUrl, {
          headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" },
        })
        userInfo = await uResp.json().catch(() => ({}))
        const name = userInfo?.preferred_username || userInfo?.name || userInfo?.nickname || ""
        if (!userInfo?.sub && !name) {
          // 回退：解析 id_token payload 的 name 字段
          const idToken = tokenData.id_token
          if (idToken) {
            const payload = parseJwtPayload(idToken)
            userInfo = userInfo || {}
            userInfo.sub = userInfo.sub || payload?.sub
            userInfo.name = name || payload?.name || payload?.preferred_username || ""
          }
        }
        if (name) userInfo.name = name
      } else {
        const idToken = tokenData.id_token
        if (!idToken) throw new Error("no id_token and no userinfo endpoint")
        userInfo = parseJwtPayload(idToken) || {}
        userInfo.sub = userInfo.sub || userInfo.name || ""
      }
    } else {
      const def = platformDef(platform, ssoLoginUrl, ssoTokenUrl, ssoUserinfoUrl, ssoScopes)
      if (!def) return c.text("invalid platform", 400)
      tokenUrl = def.tokenUrl
      userUrl = def.userUrl
      idField = def.idField
      usernameField = def.usernameField
      scope = def.scope

      const code = c.req.query(def.authField) || ""
      if (!code) return c.text("No code provided", 400)

      let tokenResp: Response
      if (def.tokenStyle === "json") {
        // Dingtalk
        tokenResp = await fetch(tokenUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({
            clientId,
            clientSecret,
            code,
            grantType: "authorization_code",
          }),
        })
      } else {
        const form: Record<string, string> = {
          client_id: clientId,
          client_secret: clientSecret,
          code,
          redirect_uri: redirectUri,
          scope,
          ...(def.extraForm || {}),
        }
        tokenResp = await fetch(tokenUrl, {
          method: "POST",
          headers: { Accept: "application/json" },
          body: new URLSearchParams(form).toString(),
        })
      }
      const tokenData: any = await tokenResp.json().catch(() => ({}))
      accessToken = tokenData.access_token || tokenData.accessToken
      if (!accessToken) {
        throw new Error(`token exchange failed: ${tokenData.error || tokenResp.status}`)
      }

      const headers: Record<string, string> = { Accept: "application/json" }
      if (platform === "Dingtalk") {
        headers["x-acs-dingtalk-access-token"] = accessToken
      } else {
        headers["Authorization"] = `Bearer ${accessToken}`
      }
      const uResp = await fetch(userUrl, { headers })
      userInfo = await uResp.json().catch(() => ({}))
    }

    const userID = String(userInfo?.id ?? userInfo?.sub ?? userInfo?.[idField] ?? "")
    if (!userID || userID === "0") {
      return c.text("cannot get user id from SSO provider", 400)
    }

    if (method === "get_sso_id") {
      if (useCompat) {
        c.header("Cache-Control", "no-store")
        return c.redirect(`${apiOrigin(c)}/@manage?sso_id=${encodeURIComponent(userID)}`, 302)
      }
      return postMessageResponse(c, "sso_id", userID)
    }

    // sso_get_token
    let user = (db.users || []).find((u: any) => u.sso_id === userID)
    if (!user) {
      const autoReg = getBool(db, "sso_auto_register")
      if (!autoReg) {
        return c.text("user not found and auto register is disabled", 400)
      }
      const username = String(userInfo?.login ?? userInfo?.[usernameField] ?? userInfo?.name ?? "")
      user = await autoRegister(db, username || userID, userID, c.env)
    }
    const token = await generateToken(user, c)
    if (useCompat) {
      c.header("Cache-Control", "no-store")
      return c.redirect(`${apiOrigin(c)}/@login?token=${encodeURIComponent(token)}`, 302)
    }
    return postMessageResponse(c, "token", token)
  } catch (e: any) {
    return c.text(e.message || "SSO error", 500)
  }
}

// GET /api/auth/sso_callback?method=...&code=...
ssoRouter.get("/sso_callback", (c) => handleSsoCallback(c))

// 兼容模式回调端点（无 query 参数，供 Auth0 等严格校验 Allowed Callback URLs 的平台使用）
ssoRouter.get("/sso_get_token", (c) => handleSsoCallback(c, "sso_get_token"))
ssoRouter.get("/get_sso_id", (c) => handleSsoCallback(c, "get_sso_id"))

/** 解析 JWT payload（仅解码，不验证签名——OIDC 下 code 已交换） */
function parseJwtPayload(token: string): any {
  try {
    const parts = token.split(".")
    if (parts.length < 2) return null
    const payload = parts[1].replace(/-/g, "+").replace(/_/g, "/")
    const padded = payload.padEnd(Math.ceil(payload.length / 4) * 4, "=")
    const decoded = atob(padded)
    return JSON.parse(decoded)
  } catch {
    return null
  }
}
