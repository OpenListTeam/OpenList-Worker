import { Hono } from "hono"
import { handle } from "hono/vercel"
import backendApp from "../src/backend/index"

const app = new Hono()

// 挂载整个后端 API 应用
app.route("/", backendApp)

function getNormalizedArgs(arg0: any, arg1?: any, arg2?: any) {
  if (
    arg0 &&
    arg0.request &&
    (typeof arg0.request.url === "string" ||
      typeof arg0.request.method === "string")
  ) {
    return {
      request: arg0.request,
      env: arg0.env || {},
      ctx: arg0,
    }
  }
  if (
    arg0 &&
    (typeof arg0.url === "string" || typeof arg0.method === "string")
  ) {
    return {
      request: arg0,
      env: arg1 || {},
      ctx: arg2 || {},
    }
  }
  return {
    request: arg0?.request || arg0,
    env: arg0?.env || arg1 || {},
    ctx: arg2 || arg0 || {},
  }
}

// 导出符合 EdgeOne Makers / Edge Functions / Pages 规范的 onRequest 句柄
export async function onRequest(arg0: any, arg1?: any, arg2?: any) {
  try {
    const { request, env, ctx } = getNormalizedArgs(arg0, arg1, arg2)
    return await app.fetch(request, env, ctx)
  } catch (err: any) {
    console.error("[API Error]:", err)
    return new Response(
      JSON.stringify({
        code: 500,
        message: err?.message || String(err),
        data: null,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    )
  }
}

// 导出符合 Vercel 规范的 Serverless 句柄
export const GET = handle(app)
export const POST = handle(app)
export const PUT = handle(app)
export const DELETE = handle(app)
export const PATCH = handle(app)
export const OPTIONS = handle(app)

// 导出 Cloudflare Workers / EdgeOne 原生 Fetch 句柄
export default {
  fetch: (request: Request, env: any, ctx: any) => app.fetch(request, env, ctx),
}
