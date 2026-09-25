import { Hono } from "hono"
import { setupRouter } from "./server/router"
import { rawRouter } from "./server/raw"
import { assetsRouter, getIndexHtmlWithCdn, isCdnConfigured, cdnAssetRedirect } from "./server/assets"
import { webdavRouter } from "./server/webdav"
import { s3Router } from "./server/s3"
import { setEnvCtx } from "./internal/model/db"
import { getStoreConfigErrorDetail } from "./internal/model/store/backend"
import { storageErrorSummary, uiStorageError } from "./server/storage-error"

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

/**
 * KV 代理传输端点（EdgeOne Edge Function 侧由 functions/kv-* 提供）。
 *
 * 这些路径是「驱动探测/读写」的传输层，不是业务请求，本 Worker 也不提供它们
 * （只有 EdgeOne Edge Function / CF Pages Functions 才有）。必须两种情况都避开：
 *
 *   1. **不走存储配置拦截**：kv 驱动的可用性判定就是向 `{origin}/kv-list` 发一次
 *      探测，而拦截逻辑会解析驱动 —— 若这些请求落进拦截，就会「探测请求 → 解析
 *      驱动 → 再探测自身」无限自调用（本地 `wrangler dev` 表现为满屏
 *      `GET /kv-list 503`，且耗时随嵌套层数不断增长）。
 *   2. **不能落进 SPA 兜底**：兜底会返回 index.html（HTTP 200），探测会把
 *      「拿到 HTML」误判成「KV 可用」，之后读写全部拿到 HTML 而报错。
 *
 * 因此这里显式回 410：既明确说明本部署不提供该端点，也让探测得到干净的失败。
 */
const KV_PROXY_PATHS = ["/kv-list", "/kv-get", "/kv-put", "/kv-delete"]

function isKvProxyPath(pathname: string): boolean {
  return KV_PROXY_PATHS.includes(pathname)
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
    isDiagnosticPath(pathname) ||
    // KV 代理传输端点：解析驱动会再探测自身，必须绕开（见 isKvProxyPath）
    isKvProxyPath(pathname)
  if (!exempt) {
    // 用 Detail 版本：除完整原因外还带分类码与一句话修复建议，前端据此
    // 展示「哪里错了 + 该改成什么」。只给一段长文本时，用户（和日志读者）
    // 能看到的只是「驱动不可用」，不知道该把 DB_DRIVER 改成什么。
    const detail = await getStoreConfigErrorDetail(env)
    if (detail.message) {
      const ui = uiStorageError(detail)
      return c.json(
        {
          code: 503,
          // message 保持完整原因（兼容既有客户端与日志排查）
          message: detail.message,
          data: {
            error: "STORAGE_CONFIG_ERROR",
            code: detail.code,
            configError: detail.message,
            // 界面展示 summary（完整一句短原因）+ suggestion（怎么改）；
            // reason 是截断后的完整说明，留给工具与日志阅读。
            summary: storageErrorSummary(detail.message),
            reason: ui.reason,
            suggestion: ui.suggestion,
          },
        },
        503,
      )
    }
  }

  await next()
})

// 在 Serverless 环境中，所有逻辑都是无状态的且由请求触发。
// 这里不应该初始化任何常驻的后台任务 (如 Cron 或 线程池)。

