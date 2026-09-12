/**
 * KV 驱动（自动适配 Cloudflare / EdgeOne）
 * 
 * 支持两种模式：
 * 1. Binding 模式：直接访问 KV binding（Cloudflare Workers / EdgeOne Edge Functions）
 * 2. HTTP 代理模式：通过 Edge Function 代理访问（EdgeOne Node Functions）
 * 
 * 自动检测环境并选择合适的模式。
 */
import { sanitizeProxyOrigin } from "../proxy"
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
  // 绑定名统一为 KV（KV namespace binding 的通用约定名）
  if (isWebKvLike(env?.KV)) return env.KV
  if (isWebKvLike(g?.KV)) return g.KV
  return null
}

/**
 * 获取代理内部调用密钥。
 *
 * Edge Function 侧用**完整密钥**校验 X-Internal-Call。
 *
 * 只从环境变量读取，原因：
 *  1. 若走 KV 回退读取密钥，则需要先访问 KV 才能拿密钥、拿密钥才能访问 KV，
 *     形成循环依赖；
 *  2. 打包产物中不能依赖源码相对路径的动态 import。
 *
 * 因此 KV 代理模式要求显式配置 JWT_SECRET（>=16 字符）。
 */
function getProxySecret(env?: EnvContext): string | null {
  try {
    const s = env?.JWT_SECRET
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
 *  2. No JWT_SECRET (>= 16 chars) is configured, so the proxy cannot be
 *     authenticated.
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
    "KV proxy mode requires the JWT_SECRET " +
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

  // 内部调用标识：提交**完整密钥**（Edge Function 侧常量时间比对）。
  // 不截断 —— 截断会把熵降到 64 bit，且该通道绕过管理员角色校验。
  const sharedSecret = getProxySecret(env)
  if (sharedSecret) {
    headers["X-Internal-Call"] = sharedSecret
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
 *  1. EO_KV_URLS —— 显式配置的完整地址（跨域 / 本地调试）
 *  2. __requestOrigin —— 由 index.ts 中间件注入的当前请求 origin，
 *     即同一部署的自身域名，用于 Node 云函数自调用 Edge Function
 */
function getProxyBaseUrl(env?: EnvContext): string {
  if (!env) return ""

  const explicit = (env as any).EO_KV_URLS
  if (explicit) {
    const safe = sanitizeProxyOrigin(explicit, env)
    if (safe) return safe
  }

  const origin = (env as any).__requestOrigin
  if (origin) {
    const safe = sanitizeProxyOrigin(origin, env)
    if (safe) return safe
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
/**
 * KV 代理健康探测（唯一实现）。
 *
 * isAvailable() 与 health() 共用，避免两处各自实现导致判定标准漂移。
 * 判定：HTTP 200 表示代理与 KV 均可用；401 表示代理可达但鉴权失败，
 * 属于「代理部署存在但密钥不对」，对外仍报告可用（由 checkProxyConfig
 * 在更早阶段拦下缺少密钥的情况）。
 */
async function probeProxy(
  env?: EnvContext,
): Promise<{ ok: boolean; status: number; error?: string }> {
  const configError = checkProxyConfig(env)
  if (configError) {
    return { ok: false, status: 0, error: configError.split("\n")[0] }
  }

  const baseUrl = getProxyBaseUrl(env)
  if (!baseUrl) {
    return {
      ok: false,
      status: 0,
      error:
        "cannot determine deployment origin. " +
        "Set EO_KV_URLS to the deployment origin.",
    }
  }

  try {
    const url = `${baseUrl}/kv-list?prefix=__health__`
    const response = await fetch(url, {
      method: "GET",
      headers: buildProxyHeaders(env),
    })
    return { ok: response.ok, status: response.status }
  } catch (err: any) {
    return { ok: false, status: 0, error: err?.message || String(err) }
  }
}

function requireProxyBaseUrl(env?: EnvContext): string {
  const configError = checkProxyConfig(env)
  if (configError) {
    throw new Error("KV proxy misconfigured: " + configError.split("\n")[0])
  }

  const baseUrl = getProxyBaseUrl(env)
  if (!baseUrl) {
    throw new Error(
      "KV proxy base URL unavailable: cannot determine deployment origin. " +
        "Set EO_KV_URLS to the deployment origin.",
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

    // 模式2: HTTP 代理（EdgeOne Node Functions 拿不到 binding）
    const probe = await probeProxy(env)
    if (!probe.ok && probe.status !== 401) {
      if (probe.error) console.error("[DB] KV proxy unavailable: " + probe.error)
      return false
    }
    return true
  },

  async init(env?: any): Promise<void> {
    // KV 无需初始化
  },

  async get(key: string, env?: any): Promise<string | null> {
    const kv = getKvBinding(env)
    
    // 模式1: Binding 模式
    if (kv) {
      // Cloudflare KV 用 get(key, "text")，EdgeOne KV 用 get(key, {type:"text"})，
      // 两者签名不兼容，需按序尝试并归一化返回值（避免拿到对象导致上游 JSON.parse 失败）。
      //
      // 但要区分「签名不兼容」与「真实故障」：
      //   - 签名不兼容会抛 TypeError（参数类型不符），此时才应回退到第二种签名；
      //   - 网络/权限错误（401、超时等）必须**原样抛出**，否则会被第二次尝试
      //     掩盖成 "key not found"，让调用方误判为数据不存在而写入错误状态。
      const isSignatureError = (e: any): boolean =>
        e instanceof TypeError ||
        /not a function|invalid|unexpected|argument/i.test(
          String(e?.message || ""),
        )

      let value: any
      try {
        value = await kv.get(key, "text")
      } catch (e) {
        if (!isSignatureError(e)) throw e
        value = undefined
      }

      if (value === undefined || value === null) {
        try {
          value = await kv.get(key, { type: "text" })
        } catch (e) {
          // 若第一种签名已成功执行（未抛签名错误），说明第二种只是"空结果"的回退，
          // 此时真实错误同样要抛出，不得吞掉。
          if (!isSignatureError(e)) throw e
          value = null
        }
      }

      if (value === undefined || value === null) return null
      if (typeof value === "string") return value
      // 绑定误返回对象时统一序列化，保持 Driver.get 的 string 契约
      return JSON.stringify(value)
    }
    
    // 模式2: HTTP 代理模式（无原生 binding → 经 Edge Function 代理）
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
  },

  async put(key: string, value: string, env?: any): Promise<void> {
    const kv = getKvBinding(env)
    
    // 模式1: Binding 模式
    if (kv) {
      await kv.put(key, value)
      return
    }
    
    // 模式2: HTTP 代理模式
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
  },

  async delete(key: string, env?: any): Promise<void> {
    const kv = getKvBinding(env)
    
    // 模式1: Binding 模式
    if (kv) {
      await kv.delete(key)
      return
    }
    
    // 模式2: HTTP 代理模式
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
    
    // 模式2: HTTP 代理模式。
    //
    // 判定比 isAvailable 更严格：健康状态必须真正可读写，401 表示鉴权
    // 失败（代理在但密钥不对），对依赖持久化的接口而言应报不可用，
    // 而不是被 /env_check 判定为 ready。共用 probeProxy 仅复用探测动作。
    const probe = await probeProxy(env)
    if (!probe.ok) {
      return {
        driver: "kv",
        mode: "proxy",
        available: false,
        error: probe.error || `HTTP ${probe.status}`,
      }
    }

    return {
      driver: "kv",
      mode: "proxy",
      available: true,
      platform: "EdgeOne KV (via Edge Function proxy)",
    }
  },
}
