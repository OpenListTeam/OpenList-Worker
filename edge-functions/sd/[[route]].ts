import backendApp from "../../src/backend/index"

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

export async function onRequest(arg0: any, arg1?: any, arg2?: any) {
  try {
    const { request, env, ctx } = getNormalizedArgs(arg0, arg1, arg2)
    return await backendApp.fetch(request, env, ctx)
  } catch (err: any) {
    console.error("[Edge Function Error]:", err)
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

export default async function (arg0: any, arg1?: any, arg2?: any) {
  return onRequest(arg0, arg1, arg2)
}

export const fetch = onRequest