// KV 代理传输端点：本部署不提供（只有 EdgeOne Edge Function / CF Pages
// Functions 的 functions/kv-* 提供）。显式回 410，避免这些请求落进 SPA 兜底
// 被当成「HTTP 200」而让 kv 驱动误判为可用（详见 isKvProxyPath 注释）。
for (const path of KV_PROXY_PATHS) {
  app.all(path, (c) =>
    c.json(
      {
        code: 410,
        message:
          `KV proxy endpoint "${path}" is not served by this deployment. ` +
          `It only exists on EdgeOne Edge Functions (functions/kv-*) or ` +
          `Cloudflare Pages Functions. See /api/public/env_check for the ` +
          `storage backend actually in use.`,
        data: null,
      },
      410,
    ),
  )
}

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
  const url = new URL(c.req.url)
  if (env && env.ASSETS && typeof env.ASSETS.fetch === "function") {
    const res = await env.ASSETS.fetch(c.req.raw)
    if (res.status >= 200 && res.status < 300) {
      // 修复「部署新版本后生产环境仍是旧界面」：index.html 若不设缓存头，
      // 会被 Cloudflare 边缘/浏览器长期缓存，导致旧 HTML 引用旧 hash 的 JS/CSS。
      // 只对 HTML 入口 no-cache（JS/CSS 带 hash 可安全长期缓存）。
      if (url.pathname === "/" || url.pathname === "/index.html") {
        const headers = new Headers(res.headers)
        headers.set("Cache-Control", "no-cache, must-revalidate")
        headers.set("Content-Type", "text/html; charset=utf-8")
        // 未配置 ASSET_URLS 时零开销直通：不改写 HTML，流式透传响应体
        if (!isCdnConfigured(env)) {
          return new Response(res.body, { status: res.status, headers })
        }
        // HTML 入口：注入 cdn 让浏览器直连 CDN 取静态资源。优先用本地 HTML
        // （CDN 上有同一套哈希时，npmmirror 这类不返回 .html 的 CDN 也能用），
        // 否则改用 CDN 自己的 index.html 保证哈希同源；都不可用则不注入。
        // body 会被读成字符串，必须清掉编码/长度头，否则浏览器按「已编码」解析明文。
        headers.delete("content-encoding")
        headers.delete("content-length")
        let html = await res.text()
        try {
          html = await getIndexHtmlWithCdn(env, html)
        } catch {
          // 注入失败不影响 HTML 正常返回
        }
        return new Response(html, { status: res.status, headers })
      }
      return res
    }
    // 静态层未命中：静态资源目录 302 到 CDN（对齐 Go 版 static.go 的 folders 重定向）。
    // 资源存在时静态层已直接返回、Worker 不会执行，所以走到这里说明源站确实没有
    // 这个文件 —— 若不重定向，下面的 SPA 兜底会把 index.html 当作 .js/.css 返回，
    // 浏览器按 text/html 解析后报错。
    const toCdn = await cdnAssetRedirect(env, url.pathname + url.search)
    if (toCdn) return c.redirect(toCdn, 302)
    // SPA fallback: return index.html for non-asset routes (e.g. /login, /manage)
    // 注意：ASSETS.fetch 对 /index.html 也可能返回 307，直接 fetch "/" 获取实际 HTML
    const rootReq = new Request(`${url.origin}/`, c.req.raw)
    const rootRes = await env.ASSETS.fetch(rootReq)
    const headers = new Headers(rootRes.headers)
    headers.set("Content-Type", "text/html; charset=utf-8")
    // HTML 入口必须 no-cache，否则新版本部署后旧 HTML 仍引用旧 hash 的 JS/CSS
    headers.set("Cache-Control", "no-cache, must-revalidate")
    // 只有「已配置 CDN + 2xx + GET/HEAD」才改写 HTML，其余情况一律
    // 「状态码 + headers + body 流」原样透传：
    //   - 未配置 ASSET_URLS：零开销直通，不把 body 读成字符串再重建响应
    //     （否则每次深链刷新都白付一次缓冲，并丢掉流式透传）；
    //   - 非 2xx（如 /index.html 的 307、兜底子请求的 404）：
    //     改写会把状态码抹平成一个 200 + HTML 空壳，掩盖真实错误；
    //   - 非 GET/HEAD：HTML 改写只对页面导航有意义。
    const rewritable =
      isCdnConfigured(env) &&
      rootRes.status >= 200 &&
      rootRes.status < 300 &&
      (c.req.method === "GET" || c.req.method === "HEAD")
    if (!rewritable) {
      return new Response(rootRes.body, { status: rootRes.status, headers })
    }
    // body 会被读成字符串，必须清掉编码/长度头，否则浏览器按「已编码」解析明文
    headers.delete("content-encoding")
    headers.delete("content-length")
    let html = await rootRes.text()
    try {
      html = await getIndexHtmlWithCdn(env, html)
    } catch {
      // 注入失败不影响 SPA 兜底
    }
    return new Response(html, { status: rootRes.status, headers })
  }
  // EdgeOne 等 ASSETS 缺席的环境：静态层未命中时同样先尝试 302 到 CDN，
  // 避免把 SPA 壳当作缺失的 .js/.css 返回
  const toCdnNoAssets = await cdnAssetRedirect(env, url.pathname + url.search)
  if (toCdnNoAssets) return c.redirect(toCdnNoAssets, 302)
  // EdgeOne 等 ASSETS 缺席的环境：直接返回构建期内联的 SPA 壳，
  // 避免前端路由（/add、/@manage/* 等）落到 404 文本导致整站不可达
  if (spaFallbackHtml && (c.req.method === "GET" || c.req.method === "HEAD")) {
    // 未配置 ASSET_URLS 时直接返回构建期内联的壳，省掉一次无意义的 async 调用；
    // 配置了则从 CDN 拉取并注入 —— 不修改模块级 spaFallbackHtml，避免并发污染。
    let html = spaFallbackHtml
    if (isCdnConfigured(env)) {
      try {
        html = await getIndexHtmlWithCdn(env, html)
      } catch {
        // 注入失败时返回原始 SPA 壳
      }
    }
    return c.body(html, 200, {
      "Content-Type": "text/html; charset=utf-8",
      // HTML 入口必须 no-cache，否则新版本部署后旧 HTML 仍引用旧 hash 的 JS/CSS
      "Cache-Control": "no-cache, must-revalidate",
    })
  }
  return c.text("404 Not Found", 404)
})

export default app
