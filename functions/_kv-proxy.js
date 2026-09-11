/**
 * KV 代理共享模块
 *
 * EdgeOne Edge Functions 约定：
 * - 目录 functions/<name>/index.js 自动生成路由 /<name>
 * - 以 `_` 开头的文件为共享模块，不生成路由
 * - KV 绑定名在运行时直接可用（官方示例做法，非 env.KV）
 *
 * 鉴权策略（三层）：
 *  1. 内部调用：X-Internal-Call 常量时间比对密钥前 16 位
 *     —— 用于 Node 云函数（初始化、后台任务等无用户 token 的场景）
 *  2. 用户调用：真实校验 HS256 JWT 签名 + exp/nbf + 管理员角色
 *     —— 用于外部直接访问 /kv-* 的请求
 *  3. 其余一律 401
 *
 * JWT 密钥来源与 Node 侧保持一致：
 *  env.JWT_SECRET -> KV 中的 openlist_jwt_secret -> （都没有则拒绝用户调用）
 */

const JWT_SECRET_KV_KEY = "openlist_jwt_secret"
const ADMIN_ROLE = 2

/* ─────────────────────────── KV 绑定解析 ─────────────────────────── */

/**
 * 解析 KV 绑定。
 *
 * 绑定名固定为 `KV`。官方示例中绑定名是直接可用的全局标识符，
 * 这里兼容 env 挂载与全局两种形态。
 */
export function resolveKv(env) {
  const v = env?.KV
  if (isKvLike(v)) return v
  const gv = globalThis?.KV
  if (isKvLike(gv)) return gv
  return null
}

function isKvLike(v) {
  return !!v && typeof v.get === "function" && typeof v.put === "function"
}

/* ─────────────────────────── 密钥获取 ─────────────────────────── */

/**
 * 获取 JWT 密钥，优先级与 Node 侧 getJwtSecret 一致。
 *
 * **不缓存**。KV 密钥可能被 Node 侧随时写入或轮换，任何形式的模块级
 * 缓存（哪怕带 TTL）都会让本实例在一段时间内持有旧值，导致
 * X-Internal-Call 鉴权失败。env 读取本身几乎无开销，KV 读取仅在
 * 未配置 env 时发生，成本可接受。用最简单的方式换取"永不失效"。
 *
 * @returns {Promise<string|null>}
 */
export async function getJwtSecret(env) {
  // 1) 环境变量（长度需 >= 16，与 Node 侧一致）
  const envSecret = env?.JWT_SECRET || globalThis?.JWT_SECRET
  if (typeof envSecret === "string" && envSecret.length >= 16) {
    return envSecret
  }

  // 2) KV 持久化密钥（与 Node 侧共用 openlist_jwt_secret）
  try {
    const kv = resolveKv(env)
    if (kv) {
      const val = await kv.get(JWT_SECRET_KV_KEY, { type: "text" })
      if (typeof val === "string" && val.length >= 16) {
        return val
      }
    }
  } catch {
    // 读取失败则视为无密钥
  }

  return null
}

/* ─────────────────────────── 鉴权 ─────────────────────────── */

/**
 * 常量时间字符串比较（防时序攻击）
 */
function timingSafeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string") return false
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return diff === 0
}

/* ── base64url 工具 ── */
function b64urlToBytes(s) {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4))
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + pad
  const bin = atob(b64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return bytes
}

function b64urlToJson(s) {
  return JSON.parse(new TextDecoder().decode(b64urlToBytes(s)))
}

function bytesToB64url(bytes) {
  let bin = ""
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}

/**
 * 校验 HS256 JWT：签名 + exp + nbf。
 * @returns {Promise<object|null>} 校验通过的 payload，失败返回 null
 */
export async function verifyJwt(token, secret) {
  if (!secret) return null

  const parts = String(token).split(".")
  if (parts.length !== 3) return null

  const [headerB64, payloadB64, signB64] = parts

  // 1) 头部算法必须为 HS256，拒绝 alg=none 等降级攻击
  let header
  try {
    header = b64urlToJson(headerB64)
  } catch {
    return null
  }
  if (!header || header.alg !== "HS256") return null

  // 2) 验签
  let keyMat
  try {
    keyMat = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"],
    )
  } catch {
    return null
  }

  let signature
  try {
    signature = b64urlToBytes(signB64)
  } catch {
    return null
  }

  let valid
  try {
    valid = await crypto.subtle.verify(
      "HMAC",
      keyMat,
      signature,
      new TextEncoder().encode(`${headerB64}.${payloadB64}`),
    )
  } catch {
    valid = false
  }
  if (!valid) return null

  // 3) 时间与角色校验
  let payload
  try {
    payload = b64urlToJson(payloadB64)
  } catch {
    return null
  }
  if (!payload) return null

  const now = Math.floor(Date.now() / 1000)
  if (typeof payload.exp === "number" && now >= payload.exp) return null
  if (typeof payload.nbf === "number" && now < payload.nbf) return null

  return payload
}

/**
 * 统一鉴权入口
 *
 * @returns {Promise<{ok: boolean, mode: "internal"|"user"|"anonymous", reason?: string}>}
 */
export async function authorize(request, env) {
  /* ── 1) 内部调用（Node 云函数） ── */
  const internal = request.headers.get("X-Internal-Call")
  if (internal) {
    const secret = await getJwtSecret(env)
    if (secret && timingSafeEqual(internal, secret.slice(0, 16))) {
      return { ok: true, mode: "internal" }
    }
    // 带了内部调用头但不匹配：直接拒绝，不继续尝试用户鉴权，
    // 避免用错误头绕过后续逻辑
    return { ok: false, mode: "anonymous", reason: "invalid internal call" }
  }

  /* ── 2) 用户调用（真实校验 JWT） ── */
  const auth = request.headers.get("Authorization") || ""
  if (auth.startsWith("Bearer ")) {
    const token = auth.slice(7)
    const secret = await getJwtSecret(env)

    if (!secret) {
      return {
        ok: false,
        mode: "anonymous",
        reason: "no JWT secret configured on edge",
      }
    }

    const payload = await verifyJwt(token, secret)
    if (!payload) {
      return { ok: false, mode: "anonymous", reason: "invalid token" }
    }

    // 管理员角色校验：KV 为数据面，仅管理员可读写
    if (Number(payload.role) !== ADMIN_ROLE) {
      return { ok: false, mode: "user", reason: "admin role required" }
    }

    return { ok: true, mode: "user" }
  }

  return { ok: false, mode: "anonymous", reason: "no credentials" }
}

/* ─────────────────────────── 响应工具 ─────────────────────────── */

/** 统一 JSON 响应，禁止缓存 */
export function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  })
}

export function unauthorized(message = "Unauthorized") {
  return json({ error: message }, 401)
}

export function forbidden(message = "Forbidden") {
  return json({ error: message }, 403)
}

export function kvMissing() {
  return json(
    {
      error:
        "KV binding not available in Edge Function. " +
        "Check that the KV namespace is bound to Edge Functions (not Node Functions).",
    },
    503,
  )
}

/**
 * 根据鉴权结果返回合适的错误响应
 */
export function deny(auth) {
  if (auth.mode === "user") return forbidden(auth.reason || "Forbidden")
  return unauthorized(auth.reason || "Unauthorized")
}

// 供路由模块复用的验签工具（导出以便测试）
export { b64urlToBytes, bytesToB64url, timingSafeEqual }
