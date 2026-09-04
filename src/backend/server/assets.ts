import { Hono } from "hono"

/**
 * 内嵌品牌资源路由（零外部依赖）。
 *
 * 背景：老前端（含 logo.svg / logo.png / favicon 静态文件）已移除，前端统一
 * 由官方 OpenList-Frontend 产物提供，但官方产物不包含 /logo.png、/favicon.png
 * 等站点图标；而 /api/public/settings 返回的 logo/favicon 字段指向这些路径，
 * 导致图标 404 裂开。这里在 Worker 内联返回 OpenList 品牌 SVG，兼容多路径。
 */

// OpenList 品牌 logo（三根斜线：青绿 #70c6be + 蓝 #1ba0d8）
// 来源：从老前端 logo.svg 恢复
export const LOGO_SVG = `<svg width="1252" height="1252" viewBox="225 225 800 800" xmlns="http://www.w3.org/2000/svg" version="1.1">
 <g fill="none" stroke-linecap="round" stroke-linejoin="round">
  <path d="M 475 300 L 325 950" stroke="#70c6be" stroke-width="120"/>
  <path d="M 925 300 L 775 950" stroke="#70c6be" stroke-width="120"/>
  <path d="M 475 300 L 775 950" stroke="#1ba0d8" stroke-width="120"/>
 </g>
</svg>`

export const assetsRouter = new Hono()

function svgResponse(c: any) {
  return c.body(LOGO_SVG, 200, {
    "Content-Type": "image/svg+xml; charset=utf-8",
    "Cache-Control": "public, max-age=86400",
  })
}

// 兼容多种路径（settings 返回 /logo.png 与 /favicon.png；浏览器默认请求
// /favicon.ico；官方前端 index.html 引用 .svg）。统一返回 SVG。
assetsRouter.get("/logo.svg", svgResponse)
assetsRouter.get("/logo.png", svgResponse)
assetsRouter.get("/favicon.svg", svgResponse)
assetsRouter.get("/favicon.png", svgResponse)
assetsRouter.get("/favicon.ico", svgResponse)
