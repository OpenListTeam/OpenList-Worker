/**
 * 持久化后端工厂：按 DB_DRIVER 和 DB_FORMAT 环境变量选择驱动和格式。
 *
 * 新架构（驱动层 + 格式层分离）：
 * - DB_DRIVER: 底层存储驱动（auto/blob/cfkv/kv/d1/do/mysql）
 * - DB_FORMAT: 数据存储格式（map/key/sql）
 *
 * 向后兼容（旧配置自动映射）：
 * - DB_DRIVER=json → DB_FORMAT=map + 自动检测驱动
 * - DB_JSON_BACKEND=blob/kv/cf_rest → DB_DRIVER=blob/kv/cfkv
 */
import type {
  Driver,
  FormatAdapter,
  StorageDriver,
  StorageFormat,
  StoreBackend,
} from "./types"
import { blobDriver } from "./driver/blob"
import { cfkvDriver } from "./driver/cfkv"
import { kvDriver } from "./driver/kv"
import { d1Driver } from "./driver/d1"
import { doDriver } from "./driver/do"
import { mysqlDriver } from "./driver/mysql"
import { memoryDriver } from "./driver/memory"
import { mapFormat } from "./format/map"
import { keyFormat } from "./format/key"
import { sqlFormat } from "./format/sql"

/**
 * 读取环境变量（支持 process.env 和 env 对象）。
 */
function readEnv(key: string, defaultValue: string, env?: any): string {
  const e = env || (typeof process !== "undefined" ? process.env : {}) || {}
  return String(e[key] || "").trim().toLowerCase() || defaultValue
}

/**
 * 读取存储驱动配置。
 */
export function readDriver(env?: any): StorageDriver {
  const e = env || (typeof process !== "undefined" ? process.env : {}) || {}

  // 向后兼容：DB_JSON_BACKEND → DB_DRIVER
  if (e.DB_JSON_BACKEND) {
    const backend = String(e.DB_JSON_BACKEND).trim().toLowerCase()
    console.warn(
      "[DEPRECATED] DB_JSON_BACKEND is deprecated. Use DB_DRIVER instead.",
    )
    switch (backend) {
      case "blob":
        return "blob"
      case "kv":
      case "binding":
        return "kv"
      case "cf_rest":
      case "cf-rest":
      case "cfrest":
      case "rest":
      case "api":
        return "cfkv"
      default:
        return "auto"
    }
  }

  const driver = readEnv("DB_DRIVER", "auto", env) as StorageDriver

  // 向后兼容：DB_DRIVER=json → auto（整对象 JSON 由 DB_FORMAT=map 表达）
  if ((driver as string) === "json") {
    console.warn(
      "[DEPRECATED] DB_DRIVER=json is deprecated. Use DB_FORMAT=map instead.",
    )
    return "auto"
  }

  return driver
}

/**
 * 读取存储格式配置。
 */
export function readFormat(env?: any): StorageFormat {
  const e = env || (typeof process !== "undefined" ? process.env : {}) || {}

  // 向后兼容：DB_DRIVER=json → map
  if (String(e.DB_DRIVER || "").trim().toLowerCase() === "json") {
    return "map"
  }

  // 向后兼容：旧版 DB_DRIVER=kv（分表语义）且未指定格式 → key
  if (
    String(e.DB_DRIVER || "").trim().toLowerCase() === "kv" &&
    !e.DB_FORMAT
  ) {
    return "key"
  }

  return readEnv("DB_FORMAT", "map", env) as StorageFormat
}

/**
 * 自动检测可用的驱动（优先级：blob → cfkv → kv → d1 → memory 回退）。
 */
async function autoDetectDriver(env?: any): Promise<Driver> {
  const candidates = [blobDriver, cfkvDriver, kvDriver, d1Driver]

  for (const driver of candidates) {
    if (await driver.isAvailable(env)) {
      console.log(`[DB] Auto-detected driver: ${driver.name}`)
      return driver
    }
  }

  // 无可用存储绑定 → 回退到内存（不持久化），与旧版 json 后端行为一致
  console.warn(
    "[DB] No storage binding detected, falling back to memory (data will not persist).",
  )
  return memoryDriver
}

/**
 * 解析驱动。
 */
async function resolveDriver(name: StorageDriver, env?: any): Promise<Driver> {
  switch (name) {
    case "blob":
      return blobDriver
    case "cfkv":
      return cfkvDriver
    case "kv":
      return kvDriver
    case "d1":
      return d1Driver
    case "do":
      return doDriver
    case "mysql":
      return mysqlDriver
    case "auto":
      return await autoDetectDriver(env)
    default:
      throw new Error(`Unknown driver: ${name}`)
  }
}

/**
 * 解析格式。
 */
function resolveFormat(name: StorageFormat): FormatAdapter {
  switch (name) {
    case "map":
      return mapFormat
    case "key":
      return keyFormat
    case "sql":
      return sqlFormat
    default:
      throw new Error(`Unknown format: ${name}`)
  }
}

/**
 * 全局缓存。
 */
let cachedDriver: Driver | null = null
let cachedFormat: FormatAdapter | null = null
let cachedConfig: string | null = null

/**
 * 获取存储后端（驱动 + 格式）。
 */
export async function getStorageBackend(
  env?: any,
): Promise<{ driver: Driver; format: FormatAdapter }> {
  const driverName = readDriver(env)
  const formatName = readFormat(env)
  const config = `${driverName}:${formatName}`

  if (cachedDriver && cachedFormat && cachedConfig === config) {
    return { driver: cachedDriver, format: cachedFormat }
  }

  const driver = await resolveDriver(driverName, env)
  const format = resolveFormat(formatName)

  // 初始化驱动（建表等，幂等）
  if (driver.init) {
    try {
      await driver.init(env)
    } catch (err) {
      console.warn(`[DB] Driver init failed (${driver.name}):`, err)
    }
  }

  cachedDriver = driver
  cachedFormat = format
  cachedConfig = config

  console.log(`[DB] Using driver=${driver.name}, format=${format.name}`)
  return { driver, format }
}

/**
 * 获取存储后端（StoreBackend 旧接口，供 db.ts 使用）。
 */
export async function getStoreBackend(env?: any): Promise<StoreBackend> {
  const { driver, format } = await getStorageBackend(env)
  return {
    name: driver.name,
    load: (e?: any) => format.load(driver, e),
    save: (data: any, e?: any) => format.save(data, driver, e),
    isConfigured: (e?: any) => driver.isAvailable(e),
    init: (e?: any) => driver.init(e),
    health: (e?: any) => driver.health(e),
  }
}

/**
 * 当前后端的健康/连接状态，用于 /debug/info 与 /admin/kv/status。
 */
export async function getStoreStatus(env?: any): Promise<any> {
  const { driver, format } = await getStorageBackend(env)
  let health: any = null

  try {
    health = await driver.health(env)
  } catch (err: any) {
    health = { connected: false, error: err?.message || String(err) }
  }

  return {
    driver: driver.name,
    format: format.name,
    ...(health || {}),
  }
}
