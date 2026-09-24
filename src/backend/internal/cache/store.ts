/**
 * 缓存存储层：把「缓存键值」落到某个 Driver 上。
 *
 * 与业务数据的关系：
 *   - `db` 后端复用 `getStorageBackend()` 解析出的 driver，也就是与业务数据
 *     **同一个** d1 / mysql / kv / cfkv / blob / do 后端（默认行为）；
 *   - `kv` / `blob` / `cfkv` / `do` / `memory` 是**专用**后端，只有用户在
 *     `CACHE_DRIVER` 里显式写出才会启用（不会自动探测、不会自动回退）；
 *   - 缓存写入**直接走 driver 的 get/put/delete**，不经过 `saveDb()`，
 *     因此不会触发「整配置对象序列化 / 写前守卫 / 字段加密」等开销，
 *     也不会污染业务数据（键名统一带 `openlist_cache` 前缀）。
 *
 * 失败策略：缓存永远不能让业务请求失败。任何读/写异常都按「未命中 / 未写入」
 * 处理，并只告警一次，避免把日志刷满。
 */
import type { Driver } from "../model/store/types"
import { getStorageBackend } from "../model/store/backend"
import { kvDriver } from "../model/store/driver/kv"
import { cfkvDriver } from "../model/store/driver/cfkv"
import { blobDriver } from "../model/store/driver/blob"
import { doDriver } from "../model/store/driver/do"
import { memoryDriver } from "../model/store/driver/memory"
import { encodeKeyPart } from "../model/store/keycodec"
import { getCacheConfig, type CacheBackendName } from "./config"

/** 专用后端名 → 驱动实现（`db` 单独处理，见 resolveDrivers） */
const DEDICATED_DRIVERS: Record<string, Driver> = {
  kv: kvDriver,
  cfkv: cfkvDriver,
  blob: blobDriver,
  do: doDriver,
  memory: memoryDriver,
}

/** 缓存条目信封：值 + 过期时间戳 */
export interface CacheEnvelope<T = any> {
  /** 载荷 */
  v: T
  /** 写入时间（ms） */
  ts: number
  /** 过期时间（ms，绝对时间） */
  exp: number
}

/**
 * 驱动解析结果缓存。
 *
 * 为什么需要：`blobDriver.isAvailable()` 每次都会动态 import EdgeOne SDK，
 * `kvDriver.isAvailable()` 可能发一次 HTTP 探测；而缓存配置在实例生命周期内
 * 基本不变。按 env 对象身份记忆化即可（`1 env = 1 请求`，条目随 GC 回收）。
 */
const resolvedByEnv = new WeakMap<object, Promise<Driver[]>>()

/** 仅供测试：注入缓存驱动解析结果。 */
let driverLoaderOverride: ((env: any) => Promise<Driver[]>) | null = null

export function __setCacheDriversForTest(
  loader: ((env: any) => Promise<Driver[]>) | null,
): void {
  driverLoaderOverride = loader
}

/** 仅供测试：重置模块级状态。 */
export function __resetCacheStoreForTest(): void {
  driverLoaderOverride = null
  warnedDrivers.clear()
}

/** 每个驱动只告警一次（键为 `driverName:reason`） */
const warnedDrivers = new Map<string, true>()

function warnOnce(key: string, message: string): void {
  if (warnedDrivers.has(key)) return
  warnedDrivers.set(key, true)
  console.warn(message)
}

/**
 * 解析实际可用的缓存驱动列表（顺序即读取优先级）。
 *
 * 语义约定（与 DB_DRIVER 一致）：
 *   - 用户显式配置了某个专用后端但它不可用 → **跳过并告警**，绝不悄悄换成
 *     别的后端；若最终一个都不剩，则缓存整体失效（请求照常走真实存储）。
 */
async function resolveDrivers(env: any): Promise<Driver[]> {
  if (driverLoaderOverride) return driverLoaderOverride(env)

  const cfg = getCacheConfig(env)
  if (!cfg.enabled) return []

  const drivers: Driver[] = []
  for (const name of cfg.backends) {
    if (name === "db") {
      try {
        const { driver } = await getStorageBackend(env)
        drivers.push(driver)
      } catch (err: any) {
        warnOnce(
          "db:resolve",
          `[Cache] CACHE_DRIVER includes "db" but the storage backend could not be ` +
            `resolved (${err?.message || err}); the cache falls back to no-op.`,
        )
      }
      continue
    }

    const driver = DEDICATED_DRIVERS[name]
    if (!driver) continue
    try {
      if (await driver.isAvailable(env)) {
        drivers.push(driver)
      } else {
        warnOnce(
          `${name}:unavailable`,
          `[Cache] CACHE_DRIVER="${name}" is not available in this runtime ` +
            `(missing binding/credentials). This cache backend is skipped; ` +
            `no other backend is used in its place.`,
        )
      }
    } catch (err: any) {
      warnOnce(
        `${name}:error`,
        `[Cache] CACHE_DRIVER="${name}" availability probe failed: ` +
          `${err?.message || err}. This cache backend is skipped.`,
      )
    }
  }
  return drivers
}

