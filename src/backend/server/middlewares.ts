import { Context } from "hono"
import { verify } from "hono/jwt"
import { getDb } from "../internal/model/db"
import { checkAdminAuth, getJwtSecret } from "../pkg/utils"

// Re-export for backward compatibility
export { getJwtSecret } from "../pkg/utils"

export async function adminAuthMiddleware(
  c: Context,
  next: () => Promise<void>,
) {
  const isAdmin = await checkAdminAuth(c)
  if (!isAdmin) {
    return c.json(
      {
        code: 401,
        message: "未授权，需要管理员权限",
        data: null,
      },
      401,
    )
  }
  await next()
}

export interface AuthResult {
  ok: boolean
  status?: number
  message?: string
  payload?: any
  user?: any
  isGuest?: boolean
}

function extractToken(c: Context): string | null {
  const authHeader = c.req.header("Authorization")
  if (!authHeader) return null
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.substring(7)
    : authHeader
  return token.trim() === "" ? null : token
}

/**
 * Verify the JWT and resolve the backing user from DB.
 * Rejects tokens issued for users that have since been disabled,
 * so disabling an account takes effect immediately.
 */
export async function authenticate(c: Context): Promise<AuthResult> {
  const token = extractToken(c)
  if (!token) {
    return { ok: false }
  }
  try {
    const payload = await verify(token, getJwtSecret((c as any).env), "HS256")
    const db = await getDb((c as any).env)
    const user = (db.users || []).find(
      (u: any) =>
        u.id === payload.id ||
        (payload.username && u.username === payload.username),
    )
    if (!user) {
      return { ok: false, status: 401, message: "用户已不存在" }
    }
    if (user.disabled) {
      return { ok: false, status: 401, message: "用户已被禁用" }
    }
    return { ok: true, payload, user, isGuest: user.role === 1 }
  } catch {
    return { ok: false, status: 401, message: "无效的令牌" }
  }
}

async function findGuest(envCtx: any): Promise<any | null> {
  const db = await getDb(envCtx)
  const guest = (db.users || []).find((u: any) => u.username === "guest")
  if (!guest || guest.disabled) return null
  return guest
}

/**
 * Read access for file APIs (/fs/list /fs/get /fs/dirs, /raw /d /p).
 * - Valid token of an enabled user -> allowed.
 * - Share paths pass through; share password is enforced by resolveShare.
 * - Anonymous requests fall back to the guest user: only allowed while the
 *   guest account exists AND is enabled. Disabling guest blocks anonymous
 *   access immediately.
 */
export async function fsReadAuthMiddleware(
  c: Context,
  next: () => Promise<void>,
) {
  const env = (c as any).env

  // Share downloads via short path /sd/{shareId} — password enforced downstream
  const p = c.req.path
  if (p.startsWith("/sd/") || p.startsWith("/api/sd/")) {
    await next()
    return
  }

  // Shared file metadata via POST body path "/@s/{shareId}/..." on /fs APIs
  // (c.req.json() is cached by Hono, handlers can safely re-read it)
  if (p.includes("/fs/")) {
    const body = await c.req.json().catch(() => ({}))
    if (typeof body?.path === "string" && body.path.startsWith("/@s")) {
      await next()
      return
    }
  }

  const auth = await authenticate(c)
  if (auth.ok) {
    ;(c as any).set("jwtPayload", auth.payload)
    ;(c as any).set("authUser", auth.user)
    await next()
    return
  }

  // A token was provided explicitly but is invalid/expired -> reject even
  // if guest browsing would otherwise be allowed.
  if (extractToken(c)) {
    return c.json(
      { code: 401, message: auth.message || "未授权", data: null },
      401,
    )
  }

  const guest = await findGuest(env)
  if (guest) {
    ;(c as any).set("authUser", guest)
    ;(c as any).set("isGuestAccess", true)
    await next()
    return
  }

  return c.json(
    { code: 401, message: "匿名访问已禁用（访客已关闭）", data: null },
    401,
  )
}

/**
 * Write access (mkdir/rename/remove/move/copy/put/offline download/MCP).
 * Requires a valid token of an enabled non-guest user. Never falls back to
 * anonymous/guest access.
 */
export async function fsWriteAuthMiddleware(
  c: Context,
  next: () => Promise<void>,
) {
  const auth = await authenticate(c)
  if (!auth.ok) {
    return c.json(
      { code: 401, message: auth.message || "需要登录", data: null },
      401,
    )
  }
  if (auth.isGuest) {
    return c.json({ code: 403, message: "访客禁止访问", data: null }, 403)
  }
  ;(c as any).set("jwtPayload", auth.payload)
  ;(c as any).set("authUser", auth.user)
  await next()
}
