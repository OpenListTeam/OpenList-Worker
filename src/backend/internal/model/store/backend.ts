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
    throw storeError("NO_STORAGE", NO_STORAGE_MESSAGE)
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
    e.MYSQL_URLS ||
      p.MYSQL_URLS ||
      e.MYSQL_HOST ||
      p.MYSQL_HOST,
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
 * 存储配置类错误的机器可读分类。
 *
 * 供 /public/env_check 与 /public/init_status 把「为什么不能用」透给前端：
 * 只给一句 "Storage driver is not configured correctly." 用户无法区分
 * 「组合写错」「绑定没配」「密钥缺失」「后端读不到」。
 */
export type StoreConfigErrorCode =
  | "INVALID_COMBINATION"
  | "DRIVER_UNAVAILABLE"
  | "UNKNOWN_DRIVER"
  | "NO_STORAGE"
  | "PROXY_CONFIG"
  | "HEALTH_ERROR"
  | "DRIVER_ERROR"

/** 构造带分类码的错误，供 getStoreStatus 折叠成 configErrorCode。 */
function storeError(code: StoreConfigErrorCode, message: string): Error {
  const err = new Error(message) as Error & { storeCode?: StoreConfigErrorCode }
  err.storeCode = code
  return err
}

/** 读取错误上的分类码（未标注时按 DRIVER_ERROR 处理）。 */
function errorCodeOf(err: any): StoreConfigErrorCode {
  return (err?.storeCode as StoreConfigErrorCode) || "DRIVER_ERROR"
}

/** 存储配置文档（与 server 层的 DOC_DRIVER 指向同一页） */
const STORAGE_DOC = "https://doc.oplist.org/ecosystem/official_worker/guide"

/**
 * 显式指定驱动不可用时的针对性提示。
 *
 * 只报「driver is not available」会让用户困惑于「我明明绑了」：每种驱动
 * 需要的前置条件差异很大（KV 还区分 CF 原生绑定与 EdgeOne 代理），因此
 * 逐驱动写清「需要什么」与替代方案。
 */
const DRIVER_UNAVAILABLE_HINTS: Record<string, string> = {
  kv:
    "The \"kv\" driver requires one of the following:\n" +
    "  - Cloudflare Workers: a KV namespace binding named exactly \"KV\" " +
    "(wrangler.jsonc: \"kv_namespaces\": [{ \"binding\": \"KV\" }]);\n" +
    "  - EdgeOne Node Functions: KV is NOT injected into Node functions, so the " +
    "Edge Function KV proxy must be reachable (known request origin / EO_KV_URLS) " +
    "and JWT_SECRET (>=16 chars, identical on the Edge Function side) must be set.\n" +
    "If neither applies, use DB_DRIVER=auto, DB_DRIVER=blob (EdgeOne) or " +
    "DB_DRIVER=d1 (Cloudflare).\n",
  d1:
    "The \"d1\" driver requires a Cloudflare D1 binding named \"DB\" " +
    "(wrangler.jsonc: \"d1_databases\": [{ \"binding\": \"DB\", ... }]).\n" +
    "EdgeOne has no D1 — use DB_DRIVER=blob there instead.\n",
  cfkv:
    "The \"cfkv\" driver requires Cloudflare API credentials: CF_ACCOUNT " +
    "(or CLOUDFLARE_ACCOUNT_ID), CF_KV_UUID (or CLOUDFLARE_KV_NAMESPACE_ID) " +
    "and CF_API_KEY (or CLOUDFLARE_API_TOKEN) with KV read/write permission.\n",
  do:
    "The \"do\" driver requires a Durable Objects namespace binding named \"DO\" " +
    "(wrangler.jsonc: \"durable_objects\": { \"bindings\": [{ \"name\": \"DO\", " +
    "\"class_name\": \"...\" }] } plus a matching migration).\n",
  mysql:
    "The \"mysql\" driver requires a Node runtime plus connection info " +
    "(MYSQL_URLS, or MYSQL_HOST/MYSQL_PORT/MYSQL_USER/MYSQL_PASS/MYSQL_NAME). " +
    "Cloudflare Workers cannot open raw TCP connections to MySQL.\n",
  blob:
    "The \"blob\" driver requires either the EdgeOne Blob SDK (only present " +
    "inside the EdgeOne Makers runtime) or an ESA_BLOB binding on Alibaba ESA.\n",
}

