import { Hono } from "hono"
import { getDb } from "../internal/model/db"
import { checkAdminAuth } from "../pkg/utils"

export const debugRouter = new Hono()

debugRouter.get("/info", async (c) => {
  const isAdmin = await checkAdminAuth(c)
  const db = await getDb(c.env)

  const uptime = process.uptime()
  const memoryUsage = process.memoryUsage()

  const responseData: any = {
    uptime_seconds: Math.floor(uptime),
    node_version: process.version,
    platform: process.platform,
    arch: process.arch,
    memory: {
      rss: Math.round(memoryUsage.rss / 1024 / 1024) + " MB",
      heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024) + " MB",
      heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024) + " MB",
    },
  }

  if (isAdmin) {
    responseData.db_state = {
      storages_count: db.storages?.length || 0,
      users_count: db.users?.length || 0,
      metas_count: db.metas?.length || 0,
      settings_count: db.settings?.length || 0,
    }
  }

  return c.json({
    code: 200,
    message: "OpenList debug profile generated",
    data: responseData,
  })
})
