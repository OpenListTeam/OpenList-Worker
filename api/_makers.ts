import app, { setSpaFallbackHtml } from "../src/backend/index"
import INDEX_HTML from "../dist/index.html"

// 构建期内联 dist/index.html：EdgeOne Node 云函数没有 ASSETS 绑定，
// 前端路由（/add、/@manage/* 等静态不存在的路径）会落到 Hono 兜底，
// 注入后由函数直接返回 SPA 壳（配合根级 middleware.js 的边缘改写双保险）。
setSpaFallbackHtml(INDEX_HTML)

/**
 * 预读上限：超过该字节数的 JSON body 不预读，避免把大请求整体驻留内存。
 * OpenList 的 JSON 接口都是小请求（< 几十 KB），1 MB 足够覆盖。
 */
const PREFETCH_MAX_BYTES = 1 << 20

/**
 * EdgeOne Node 云函数会把请求体的底层流在**平台侧**提前消费（issue #170：
 * 实测 30%~45% 的 POST 读不到 body，GET 不受影响，同代码在 Cloudflare
 * Workers 上 0 失败）。平台是在函数执行期间异步 drain 的，所以读得越晚
 * 越容易撞上——而本项目在 Hono 读取 body 之前还有存储配置检查等 await。
 *
 * 这里在 onRequest 入口、**任何 await 之前**就把小的 JSON body 读掉，
 * 并用读到的文本重建 Request，把竞态窗口压到接近 0：
 *   - 读到 → 重建 Request（后续 c.req.text() 拿到的是确定的字符串）；
 *   - 读不到 → 原样交给下游 jsonBodyGuard，由它返回 503 + 结构化日志。
 * 条件收得很窄（仅 POST/PUT/PATCH 的 /api JSON 小请求），不影响上传
 * （multipart 走云盘存储，不经过这里）与流式响应。
 */
async function prefetchJsonBody(request: Request): Promise<Request> {
  if (!(request instanceof Request)) return request

  const method = request.method.toUpperCase()
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") {
    return request
  }

  const contentType = (request.headers.get("content-type") || "").toLowerCase()
  if (!contentType.includes("application/json")) return request

  let pathname = ""
  try {
    pathname = new URL(request.url).pathname
  } catch {
    return request
  }
  if (!pathname.startsWith("/api")) return request

  const declared = Number(request.headers.get("content-length") ?? -1)
  if (!(declared > 0) || declared > PREFETCH_MAX_BYTES) return request

  try {
    const text = await request.text()
    return new Request(request.url, {
      method,
      headers: request.headers,
      body: text,
    })
  } catch {
    // 读失败：流可能已被平台 drain。保留原 Request 让 jsonBodyGuard
    // 走 503 分支并留下诊断日志（它会再读一次并捕获真实原因）。
    return request
  }
}

export async function onRequest(context: any) {
  const request = await prefetchJsonBody(context.request)
  return app.fetch(request, context.env, context)
}

export default onRequest
