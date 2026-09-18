/**
 * 驱动代理能力声明 + 下载（302 / 代理）决策，对齐 Go 版 OpenList。
 *
 * Go 侧对应实现：
 *   - internal/driver/config.go     Config.MustProxy() / Config.DefaultProxy()
 *   - internal/op/driver.go         web_proxy / webdav_policy 表单默认值分支
 *   - server/common/check.go        ShouldProxy()（/d：MustProxy || WebProxy || proxy_types）
 *   - server/handles/down.go        canProxy()（/p：再加 webdav_policy=use_proxy_url
 *                                   与 text_types，不满足则 403 proxy not allowed）
 *   - internal/model/storage.go     Proxy.Webdav302() / Proxy.WebdavProxyURL()
 *
 * 本模块保持**纯函数**（不读数据库）：全局设置 proxy_types / text_types 由调用方
 * 从 db 读出后作为参数传入，便于单测。
 *
 * 取值语义（与 Go 完全一致）：
 *   - 未配置（undefined / ""）：回退到驱动默认值（DefaultProxy()）
 *   - "302_redirect"    ：302 重定向到真实直链
 *   - "use_proxy_url"   ：重定向到管理员配置的下载代理地址（down_proxy_url）
 *   - "native_proxy"    ：由本服务原生代理转发字节流
 */

import { parseAdditionLoose } from "./storageopts"

export type ProxyMode = "302_redirect" | "use_proxy_url" | "native_proxy"

export type ProxyPolicySource =
  | "force" // 驱动能力强制代理（MustProxy）
  | "web_proxy" // 存储级 web_proxy 开关
  | "proxy_path" // 请求命中 /p、/sd 等代理前缀
  | "proxy_types" // 全局设置 proxy_types 命中的扩展名（Go: ShouldProxy 第三条）
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
 * ============================================================================
 * 驱动代理能力 ↔ Go drivers/&lt;name&gt;/meta.go 的对应关系（本文件是唯一真相）
 * ============================================================================
 *
 * 维护本文件时请对照 Go 侧 `driver.Config` 的以下字段：
 *
 * | Go config 字段        | 语义                         | 本文件对应               |
 * |----------------------|------------------------------|--------------------------|
 * | `OnlyProxy: true`    | 无可用直链，必须代理          | DRIVER_FORCE_PROXY       |
 * | `NoLinkURL: true`    | Link() 不返回可公开 URL      | DRIVER_FORCE_PROXY       |
 * | `PreferProxy: true`  | 优先代理，但直链可用          | DRIVER_PREFER_PROXY      |
 * | `ProxyRangeOption`   | 支持 proxy_range 开关        | PROXY_RANGE_DRIVERS      |
 *
 * 注意：**权威来源是各驱动的 meta.go**（Go 侧按驱动注册），下表是同步后的快照。
 * Go 侧增删驱动时请同步更新此处；admin.ts 的表单字段与运行时决策都从这里派生，
 * 不要在别处再抄一份。
 *
 * --- OnlyProxy / NoLinkURL（MustProxy，强制 native_proxy，表单不提供 302）---
 *   weiyun        drivers/weiyun/meta.go
 *   sftp          drivers/sftp/meta.go
 *   ftp           drivers/ftp/meta.go
 *   smb           drivers/smb/meta.go
 *   crypt         drivers/crypt/meta.go
 *   virtual       drivers/virtual/meta.go
 *   strm          drivers/strm/meta.go
 *   meganz        drivers/mega/meta.go
 *   protondrive   drivers/proton_drive/meta.go
 *   chunk         drivers/chunk/meta.go
 *   googledrive   drivers/google_drive/meta.go
 *   googlephoto   drivers/google_photo/meta.go
 *   quarkopen     drivers/quark_open/meta.go
 *   quarkuc       drivers/quark_uc/meta.go（Go 注册名为 "UC"）
 *   chaoxing      drivers/chaoxing/meta.go
 *   local         drivers/local/meta.go（TS 走本地文件分支，不经驱动下载链路，
 *                 但 /p 端点判定仍需把它算作「允许代理」）
 *
 *   bunny_storage 在 Go 里是**运行时条件**（配了存储区且未绑 CDN 域名才强制代理），
 *                 由 driverMustProxyForStorage() 处理。
 *
 * --- PreferProxy（DefaultProxy()：web_proxy 未配置时的表单默认值）---
 *   webdav        drivers/webdav/meta.go
 *   baidunetdisk  drivers/baidu_netdisk/meta.go
 *   123pan        drivers/123/meta.go
 *   123open       drivers/123_open/meta.go
 *   123panshare   drivers/123_share/meta.go
 *
 * --- ProxyRangeOption（表单显示 proxy_range）---
 *   139yun        drivers/139/meta.go
 *   alias         drivers/alias/meta.go
 *   alistv3       drivers/alist_v3/meta.go
 *   openlist      drivers/openlist/meta.go
 *
 * 未登记的驱动一律视为「不强制代理、不默认代理」→ 默认 302_redirect。
 *
 * --- 与 Go 的差异 ---
 * 1. `PreferProxy` 在 Go 里只用于**表单默认值**；本文件让它在运行时也生效（仅当存储
 *    的 `web_proxy` 未配置时兜底），否则 TS 存量数据（web_proxy 为 null）会把默认
 *    应当代理的驱动判成直链。
 * 2. Go 的透明代理会转发**全部**客户端请求头（只按 proxy_ignore_headers 过滤）；
 *    本 TS 实现只转发少量必要的头（客户端 Range + 兜底 User-Agent + 驱动声明的头），
 *    以免把客户端 Cookie / Authorization 泄露给第三方上游。proxy_ignore_headers
 *    仍然作用于这些会转发的头（见 server/proxy_request.ts 的 buildUpstreamHeaders）。
 * 3. Go 的多线程 RangeReader（Config.Concurrency/PartSize 与
 *    internal/stream.GetRangeReaderFromLink）未实现：TS 用「透传客户端 Range，
 *    上游拒绝/忽略时去掉 Range 重试一次」达到同等可用性，但不做并行分片下载。
 */