/** 获取（并记忆化）当前 env 的缓存驱动列表。 */
export async function getCacheDrivers(env?: any): Promise<Driver[]> {
  if (driverLoaderOverride) return driverLoaderOverride(env)
  if (env && typeof env === "object") {
    let pending = resolvedByEnv.get(env)
    if (!pending) {
      pending = resolveDrivers(env)
      resolvedByEnv.set(env, pending)
    }
    return pending
  }
  return resolveDrivers(env)
}

/** 缓存是否已实际启用（用于诊断接口与管理页展示）。 */
export async function isCacheActive(env?: any): Promise<boolean> {
  const drivers = await getCacheDrivers(env)
  return drivers.length > 0
}

/** 把 driver.get 的返回值（可能是 Response 形态）统一成字符串。 */
async function coerceText(value: any): Promise<string | null> {
  if (value === null || value === undefined) return null
  if (typeof value === "string") return value
  if (typeof value?.text === "function") {
    try {
      return String(await value.text())
    } catch {
      return null
    }
  }
  return String(value)
}

/**
 * 读取缓存条目（自动跳过已过期条目）。
 *
 * 多个后端时按配置顺序逐个尝试：任一命中即返回（先写 KV 后写 DB 的部署，
 * 即使 DB 侧被清理过也仍能命中 KV）。
 */
export async function cacheGetEnvelope<T = any>(
  key: string,
  env?: any,
): Promise<CacheEnvelope<T> | null> {
  let drivers: Driver[]
  try {
    drivers = await getCacheDrivers(env)
  } catch {
    return null
  }
  if (drivers.length === 0) return null

  for (const driver of drivers) {
    try {
      const raw = await coerceText(await driver.get(key, env))
      if (!raw) continue
      const parsed = JSON.parse(raw) as CacheEnvelope<T>
      if (!parsed || typeof parsed !== "object") continue
      if (typeof parsed.exp === "number" && parsed.exp <= Date.now()) {
        // 惰性清理过期条目，避免缓存无限膨胀
        void cacheDelete(key, env)
        continue
      }
      return parsed
    } catch (err: any) {
      warnOnce(
        `${driver.name}:get`,
        `[Cache] read failed on backend "${driver.name}": ${err?.message || err}`,
      )
    }
  }
  return null
}

/** 写入缓存条目（TTL 单位毫秒；ttl<=0 时不写入）。 */
export async function cacheSetEnvelope<T = any>(
  key: string,
  value: T,
  ttlMs: number,
  env?: any,
): Promise<void> {
  if (!Number.isFinite(ttlMs) || ttlMs <= 0) return

  let drivers: Driver[]
  try {
    drivers = await getCacheDrivers(env)
  } catch {
    return
  }
  if (drivers.length === 0) return

  const now = Date.now()
  const envelope: CacheEnvelope<T> = { v: value, ts: now, exp: now + ttlMs }
  let raw: string
  try {
    raw = JSON.stringify(envelope)
  } catch {
    return
  }

  // 双写所有后端：读路径按顺序命中，写路径尽量铺满（各自失败互不影响）
  await Promise.all(
    drivers.map(async (driver) => {
      try {
        await driver.put(key, raw, env)
      } catch (err: any) {
        warnOnce(
          `${driver.name}:put`,
          `[Cache] write failed on backend "${driver.name}": ${err?.message || err}`,
        )
      }
    }),
  )
}

/** 删除缓存键（多后端全删）。 */
export async function cacheDelete(key: string, env?: any): Promise<void> {
  let drivers: Driver[]
  try {
    drivers = await getCacheDrivers(env)
  } catch {
    return
  }
  if (drivers.length === 0) return

  await Promise.all(
    drivers.map(async (driver) => {
      try {
        await driver.delete(key, env)
      } catch (err: any) {
        warnOnce(
          `${driver.name}:delete`,
          `[Cache] delete failed on backend "${driver.name}": ${err?.message || err}`,
        )
      }
    }),
  )
}

