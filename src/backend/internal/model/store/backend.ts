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
import { checkProxyConfig, kvDriver } from "./driver/kv"
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
 * Serverless / Worker 类运行环境检测。
 *
 * 这些环境（Cloudflare Workers、EdgeOne Node 云函数等）多实例、随时冷启，
 * 内存存储完全无法持久化，且会给出「写入成功」的假象。
 *
 * 判定依据（任一成立即可，均为运行时特征而非环境变量，故无需用户配置）：
 *  - 存在 Web 平台特有对象（caches / WebSocketPair / EdgeOne 全局绑定）
 *  - 请求上下文中带有边缘平台注入的字段
 */
export function isServerlessRuntime(env?: any): boolean {
  const g = globalThis as any
  try {
    // Cloudflare Workers 特有
    if (typeof g.WebSocketPair === "function") return true
    if (typeof g.caches !== "undefined" && typeof g.caches?.default === "undefined") {
      // CF 的 caches.default 是 Workers 特征
      return true
    }
    // EdgeOne / 边缘平台注入的请求上下文标记
    if (env?.__requestOrigin) return true
    if (env?.EO_KV || env?.EDGEONE_KV || env?.worker_kv) return true
  } catch {
    // 忽略：检测失败时按非 serverless 处理（本地/容器）
  }
  return false
}

/**
 * 自动检测可用的驱动（优先级：blob → cfkv → kv → d1）。
 *
 * 若全部不可用：
 *  - 本地/容器环境：回退内存（便于开发调试）
 *  - Serverless / Worker 环境：**不回退内存**，抛错并引导用户配置，
 *    避免「操作成功但数据丢失」的假象
 */
async function autoDetectDriver(env?: any): Promise<Driver> {
  const candidates = [blobDriver, cfkvDriver, kvDriver, d1Driver]

  for (const driver of candidates) {
    if (await driver.isAvailable(env)) {
      console.log(`[DB] Auto-detected driver: ${driver.name}`)
      return driver
    }
  }

  if (isServerlessRuntime(env)) {
    // 禁止在 serverless 环境静默使用内存存储
    throw new Error(NO_STORAGE_MESSAGE)
  }

  console.warn(
    "[DB] No storage binding detected, falling back to memory (data will not persist).",
  )
  return memoryDriver
}

/**
 * 无可用存储驱动时的错误信息（英文）。
 *
 * 面向用户，需说明「为什么失败」与「如何解决」。
 */
export const NO_STORAGE_MESSAGE =
  "No storage backend is available. Data cannot be persisted in this " +
  "runtime (serverless environments cannot use in-memory storage).\n" +
  "Configure one of the following:\n" +
  "  1. EdgeOne Blob (recommended, zero config if the project provides it)\n" +
  "  2. EdgeOne KV: bind a KV namespace to Edge Functions, then set " +
  "DB_DRIVER=kv (DB_FORMAT=map or key) and JWT_SECRET\n" +
  "  3. Cloudflare KV / D1: bind the namespace and set DB_DRIVER accordingly\n" +
  "Environment variables to set in the project settings:\n" +
  "  DB_DRIVER=blob | kv | cfkv | d1\n" +
  "  DB_FORMAT=map | key | sql"

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
  // 缓存键必须包含「影响探测结果的环境特征」。
  // 仅用 driverName:formatName 是不够的：当 DB_DRIVER=auto 时，不同 env
  // 可能探测出不同驱动（如本地 env 回退 memory、serverless env 报错），
  // 共用缓存会返回错误结果。
  const runtimeTag = isServerlessRuntime(env) ? "sl" : "local"
  const config = `${driverName}:${formatName}:${runtimeTag}`

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
 *
 * 若为 EdgeOne KV 代理模式且缺少必需的密钥，会返回 configError，
 * 由上层接口透传给前端，避免用户只看到莫名的 401。
 */
export async function getStoreStatus(env?: any): Promise<any> {
  let driver: any = null
  let format: any = null
  let configError: string | null = null

  try {
    const resolved = await getStorageBackend(env)
    driver = resolved.driver
    format = resolved.format
  } catch (err: any) {
    // 无可用存储（如 serverless 环境未配置）时不应让状态接口崩溃，
    // 而是返回可读的配置错误。
    const msg = String(err?.message || err)
    return {
      driver: "none",
      format: "none",
      available: false,
      configError: msg.includes("No storage backend is available")
        ? NO_STORAGE_MESSAGE
        : msg,
    }
  }

  let health: any = null
  try {
    health = await driver.health(env)
  } catch (err: any) {
    health = { connected: false, error: err?.message || String(err) }
  }

  // 代理模式下的配置校验（缺密钥时给出可操作的提示）
  if (driver.name === "kv") {
    try {
      configError = checkProxyConfig(env)
    } catch {
      configError = null
    }
    if (configError) {
      console.error("[DB] KV proxy configuration error:\n" + configError)
    }
  }

  return {
    driver: driver.name,
    format: format.name,
    ...(health || {}),
    ...(configError ? { configError, available: false } : {}),
  }
}

/** 配置校验结果缓存，避免每请求重复计算（值随 env 罕见变化） */
const configErrorCache = new WeakMap<object, string | null>()
let configErrorCacheKey: object | null = null
let configErrorCacheValue: string | null = null

/**
 * 仅返回存储配置错误（无错误时为 null）。
 *
 * 供全局中间件在每个 API 请求上快速判断，避免为健康检查发起
 * 额外的网络探测。结果按 env 对象缓存。
 */
export async function getStoreConfigError(env?: any): Promise<string | null> {
  if (!env || typeof env !== "object") return null

  // WeakMap 直查
  if (configErrorCache.has(env)) {
    return configErrorCache.get(env) ?? null
  }
  // 同一引用快路径
  if (configErrorCacheKey === env) return configErrorCacheValue

  let result: string | null = null
  try {
    const { driver } = await getStorageBackend(env)
    if (driver.name === "kv") {
      result = checkProxyConfig(env)
      if (result) {
        console.error("[DB] KV proxy configuration error:\n" + result)
      }
    }
  } catch (err: any) {
    // 驱动解析失败（如 serverless 环境无可用存储）也要作为配置错误
    // 上报，而不是静默放行导致后续请求以内存模式"成功"。
    const msg = String(err?.message || err)
    if (msg.includes("No storage backend is available")) {
      result = NO_STORAGE_MESSAGE
    } else {
      result = msg
    }
    console.error("[DB] Storage configuration error:\n" + result)
  }

  configErrorCache.set(env, result)
  configErrorCacheKey = env
  configErrorCacheValue = result
  return result
}
