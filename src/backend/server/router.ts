import { Hono } from "hono"
import type { Context } from "hono"
import { cors } from "hono/cors"
import { getDb, getKvStatus } from "../internal/model/db"
import {
  isServerlessRuntime,
  NO_STORAGE_MESSAGE,
} from "../internal/model/store/backend"
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
import { ssoRouter } from "./sso"
import { webauthnRouter } from "./webauthn"
import { updatePwdHandler } from "./user"
import {
  mediaAdminRouter,
  mediaPublicRouter,
  mediaRouter,
  meAppkeyRouter,
} from "./media"

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

// JSON 请求体校验中间件 (添加日期: 2026-10-20；2026-11-09 按 issue #170 修订)
//
// 背景：EdgeOne Node 云函数运行时会把请求体在**平台层**提前消费掉，
// 表现为对 POST 请求 `c.req.text()` 时好时坏：有的直接抛异常，有的读到
// 空串（实测失败率 30%~45%，与传输编码无关，GET 不受影响，同代码在
// Cloudflare Workers 上 0 失败）。各 handler 的
// `c.req.json().catch(() => ({}))` 会把它静默吞掉，随后
// `body.path || "/"` 降级为根目录，导致"访问子目录返回根目录内容"
// （issue #112）。因此这里在 handler 之前预读校验。
//
// 三类结果的语义必须严格区分：
// - **读不到 body**（平台故障：bodyUsed / 读取抛异常 / Content-Length
//   与实际长度不符）→ **503 + Retry-After**。这是服务端暂时不可用，不是
//   客户端的请求写错了；而且此时 handler 尚未执行，客户端重试不会产生
//   重复副作用。此前一律回 400，既误导用户又让前端不重试，把 40% 的
//   丢包放大成 40% 的硬报错（issue #170 的直接症状）。
// - **读到了但为空 / 非法 JSON** → 400（真正的客户端问题）；
//   /api/fs/* 与 /api/share/* 空 body 仍是 400（对齐 Go 版必填 path）。
// - 其余 /api/* 空 body 放行（兼容无 body 调用）。
// 跳过：非 JSON content-type（multipart 上传等）、/api/task/*
// （EdgeOne Schedules 定时调度，payload 由平台注入）与非 /api 路径。
//
// Hono 会缓存已读取的 body 文本（bodyCache.text），此处预读后
// handler 里的 c.req.json() 复用缓存，不会二次消费请求流；反过来，
// 读取失败时缓存里留下的是 rejected Promise，所以**绝不能**放行到
// handler 去"再试一次"——只能返回 503 让客户端重发新请求。
const BODY_RETRY_MESSAGE = "request body unavailable, please retry"

/** 空 body 会被当成"根目录/空对象"执行业务的路径，需要严格校验。 */
function isStrictBodyPath(path: string): boolean {
  return (
    path === "/api/fs" ||
    path.startsWith("/api/fs/") ||
    path === "/api/share" ||
    path.startsWith("/api/share/")
  )
}

type BodyReadResult =
  | { ok: true; text: string }
  | { ok: false; reason: string; declared: number }

/**
 * 预读 JSON body，并把"读不到"（平台故障）与"读到了"彻底分开。
 * 只有读到确定的文本才交给后续的合法性校验，避免把平台故障误判成 400。
 */
async function readJsonBody(c: Context): Promise<BodyReadResult> {
  const declared = Number(c.req.header("content-length") ?? -1)

  // 平台/上游已经把流读掉了：再读只会抛 "Body is unusable"。
  if (c.req.raw.bodyUsed) {
    return { ok: false, reason: "body-used", declared }
  }

  let text: string
  try {
    text = await c.req.text()
  } catch (err) {
    const message = (err as Error)?.message ?? String(err)
    return { ok: false, reason: `read-failed:${message}`, declared }
  }

  // Content-Length 声明了字节数却读到更少 = 流被提前 EOF（截断）。
  // 有 content-encoding 时长度不可比（读到的可能是解压后文本），跳过该判定。
  // UTF-8 字节数恒 >= JS 字符串长度，故 declared <= text.length 时不可能被截断，
  // 免掉常见 ASCII 请求上的一次全量编码。
  const encoding = (
    c.req.header("content-encoding") || "identity"
  ).toLowerCase()
  if (declared > 0 && encoding === "identity" && declared > text.length) {
    const actual = text ? new TextEncoder().encode(text).byteLength : 0
    if (actual < declared) {
      return { ok: false, reason: `truncated:${actual}/${declared}`, declared }
    }
  }

  return { ok: true, text }
}

