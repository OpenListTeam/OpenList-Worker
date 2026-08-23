import { Hono } from "hono"
import { cors } from "hono/cors"
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

export function setupRouter(app: Hono) {
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
          (typeof process !== "undefined" ? process.env?.ALLOWED_ORIGINS : "") ||
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
}
