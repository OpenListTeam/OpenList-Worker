import { Hono, type Context } from "hono"
import { sign, verify } from "hono/jwt"
import { getDb, saveDb } from "../internal/model/db"
import { getJwtSecret, getUserFromContext } from "./middlewares"
import {
  generateTotpSecret,
  verifyTotpCode,
  buildOtpauthUrl,
  buildQrImageUrl,
} from "../pkg/totp"
import {
  listUserSshKeys,
  addUserSshKey,
  deleteUserSshKey,
} from "../internal/op/sshkey"

export const authRouter = new Hono()
export const meRouter = new Hono()

// --- 登录防爆破（尽力而为，进程内计数）---
const LOGIN_MAX_FAILURES = 5
const LOGIN_LOCK_MS = 15 * 60 * 1000
const loginFailures = new Map<string, { count: number; lockedUntil: number }>()

function clientIpOf(c: Context): string {
  return (
    c.req.header("CF-Connecting-IP") ||
    c.req.header("x-real-ip") ||
    c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  )
}

function loginKey(c: Context, username: string): string {
  return `${clientIpOf(c)}|${String(username || "").toLowerCase()}`
}

function isLoginLocked(c: Context, username: string): boolean {
  if (loginFailures.size > 10000) {
    const now = Date.now()
    for (const [k, v] of loginFailures) {
      if (v.lockedUntil < now && v.count === 0) loginFailures.delete(k)
    }
  }
  const rec = loginFailures.get(loginKey(c, username))
  return !!rec && rec.lockedUntil > Date.now()
}

function recordLoginFailure(c: Context, username: string) {
  const key = loginKey(c, username)
  const now = Date.now()
  const rec = loginFailures.get(key) || { count: 0, lockedUntil: 0 }
  if (rec.lockedUntil > now) return
  rec.count += 1
  if (rec.count >= LOGIN_MAX_FAILURES) {
    rec.lockedUntil = now + LOGIN_LOCK_MS
    rec.count = 0
  }
  loginFailures.set(key, rec)
}

function clearLoginFailures(c: Context, username: string) {
  loginFailures.delete(loginKey(c, username))
}

// ─── Password Hashing (PBKDF2-SHA256, 100 000 iterations) ───────────────────
const PBKDF2_ITERATIONS = 100_000

export async function hashPassword(plainPassword: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(plainPassword),
    "PBKDF2",
    false,
    ["deriveBits"],
  )
  const hashBuf = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: salt.buffer as ArrayBuffer,
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    keyMaterial,
    256,
  )
  const saltHex = hexEncode(salt)
  const hashHex = hexEncode(new Uint8Array(hashBuf))
  return `pbkdf2:${PBKDF2_ITERATIONS}:${saltHex}:${hashHex}`
}

export async function verifyPassword(
  plainPassword: string,
  storedHash: string,
): Promise<boolean> {
  if (!storedHash) return false
  // New PBKDF2 format
  if (storedHash.startsWith("pbkdf2:")) {
    const [, iterStr, saltHex, expectedHash] = storedHash.split(":")
    const iterations = parseInt(iterStr, 10)
    const salt = fromHex(saltHex)
    const keyMaterial = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(plainPassword),
      "PBKDF2",
      false,
      ["deriveBits"],
    )
    const hashBuf = await crypto.subtle.deriveBits(
      {
        name: "PBKDF2",
        salt: salt.buffer as ArrayBuffer,
        iterations,
        hash: "SHA-256",
      },
      keyMaterial,
      256,
    )
    const hashHex = hexEncode(new Uint8Array(hashBuf))
    return hashHex === expectedHash
  }
  // Legacy SHA-256 format (64 hex chars)
  if (storedHash.length === 64 && /^[0-9a-f]{64}$/i.test(storedHash)) {
    const hash_salt = "https://github.com/alist-org/alist"
    const buf = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(`${plainPassword}-${hash_salt}`),
    )
    const computed = hexEncode(new Uint8Array(buf))
    return computed.toLowerCase() === storedHash.toLowerCase()
  }
  return false
}

function hexEncode(buf: ArrayBuffer | Uint8Array): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
}

function fromHex(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16)
  }
  return bytes
}

