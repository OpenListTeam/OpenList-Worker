import { Hono } from "hono"
import { sign, verify } from "hono/jwt"
import { getDb, saveDb } from "../internal/model/db"
import { getJwtSecret } from "../pkg/utils"
import {
  generateSecret,
  generateTOTP,
  verifyTOTP,
  getTOTPUri,
} from "../pkg/totp"

// Helper: check OTP for login
async function checkOtpForLogin(
  user: any,
  otpCode: string | undefined,
): Promise<{ ok: boolean; needOtp?: boolean }> {
  if (!user.otp_enabled) return { ok: true }
  if (!otpCode) return { ok: false, needOtp: true }
  const valid = await verifyTOTP(user.otp_secret || "", otpCode)
  if (!valid) return { ok: false, needOtp: true }
  return { ok: true }
}

export const authRouter = new Hono()

// ─── Password Hashing (PBKDF2-SHA256, 100 000 iterations) ───────────────────
// Format: "pbkdf2:{iterations}:{saltHex}:{hashHex}"
// The legacy SHA-256 format (64-char hex) is still accepted for migration
// but new passwords are always hashed with PBKDF2.

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

async function verifyPassword(
  plainPassword: string,
  storedHash: string,
): Promise<boolean> {
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
      { name: "PBKDF2", salt: salt.buffer as ArrayBuffer, iterations, hash: "SHA-256" },
      keyMaterial,
      256,
    )
    const hashHex = hexEncode(new Uint8Array(hashBuf))
    return hashHex === expectedHash
  }
  // Legacy SHA-256 format (64 hex chars) — migrate on next login
  if (storedHash.length === 64 && /^[0-9a-f]{64}$/.test(storedHash)) {
    const hash_salt = "https://github.com/alist-org/alist"
    const buf = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(`${plainPassword}-${hash_salt}`),
    )
    const computed = hexEncode(new Uint8Array(buf))
    return computed === storedHash
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

// ─── Simple IP-based Rate Limiting (in-memory, per-isolate) ─────────────────

const loginAttempts = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT_WINDOW = 60_000 // 1 minute
const MAX_ATTEMPTS = 10

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const entry = loginAttempts.get(ip)
  if (!entry || now > entry.resetAt) {
    loginAttempts.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW })
    return true
  }
  entry.count++
  return entry.count <= MAX_ATTEMPTS
}

// Ensure admin user exists in DB with proper hashed passwords.
// Also migrates users that have empty password fields (from defaultDb).
async function getOrInitUsers(envCtx: any) {
  const db = await getDb(envCtx)
  let changed = false

  if (!db.users || db.users.length === 0) {
    const defaultAdminHash = await hashPassword("admin")
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
    // Migrate admin user that has an empty password (from defaultDb)
    const admin = db.users.find((u: any) => u.username === "admin")
    if (admin && !admin.password) {
      admin.password = await hashPassword("admin")
      admin.pwd_update_at = new Date().toISOString()
      changed = true
    }
  }

  if (changed) {
    await saveDb(db, envCtx)
  }
  return { db, users: db.users }
}

function getIp(c: any): string {
  return (
    c.req.header("CF-Connecting-IP") ||
    c.req.header("X-Forwarded-For")?.split(",")[0]?.trim() ||
    "unknown"
  )
}

// ─── POST /api/auth/login ───────────────────────────────────────────────────

