/**
 * ESA 极简懒加载测试版
 * 目的：定位是哪个部分导致 ESA 无法注册函数
 * - 不 import dist/index.html
 * - 无模块级复杂代码
 * - fetch 内动态 import 后端 app
 */
export default {
  async fetch(request: Request, context: any, env: any) {
    const url = new URL(request.url)
    console.log(`[ESA/test] ${request.method} ${url.pathname}`)

    try {
      console.log("[ESA/test] dynamic importing backend app...")
      const mod = await import("./src/backend/index")
      console.log("[ESA/test] backend app imported, app.fetch type:", typeof mod.default?.fetch)

      if (mod.setSpaFallbackHtml) {
        // 暂时不注入 SPA 壳，仅测试函数是否能触发
        console.log("[ESA/test] setSpaFallbackHtml available (skipped in test)")
      }

      // ESA: (request, context, env) → Hono: (request, env, executionCtx)
      return mod.default.fetch(request, env, context)
    } catch (e: any) {
      console.error("[ESA/test] FATAL:", e?.message || e)
      console.error("[ESA/test] stack:", e?.stack || "(no stack)")
      return new Response(
        JSON.stringify({
          error: "backend load failed",
          message: e?.message || String(e),
          stack: e?.stack || "",
        }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      )
    }
  },
}