/**
 * 列出以 `prefix` 开头的缓存键（多后端取并集）。
 *
 * 仅用于管理接口（清空 / 统计），不在请求热路径上。
 */
export async function cacheListKeys(
  prefix: string,
  env?: any,
): Promise<string[]> {
  let drivers: Driver[]
  try {
    drivers = await getCacheDrivers(env)
  } catch {
    return []
  }
  if (drivers.length === 0) return []

  const out = new Set<string>()
  for (const driver of drivers) {
    try {
      for (const key of await driver.list(prefix, env)) out.add(key)
    } catch (err: any) {
      warnOnce(
        `${driver.name}:list`,
        `[Cache] list failed on backend "${driver.name}": ${err?.message || err}`,
      )
    }
  }
  return [...out]
}

/** 缓存类型标识：`ft` = 文件树（file tree），`ln` = 下载链接（link） */
export type CacheKind = "ft" | "ln"

/** 32 位 FNV-1a 哈希（同步，用于把超长路径压成短键）。 */
function fnv1a32(input: string, seed: number): number {
  let hash = seed >>> 0
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193) >>> 0
  }
  return hash >>> 0
}

/**
 * 路径片段编码为 KV 合法键片段。
 *
 * EdgeOne KV 只接受 `[A-Za-z0-9_]`，因此复用业务数据的 `encodeKeyPart()`。
 * 超长路径（深层目录）会被压成双 32 位哈希，避免超过 KV 键长上限
 * （Cloudflare KV 512 字节）；编码是确定性的，因此失效时仍能算出同一个键。
 */
export function encodeCachePathSegment(virtualPath: string): string {
  const norm =
    "/" +
    String(virtualPath || "")
      .split("/")
      .filter(Boolean)
      .join("/")
  const encoded = encodeKeyPart(norm)
  if (encoded.length <= 180) return encoded
  const a = fnv1a32(norm, 0x811c9dc5).toString(16).padStart(8, "0")
  const b = fnv1a32(norm, 0x9e3779b9).toString(16).padStart(8, "0")
  return `h${a}${b}`
}

/**
 * 构造缓存键：`<prefix>_<kind>_<storageId>_<encodedPath>`。
 *
 * 键名分四段，第 4 段（索引 3）是存储 id，便于「按存储清空」时按段过滤，
 * 避免 `storages_1_` 前缀误伤 `storages_10_` 这类包含关系。
 */
export function buildCacheKey(
  kind: CacheKind,
  storageId: any,
  virtualPath: string,
  prefix: string,
): string {
  return `${prefix}_${kind}_${encodeKeyPart(String(storageId ?? ""))}_${encodeCachePathSegment(
    virtualPath,
  )}`
}

/** 某个 kind 在全部存储下的键前缀。 */
export function cacheKindPrefix(kind: CacheKind, prefix: string): string {
  return `${prefix}_${kind}_`
}

/**
 * 从缓存键中解析出所属存储 id（用于按存储过滤）。
 *
 * 段数由前缀决定（前缀本身可能含 `_`），因此按前缀的段数动态定位，
 * 不做硬编码索引。
 */
export function storageIdFromCacheKey(
  key: string,
  kind: CacheKind,
  prefix: string,
): string | null {
  const head = `${prefix}_${kind}_`
  if (!key.startsWith(head)) return null
  const rest = key.slice(head.length)
  const sep = rest.indexOf("_")
  return sep === -1 ? rest : rest.slice(0, sep)
}

/** 清空全部缓存（或仅某一 kind / 某一存储），返回删除的键数量。 */
export async function clearCache(
  env: any,
  opts: { kind?: CacheKind; storageId?: any } = {},
): Promise<number> {
  const cfg = getCacheConfig(env)
  const kinds: CacheKind[] = opts.kind ? [opts.kind] : ["ft", "ln"]
  let removed = 0

  for (const kind of kinds) {
    const keys = await cacheListKeys(cacheKindPrefix(kind, cfg.prefix), env)
    for (const key of keys) {
      if (opts.storageId !== undefined && opts.storageId !== null) {
        const id = storageIdFromCacheKey(key, kind, cfg.prefix)
        if (id !== String(opts.storageId)) continue
      }
      await cacheDelete(key, env)
      removed++
    }
  }
  return removed
}