/**
 * 诊断缓存：显式驱动不可用时，「auto 探测会选中哪个后端」。
 *
 * 为什么要缓存：得到这个答案要跑一次真实探测（KV 代理会发 HTTP 探测请求），
 * 而配置错误期间每个请求都会走到这里。以 env 指纹做键，配置一变即失效；
 * 冷启动后重新计算。
 */
let autoFallbackHintCache: { key: string; hint: string } | null = null

/**
 * 报告「auto 会选中哪个可用后端」。
 *
 * 显式驱动不可用时，用户最需要知道的就是「那我该改成什么」——直接把答案写进
 * 错误里，抄一下即可，不必自己去猜绑定名或驱动名。
 *
 * 注意：这只是**诊断**，不改变「显式指定的驱动不回退」这一语义。
 * 内存兜底（本地开发）不作为建议，避免把生产部署引导到易失存储上。
 */
async function autoFallbackHint(env: any, requested: string): Promise<string> {
  const key = `${requested}:${isServerlessRuntime(env) ? "sl" : "local"}:${envFingerprint(env)}`
  if (autoFallbackHintCache?.key === key) return autoFallbackHintCache.hint

  let hint = ""
  try {
    const auto = await autoDetectDriver(env)
    if (auto && auto !== memoryDriver && auto.name !== requested) {
      hint =
        `Auto-detection would pick: DB_DRIVER=${auto.name} ` +
        `(or simply set DB_DRIVER=auto).\n`
    }
  } catch {
    // auto 也探测不到任何后端：保持原有提示（NO_STORAGE_MESSAGE 已在别处给出）
  }
  autoFallbackHintCache = { key, hint }
  return hint
}

/**
 * 驱动 × 格式组合校验。
 *
 * 历史上非法组合（如 DB_FORMAT=sql + DB_DRIVER=kv）要到真正读写时才在
 * sqlFormat 内抛 "Driver kv does not support SQL queries"：此时 env_check
 * 仍报 ready，用户看到「环境一切正常」却在初始化时 500。
 * 这里在解析阶段就拒绝，并列出该驱动支持的格式。
 */