/** 强制代理（Go: Config.MustProxy() = OnlyProxy || NoLinkURL） */
const DRIVER_FORCE_PROXY = new Set<string>([
  "weiyun",
  "sftp",
  "ftp",
  "smb",
  "crypt",
  "virtual",
  "strm",
  "meganz",
  "protondrive",
  "chunk",
  "googledrive",
  "googlephoto",
  "quarkopen",
  "quarkuc",
  "chaoxing",
  "local",
])

/** 默认代理（Go: Config.DefaultProxy() = PreferProxy） */
const DRIVER_PREFER_PROXY = new Set<string>([
  "webdav",
  "baidunetdisk",
  "123pan",
  "123open",
  "123panshare",
])

/**
 * 允许 `proxy_range` 的驱动（等价 Go 的 Config.ProxyRangeOption）。
 * 供 admin.ts 决定是否展示 proxy_range 表单项。
 *
 * 注意：透传客户端 Range 是**默认行为**（对齐 Go 透明代理总是转发客户端头），
 * 该开关只在这几个驱动上作为「可显式关闭」的入口，Go 里 139Yun 实例默认
 * `d.ProxyRange = true` 的差异因此不再需要单独表达。
 */
export const PROXY_RANGE_DRIVERS = new Set([
  "139yun",
  "alias",
  "alistv3",
  "openlist",
])

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

/**
 * 归一化扩展名列表（全局设置里是逗号分隔字符串，Go: conf.SlicesMap）。
 * 与 Go 的 utils.Ext 一致：小写、不带点。
 */
export function normalizeExtList(value: unknown): string[] {
  const raw = Array.isArray(value) ? value.join(",") : value
  return String(raw ?? "")
    .split(",")
    .map((v) => v.trim().toLowerCase().replace(/^\./, ""))
    .filter(Boolean)
}

