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
  app.use("*", cors({
    origin: (origin) => origin,
    allowHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length", "Content-Type"],
    maxAge: 600,
    credentials: true,
  }))

  // Direct file delivery proxy route
  app.route("/api/raw", rawRouter)
  app.route("/d", rawRouter)
  app.route("/api/d", rawRouter)
  app.route("/sd", rawRouter)
  app.route("/api/sd", rawRouter)
  app.route("/p", rawRouter)
  app.route("/api/p", rawRouter)

  // API core sub-routing (registered both with and without /api prefix for serverless compatibility)
  app.route("/api/fs", fsRouter)
  app.route("/fs", fsRouter)
  app.route("/api/auth", authRouter)
  app.route("/auth", authRouter)
  app.route("/api/public", publicRouter)
  app.route("/public", publicRouter)
  app.route("/api/admin", adminRouter)
  app.route("/admin", adminRouter)

  // Service specific daemon APIs
  app.route("/api/s3", s3Router)
  app.route("/s3", s3Router)
  app.route("/api/mcp", mcpRouter)
  app.route("/mcp", mcpRouter)
  app.route("/api/debug", debugRouter)
  app.route("/debug", debugRouter)

  // Current user handler queried directly by the frontend
  app.get("/api/me", meHandler)
  app.get("/me", meHandler)

  // Simple service health check
  app.get("/api/health", (c) => c.text("OK"))
  app.get("/health", (c) => c.text("OK"))
}
