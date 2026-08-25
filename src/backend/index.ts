import { Hono } from "hono"
import { setupRouter } from "./server/router"
import { rawRouter } from "./server/raw"
import { setEnvCtx } from "./internal/model/db"
import { ensureJwtSecret } from "./pkg/utils"

const app = new Hono()

app.use("*", async (c, next) => {
  // 关键：每个请求注入 KV binding 上下文（CF Workers 多实例/冷启动时
  // 模块级 globalEnvCtx 为 null，会导致 getDb()/saveDb() 退回内存模式，
  // 网盘账号密码与 access_token 无法从 KV 持久化读取）
  setEnvCtx(c.env)
  await ensureJwtSecret(c.env)
  await next()
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

// SPA 兜底 HTML（由 EdgeOne 入口 api/_makers.ts 在构建期注入 dist/index.html；
// 其他平台入口不注入，保持原有 ASSETS / 404 行为）
let spaFallbackHtml: string | null = null

export function setSpaFallbackHtml(html: string) {
  spaFallbackHtml = html
}

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
  // EdgeOne 等 ASSETS 缺席的环境：直接返回构建期内联的 SPA 壳，
  // 避免前端路由（/add、/@manage/* 等）落到 404 文本导致整站不可达
  if (spaFallbackHtml && (c.req.method === "GET" || c.req.method === "HEAD")) {
    return c.body(spaFallbackHtml, 200, {
      "Content-Type": "text/html; charset=utf-8",
      // HTML 入口必须 no-cache，否则新版本部署后旧 HTML 仍引用旧 hash 的 JS/CSS
      "Cache-Control": "no-cache, must-revalidate",
    })
  }
  return c.text("404 Not Found", 404)
})

export default app
