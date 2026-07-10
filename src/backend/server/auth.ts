import { Hono } from "hono"
import { sign, verify } from "hono/jwt"
import { JWT_SECRET } from "./middlewares"

export const authRouter = new Hono()

authRouter.post("/login/hash", async (c) => {
  const body = await c.req.json().catch(() => ({}))
  
  const expectedUsername = process.env.ADMIN_USERNAME || "admin"
  const expectedPasswordPlain = process.env.ADMIN_PASSWORD || "admin"
  
  const crypto = await import("crypto");
  const hash_salt = "https://github.com/alist-org/alist";
  const expectedPassword = crypto.createHash("sha256").update(`${expectedPasswordPlain}-${hash_salt}`).digest("hex");

  if (body.username === expectedUsername && body.password === expectedPassword) {
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
    return c.json({ code: 401, message: "Unauthorized", data: null })
  }
  const token = authHeader.startsWith("Bearer ") ? authHeader.substring(7) : authHeader
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
  } catch (e) {
    return c.json({ code: 401, message: "Unauthorized", data: null })
  }
}

authRouter.get("/me", meHandler)