// Ensure admin user exists in DB KV space with a default password if unset
export async function getOrInitUsers(envCtx: any) {
  const db = await getDb(envCtx)
  let changed = false

  if (!db.users || db.users.length === 0) {
    const envPass =
      (envCtx && envCtx.ADMIN_PASSWORD) ||
      (typeof process !== "undefined" ? process.env?.ADMIN_PASSWORD : "") ||
      ""
    const defaultAdminHash = await hashPassword(envPass || "admin")
    db.users = [
      {
        id: 1,
        username: "admin",
        password: defaultAdminHash,
        role: 2,
        permission: 0,
        base_path: "/",
        disabled: false,
        sso_id: "",
        allow_ldap: false,
        pwd_update_at: new Date().toISOString(),
        otp_secret: "",
        otp_enabled: false,
      },
      {
        id: 2,
        username: "guest",
        password: "",
        role: 1,
        permission: 0,
        base_path: "/",
        disabled: false,
        sso_id: "",
        allow_ldap: false,
        pwd_update_at: new Date().toISOString(),
        otp_secret: "",
        otp_enabled: false,
      },
    ]
    changed = true
  } else {
    const admin = db.users.find((u: any) => u.username === "admin")
    if (admin && !admin.password) {
      admin.password = await hashPassword("admin")
      admin.pwd_update_at = new Date().toISOString()
      changed = true
    }
  }

  if (changed) {
    await saveDb(db, envCtx)
  } else {
    const adminUser = db.users.find((u: any) => u.username === "admin")
    if (
      adminUser &&
      (!adminUser.password || String(adminUser.password).trim() === "")
    ) {
      const envPass =
        (envCtx && envCtx.ADMIN_PASSWORD) ||
        (typeof process !== "undefined" ? process.env?.ADMIN_PASSWORD : "") ||
        ""
      adminUser.password = await hashPassword(envPass || "admin")
      await saveDb(db, envCtx)
    }
  }
  return { db, users: db.users }
}

export async function authUserFromReq(
  c: any,
): Promise<{ db: any; user: any } | null> {
  const authHeader = c.req.header("Authorization")
  if (!authHeader) return null
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.substring(7)
    : authHeader
  try {
    const secret = await getJwtSecret(c)
    const payload: any = await verify(token, secret, "HS256")
    const db = await getDb(c.env)
    if (!db.users) db.users = []
    const user = db.users.find(
      (u: any) => u.id === payload.id || u.username === payload.username,
    )
    if (!user || user.disabled) return null
    return { db, user }
  } catch {
    return null
  }
}

async function checkUserOtp(matchedUser: any, body: any) {
  if (!matchedUser.otp_secret && !matchedUser.otp_enabled) {
    return { ok: true, code: 200, httpStatus: 200 as const, message: "ok" }
  }
  const secret = matchedUser.otp_secret
  if (!secret) {
    return { ok: true, code: 200, httpStatus: 200 as const, message: "ok" }
  }
  const otpCode = String(body.otp_code || body.code || "").trim()
  if (!otpCode) {
    return {
      ok: false,
      code: 402,
      httpStatus: 200 as const,
      message: "需要双因素验证码",
    }
  }
  const valid = await verifyTotpCode(secret, otpCode)
  if (!valid) {
    return {
      ok: false,
      code: 401,
      httpStatus: 401 as const,
      message: "双因素验证码错误",
    }
  }
  return { ok: true, code: 200, httpStatus: 200 as const, message: "ok" }
}

