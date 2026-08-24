/**
 * 阿里云 ESA（边缘安全加速）边缘函数入口适配文件
 *
 * 适配要点：
 * 1. ESA fetch 签名为 (request, context, env)，env 是第三个参数；
 *    而 Hono app.fetch 期望 (request, env, executionCtx)，需要调整参数顺序。
 * 2. ESA 的 KV 存储使用 new EdgeKV({ namespace }) API，与 Cloudflare Workers
 *    的 KV namespace binding 不同；此处将 EdgeKV 包装成项目期望的
 *    { get, put, delete } 接口，并挂载到 env.OPENLISTNEXT_KV 和 globalThis.OPENLISTNEXT_KV，
 *    使项目的通用 KV 适配层（getKvBinding）能自动检测并使用。
 * 3. ESA 不提供 ASSETS binding，前端 SPA 路由（如 /login、/@manage/*）
 *    无法通过静态资源回退；此处内联 dist/index.html 并通过 setSpaFallbackHtml
 *    注入，由 Hono 兜底直接返回 SPA 壳。
 *
 * 【关键改动】后端 app 改为懒加载（动态 import）：
 *   - 函数入口模块加载时不导入后端代码，确保 ESA 能正确注册函数并输出日志；
 *   - 第一次请求时才加载后端模块，若加载失败会输出完整错误堆栈，便于定位；
 *   - 加载成功后缓存复用，后续请求无额外开销。
 */
import INDEX_HTML from "./dist/index.html"

// ---------------------------------------------------------------------------
// 后端 app 懒加载
// ---------------------------------------------------------------------------
let appInstance: any = null
let appLoadPromise: Promise<any> | null = null

async function loadBackendApp(): Promise<any> {
  if (appInstance) return appInstance
  if (appLoadPromise) return appLoadPromise

  appLoadPromise = (async () => {
    console.log("[ESA/entry] lazy-loading backend app (src/backend/index)...")
    const t0 = Date.now()
    const mod = await import("./src/backend/index")
    // 注入 SPA 兜底 HTML（必须在 app 加载后、首次请求前调用）
    if (typeof mod.setSpaFallbackHtml === "function") {
      mod.setSpaFallbackHtml(INDEX_HTML)
    }
    appInstance = mod.default
    console.log(
      `[ESA/entry] backend app loaded successfully in ${Date.now() - t0}ms, ` +
        `app.fetch type=${typeof appInstance?.fetch}`,
    )
    return appInstance
  })()

  return appLoadPromise
}

// ---------------------------------------------------------------------------
// EdgeKV 探测与包装（模块级，不依赖后端 app）
// ---------------------------------------------------------------------------
function detectEdgeKVCtor(): any {
  const candidates: any[] = []
  const g = globalThis as any
  if (g.EdgeKV) candidates.push(g.EdgeKV)
  if (g.edgeKV) candidates.push(g.edgeKV)
  try {
    const s = (typeof self !== "undefined" ? self : null) as any
    if (s && s !== g && s.EdgeKV) candidates.push(s.EdgeKV)
  } catch {
    /* ignore */
  }
  try {
    if (typeof EdgeKV !== "undefined") candidates.push(EdgeKV)
  } catch {
    /* ReferenceError 意味着未声明，忽略 */
  }
  return candidates[0] || null
}

const MODULE_LEVEL_EDGE_KV = detectEdgeKVCtor()
console.log(
  `[ESA/entry] module loaded (backend lazy), module-level EdgeKV: ${!!MODULE_LEVEL_EDGE_KV}, ` +
    `globalThis keys: ${Object.keys(globalThis as any)
      .filter((k) => /kv|edge|storage|env|alibaba|worker/i.test(k))
      .join(",") || "(none matched)"}`,
)

function getEdgeKVCtorAtRequestTime(): any {
  if (MODULE_LEVEL_EDGE_KV) return MODULE_LEVEL_EDGE_KV
  const g = globalThis as any
  if (g.EdgeKV) return g.EdgeKV
  if (g.edgeKV) return g.edgeKV
  return null
}

