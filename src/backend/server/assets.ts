import { Hono } from "hono"
import { getDb } from "../internal/model/db"

/**
 * 品牌资源路由。
 *
 * 背景：老前端（含 logo.svg / logo.png / favicon 静态文件）已移除，前端统一
 * 由官方 OpenList-Frontend 产物提供，但官方产物不包含 /logo.png、/favicon.png
 * 等站点图标；而 /api/public/settings 返回的 logo/favicon 字段，以及早期已
 * 初始化数据库里保存的旧值，仍可能指向 /logo.png、/favicon.png 这些本地路径，
 * 若直接 404 会导致图标裂开。这里统一 302 重定向到官方 CDN logo，兼容多路径，
 * 且始终跟随官方最新 logo（不再内嵌旧 SVG 内容）。
 */

const LOGO_URL = "https://res.oplist.org/logo/logo.svg"

export const assetsRouter = new Hono()

function redirectToLogo(c: any) {
  return c.redirect(LOGO_URL, 302)
}

// 兼容多种路径（settings 或已初始化 DB 可能返回 /logo.png 与 /favicon.png；
// 浏览器默认请求 /favicon.ico；官方前端 index.html 引用 .svg）。统一重定向。
assetsRouter.get("/logo.svg", redirectToLogo)
assetsRouter.get("/logo.png", redirectToLogo)
assetsRouter.get("/favicon.svg", redirectToLogo)
assetsRouter.get("/favicon.png", redirectToLogo)
assetsRouter.get("/favicon.ico", redirectToLogo)

/**
 * 前端静态资源 CDN 注入。
 *
 * 当配置了 ASSET_URLS 时，Worker 从 `${ASSET_URLS}/index.html` 拉取前端的
 * index.html（对齐 Go 版 server/static/static.go 的 initIndex() 行为），
 * 注入 window.OPENLIST_CONFIG.cdn 后下发；浏览器据此直连 CDN 加载
 * JS/CSS/图片等静态资源，无需经 Worker 中转。
 *
 * 为什么要「从 CDN 拉 HTML」而不是「下发本地 HTML + 注入 cdn」：
 * 前端产物是内容哈希文件名（/assets/index-XXXX.js），本地构建的 HTML 只与
 * 本地构建的资产匹配。若本地 HTML 引用的哈希在 CDN 上不存在（版本偏差、
 * $version 解析为 latest、或 CDN 版本与部署版本不一致），浏览器会遭到
 * 全量资产 404（白屏）。从 CDN 拉取 HTML 则 HTML 与资产天然同源一致。
 *
 * 降级策略：CDN 不可达 / 返回非 HTML 时，返回本地 HTML 且【不注入】cdn ——
 * 资源回退到源站加载，站点依然可用（宁可 CDN 不生效，不可白屏）。
 *
 * ⚠️ 对 ASSET_URLS 的两个硬性要求（浏览器侧直接加载，缺一即白屏）：
 *   1. 必须能返回 index.html：部分 npm 镜像会拦截 .html（npmmirror 的
 *      registry.npmmirror.com/.../files/ 对 .html 返回 451 {"error":"blocked"}，
 *      该端点只放行 js/css）。
 *   2. 必须带 Access-Control-Allow-Origin：前端产物以 crossorigin 加载
 *      module script / modulepreload / stylesheet / 字体，缺少 CORS 头会被
 *      浏览器整批拦下（npmmirror 的 registry 与 cdn 两个端点都不发该头）。
 *   实测可用：jsdelivr、unpkg。npmmirror 不可用。
 *
 * 示例：
 *   ASSET_URLS = https://cdn.jsdelivr.net/npm/@openlist-frontend/openlist-frontend@$version/dist
 *   ASSET_URLS = https://unpkg.com/@openlist-frontend/openlist-frontend@$version/dist
 */

/** CDN index.html 的模块级缓存：每个 isolate 每 TTL 最多一次外呼。
 *  TTL 兜底 @latest 这类会随时间漂移的地址（缓存过久的哈希会与新 latest 不匹配）。 */
const CDN_HTML_TTL_MS = 5 * 60_000
const cdnHtmlCache = new Map<string, { html: string; ts: number }>()

/**
 * 是否配置了前端资源 CDN。
 *
 * 供 HTML 入口做零开销直通判断：未配置 CDN 时无需读取/改写 HTML，
 * 直接把静态层的响应流式透传，避免每个页面导航都白付一次 body 缓冲与解析。
 */
