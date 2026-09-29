import { Hono } from "hono"
import { getDb } from "../internal/model/db"

/**
 * 品牌资源 + CDN 静态资源路由。
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
 * 当配置了 ASSET_URLS 时，把 CDN 地址注入 index.html 的
 * window.OPENLIST_CONFIG.cdn；前端 vite-plugin-dynamic-base 读取
 * window.__dynamic_base__（= cdn）后，浏览器直连 CDN 加载 JS/CSS/图片等资源，
 * 不再经 Worker 中转（对齐 Go 版 server/static/static.go）。
 *
 * 两条路径，按优先级排列：
 *
 *  A. 本地 index.html + CDN 资产（首选，等价 Go Release 版行为）
 *     仅当 CDN 上确实存在本地 HTML 引用的哈希资产时才采用。这条路径【不要求
 *     CDN 能返回 HTML】—— npmmirror 等禁止访问 .html 的 CDN 只能走这条。
 *     官方文档明确：Release 版用内置 index.html，
 *     "Some NPM CDNs (like npmmirror) may prohibit access to HTML files,"
 *     "but Release versions dont depend on CDNs index.html, so they are unaffected"。
 *
 *  B. CDN 的 index.html（本地构建与 CDN 版本不一致时的兜底）
 *     前端产物是内容哈希文件名（/assets/index-XXXX.js），本地构建的 HTML 只与
 *     本地构建的资产匹配。若本地 HTML 引用的哈希在 CDN 上不存在（$version 落到
 *     latest、或 dist 由 main 分支构建而版本戳仍是已发布版本号），直接用本地
 *     HTML 会让浏览器全量资产 404（白屏）。此时改用 CDN 自己的 index.html，
 *     HTML 与资产天然同源一致。
 *
 * 降级：两条路径都不可用时返回本地 HTML 且【不注入】cdn —— 资源回退源站加载，
 * 站点依然可用（宁可 CDN 不生效，不可白屏）。
 *
 * 另有静态资源缺失兜底：源站没有 /assets|images|streamer|static/ 下的文件时
 * 302 到 CDN（对齐 Go 版 static.go 的 folders 重定向），而不是把 SPA 壳当成
 * .js/.css 返回。
 *
 * 对 ASSET_URLS 的要求：资源由浏览器直接加载，CDN 必须对 .js/.css/字体返回
 * Access-Control-Allow-Origin（前端产物以 crossorigin 加载 module script /
 * stylesheet）。jsdelivr、unpkg 固定返回 *；npmmirror 在请求带 Origin 时回显
 * 该头，浏览器场景下同样可用。
 *
 * 示例：
 *   ASSET_URLS = https://registry.npmmirror.com/@openlist-frontend/openlist-frontend/$version/files/dist
 *   ASSET_URLS = https://cdn.jsdelivr.net/npm/@openlist-frontend/openlist-frontend@$version/dist
 *   ASSET_URLS = https://unpkg.com/@openlist-frontend/openlist-frontend@$version/dist
 */

/** CDN index.html 的模块级缓存：每个 isolate 每 TTL 最多一次外呼。
 *  TTL 兜底 @latest 这类会随时间漂移的地址（缓存过久的哈希会与新 latest 不匹配）。 */
const CDN_HTML_TTL_MS = 5 * 60_000
const cdnHtmlCache = new Map<string, { html: string; ts: number }>()

/** 读取 ASSET_URLS 原文（env 优先，便于本地/Node 环境回退 process.env）。 */
function rawAssetUrls(env: any): string {
  return String(env?.ASSET_URLS || process.env?.ASSET_URLS || "")
}

/**
 * 是否配置了前端资源 CDN。
 *
 * 供 HTML 入口做零开销直通判断：未配置 CDN 时无需读取/改写 HTML，
 * 直接把静态层的响应流式透传，避免每个页面导航都白付一次 body 缓冲与解析。
 */