// ─── POST /api/auth/login ───────────────────────────────────────────────────
authRouter.post("/login", async (c) => {
  const body = await c.req.json().catch(() => ({}))
  const username = (body.username || "").trim()
  const rawPassword = body.password || ""

  // 防爆破：IP+用户名维度连续失败锁定
  if (isLoginLocked(c, username)) {
    return c.json(
      {
        code: 429,
        message: "登录尝试次数过多，请稍后再试",
        data: null,
      },
      429,
    )
  }

  const { users } = await getOrInitUsers(c.env)
  const matchedUser = users.find(
    (u: any) => u.username === username && !u.disabled,
  )

  if (matchedUser && matchedUser.password) {
    const isPasswordValid = await verifyPassword(
      rawPassword,
      matchedUser.password,
    )

    if (isPasswordValid) {
      // Check 2FA
      const otpCheck = await checkUserOtp(matchedUser, body)
      if (!otpCheck.ok) {
        return c.json(
          { code: otpCheck.code, message: otpCheck.message, data: null },
          otpCheck.httpStatus,
        )
      }

      clearLoginFailures(c, username)

      // Migrate legacy SHA-256 hash to PBKDF2
      if (
        matchedUser.password.length === 64 &&
        /^[0-9a-f]{64}$/i.test(matchedUser.password)
      ) {
        matchedUser.password = await hashPassword(rawPassword)
        const db = await getDb(c.env)
        const idx = db.users.findIndex((u: any) => u.id === matchedUser.id)
        if (idx !== -1) {
          db.users[idx].password = matchedUser.password
          await saveDb(db, c.env)
        }
      }

      const payload = {
        id: matchedUser.id,
        username: matchedUser.username,
        role: matchedUser.role,
        exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7,
      }
      const secret = await getJwtSecret(c)
      const token = await sign(payload, secret)
      return c.json({
        code: 200,
        message: "success",
        data: { token },
      })
    }
  }

  recordLoginFailure(c, username)
  return c.json({ code: 401, message: "用户名或密码错误", data: null }, 401)
})

// ─── POST /api/auth/login/hash ──────────────────────────────────────────────
authRouter.post("/login/hash", async (c) => {
  const body = await c.req.json().catch(() => ({}))
  const username = (body.username || "").trim()
  const inputHash = String(body.password || "")
    .trim()
    .toLowerCase()

  if (isLoginLocked(c, username)) {
    return c.json(
      {
        code: 429,
        message: "登录尝试次数过多，请稍后再试",
        data: null,
      },
      429,
    )
  }

  const { users } = await getOrInitUsers(c.env)
  const matchedUser = users.find(
    (u: any) => u.username === username && !u.disabled,
  )

  if (matchedUser && matchedUser.password) {
    const userPass = String(matchedUser.password).trim().toLowerCase()
    let isHashValid = false
    if (userPass.length === 64 && inputHash === userPass) {
      isHashValid = true
    } else if (userPass.startsWith("pbkdf2:")) {
      // Cannot verify plain hash directly against PBKDF2 without plaintext,
      // but if input is exact match
      isHashValid = inputHash === userPass
    }

    if (isHashValid) {
      const otpCheck = await checkUserOtp(matchedUser, body)
      if (!otpCheck.ok) {
        return c.json(
          { code: otpCheck.code, message: otpCheck.message, data: null },
          otpCheck.httpStatus,
        )
      }
      clearLoginFailures(c, username)
      const payload = {
        id: matchedUser.id,
        username: matchedUser.username,
        role: matchedUser.role,
        exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7,
      }
      const secret = await getJwtSecret(c)
      const token = await sign(payload, secret)
      return c.json({
        code: 200,
        message: "success",
        data: { token },
      })
    }
  }

  recordLoginFailure(c, username)
  return c.json({ code: 401, message: "用户名或密码错误", data: null }, 401)
})

// ─── POST /api/me/update ────────────────────────────────────────────────────
export const meUpdateHandler = async (c: any) => {
  const auth = await authUserFromReq(c)
  if (!auth) {
    return c.json({ code: 401, message: "未授权", data: null }, 401)
  }
  const { db, user } = auth
  const body = await c.req.json().catch(() => ({}))

  if (body.username && body.username.trim() !== "") {
    const newUsername = body.username.trim()
    const exists = db.users.some(
      (u: any) => u.id !== user.id && u.username === newUsername,
    )
    if (exists) {
      return c.json({ code: 400, message: "用户名已存在", data: null }, 400)
    }
    user.username = newUsername
  }

  if (body.password && body.password.trim() !== "") {
    user.password = await hashPassword(body.password.trim())
    user.pwd_update_at = new Date().toISOString()
  }

  await saveDb(db, c.env)
  return c.json({ code: 200, message: "success", data: null })
}

