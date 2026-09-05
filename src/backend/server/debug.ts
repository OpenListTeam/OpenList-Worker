import { Hono } from "hono"
import { getDb, getStoreStatus } from "../internal/model/db"
import { checkAdminAuth } from "../pkg/utils"

export const debugRouter = new Hono()

debugRouter.get("/info", async (c) => {
  const isAdmin = await checkAdminAuth(c)
  const db = await getDb(c.env)

  const responseData: any = {
    runtime: "Cloudflare Workers / Edge",
    timestamp: new Date().toISOString(),
    // 后端驱动信息非敏感，未登录也返回，便于确认 D1/KV/MySQL 是否生效
    store: await getStoreStatus(c.env),
    // 探针：暴露运行时 c.env 里的原始绑定，定位「配置已写但未注入」类问题
    env_probe: {
      DB_DRIVER: (c.env as any)?.DB_DRIVER ?? null,
      has_DB: !!(c.env as any)?.DB,
      has_OPENLIST_KV: !!(c.env as any)?.OPENLIST_KV,
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
