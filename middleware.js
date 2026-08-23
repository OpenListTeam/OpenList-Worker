// EdgeOne Makers 边缘中间件：SPA 路由回退
//
// cloud-functions/[[default]].js 是根级 catch-all，会接管所有未命中静态文件的
// 请求（包括 /add、/@manage/* 等前端路由），而 Node 函数内没有 ASSETS 绑定，
// Hono 兜底只能返回 404 —— 这就是「访问 /add 404 后整站打不开」的原因。
// 此中间件在边缘层先行拦截：浏览器导航请求（Accept: text/html）且不属于
// 后端路径时，透明改写为 /index.html，由静态 CDN 直接返回页面壳；
// /api、/d、/p、/sd、/health 等后端路径照常放行到云函数。
export function middleware(context) {
  const { request } = context
  const { pathname } = new URL(request.url)
  const accept = request.headers.get("accept") || ""

  const isBackend =
    pathname === "/health" || /^\/(api|d|p|sd)(\/|$)/.test(pathname)

  if (
    !isBackend &&
    (request.method === "GET" || request.method === "HEAD") &&
    accept.includes("text/html")
  ) {
    return context.rewrite("/index.html")
  }

  return context.next()
}
