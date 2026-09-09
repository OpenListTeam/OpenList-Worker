/**
 * Cloudflare KV 驱动（binding 模式）
 * 
 * 环境变量：
 * - KV (Cloudflare KV binding)
 * - EDGEONE_KV (EdgeOne KV binding)
 */
import type { Driver } from "../types"

/**
 * 获取 KV binding
 */
function getKvBinding(env?: any): any | null {
  const e = env || (globalThis as any) || {}
  return e?.KV || e?.EDGEONE_KV || null
}

export const kvDriver: Driver = {
  name: "kv",

  async isAvailable(env?: any): Promise<boolean> {
    return getKvBinding(env) !== null
  },

  async init(env?: any): Promise<void> {
    // KV 无需初始化
  },

  async get(key: string, env?: any): Promise<string | null> {
    const kv = getKvBinding(env)
    if (!kv) throw new Error("KV binding not found")

    return await kv.get(key, "text")
  },

  async put(key: string, value: string, env?: any): Promise<void> {
    const kv = getKvBinding(env)
    if (!kv) throw new Error("KV binding not found")

    await kv.put(key, value)
  },

  async delete(key: string, env?: any): Promise<void> {
    const kv = getKvBinding(env)
    if (!kv) throw new Error("KV binding not found")

    await kv.delete(key)
  },

  async list(prefix: string, env?: any): Promise<string[]> {
    const kv = getKvBinding(env)
    if (!kv) throw new Error("KV binding not found")

    const keys: string[] = []
    let cursor: string | undefined

    do {
      const result = await kv.list({ prefix, cursor })
      keys.push(...(result?.keys || []).map((k: any) => k.name))
      cursor = result?.cursor
    } while (cursor)

    return keys
  },

  async health(env?: any): Promise<any> {
    const kv = getKvBinding(env)
    if (!kv) {
      return {
        configured: false,
        connected: false,
        platform: "Cloudflare KV",
        mode: "kv",
        error: "KV binding not found",
      }
    }

    try {
      await kv.get("__health_check__")
      return {
        configured: true,
        connected: true,
        platform: "Cloudflare KV",
        mode: "kv",
      }
    } catch (err: any) {
      return {
        configured: true,
        connected: false,
        platform: "Cloudflare KV",
        mode: "kv",
        error: err?.message || String(err),
      }
    }
  },
}
