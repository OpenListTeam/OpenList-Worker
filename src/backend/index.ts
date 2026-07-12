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
// 允许直接挂载到根路径，以适配某些剥离了 /api 前缀的 Serverless 环境
app.route("/", api)

// 404 Fallback
app.all("*", (c) => {
  console.log(`[Backend 404] No route matched for: ${c.req.path}`)
  return c.json({ code: 404, message: `Not Found: ${c.req.path}` }, 404)
})

export default app

