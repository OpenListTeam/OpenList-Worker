import { Hono, type Context } from "hono"
import { sign, verify } from "hono/jwt"
import { getDb, saveDb } from "../internal/model/db"
import { getJwtSecret, getUserFromContext } from "./middlewares"
import {
  generateTotpSecret,
  generateTotpCode,
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
// Cloudflare Workers 多实例下各隔离区独立计数，但能显著提高暴力破解成本，
// 防止单实例上的无限制尝试。生产环境建议同时配置 IP 限流（ip_limit 设置项）。
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
  // 懒清理：Map 过大时清掉已过锁定期/无锁定的条目，防止无限增长
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
  if (rec.lockedUntil > now) return // already locked
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

// Helper to hash password matching OpenListNext/AList specification
export async function hashPassword(plainPassword: string): Promise<string> {
  const hash_salt = "https://github.com/alist-org/alist"
  const msgBuffer = new TextEncoder().encode(`${plainPassword}-${hash_salt}`)
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("")
}

/**
 * 16 random bytes as hex — used whenever a password must exist but no
 * explicit one was provided. Never use a constant fallback instead.
 */
export function generateRandomPassword(): string {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
}

// Ensure admin user exists in DB KV space with a default password if unset
export async function getOrInitUsers(envCtx: any) {
  const db = await getDb(envCtx)
  if (!db.users || db.users.length === 0) {
    // FIX(F-11): a fresh deployment must never start with a well-known
    // password. ADMIN_PASSWORD (wrangler secret / platform env) takes
    // precedence; without it a random password is generated and printed to
    // the startup log once — the same pattern Jenkins/GitLab use for their
    // initial admin credentials.
    const envPass =
      (envCtx && envCtx.ADMIN_PASSWORD) ||
      (typeof process !== "undefined" ? process.env?.ADMIN_PASSWORD : "") ||
      ""
    let initialPassword = envPass
    if (!initialPassword) {
      initialPassword = generateRandomPassword()
      console.warn(
        "[SECURITY] No ADMIN_PASSWORD configured — generated a random initial admin password. " +
          "Copy it from the next log line, log in, and change it immediately. It is not printed again.",
      )
      console.log(`[SECURITY] Initial admin password: ${initialPassword}`)
    }
    const defaultAdminHash = await hashPassword(initialPassword)
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
      },
    ]
    await saveDb(db, envCtx)
  } else {
    const adminUser = db.users.find((u: any) => u.username === "admin")
    // FIX(F-11): the old logic silently reset any non-64-hex password (e.g. a
    // legacy PBKDF2 hash) back to admin/admin — meaning a routine upgrade
    // could quietly reopen the admin account to the world. New behavior:
    //   ADMIN_PASSWORD set -> explicit reset to that value (operator intent)
    //   password empty    -> random password, printed once to the log
    //   legacy-format     -> LEFT UNTOUCHED, only a warning is logged, so an
    //                        existing deployment is never locked out nor
    //                        silently reset by upgrading.
    const adminPass = adminUser ? String(adminUser.password || "").trim() : ""
    const isValidFormat = /^[0-9a-f]{64}$/i.test(adminPass)
    if (adminUser && !isValidFormat) {
      const envPass =
        (envCtx && envCtx.ADMIN_PASSWORD) ||
        (typeof process !== "undefined" ? process.env?.ADMIN_PASSWORD : "") ||
        ""
      if (envPass) {
        adminUser.password = await hashPassword(envPass)
        adminUser.pwd_update_at = new Date().toISOString()
        await saveDb(db, envCtx)
      } else if (!adminPass) {
        const random = generateRandomPassword()
        console.warn(
          "[SECURITY] Admin password is empty and no ADMIN_PASSWORD is set — generated a random one. " +
            "Copy it from the next log line and change it after login. It is not printed again.",
        )
        console.log(`[SECURITY] New admin password: ${random}`)
        adminUser.password = await hashPassword(random)
        adminUser.pwd_update_at = new Date().toISOString()
        await saveDb(db, envCtx)
      } else {
        console.warn(
          "[SECURITY] Admin password uses a legacy hash format this build cannot verify; " +
            "it has been left untouched. Log in with your existing password and re-set it, " +
            "or set ADMIN_PASSWORD to force a reset. It will NOT be reset to a default value.",
        )
      }
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
    const payload = await verify(token, secret, "HS256")
    const db = await getDb(c.env)
    if (!db.users) db.users = []
    const user = db.users.find(
      (u: any) => u.id === payload.id || u.username === payload.username,
    )
    if (!user) return null
    return { db, user }
  } catch {
    return null
  }
}

async function checkUserOtp(matchedUser: any, body: any) {
  if (!matchedUser.otp_secret) {
    return { ok: true, code: 200, httpStatus: 200 as const, message: "ok" }
  }
  const otpCode = String(body.otp_code || body.code || "").trim()
  if (!otpCode) {
    return {
      ok: false,
      code: 402,
      httpStatus: 200 as const,
      message: "OTP code required",
    }
  }
  const valid = await verifyTotpCode(matchedUser.otp_secret, otpCode)
  if (!valid) {
    return {
      ok: false,
      code: 401,
      httpStatus: 401 as const,
      message: "Invalid OTP code",
    }
  }
  return { ok: true, code: 200, httpStatus: 200 as const, message: "ok" }
}

