/**
 * 驱动代理能力声明 + 下载（302 / 代理）决策，对齐 Go 版 OpenList。
 *
 * Go 侧对应实现：
 *   - internal/driver/config.go     Config.MustProxy() / Config.DefaultProxy()
 *   - internal/op/driver.go         web_proxy / webdav_policy 表单默认值分支
 *   - server/common/check.go        ShouldProxy()
 *   - server/handles/down.go        canProxy()
 *   - internal/model/storage.go     Proxy.Webdav302() / Proxy.WebdavProxyURL()
 *
 * 取值语义（与 Go 完全一致）：
 *   - 未配置（undefined / ""）：回退到驱动默认值（DefaultProxy()）
 *   - "302_redirect"    ：302 重定向到真实直链
 *   - "use_proxy_url"   ：重定向到管理员配置的下载代理地址（down_proxy_url）
 *   - "native_proxy"    ：由本服务原生代理转发字节流
 */

export type ProxyMode = "302_redirect" | "use_proxy_url" | "native_proxy"

export type ProxyPolicySource =
  | "force" // 驱动能力强制代理（MustProxy）
  | "web_proxy" // 存储级 web_proxy 开关
  | "proxy_path" // 请求命中 /p、/sd 等代理前缀
  | "storage_policy" // 存储级 webdav_policy
  | "driver_default" // 驱动默认值（PreferProxy）

export interface ProxyDecision {
  /** 最终生效的下载模式 */
  mode: ProxyMode
  /** 是否必须走服务端代理（302 已被排除） */
  needsProxy: boolean
  /** 决策来源，便于日志排查 */
  source: ProxyPolicySource
}

/**
 * 驱动代理能力。
 * 未在此表登记的驱动视为「无强制代理、无默认代理」，行为与此前一致（默认 302）。
 */
const DRIVER_PROXY_CAPABILITY: Record<string, { preferProxy?: boolean }> = {
  webdav: { preferProxy: true },
}

/**
 * 在驱动声明中显式要求强制代理的驱动（等价 Go 的 OnlyProxy / NoLinkURL）。
 * 与 admin.ts 中 config.only_proxy=true / no_link_url=true 的驱动保持一致：
 * 这些驱动拿不到可公开消费的直链，只能由本站代理转发。
 */
const DRIVER_FORCE_PROXY = new Set<string>([
  "123pan",
  "baidunetdisk",
  "115open",
  "sftp",
  "ftp",
  "smb",
  "crypt",
  "virtual",
  "strm",
  "meganz",
  "protondrive",
  "189cloud",
  "mediatrack",
  "chunk",
  "local",
])

/**
 * 运行时注册驱动能力（供驱动模块自声明，避免在此处硬编码驱动清单）。
 * 与下方静态表等价，重复注册以显式声明为准。
 */
export function registerDriverProxyCapability(
  driver: string,
  cap: { preferProxy?: boolean; forceProxy?: boolean },
): void {
  const norm = normalizeDriverName(driver)
  if (!norm) return
  if (cap.forceProxy) DRIVER_FORCE_PROXY.add(norm)
  if (cap.preferProxy) {
    DRIVER_PROXY_CAPABILITY[norm] = { preferProxy: true }
  }
}

/** 管理员自定义下载代理地址的字段（落在 storage.addition 内） */
const PROXY_URL_ADDITION_KEYS = [
  "down_proxy_url",
  "download_proxy_url",
  "proxy_url",
]

/**
 * 规范化驱动名：去除非字母数字并转小写。
 * 与 server/raw.ts 中的同名逻辑保持一致，用于把 admin 表单里的驱动名
 * （如 "123Pan"、"GitHub API"）与存储行上的 driver 值对齐。
 */
