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
import {
  DB_CIPHER_VALUES,
  DEFAULT_DB_CIPHER,
  resolveDbCipher,
  type DbCipher,
} from "../../../pkg/crypto"

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
 *
 * 契约（与官方文档一致）：DB_FORMAT 与 DB_DRIVER 是**正交**的两个维度 ——
 * 前者决定「怎么组织数据」（map / key / sql），后者决定「存到哪里」。
 * 因此 DB_FORMAT 缺省时**一律取全局默认 map**，绝不按驱动名改写：
 * kv / d1 / blob / do / mysql 的缺省格式都是 map。
 *
 * 历史遗留（已移除）：旧版 DB_DRIVER=kv 承担「分表存储」语义，重构为
 * 「驱动层 + 格式层分离」后曾加过一条 `DB_DRIVER=kv 且无 DB_FORMAT → key`
 * 的兼容映射。它的代价是「只设了 DB_DRIVER」的结果依赖驱动名（d1 得 map、
 * kv 得 key），且升级用户会静默从 map 布局切到 key 布局（两种布局的键名
 * 不同，互相读不到）。分表请显式配置 DB_FORMAT=key。
 */
export function readFormat(env?: any): StorageFormat {
  const e = env || (typeof process !== "undefined" ? process.env : {}) || {}

  // 向后兼容：DB_DRIVER=json → map（旧驱动别名，与 readDriver 的 json→auto 成对）
  if (String(e.DB_DRIVER || "").trim().toLowerCase() === "json") {
    return "map"
  }

  return readEnv("DB_FORMAT", "map", env) as StorageFormat
}

/**
 * 读取数据库字段加密算法（DB_CIPHER）。
 *
 * 契约（与 DB_DRIVER / DB_FORMAT 同为「正交的一维」）：只决定**敏感字段如何
 * 落盘**，不改变存储位置与数据组织方式。
 *
 *   none（默认）              - 不加密，敏感字段与普通 JSON 一样明文落盘
 *   aes-256-gcm              - HKDF-SHA256 派生一把 AES-256-GCM 密钥（enc:v2:）
 *   aes-256-gcm-pbkdf2       - AES-256-GCM，PBKDF2-SHA256(10 万次) 派生（enc:v1:，慢）
 *   aes-256-cbc-hmac         - AES-256-CBC + HMAC-SHA256（enc:v3:，Encrypt-then-MAC）
 *   chacha20-poly1305        - ChaCha20-Poly1305（enc:v4:，RFC 8439，纯 JS）
 *   des-cbc-hmac             - 单 DES-CBC + HMAC-SHA256（enc:v5:，**仅兼容，不安全**）
 *  3des-cbc-hmac             - 3DES-CBC + HMAC-SHA256（enc:v6:，**仅兼容，已弃用**）
 *
 * 为什么默认 none：加密会让「共享库给 Go 后端 / 直接用 SQL 查询」变得不可读，
 * 且读取时需逐字段解密（详见 #69 的 CPU 优化）。需要静态加密的部署显式配置即可；
 * 历史密文带 `enc:vN:` 前缀，读取时按前缀自动解密，因此从加密切回 none
 * **不会导致数据不可读**，只会在下次写入时转为明文（自动迁移）。
 *
 * DES/3DES 只作为「非 AES 族」的兼容选项存在：单 DES 的 56-bit 密钥可被暴力破解，
 * 3DES 已被 NIST SP 800-131A 弃用，二者都不应保护真实数据（见 crypto.ts 的
 * WEAK_DB_CIPHERS 与一次性告警）。
 *
 * 取值无法识别时告警并回退 none（而不是静默启用某个算法）。注意：读取时
 * 解密算法由密文前缀决定，与本函数取值无关 —— 拼错变量只会影响**新写入**。
 */
