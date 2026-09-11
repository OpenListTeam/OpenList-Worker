/**
 * KV 驱动（自动适配 Cloudflare / EdgeOne）
 * 
 * 支持两种模式：
 * 1. Binding 模式：直接访问 KV binding（Cloudflare Workers / EdgeOne Edge Functions）
 * 2. HTTP 代理模式：通过 Edge Function 代理访问（EdgeOne Node Functions）
 * 
 * 自动检测环境并选择合适的模式。
 */
import type { Driver, EnvContext } from "../types"

/**
 * 判断某个值是否具备 KV Web API 的接口形态。
 *
 * 这一步是必需的：EdgeOne Node 云函数也会注入一个名为 `KV` 的绑定，
 * 但它走的是 RESP/Redis 协议（TCP socket），调用 put/get 会抛出
 * "cannot find the collection by name"，而不是提供 Web KV API。
 * 必须靠接口形状区分，否则会把 RESP 客户端误当作 KV 使用。
 */
function isWebKvLike(b: any): boolean {
  if (!b || typeof b !== "object") return false
  // 属性访问可能触发异常 getter，任何异常都视为「不是可用绑定」。
  try {
    if (typeof b.get !== "function") return false
    return typeof b.put === "function" || typeof b.set === "function"
  } catch {
    return false
  }
}

/**
 * 获取 KV binding（仅返回符合 Web KV API 的绑定）。
 *
 * 注意：不能写成 `env || globalThis` —— 只要 env 是真值就不会回退到
 * globalThis，而 EdgeOne Edge Functions 会把绑定名注入为全局标识符。
 * 因此这里两处都要检查，且都要通过接口形态校验。
 */
function getKvBinding(env?: any): any | null {
  const g = globalThis as any

  // 允许通过环境变量指定自定义绑定名（环境变量读取需容错）
  let customName: any
  try {
    customName =
      env?.EDGEONE_KV_NAME || env?.KV_NAMESPACE || env?.KV_NAME ||
      g?.EDGEONE_KV_NAME || g?.KV_NAMESPACE
  } catch {
    customName = undefined
  }

  const candidates: string[] = customName
    ? [customName, "EDGEONE_KV", "EO_KV", "KV", "CF_KV", "DATABASE_KV"]
    : ["EDGEONE_KV", "EO_KV", "KV", "CF_KV", "DATABASE_KV"]

  for (const name of candidates) {
    const fromEnv = env?.[name]
    if (isWebKvLike(fromEnv)) return fromEnv

    const fromGlobal = g?.[name]
    if (isWebKvLike(fromGlobal)) return fromGlobal
  }

  return null
}

/**
 * 检测是否应走 HTTP 代理模式。
 *
 * 条件：当前 env 中没有 KV binding。
 * 注意不能要求 JWT_SECRET 存在——密钥可能只存于 KV（由 getJwtSecret 回退读取），
 * 因此这里放宽判断，真正是否可用由 isAvailable() 的实际探测决定。
 */
function isEdgeOneNodeEnv(env?: any): boolean {
  return getKvBinding(env) === null
}

/**
 * 获取代理内部调用密钥。
 *
 * Edge Function 侧用它的前 16 位校验 X-Internal-Call。
 *
 * 只从环境变量读取，原因：
 *  1. 若走 KV 回退读取密钥，则需要先访问 KV 才能拿密钥、拿密钥才能访问 KV，
 *     形成循环依赖；
 *  2. 打包产物中不能依赖源码相对路径的动态 import。
 *
 * 因此 KV 代理模式要求显式配置 JWT_SECRET / ENCRYPTION_SECRET（>=16 字符）。
 */
function getProxySecret(env?: EnvContext): string | null {
  try {
    const s = env?.ENCRYPTION_SECRET || env?.JWT_SECRET
    return typeof s === "string" && s.length >= 16 ? s : null
  } catch {
    return null
  }
}

