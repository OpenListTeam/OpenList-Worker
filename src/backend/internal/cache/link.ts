/**
 * 下载链接缓存（Download Link Cache）。
 *
 * 对齐参考实现 OpenList.ts 的 `file_links` 表：把驱动 `get()` 返回的直链
 * （`raw_url` + 必需的 `raw_url_headers`）缓存起来，重复下载 / 预览时无需
 * 再次向网盘换取临时链接（这一步通常最贵，且容易被限流）。
 *
 * 安全边界：
 *   - 只缓存**驱动层**结果，签名（`?sign=`）与访问控制在 server 层按请求
 *     实时签发/校验，因此缓存不会绕过权限；
 *   - 只缓存「确实拿到了直链」的成功结果（`raw_url` 非空、非目录），
 *     失败结果不做负缓存，避免把瞬时故障固化；
 *   - TTL 默认仅 5 分钟（`CACHE_LINK_TTL`）。直链通常自带有效期，
 *     缓存过久会把「已失效的链接」交给浏览器（表现为 403/404）。
 */
import type { FileItem } from "../driver/base"
import { resolvePath } from "../model/db"
import {
  DEFAULT_LINK_TTL_MINUTES,
  getCacheConfig,
  normalizeDriverName,
} from "./config"
import {
  buildCacheKey,
  cacheDelete,
  cacheGetEnvelope,
  cacheSetEnvelope,
} from "./store"
import type { CacheTarget } from "./filetree"

/** 下载链接缓存的 TTL（分钟）。 */
export function resolveLinkTtlMinutes(env?: any): number {
  return getCacheConfig(env).linkTtlMinutes
}

/**
 * 该目标是否可参与下载链接缓存。
 *
 * 与文件树缓存共享「驱动排除名单」：纯本地计算型驱动（virtual/alias/…）
 * 的 get() 本来就没有网络开销，缓存没有意义。
 */
export function isLinkCacheable(
  target: CacheTarget | null | undefined,
  env?: any,
): boolean {
  const cfg = getCacheConfig(env)
  if (!cfg.enabled || !cfg.downloadLink) return false
  if (!target?.storage || target.isVirtual) return false
  const driver = normalizeDriverName(target.storage.driver)
  if (cfg.excludeDrivers.has(driver)) return false
  return cfg.linkTtlMinutes > 0
}

function keyFor(target: CacheTarget, env?: any): string {
  const cfg = getCacheConfig(env)
  return buildCacheKey("ln", target.storage.id, target.cleanPath, cfg.prefix)
}

/**
 * 读取下载链接缓存。未命中 / 已过期 / 异常均返回 null。
 *
 * 返回的是 FileItem 的浅拷贝，避免调用方就地修改污染缓存内容。
 */
export async function getCachedLink(
  target: CacheTarget,
  env?: any,
): Promise<FileItem | null> {
  if (!isLinkCacheable(target, env)) return null
  try {
    const hit = await cacheGetEnvelope<FileItem>(keyFor(target, env), env)
    if (!hit || !hit.v || typeof hit.v !== "object") return null
    return { ...hit.v }
  } catch {
    return null
  }
}

/**
 * 写入下载链接缓存。
 *
 * 只在「拿到了可用直链」时写入：目录、`raw_url` 为空、或带有
 * `raw_url_error` 的结果都会被跳过。
 */
export async function setCachedLink(
  target: CacheTarget | null | undefined,
  item: FileItem | null | undefined,
  env?: any,
): Promise<void> {
  if (!target || !isLinkCacheable(target, env)) return
  if (!item || item.is_dir) return
  if (!item.raw_url) return
  const ttlMinutes = resolveLinkTtlMinutes(env)
  if (ttlMinutes <= 0) return
  try {
    await cacheSetEnvelope(keyFor(target, env), item, ttlMinutes * 60_000, env)
  } catch {
    // 缓存写入失败绝不影响业务
  }
}

/** 删除单个路径的下载链接缓存（调用方已知 storage）。 */
export async function deleteLinkCacheEntry(
  storageId: any,
  cleanPath: string,
  env?: any,
): Promise<void> {
  const cfg = getCacheConfig(env)
  await cacheDelete(buildCacheKey("ln", storageId, cleanPath, cfg.prefix), env)
}

/**
 * 失效若干虚拟路径对应的下载链接缓存。
 *
 * 仅失效路径自身（下载链接按文件粒度缓存，不存在「父目录链接」）。
 * 路径可能是目录（如删除整个目录），此时其下所有文件的链接会随 TTL
 * 自然过期——直链缓存 TTL 很短（默认 5 分钟），无需递归清理。
 */
export async function invalidateLinks(
  virtualPaths: string[],
  env?: any,
): Promise<void> {
  const cfg = getCacheConfig(env)
  if (!cfg.enabled || !cfg.downloadLink) return

  const keys = new Set<string>()
  for (const p of virtualPaths) {
    try {
      const resolved = await resolvePath(p, env)
      if (resolved.isVirtual || !resolved.storage) continue
      keys.add(
        buildCacheKey("ln", resolved.storage.id, resolved.cleanPath, cfg.prefix),
      )
    } catch {
      // 路径无法解析：忽略
    }
  }
  for (const key of keys) await cacheDelete(key, env)
}