// ─── GET /api/me ────────────────────────────────────────────────────────────
export const meHandler = async (c: any) => {
  const user = await getUserFromContext(c)
  if (!user || user.disabled) {
    return c.json(
      {
        code: 401,
        message: "未授权",
        data: null,
      },
      401,
    )
  }

  return c.json({
    code: 200,
    message: "success",
    data: {
      id: user.id,
      username: user.username,
      role: user.role,
      permission: user.permission ?? 0,
      base_path: user.base_path || "/",
      disabled: !!user.disabled,
      sso_id: user.sso_id || "",
      allow_ldap: !!user.allow_ldap,
      otp: !!user.otp_secret,
    },
  })
}

authRouter.get("/me", meHandler)
authRouter.post("/me/update", meUpdateHandler)

export const logoutHandler = (c: any) => {
  return c.json({ code: 200, message: "success", data: null })
}

authRouter.get("/logout", logoutHandler)
authRouter.post("/logout", logoutHandler)

// ─── POST /api/auth/2fa/generate ─────────────────────────────────────────────
authRouter.post("/2fa/generate", async (c) => {
  const auth = await authUserFromReq(c)
  if (!auth) {
    return c.json({ code: 401, message: "未授权", data: null }, 401)
  }
  const { user } = auth
  if (user.otp_secret) {
    return c.json({ code: 400, message: "2FA 已经开启", data: null }, 400)
  }
  const secret = generateTotpSecret()
  const otpauth = buildOtpauthUrl(secret, user.username)
  return c.json({
    code: 200,
    message: "success",
    data: { uri: otpauth, qr: buildQrImageUrl(otpauth), secret },
  })
})

// ─── POST /api/auth/2fa/verify ───────────────────────────────────────────────
authRouter.post("/2fa/verify", async (c) => {
  const auth = await authUserFromReq(c)
  if (!auth) {
    return c.json({ code: 401, message: "未授权", data: null }, 401)
  }
  const { db, user } = auth
  const body = await c.req.json().catch(() => ({}))
  const code = String(body.code || "").trim()
  const secret = String(body.secret || "").trim()
  if (!secret) {
    return c.json({ code: 400, message: "缺少密钥参数", data: null }, 400)
  }
  if (!/^[A-Z2-7]+$/i.test(secret)) {
    return c.json({ code: 400, message: "密钥格式不正确", data: null }, 400)
  }
  const valid = await verifyTotpCode(secret, code)
  if (!valid) {
    return c.json({ code: 400, message: "验证码无效", data: null }, 400)
  }
  user.otp_secret = secret.toUpperCase()
  user.otp_enabled = true
  await saveDb(db, c.env)
  return c.json({ code: 200, message: "success", data: null })
})

// Current user SSH Key sub-routes (/api/me/sshkey/*)
meRouter.get("/sshkey/list", async (c) => {
  const auth = await authUserFromReq(c)
  if (!auth) {
    return c.json({ code: 401, message: "未授权", data: null }, 401)
  }
  const keys = await listUserSshKeys(auth.user.id, c.env)
  return c.json({
    code: 200,
    message: "success",
    data: { content: keys, total: keys.length },
  })
})

meRouter.post("/sshkey/add", async (c) => {
  const auth = await authUserFromReq(c)
  if (!auth) {
    return c.json({ code: 401, message: "未授权", data: null }, 401)
  }
  const body = await c.req.json().catch(() => ({}))
  try {
    const key = await addUserSshKey(
      auth.user.id,
      body.key || body.public_key || "",
      body.name || body.title || "",
      c.env,
    )
    return c.json({
      code: 200,
      message: "success",
      data: key,
    })
  } catch (err: any) {
    return c.json(
      {
        code: 400,
        message: err.message || "Failed to add SSH key",
        data: null,
      },
      400,
    )
  }
})

meRouter.post("/sshkey/delete", async (c) => {
  const auth = await authUserFromReq(c)
  if (!auth) {
    return c.json({ code: 401, message: "未授权", data: null }, 401)
  }
  const id = c.req.query("id")
  if (!id) {
    return c.json({ code: 400, message: "缺少 ID 参数", data: null }, 400)
  }
  const removed = await deleteUserSshKey(auth.user.id, id, c.env)
  if (!removed) {
    return c.json({ code: 404, message: "SSH key not found", data: null }, 404)
  }
  const keys = await listUserSshKeys(auth.user.id, c.env)
  return c.json({
    code: 200,
    message: "success",
    data: keys,
  })
})
