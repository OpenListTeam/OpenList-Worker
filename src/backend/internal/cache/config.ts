/**
 * 缓存配置（文件树缓存 / 下载链接缓存）—— 完全由环境变量驱动。
 *
 * 设计目标（对齐参考实现 OpenList.ts 的两级缓存）：
 *   1. **文件树缓存**：`/fs/list`、`/fs/get`、`/fs/dirs` 优先命中缓存，
 *      避免每次浏览都去请求网盘 / 对象存储；
 *   2. **下载链接缓存**：`/d`、`/p` 等下载链路把驱动返回的直链缓存起来，
 *      避免重复签名 / 重复换取临时链接。
 *
 * 默认行为（**只向数据库启用**）：
 *   缓存内容与业务数据走同一条存储链路（`getStorageBackend()` 解析出的
 *   driver，即 DB_DRIVER 指向的 d1 / mysql / kv / cfkv / blob / do），
 *   因此「什么都不配」就等于「用数据库做缓存」。
 *
 * 想要改用 / 额外启用 KV、Blob 等专用后端时，**必须显式添加环境变量**
 *   CACHE_DRIVER=kv           # 只用 KV 缓存
 *   CACHE_DRIVER=db,kv        # 数据库 + KV 双写（读优先命中 KV）
 *   CACHE_DRIVER=blob,cfkv    # 多个专用后端
 * 未显式配置的专用后端绝不会被自动启用，避免「以为缓存在 KV、实际写进了
 * 数据库」这类不可见行为（与 DB_DRIVER 的「显式配置不回退」哲学一致）。
 *
 * 支持的环境变量一览：
 *
 * | 变量 | 默认值 | 说明 |
 * | :-- | :-- | :-- |
 * | `CACHE_ENABLED` | `true` | 总开关，`false` 时两级缓存全部关闭 |
 * | `CACHE_DRIVER` | `db` | 缓存后端列表，逗号分隔：`db` / `kv` / `blob` / `cfkv` / `do` / `memory` / `none` |
 * | `CACHE_FILE_TREE` | `true` | 文件树缓存开关 |
 * | `CACHE_DOWNLOAD_LINK` | `false` | 下载链接缓存开关。默认**关闭**：部分网盘的直链 TTL 很短（分钟级甚至更短），缓存复用容易把已失效的直链发给用户；确认所用网盘直链有效期足够长后再显式开启 |
 * | `CACHE_TTL` | `0` | 文件树缓存时长（分钟）；`0` = 跟随存储级 `cache_expiration`（默认 30） |
 * | `CACHE_LINK_TTL` | `5` | 下载链接缓存时长（分钟）；直链通常带有效期，不宜过长 |
 * | `CACHE_EXCLUDE_DRIVERS` | `virtual,alias,url_tree,strm,chunk` | 不参与缓存的驱动（本地计算型，缓存只会带来陈旧） |
 * | `CACHE_PREFIX` | `openlist_cache` | 缓存键前缀，用于与业务数据键隔离；仅允许 `[A-Za-z0-9_]`，非法时回退默认值 |
 */

/** 可用的缓存后端名。`db` = 与业务数据同一个后端（默认）。 */
export type CacheBackendName =
  | "db"
  | "kv"
  | "blob"
  | "cfkv"
  | "do"
  | "memory"
  | "none"

/** 合法后端名（`none` 用于显式关闭） */
export const VALID_CACHE_BACKENDS: readonly CacheBackendName[] = [
  "db",
  "kv",
  "blob",
  "cfkv",
  "do",
  "memory",
  "none",
] as const

/**
 * 默认排除的驱动：这些驱动不产生远程 IO（纯本地计算/别名映射），
 * 缓存不但没有收益，还会因为它们的输入（如 url_structure）变更而变陈旧。
 * 可通过 `CACHE_EXCLUDE_DRIVERS` 覆盖（传空字符串表示不排除任何驱动）。
 */
const DEFAULT_EXCLUDE_DRIVERS = ["virtual", "alias", "url_tree", "strm", "chunk"]

/** 存储级 cache_expiration 缺省值（与 driver/storageopts.ts 保持一致） */
export const DEFAULT_FILE_TREE_TTL_MINUTES = 30

