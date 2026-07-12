import { Hono } from "hono"
import { fsRouter } from "./fs"
import { authRouter, meHandler } from "./auth"
import { adminRouter } from "./admin"
import { rawRouter } from "./raw"
import { publicRouter } from "./public"
import { s3Router } from "./s3"
import { mcpRouter } from "./mcp"
import { debugRouter } from "./debug"

export function setupRouter(app: Hono) {
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

  // Simple service health check
  app.get("/health", (c) => c.text("OK"))
}
