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
 * 当配置了 ASSET_URLS 时，将其注入 index.html 的 window.OPENLIST_CONFIG.cdn，
 * 浏览器据此直连 CDN 加载 JS/CSS/图片等静态资源，无需经 Worker 302 中转。
 *
 * 相比 302 重定向方案（每个资源请求都经 Worker 跳转一次），本方案只在
 * HTML 入口（每页 1 次请求）注入配置，后续几十上百次资源请求由浏览器
 * 直发 CDN，Worker 调用量与存储读取次数降低 1~2 个数量级。
 *
 * 参考原版 OpenList 实现（server/static/static.go 的 cdn 注入）：
 *   "cdn: undefined" -> "cdn: '<resolved-url>'"
 *
 * 示例：
 *   ASSET_URLS = https://cdn.jsdelivr.net/npm/@openlist-frontend/openlist-frontend@$version/dist
 *   ASSET_URLS = https://registry.npmmirror.com/@openlist-frontend/openlist-frontend/1.0.0/files/dist
 */

/** 从 env 读取 ASSET_URLS；含 $version 时才查 DB 解析版本号，否则零存储开销。 */
export async function resolveCdnUrl(env: any): Promise<string> {
  const raw = env?.ASSET_URLS || process.env?.ASSET_URLS || ""
  if (!raw) return ""
  // 无 $version 占位符：直接返回，跳过 DB 读取
  if (!raw.includes("$version")) return raw
  // 解析 $version：尝试从 version 设置提取 frontend 版本，失败回退 "latest"
  let version = "latest"
  try {
    const db = await getDb(env)
    const item = (db.settings || []).find((s: any) => s.key === "version")
    if (item?.value) {
      // 兼容格式 "v4.2.3 (Commit: xxx) - Frontend: v1.0.0 - Build at: xxx"
      const m = String(item.value).match(/Frontend:\s*([^\s-]+)/)
      if (m) version = m[1]
    }
  } catch {
    // 存储不可用 / 未初始化时回退 "latest"
  }
  return raw.replace(/\$version/g, version)
}

/**
 * 将解析后的 CDN 地址注入 index.html。
 *
 * 替换 window.OPENLIST_CONFIG 中的 `cdn: undefined` 为 `cdn: '<url>'`。
 * 前端 vite-plugin-dynamic-base 读取 window.__dynamic_base__（= cdn），
 * 据此前缀所有静态资源 URL，实现从 CDN 加载。
 *
 * 未配置 ASSET_URLS 时原样返回（无副作用）。
 */
export async function injectCdnIntoHtml(html: string, env: any): Promise<string> {
  const cdn = await resolveCdnUrl(env)
  if (!cdn) return html
  // 用函数替换避免 cdn URL 中可能的 $ 被当作特殊模式
  return html.replace(/cdn:\s*undefined/, () => `cdn: '${cdn}'`)
}
