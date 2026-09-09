/**
 * Cloudflare Durable Objects 驱动。
 *
 * 通过 DO binding 获取 stub，RPC 调用 OpenListDB 实例的方法。每个实例用
 * `idFromName` 定位（默认 ID "openlist-db"），保证数据持久在同一实例。
 *
 * 环境变量 / 配置：
 * - DO_BINDING: DO namespace binding 名称（默认 "OPENLIST_DO"）
 * - DO_ID: DO 实例名称（默认 "openlist-db"）
 *
 * 需在 wrangler.toml 配置（见文件顶部说明）：
 *   [[durable_objects.bindings]]
 *   name = "OPENLIST_DO"
 *   class_name = "OpenListDB"
 *   [[migrations]]
 *   tag = "v1"
 *   new_sqlite_classes = ["OpenListDB"]
 */
import type { Driver } from "../types"

function getDoBinding(env?: any): any | null {
  const e = env || (typeof globalThis !== "undefined" ? (globalThis as any) : {})
  const bindingName = e?.DO_BINDING || "OPENLIST_DO"
  return e?.[bindingName] || null
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
        error: "DO binding not found (expected env.OPENLIST_DO or env.DO_BINDING)",
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
