/**
 * 存储级行为选项：proxy_range / enable_sign / disable_index / cache_expiration
 * / custom_cache_policies。
 *
 * 这些字段在 Go 版由 internal/model/storage.go 与 internal/op/driver.go 定义并
 * 在下载链路中实际生效；在 TSWorker 中此前只有数据库列与表单项、没有读取方，
 * 本模块把它们统一解析出来，供下载/列表链路使用。
 *
 * Go 对应位置：
 *   - model.Storage.ProxyRange            → proxy_range（driver.Config.ProxyRangeOption）
 *   - model.Storage.EnableSign            → common.IsStorageSignEnabled
 *   - model.Storage.DisableIndex          → handles.FsList
 *   - model.Storage.CacheExpiration       → 对象缓存时长
 *   - model.Storage.CustomCachePolicies   → 路径级缓存覆盖
 */

/** 单条自定义缓存策略（对齐 Go model.CustomCachePolicy） */
export interface CustomCachePolicy {
  /** 路径通配符，如 "/photos/*"、"*.log"、"/cache/**" */
  path: string
  /** 命中后的缓存时长（分钟），0 表示不缓存 */
  cacheExpiration: number
  /** 可选的 max_age（秒）；缺省时由 cacheExpiration 推导 */
  maxAge?: number
}

const DEFAULT_CACHE_EXPIRATION_MINUTES = 30

/** storage.addition 可能是 JSON 字符串或已解析对象，统一解析 */
export function parseAdditionLoose(addition: any): Record<string, any> {
  if (!addition) return {}
  if (typeof addition === "object") return addition
  if (typeof addition === "string") {
    try {
      const parsed = JSON.parse(addition || "{}")
      return parsed && typeof parsed === "object" ? parsed : {}
    } catch {
      return {}
    }
  }
  return {}
}

function asBool(value: any): boolean {
  if (typeof value === "string") return value.toLowerCase() === "true"
  return value === true
}

function asInt(value: any): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return Math.trunc(value)
  if (typeof value === "string" && value.trim() !== "") {
    const n = parseInt(value, 10)
    if (Number.isFinite(n)) return n
  }
  return null
}

/**
 * proxy_range（对齐 Go model.Proxy.ProxyRange）。
 *
 * 语义：当下载走服务端代理时，是否把客户端的 Range 头透传给上游。
 *   - true  ：透传 Range，上游返回 206 时原样回传，支持拖进度条/断点续传
 *   - false ：丢弃 Range，由本服务返回完整文件（上游不支持 Range 时使用）
 *
 * 注意 Go 里 139Yun 驱动实例默认 d.ProxyRange = true，这里通过驱动的
 * proxyRangeDefault 能力标志表达，未配置时回退到该默认值。
 */
export function getProxyRange(storage: any): boolean {
  if (!storage) return false
  const raw = storage.proxy_range ?? storage.proxyRange
  if (raw === undefined || raw === null || raw === "") {
    return storage.__driverProxyRangeDefault === true
  }
  return asBool(raw)
}

/** enable_sign（对齐 Go common.IsStorageSignEnabled） */
export function getEnableSign(storage: any): boolean {
  if (!storage) return false
  return asBool(storage.enable_sign ?? storage.enableSign)
}

/** disable_index（对齐 Go model.Storage.DisableIndex） */
export function getDisableIndex(storage: any): boolean {
  if (!storage) return false
  return asBool(storage.disable_index ?? storage.disableIndex)
}

/**
 * 存储的基础缓存时长（分钟）。等价于 Go model.Storage.CacheExpiration。
 * 未配置时回退 30 分钟。
 */
export function getCacheExpiration(storage: any): number {
  const raw = asInt(storage?.cache_expiration ?? storage?.cacheExpiration)
  if (raw === null || raw < 0) return DEFAULT_CACHE_EXPIRATION_MINUTES
  return raw
}

/**
 * 解析 custom_cache_policies（对齐 Go 的路径级缓存覆盖）。
 *
 * 兼容多种书写形式：
 *   - JSON 字符串：'[{"path":"/a/*","cache_expiration":10}]'
 *   - 对象数组
 *   - key-value 映射：{"/a/*": 10}
 * 逗号分隔的字符串形式也做了容错。
 */