authRouter.post("/login", async (c) => {
  const ip = getIp(c)
  if (!checkRateLimit(ip)) {
    return c.json(
      { code: 429, message: "登录尝试次数过多，请稍后再试", data: null },
      429,
    )
  }

  const body = await c.req.json().catch(() => ({}))
  const username = (body.username || "").trim()
  const rawPassword = body.password || ""
  const otpCode = body.otp_code || ""

  const { users } = await getOrInitUsers(c.env)

  const matchedUser = users.find(
    (u: any) => u.username === username && !u.disabled,
  )

  if (matchedUser) {
    // If password is empty (from defaultDb), migrate it now
    if (!matchedUser.password) {
      matchedUser.password = await hashPassword(rawPassword || "admin")
      const db = await getDb(c.env)
      const idx = db.users.findIndex((u: any) => u.id === matchedUser.id)
      if (idx !== -1) {
        db.users[idx].password = matchedUser.password
        await saveDb(db, c.env)
      }
    }
    if (matchedUser.password) {
      const valid = await verifyPassword(rawPassword, matchedUser.password)
      if (valid) {
        // Migrate legacy SHA-256 hash to PBKDF2 on successful login
        if (
          matchedUser.password.length === 64 &&
          /^[0-9a-f]{64}$/.test(matchedUser.password)
        ) {
          matchedUser.password = await hashPassword(rawPassword)
          const db = await getDb(c.env)
          const idx = db.users.findIndex((u: any) => u.id === matchedUser.id)
          if (idx !== -1) {
            db.users[idx].password = matchedUser.password
            await saveDb(db, c.env)
          }
        }

        // Check 2FA if enabled
        if (matchedUser.otp_enabled) {
          const otpResult = await checkOtpForLogin(matchedUser, otpCode)
          if (otpResult.needOtp) {
            return c.json(
              { code: 402, message: "需要双因素验证码", data: null },
              402,
            )
          }
        }

        const payload = {
          id: matchedUser.id,
          username: matchedUser.username,
          role: matchedUser.role,
          exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7,
        }
        const token = await sign(payload, getJwtSecret(c.env))
        return c.json({ code: 200, message: "success", data: { token } })
      }
    }
  }

  return c.json({ code: 401, message: "用户名或密码错误", data: null }, 401)
})

// ─── POST /api/auth/login/hash ──────────────────────────────────────────────

authRouter.post("/login/hash", async (c) => {
  const ip = getIp(c)
  if (!checkRateLimit(ip)) {
    return c.json(
      { code: 429, message: "登录尝试次数过多，请稍后再试", data: null },
      429,
    )
  }

  const body = await c.req.json().catch(() => ({}))
  const username = (body.username || "").trim()
  const inputHash = body.password || ""
  const otpCode = body.otp_code || ""

  const { users } = await getOrInitUsers(c.env)

  const matchedUser = users.find(
    (u: any) => u.username === username && !u.disabled,
  )

  if (matchedUser && matchedUser.password) {
    const userPassHash = matchedUser.password
    // Accept if the client-sent hash matches the stored hash directly
    // (the frontend pre-hashes with the same legacy algorithm)
    if (inputHash === userPassHash) {
      // Check 2FA if enabled
      if (matchedUser.otp_enabled) {
        const otpResult = await checkOtpForLogin(matchedUser, otpCode)
        if (otpResult.needOtp) {
          return c.json(
            { code: 402, message: "需要双因素验证码", data: null },
            402,
          )
        }
      }

      const payload = {
        id: matchedUser.id,
        username: matchedUser.username,
        role: matchedUser.role,
        exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7,
      }
      const token = await sign(payload, getJwtSecret(c.env))
      return c.json({ code: 200, message: "success", data: { token } })
    }
  }

  return c.json({ code: 401, message: "用户名或密码错误", data: null }, 401)
})

// ─── POST /api/me/update ────────────────────────────────────────────────────

export const meUpdateHandler = async (c: any) => {
  const authHeader = c.req.header("Authorization")
  if (!authHeader) {
    return c.json({ code: 401, message: "未授权", data: null }, 401)
  }
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.substring(7)
    : authHeader
  try {
    const payload = await verify(token, getJwtSecret((c as any).env), "HS256")
    const body = await c.req.json().catch(() => ({}))
    const db = await getDb(c.env)
    if (!db.users) db.users = []

    const userIdx = db.users.findIndex(
      (u: any) => u.id === payload.id || u.username === payload.username,
    )
    if (userIdx === -1) {
      return c.json({ code: 401, message: "未授权", data: null }, 401)
    }

    const user = db.users[userIdx]
    if (user.disabled) {
      return c.json({ code: 403, message: "账户已被禁用", data: null }, 403)
    }

    if (body.username && body.username.trim() !== "") {
      const newUsername = body.username.trim()
      const exists = db.users.some(
        (u: any) => u.id !== user.id && u.username === newUsername,
      )
      if (exists) {
        return c.json(
          { code: 400, message: "用户名已存在", data: null },
          400,
        )
      }
      user.username = newUsername
    }

    if (body.password && body.password.trim() !== "") {
      user.password = await hashPassword(body.password.trim())
      user.pwd_update_at = new Date().toISOString()
    }

    db.users[userIdx] = user
    await saveDb(db, c.env)

    return c.json({ code: 200, message: "success", data: null })
  } catch {
    return c.json({ code: 401, message: "未授权", data: null }, 401)
  }
}

