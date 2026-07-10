import { Context } from "hono"
import { verify } from "hono/jwt"
import { checkAdminAuth } from "../pkg/utils"

export const JWT_SECRET = "super-secret-openlist-key"

export async function adminAuthMiddleware(c: Context, next: () => Promise<void>) {
  const isAdmin = await checkAdminAuth(c)
  if (!isAdmin) {
    return c.json({ code: 401, message: "Unauthorized admin privilege required", data: null }, 401)
  }
  await next()
}
