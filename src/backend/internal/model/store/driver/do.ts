/**
 * Cloudflare Durable Objects 驱动。
 *
 * 通过 DO binding 获取 stub，RPC 调用 OpenListDB 实例的方法。每个实例用
 * `idFromName` 定位（默认 ID "openlist-db"），保证数据持久在同一实例。
 *
 * 配置：
 * - DO binding 名固定为 `DO`
 * - DO_ID: DO 实例名称（可选，默认 "openlist-db"）
 *
 * 需在 wrangler.toml 配置：
 *   [[durable_objects.bindings]]
 *   name = "DO"
 *   class_name = "OpenListDB"
 *   [[migrations]]
 *   tag = "v1"
 *   new_sqlite_classes = ["OpenListDB"]
 */
import type { Driver } from "../types"

/**
 * 判断对象是否具备 Durable Object 命名空间接口形态。
 *
 * 必须校验：环境变量可能只是「绑定名」字符串，而非绑定对象，
 * 直接使用会得到 "binding.idFromName is not a function"。
 */
function isDoNamespaceLike(b: any): boolean {
  if (!b || typeof b !== "object") return false
  try {
    return typeof b.idFromName === "function"
  } catch {
    return false
  }
}

/**
 * 获取 Durable Object 绑定。
 *
 * 绑定名固定为 DO。env 与 globalThis 独立检查：env 为真值时不阻断对
 * globalThis 的探测。
 */
function getDoBinding(env?: any): any | null {
  const g = typeof globalThis !== "undefined" ? (globalThis as any) : {}
  if (isDoNamespaceLike(env?.DO)) return env.DO
  if (isDoNamespaceLike(g?.DO)) return g.DO
  return null
}

function getDoId(env?: any): string {
  const e = env || (typeof process !== "undefined" ? process.env : {}) || {}
  return String(e?.DO_ID || "openlist-db")
}

function getStub(env?: any): any | null {
  const binding = getDoBinding(env)
  if (!binding) return null
  try {
    const id = binding.idFromName(getDoId(env))
    return binding.get(id)
  } catch {
    return null
  }
}

export const doDriver: Driver = {
  name: "do",

  async isAvailable(env?: any): Promise<boolean> {
    return getDoBinding(env) != null
  },

  async init(env?: any): Promise<void> {
    const stub = getStub(env)
    if (stub && typeof stub.init === "function") {
      await stub.init()
    }
  },

  async get(key: string, env?: any): Promise<string | null> {
    const stub = getStub(env)
    if (!stub) throw new Error("DO binding not found")
    return await stub.kvGet(key)
  },

  async put(key: string, value: string, env?: any): Promise<void> {
    const stub = getStub(env)
    if (!stub) throw new Error("DO binding not found")
    await stub.kvPut(key, value)
  },

  async delete(key: string, env?: any): Promise<void> {
    const stub = getStub(env)
    if (!stub) throw new Error("DO binding not found")
    await stub.kvDelete(key)
  },

  async list(prefix: string, env?: any): Promise<string[]> {
    const stub = getStub(env)
    if (!stub) throw new Error("DO binding not found")
    return await stub.kvList(prefix)
  },

  async query(sql: string, params: any[], env?: any): Promise<any[]> {
    const stub = getStub(env)
    if (!stub) throw new Error("DO binding not found")
    return await stub.sqlQuery(sql, params)
  },

  async execute(sql: string, params: any[], env?: any): Promise<void> {
    const stub = getStub(env)
    if (!stub) throw new Error("DO binding not found")
    await stub.sqlExecute(sql, params)
  },

  async batch(
    statements: Array<{ sql: string; params: any[] }>,
    env?: any,
  ): Promise<void> {
    const stub = getStub(env)
    if (!stub) throw new Error("DO binding not found")
    await stub.sqlBatch(statements)
  },

  async health(env?: any): Promise<any> {
    const binding = getDoBinding(env)
    if (!binding) {
      return {
        configured: false,
        connected: false,
        platform: "Cloudflare Durable Objects",
        mode: "do",
        error: "DO binding not found (expected env.DO)",
      }
    }

    try {
      const stub = getStub(env)
      await stub.health()
      return {
        configured: true,
        connected: true,
        platform: "Cloudflare Durable Objects (SQLite)",
        mode: "do",
        doId: getDoId(env),
      }
    } catch (err: any) {
      return {
        configured: true,
        connected: false,
        platform: "Cloudflare Durable Objects",
        mode: "do",
        error: err?.message || String(err),
      }
    }
  },
}
