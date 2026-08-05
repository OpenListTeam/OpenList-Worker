import { Hono } from "hono"
import { cors } from "hono/cors"
import { fsRouter } from "./fs"
import { authRouter, meHandler, meUpdateHandler, logoutHandler } from "./auth"
import { adminRouter } from "./admin"
import { rawRouter } from "./raw"
import { publicRouter } from "./public"
import { s3Router } from "./s3"
import { mcpRouter } from "./mcp"
import { debugRouter } from "./debug"
import { updatePwdHandler } from "./user"

export function setupRouter(app: Hono) {
  // CORS Middleware
  app.use(
    "*",
    cors({
      origin: (origin) => origin,
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
  app.route("/s3", s3Router)
  app.route("/mcp", mcpRouter)
  app.route("/debug", debugRouter)

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
  app.get("/health", (c) => c.text("OK"))
}
