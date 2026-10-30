import app, { setSpaFallbackHtml } from "../src/backend/index"
import INDEX_HTML from "../dist/index.html"

// 构建期内联 dist/index.html：EdgeOne Node 云函数没有 ASSETS 绑定，
// 前端路由（/add、/@manage/* 等静态不存在的路径）会落到 Hono 兜底，
// 注入后由函数直接返回 SPA 壳（配合根级 middleware.js 的边缘改写双保险）。
setSpaFallbackHtml(INDEX_HTML)

export async function onRequest(context: any) {
  const request = context.request as Request
  const method = request.method.toUpperCase()
  const path = new URL(request.url).pathname
  const contentType = request.headers.get("content-type") || ""
  const isJsonApiRequest =
    !["GET", "HEAD", "OPTIONS"].includes(method) &&
    contentType.toLowerCase().includes("application/json") &&
    path.startsWith("/api") &&
    !path.startsWith("/api/task/")

  if (!isJsonApiRequest || request.body === null) {
    return app.fetch(request, context.env, context)
  }

  let body: ArrayBuffer
  try {
    body = await request.arrayBuffer()
  } catch {
    console.warn("[edgeone] Failed to buffer JSON API request body", {
      method,
      path,
      contentLength: request.headers.get("content-length"),
    })
    return new Response(
      JSON.stringify({
        code: 400,
        message: "failed to read request body",
        data: null,
      }),
      {
        status: 400,
        headers: { "content-type": "application/json; charset=UTF-8" },
      },
    )
  }

  // Materialize JSON bodies at the EdgeOne adapter boundary, then hand Hono
  // a fresh stream. This avoids passing the platform's one-shot body stream
  // through Node middleware before the application has cached it.
  const replayableRequest = new Request(request.url, {
    method: request.method,
    headers: request.headers,
    body,
    signal: request.signal,
  })
  return app.fetch(replayableRequest, context.env, context)
}

export default onRequest
