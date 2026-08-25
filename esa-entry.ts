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
 * 4.【请求级 KV 缓存】ESA 边缘函数每个请求最多 8 次 KV 子请求，
 *    后端代码在单次请求中可能反复 getDb() 读取同一个 key，导致超限。
 *    此处为每次请求创建独立缓存 Map，同 key 仅发起一次真实 KV 调用。
 */
import app, { setSpaFallbackHtml } from "./src/backend/index"
import INDEX_HTML from "./dist/index.html"

declare const EdgeKV: any
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
    `globalThis keys: ${
      Object.keys(globalThis as any)
        .filter((k) => /kv|edge|storage|env|alibaba|worker/i.test(k))
        .join(",") || "(none matched)"
    }`,
)
function getEdgeKVCtorAtRequestTime(): any {
  if (MODULE_LEVEL_EDGE_KV) return MODULE_LEVEL_EDGE_KV
  const g = globalThis as any
  if (g.EdgeKV) return g.EdgeKV
  if (g.edgeKV) return g.edgeKV
  return null
}

/**
 * 模块级 KV 缓存（跨请求共享）。
 *
 * 解决 ESA EdgeKV 最终一致性问题：put 写入后需要几秒到几十秒同步到所有边缘节点，
 * 保存设置后立即 get 可能打到还没同步的节点读到旧值，导致"保存后刷新复原"。
 *
 * 此处维护一个带 TTL 的模块级缓存：
 * - put 成功后立即写入缓存，后续 get 优先从缓存读，不依赖 EdgeKV 同步
 * - get 未命中缓存时才发起真实 KV get，并写入缓存
 * - 缓存 TTL 60 秒，避免长期持有旧数据（其他实例/节点更新的数据最多延迟 60 秒）
 * - 模块级缓存在函数实例复用期间有效，冷启动后为空（正常行为）
 */
const MODULE_KV_CACHE_TTL_MS = 60_000
const moduleKvCache = new Map<
  string,
  { value: string | null; timestamp: number }
>()

function getModuleKvCache(key: string): string | null | undefined {
  const entry = moduleKvCache.get(key)
  if (!entry) return undefined
  if (Date.now() - entry.timestamp > MODULE_KV_CACHE_TTL_MS) {
    moduleKvCache.delete(key)
    return undefined
  }
  return entry.value
}

function setModuleKvCache(key: string, value: string | null): void {
  moduleKvCache.set(key, { value, timestamp: Date.now() })
}

function deleteModuleKvCache(key: string): void {
  moduleKvCache.delete(key)
}

/**
 * 包装 ESA EdgeKV 为项目通用的 { get, put, delete } 接口。
 * @param edgeKv 原始 EdgeKV 实例
 * @param cache  请求级缓存 Map（每次请求新建），同 key 仅发起一次真实 KV 调用
 */
function wrapEsaEdgeKV(edgeKv: any, cache?: Map<string, string | null>) {
  return {
    async get(key: string, _type?: string): Promise<string | null> {
      // 1. 命中请求级缓存：直接返回，不发起 KV 子请求
      if (cache && cache.has(key)) {
        return cache.get(key) as string | null
      }
      // 2. 命中模块级缓存（带 TTL）：直接返回，解决 EdgeKV 最终一致性导致的"保存后复原"
      const moduleCached = getModuleKvCache(key)
      if (moduleCached !== undefined) {
        if (cache) cache.set(key, moduleCached)
        return moduleCached
      }
      try {
        let val = await edgeKv.get(key)
        if (val != null && typeof val !== "string") {
          if (typeof val.text === "function") {
            val = await val.text()
          } else if (typeof val.toString === "function") {
            val = val.toString()
          }
        }
        const result = val ?? null
        // 3. 写入请求级缓存和模块级缓存（含 null，避免 404 反复重试）
        if (cache) cache.set(key, result)
        setModuleKvCache(key, result)
        return result
      } catch (e) {
        console.error(`[ESA/KV] get failed key=${key}:`, e)
        // 4. 失败也缓存 null，避免同一请求内反复重试耗尽配额
        if (cache) cache.set(key, null)
        setModuleKvCache(key, null)
        return null
      }
    },
    async put(key: string, value: string): Promise<void> {
      await edgeKv.put(key, value)
      // put 成功后立即更新请求级缓存和模块级缓存，使后续 get 能拿到新值
      // （不依赖 EdgeKV 最终一致性同步，解决"保存后刷新复原"）
      if (cache) cache.set(key, value)
      setModuleKvCache(key, value)
    },
    async delete(key: string): Promise<void> {
      try {
        await edgeKv.delete(key)
      } catch {}
      // delete 后使缓存失效
      if (cache) cache.delete(key)
      deleteModuleKvCache(key)
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
    // 【关键】每次请求创建独立的 KV 缓存 Map，隔离不同请求，避免数据污染
    const kvCache = new Map<string, string | null>()

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
        env.KV_NAMESPACE ||
        env.ESA_KV_NAMESPACE ||
        env.EDGEONE_KV_NAME ||
        "openlistnext"
      if (edgeKvCtor) {
        try {
          const edgeKv = new edgeKvCtor({ namespace })
          // probe 本身也走缓存，避免和业务 get 争抢配额
          let kvTestOk = false
          let kvTestErr: string | null = null
          try {
            await edgeKv.get("__openlistnext_probe__")
            kvTestOk = true
          } catch (e: any) {
            kvTestErr = e?.message || String(e)
          }
          // 传入请求级缓存
          const wrappedKv = wrapEsaEdgeKV(edgeKv, kvCache)
          // 同时挂载到 env 和 globalThis：ESA 的 env 对象可能是 Proxy/frozen，
          // 直接属性赋值可能不生效；项目 getKvBinding 会同时检查 env[key] 和 globalThis[key]
          try {
            env.OPENLISTNEXT_KV = wrappedKv
          } catch (e) {
            console.warn(
              `[ESA/req:${reqId}] env.OPENLISTNEXT_KV assign failed (env may be frozen):`,
              e,
            )
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
      console.warn(
        `[ESA/req:${reqId}] env is undefined/null — fetch signature may be wrong`,
      )
    }

    const response = await app.fetch(request, env, context)

    // 【关键】对所有 /api/ GET 请求强制 no-cache，防止 ESA CDN 缓存动态 API 响应。
    // 特别是 /api/public/settings：保存设置后立即刷新，CDN 可能返回缓存的旧值，
    // 导致设置看起来"没有保存"（站点标题在页面顶部最明显，最先被注意到）。
    if (request.method === "GET" && isApiRequest) {
      const newHeaders = new Headers(response.headers)
      newHeaders.set("Cache-Control", "no-cache, no-store, must-revalidate")
      newHeaders.set("Pragma", "no-cache")
      newHeaders.set("Expires", "0")
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: newHeaders,
      })
    }

    return response
  },
}