/**
 * 取路径的扩展名（小写、不带点）；无扩展名返回 ""。
 *
 * 与 Go utils.Ext 一致：取最后一个点之后的部分并小写，因此 `.gitignore`
 * 这类隐藏文件的扩展名是 `gitignore`（Go 的 text_types 默认值里也确实有它）。
 */
export function extensionOf(filePath: string | undefined | null): string {
  const base = String(filePath ?? "")
    .split("/")
    .pop()
    ?.trim()
  if (!base) return ""
  const idx = base.lastIndexOf(".")
  if (idx < 0 || idx === base.length - 1) return ""
  return base.slice(idx + 1).toLowerCase()
}

/**
 * 该驱动是否强制代理（Go: Config.MustProxy()）。静态能力，见上方能力表。
 *
 * 注意 bunny_storage 的能力是**运行时条件**，需要存储上下文，
 * 请用 driverMustProxyForStorage()。
 */
export function driverMustProxy(driver: string): boolean {
  return DRIVER_FORCE_PROXY.has(normalizeDriverName(driver))
}

/**
 * bunny_storage 是否必须代理。
 *
 * Go drivers/bunny_storage/driver.go 的 Config()：
 *   if d.StorageZoneName != "" && d.CDNBaseURL == "" { cfg.OnlyProxy = true; cfg.PreferProxy = true }
 * 即「配了存储区但没绑 CDN 域名」时只有 Storage API 可读（需 AccessKey 头），
 * 浏览器直连会 401，必须由服务端代理。绑定了 CDN 则直链可用。
 */
function bunnyStorageNeedsProxy(storage: any): boolean {
  const addition = parseAdditionLoose(storage?.addition)
  const zone = String(addition.storage_zone_name ?? "").trim()
  const cdn = String(addition.cdn_base_url ?? "").trim()
  return zone !== "" && cdn === ""
}

/** 存储感知的 MustProxy 判定（Go: storage.Config().MustProxy()） */
export function driverMustProxyForStorage(
  storage: any,
  driver?: string,
): boolean {
  const norm = normalizeDriverName(driver ?? storage?.driver)
  if (DRIVER_FORCE_PROXY.has(norm)) return true
  if (norm === "bunnystorage") return bunnyStorageNeedsProxy(storage)
  return false
}

