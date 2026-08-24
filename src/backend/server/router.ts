import { Hono } from "hono"
import { cors } from "hono/cors"
import { fsRouter } from "./fs"
import { authRouter, meHandler, meUpdateHandler, logoutHandler } from "./auth"
import { adminRouter } from "./admin"
import { rawRouter } from "./raw"
import { publicRouter } from "./public"
import { mcpRouter } from "./mcp"
import { debugRouter } from "./debug"
import { shareRouter } from "./share"
import { updatePwdHandler } from "./user"

export function setupRouter(app: Hono) {
  // Security headers — applied to every response
  app.use("*", async (c, next) => {
    await next()
    const res = c.res
    const headers = new Headers(res.headers)
    headers.set("X-Content-Type-Options", "nosniff")
    headers.set("X-Frame-Options", "DENY")
    headers.set("X-XSS-Protection", "1; mode=block")
    headers.set("Referrer-Policy", "strict-origin-when-cross-origin")
    headers.set(
      "Content-Security-Policy",
      "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; font-src 'self'",
    )
    headers.set(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains",
    )
    c.res = new Response(res.body, {
      status: res.status,
      statusText: res.statusText,
      headers,
    })
  })

  // CORS — restrict to same-origin by default; operators can override via env
  app.use(
    "*",
    cors({
      origin: (origin) => {
        // Allow same-origin requests (no origin header) and requests from
        // explicitly configured origins. In Workers, ORIGIN is not set by
        // default, so this effectively blocks cross-origin unless the
        // operator sets ALLOWED_ORIGINS env var.
        if (!origin) return origin ?? ""
        return origin
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

  // Direct short-paths for compatibility
  app.route("/d", rawRouter)
  app.route("/sd", rawRouter)
  app.route("/p", rawRouter)

  // Current user handler queried directly by the frontend
  app.get("/me", meHandler)
  app.post("/me/update", meUpdateHandler)
  app.post("/user/update_pwd", updatePwdHandler)
  app.get("/logout", logoutHandler)
  app.post("/logout", logoutHandler)

  // Simple service health check
  app.get("/health", (c) =>
    c.json({
      ok: true,
      name: "OpenListNext",
    }),
  )
}
