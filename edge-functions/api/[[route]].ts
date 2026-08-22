import backendApp from "../../src/backend/index"

// 导出 EdgeOne Makers 标准边缘函数 onRequest 句柄
export async function onRequest(context: any) {
  return backendApp.fetch(context.request, context.env, context)
}

// 导出标准 Fetch 句柄
export default {
  fetch: (request: Request, env: any, ctx: any) =>
    backendApp.fetch(request, env, ctx),
}