// POST /api/auth/login
authRouter.post("/login", async (c) => {
  const body = await c.req.json().catch(() => ({}))
  const username = (body.username || "").trim()
  const rawPassword = body.password || ""

  // 防爆破：IP+用户名维度连续失败锁定
  if (isLoginLocked(c, username)) {
    return c.json(
      {
        code: 429,
        message:
          "Too many failed login attempts for this account/IP, please try again later",
        data: null,
      },
      429,
    )
  }

  const hashedPassword = await hashPassword(rawPassword)

  const { users } = await getOrInitUsers(c.env)

  const matchedUser = users.find(
    (u: any) => u.username === username && !u.disabled,
  )

  if (matchedUser) {
    const userPass = matchedUser.password || ""
    const isPasswordValid =
      userPass !== "" && userPass.length === 64 && userPass === hashedPassword

    if (isPasswordValid) {
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
  return c.json({ code: 401, message: "Invalid credentials", data: null }, 401)
})

// POST /api/auth/login/hash
authRouter.post("/login/hash", async (c) => {
  const body = await c.req.json().catch(() => ({}))
  const username = (body.username || "").trim()
  const inputHash = String(body.password || "")
    .trim()
    .toLowerCase()

  // 防爆破：与 /login 同一计数体系
  if (isLoginLocked(c, username)) {
    return c.json(
      {
        code: 429,
        message:
          "Too many failed login attempts for this account/IP, please try again later",
        data: null,
      },
      429,
    )
  }

  const { users } = await getOrInitUsers(c.env)

  const matchedUser = users.find(
    (u: any) => u.username === username && !u.disabled,
  )

  if (matchedUser && inputHash.length === 64) {
    const userPass = String(matchedUser.password || "")
      .trim()
      .toLowerCase()
    const isHashValid = userPass.length === 64 && inputHash === userPass

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
  return c.json({ code: 401, message: "Invalid credentials", data: null }, 401)
})

// POST /api/me/update or /me/update
export const meUpdateHandler = async (c: any) => {
  const auth = await authUserFromReq(c)
  if (!auth) {
    return c.json({ code: 401, message: "Unauthorized", data: null }, 401)
  }
  const { db, user } = auth
  const body = await c.req.json().catch(() => ({}))

  if (body.username && body.username.trim() !== "") {
    const newUsername = body.username.trim()
    const exists = db.users.some(
      (u: any) => u.id !== user.id && u.username === newUsername,
    )
    if (exists) {
      return c.json(
        { code: 400, message: "Username already exists", data: null },
        400,
      )
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

// GET /api/me
export const meHandler = async (c: any) => {
  const user = await getUserFromContext(c)
  if (!user || user.disabled) {
    return c.json(
      {
        code: 401,
        message: "Unauthorized",
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
  return c.json({
    code: 200,
    message: "success",
    data: null,
  })
}

authRouter.get("/logout", logoutHandler)
authRouter.post("/logout", logoutHandler)

// POST /api/auth/2fa/generate — returns a fresh TOTP secret + QR image
authRouter.post("/2fa/generate", async (c) => {
  const auth = await authUserFromReq(c)
  if (!auth) {
    return c.json({ code: 401, message: "Unauthorized", data: null }, 401)
  }
  const { user } = auth
  if (user.otp_secret) {
    return c.json(
      { code: 400, message: "2FA already enabled", data: null },
      400,
    )
  }
  const secret = generateTotpSecret()
  const otpauth = buildOtpauthUrl(secret, user.username)
  return c.json({
    code: 200,
    message: "success",
    data: { qr: buildQrImageUrl(otpauth), secret },
  })
})

// POST /api/auth/2fa/verify — validate a code against the generated secret,
// then persist it on the user so future logins require the TOTP code.
authRouter.post("/2fa/verify", async (c) => {
  const auth = await authUserFromReq(c)
  if (!auth) {
    return c.json({ code: 401, message: "Unauthorized", data: null }, 401)
  }
  const { db, user } = auth
  const body = await c.req.json().catch(() => ({}))
  const code = String(body.code || "").trim()
  const secret = String(body.secret || "").trim()
  if (!secret) {
    return c.json(
      { code: 400, message: "Missing secret parameter", data: null },
      400,
    )
  }
  if (!/^[A-Z2-7]+$/i.test(secret)) {
    return c.json(
      { code: 400, message: "Invalid secret format", data: null },
      400,
    )
  }
  const valid = await verifyTotpCode(secret, code)
  if (!valid) {
    return c.json({ code: 400, message: "Invalid code", data: null }, 400)
  }
  user.otp_secret = secret.toUpperCase()
  await saveDb(db, c.env)
  return c.json({ code: 200, message: "success", data: null })
})

// Current user SSH Key sub-routes (/api/me/sshkey/*)
meRouter.get("/sshkey/list", async (c) => {
  const auth = await authUserFromReq(c)
  if (!auth) {
    return c.json({ code: 401, message: "Unauthorized", data: null }, 401)
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
    return c.json({ code: 401, message: "Unauthorized", data: null }, 401)
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
    return c.json({ code: 401, message: "Unauthorized", data: null }, 401)
  }
  const id = c.req.query("id")
  if (!id) {
    return c.json(
      { code: 400, message: "Missing id parameter", data: null },
      400,
    )
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
