import { Hono } from "hono"
import { cors } from "hono/cors"
import { getDb, getKvStatus } from "../internal/model/db"
import { fsRouter } from "./fs"
import {
  authRouter,
  meRouter,
  meHandler,
  meUpdateHandler,
  logoutHandler,
} from "./auth"
import { adminRouter } from "./admin"
import { rawRouter } from "./raw"
import { publicRouter } from "./public"
import { mcpRouter } from "./mcp"
import { debugRouter } from "./debug"
import { shareRouter } from "./share"
import { taskRouter } from "./task"
import { updatePwdHandler } from "./user"

// --- 尽力而为的进程内限流 ---
// 实现管理后台的 ip_limit（每 IP 每分钟请求数）与 traffic_limit（每 IP 每小时
// 响应流量 MB）。Cloudflare Workers 多实例下各隔离区独立计数（非全局精确），
// 但能显著限制单实例上的滥用/拉流/暴力请求；配合登录防爆破共同生效。
const ipReqCounts = new Map<string, { start: number; count: number }>()
const ipTraffic = new Map<string, { start: number; bytes: number }>()

function getClientIp(c: any): string {
  return (
    c.req.header("CF-Connecting-IP") ||
    c.req.header("x-real-ip") ||
    c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  )
}

function cleanupMaps() {
  const now = Date.now()
  if (ipReqCounts.size > 20000) {
    for (const [k, v] of ipReqCounts) {
      if (now - v.start > 60000) ipReqCounts.delete(k)
    }
  }
  if (ipTraffic.size > 20000) {
    for (const [k, v] of ipTraffic) {
      if (now - v.start > 3600000) ipTraffic.delete(k)
    }
  }
}

async function rateLimitMiddleware(c: any, next: () => Promise<void>) {
  const ip = getClientIp(c)
  const now = Date.now()
  let ipLimit = 0
  let trafficLimitMb = 0
  try {
    const db = await getDb(c.env)
    const settings: Record<string, string> = {}
    for (const s of db.settings || []) settings[s.key] = s.value
    ipLimit = parseInt(settings.ip_limit, 10) || 0
    trafficLimitMb = parseInt(settings.traffic_limit, 10) || 0
  } catch {}
  cleanupMaps()

  // 1) IP 请求速率限制（每分钟）
  if (ipLimit > 0) {
    const rec = ipReqCounts.get(ip)
    if (!rec || now - rec.start > 60000) {
      ipReqCounts.set(ip, { start: now, count: 1 })
    } else {
      rec.count += 1
      if (rec.count > ipLimit) {
        return c.json(
          { code: 429, message: "Too many requests, slow down", data: null },
          429,
        )
      }
    }
  }

  // 2) 流量限制（每小时，按响应 Content-Length 估算；超限后拒绝后续请求）
  if (trafficLimitMb > 0) {
    const tRec = ipTraffic.get(ip)
    const limitBytes = trafficLimitMb * 1024 * 1024
    if (tRec && now - tRec.start <= 3600000 && tRec.bytes >= limitBytes) {
      return c.json(
        { code: 429, message: "Traffic limit exceeded", data: null },
        429,
      )
    }
  }

  await next()

  // Query-token 泄露缓解：URL 携带 token/access_token 的响应禁用缓存并
  // 阻止 Referer 外泄（防止 token 经浏览器历史/Referer/代理缓存泄露）
  if (c.req.query("token") || c.req.query("access_token")) {
    c.res?.headers?.set("Referrer-Policy", "no-referrer")
    c.res?.headers?.set("Cache-Control", "no-store, no-cache, must-revalidate")
    c.res?.headers?.set("Pragma", "no-cache")
  }

  if (trafficLimitMb > 0) {
    const len = parseInt(c.res?.headers?.get("content-length") || "0", 10) || 0
    if (len > 0) {
      const tRec = ipTraffic.get(ip)
      if (!tRec || now - tRec.start > 3600000) {
        ipTraffic.set(ip, { start: now, bytes: len })
      } else {
        tRec.bytes += len
      }
    }
  }
}