/** 该驱动是否默认代理（Go: Config.DefaultProxy() = PreferProxy） */
export function driverPreferProxy(driver: string): boolean {
  return DRIVER_PREFER_PROXY.has(normalizeDriverName(driver))
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
/**
 * 存储级 web_proxy 的**生效值**。
 *
 * Go 的行为：`web_proxy` 是存储字段，其**默认值**由驱动能力决定
 * （`op/driver.go`：PreferProxy 驱动的表单默认 true），运行时只看该字段
 * （`common.ShouldProxy`：`MustProxy() || WebProxy`）。
 *
 * TS 的存量数据里 `web_proxy` 常为 null（早期表单未写入），直接按 false 处理会
 * 把本该默认代理的驱动（WebDav 等）判成直链——这正是历史上「WebDAV 下载丢认证」
 * 的成因。因此这里在字段未配置时回退到驱动默认值，等价于 Go 的表单默认。
 */
export function effectiveWebProxy(storage: any, driver: string): boolean {
  const raw = storage?.web_proxy ?? storage?.webProxy
  if (raw === true || raw === "true") return true
  if (raw === false || raw === "false") return false
  return driverPreferProxy(driver)
}

/**
 * 统一的下载模式决策入口（对齐 Go 的 ShouldProxy + webdav_policy）。
 *
 * 决策顺序（对齐 Go：强制代理 > 存储开关 > 路径 > proxy_types > 存储策略 > 直链）：
 *   1. 驱动强制代理（MustProxy，含 bunny_storage 的条件能力）→ native_proxy
 *   2. 存储级 web_proxy（未配置时取驱动默认）               → native_proxy
 *   3. 请求命中代理前缀（/p、/sd ...）                      → native_proxy
 *   4. 扩展名命中全局 proxy_types（Go ShouldProxy 第三条）   → native_proxy
 *   5. 存储级 webdav_policy 已配置                          → 按配置值
 *   6. 兜底                                                 → 302_redirect
 *
 * 与 Go 的差异：Go 的 `ShouldProxy` 不看 `webdav_policy`（`302_redirect` 只作用于
 * WebDAV 协议端点，`use_proxy_url` 由 `canProxy` 处理）；TS 在此统一按策略值决策，
 * 因此「webdav_policy=native_proxy 且 web_proxy=false」在 TS 会代理、在 Go 会直链。
 *
 * @param opts.filename   目标路径，用于取扩展名与 proxy_types 比对
 * @param opts.proxyTypes 全局设置 proxy_types（默认 m3u8,url，见 db.ts）
 */
export function resolveProxyDecision(
  storage: any,
  driver: string,
  requestIsProxyPath: boolean,
  opts: { filename?: string; proxyTypes?: unknown } = {},
): ProxyDecision {
  const norm = normalizeDriverName(driver)

  if (driverMustProxyForStorage(storage, norm)) {
    return { mode: "native_proxy", needsProxy: true, source: "force" }
  }

  if (effectiveWebProxy(storage, norm)) {
    return { mode: "native_proxy", needsProxy: true, source: "web_proxy" }
  }

  if (requestIsProxyPath) {
    return { mode: "native_proxy", needsProxy: true, source: "proxy_path" }
  }

  // Go ShouldProxy 的第三条：proxy_types 命中的扩展名（如 m3u8、url）必须由服务端
  // 代理——这类文件内部含相对引用，只有经本服务转发才能正确解析。
  if (matchesExtList(extensionOf(opts.filename), opts.proxyTypes)) {
    return { mode: "native_proxy", needsProxy: true, source: "proxy_types" }
  }

  const policy = getStoragePolicy(storage)
  if (policy) {
    return {
      mode: policy as ProxyMode,
      needsProxy: policy !== "302_redirect",
      source: "storage_policy",
    }
  }

  return { mode: "302_redirect", needsProxy: false, source: "driver_default" }
}

/** 扩展名是否命中设置里的扩展名列表（空列表不命中） */
function matchesExtList(ext: string, list: unknown): boolean {
  if (!ext) return false
  return normalizeExtList(list).includes(ext)
}

/**
 * 是否允许使用 /p 代理端点（Go: server/handles/down.go 的 canProxy()）。
 *
 * Go 的 `/p` 路由在取链接前先跑这道检查，不通过直接 403 "proxy not allowed"：
 *   MustProxy() || WebProxy || WebdavProxyURL() || proxy_types || text_types
 *
 * 与 resolveProxyDecision 的差别：
 *   - 额外接受 `text_types`：前端 Readme / 歌词 / 字幕 / 弹幕等预览走 /p 读取文本
 *     文件，即使存储没开 web_proxy 也应当允许；
 *   - 额外接受 `webdav_policy=use_proxy_url`（Go canProxy 显式包含 WebdavProxyURL）。
 *
 * 注意：Go 只对 /p（以及归档的 /ap）做此限制，/d、/sd 不限制（它们走 ShouldProxy），
 * 因此调用方只能把这个判断用在 /p 端点上。
 */
export function canUseProxyEndpoint(input: {
  storage: any
  driver: string
  filename?: string
  proxyTypes?: unknown
  textTypes?: unknown
}): boolean {
  const norm = normalizeDriverName(input.driver)
  if (driverMustProxyForStorage(input.storage, norm)) return true
  if (effectiveWebProxy(input.storage, norm)) return true
  if (getStoragePolicy(input.storage) === "use_proxy_url") return true
  const ext = extensionOf(input.filename)
  if (!ext) return false
  return (
    matchesExtList(ext, input.proxyTypes) ||
    matchesExtList(ext, input.textTypes)
  )
}