async function jsonBodyGuard(c: Context, next: () => Promise<void>) {
  const path = c.req.path
  const method = c.req.method.toUpperCase()
  const isMutable = !["GET", "HEAD", "OPTIONS"].includes(method)
  const isJson = (c.req.header("content-type") || "")
    .toLowerCase()
    .includes("application/json")

  if (!isMutable || !isJson || !path.startsWith("/api")) {
    return next()
  }

  // 显式跳过的路径：/api/task/*（EdgeOne Schedules 定时调度通道）。
  // 其 payload 由平台注入、鉴权走 matchCronSecret，语义独立于业务
  // 请求且历史上 body 可缺省；body 丢弃时也无需让调度通道可自愈，
  // 保持宽松。其余端点一律校验。
  if (path.startsWith("/api/task/")) {
    return next()
  }

  // 诊断快照必须在读取之前取：读过之后 bodyUsed 恒为 true，日志会失真。
  const hadBody = !!c.req.raw.body
  const wasUsedBeforeRead = c.req.raw.bodyUsed

  const body = await readJsonBody(c)
  if (!body.ok) {
    // 平台丢包/截断：留一条可上报腾讯云的结构化证据（body 是否存在、
    // 声明长度与实际长度是否一致、读取前是否已被消费），否则永远只能"推测"。
    console.warn(
      `[jsonBodyGuard] body unavailable (${body.reason}) ${method} ${path} ` +
        `declared=${body.declared} hasBody=${hadBody} bodyUsedBeforeRead=${wasUsedBeforeRead}`,
    )
    return c.json(
      { code: 503, message: BODY_RETRY_MESSAGE, data: null },
      503,
      // Retry-After 让网关/客户端知道这是暂时性故障；自定义头给前端
      // 一个明确的"可以安全重试"信号（handler 未执行，无副作用）。
      { "Retry-After": "1", "X-OpenList-Retry": "body" },
    )
  }

  const text = body.text
  if (text.trim() === "") {
    if (isStrictBodyPath(path)) {
      return c.json(
        { code: 400, message: "request body required", data: null },
        400,
      )
    }
    // 空 body 放行（保持向后兼容），但管理端空 body 属于可疑行为
    // （如 cache/clear 空 body 会清空全部缓存），显式记日志便于定位。
    if (path.startsWith("/api/admin")) {
      console.warn(
        `[jsonBodyGuard] empty JSON body passed to ${method} ${path}`,
      )
    }
    return next()
  }

  try {
    JSON.parse(text)
  } catch {
    return c.json(
      { code: 400, message: "invalid JSON request body", data: null },
      400,
    )
  }

  return next()
}

export function setupRouter(app: Hono) {
  // JSON 请求体校验：在所有业务中间件之前，尽早拒绝空/损坏 body
  app.use("*", jsonBodyGuard)

  // 限流：读取管理后台 ip_limit / traffic_limit 设置，尽力而为
  app.use("*", rateLimitMiddleware)

  // 审计日志：记录所有状态修改操作 (添加日期: 2026-09-05)
  app.use("*", async (c, next) => {
    const { auditMiddleware } = await import("./middlewares")
    return auditMiddleware(c, next)
  })

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
  // 1) 若配置了环境变量 ALLOW_URLS（逗号分隔），仅放行白名单来源；
  // 2) 否则仅放行同源请求（Origin 与请求 Host 一致，即浏览器直连本站）。
  //    跨域来源的浏览器请求将被拒绝，降低 CSRF/凭证滥用风险。
  app.use(
    "*",
    cors({
      origin: (origin, c) => {
        if (!origin) return origin
        const env = (c as any).env || {}
        const allowedOriginsRaw =
          env.ALLOW_URLS ||
          (typeof process !== "undefined" ? process.env?.ALLOW_URLS : "") ||
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
  // 媒体路由必须放在 /fs 与 /admin 之前，避免被通配路由抢先匹配
  app.route("/fs/media", mediaRouter)
  app.route("/admin/media", mediaAdminRouter)
  app.route("/public", mediaPublicRouter)
  // 普通用户自助签发媒体应用密钥（对齐 Go 的 /api/me/appkey/*）
  app.route("/auth/me/appkey", meAppkeyRouter)
  app.route("/fs", fsRouter)
  // Worker 不内置 ffmpeg，也不允许开启转码：
  // 返回 200 + supported:false 让前端平滑降级到直链（不弹错误），
  // 同时在响应里明确声明能力不存在，便于客户端区分「降级」与「失败」。
  app.post("/fs/transcode/play", async (c) =>
    c.json({
      code: 200,
      message: "success",
      data: {
        transcode: false,
        supported: false,
        reason:
          "Transcoding is not available in the Worker runtime (no ffmpeg)",
      },
    }),
  )
  app.route("/auth", authRouter)
  app.route("/public", publicRouter)
  app.route("/admin", adminRouter)
  app.route("/mcp", mcpRouter)
  app.route("/debug", debugRouter)
  app.route("/share", shareRouter)
  app.route("/task", taskRouter)
  app.route("/auth", ssoRouter)
  app.route("/authn", webauthnRouter)

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
      name: "OpenList",
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
    // Serverless / Worker runtimes must never fall back to memory: instances
    // are multi-tenant and short-lived, so writes silently vanish and users
    // see "saved successfully" for data that does not exist. Report that as
    // unhealthy so monitors and the UI both surface it.
    const serverless = isServerlessRuntime(c.env)
    if (!kv?.configured) {
      checks.persistence.mode = serverless ? "unavailable" : "memory"
      if (serverless) {
        checks.persistence.note = NO_STORAGE_MESSAGE
        healthy = false
      } else {
        checks.persistence.note =
          "No persistence configured — changes are ephemeral"
      }
    }
    // If KV is configured but failing, that's a real outage.
    if (kv?.configured && !kv?.connected) {
      healthy = false
    }

    return c.json(
      {
        ok: healthy,
        name: "OpenList",
        version: "v4.2.3",
        environment: (c.env as any)?.ENVIRONMENT || "development",
        checks,
      },
      healthy ? 200 : 503,
    )
  })
}
