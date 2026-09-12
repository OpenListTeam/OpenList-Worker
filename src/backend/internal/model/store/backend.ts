/**
 * 持久化后端工厂：按 DB_DRIVER 和 DB_FORMAT 环境变量选择驱动和格式。
 *
 * 新架构（驱动层 + 格式层分离）：
 * - DB_DRIVER: 底层存储驱动（auto/blob/cfkv/kv/d1/do/mysql）
 * - DB_FORMAT: 数据存储格式（map/key/sql）
 *
 * 向后兼容（旧配置自动映射）：
 * - DB_DRIVER=json → DB_FORMAT=map + 自动检测驱动
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
 * 是否处于 Serverless / Worker 类运行环境。
 *
 * 判定目的：这些环境（Cloudflare Workers、EdgeOne Edge/Node 云函数、
 * 阿里云 ESA 函数等）多实例、随时冷启，**内存存储完全无法持久化**，
 * 且会给出「写入成功」的假象。因此在此类环境中永不使用内存后端。
 *
 * 判定依据全部为运行时特征（不依赖用户配置），命中任一即成立：
 *  1. EdgeOne：请求上下文标记、KV/Blob 相关绑定、EdgeOne 专属全局变量
 *  2. Cloudflare Workers：WebSocketPair / caches.default / CF 绑定
 *  3. 阿里云 ESA：ESA 全局对象与绑定
 *  4. 通用：注入型请求上下文（__requestOrigin / __requestContext）
 */
export function isServerlessRuntime(env?: any): boolean {
  const g = globalThis as any
  try {
    // ── 通用：请求上下文由平台注入 ──
    if (env?.__requestOrigin || env?.__requestContext || env?.__makersContext) {
      return true
    }

    // ── EdgeOne ──
    if (
      env?.EDGEONE_BLOB ||
      g?.EDGEONE_BLOB ||
      typeof g?.EdgeOne !== "undefined"
    ) {
      return true
    }

    // ── Cloudflare Workers ──
    // WebSocketPair 是 Workers 运行时专有的全局构造函数
    if (typeof g.WebSocketPair === "function") return true
    // caches.default 是 Workers 的 Cache API 形态
    if (typeof g.caches !== "undefined" && g.caches?.default) return true

    // ── 阿里云 ESA ──
    if (
      env?.ESA_BLOB ||
      g?.ESA_BLOB ||
      typeof g?.ESA !== "undefined"
    ) {
      return true
    }

    // ── EdgeOne Node 云函数环境变量特征 ──
    // 平台会注入 SCF 相关变量，可据此识别（固定变量名，平台自动注入）
    if (
      env?.TENCENTCLOUD_SCF_FUNCTIONNAME ||
      (typeof process !== "undefined" && process.env?.TENCENTCLOUD_SCF_FUNCTIONNAME)
    ) {
      return true
    }
  } catch {
    // 检测自身的异常不应影响判定；保守视为非 serverless（本地/容器）
  }
  return false
}

/**
 * 自动检测可用的驱动（优先级：mysql → d1 → kv → cfkv → blob → do）。
 *
 * mysql 仅在显式配置连接信息时参与探测（详见 hasMysqlConfig）。
 *
 * 若全部不可用：
 *  - 本地/容器环境：回退内存（便于开发调试）
 *  - Serverless / Worker 环境：**不回退内存**，抛错并引导用户配置，
 *    避免「操作成功但数据丢失」的假象
 */