/** 下载直链的默认缓存时长（分钟）：直链通常带签名有效期，取值需保守 */
export const DEFAULT_LINK_TTL_MINUTES = 5

/** 已解析的缓存配置 */
export interface CacheConfig {
  /** 总开关 */
  enabled: boolean
  /** 缓存后端列表（已去掉 `none`；为空表示关闭） */
  backends: CacheBackendName[]
  /** 文件树缓存开关 */
  fileTree: boolean
  /** 下载链接缓存开关 */
  downloadLink: boolean
  /** 文件树缓存时长（分钟）；`0` 表示跟随存储级配置 */
  ttlMinutes: number
  /** 下载链接缓存时长（分钟） */
  linkTtlMinutes: number
  /** 不参与缓存的驱动（小写、去非字母数字） */
  excludeDrivers: Set<string>
  /** 缓存键前缀 */
  prefix: string
}

/** 读取环境变量（同时兼容注入的 env 对象与 process.env）。 */
function readRaw(key: string, env?: any): string {
  const e = env && typeof env === "object" ? env : {}
  const fromEnv = e[key]
  if (fromEnv !== undefined && fromEnv !== null && String(fromEnv) !== "") {
    return String(fromEnv)
  }
  if (typeof process !== "undefined" && process.env) {
    const fromProcess = (process.env as any)[key]
    if (fromProcess !== undefined && fromProcess !== null) {
      return String(fromProcess)
    }
  }
  return ""
}

/** 解析布尔型环境变量（无法识别时回退默认值）。 */
function readBool(key: string, fallback: boolean, env?: any): boolean {
  const raw = readRaw(key, env).trim().toLowerCase()
  if (!raw) return fallback
  if (["1", "true", "yes", "on", "enable", "enabled"].includes(raw)) return true
  if (["0", "false", "no", "off", "disable", "disabled"].includes(raw)) return false
  return fallback
}

/** 解析非负整数型环境变量（无法识别时回退默认值）。 */
function readInt(key: string, fallback: number, env?: any): number {
  const raw = readRaw(key, env).trim()
  if (!raw) return fallback
  const n = parseInt(raw, 10)
  if (!Number.isFinite(n) || n < 0) return fallback
  return n
}