export function normalizeDriverName(driver: string | undefined | null): string {
  return String(driver ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
}

/** 该驱动是否强制代理（Go: Config.MustProxy()） */
export function driverMustProxy(driver: string): boolean {
  return DRIVER_FORCE_PROXY.has(normalizeDriverName(driver))
}

/** 该驱动是否默认代理（Go: Config.DefaultProxy()） */
export function driverPreferProxy(driver: string): boolean {
  const cap = DRIVER_PROXY_CAPABILITY[normalizeDriverName(driver)]
  return !!cap?.preferProxy
}

/** Go: Proxy.Webdav302() */
export function isWebdav302(policy: unknown): boolean {
  return policy === "302_redirect"
}

/** Go: Proxy.WebdavProxyURL() */
export function isWebdavProxyURL(policy: unknown): boolean {
  return policy === "use_proxy_url"
}

/** 读取存储行上的代理策略（兼容 camelCase 与 "policy" 别名） */
export function getStoragePolicy(storage: any): string {
  if (!storage) return ""
  const raw =
    storage.webdav_policy ??
    storage.webdavPolicy ??
    storage.policy ??
    storage.webdavPolicyType
  return typeof raw === "string" ? raw.trim() : ""
}

/**
 * 解析管理员配置的自定义下载代理地址（对齐 Go model.Proxy.DownProxyURL）。
 *
 * 优先读取存储行上的顶层字段（后台表单写入的就是这个位置），
 * 再回退到 addition 内的历史别名，保证旧数据仍可用。
 */
export function getDownProxyUrl(storage: any): string {
  if (!storage) return ""

  // 1) 顶层字段（正常路径）
  for (const key of ["down_proxy_url", "downProxyUrl"]) {
    const val = storage[key]
    if (typeof val === "string" && val.trim()) return val.trim()
  }

  // 2) 回退到 addition 内的别名（兼容历史写法）
  let addition: any = storage.addition
  if (typeof addition === "string") {
    try {
      addition = JSON.parse(addition || "{}")
    } catch {
      return ""
    }
  }
  if (!addition || typeof addition !== "object") return ""
  for (const key of PROXY_URL_ADDITION_KEYS) {
    const val = addition[key]
    if (typeof val === "string" && val.trim()) return val.trim()
  }
  return ""
}

export function getDisableProxySign(storage: any): boolean {
  if (!storage) return false
  const raw = storage.disable_proxy_sign ?? storage.disableProxySign
  if (typeof raw === "string") return raw.toLowerCase() === "true"
  return !!raw
}

/**
 * 从 storage.addition 的 order_by / order_direction 解析排序参数。
 * 部分驱动的排序配置落在 addition 而不是 storage 行上，这里做统一兜底。
 */
export function getAdditionOrder(
  storage: any,
): { order_by: string; order_direction: string } | null {
  if (!storage) return null
  let addition: any = storage.addition
  if (typeof addition === "string") {
    try {
      addition = JSON.parse(addition || "{}")
    } catch {
      return null
    }
  }
  if (!addition || typeof addition !== "object") return null
  const by = addition.order_by
  const dir = addition.order_direction
  if (typeof by !== "string" && typeof dir !== "string") return null
  return {
    order_by: typeof by === "string" ? by : "",
    order_direction: typeof dir === "string" ? dir : "",
  }
}

/**
 * 统一的下载模式决策入口（对齐 Go 的 ShouldProxy / canProxy + webdav_policy）。
 *
 * 决策顺序（与 Go 的优先级一致：强制代理 > 存储开关 > 路径 > 存储策略 > 驱动默认）：
 *   1. 驱动强制代理（MustProxy）        → native_proxy
 *   2. 存储级 web_proxy = true          → native_proxy
 *   3. 请求命中代理前缀（/p、/sd ...）  → native_proxy
 *   4. 存储级 webdav_policy 已配置      → 按配置值
 *   5. 驱动默认（PreferProxy）          → native_proxy
 *   6. 兜底                             → 302_redirect（对齐 Go 默认值）
 */
export function resolveProxyDecision(
  storage: any,
  driver: string,
  requestIsProxyPath: boolean,
): ProxyDecision {
  const norm = normalizeDriverName(driver)

  if (DRIVER_FORCE_PROXY.has(norm)) {
    return { mode: "native_proxy", needsProxy: true, source: "force" }
  }

  const webProxy = storage?.web_proxy
  if (webProxy === true || webProxy === "true") {
    return { mode: "native_proxy", needsProxy: true, source: "web_proxy" }
  }

  if (requestIsProxyPath) {
    return { mode: "native_proxy", needsProxy: true, source: "proxy_path" }
  }

  const policy = getStoragePolicy(storage)
  if (policy) {
    return {
      mode: policy as ProxyMode,
      needsProxy: policy !== "302_redirect",
      source: "storage_policy",
    }
  }

  if (driverPreferProxy(norm)) {
    return { mode: "native_proxy", needsProxy: true, source: "driver_default" }
  }

  return { mode: "302_redirect", needsProxy: false, source: "driver_default" }
}
