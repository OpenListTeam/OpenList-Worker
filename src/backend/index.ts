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