// ─── GET /api/me ────────────────────────────────────────────────────────────

export const meHandler = async (c: any) => {
  const authHeader = c.req.header("Authorization")
  if (!authHeader) {
    return c.json(
      { code: 401, message: "未授权", data: null },
      401,
    )
  }
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.substring(7)
    : authHeader
  try {
    const payload = await verify(token, getJwtSecret((c as any).env), "HS256")
    const db = await getDb(c.env)
    const dbUser = (db.users || []).find(
      (u: any) => u.id === payload.id || u.username === payload.username,
    )

    if (!dbUser) {
      return c.json(
        { code: 401, message: "未授权", data: null },
        401,
      )
    }

    if (dbUser.disabled) {
      return c.json(
        { code: 403, message: "账户已被禁用", data: null },
        403,
      )
    }

    return c.json({
      code: 200,
      message: "success",
      data: {
        id: dbUser.id,
        username: dbUser.username,
        role: dbUser.role,
        permission: dbUser.permission ?? 0,
        base_path: dbUser.base_path || "/",
        disabled: !!dbUser.disabled,
        sso_id: dbUser.sso_id || "",
        allow_ldap: !!dbUser.allow_ldap,
        otp: !!dbUser.otp_enabled,
      },
    })
  } catch {
    return c.json({ code: 401, message: "未授权", data: null }, 401)
  }
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
  const authHeader = c.req.header("Authorization")
  if (!authHeader) {
    return c.json({ code: 401, message: "未授权", data: null }, 401)
  }
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.substring(7)
    : authHeader
  try {
    const payload = await verify(token, getJwtSecret(c.env), "HS256")
    const db = await getDb(c.env)
    const user = (db.users || []).find(
      (u: any) => u.id === payload.id || u.username === payload.username,
    )
    if (!user || user.disabled) {
      return c.json({ code: 401, message: "未授权", data: null }, 401)
    }
    if (user.otp_enabled) {
      return c.json(
        { code: 400, message: "2FA 已经开启", data: null },
        400,
      )
    }

    const secret = generateSecret()
    const uri = getTOTPUri(secret, user.username)

    // Generate QR code as data URL using the qrcode library
    let qr = ""
    try {
      const QRCode = await import("qrcode")
      qr = await QRCode.toDataURL(uri, { width: 256 })
    } catch {
      // Fallback: return the URI for manual entry
      qr = ""
    }

    // Store the secret temporarily (not yet verified)
    user.otp_secret = secret
    const userIdx = db.users.findIndex((u: any) => u.id === user.id)
    if (userIdx !== -1) {
      db.users[userIdx] = user
      await saveDb(db, c.env)
    }

    return c.json({
      code: 200,
      message: "success",
      data: { qr, secret },
    })
  } catch {
    return c.json({ code: 401, message: "未授权", data: null }, 401)
  }
})

// ─── POST /api/auth/2fa/verify ───────────────────────────────────────────────

authRouter.post("/2fa/verify", async (c) => {
  const authHeader = c.req.header("Authorization")
  if (!authHeader) {
    return c.json({ code: 401, message: "未授权", data: null }, 401)
  }
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.substring(7)
    : authHeader
  try {
    const payload = await verify(token, getJwtSecret(c.env), "HS256")
    const body = await c.req.json().catch(() => ({}))
    const code = body.code || ""
    const secret = body.secret || ""

    if (!code || !secret) {
      return c.json(
        { code: 400, message: "验证码和密钥为必填项", data: null },
        400,
      )
    }

    const db = await getDb(c.env)
    const userIdx = db.users.findIndex(
      (u: any) => u.id === payload.id || u.username === payload.username,
    )
    if (userIdx === -1) {
      return c.json({ code: 401, message: "未授权", data: null }, 401)
    }

    const user = db.users[userIdx]
    if (user.disabled) {
      return c.json({ code: 403, message: "账户已被禁用", data: null }, 403)
    }

    // Verify the code against the secret
    const valid = await verifyTOTP(secret, code)
    if (!valid) {
      return c.json(
        { code: 400, message: "验证码无效", data: null },
        400,
      )
    }

    // Activate 2FA
    user.otp_secret = secret
    user.otp_enabled = true
    db.users[userIdx] = user
    await saveDb(db, c.env)

    return c.json({ code: 200, message: "success", data: null })
  } catch {
    return c.json({ code: 401, message: "未授权", data: null }, 401)
  }
})
