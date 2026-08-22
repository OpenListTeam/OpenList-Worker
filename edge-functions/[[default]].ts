import { Hono } from "hono"
import backendApp from "../src/backend/index"

const app = new Hono()

// 挂载整个后端 API 应用
app.route("/", backendApp)

// 导出 EdgeOne Makers / Edge Functions 标准 onRequest 句柄
export async function onRequest(context: any) {
  return app.fetch(context.request, context.env, context)
}

// 默认 fetch 导出
export default {
  fetch: app.fetch,
}
