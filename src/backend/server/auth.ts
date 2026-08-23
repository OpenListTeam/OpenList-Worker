import { Hono } from "hono"
import { sign, verify } from "hono/jwt"
import { getDb, saveDb } from "../internal/model/db"
import { getJwtSecret } from "./middlewares"
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

// Helper to hash password matching OpenListNext/AList specification
export async function hashPassword(plainPassword: string): Promise<string> {
  const hash_salt = "https://github.com/alist-org/alist"
  const msgBuffer = new TextEncoder().encode(`${plainPassword}-${hash_salt}`)
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("")
}

// Ensure admin user exists in DB KV space with a default password if unset
export async function getOrInitUsers(envCtx: any) {
  const db = await getDb(envCtx)
  if (!db.users || db.users.length === 0) {
    // 默认管理员密码：优先环境变量 ADMIN_PASSWORD（推荐 `wrangler secret put`），
    // 未配置时使用默认 admin（AList 兼容），首次登录后应立即修改。
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
  const hashedPassword = await hashPassword(rawPassword)

  const { users } = await getOrInitUsers(c.env)

  const matchedUser = users.find(
    (u: any) => u.username === username && !u.disabled,
  )

  if (matchedUser) {
    const userPass = matchedUser.password || ""
    const isPasswordValid =
      // 兼容 AList 明文存储的密码（直接相等）
      (userPass !== "" && userPass === rawPassword) ||
      // 标准流程：sha256(明文 + salt) 哈希比对
      userPass === hashedPassword

    if (isPasswordValid) {
      const otpCheck = await checkUserOtp(matchedUser, body)
      if (!otpCheck.ok) {
        return c.json(
          { code: otpCheck.code, message: otpCheck.message, data: null },
          otpCheck.httpStatus,
        )
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

  return c.json({ code: 401, message: "Invalid credentials", data: null }, 401)
})

// POST /api/auth/login/hash
authRouter.post("/login/hash", async (c) => {
  const body = await c.req.json().catch(() => ({}))
  const username = (body.username || "").trim()
  const inputHash = body.password || ""

  const { users } = await getOrInitUsers(c.env)

  const matchedUser = users.find(
    (u: any) => u.username === username && !u.disabled,
  )

  if (matchedUser) {
    const userPass = matchedUser.password || ""
    const userPassHash =
      userPass.length === 64
        ? userPass
        : await hashPassword(userPass || "admin")

    const isHashValid =
      inputHash === userPass || inputHash === userPassHash

    if (isHashValid) {
      const otpCheck = await checkUserOtp(matchedUser, body)
      if (!otpCheck.ok) {
        return c.json(
          { code: otpCheck.code, message: otpCheck.message, data: null },
          otpCheck.httpStatus,
        )
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
  const authHeader = c.req.header("Authorization")
  if (!authHeader) {
    // 游客模式：未携带令牌时直接返回游客身份，允许免登录（无账号密码）浏览。
    const { users } = await getOrInitUsers(c.env)
    const guest = users.find((u: any) => u.username === "guest")
    if (guest) {
      return c.json({
        code: 200,
        message: "success",
        data: {
          id: guest.id,
          username: guest.username,
          role: guest.role,
          permission: guest.permission ?? 0,
          base_path: guest.base_path || "/",
          disabled: !!guest.disabled,
          sso_id: guest.sso_id || "",
          allow_ldap: !!guest.allow_ldap,
          otp: false,
        },
      })
    }
    return c.json({
      code: 200,
      message: "success",
      data: {
        id: 2,
        username: "guest",
        role: 1,
        permission: 0,
        base_path: "/",
        disabled: false,
        sso_id: "",
        allow_ldap: false,
        otp: false,
      },
    })
  }
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.substring(7)
    : authHeader
  try {
    const secret = await getJwtSecret(c)
    const payload = await verify(token, secret, "HS256")
    const { users } = await getOrInitUsers(c.env)
    const dbUser = users.find(
      (u: any) => u.id === payload.id || u.username === payload.username,
    )

    if (dbUser) {
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
          otp: !!dbUser.otp_secret,
        },
      })
    }

    return c.json({
      code: 200,
      message: "success",
      data: {
        id: payload.id,
        username: payload.username,
        role: payload.role,
        permission: 0,
        base_path: "/",
        disabled: false,
        sso_id: "",
        allow_ldap: false,
        otp: false,
      },
    })
  } catch (e: any) {
    return c.json(
      {
        code: 401,
        message: `Unauthorized: ${e.message || "Invalid token"}`,
        data: null,
      },
      401,
    )
  }
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
