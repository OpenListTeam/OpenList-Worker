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
 */

import app, { setSpaFallbackHtml } from "./src/backend/index"
import INDEX_HTML from "./dist/index.html"

// 构建期内联 dist/index.html 作为 SPA 兜底壳
setSpaFallbackHtml(INDEX_HTML)

// 模块级：探测 EdgeKV 全局构造器（ESA 运行时可能挂在不同的全局对象上）
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
  `[ESA/entry] module loaded, module-level EdgeKV: ${!!MODULE_LEVEL_EDGE_KV}, ` +
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

export default {
  async fetch(request: Request, context: any, env: any) {
    // ESA: (request, context, env)
    // Hono: (request, env, executionCtx)

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
          // 同时挂载到 env 和 globalThis：ESA 的 env 对象可能是 Proxy/frozen，
          // 直接属性赋值可能不生效；项目 getKvBinding 会同时检查 env[key] 和 globalThis[key]
          try {
            env.OPENLISTNEXT_KV = wrappedKv
          } catch (e) {
            console.warn(`[ESA/req:${reqId}] env.OPENLISTNEXT_KV assign failed (env may be frozen):`, e)
          }
          ;(globalThis as any).OPENLISTNEXT_KV = wrappedKv

          if (isApiRequest) {
            const envHasKv = !!(env && env.OPENLISTNEXT_KV)
            const globalHasKv = !!(globalThis as any).OPENLISTNEXT_KV
            console.log(
              `[ESA/req:${reqId}] EdgeKV initialized namespace=${namespace}, ` +
                `probe=${kvTestOk ? "ok" : "FAIL:" + kvTestErr}, ` +
                `env.OPENLISTNEXT_KV=${envHasKv}, globalThis.OPENLISTNEXT_KV=${globalHasKv}, ` +
                `JWT_SECRET set=${!!env.JWT_SECRET}`,
            )
          }
        } catch (e: any) {
          console.error(
            `[ESA/req:${reqId}] EdgeKV init FAILED namespace=${namespace}:`,
            e?.message || e,
          )
        }
      } else if (isApiRequest) {
        console.warn(
          `[ESA/req:${reqId}] EdgeKV constructor NOT found — KV falls back to memory mode`,
        )
        const allKeys = Object.keys(globalThis as any)
        console.log(
          `[ESA/req:${reqId}] globalThis all keys (first 50): ${allKeys.slice(0, 50).join(",")}`,
        )
      }
    } else if (isApiRequest) {
      console.warn(`[ESA/req:${reqId}] env is undefined/null — fetch signature may be wrong`)
    }

    return app.fetch(request, env, context)
  },
}