export function readCipher(env?: any): DbCipher {
  const raw = readEnv("DB_CIPHER", DEFAULT_DB_CIPHER, env)
  const { cipher, known } = resolveDbCipher(raw)
  if (!known) {
    console.warn(
      `[DB] Unknown DB_CIPHER "${raw}"; falling back to "${DEFAULT_DB_CIPHER}". ` +
        `Valid values: ${DB_CIPHER_VALUES.join(", ")}.`,
    )
  }
  return cipher
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
    // 禁止在 serverless 环境静默使用内存存储。
    //
    // 这里必须带上 hint（否则 hintOf(err) 为 null，上层会回退到「Bind a storage
    // backend or set DB_DRIVER=auto」这句通用话术）。该话术在 auto 模式下会形成
    // **循环建议**：用户本来就已经是 auto，却被告知「请设置 auto」。
    // 能走到这里说明「auto 已探测过所有候选驱动且一个都不可用」，因此真正缺的是
    // **绑定**，而不是改配置值 —— hint 要说清「绑什么」。
    throw storeError(
      "NO_STORAGE",
      NO_STORAGE_MESSAGE,
      noStorageHint(env),
    )
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
 * 无可用存储时的一句话修复建议（英文），随运行时平台给出「绑什么」。
 *
 * ## 为什么不能复用「set DB_DRIVER=auto」
 *
 * auto 模式下 `DB_DRIVER` **本来就是 auto**。此时还提示「set DB_DRIVER=auto」，
 * 用户会陷入循环：改也改过了、报错依旧。真实原因是「auto 已把所有候选驱动探测
 * 了一遍，一个都不可用」——缺的是**平台侧绑定**，不是配置值。
 *
 * 因此这里按平台给出可执行动作，并**明确点出 auto 已经试过了**，避免用户再去
 * 改那个已经正确的变量。
 *
 * 与 `driverNotAvailableHint` 的区别：那个分支处理「显式指定了某个不可用的
 * 驱动」；本函数处理「未指定（或 auto）且没有任何驱动可用」。
 */
function noStorageHint(env?: any): string {
  const g = globalThis as any
  const isEdgeOne =
    Boolean(env?.EDGEONE_BLOB || g?.EDGEONE_BLOB) ||
    typeof g?.EdgeOne !== "undefined" ||
    Boolean(
      env?.TENCENTCLOUD_SCF_FUNCTIONNAME ||
        (typeof process !== "undefined" &&
          process.env?.TENCENTCLOUD_SCF_FUNCTIONNAME),
    )
  const isEsa = Boolean(env?.ESA_BLOB || g?.ESA_BLOB) || typeof g?.ESA !== "undefined"
  // 无 CF 专属绑定特征时才可能是 CF；ESA/EdgeOne 已在上方排除
  const isCloudflare = !isEdgeOne && !isEsa

  if (isEdgeOne) {
    return (
      "DB_DRIVER=auto already probed every driver. On EdgeOne, bind a Blob " +
      "store (or enable the EdgeOne Blob SDK), or bind a KV namespace to an " +
      "Edge Function and proxy it (Node functions do not receive KV bindings)."
    )
  }
  if (isEsa) {
    return (
      "DB_DRIVER=auto already probed every driver. On Alibaba ESA, bind an " +
      "ESA_BLOB store, or set DB_DRIVER=blob."
    )
  }
  if (isCloudflare) {
    return (
      "DB_DRIVER=auto already probed every driver. On Cloudflare Workers, add " +
      'a binding to wrangler.jsonc: D1 as {"d1_databases":[{"binding":"DB"}]} ' +
      'or KV as {"kv_namespaces":[{"binding":"KV"}]}, then redeploy so the ' +
      "binding is injected."
    )
  }
  return (
    "DB_DRIVER=auto already probed every driver. Bind a persistent backend " +
    "(Cloudflare: D1/KV; EdgeOne: Blob; ESA: ESA_BLOB), then redeploy."
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

/**
 * 显式指定 DB_DRIVER=memory 但运行在 serverless 环境时的错误文案。
 *
 * 语义裁决：`memory` 是**合法驱动名**（不是拼写错误），但只在本地 Node 运行时
 * 有效。serverless（EdgeOne / Cloudflare / ESA）多实例、随时冷启，内存写入
 * 立刻随实例销毁而消失，却仍向调用方返回成功 —— 属于最危险的「静默数据丢失」，
 * 因此在此环境下一律判为「无可用存储」（NO_STORAGE）。
 *
 * 文案约束（见 server/storage-error.ts 的 reasonLines）：诊断接口只透传前 3 行，
 * 因此结论、原因、下一步动作必须全部落在前 3 行内。
 */
export const MEMORY_SERVERLESS_MESSAGE =
  'DB_DRIVER="memory" is only valid on a local Node runtime.\n' +
  "This deployment is serverless, where in-memory storage loses all data immediately.\n" +
  "Set DB_DRIVER=auto, or bind a persistent backend (D1 / KV / Blob)."

/** 驱动名 → 实现（memory 不在此表中，由 resolveDriver 单独处理，见下） */
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

/**
 * 构造带分类码的错误，供 getStoreStatus 折叠成 configErrorCode。
 *
 * `hint` 是给用户看的**一句话修复建议**（「改什么」），与 `message`（完整排查
 * 说明）分开：
 *   - message 在诊断接口里会被截断（见 server/public.ts 的 reasonLines），
 *     只透传前 3 行，因此「答案」不能只放在 message 末尾；
 *   - 前端需要把建议放在显眼位置单独展示，靠解析 message 文案不可靠。
 */
function storeError(
  code: StoreConfigErrorCode,
  message: string,
  hint?: string,
): Error {
  const err = new Error(message) as Error & {
    storeCode?: StoreConfigErrorCode
    storeHint?: string
  }
  err.storeCode = code
  if (hint) err.storeHint = hint
  return err
}

/** 读取错误上的一句话修复建议（没有则返回 null）。 */
function hintOf(err: any): string | null {
  const hint = err?.storeHint
  return typeof hint === "string" && hint.trim() ? hint.trim() : null
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
    "and JWT_SECRET (identical on the Edge Function side) must be set.\n" +
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
let autoPickCache: { key: string; driver: Driver | null } | null = null

/**
 * 显式驱动不可用时，auto 会选中哪个可用后端（没有则 null）。
 *
 * **只用于提示，绝不改变语义**：显式配置了 DB_DRIVER 就绝不回退 —— 回退会把
 * 数据写到用户没有指定的后端上，而且「暂时性不可用」（KV 代理 401、网络抖动）
 * 也会触发切换，恢复后读路径又切回去，造成数据分裂。这里只是把「那你该改成
 * 什么」算出来，直接写进错误文案与诊断字段，用户抄一下即可。
 *
 * 内存兜底（本地开发）不算可用后端：避免把生产部署引导到易失存储上。
 */
async function autoPickDriver(
  env: any,
  requested: string,
): Promise<Driver | null> {
  const key = `${requested}:${isServerlessRuntime(env) ? "sl" : "local"}:${envFingerprint(env)}`
  if (autoPickCache?.key === key) return autoPickCache.driver

  let driver: Driver | null = null
  try {
    const auto = await autoDetectDriver(env)
    if (auto && auto !== memoryDriver && auto.name !== requested) driver = auto
  } catch {
    // auto 也探测不到任何后端：保持原有提示（NO_STORAGE_MESSAGE 已在别处给出）
  }
  autoPickCache = { key, driver }
  return driver
}

/** 「auto 会选谁」的一行文案（没有可用后端时为空串）。 */
function autoPickHint(driver: Driver | null): string {
  return driver
    ? `Auto-detection would pick: DB_DRIVER=${driver.name} ` +
        `(or simply set DB_DRIVER=auto).\n`
    : ""
}

/**
 * 驱动 × 格式组合校验。
 *
 * 历史上非法组合（如 DB_FORMAT=sql + DB_DRIVER=kv）要到真正读写时才在
 * sqlFormat 内抛 "Driver kv does not support SQL queries"：此时 env_check
 * 仍报 ready，用户看到「环境一切正常」却在初始化时 500。
 * 这里在解析阶段就拒绝，并列出该驱动支持的格式。
 *
 * ## 为什么需要「显式白名单」，而不仅是能力探测
 *
 * 能力探测（有没有 get/put/delete/list）只能区分「KV 语义 / 关系语义」，
 * 无法表达某个驱动**只支持其中一种 KV 格式**。典型是 blob：
 *
 *   - blob 的 `get/put/delete/list` 齐备，因此按能力探测它能通过 map **和** key；
 *   - 但 blob 存储的实质是「一整个 JSON 文档」，只有 map 是自洽的：
 *     key 格式会把对象摊平成多条 `prefix:key` 记录，而 blob 只能整存整取，
 *     落到 blob 上既写不出多个键、也 list 不出真实结构 —— 运行时才炸。
 *
 * 因此这里叠加一层白名单：能表达「blob 仅 map」这种细粒度约束，
 * 且未来若某驱动支持 map/sql 但**不支持** key，也能直接声明。
 */
const DRIVER_FORMAT_WHITELIST: Record<string, StorageFormat[]> = {
  // blob：单文档存储，只支持整存整取的 map
  blob: ["map"],
  // 显式列出其余驱动，避免新增驱动时「忘了加白名单 = 全放行」的静默风险。
  kv: ["map", "key"],
  cfkv: ["map", "key"],
  d1: ["map", "key", "sql"],
  do: ["map", "key", "sql"],
  mysql: ["map", "key", "sql"],
  memory: ["map", "key"],
}

function validateDriverFormat(driver: Driver, format: FormatAdapter): void {
  // get/put/delete/list 在接口上是必选，但运行时仍可能缺失（第三方/降级实现），
  // 因此这里按能力探测而非依赖类型声明。
  const d = driver as any
  const supportsKv = Boolean(d.get && d.put && d.delete && d.list)
  const supportsSql = Boolean(driver.query && driver.execute && driver.batch)

  // ① 能力探测：先排除与驱动**语义**根本不符的格式（如给 kv 配 sql）。
  const capabilityOk = format.name === "sql" ? supportsSql : supportsKv

  // ② 白名单：再排除「语义上属于该类、但该驱动并不支持」的格式（如 blob + key）。
  //    未登记的驱动按「不限制」处理（保留第三方驱动的可扩展性），
  //    但内置驱动全部显式登记，见上表。
  const whitelist = DRIVER_FORMAT_WHITELIST[driver.name]
  const whitelistOk = !whitelist || whitelist.includes(format.name as StorageFormat)

  if (capabilityOk && whitelistOk) return

  const supported = (
    whitelist ??
    [supportsKv ? "map | key" : null, supportsSql ? "sql" : null].filter(Boolean)
  ).join(" | ")

  throw storeError(
    "INVALID_COMBINATION",
    `Invalid storage combination: DB_FORMAT="${format.name}" cannot be used with ` +
      `DB_DRIVER="${driver.name}".\n` +
      `Driver "${driver.name}" supports: ${supported || "no format"}.\n` +
      (format.name === "sql"
        ? "The \"sql\" format needs a relational driver (SQL query support): " +
          "d1 | do | mysql.\n"
        : `The "${format.name}" format needs a key-value driver ` +
          "(get/put/delete/list): kv | cfkv | d1 | do | mysql.\n") +
      `Fix DB_FORMAT or DB_DRIVER. See ${STORAGE_DOC}`,
    // 非法组合通常只差一个变量，直接给出「改成什么」。
    // 优先建议改 DB_FORMAT（保持用户已选定的驱动），因为驱动往往是被平台
    // 唯一支持的（如 ESA 上只有 blob），而格式才是用户可自由选择的维度。
    format.name === "sql"
      ? `Set DB_FORMAT=map (or key), or switch to a relational driver ` +
        `(DB_DRIVER=d1 | do | mysql).`
      : `Set DB_FORMAT=map for DB_DRIVER="${driver.name}"` +
        (supported.includes("|") ? `, or one of: ${supported}.` : `.`),
  )
}

/**
 * 解析驱动。
 *
 * 语义约定：
 *  - `auto`：按优先级探测，全部不可用时：worker 环境报错，本地回退内存。
 *  - `memory`：合法驱动名，**仅本地 Node 有效**；serverless 下抛 NO_STORAGE
 *    （内存写入会静默丢失，且接口仍返回成功）。
 *  - 其它显式指定（如 DB_DRIVER=kv）：**不回退**。若该驱动不可用则直接报错，
 *    避免用户以为在用 KV、实际却落到别的后端或内存里。
 */
async function resolveDriver(
  // 形参类型放宽为 string：`DB_DRIVER=memory` 是合法用户输入，但 `StorageDriver`
  // 联合类型**故意不含 "memory"**（它不参与「驱动名 → 实现」查表，见下方注释）。
  // 若在此收窄为 StorageDriver，下面的 `name === "memory"` 会被 TS 判为
  // 「永不成立的比较」，而这条分支恰恰是 `memory` 的唯一处理入口。
  name: StorageDriver | "memory",
  env?: any,
): Promise<Driver> {
  if (name === "auto") {
    return await autoDetectDriver(env)
  }

  // ── 显式 DB_DRIVER=memory ──────────────────────────────────────────────
  //
  // memory 是**合法驱动名**（用户意图明确：不要持久化），但只在本地 Node
  // 运行时有效。因此不能像以前那样走到 DRIVER_MAP 查表、拿到 UNKNOWN_DRIVER
  // 「未知驱动」——那既否定了用户的合法输入，也给不出任何修复建议
  // （suggestion 为 null，安装向导无从展示下一步动作）。
  //
  // 这里在查表**之前**单独处理：
  //   - 本地：直接返回 memoryDriver（行为与 auto 回退内存一致）；
  //   - serverless：抛 NO_STORAGE（语义是「本运行时没有可用存储」，而不是
  //     「你写错了一个变量」），并带上「改成什么」的一句话建议。
  if (name === "memory") {
    if (!isServerlessRuntime(env)) {
      console.log("[DB] Using explicitly configured driver: memory")
      return memoryDriver
    }
    throw storeError(
      "NO_STORAGE",
      MEMORY_SERVERLESS_MESSAGE,
      "Use DB_DRIVER=auto, or bind a persistent backend (D1 / KV / Blob).",
    )
  }

  const driver = DRIVER_MAP[name]
  if (!driver) {
    throw storeError(
      "UNKNOWN_DRIVER",
      `Unknown DB_DRIVER "${name}". Valid values: auto, memory, ${Object.keys(
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

  if (!available) {
    // ── 显式配置的驱动不可用：直接报错，绝不回退 ──
    //
    // 回退（哪怕是回退到 auto 会选中的那个后端）都会把数据写到用户没有指定的
    // 后端上，而且「暂时性不可用」（KV 代理 401、网络抖动）同样会触发切换，
    // 等它恢复后读路径又切回去，造成数据分裂。因此显式配置一律硬失败。
    //
    // 代价：校验期间每个依赖存储的 API 请求都会被 503 拦截（前端会停在初始化
    // 向导并展示下面的原因），所以文案必须自己说清怎么办 ——
    //   * 「auto 会选谁」排进前 3 行：诊断接口只透传前 3 行（见
    //     server/public.ts 的 reasonLines，那里也写了这条约束）；
    //   * 另外单独给出结构化 suggestion，供前端显眼展示。
    const auto = await autoPickDriver(env, name)
    throw storeError(
      "DRIVER_UNAVAILABLE",
      // 首行必须是完整的一句短原因：界面只展示首行摘要（见 storage-error.ts
      // 的 storageErrorSummary），混入后续说明会变成被截断的半句话。
      `DB_DRIVER is set to "${name}", but that driver is not available in this runtime.\n` +
        `No fallback is performed for an explicitly configured driver.\n` +
        autoPickHint(auto) +
        `Check the binding/credentials for "${name}", or set DB_DRIVER=auto ` +
        `to let the platform pick an available backend.\n` +
        (DRIVER_UNAVAILABLE_HINTS[name] || "") +
        `Environment: ${isServerlessRuntime(env) ? "serverless/worker" : "local/container"}`,
      auto
        ? `Set DB_DRIVER=${auto.name} (or DB_DRIVER=auto) in your deployment variables.`
        : `Set DB_DRIVER=auto in your deployment variables, or provide the ` +
          `binding/credentials required by "${name}".`,
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
    const isNoStorage = msg.includes("No storage backend is available")
    return {
      driver: "none",
      format: "none",
      available: false,
      configError: isNoStorage ? NO_STORAGE_MESSAGE : msg,
      configErrorCode: errorCodeOf(err),
      /** 一句话修复建议（前端在显眼位置单独展示，不依赖解析 message） */
      // NO_STORAGE 现在自带平台感知的 hint（见 noStorageHint），
      // 因此这里不再需要「or set DB_DRIVER=auto」那句循环话术兜底。
      // 保留兜底仅用于「老代码/异常路径没有带 hint」的情形，且文案不再提 auto。
      configSuggestion:
        hintOf(err) ||
        (isNoStorage ? "Bind a persistent storage backend, then redeploy." : null),
    }
  }

  let health: any = null
  try {
    health = await driver.health(env)
  } catch (err: any) {
    health = { connected: false, error: err?.message || String(err) }
  }

  // 注意：这里**刻意不**再做一次 checkProxyConfig 探测。
  //
  // 能走到这里说明 resolveDriver 已成功返回 kv 实例，而 kv 能成功只有两条路：
  //   1. 有原生 KV binding        → checkProxyConfig 首行即 return null
  //   2. 无 binding 但代理可用
  //        （probeProxy 返回 ok 或 401，表示 secret + origin 至少齐全）
  //                                → checkProxyConfig 同样为 null
  //   3. 无 binding 且缺 secret   → 已在 resolveDriver 抛 DRIVER_UNAVAILABLE，
  //                                  根本到不了这里
  // 即：能到这里 ⇒ checkProxyConfig 必为 null，这个分支永远不会命中。
  // KV 代理的真实问题（缺密钥 / 401）由 getStoreConfigErrorDetail 统一负责，
  // 那里才有完整的「原因 + 一句话建议」。
  //
  // 这里只保留 health() 的结论：401 在 health 中视为不健康，
  // 因此下面 `...health` 会把 connected=false + error 透出去。
  return {
    driver: driver.name,
    format: format.name,
    ...(health || {}),
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
 * 供 isPersistentStorageAvailable() 与 getStoreConfigErrorDetail() 共用，
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
 * 同一份配置错误只打印一次（按实例）。
 *
 * 配置错误期间**每个** API 请求都会走到这里（全局 503 拦截），逐请求打印会把
 * 日志刷满、淹没其它信息（用户看到的「反复报错」多半就是它）。文案变化时
 * （配置改动或换了一种错）会重新打印；错误消失后重置，便于下次复现。
 * 需要实时状态时用 /api/public/env_check（它豁免拦截且始终返回最新结论）。
 */
let lastConfigErrorLog: string | null = null

/**
 * 存储配置错误的「原因 + 分类码 + 一句话修复建议」。
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
): Promise<{
  code: StoreConfigErrorCode | null
  message: string | null
  /** 一句话修复建议（「改什么」）；无建议时为 null */
  suggestion: string | null
}> {
  const log = (label: string, msg: string) => {
    if (opts.silent) return
    const key = label + msg
    if (lastConfigErrorLog === key) return
    lastConfigErrorLog = key
    console.error(label + msg)
  }
  if (!env || typeof env !== "object")
    return { code: null, message: null, suggestion: null }

  // 缺代理密钥时优先给出「补密钥」这种可操作提示，而不是笼统的驱动错误。
  // checkProxyConfig 是纯同步读取，开销可忽略。
  //
  // 两种入口都要覆盖：
  //   1. 显式 DB_DRIVER=kv
  //   2. auto 模式最终选中 kv 驱动（否则用户只会看到不可读的 "HTTP 401"，
  //      而真正原因是 X-Internal-Call 的密钥与 Edge Function 不一致）
  //
  // 两处返回的 code / suggestion 完全相同，故抽成局部函数，避免文案漂移。
  const proxyConfigError = (kvIssue: string) => {
    log("[DB] KV proxy configuration error:\n", kvIssue)
    return {
      code: "PROXY_CONFIG" as StoreConfigErrorCode,
      message: kvIssue,
      suggestion:
        "Set EO_KV_URLS to the correct deployment origin, or use DB_DRIVER=auto.",
    }
  }

  const isKvRequested =
    String(env?.DB_DRIVER || "").trim().toLowerCase() === "kv"
  if (isKvRequested) {
    const kvIssue = checkProxyConfig(env)
    if (kvIssue) return proxyConfigError(kvIssue)
  }

  const status = await getStorageStatusSafe(env)

  // 配置齐全且健康：无错误（重置去重状态，便于下次复现时仍能看到日志）
  if (isPersistentStatus(status)) {
    lastConfigErrorLog = null
    return { code: null, message: null, suggestion: null }
  }

  // 选中了 kv 但代理不可用：区分「缺密钥」与「密钥不匹配」。
  // 后者表现为 HTTP 401 —— 代理已部署，只是 JWT_SECRET 与 Edge Function
  // 不一致或被轮换过，需要明确指出来才能排查。
  if (!isKvRequested && String(status?.driver ?? "") === "kv") {
    const kvIssue = checkProxyConfig(env)
    if (kvIssue) return proxyConfigError(kvIssue)
    if (status?.mode === "proxy" && status?.error?.includes("401")) {
      const hint =
        "KV proxy rejected the internal call (HTTP 401). The JWT_SECRET used " +
        "by this deployment does not match the one configured on the Edge " +
        "Functions serving the proxy. Make sure both use the same JWT_SECRET.\n" +
        "Alternatively set EO_KV_URLS to the correct deployment origin."
      log("[DB] KV proxy authentication failed:\n", hint)
      return {
        code: "PROXY_CONFIG",
        message: hint,
        suggestion:
          "Use the same JWT_SECRET on the Edge Function and this deployment.",
      }
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
      // 「改什么」由驱动解析层给出（如 DRIVER_UNAVAILABLE 会带上 auto 的探测结论）
      suggestion: (status?.configSuggestion as string) || null,
    }
  }

  // 内存兜底：serverless 下写入会静默丢失，需要可操作提示
  if (String(status?.driver ?? "none") === "memory") {
    log("[DB] Storage configuration error:\n", NO_STORAGE_MESSAGE)
    return {
      code: "NO_STORAGE",
      message: NO_STORAGE_MESSAGE,
      suggestion:
        "Bind a storage backend (D1 / KV / Blob) or set DB_DRIVER=auto.",
    }
  }

  const healthError = status?.error ? String(status.error) : null
  if (healthError) {
    log("[DB] Storage unhealthy:\n", healthError)
    return {
      code: "HEALTH_ERROR",
      message: healthError,
      suggestion:
        "Check the credentials/bindings of the configured driver, or set DB_DRIVER=auto.",
    }
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
    suggestion:
      driverName === "none" || driverName === ""
        ? "Bind a storage backend (D1 / KV / Blob) or set DB_DRIVER=auto."
        : `Set DB_DRIVER=auto, or provide the binding/credentials required by "${driverName}".`,
  }
}

// 说明：曾有一个只返回 message 的 getStoreConfigError()，在全局 503 拦截改用
// getStoreConfigErrorDetail()（需要 code/reason/suggestion）后已无调用者，故删除。
// 若将来确需「只要原因」的场景，用 getStoreConfigErrorDetail().message 即可，
// 不要重新引入并行实现 —— 两条规则容易漂移。
