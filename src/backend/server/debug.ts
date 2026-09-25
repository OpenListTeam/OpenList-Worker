import { Hono } from "hono"
import { getDb, getStoreStatus } from "../internal/model/db"
import { checkAdminAuth } from "../pkg/utils"
import { getSingleFlightStats } from "../pkg/singleflight"

export const debugRouter = new Hono()

debugRouter.get("/info", async (c) => {
  const isAdmin = await checkAdminAuth(c)
  const db = await getDb(c.env)

  const responseData: any = {
    runtime: "Cloudflare Workers / Edge",
    timestamp: new Date().toISOString(),
    // 后端驱动信息非敏感，未登录也返回，便于确认 D1/KV/MySQL 是否生效
    store: await getStoreStatus(c.env),
    // singleflight 去重统计：用于确认跨实例协调是否真的生效
    // （coalesced/shared 持续为 0 说明没有并发重复调用，或协调未生效）
    singleflight: getSingleFlightStats(),
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
