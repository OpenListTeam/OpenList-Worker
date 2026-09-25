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
  if (typeof value === "number" && Number.isFinite(value))
    return Math.trunc(value)
  if (typeof value === "string" && value.trim() !== "") {
    const n = parseInt(value, 10)
    if (Number.isFinite(n)) return n
  }
  return null
}

/**
 * proxy_range（对齐 Go 的 Range 处理）。
 *
 * 语义：下载走服务端代理时，是否把客户端的 Range 头透传给上游。
 *   - true ：透传 Range（**默认**），上游回 206 时原样回传，支持拖进度条/断点续传
 *   - false：丢弃 Range，由本服务返回完整文件（用于明确拒绝 Range 的上游）
 *
 * 为什么默认 true：Go 的透明代理会把客户端请求头原样转发给上游
 * （internal/net/serve.go 的 ProcessHeader 只按 proxy_ignore_headers 过滤），
 * 也就是说 **Go 默认就透传 Range**，`proxy_range` 在 Go 里只是额外启用驱动的
 * RangeReader/多线程路径。TS 若默认 false，会让代理模式下的 seek / 断点续传
 * 静默退化。上游拒绝或静默忽略 Range 时，由 server/proxy_request.ts 的
 * shouldRetryWithoutRange() 去掉 Range 重试兜底。
 */
export function getProxyRange(storage: any): boolean {
  const raw = storage?.proxy_range ?? storage?.proxyRange
  if (raw === undefined || raw === null || raw === "") return true
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

/** 模式与目标路径的最大长度，超出直接判为不匹配，避免超长输入放大开销 */
const MAX_GLOB_PATTERN_LENGTH = 1024
const MAX_GLOB_TARGET_LENGTH = 4096

/**
 * glob 匹配（对齐 Go 里 doublestar.Match 的按段语义）。
 * 输入路径与模式均已规范化（以 / 开头）。
 *
 * 实现说明（重要）：本函数**不使用正则**。早期版本把 glob 翻译成正则，
 * 多个通配符会变成相邻的贪婪通配，匹配失败时触发灾难性回溯
 * （catastrophic backtracking）——实测单次匹配耗时 508 秒，
 * 构成一个可由存储配置规则直接触发的 DoS 面。
 *
 * 现改为「按 / 切段 + 逐段动态规划」：
 *   - 完全由 2 个及以上星号构成的段（`**`、`***`）：可跨段，匹配 0..n 段
 *   - 其余段：在本段内用迭代式双指针匹配，不跨 `/`
 *   复杂度 O(段数 × 目标段数)，无递归、无指数回溯。
 *
 * 通配符语义：
 *   - 双星段：匹配零个或多个路径段（可跨 `/`）
 *   - 单星：在段内匹配任意字符（含空），**不跨** `/`
 *   - 问号：在段内匹配任意单个字符，**不跨** `/`
 *
 * 长度上限作为额外兜底，防止超长规则/路径放大计算量。
 */
export function matchGlob(pattern: string, target: string): boolean {
  if (!pattern) return false
  if (pattern === target) return true
  if (pattern.length > MAX_GLOB_PATTERN_LENGTH) return false
  if (target.length > MAX_GLOB_TARGET_LENGTH) return false

  // 按 / 切分为路径段后逐段匹配。
  // 这样处理能自然区分「单星只在本段内通配」与「双星可跨任意多段」，
  // 避免在字符级实现里纠缠回溯点的组合问题。
  const pSegs = pattern.split("/")
  const tSegs = target.split("/")

  const pLen = pSegs.length
  const tLen = tSegs.length

  // dp[i][j] 表示 pSegs[i:] 能否匹配 tSegs[j:]
  // 采用一维滚动数组，自后向前填表，复杂度 O(n·m)、无递归。
  let next = new Array<boolean>(tLen + 1).fill(false)
  // 空模式只能匹配空目标
  next[tLen] = true

  for (let i = pLen - 1; i >= 0; i--) {
    const seg = pSegs[i]
    const cur = new Array<boolean>(tLen + 1).fill(false)
    // 完全由星号组成且数量 >= 2 的段视为跨段通配（`**`、`***` 等价）
    const isDoubleStar = /^\*{2,}$/.test(seg)

    if (isDoubleStar) {
      // 双星可匹配 0 段或 1 段后继续由自身匹配
      cur[tLen] = next[tLen]
      for (let j = tLen - 1; j >= 0; j--) {
        cur[j] = next[j] || cur[j + 1]
      }
    } else {
      // 普通段（可能含单星/问号）只匹配一段
      for (let j = tLen - 1; j >= 0; j--) {
        cur[j] = matchSegment(seg, tSegs[j]) && next[j + 1]
      }
    }
    next = cur
  }

  return next[0]
}

/**
 * 单段匹配：仅支持单星（不跨 /）与问号，不含双星。
 * 用迭代式双指针 + 单回溯点实现，为 O(n·m) 且无指数回溯。
 */
function matchSegment(pattern: string, target: string): boolean {
  let pi = 0
  let ti = 0
  let starPi = -1
  let starTi = -1

  const pLen = pattern.length
  const tLen = target.length

  while (ti < tLen) {
    const pc = pi < pLen ? pattern[pi] : undefined
    if (pc === "*") {
      starPi = pi
      starTi = ti
      pi++
      continue
    }
    if (pc === "?" || pc === target[ti]) {
      pi++
      ti++
      continue
    }
    if (starPi !== -1) {
      starTi++
      ti = starTi
      pi = starPi + 1
      continue
    }
    return false
  }

  while (pi < pLen && pattern[pi] === "*") pi++
  return pi === pLen
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
export function resolveCacheExpiration(storage: any, filePath: string): number {
  const normalized =
    "/" +
    String(filePath || "")
      .split("/")
      .filter(Boolean)
      .join("/")
  const base = getCacheExpiration(storage)

  const policies = parseCustomCachePolicies(storage)
  if (policies.length === 0) return base

  let matched: CustomCachePolicy | null = null
  for (const policy of policies) {
    let pattern = policy.path.trim()
    if (!pattern) continue
    if (!pattern.startsWith("/") && !pattern.startsWith("*"))
      pattern = "/" + pattern
    if (
      matchGlob(pattern, normalized) ||
      matchGlob(pattern, normalized.slice(1))
    ) {
      matched = policy
    }
  }

  return matched ? matched.cacheExpiration : base
}