async function autoDetectDriver(env?: any): Promise<Driver> {
  // 检测顺序：mysql → d1 → kv → cfkv → blob → do
  //
  // - mysql 需要网络连接，只有显式配置了连接信息才尝试，否则每次 auto 探测
  //   都会先尝试建 TCP 连接（失败后继续），在 CF/EO 等边缘环境上纯属浪费。
  // - kv 与 cfkv 同为 KV 语义：优先本地 binding（更直接、更快），
  //   其次才走 Cloudflare REST API。
  const candidates: Driver[] = []

  if (hasMysqlConfig(env)) candidates.push(mysqlDriver)
  candidates.push(d1Driver, kvDriver, cfkvDriver, blobDriver, doDriver)

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
 * 是否显式配置了 MySQL 连接信息。
 *
 * 用于决定 auto 模式是否尝试 mysql 驱动：MySQL 是网络连接，
 * 无配置时探测会产生无谓的 TCP 建连开销，必须由运维显式声明。
 */
function hasMysqlConfig(env?: any): boolean {
  const e = env || {}
  const p = typeof process !== "undefined" ? process.env || {} : {}
  return Boolean(
    e.MYSQL_URL ||
      p.MYSQL_URL ||
      e.MYSQL_HOST ||
      p.MYSQL_HOST ||
      e.MYSQL_URLS ||
      p.MYSQL_URLS,
  )
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
  "  DB_DRIVER=blob | kv | cfkv | d1 | do | mysql\n" +
  "  DB_FORMAT=map | key | sql"

/** 驱动名 → 实现 */
const DRIVER_MAP: Record<string, Driver> = {
  blob: blobDriver,
  cfkv: cfkvDriver,
  kv: kvDriver,
  d1: d1Driver,
  do: doDriver,
  mysql: mysqlDriver,
}

/**
 * 解析驱动。
 *
 * 语义约定：
 *  - `auto`：按优先级探测，全部不可用时：worker 环境报错，本地回退内存。
 *  - 显式指定（如 DB_DRIVER=kv）：**不回退**。若该驱动不可用则直接报错，
 *    避免用户以为在用 KV、实际却落到别的后端或内存里。
 */
async function resolveDriver(name: StorageDriver, env?: any): Promise<Driver> {
  if (name === "auto") {
    return await autoDetectDriver(env)
  }

  const driver = DRIVER_MAP[name]
  if (!driver) {
    throw new Error(
      `Unknown DB_DRIVER "${name}". Valid values: auto, ${Object.keys(
        DRIVER_MAP,
      ).join(", ")}`,
    )
  }

  // 显式指定时必须可用，否则报错（不回退）
  let available = false
  try {
    available = await driver.isAvailable(env)
  } catch {
    available = false
  }

  // 内存驱动在 worker 环境永不接受：数据会随实例销毁而消失，
  // 但接口仍返回成功，属于最危险的一类「静默数据丢失」。
  if (driver === memoryDriver && isServerlessRuntime(env)) {
    throw new Error(NO_STORAGE_MESSAGE)
  }

  if (!available) {
    throw new Error(
      `DB_DRIVER is set to "${name}", but that driver is not available in ` +
        `this runtime. No fallback is performed for an explicitly configured ` +
        `driver.\n` +
        `Check the binding/credentials for "${name}", or set DB_DRIVER=auto ` +
        `to let the platform pick an available backend.\n` +
        `Environment: ${isServerlessRuntime(env) ? "serverless/worker" : "local/container"}`,
    )
  }

  console.log(`[DB] Using explicitly configured driver: ${driver.name}`)
  return driver
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
 * env 对象的稳定身份编号。
 *
 * 为什么需要：auto 模式下驱动探测结果取决于「该 env 里有哪些绑定」。
 * 若仅以 driverName:formatName 做缓存键，同一个进程内先后出现两个不同
 * env（一个有 Blob、一个只有 KV）时会串味。这里给每个 env 对象分配一个
 * 稳定的自增 ID（WeakMap，不阻止 GC），把「是否同一个 env」纳入缓存键。
 *
 * 代价极低：同一 env 对象多次调用恒得同一 ID；不同对象则重探测一次。
 */
const envIds = new WeakMap<object, number>()
let envIdSeq = 0
function envFingerprint(env?: any): string {
  if (env && (typeof env === "object" || typeof env === "function")) {
    let id = envIds.get(env as object)
    if (id === undefined) {
      id = ++envIdSeq
      envIds.set(env as object, id)
    }
    return String(id)
  }
  return "none"
}

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
  // 可能探测出不同驱动（如本地 env 回退 memory、serverless env 报错，
  // 或一个 env 有 Blob 绑定、另一个只有 KV），共用缓存会返回错误结果。
  // 因此额外纳入「运行时类型 + env 身份」。
  const runtimeTag = isServerlessRuntime(env) ? "sl" : "local"
  const config = `${driverName}:${formatName}:${runtimeTag}:${envFingerprint(env)}`

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
    // 驱动解析失败（如显式指定驱动不可用、worker 环境无存储）也要作为
    // 配置错误上报，而不是静默放行导致后续请求以内存模式"成功"。
    const msg = String(err?.message || err)

    // 优先给出更精确的原因：显式配置 kv 但缺少代理密钥时，
    // 直接提示补密钥比笼统的"驱动不可用"更可操作。
    const isKvRequested =
      String(env?.DB_DRIVER || "").trim().toLowerCase() === "kv"
    const kvSecretIssue = isKvRequested ? checkProxyConfig(env) : null

    if (kvSecretIssue) {
      result = kvSecretIssue
      console.error("[DB] KV proxy configuration error:\n" + result)
    } else if (msg.includes("No storage backend is available")) {
      result = NO_STORAGE_MESSAGE
      console.error("[DB] Storage configuration error:\n" + result)
    } else {
      result = msg
      console.error("[DB] Storage configuration error:\n" + result)
    }
  }

  configErrorCache.set(env, result)
  configErrorCacheKey = env
  configErrorCacheValue = result
  return result
}
