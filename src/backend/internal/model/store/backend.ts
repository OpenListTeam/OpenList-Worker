/**
 * 持久化后端工厂：按 DB_DRIVER 环境变量选择后端（默认 json）。
 */
import type { StoreBackend } from "./types"
import { jsonBackend } from "./json"
import { d1Backend } from "./d1"
import { mysqlBackend } from "./mysql"

export function readDriver(env?: any): string {
  const e = env || (typeof process !== "undefined" ? process.env : {}) || {}
  return (
    String(e?.DB_DRIVER || "")
      .trim()
      .toLowerCase() || "json"
  )
}

function resolveBackend(driver: string): StoreBackend {
  switch (driver) {
    case "d1":
      return d1Backend
    case "mysql":
      return mysqlBackend
    case "json":
    default:
      return jsonBackend
  }
}

let cachedBackend: StoreBackend | null = null
let cachedDriver: string | null = null

export async function getStoreBackend(env?: any): Promise<StoreBackend> {
  const driver = readDriver(env)
  if (cachedBackend && cachedDriver === driver) return cachedBackend

  const backend = resolveBackend(driver)
  if (backend.init) {
    try {
      await backend.init(env)
    } catch (err) {
      console.warn(`[DB] store backend init failed (${driver}):`, err)
    }
  }
  cachedBackend = backend
  cachedDriver = driver
  return backend
}

/** 当前后端的健康/连接状态，用于 /debug/info 与 /admin/kv/status。 */
export async function getStoreStatus(env?: any): Promise<any> {
  const backend = await getStoreBackend(env)
  let health: any = null
  if (backend.health) {
    try {
      health = await backend.health(env)
    } catch (err: any) {
      health = { connected: false, error: err?.message || String(err) }
    }
  }
  return { driver: backend.name, ...(health || {}) }
}

export { jsonBackend, d1Backend, mysqlBackend }
