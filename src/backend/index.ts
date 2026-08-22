import { Hono } from "hono"
import { setupRouter } from "./server/router"
import { rawRouter } from "./server/raw"
import { setEnvCtx } from "./internal/model/db"

const app = new Hono()

app.use("*", async (c, next) => {
  const start = Date.now()
  // 关键：每个请求注入 KV binding 上下文（CF Workers 多实例/冷启动时
  // 模块级 globalEnvCtx 为 null，会导致 getDb()/saveDb() 退回内存模式，
  // 网盘账号密码与 access_token 无法从 KV 持久化读取）
  setEnvCtx(c.env)
  console.log(`[Backend] ${c.req.method} ${c.req.path}`)
  await next()
  console.log(`[Backend] ${c.res.status} (${Date.now() - start}ms)`)
})

// 在 Serverless 环境中，所有逻辑都是无状态的且由请求触发。
// 这里不应该初始化任何常驻的后台任务 (如 Cron 或 线程池)。

// 挂载 API 到 /api 以及根路径（适配不同网关是否剥离 /api 前缀）
const api = new Hono()
setupRouter(api)
app.route("/api", api)
app.route("/", api)

// Mount specific short paths at root for better compatibility
app.route("/d", rawRouter)
app.route("/sd", rawRouter)
app.route("/p", rawRouter)

// 全局异常捕获，避免抛出未捕获错误导致 500 HTML 报错
app.onError((err, c) => {
  console.error(`[Backend Error] ${c.req.method} ${c.req.path}:`, err)
  return c.json(
    {
      code: 500,
      message: err?.message || String(err),
      data: null,
    },
    500,
  )
})

// Catch-all handler for static assets & SPA frontend serving via Cloudflare Assets
app.all("*", async (c) => {
  const env = c.env as any
  if (env && env.ASSETS && typeof env.ASSETS.fetch === "function") {
    const url = new URL(c.req.url)
    const res = await env.ASSETS.fetch(c.req.raw)
    if (res.status !== 404) {
      // 修复「部署新版本后生产环境仍是旧界面」：index.html 若不设缓存头，
      // 会被 Cloudflare 边缘/浏览器长期缓存，导致旧 HTML 引用旧 hash 的 JS/CSS。
      // 只对 HTML 入口 no-cache（JS/CSS 带 hash 可安全长期缓存）。
      if (url.pathname === "/" || url.pathname === "/index.html") {
        const headers = new Headers(res.headers)
        headers.set("Cache-Control", "no-cache, must-revalidate")
        return new Response(res.body, { status: res.status, headers })
      }
      return res
    }
    // SPA fallback: return index.html for non-asset routes (e.g. /login, /manage)
    const indexReq = new Request(`${url.origin}/index.html`, c.req.raw)
    return env.ASSETS.fetch(indexReq)
  }
  return c.text("404 Not Found", 404)
})

export default app