/**
 * Detect missing configuration for KV proxy mode.
 *
 * Triggered when all of the following hold:
 *  1. The current env has no KV binding, so the HTTP proxy must be used.
 *  2. No JWT_SECRET / ENCRYPTION_SECRET (>= 16 chars) is configured, so the
 *     proxy cannot be authenticated.
 *
 * The combination "no binding + proxy required" only occurs on EdgeOne Node
 * Functions: Cloudflare Workers have a native binding, and other platforms
 * never take the proxy branch. So no platform sniffing is needed.
 *
 * @returns A human-readable configuration error, or null when valid.
 */
export function checkProxyConfig(env?: any): string | null {
  try {
    if (getKvBinding(env) !== null) return null // binding mode, no secret needed
    if (getProxySecret(env)) return null // secret present
  } catch {
    // 探测自身异常（异常 getter 等）视为「无可用 binding」，
    // 继续走到报错分支，而不是让调用方崩溃。
  }

  return (
    "KV proxy mode requires the JWT_SECRET (or ENCRYPTION_SECRET) " +
    "environment variable with at least 16 characters.\n" +
    "Reason: EdgeOne Node Functions cannot access KV directly and must go " +
    "through an Edge Function proxy, whose authentication depends on this " +
    "secret.\n" +
    "Add it under Environment Variables in the EdgeOne project settings, for " +
    "example:\n" +
    "  JWT_SECRET=<random string of 32+ characters>\n" +
    "Generate one with: openssl rand -hex 32"
  )
}

/**
 * 构建 HTTP 代理请求头
 */
function buildProxyHeaders(env?: EnvContext): HeadersInit {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  }

  // 内部调用标识（使用密钥前 16 位，Edge Function 侧常量时间比对）
  const sharedSecret = getProxySecret(env)
  if (sharedSecret) {
    headers["X-Internal-Call"] = sharedSecret.slice(0, 16)
  }

  // 如果有用户 token，也携带上（用于角色校验）
  const userToken = (env as any)?._currentUserToken
  if (userToken) {
    headers["Authorization"] = `Bearer ${userToken}`
  }

  return headers
}

/**
 * 获取 HTTP 代理基础 URL（必须是绝对地址）。
 *
 * Node 的 fetch 不接受相对 URL（会抛 ERR_INVALID_URL），因此这里不能返回 ""。
 * 优先级：
 *  1. EDGE_KV_BASE_URL —— 显式配置的完整地址（跨域 / 本地调试）
 *  2. __requestOrigin —— 由 index.ts 中间件注入的当前请求 origin，
 *     即同一部署的自身域名，用于 Node 云函数自调用 Edge Function
 */
function getProxyBaseUrl(env?: EnvContext): string {
  if (!env) return ""

  const explicit = (env as any).EDGE_KV_BASE_URL
  if (typeof explicit === "string" && explicit.startsWith("http")) {
    return explicit.replace(/\/$/, "")
  }

  const origin = (env as any).__requestOrigin
  if (typeof origin === "string" && origin.startsWith("http")) {
    return origin.replace(/\/$/, "")
  }

  return ""
}

/**
 * Resolve the proxy base URL, throwing an explicit error when it cannot be
 * determined.
 *
 * Centralises both preconditions (secret + origin) so the individual methods
 * do not repeat the checks, and so a cryptic ERR_INVALID_URL never reaches
 * the logs.
 */
function requireProxyBaseUrl(env?: EnvContext): string {
  const configError = checkProxyConfig(env)
  if (configError) {
    throw new Error("KV proxy misconfigured: " + configError.split("\n")[0])
  }

  const baseUrl = getProxyBaseUrl(env)
  if (!baseUrl) {
    throw new Error(
      "KV proxy base URL unavailable: cannot determine deployment origin. " +
        "Set EDGE_KV_BASE_URL to the deployment origin.",
    )
  }

  return baseUrl
}

