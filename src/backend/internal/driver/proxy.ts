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
/**
 * ============================================================================
 * 驱动代理能力 ↔ Go drivers/&lt;name&gt;/meta.go 的对应关系
 * ============================================================================
 *
 * 维护本文件时请对照 Go 侧 `driver.Config` 的以下字段：
 *
 * | Go config 字段        | 语义                         | 本文件对应               |
 * |----------------------|------------------------------|--------------------------|
 * | `OnlyProxy: true`    | 无可用直链，必须代理          | DRIVER_FORCE_PROXY       |
 * | `NoLinkURL: true`    | Link() 不返回可公开 URL      | DRIVER_FORCE_PROXY       |
 * | `PreferProxy: true`  | 优先代理，但直链可用          | preferProxy: true        |
 * | `ProxyRangeOption`   | 支持 proxy_range 开关        | admin.ts 的 PROXY_RANGE_DRIVERS |
 *
 * 注意：`OnlyProxy`/`NoLinkURL` 的**权威来源是各驱动的 meta.go**，
 * 下表是同步后的快照。若 Go 侧增删驱动，请同步更新此处，
 * 并保持与 admin.ts 中 `only_proxy: true` 的驱动集合一致。
 *
 * --- OnlyProxy / NoLinkURL（强制 native_proxy，表单不提供 302 选项）---
 *   123pan        drivers/123/meta.go
 *   baidunetdisk  drivers/baidu_netdisk/meta.go
 *   115open       drivers/115_open/meta.go
 *   sftp          drivers/sftp/meta.go
 *   ftp           drivers/ftp/meta.go
 *   smb           drivers/smb/meta.go
 *   crypt         drivers/crypt/meta.go
 *   virtual       drivers/virtual/meta.go
 *   strm          drivers/strm/meta.go
 *   meganz        drivers/mega/meta.go
 *   protondrive   drivers/proton_drive/meta.go
 *   189cloud      drivers/189/meta.go
 *   weiyun        drivers/weiyun/meta.go（见下方 DRIVER_PROXY_CAPABILITY）
 *
 * --- PreferProxy（默认 native_proxy）---
 *   webdav        drivers/webdav/meta.go
 *
 * --- ProxyRangeOption（表单显示 proxy_range）---
 *   139yun        drivers/139/meta.go（实例默认 ProxyRange = true）
 *   alias         drivers/alias/meta.go
 *   alistv3       drivers/alist_v3/meta.go
 *   openlist      drivers/openlist/meta.go
 *
 * 未登记的驱动一律视为「不强制代理、不默认代理」→ 默认 302_redirect。
 */

const DRIVER_PROXY_CAPABILITY: Record<
  string,
  { preferProxy?: boolean; forceProxy?: boolean }
> = {
  // drivers/webdav/meta.go: PreferProxy = true
  webdav: { preferProxy: true },
}

/**
 * 强制代理驱动的运行时集合（等价 Go 的 OnlyProxy / NoLinkURL）。
 *
 * 运行时集合而非静态常量，是因为另有驱动模块通过
 * registerDriverProxyCapability() 自声明能力；
 * 初始值对应上方映射表中「OnlyProxy / NoLinkURL」一节。
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
  "weiyun",
])

/**
 * 允许 `proxy_range` 的驱动（等价 Go 的 Config.ProxyRangeOption）。
 * 供 admin.ts 决定是否展示 proxy_range 表单项。
 */
export const PROXY_RANGE_DRIVERS = new Set([
  "139yun",
  "alias",
  "alistv3",
  "openlist",
])

/** 139Yun 的 proxy_range 默认值为 true（对齐 Go drivers/139 的 d.ProxyRange = true） */
export function proxyRangeDefaultFor(driver: string): boolean {
  return normalizeDriverName(driver) === "139yun"
}

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
