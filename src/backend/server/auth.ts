import { Hono } from "hono"
import { sign, verify } from "hono/jwt"
import { JWT_SECRET } from "./middlewares"

export const authRouter = new Hono()

authRouter.post("/login/hash", async (c) => {
  let body: any = {}
  try {
    body = await c.req.json()
  } catch (err) {
    const text = await c.req.text().catch(() => "")
    console.error("[Auth] Failed to parse JSON body, raw text:", text, err)
    try {
      body = JSON.parse(text)
    } catch (e) {
      return c.json(
        { code: 400, message: "Invalid JSON body", data: null },
        400,
      )
    }
  }

  const expectedUsername = process.env.ADMIN_USERNAME || "admin"
  const expectedPasswordPlain = process.env.ADMIN_PASSWORD || "admin"

  if (!process.env.ADMIN_PASSWORD) {
    console.warn("[Auth] ADMIN_PASSWORD not set, defaulting to 'admin'")
  }

  // Use Web Crypto API (SubtleCrypto) — works natively in Cloudflare Workers and Node.js 18+
  const hash_salt = "https://github.com/alist-org/alist"
  const msgBuffer = new TextEncoder().encode(
    `${expectedPasswordPlain}-${hash_salt}`,
  )
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const expectedPassword = hashArray
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")

  if (
    body.username === expectedUsername &&
    body.password === expectedPassword
  ) {
    const payload = {
      username: expectedUsername,
      id: 1,
      role: 2,
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7, // 7 days
    }
    const token = await sign(payload, JWT_SECRET)
    return c.json({
      code: 200,
      message: "success",
      data: { token },
    })
  }
  return c.json({
    code: 401,
    message: "Invalid credentials",
    data: null,
  })
})

export const meHandler = async (c: any) => {
  const authHeader = c.req.header("Authorization")
  if (!authHeader) {
    console.warn("[Auth] /me request missing Authorization header")
    return c.json({
      code: 401,
      message: "Unauthorized: Missing Authorization header",
      data: null,
    })
  }
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.substring(7)
    : authHeader
  try {
    const payload = await verify(token, JWT_SECRET, "HS256")
    return c.json({
      code: 200,
      message: "success",
      data: {
        id: payload.id,
        username: payload.username,
        role: payload.role,
        permission: 0,
      },
    })
  } catch (e: any) {
    console.error("[Auth] Token verification failed:", e.message || e)
    return c.json({
      code: 401,
      message: `Unauthorized: ${e.message || "Invalid token"}`,
      data: null,
    })
  }
}

authRouter.get("/me", meHandler)
