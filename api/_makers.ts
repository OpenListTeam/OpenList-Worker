import app, { setSpaFallbackHtml } from "../src/backend/index"
import INDEX_HTML from "../dist/index.html"

// 构建期内联 dist/index.html：EdgeOne Node 云函数没有 ASSETS 绑定，
// 前端路由（/add、/@manage/* 等静态不存在的路径）会落到 Hono 兜底，
// 注入后由函数直接返回 SPA 壳（配合根级 middleware.js 的边缘改写双保险）。
setSpaFallbackHtml(INDEX_HTML)

export function onRequest(context: any) {
  return app.fetch(context.request, context.env, context)
}

export default onRequest