export const kvDriver: Driver = {
  name: "kv",

  async isAvailable(env?: any): Promise<boolean> {
    // 模式1: 检查 KV binding
    if (getKvBinding(env) !== null) {
      return true
    }

    // 模式2: 检查 HTTP 代理是否可用（EdgeOne Node Functions）
    if (isEdgeOneNodeEnv(env)) {
      // 缺少必需密钥时直接判定不可用，并给出明确原因，
      // 避免发起注定 401 的请求让排查变困难。
      const configError = checkProxyConfig(env)
      if (configError) {
        console.error("[DB] KV proxy unavailable:\n" + configError)
        return false
      }

      const baseUrl = getProxyBaseUrl(env)
      if (!baseUrl) {
        console.error(
          "[DB] KV proxy unavailable: cannot determine deployment origin. " +
            "Set EDGE_KV_BASE_URL to the deployment origin.",
        )
        return false
      }

      try {
        const url = `${baseUrl}/kv-list?prefix=__health__`
        const response = await fetch(url, {
          method: "GET",
          headers: buildProxyHeaders(env),
        })
        // 200 表示代理与 KV 均可用；401 表示代理存在但鉴权失败
        return response.ok || response.status === 401
      } catch {
        return false
      }
    }
    
    return false
  },

  async init(env?: any): Promise<void> {
    // KV 无需初始化
  },

  async get(key: string, env?: any): Promise<string | null> {
    const kv = getKvBinding(env)
    
    // 模式1: Binding 模式
    if (kv) {
      // Cloudflare KV 用 get(key, "text")，EdgeOne KV 用 get(key, {type:"text"})。
      // 两者签名不兼容，按序尝试并对返回值做归一化，避免拿到对象导致上游 JSON.parse 失败。
      let value: any
      try {
        value = await kv.get(key, "text")
      } catch {
        value = undefined
      }
      if (value === undefined || value === null) {
        try {
          value = await kv.get(key, { type: "text" })
        } catch {
          value = null
        }
      }
      if (value === undefined || value === null) return null
      if (typeof value === "string") return value
      // 绑定误返回对象时统一序列化，保持 Driver.get 的 string 契约
      return JSON.stringify(value)
    }
    
    // 模式2: HTTP 代理模式
    if (isEdgeOneNodeEnv(env)) {
      const baseUrl = requireProxyBaseUrl(env)
      const url = `${baseUrl}/kv-get?key=${encodeURIComponent(key)}`
      
      try {
        const response = await fetch(url, {
          method: "GET",
          headers: buildProxyHeaders(env),
        })

        if (!response.ok) {
          if (response.status === 404) {
            return null
          }
          throw new Error(`KV proxy get failed: ${response.status}`)
        }

        const data = await response.json() as { value: string | null }
        return data.value
      } catch (err) {
        console.error(`[KV] get(${key}) failed:`, err)
        throw err
      }
    }
    
    throw new Error("KV binding not found")
  },

  async put(key: string, value: string, env?: any): Promise<void> {
    const kv = getKvBinding(env)
    
    // 模式1: Binding 模式
    if (kv) {
      await kv.put(key, value)
      return
    }
    
    // 模式2: HTTP 代理模式
    if (isEdgeOneNodeEnv(env)) {
      const baseUrl = requireProxyBaseUrl(env)
      const url = `${baseUrl}/kv-put`
      
      try {
        const response = await fetch(url, {
          method: "POST",
          headers: buildProxyHeaders(env),
          body: JSON.stringify({ key, value }),
        })

        if (!response.ok) {
          throw new Error(`KV proxy put failed: ${response.status}`)
        }
      } catch (err) {
        console.error(`[KV] put(${key}) failed:`, err)
        throw err
      }
      return
    }
    
    throw new Error("KV binding not found")
  },

  async delete(key: string, env?: any): Promise<void> {
    const kv = getKvBinding(env)
    
    // 模式1: Binding 模式
    if (kv) {
      await kv.delete(key)
      return
    }
    
    // 模式2: HTTP 代理模式
    if (isEdgeOneNodeEnv(env)) {
      const baseUrl = requireProxyBaseUrl(env)
      const url = `${baseUrl}/kv-delete?key=${encodeURIComponent(key)}`
      
      try {
        const response = await fetch(url, {
          method: "DELETE",
          headers: buildProxyHeaders(env),
        })

        if (!response.ok && response.status !== 404) {
          throw new Error(`KV proxy delete failed: ${response.status}`)
        }
      } catch (err) {
        console.error(`[KV] delete(${key}) failed:`, err)
        throw err
      }
      return
    }
    
    throw new Error("KV binding not found")
  },

  async list(prefix: string, env?: any): Promise<string[]> {
    const kv = getKvBinding(env)
    
    // 模式1: Binding 模式
    if (kv) {
      // EdgeOne KV list() 语义（依据官方 functions-kv 示例）：
      //   page.keys -> [{ key, ttl, meta }]，page.complete 为 true 表示末页，
      //   下一页 cursor 需手动取本页最后一个 key。
      const keys: string[] = []
      let cursor = ""
      let complete = false
      let guard = 0

      while (!complete && guard < 1000) {
        guard += 1

        const page = await kv.list({ prefix, cursor, limit: 256 })
        const pageKeys = Array.isArray(page?.keys) ? page.keys : []

        for (const item of pageKeys) {
          if (item?.key) keys.push(item.key)
        }

        if (pageKeys.length > 0) {
          cursor = pageKeys[pageKeys.length - 1].key || ""
        }

        complete = Boolean(page?.complete) || pageKeys.length === 0
      }

      return keys
    }
    
    // 模式2: HTTP 代理模式
    if (isEdgeOneNodeEnv(env)) {
      const baseUrl = requireProxyBaseUrl(env)
      const url = `${baseUrl}/kv-list?prefix=${encodeURIComponent(prefix)}`
      
      try {
        const response = await fetch(url, {
          method: "GET",
          headers: buildProxyHeaders(env),
        })

        if (!response.ok) {
          throw new Error(`KV proxy list failed: ${response.status}`)
        }

        const data = await response.json() as { keys: string[] }
        return data.keys || []
      } catch (err) {
        console.error(`[KV] list(${prefix}) failed:`, err)
        throw err
      }
    }
    
    throw new Error("KV binding not found")
  },

  async health(env?: any): Promise<any> {
    const kv = getKvBinding(env)
    
    // 模式1: Binding 模式
    if (kv) {
      try {
        await kv.get("__health_check__")
        return {
          driver: "kv",
          mode: "binding",
          available: true,
          platform: "Cloudflare KV / EdgeOne KV",
        }
      } catch (err: any) {
        return {
          driver: "kv",
          mode: "binding",
          available: false,
          error: err?.message || String(err),
        }
      }
    }
    
    // 模式2: HTTP 代理模式
    if (isEdgeOneNodeEnv(env)) {
      try {
        const baseUrl = getProxyBaseUrl(env)
        const url = `${baseUrl}/kv-list?prefix=__health__`
        
        const response = await fetch(url, {
          method: "GET",
          headers: buildProxyHeaders(env),
        })

        if (!response.ok) {
          const text = await response.text()
          return {
            driver: "kv",
            mode: "proxy",
            available: false,
            error: `HTTP ${response.status}: ${text}`,
          }
        }

        return {
          driver: "kv",
          mode: "proxy",
          available: true,
          platform: "EdgeOne KV (via Edge Function proxy)",
        }
      } catch (err: any) {
        return {
          driver: "kv",
          mode: "proxy",
          available: false,
          error: err.message || String(err),
        }
      }
    }
    
    return {
      driver: "kv",
      mode: "unknown",
      available: false,
      error: "KV binding not found and not in EdgeOne Node environment",
    }
  },
}