function wrapEsaEdgeKV(edgeKv: any) {
  return {
    async get(key: string, _type?: string): Promise<string | null> {
      try {
        let val = await edgeKv.get(key)
        if (val != null && typeof val !== "string") {
          if (typeof val.text === "function") {
            val = await val.text()
          } else if (typeof val.toString === "function") {
            val = val.toString()
          }
        }
        return val ?? null
      } catch (e) {
        console.error(`[ESA/KV] get failed key=${key}:`, e)
        return null
      }
    },
    async put(key: string, value: string): Promise<void> {
      await edgeKv.put(key, value)
    },
    async delete(key: string): Promise<void> {
      try {
        await edgeKv.delete(key)
      } catch {}
    },
  }
}

// ---------------------------------------------------------------------------
// 函数入口
// ---------------------------------------------------------------------------
export default {
  async fetch(request: Request, context: any, env: any) {
    const url = new URL(request.url)
    const isApiRequest = url.pathname.startsWith("/api")
    const reqId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`

    if (isApiRequest) {
      const envKeys = env ? Object.keys(env) : []
      console.log(
        `[ESA/req:${reqId}] ${request.method} ${url.pathname}, ` +
          `env keys=[${envKeys.join(",")}], context type=${typeof context}`,
      )
    }

    // --- EdgeKV 初始化（不依赖后端 app）---
    const edgeKvCtor = getEdgeKVCtorAtRequestTime()
    if (env && typeof env !== "undefined") {
      const namespace =
        env.KV_NAMESPACE || env.ESA_KV_NAMESPACE || env.EDGEONE_KV_NAME || "openlistnext"
      if (edgeKvCtor) {
        try {
          const edgeKv = new edgeKvCtor({ namespace })
          let kvTestOk = false
          let kvTestErr: string | null = null
          try {
            await edgeKv.get("__openlistnext_probe__")
            kvTestOk = true
          } catch (e: any) {
            kvTestErr = e?.message || String(e)
          }
          const wrappedKv = wrapEsaEdgeKV(edgeKv)
          try {
            env.OPENLISTNEXT_KV = wrappedKv
          } catch (e) {
            console.warn(`[ESA/req:${reqId}] env.OPENLISTNEXT_KV assign failed:`, e)
          }
          ;(globalThis as any).OPENLISTNEXT_KV = wrappedKv
          if (isApiRequest) {
            console.log(
              `[ESA/req:${reqId}] EdgeKV initialized namespace=${namespace}, ` +
                `probe=${kvTestOk ? "ok" : "FAIL:" + kvTestErr}, ` +
                `JWT_SECRET set=${!!env.JWT_SECRET}`,
            )
          }
        } catch (e: any) {
          console.error(`[ESA/req:${reqId}] EdgeKV init FAILED:`, e?.message || e)
        }
      } else if (isApiRequest) {
        console.warn(`[ESA/req:${reqId}] EdgeKV constructor NOT found — KV falls back to memory mode`)
      }
    } else if (isApiRequest) {
      console.warn(`[ESA/req:${reqId}] env is undefined/null — fetch signature may be wrong`)
    }

    // --- 懒加载后端 app 并处理请求 ---
    try {
      const app = await loadBackendApp()
      if (!app || typeof app.fetch !== "function") {
        throw new Error(
          `backend app loaded but app.fetch is not a function (got: ${typeof app?.fetch})`,
        )
      }
      // ESA: (request, context, env) → Hono: (request, env, executionCtx)
      return app.fetch(request, env, context)
    } catch (e: any) {
      // 后端模块加载失败或请求处理异常：输出完整错误并返回 500
      console.error(`[ESA/req:${reqId}] FATAL error:`, e)
      const errMsg = e?.message || String(e)
      const errStack = e?.stack || ""
      return new Response(
        JSON.stringify({
          error: "ESA backend app failed to load or handle request",
          message: errMsg,
          stack: errStack,
          requestId: reqId,
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        },
      )
    }
  },
}