export function setupRouter(app: Hono) {
  // 限流：读取管理后台 ip_limit / traffic_limit 设置，尽力而为
  app.use("*", rateLimitMiddleware)

  // 安全响应头：防止点击劫持 / MIME 嗅探 / XSS / 引用泄露
  app.use("*", async (c, next) => {
    await next()
    c.res.headers.set("X-Frame-Options", "DENY")
    c.res.headers.set("X-Content-Type-Options", "nosniff")
    c.res.headers.set(
      "Content-Security-Policy",
      "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; font-src 'self' data:; connect-src 'self'; media-src 'self' blob:; frame-ancestors 'none'",
    )
    c.res.headers.set(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains",
    )
    c.res.headers.set("Referrer-Policy", "no-referrer")
  })

  // CORS Middleware
  // 安全策略：不再回显任意 Origin。
  // 1) 若配置了环境变量 ALLOWED_ORIGINS（逗号分隔），仅放行白名单来源；
  // 2) 否则仅放行同源请求（Origin 与请求 Host 一致，即浏览器直连本站）。
  //    跨域来源的浏览器请求将被拒绝，降低 CSRF/凭证滥用风险。
  app.use(
    "*",
    cors({
      origin: (origin, c) => {
        if (!origin) return origin
        const env = (c as any).env || {}
        const allowedOriginsRaw =
          env.ALLOWED_ORIGINS ||
          (typeof process !== "undefined"
            ? process.env?.ALLOWED_ORIGINS
            : "") ||
          ""
        const allowedOrigins = allowedOriginsRaw
          .split(",")
          .map((s: string) => s.trim())
          .filter(Boolean)
        if (allowedOrigins.length > 0) {
          return allowedOrigins.includes(origin) ? origin : null
        }
        // 无白名单配置时：仅同源
        const host = c.req.header("host") || ""
        try {
          const u = new URL(origin)
          if (u.host === host) return origin
        } catch {}
        return null
      },
      allowHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
      allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      exposeHeaders: ["Content-Length", "Content-Type"],
      maxAge: 600,
      credentials: true,
    }),
  )

  // API core sub-routing (mounted at /api by the parent)
  app.route("/raw", rawRouter)
  app.route("/fs", fsRouter)
  app.route("/auth", authRouter)
  app.route("/public", publicRouter)
  app.route("/admin", adminRouter)
  app.route("/mcp", mcpRouter)
  app.route("/debug", debugRouter)
  app.route("/share", shareRouter)
  app.route("/task", taskRouter)

  // Direct short-paths for compatibility
  app.route("/d", rawRouter)
  app.route("/sd", rawRouter)
  app.route("/p", rawRouter)

  // Current user handler queried directly by the frontend
  app.route("/me", meRouter)
  app.get("/me", meHandler)
  app.post("/me/update", meUpdateHandler)
  app.post("/user/update_pwd", updatePwdHandler)
  app.get("/logout", logoutHandler)
  app.post("/logout", logoutHandler)

  // Simple service health check — includes version/brand so you can verify
  // the deployed Worker is running the latest build (dev vs prod consistency)
  app.get("/health", (c) =>
    c.json({
      ok: true,
      name: "OpenListNext",
      version: "v4.2.3",
      environment: (c.env as any)?.ENVIRONMENT || "development",
    }),
  )

  // Real readiness probe.
  //
  // /health above is a liveness marker only — it answers ok:true unconditionally
  // and proves nothing about whether this deployment can actually serve files.
  // It is kept unchanged because external monitors may already depend on it,
  // but it must never be treated as a health signal.
  //
  // /healthz exercises the state layer for real: it reads the config through
  // the same KV path a request would and answers 503 when a configured
  // persistence layer is failing. "No KV configured" is reported as healthy
  // with mode="memory" — this covers Vercel, Lambda, and Docker-in-memory
  // deployments where persistence is intentionally absent.
  app.get("/healthz", async (c) => {
    const checks: Record<string, any> = {}
    let healthy = true

    try {
      const db = await getDb(c.env)
      checks.config = {
        ok: true,
        storages: db?.storages?.length ?? 0,
        users: db?.users?.length ?? 0,
      }
    } catch (err: any) {
      healthy = false
      checks.config = { ok: false, error: err?.message || String(err) }
    }

    let kv: any
    try {
      kv = await getKvStatus(c.env)
    } catch (err: any) {
      healthy = false
      kv = {
        configured: false,
        connected: false,
        error: err?.message || String(err),
      }
    }

    checks.persistence = {
      configured: !!kv?.configured,
      connected: !!kv?.connected,
      platform: kv?.platform ?? null,
      error: kv?.error ?? null,
    }
    // If no KV is configured, this is a memory-only deployment (Vercel,
    // Lambda, Docker). Return 200 with a warning so monitors don't alarm,
    // but surface the mode clearly in the response body.
    if (!kv?.configured) {
      checks.persistence.mode = "memory"
      checks.persistence.note =
        "No persistence configured — changes are ephemeral"
    }
    // If KV is configured but failing, that's a real outage.
    if (kv?.configured && !kv?.connected) {
      healthy = false
    }

    return c.json(
      {
        ok: healthy,
        name: "OpenListNext",
        version: "v4.2.3",
        environment: (c.env as any)?.ENVIRONMENT || "development",
        checks,
      },
      healthy ? 200 : 503,
    )
  })
}
