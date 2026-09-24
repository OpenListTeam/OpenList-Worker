/**
 * 缓存模块统一入口。
 *
 * 两级缓存（对齐参考实现 OpenList.ts）：
 *   - 文件树缓存：`filetree.ts`，浏览目录时命中缓存，避免每次请求网盘；
 *   - 下载链接缓存：`link.ts`，复用驱动换取的直链，避免重复签名/换链。
 *
 * 后端选择：`store.ts`，默认只向数据库启用（`CACHE_DRIVER=db`），
 * 显式配置 `CACHE_DRIVER=db,kv` / `kv` / `blob` 等才会启用专用后端。
 *
 * 失效：写操作（mkdir/rename/remove/move/copy/put）后调用 `invalidatePaths()`，
 * 同时失效这两级缓存。
 */
import { getCacheConfig, describeCacheConfig } from "./config"
import { clearCache, getCacheDrivers, isCacheActive } from "./store"
import { invalidateFileTree } from "./filetree"
import { invalidateLinks } from "./link"

export {
  getCacheConfig,
  describeCacheConfig,
  parseCacheBackends,
  parseExcludeDrivers,
  normalizeDriverName,
  __resetCacheConfigForTest,
  DEFAULT_FILE_TREE_TTL_MINUTES,
  DEFAULT_LINK_TTL_MINUTES,
  VALID_CACHE_BACKENDS,
} from "./config"
export type { CacheBackendName, CacheConfig } from "./config"

export {
  buildCacheKey,
  cacheKindPrefix,
  cacheDelete,
  cacheGetEnvelope,
  cacheListKeys,
  cacheSetEnvelope,
  clearCache,
  encodeCachePathSegment,
  getCacheDrivers,
  isCacheActive,
  storageIdFromCacheKey,
  __resetCacheStoreForTest,
  __setCacheDriversForTest,
} from "./store"
export type { CacheEnvelope, CacheKind } from "./store"

export {
  getCachedFileTree,
  setCachedFileTree,
  invalidateFileTree,
  isFileTreeCacheable,
  resolveFileTreeTtlMinutes,
  deleteFileTreeCacheEntry,
  expandToInvalidationPaths,
} from "./filetree"
export type { CacheTarget } from "./filetree"

export {
  getCachedLink,
  setCachedLink,
  invalidateLinks,
  isLinkCacheable,
  resolveLinkTtlMinutes,
  deleteLinkCacheEntry,
} from "./link"

/**
 * 失效若干虚拟路径对应的**全部**缓存（文件树 + 下载链接）。
 *
 * 这是写操作后统一调用的入口：调用方只需给出「被改动的路径」，
 * 父目录的列表失效由 `invalidateFileTree()` 内部处理。
 */
export async function invalidatePaths(
  virtualPaths: string[],
  env?: any,
): Promise<void> {
  const paths = (virtualPaths || []).filter(Boolean)
  if (paths.length === 0) return
  const cfg = getCacheConfig(env)
  if (!cfg.enabled) return
  try {
    await Promise.all([
      invalidateFileTree(paths, env),
      invalidateLinks(paths, env),
    ])
  } catch (err: any) {
    // 失效失败不影响写操作本身：缓存会随 TTL 自然过期
    console.warn(`[Cache] invalidate failed: ${err?.message || err}`)
  }
}

/** 清空某个存储的全部缓存（存储配置变更 / 删除 / 启停时调用）。 */
export async function clearStorageCache(
  storageId: any,
  env?: any,
): Promise<number> {
  try {
    return await clearCache(env, { storageId })
  } catch (err: any) {
    console.warn(`[Cache] clearStorageCache failed: ${err?.message || err}`)
    return 0
  }
}

/**
 * 缓存运行时状态（供管理接口 / 诊断展示）。
 */
export async function getCacheRuntimeStatus(env?: any): Promise<{
  config: Record<string, any>
  active: boolean
  drivers: string[]
}> {
  const config = describeCacheConfig(env)
  let drivers: string[] = []
  let active = false
  try {
    active = await isCacheActive(env)
    drivers = (await getCacheDrivers(env)).map((d) => d.name)
  } catch {
    active = false
  }
  return { config, active, drivers }
}