/** 驱动名归一化（与 storage.ts 的 normDriver 规则一致）。 */
export function normalizeDriverName(name: string): string {
  return String(name || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
}

/**
 * 解析 `CACHE_DRIVER`。
 *
 * 规则：
 *   - 缺省 / 空 → `["db"]`（默认只向数据库启用）；
 *   - 出现 `none` → 返回空数组（显式关闭）；
 *   - 无法识别的取值会被忽略并告警一次（不静默改写成别的后端）。
 */
export function parseCacheBackends(raw: string): CacheBackendName[] {
  const tokens = String(raw || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
  if (tokens.length === 0) return ["db"]
  if (tokens.includes("none")) return []

  const out: CacheBackendName[] = []
  const unknown: string[] = []
  for (const token of tokens) {
    const norm = normalizeDriverName(token)
    const match = VALID_CACHE_BACKENDS.find(
      (b) => b !== "none" && normalizeDriverName(b) === norm,
    )
    if (match) {
      if (!out.includes(match)) out.push(match)
    } else {
      unknown.push(token)
    }
  }
  if (unknown.length > 0) {
    console.warn(
      `[Cache] Unknown CACHE_DRIVER value(s): ${unknown.join(", ")}. ` +
        `Valid values: ${VALID_CACHE_BACKENDS.join(", ")}. They were ignored.`,
    )
  }
  return out.length > 0 ? out : ["db"]
}

/** 解析 `CACHE_EXCLUDE_DRIVERS`（默认排除纯本地计算型驱动）。 */
export function parseExcludeDrivers(raw: string): Set<string> {
  const source = String(raw || "").trim()
  const tokens = (source === "" ? DEFAULT_EXCLUDE_DRIVERS : source.split(","))
    .map((s) => normalizeDriverName(s))
    .filter(Boolean)
  return new Set(tokens)
}

/** 缓存键前缀默认值。 */
const DEFAULT_CACHE_PREFIX = "openlist_cache"

/**
 * 解析 `CACHE_PREFIX`（缓存键前缀）。
 *
 * 前缀会成为 KV 键的一部分，因此只允许 `[A-Za-z0-9_]`（EdgeOne KV 的键名
 * 约束）：含其他字符时所有缓存写入都会失败。另外前缀与业务数据的 KV 键
 * （`<table>_<主键>`）落在同一个键空间，若放纵任意字符（如空格、`/`、`:`），
 * 既可能与表名段混淆、又可能让 `sqlFormat.save()` 的整表 DELETE 波及缓存行。
 * 非法取值一律回退默认值并告警。
 */
export function parseCachePrefix(raw: string): string {
  const value = String(raw || "").trim()
  if (!value) return DEFAULT_CACHE_PREFIX
  if (/^[A-Za-z0-9_]{1,64}$/.test(value)) return value
  console.warn(
    `[Cache] Invalid CACHE_PREFIX "${value}": only [A-Za-z0-9_] (max 64 chars) ` +
      `are allowed. Falling back to "${DEFAULT_CACHE_PREFIX}".`,
  )
  return DEFAULT_CACHE_PREFIX
}

/** 计算用于「配置缓存」的指纹（配置一变即失效）。 */
function configSignature(env?: any): string {
  return [
    readRaw("CACHE_ENABLED", env),
    readRaw("CACHE_DRIVER", env),
    readRaw("CACHE_FILE_TREE", env),
    readRaw("CACHE_DOWNLOAD_LINK", env),
    readRaw("CACHE_TTL", env),
    readRaw("CACHE_LINK_TTL", env),
    readRaw("CACHE_EXCLUDE_DRIVERS", env),
    readRaw("CACHE_PREFIX", env),
  ].join("\u0001")
}

let cachedConfig: { sig: string; config: CacheConfig } | null = null

/**
 * 读取缓存配置（按环境变量指纹做进程内记忆化）。
 *
 * 纯同步、无 IO：缓存配置只来自环境变量，不依赖数据库，
 * 因此可以在请求热路径上安全调用。
 */
export function getCacheConfig(env?: any): CacheConfig {
  const sig = configSignature(env)
  if (cachedConfig && cachedConfig.sig === sig) return cachedConfig.config

  const backends = parseCacheBackends(readRaw("CACHE_DRIVER", env))
  const enabledRaw = readBool("CACHE_ENABLED", true, env)
  const prefix = parseCachePrefix(readRaw("CACHE_PREFIX", env))

  const config: CacheConfig = {
    enabled: enabledRaw && backends.length > 0,
    backends,
    fileTree: readBool("CACHE_FILE_TREE", true, env),
    // 默认关闭：部分网盘直链 TTL 极短，缓存复用容易把失效直链发给用户；
    // 确认网盘直链有效期后可显式开启（CACHE_DOWNLOAD_LINK=true）
    downloadLink: readBool("CACHE_DOWNLOAD_LINK", false, env),
    ttlMinutes: readInt("CACHE_TTL", 0, env),
    linkTtlMinutes: readInt("CACHE_LINK_TTL", DEFAULT_LINK_TTL_MINUTES, env),
    excludeDrivers: parseExcludeDrivers(readRaw("CACHE_EXCLUDE_DRIVERS", env)),
    prefix,
  }

  cachedConfig = { sig, config }
  return config
}

/** 仅供测试：清除配置记忆化，避免用例间串味。 */
export function __resetCacheConfigForTest(): void {
  cachedConfig = null
}

/** 供管理接口回显当前生效配置（脱敏，不含任何密钥）。 */
export function describeCacheConfig(env?: any): Record<string, any> {
  const cfg = getCacheConfig(env)
  return {
    enabled: cfg.enabled,
    driver: cfg.backends.join(","),
    backends: cfg.backends,
    file_tree: cfg.fileTree,
    download_link: cfg.downloadLink,
    ttl_minutes: cfg.ttlMinutes,
    link_ttl_minutes: cfg.linkTtlMinutes,
    exclude_drivers: [...cfg.excludeDrivers],
    prefix: cfg.prefix,
  }
}
