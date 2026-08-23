import { Hono } from "hono"
import { handle } from "hono/vercel"
import backendApp from "../src/backend/index"

const app = new Hono()

// 挂载整个后端 API 应用
app.route("/", backendApp)

// 导出符合 EdgeOne Makers / Edge Functions / Pages 规范的 onRequest 句柄
export async function onRequest(context: any) {
  return app.fetch(context.request, context.env, context)
}

// 导出符合 Vercel 规范的 Serverless 句柄
export const GET = handle(app)
export const POST = handle(app)
export const PUT = handle(app)
export const DELETE = handle(app)
export const PATCH = handle(app)
export const OPTIONS = handle(app)

// 导出 Cloudflare Workers 原生 Fetch 句柄
export default {
  fetch: app.fetch,
}
