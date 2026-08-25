import { Hono } from "hono"
import { getDb } from "../internal/model/db"
import { adminAuthMiddleware } from "./middlewares"

export const debugRouter = new Hono()

// Admin-only debug info
debugRouter.get("/info", adminAuthMiddleware, async (c) => {
  const db = await getDb(c.env)
  return c.json({
    code: 200,
    message: "success",
    data: {
      runtime: "Cloudflare Workers / Edge",
      timestamp: new Date().toISOString(),
      db_state: {
        storages_count: db.storages?.length || 0,
        users_count: db.users?.length || 0,
        metas_count: db.metas?.length || 0,
        settings_count: db.settings?.length || 0,
      },
    },
  })
})
