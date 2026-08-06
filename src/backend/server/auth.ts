import { Hono } from "hono"
import { sign, verify } from "hono/jwt"
import { getDb, saveDb } from "../internal/model/db"
import { JWT_SECRET } from "./middlewares"

export const authRouter = new Hono()

// Helper to hash password matching OpenListNext/AList specification
export async function hashPassword(plainPassword: string): Promise<string> {
  const hash_salt = "https://github.com/alist-org/alist"
  const msgBuffer = new TextEncoder().encode(`${plainPassword}-${hash_salt}`)
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("")
}

// Ensure admin user exists in DB KV space with a default password if unset
async function getOrInitUsers(envCtx: any) {
  const db = await getDb(envCtx)
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

// POST /api/auth/login
authRouter.post("/login", async (c) => {
  const body = await c.req.json().catch(() => ({}))
  const username = (body.username || "").trim()
  const rawPassword = body.password || ""
  const hashedPassword = await hashPassword(rawPassword)

  const { users } = await getOrInitUsers(c.env)
  const defaultAdminHash = await hashPassword("admin")

  const matchedUser = users.find(
    (u: any) => u.username === username && !u.disabled,
  )

  if (matchedUser) {
    const userPass = matchedUser.password || ""
    const isPasswordValid =
      userPass === rawPassword ||
      userPass === hashedPassword ||
      (userPass === "" &&
        (rawPassword === "admin" || hashedPassword === defaultAdminHash)) ||
      (userPass === "admin" &&
        (rawPassword === "admin" || hashedPassword === defaultAdminHash))

    if (isPasswordValid) {
      const payload = {
        id: matchedUser.id,
        username: matchedUser.username,
        role: matchedUser.role,
        exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7,
      }
      const token = await sign(payload, JWT_SECRET)
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
  const defaultAdminHash = await hashPassword("admin")

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
      inputHash === userPass ||
      inputHash === userPassHash ||
      ((userPass === "" || userPass === "admin") &&
        inputHash === defaultAdminHash)

    if (isHashValid) {
      const payload = {
        id: matchedUser.id,
        username: matchedUser.username,
        role: matchedUser.role,
        exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7,
      }
      const token = await sign(payload, JWT_SECRET)
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
  const authHeader = c.req.header("Authorization")
  if (!authHeader) {
    return c.json({ code: 401, message: "Unauthorized", data: null }, 401)
  }
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.substring(7)
    : authHeader
  try {
    const payload = await verify(token, JWT_SECRET, "HS256")
    const body = await c.req.json().catch(() => ({}))
    const db = await getDb(c.env)
    if (!db.users) db.users = []

    const userIdx = db.users.findIndex(
      (u: any) => u.id === payload.id || u.username === payload.username,
    )
    if (userIdx === -1) {
      return c.json({ code: 404, message: "User not found", data: null }, 404)
    }

    const user = db.users[userIdx]
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

    db.users[userIdx] = user
    await saveDb(db, c.env)

    return c.json({ code: 200, message: "success", data: null })
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

// GET /api/me
export const meHandler = async (c: any) => {
  const authHeader = c.req.header("Authorization")
  if (!authHeader) {
    return c.json(
      {
        code: 401,
        message: "Unauthorized: Missing Authorization header",
        data: null,
      },
      401,
    )
  }
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.substring(7)
    : authHeader
  try {
    const payload = await verify(token, JWT_SECRET, "HS256")
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
