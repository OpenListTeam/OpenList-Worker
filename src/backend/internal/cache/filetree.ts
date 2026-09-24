/**
 * 文件树缓存（File Tree Cache）。
 *
 * 对齐参考实现 OpenList.ts 的 `files` / `file_cache` 表：浏览目录时优先从
 * 缓存读取，只有缓存未命中（或已过期）才去请求真实存储。
 *
 * 缓存粒度与安全边界（重要）：
 *   - 只缓存**驱动层**的 `driver.list()` 结果（原始 FileItem 列表），
 *     不缓存任何与请求者身份相关的东西（权限、meta 密码、签名、hide 过滤
 *     都在 server/fs.ts 里按请求实时计算）。因此「管理员看过一次、普通用户
 *     随后访问」不会因为缓存而越权。
 *   - 空目录同样会被缓存（值为 `[]`），避免反复击穿到存储。
 *   - 写操作（mkdir/rename/remove/move/copy/put）后由调用方主动失效，
 *     见 cache/index.ts 的 invalidatePaths()。
 */
import type { FileItem } from "../driver/base"
import { resolveCacheExpiration } from "../driver/storageopts"
import { resolvePath } from "../model/db"
import {
  DEFAULT_FILE_TREE_TTL_MINUTES,
  getCacheConfig,
  normalizeDriverName,
} from "./config"
import {
  buildCacheKey,
  cacheDelete,
  cacheGetEnvelope,
  cacheSetEnvelope,
} from "./store"

/** 缓存目标：`resolvePath()` 的返回值中本模块关心的字段。 */
export interface CacheTarget {
  storage: any
  cleanPath: string
  physical?: string | null
  isVirtual?: boolean
}

/**
 * 该目标是否可参与文件树缓存。
 *
 * 排除条件：
 *   - 总开关 / 文件树开关关闭；
 *   - 虚拟路径（没有对应存储）；
 *   - 驱动在 CACHE_EXCLUDE_DRIVERS 中（纯本地计算型，缓存只会变陈旧）；
 *   - 计算出的 TTL <= 0（存储级 `cache_expiration=0` 或自定义策略命中 0，
 *     语义即「不缓存」）。
 */
export function isFileTreeCacheable(
  target: CacheTarget | null | undefined,
  env?: any,
): boolean {
  const cfg = getCacheConfig(env)
  if (!cfg.enabled || !cfg.fileTree) return false
  if (!target?.storage || target.isVirtual) return false
  const driver = normalizeDriverName(target.storage.driver)
  if (cfg.excludeDrivers.has(driver)) return false
  return resolveFileTreeTtlMinutes(target, env) > 0
}

/**
 * 文件树缓存的 TTL（分钟）。
 *
 * 优先级：
 *   1. `CACHE_TTL`（显式全局覆盖，>0 时生效）
 *   2. 存储级 `cache_expiration`（可被 `custom_cache_policies` 按路径覆盖）
 *   3. 默认 30 分钟
 */
export function resolveFileTreeTtlMinutes(
  target: CacheTarget,
  env?: any,
): number {
  const cfg = getCacheConfig(env)
  if (cfg.ttlMinutes > 0) return cfg.ttlMinutes
  try {
    const minutes = resolveCacheExpiration(target.storage, target.cleanPath)
    return Number.isFinite(minutes) ? minutes : DEFAULT_FILE_TREE_TTL_MINUTES
  } catch {
    return DEFAULT_FILE_TREE_TTL_MINUTES
  }
}

function keyFor(target: CacheTarget, env?: any): string {
  const cfg = getCacheConfig(env)
  return buildCacheKey("ft", target.storage.id, target.cleanPath, cfg.prefix)
}

/**
 * 读取文件树缓存。未命中 / 已过期 / 任何异常都返回 null（由调用方回源）。
 */
export async function getCachedFileTree(
  target: CacheTarget | null | undefined,
  env?: any,
): Promise<FileItem[] | null> {
  if (!target || !isFileTreeCacheable(target, env)) return null
  try {
    const hit = await cacheGetEnvelope<FileItem[]>(keyFor(target, env), env)
    if (!hit) return null
    const items = hit.v
    if (!Array.isArray(items)) return null
    // 防御性拷贝：缓存对象可能被上层归一化逻辑就地修改（如补 type 字段），
    // 直接返回同一引用会把修改带回缓存（多实例/多请求下表现为数据串味）。
    return items.map((item) => ({ ...item }))
  } catch {
    return null
  }
}

/** 写入文件树缓存（TTL <= 0 时跳过）。 */
export async function setCachedFileTree(
  target: CacheTarget | null | undefined,
  items: FileItem[],
  env?: any,
): Promise<void> {
  if (!target || !isFileTreeCacheable(target, env)) return
  const ttlMinutes = resolveFileTreeTtlMinutes(target, env)
  if (ttlMinutes <= 0) return
  try {
    await cacheSetEnvelope(keyFor(target, env), items, ttlMinutes * 60_000, env)
  } catch {
    // 缓存写入失败绝不影响业务
  }
}

/** 删除单个路径的文件树缓存（不做路径解析，调用方已知 storage）。 */
export async function deleteFileTreeCacheEntry(
  storageId: any,
  cleanPath: string,
  env?: any,
): Promise<void> {
  const cfg = getCacheConfig(env)
  await cacheDelete(buildCacheKey("ft", storageId, cleanPath, cfg.prefix), env)
}

/** 把某个虚拟路径与其父目录一并加入待失效集合（父目录的列表必然变化）。 */
export function expandToInvalidationPaths(virtualPath: string): string[] {
  const norm =
    "/" +
    String(virtualPath || "")
      .split("/")
      .filter(Boolean)
      .join("/")
  const idx = norm.lastIndexOf("/")
  const parent = idx <= 0 ? "/" : norm.slice(0, idx)
  return parent === norm ? [norm] : [norm, parent]
}

/**
 * 失效若干虚拟路径对应的文件树缓存。
 *
 * 每个路径会连同其父目录一起失效：例如 `/a/b/c.txt` 的增删改会让 `/a/b`
 * 的目录列表变陈旧；若该路径本身是目录，它自己的列表也会失效。
 */
export async function invalidateFileTree(
  virtualPaths: string[],
  env?: any,
): Promise<void> {
  const cfg = getCacheConfig(env)
  if (!cfg.enabled || !cfg.fileTree) return

  const keys = new Set<string>()
  for (const p of virtualPaths) {
    for (const candidate of expandToInvalidationPaths(p)) {
      try {
        const resolved = await resolvePath(candidate, env)
        if (resolved.isVirtual || !resolved.storage) continue
        keys.add(
          buildCacheKey("ft", resolved.storage.id, resolved.cleanPath, cfg.prefix),
        )
      } catch {
        // 路径无法解析（存储被删除等）：忽略，缓存会随 TTL 自然过期
      }
    }
  }
  for (const key of keys) await cacheDelete(key, env)
}