export function parseCustomCachePolicies(storage: any): CustomCachePolicy[] {
  let raw = storage?.custom_cache_policies ?? storage?.customCachePolicies
  if (!raw) return []

  if (typeof raw === "string") {
    const trimmed = raw.trim()
    if (!trimmed) return []
    try {
      raw = JSON.parse(trimmed)
    } catch {
      // 容错：退化为 "路径:分钟,路径:分钟" 形式
      const policies: CustomCachePolicy[] = []
      for (const chunk of trimmed.split(",")) {
        const idx = chunk.lastIndexOf(":")
        if (idx <= 0) continue
        const p = chunk.slice(0, idx).trim()
        const v = asInt(chunk.slice(idx + 1).trim())
        if (p && v !== null) policies.push({ path: p, cacheExpiration: v })
      }
      return policies
    }
  }

  const policies: CustomCachePolicy[] = []

  if (Array.isArray(raw)) {
    for (const entry of raw) {
      if (!entry) continue
      if (typeof entry === "string") {
        const idx = entry.lastIndexOf(":")
        if (idx <= 0) continue
        const p = entry.slice(0, idx).trim()
        const v = asInt(entry.slice(idx + 1).trim())
        if (p && v !== null) policies.push({ path: p, cacheExpiration: v })
        continue
      }
      if (typeof entry === "object") {
        const p = entry.path ?? entry.Path
        const v =
          asInt(entry.cache_expiration ?? entry.cacheExpiration) ??
          asInt(entry.max_age ?? entry.maxAge)
        if (typeof p === "string" && p && v !== null) {
          const maxAge = asInt(entry.max_age ?? entry.maxAge)
          policies.push({
            path: p,
            cacheExpiration: v,
            ...(maxAge !== null ? { maxAge } : {}),
          })
        }
      }
    }
    return policies
  }

  if (typeof raw === "object") {
    for (const [key, value] of Object.entries(raw)) {
      const v = asInt(value)
      if (key && v !== null) policies.push({ path: key, cacheExpiration: v })
    }
  }

  return policies
}

/**
 * glob 匹配（对齐 Go 里对路径通配符的处理，支持 `*`、`?`、`**`）。
 * 输入路径与模式均已规范化（以 / 开头）。
 */
export function matchGlob(pattern: string, target: string): boolean {
  if (!pattern) return false
  if (pattern === target) return true
  // 转义正则元字符，再把通配符翻译为等价正则
  const escaped = pattern
    .replace(/[.+^${}()|[\]\\]/g, "\\$&")
    .replace(/\*\*/g, "\u0000")
    .replace(/\*/g, "[^/]*")
    .replace(/\?/g, "[^/]")
    .replace(/\u0000/g, ".*")
  try {
    return new RegExp(`^${escaped}$`).test(target)
  } catch {
    return false
  }
}

/**
 * 计算某个路径在特定存储下的缓存时长（分钟）。
 *
 * 匹配优先级（对齐 Go：自定义策略优先于存储基础值）：
 *   1. custom_cache_policies 中命中的规则——**最后一条命中的规则优先**，
 *      与 Go 的顺序覆盖语义一致
 *   2. 存储级 cache_expiration
 *   3. 默认 30
 *   4. 命中规则时按规则值返回（minute=0 表示不缓存）
 */
export function resolveCacheExpiration(
  storage: any,
  filePath: string,
): number {
  const normalized = "/" + String(filePath || "").split("/").filter(Boolean).join("/")
  const base = getCacheExpiration(storage)

  const policies = parseCustomCachePolicies(storage)
  if (policies.length === 0) return base

  let matched: CustomCachePolicy | null = null
  for (const policy of policies) {
    let pattern = policy.path.trim()
    if (!pattern) continue
    if (!pattern.startsWith("/") && !pattern.startsWith("*")) pattern = "/" + pattern
    if (matchGlob(pattern, normalized) || matchGlob(pattern, normalized.slice(1))) {
      matched = policy
    }
  }

  return matched ? matched.cacheExpiration : base
}
