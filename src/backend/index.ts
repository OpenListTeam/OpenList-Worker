import { Hono } from "hono"
import { setupRouter } from "./server/router"
import { rawRouter } from "./server/raw"
import { assetsRouter } from "./server/assets"
import { webdavRouter } from "./server/webdav"
import { s3Router } from "./server/s3"
import { setEnvCtx } from "./internal/model/db"
import { getStoreConfigError } from "./internal/model/store/backend"

const app = new Hono()

/**
 * 静态资源 / SPA 壳路径：这些请求不应被存储配置错误拦截，
 * 否则前端连提示页面都加载不出来。
 */
function isStaticOrShell(pathname: string, accept: string, method: string): boolean {
  // 带扩展名的静态文件
  if (/\.[a-zA-Z0-9]+$/.test(pathname)) return true
  // 浏览器导航请求（HTML）由 SPA 壳承载
  if ((method === "GET" || method === "HEAD") && accept.includes("text/html")) {
    return true
  }
  return false
}

/**
 * 诊断类接口：必须豁免存储配置错误拦截。
 *
 * 这类接口存在的意义就是「报告哪里出了问题」。若在存储出错时把它们也
 * 一并 503 掉，调用方只会看到一个空洞的失败，拿不到任何可操作信息
 * （前端表现为「只显示存储不可用，其余字段全部空白」）。
 *
 * 注意：豁免的是「拦截」，不是「鉴权」。这些接口本身仍是免鉴权的公开
 * 诊断端点，且只返回脱敏后的状态，不泄露密钥或 DSN。
 */
const DIAGNOSTIC_PATHS = [
  // 环境自检：返回 config/storage/jwt/ready/issues 全量诊断
  "/api/public/env_check",
  // 初始化状态：存储不可用时必须能报告「未初始化」，否则前端无法
  // 判断该停留在初始化向导还是跳转登录页。
  "/api/public/init_status",
  // 真实就绪探针：存储故障时应由它自己给出结构化 503，
  // 而不是被中间件替换成通用错误。
  "/api/healthz",
]

function isDiagnosticPath(pathname: string): boolean {
  return DIAGNOSTIC_PATHS.includes(pathname)
}

app.use("*", async (c, next) => {
  // 关键：每个请求注入 KV binding 上下文（CF Workers 多实例/冷启动时
  // 模块级 globalEnvCtx 为 null，会导致 getDb()/saveDb() 退回内存模式，
  // 网盘账号密码与 access_token 无法从 KV 持久化读取）
  //
  // EdgeOne 场景：KV 只能由 Edge Function 访问，Node 云函数需经 HTTP 代理
  // 调用 /kv-* 。而 Node 的 fetch 不接受相对 URL，因此这里把当前请求的
  // origin 注入 env，供 kv 驱动拼出绝对地址（同一部署内自调用）。
  const env = (c.env || {}) as any
  try {
    const reqUrl = new URL(c.req.url)
    if (!env.__requestOrigin) {
      env.__requestOrigin = reqUrl.origin
    }
  } catch {
    // 忽略：无法解析时由驱动侧回退处理
  }

  setEnvCtx(env)

  // 存储配置错误全局拦截：任何依赖持久化的 API 都应立即得到明确错误，
  // 而不是静默退回内存模式（表现为「操作成功但数据丢失」）。
  // 静态资源与 SPA 壳放行，保证前端能加载并展示该错误。
  const { pathname } = new URL(c.req.url)
  const exempt =
    isStaticOrShell(pathname, c.req.header("accept") || "", c.req.method) ||
    isDiagnosticPath(pathname)
  if (!exempt) {
    const configError = await getStoreConfigError(env)
    if (configError) {
      return c.json(
        {
          code: 503,
          message: configError,
          data: { error: "STORAGE_CONFIG_ERROR", configError },
        },
        503,
      )
    }
  }

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

// 内嵌品牌资源（logo/favicon），必须在 SPA 兜底 app.all("*") 之前挂载
app.route("/", assetsRouter)

// WebDAV 协议服务（/dav/*），必须在 SPA 兜底之前挂载
app.route("/dav", webdavRouter)

// S3 网关（/s3/*），必须在 SPA 兜底之前挂载
app.route("/s3", s3Router)

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
    if (res.status >= 200 && res.status < 300) {
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
    // 注意：ASSETS.fetch 对 /index.html 也可能返回 307，直接 fetch "/" 获取实际 HTML
    const rootReq = new Request(`${url.origin}/`, c.req.raw)
    return env.ASSETS.fetch(rootReq)
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