export function isCdnConfigured(env: any): boolean {
  return Boolean(env?.ASSET_URLS || process.env?.ASSET_URLS)
}

/**
 * 从 index.html 中解析构建期戳的前端版本（fetch-frontend.mjs 注入的 meta 标签）。
 * 版本与 dist 同源产生，是 $version 最可靠的来源；无法解析时返回空串。
 */
export function parseFrontendVersion(html: string): string {
  const m = html.match(
    /<meta\s+name=["']frontend-version["']\s+content=["']([^"']+)["']/i,
  )
  return m ? m[1] : ""
}

/**
 * 解析 ASSET_URLS，替换 $version 占位符。
 *
 * $version 解析优先级：
 *   1. 待下发 HTML 的构建期版本戳（meta frontend-version）—— 与部署的 dist 精确对应
 *   2. DB version 设置中的 "Frontend: vX.Y.Z"（兼容手工设置）
 *   3. "latest"
 *
 * 无 $version 或未配置时零存储开销。
 */
export async function resolveCdnUrl(env: any, html?: string): Promise<string> {
  const raw = env?.ASSET_URLS || process.env?.ASSET_URLS || ""
  if (!raw) return ""
  if (!raw.includes("$version")) return raw
  let version = ""
  if (html) version = parseFrontendVersion(html)
  if (!version) {
    try {
      const db = await getDb(env)
      const item = (db.settings || []).find((s: any) => s.key === "version")
      if (item?.value) {
        // 兼容格式 "v4.2.3 (Commit: xxx) - Frontend: v1.0.0 - Build at: xxx"
        const m = String(item.value).match(/Frontend:\s*([^\s-]+)/)
        if (m) version = m[1]
      }
    } catch {
      // 存储不可用 / 未初始化
    }
  }
  if (!version) version = "latest"
  return raw.replace(/\$version/g, version)
}

/**
 * 把已解析的 CDN 地址注入 HTML 的 window.OPENLIST_CONFIG.cdn。
 * 前端 vite-plugin-dynamic-base 读取 window.__dynamic_base__（= cdn），
 * 据此前缀所有静态资源 URL，实现从 CDN 加载。
 */
export function injectCdnIntoHtml(html: string, cdn: string): string {
  if (!cdn) return html
  // 1) 用函数替换，避免 cdn URL 里的 $ 被 String.replace 当成特殊模式（$&、$1…）；
  // 2) 注入值是拼进内联脚本的 JS 字符串字面量，必须转义：URL 里若出现 ' 或 \（
  //    或换行）会提前闭合字符串，让 window.OPENLIST_CONFIG 语法报错、整站白屏。
  //    注意 Go 版（fmt.Sprintf("cdn: '%s'")）没有处理这一点，这里不与它的缺陷对齐。
  const value = cdn
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'")
    .replace(/\r/g, "\\r")
    .replace(/\n/g, "\\n")
  return html.replace(/cdn:\s*undefined/, () => `cdn: '${value}'`)
}

/**
 * 获取应下发的 index.html（CDN 优先，源站兜底）。
 *
 * 1. 未配置 ASSET_URLS → 本地 HTML 原样返回
 * 2. 已配置 → 从 `${cdn}/index.html` 拉取（带超时），校验为 HTML 后注入 cdn 返回
 * 3. 拉取失败 / 非 HTML → 本地 HTML 原样返回（不注入 cdn，资源回退源站）
 */
export async function getIndexHtmlWithCdn(
  env: any,
  localHtml: string,
): Promise<string> {
  const cdn = await resolveCdnUrl(env, localHtml)
  if (!cdn) return localHtml
  // 仅允许 http(s)，防止 ASSET_URLS 被配置成其它 scheme
  if (!/^https?:\/\//i.test(cdn)) return localHtml
  const hit = cdnHtmlCache.get(cdn)
  if (hit && Date.now() - hit.ts < CDN_HTML_TTL_MS) return hit.html
  try {
    const res = await fetch(`${cdn}/index.html`, {
      headers: { accept: "text/html" },
      signal: AbortSignal.timeout(4000),
    })
    if (res.ok) {
      let html = await res.text()
      // 校验确实是 HTML，而非 CDN 的 JSON 错误页
      if (/<html/i.test(html)) {
        html = injectCdnIntoHtml(html, cdn)
        cdnHtmlCache.set(cdn, { html, ts: Date.now() })
        return html
      }
    }
  } catch {
    // CDN 不可达 / 超时：回退源站
  }
  return localHtml
}
