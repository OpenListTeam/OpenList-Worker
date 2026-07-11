import { Hono } from "hono"
import { cors } from "hono/cors"
import { fsRouter } from "./fs"
import { authRouter, meHandler } from "./auth"
import { adminRouter } from "./admin"
import { rawRouter } from "./raw"
import { publicRouter } from "./public"
import { s3Router } from "./s3"
import { mcpRouter } from "./mcp"
import { debugRouter } from "./debug"

export function setupRouter(app: Hono) {
  // CORS Middleware
  app.use("*", cors())

  // Direct file delivery proxy route
  app.route("/api/raw", rawRouter)
  app.route("/d", rawRouter)
  app.route("/api/d", rawRouter)
  app.route("/sd", rawRouter)
  app.route("/api/sd", rawRouter)
  app.route("/p", rawRouter)
  app.route("/api/p", rawRouter)

  // API core sub-routing
  app.route("/api/fs", fsRouter)
  app.route("/api/auth", authRouter)
  app.route("/api/public", publicRouter)
  app.route("/api/admin", adminRouter)

  // Service specific daemon APIs
  app.route("/api/s3", s3Router)
  app.route("/api/mcp", mcpRouter)
  app.route("/api/debug", debugRouter)

  // Current user handler queried directly by the frontend
  app.get("/api/me", meHandler)

  // Simple service health check
  app.get("/api/health", (c) => c.text("OK"))
}