function validateDriverFormat(driver: Driver, format: FormatAdapter): void {
  // get/put/delete/list 在接口上是必选，但运行时仍可能缺失（第三方/降级实现），
  // 因此这里按能力探测而非依赖类型声明。
  const d = driver as any
  const supportsKv = Boolean(d.get && d.put && d.delete && d.list)
  const supportsSql = Boolean(driver.query && driver.execute && driver.batch)
  const ok = format.name === "sql" ? supportsSql : supportsKv
  if (ok) return

  const supported = [supportsKv ? "map | key" : null, supportsSql ? "sql" : null]
    .filter(Boolean)
    .join(" | ")
  throw storeError(
    "INVALID_COMBINATION",
    `Invalid storage combination: DB_FORMAT="${format.name}" cannot be used with ` +
      `DB_DRIVER="${driver.name}".\n` +
      `Driver "${driver.name}" supports: ${supported || "no format"}.\n` +
      (format.name === "sql"
        ? "The \"sql\" format needs a relational driver (SQL query support): " +
          "d1 | do | mysql.\n"
        : `The "${format.name}" format needs a key-value driver ` +
          "(get/put/delete/list): kv | cfkv | blob | d1 | do | mysql.\n") +
      `Fix DB_FORMAT or DB_DRIVER. See ${STORAGE_DOC}`,
  )
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
    throw storeError(
      "UNKNOWN_DRIVER",
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
    throw storeError("NO_STORAGE", NO_STORAGE_MESSAGE)
  }

  if (!available) {
    throw storeError(
      "DRIVER_UNAVAILABLE",
      `DB_DRIVER is set to "${name}", but that driver is not available in ` +
        `this runtime. No fallback is performed for an explicitly configured ` +
        `driver.\n` +
        `Check the binding/credentials for "${name}", or set DB_DRIVER=auto ` +
        `to let the platform pick an available backend.\n` +
        (DRIVER_UNAVAILABLE_HINTS[name] || "") +
        (await autoFallbackHint(env, name)) +
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

  // 非法「驱动 × 格式」组合立即拒绝：否则要到真正读写时才报错，
  // 而 env_check 会显示 ready，用户看到「环境正常」却在初始化时 500。
  validateDriverFormat(driver, format)

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
  let configErrorCode: StoreConfigErrorCode | null = null

  try {
    const resolved = await getStorageBackend(env)
    driver = resolved.driver
    format = resolved.format
  } catch (err: any) {
    // 无可用存储（如 serverless 环境未配置）时不应让状态接口崩溃，
    // 而是返回可读的配置错误（含机器可读的分类码，供前端展示具体原因）。
    const msg = String(err?.message || err)
    return {
      driver: "none",
      format: "none",
      available: false,
      configError: msg.includes("No storage backend is available")
        ? NO_STORAGE_MESSAGE
        : msg,
      configErrorCode: errorCodeOf(err),
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
      configErrorCode = "PROXY_CONFIG"
      console.error("[DB] KV proxy configuration error:\n" + configError)
    }
  }

  return {
    driver: driver.name,
    format: format.name,
    ...(health || {}),
    ...(configError ? { configError, configErrorCode, available: false } : {}),
  }
}

/**
 * 判断当前环境是否拥有「可持久化」的存储。
 *
 * 判定为不可用的情况：
 *   - 没有任何驱动（driver 为 none / 空）
 *   - 退化为内存驱动（重启即丢，serverless 下不可接受）
 *   - 驱动配置存在错误
 *   - 驱动自报不健康（连接失败、鉴权失败等）
 */
export async function isPersistentStorageAvailable(env?: any): Promise<boolean> {
  const status = await getStorageStatusSafe(env)
  return isPersistentStatus(status)
}

/** 存储状态查询，任何异常都折叠成「不可用」状态而非抛出。 */
async function getStorageStatusSafe(env?: any): Promise<any> {
  try {
    return await getStoreStatus(env)
  } catch (err: any) {
    return {
      driver: "none",
      format: "none",
      available: false,
      configError: String(err?.message || err),
      configErrorCode: errorCodeOf(err),
    }
  }
}

/**
 * 持久化可用性的统一判定（单一来源）。
 *
 * 供 isPersistentStorageAvailable() 与 getStoreConfigError() 共用，
 * 避免两处规则漂移导致「自检说不可用、实际请求却放行」。
 */
function isPersistentStatus(status: any): boolean {
  const driver = String(status?.driver ?? "none")
  const hasDriver = driver !== "none" && driver !== ""
  const isMemory = driver === "memory"
  const hasConfigError = Boolean(status?.configError)
  // health 失败时 getStoreStatus 会带 available:false
  const driverHealthy = status?.available !== false
  return hasDriver && !isMemory && !hasConfigError && driverHealthy
}

/**
 * 存储配置错误的「原因 + 分类码」。
 *
 * 供全局中间件（503 拦截）与诊断接口（/public/env_check、/public/init_status）
 * 共用同一判定，避免两处规则漂移。
 *
 * @param opts.silent 不打印日志。诊断接口会被前端轮询（安装向导每秒一次），
 *        由调用方决定是否需要日志，避免刷屏。
 *
 * 不额外做缓存：getStorageBackend 内部已按 env 指纹缓存驱动解析，
 * 而 checkProxyConfig 是纯同步读取 env，开销可忽略。
 */
export async function getStoreConfigErrorDetail(
  env?: any,
  opts: { silent?: boolean } = {},
): Promise<{ code: StoreConfigErrorCode | null; message: string | null }> {
  const log = (label: string, msg: string) => {
    if (!opts.silent) console.error(label + msg)
  }
  if (!env || typeof env !== "object") return { code: null, message: null }

  // 缺代理密钥时优先给出「补密钥」这种可操作提示，而不是笼统的驱动错误。
  // checkProxyConfig 是纯同步读取，开销可忽略。
  //
  // 两种入口都要覆盖：
  //   1. 显式 DB_DRIVER=kv
  //   2. auto 模式最终选中 kv 驱动（否则用户只会看到不可读的 "HTTP 401"，
  //      而真正原因是 X-Internal-Call 的密钥与 Edge Function 不一致）
  const isKvRequested =
    String(env?.DB_DRIVER || "").trim().toLowerCase() === "kv"
  if (isKvRequested) {
    const kvIssue = checkProxyConfig(env)
    if (kvIssue) {
      log("[DB] KV proxy configuration error:\n", kvIssue)
      return { code: "PROXY_CONFIG", message: kvIssue }
    }
  }

  const status = await getStorageStatusSafe(env)

  // 配置齐全且健康：无错误
  if (isPersistentStatus(status)) return { code: null, message: null }

  // 选中了 kv 但代理不可用：区分「缺密钥」与「密钥不匹配」。
  // 后者表现为 HTTP 401 —— 代理已部署，只是 JWT_SECRET 与 Edge Function
  // 不一致或被轮换过，需要明确指出来才能排查。
  if (!isKvRequested && String(status?.driver ?? "") === "kv") {
    const kvIssue = checkProxyConfig(env)
    if (kvIssue) {
      log("[DB] KV proxy configuration error:\n", kvIssue)
      return { code: "PROXY_CONFIG", message: kvIssue }
    }
    if (status?.mode === "proxy" && status?.error?.includes("401")) {
      const hint =
        "KV proxy rejected the internal call (HTTP 401). The JWT_SECRET used " +
        "by this deployment does not match the one configured on the Edge " +
        "Functions serving the proxy. Make sure both use the same JWT_SECRET.\n" +
        "Alternatively set EO_KV_URLS to the correct deployment origin."
      log("[DB] KV proxy authentication failed:\n", hint)
      return { code: "PROXY_CONFIG", message: hint }
    }
  }

  // 已有明确原因（缺密钥 / 驱动解析失败 / 组合非法 / 健康检查失败）
  const reason: string | null = status?.configError
    ? String(status.configError)
    : null
  if (reason) {
    log("[DB] Storage configuration error:\n", reason)
    return {
      code: (status?.configErrorCode as StoreConfigErrorCode) || "DRIVER_ERROR",
      message: reason,
    }
  }

  // 内存兜底：serverless 下写入会静默丢失，需要可操作提示
  if (String(status?.driver ?? "none") === "memory") {
    log("[DB] Storage configuration error:\n", NO_STORAGE_MESSAGE)
    return { code: "NO_STORAGE", message: NO_STORAGE_MESSAGE }
  }

  const healthError = status?.error ? String(status.error) : null
  if (healthError) {
    log("[DB] Storage unhealthy:\n", healthError)
    return { code: "HEALTH_ERROR", message: healthError }
  }

  // 走到这里说明 isPersistentStatus 判为「不可用」但没有任何具体原因字段
  // （例如驱动自报 available:false 却未提供 error 文本）。此时**不能返回 null**，
  // 否则 503 拦截会静默失效，请求继续以「看似成功」的方式写进不可用后端。
  // 给出一条基于驱动名的兜底错误，保证判定与拦截始终一致。
  const driverName = String(status?.driver ?? "none")
  const fallback =
    driverName === "none" || driverName === ""
      ? NO_STORAGE_MESSAGE
      : `Storage driver "${driverName}" is not available in this runtime. ` +
        `Check its configuration and bindings, or set DB_DRIVER=auto.`
  log("[DB] Storage unavailable:\n", fallback)
  return {
    code: driverName === "none" || driverName === "" ? "NO_STORAGE" : "DRIVER_ERROR",
    message: fallback,
  }
}

/**
 * 仅返回存储配置错误（无错误时为 null）。
 *
 * 供全局中间件在每个 API 请求上做快速拦截。判定复用 getStoreStatus，
 * 因此与 isPersistentStorageAvailable() / /public/env_check 结论一致。
 */
export async function getStoreConfigError(
  env?: any,
  opts: { silent?: boolean } = {},
): Promise<string | null> {
  return (await getStoreConfigErrorDetail(env, opts)).message
}
