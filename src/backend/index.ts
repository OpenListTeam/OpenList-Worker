import { Hono } from "hono"
import { setupRouter } from "./server/router"
import { rawRouter } from "./server/raw"

const app = new Hono()

app.use("*", async (c, next) => {
  const start = Date.now()
  console.log(`[Backend] ${c.req.method} ${c.req.path}`)
  await next()
  console.log(`[Backend] ${c.res.status} (${Date.now() - start}ms)`)
})

// 在 Serverless 环境中，所有逻辑都是无状态的且由请求触发。
// 这里不应该初始化任何常驻的后台任务 (如 Cron 或 线程池)。

// 挂载 API 到 /api
const api = new Hono()
setupRouter(api)
app.route("/api", api)

// Mount specific short paths at root for better compatibility
app.route("/d", rawRouter)
app.route("/sd", rawRouter)
app.route("/p", rawRouter)

export default app