export function isCdnConfigured(env: any): boolean {
  return Boolean(rawAssetUrls(env))
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
  const raw = rawAssetUrls(env)
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
 * 静态资源目录。对齐 Go 版 server/static/static.go 的 folders —— 这些目录下的
 * 请求在源站缺失时会被 302 到 CDN。
 */
const CDN_REDIRECT_FOLDERS = ["assets", "images", "streamer", "static"]

/** ASSET_URLS 原文 → 最近为 HTML 解析出的 CDN 地址（含 $version 替换结果）。
 *  静态资源缺失时的 302 复用它，保证与 HTML 指向同一个版本。 */
const resolvedCdnCache = new Map<string, string>()

/**
 * 静态资源在源站缺失时，给出应 302 到的 CDN 地址；不适用时返回空串。
 *
 * 对齐 Go 版 static.go：配置 cdn 后把 /assets/、/images/、/streamer/、/static/
 * 指向 CDN。Cloudflare 的资源优先路由下，资源存在时由静态层直出、Worker 根本
 * 不会执行，所以这里只在源站确实缺失时才触发 —— 此时若不重定向，SPA 兜底会把
 * index.html 当作 .js/.css 返回，浏览器按 text/html 解析后报错。
 */
export async function cdnAssetRedirect(
  env: any,
  pathAndSearch: string,
): Promise<string> {
  const raw = rawAssetUrls(env)
  if (!raw) return ""
  // 必须是「目录/具体文件」，目录本身（/assets、/assets/）不重定向
  const m = pathAndSearch.match(/^\/([^/?#]+)\/(.+)/)
  if (!m || !CDN_REDIRECT_FOLDERS.includes(m[1])) return ""
  // 优先复用 HTML 那次解析结果；冷启动直接命中资源时退回按 env 解析
  const cdn = resolvedCdnCache.get(raw) || (await resolveCdnUrl(env))
  if (!cdn || !/^https?:\/\//i.test(cdn)) return ""
  return `${cdn}${pathAndSearch}`
}

/**
 * 从 index.html 中取一个内容哈希资产路径，用于验证 CDN 与本地构建是否同一版本。
 *
 * 优先取 preloads 数组里的 module 入口（现代构建一定存在），其次退化为任意
 * `/assets/*.js` 引用。取不到时返回空串，调用方跳过「本地 HTML」路径。
 */
export function extractEntryAsset(html: string): string {
  const m =
    html.match(/"type"\s*:\s*"module"[^{}]*?"src"\s*:\s*"([^"]+)"/) ||
    html.match(/"(\/assets\/[^"]+\.js)"/) ||
    html.match(/(\/assets\/[A-Za-z0-9_.-]+\.js)/)
  return m ? m[1] : ""
}

/**
 * 探测 CDN 上是否存在该哈希资产。
 *
 * 用 HEAD 而非 GET：只关心存在性，不下载 1MB+ 的 bundle。哈希文件名是内容
 * 寻址的，同一个文件在 CDN 与本地构建中的名字一致当且仅当内容一致，因此
 * 单个入口资产存在即可判定「本地 HTML 引用的整套哈希在 CDN 上都存在」。
 */
async function cdnHasAsset(cdn: string, assetPath: string): Promise<boolean> {
  try {
    const res = await fetch(`${cdn}${assetPath}`, {
      method: "HEAD",
      signal: AbortSignal.timeout(4000),
    })
    return res.ok
  } catch {
    // CDN 不可达 / 超时：按「不存在」处理，走 CDN 的 index.html 兜底
    return false
  }
}

/**
 * 获取应下发的 index.html。
 *
 * A. 本地 HTML + CDN 资产：CDN 上存在本地 HTML 引用的哈希资产时采用。
 *    不要求 CDN 能返回 HTML，因此 npmmirror 这类禁止 .html 的 CDN 也能用
 *    （等价 Go Release 版行为）。
 * B. CDN 的 index.html：本地构建与 CDN 版本不一致时兜底，保证 HTML 与哈希资产
 *    同源一致。
 * C. 两条都不可用 → 本地 HTML 原样返回（不注入 cdn，资源回退源站，不白屏）。
 */
export async function getIndexHtmlWithCdn(
  env: any,
  localHtml: string,
): Promise<string> {
  const cdn = await resolveCdnUrl(env, localHtml)
  if (!cdn) return localHtml
  // 仅允许 http(s)，防止 ASSET_URLS 被配置成其它 scheme
  if (!/^https?:\/\//i.test(cdn)) return localHtml
  // 供静态资源缺失时的 302 复用同一地址（见 cdnAssetRedirect）
  resolvedCdnCache.set(rawAssetUrls(env), cdn)
  const hit = cdnHtmlCache.get(cdn)
  if (hit && Date.now() - hit.ts < CDN_HTML_TTL_MS) return hit.html

  // A. 本地 HTML：先确认 CDN 上确实有这套哈希，避免本地构建与 CDN 版本不一致
  //    时把浏览器引到 404 上（那会比不注入更糟）。
  const entry = extractEntryAsset(localHtml)
  if (entry && (await cdnHasAsset(cdn, entry))) {
    const html = injectCdnIntoHtml(localHtml, cdn)
    cdnHtmlCache.set(cdn, { html, ts: Date.now() })
    return html
  }

  // B. CDN 的 index.html
  try {
    const res = await fetch(`${cdn}/index.html`, {
      headers: { accept: "text/html" },
      signal: AbortSignal.timeout(4000),
    })
    if (res.ok) {
      let html = await res.text()
      // 校验确实是 HTML，而非 CDN 的 JSON 错误页（如 npmmirror 的 451 blocked）
      if (/<html/i.test(html)) {
        html = injectCdnIntoHtml(html, cdn)
        cdnHtmlCache.set(cdn, { html, ts: Date.now() })
        return html
      }
    }
  } catch {
    // CDN 不可达 / 超时：回退源站
  }

  // C. 降级：不注入
  return localHtml
}

for (const folder of CDN_REDIRECT_FOLDERS) {
  assetsRouter.get(`/${folder}/*`, async (c, next) => {
    const location = await cdnAssetRedirect(
      c.env,
      c.req.path + new URL(c.req.url).search,
    )
    if (location) return c.redirect(location, 302)
    return next()
  })
}
