import { Hono } from "hono"
import { sign, verify } from "hono/jwt"
import { getDb } from "../internal/model/db"
import { JWT_SECRET } from "./middlewares"

export const authRouter = new Hono()

// Helper to hash password matching OpenList/AList specification
export async function hashPassword(plainPassword: string): Promise<string> {
  const hash_salt = "https://github.com/alist-org/alist"
  const msgBuffer = new TextEncoder().encode(`${plainPassword}-${hash_salt}`)
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("")
}

// POST /api/auth/login
authRouter.post("/login", async (c) => {
  const body = await c.req.json().catch(() => ({}))
  const username = body.username || ""
  const rawPassword = body.password || ""
  const hashedPassword = await hashPassword(rawPassword)

  const db = await getDb(c.env)
  const users = db.users || []
  let matchedUser = users.find(
    (u: any) => u.username === username && !u.disabled,
  )

  const adminUsername = process.env.ADMIN_USERNAME || "admin"
  const adminPasswordPlain = process.env.ADMIN_PASSWORD || "admin"
  const adminPasswordHashed = await hashPassword(adminPasswordPlain)

  let isAuthenticated = false
  if (matchedUser) {
    if (
      matchedUser.password === rawPassword ||
      matchedUser.password === hashedPassword ||
      (matchedUser.username === adminUsername &&
        (rawPassword === adminPasswordPlain ||
          hashedPassword === adminPasswordHashed))
    ) {
      isAuthenticated = true
    }
  } else if (
    username === adminUsername &&
    (rawPassword === adminPasswordPlain ||
      hashedPassword === adminPasswordHashed)
  ) {
    matchedUser = {
      id: 1,
      username: adminUsername,
      role: 2,
      permission: 0,
      base_path: "/",
      disabled: false,
    }
    isAuthenticated = true
  }

  if (isAuthenticated && matchedUser) {
    const payload = {
      id: matchedUser.id,
      username: matchedUser.username,
      role: matchedUser.role,
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7, // 7 days
    }
    const token = await sign(payload, JWT_SECRET)
    return c.json({
      code: 200,
      message: "success",
      data: { token },
    })
  }

  return c.json({ code: 401, message: "Invalid credentials", data: null }, 401)
})

// POST /api/auth/login/hash
authRouter.post("/login/hash", async (c) => {
  const body = await c.req.json().catch(() => ({}))
  const username = body.username || ""
  const inputHash = body.password || ""

  const db = await getDb(c.env)
  const users = db.users || []
  let matchedUser = users.find(
    (u: any) => u.username === username && !u.disabled,
  )

  const adminUsername = process.env.ADMIN_USERNAME || "admin"
  const adminPasswordPlain = process.env.ADMIN_PASSWORD || "admin"
  const adminPasswordHashed = await hashPassword(adminPasswordPlain)

  let isAuthenticated = false
  if (matchedUser) {
    const dbUserHashed =
      matchedUser.password && matchedUser.password.length === 64
        ? matchedUser.password
        : await hashPassword(matchedUser.password || "")
    if (
      inputHash === dbUserHashed ||
      inputHash === matchedUser.password ||
      (matchedUser.username === adminUsername &&
        inputHash === adminPasswordHashed)
    ) {
      isAuthenticated = true
    }
  } else if (username === adminUsername && inputHash === adminPasswordHashed) {
    matchedUser = {
      id: 1,
      username: adminUsername,
      role: 2,
      permission: 0,
      base_path: "/",
      disabled: false,
    }
    isAuthenticated = true
  }

  if (isAuthenticated && matchedUser) {
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

  return c.json({ code: 401, message: "Invalid credentials", data: null }, 401)
})

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
    const db = await getDb(c.env)
    const users = db.users || []
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
