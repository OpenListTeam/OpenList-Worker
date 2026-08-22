import { Context } from "hono"
import { verify } from "hono/jwt"
import { checkAdminAuth } from "../pkg/utils"
import { getDb } from "../internal/model/db"

export const JWT_SECRET = "super-secret-openlistnext-key"

export async function adminAuthMiddleware(
  c: Context,
  next: () => Promise<void>,
) {
  const isAdmin = await checkAdminAuth(c)
  if (!isAdmin) {
    return c.json(
      {
        code: 401,
        message: "Unauthorized admin privilege required",
        data: null,
      },
      401,
    )
  }
  await next()
}

/**
 * 从请求上下文解析当前用户（用于 /fs 写操作权限校验）：
 * - 静态 API Token（与 adminAuthMiddleware 同源）→ 视为管理员
 * - JWT（登录颁发）→ 查 DB 用户，取 role/permission
 * - 无凭证 / token 无效 / 用户被禁用 → null（即游客）
 * 权限判定统一走 pkg/permission.ts 的 canWrite()：
 * 管理员放行，普通用户按 WRITE_CONTENT 位，游客一律拒绝。
 */
export async function getUserFromContext(c: Context): Promise<{
  id?: number
  role: number
  permission: number
  disabled?: boolean
  username?: string
  base_path?: string
} | null> {
  // 静态 API token：与 /admin 同等信任
  if (await checkAdminAuth(c)) {
    return {
      role: 2,
      permission: 0,
      disabled: false,
      username: "api-token",
      base_path: "/",
    }
  }
  const authHeader = c.req.header("Authorization")
  if (!authHeader) {
    try {
      const db = await getDb(c.env)
      const guest = (db.users || []).find((u: any) => u.username === "guest")
      if (guest && !guest.disabled) {
        return {
          id: guest.id,
          role: guest.role ?? 1,
          permission: guest.permission ?? 0,
          disabled: !!guest.disabled,
          username: guest.username,
          base_path: guest.base_path || "/",
        }
      }
    } catch {}
    return {
      id: 2,
      role: 1,
      permission: 0,
      disabled: false,
      username: "guest",
      base_path: "/",
    }
  }
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.substring(7)
    : authHeader
  try {
    const payload: any = await verify(token, JWT_SECRET, "HS256")
    const db = await getDb(c.env)
    const user = (db.users || []).find(
      (u: any) => u.id === payload.id || u.username === payload.username,
    )
    if (!user || user.disabled) return null
    return {
      id: user.id,
      role: user.role,
      permission: user.permission ?? 0,
      disabled: !!user.disabled,
      username: user.username,
      base_path: user.base_path || "/",
    }
  } catch {
    return null
  }
}
