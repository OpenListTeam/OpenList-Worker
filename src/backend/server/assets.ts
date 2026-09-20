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
 * 允许重定向到 CDN 的静态资源目录（对齐 Go server/static/static.go 的
 * `folders := []string{"assets", "images", "streamer", "static"}`）。
 *
 * ⚠️ 这里**必须**是固定前缀白名单。此前用的是 `/:folder/:filepath*`——
 * 它会吞掉**任意两段路径**，于是「存储挂载点/文件」这种路由（例如
 * `<域名>/存储2/xxx.exe`，即文件预览页的地址）在刷新时会被它拦下，
 * 未配置 ASSET_URLS 时直接返回 `Static resource not found`（404），
 * 前端来不及走到 SPA 兜底，表现为「进预览页后刷新白屏/404」。
 */
const CDN_FOLDERS = ["assets", "images", "streamer", "static"]

/** 解析 CDN 模板：`$version` 占位符会替换为前端版本号（取不到则 latest） */
async function resolveCdnBase(cdnUrl: string): Promise<string> {
  let version = "latest"
  try {
    const db = await getDb()
    const versionItem = db.get(
      "SELECT * FROM x_settings WHERE key = 'version'",
    ) as any
    if (versionItem && versionItem.value) {
      // 从版本字符串提取 frontend 版本，如
      // "v4.2.3 (Commit: xxx) - Frontend: v1.0.0 - Build at: xxx"
      const match = versionItem.value.match(/Frontend:\s*([^\s-]+)/)
      if (match) version = match[1]
    }
  } catch {
    // 读不到版本号时退回 latest（与 Go 的 $version 缺省行为一致）
  }
  return cdnUrl.replace(/\$version/g, version)
}

for (const folder of CDN_FOLDERS) {
  assetsRouter.get(`/${folder}/*`, async (c, next) => {
    const env = c.env as any
    const cdnUrl =
      env?.ASSET_URLS ||
      (typeof process !== "undefined" ? process.env?.ASSET_URLS : "") ||
      ""

    // 未配置 CDN：不能在这里 404，必须放行给后面的本地静态资源
    //（Workers 的 ASSETS 绑定 / SPA 兜底），否则这些目录之外的请求不会受影响，
    // 但 `/assets/...` 这类真实静态资源会直接 404。
    if (!cdnUrl) return await next()

    const resolvedCdnUrl = await resolveCdnBase(cdnUrl)
    const prefix = `/${folder}/`
    const filepath = c.req.path.startsWith(prefix)
      ? c.req.path.slice(prefix.length)
      : ""

    return c.redirect(`${resolvedCdnUrl}/${folder}/${filepath}`, 302)
  })
}
