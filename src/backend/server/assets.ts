import { Hono } from "hono"

/**
 * 内嵌品牌资源路由（零外部依赖）。
 *
 * 背景：老前端（含 logo.svg / logo.png / favicon 静态文件）已移除，前端统一
 * 由官方 OpenList-Frontend 产物提供，但官方产物不包含 /logo.png、/favicon.png
 * 等站点图标；而 /api/public/settings 返回的 logo/favicon 字段指向这些路径，
 * 导致图标 404 裂开。这里在 Worker 内联返回 OpenList 品牌 SVG，兼容多路径。
 */

// OpenList 品牌 logo —— 与官方前端完全一致：官方 index.html 的 favicon 与
// 登录页设置均引用 https://res.oplist.org/logo/logo.svg（天蓝 #38bdf8 + 青绿
// #99f6e4 的流线圆形标识）。此处抓取其内容内嵌，避免站点图标依赖外部 CDN。
export const LOGO_SVG = `<svg id="Base" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">
  <defs>
    <style>
      .cls-1 {
          --sky-400: #38bdf8;
          @supports (color: oklch(0% 0 0)) {
              --sky-400: oklch(74.6% 0.16 232.661);
          }
          fill: var(--sky-400);
      }
      .cls-2 {
          --teal-200: #99f6e4;
          @supports (color: oklch(0% 0 0)) {
              --teal-200: oklch(91% 0.096 180.426);
          }
          fill: var(--teal-200);
      }
    </style>
  </defs>
  <g id="LB">
    <path class="cls-1" d="M244.57,776.75c-10.1,0-20.31-2.78-29.46-8.59-25.63-16.3-33.2-50.29-16.9-75.92l201.93-317.6c16.3-25.63,50.29-33.2,75.92-16.9,25.63,16.3,33.2,50.29,16.9,75.92l-201.93,317.6c-10.48,16.48-28.28,25.5-46.46,25.5Z"/>
  </g>
  <g id="RT">
    <path class="cls-2" d="M509.93,907.83c-35.01,0-67.29-4.84-91.84-13.86-15.63-5.74-27.82-18.25-33.15-34.03s-3.23-33.12,5.72-47.16l174.43-273.77c16.32-25.62,50.32-33.15,75.94-16.83,25.62,16.32,33.15,50.32,16.83,75.94l-126.68,198.82c25.39-1.89,54.61-7.42,84.56-19.13,71.29-27.87,127.46-82.26,158.15-153.15,30.53-70.52,31.94-147.78,3.98-217.56-28.43-70.95-82.76-126.78-152.98-157.2-70.23-30.42-147.71-31.59-218.17-3.27-73.46,29.52-126.75,82.48-158.4,157.4-11.82,27.98-44.08,41.08-72.07,29.27-27.98-11.82-41.08-44.08-29.27-72.07,42.86-101.46,118.49-176.38,218.71-216.66,49.54-19.91,101.59-29.4,154.67-28.2,51.11,1.15,100.99,12.12,148.25,32.6,47.14,20.42,89.3,49.27,125.31,85.75,37.27,37.75,66.22,81.98,86.05,131.46,19.64,49.01,28.94,100.74,27.64,153.75-1.26,51.15-12.28,101.08-32.77,148.42-20.54,47.45-49.51,89.78-86.11,125.81-38.15,37.56-82.88,66.53-132.94,86.09-42.5,16.61-89.11,26.08-134.81,27.39-3.71.11-7.4.16-11.05.16Z"/>
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
