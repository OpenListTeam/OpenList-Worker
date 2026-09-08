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
 * CDN 静态资源重定向路由。
 * 
 * 当配置了 CDN_URL 时，前端静态资源（assets/、images/ 等）将重定向到 CDN 加载。
 * 支持 $version 占位符自动替换为前端版本号。
 * 
 * 参考原版 OpenList 实现：https://github.com/OpenListTeam/OpenList/blob/main/server/static/static.go
 * 
 * 示例：CDN_URL = https://registry.npmmirror.com/@openlist-frontend/openlist-frontend/$version/files/dist
 */
assetsRouter.get("/:folder/:filepath*", async (c) => {
  const env = c.env as any
  const cdnUrl = env?.CDN_URL || process.env.CDN_URL
  
  if (!cdnUrl) {
    // 未配置 CDN，返回 404
    return c.text("Static resource not found", 404)
  }
  
  // 获取前端版本号
  const db = await getDb()
  let version = "latest"
  try {
    const versionItem = db.get("SELECT * FROM x_settings WHERE key = 'version'") as any
    if (versionItem && versionItem.value) {
      // 从版本字符串提取 frontend 版本，如 "v4.2.3 (Commit: xxx) - Frontend: v1.0.0 - Build at: xxx"
      const match = versionItem.value.match(/Frontend:\s*([^\s-]+)/)
      if (match) {
        version = match[1]
      }
    }
  } catch (e) {
    // 忽略错误，使用默认值
  }
  
  // 替换 $version 占位符
  const resolvedCdnUrl = cdnUrl.replace(/\$version/g, version)
  
  // 构建 CDN 资源完整 URL
  const folder = c.req.param("folder")
  const filepath = c.req.param("filepath") || ""
  const resourceUrl = `${resolvedCdnUrl}/${folder}/${filepath}`
  
  // 重定向到 CDN 资源
  return c.redirect(resourceUrl, 302)
})
