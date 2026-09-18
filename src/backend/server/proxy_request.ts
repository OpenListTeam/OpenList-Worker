/**
 * 原生代理的上游请求构造与响应判定。
 *
 * 从 raw.ts 抽出的原因：这些逻辑（Range 透传、412/200 兜底、响应头清洗）
 * 是纯函数式判断，抽离后可以脱离 Hono 上下文直接做单元测试，
 * 覆盖「Range 透传 + 签名 + 上游不支持 Range」的交互边界。
 */

import { parseRangeHeader } from "../internal/stream/stream"
import { driverMustProxyForStorage } from "../internal/driver/proxy"

export const PROXY_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

export interface BuildUpstreamHeadersInput {
  /** 驱动提供的原始头（Cookie / Referer / Authorization 等） */
  rawUrlHeaders?: Record<string, string> | null
  /** 客户端请求携带的 Range */
  rangeHeader?: string | null
  /** 存储的 proxy_range 开关（对齐 Go model.Proxy.ProxyRange） */
  proxyRange: boolean
  /**
   * 全局设置 proxy_ignore_headers（对齐 Go conf.ProxyIgnoreHeaders，默认
   * authorization,referer）。命中列表的**客户端派生头**不转发给上游
   * （本模块会转发的客户端头只有 Range 与兜底 User-Agent）；
   * 驱动自己声明的头（rawUrlHeaders）不受影响——Go 的 ProcessHeader 同样是
   * 先过滤客户端头、再套用驱动 override。
   */
  ignoreHeaders?: unknown
}

/**
 * 构造发往上游的请求头。
 *
 * proxy_range 语义（对齐 Go）：
 *   - true  ：透传客户端 Range，上游支持时可回 206，支持拖进度条/断点续传
 *   - false ：不透传 Range，请求完整文件（用于不支持 Range 的上游）
 *
 * 注意与签名的关系：本函数**不修改** raw_url 上的签名参数。
 * 签名绑定的是 URL 中的路径与过期时间，不包含请求头，
 * 因此丢弃或保留 Range 头都不需要重新计算签名。
 */
export function buildUpstreamHeaders(
  input: BuildUpstreamHeadersInput,
): Record<string, string> {
  const ignored = normalizeHeaderNameSet(input.ignoreHeaders)
  const headers: Record<string, string> = {
    ...(input.rawUrlHeaders || {}),
  }

  // 驱动已显式设置 UA 时不覆盖
  if (!headers["User-Agent"] && !ignored.has("user-agent")) {
    headers["User-Agent"] = PROXY_USER_AGENT
  }

  if (input.proxyRange && input.rangeHeader && !ignored.has("range")) {
    headers["Range"] = input.rangeHeader
  }

  return headers
}

/** 归一化被忽略的请求头名（小写）；Go 默认值是 authorization,referer */
function normalizeHeaderNameSet(value: unknown): Set<string> {
  const raw = Array.isArray(value) ? value.join(",") : value
  return new Set(
    String(raw ?? "")
      .split(",")
      .map((v) => v.trim().toLowerCase())
      .filter(Boolean),
  )
}

export interface UpstreamResponseLike {
  status: number
  headers: { get(name: string): string | null }
}

/**
 * 判断是否需要「去掉 Range 重试一次」。
 *
 * 两种上游不配合的情形：
 *   1. 412 Precondition Failed —— 严格校验 Range 的 OSS/网关
 *   2. 200 且没有 Content-Range —— 上游静默忽略 Range，回了完整文件
 *
 * 仅在本次请求确实带了 Range 时才重试，避免无意义地重复请求。
 */
export function shouldRetryWithoutRange(
  headers: Record<string, string>,
  upstream: UpstreamResponseLike,
): boolean {
  if (!headers["Range"]) return false
  if (upstream.status === 412) return true
  if (upstream.status === 200 && !upstream.headers.get("content-range")) {
    return true
  }
  return false
}

/** 上层文件扩展名 → Content-Type 回退表 */
const EXT_CONTENT_TYPE: Record<string, string> = {
  pdf: "application/pdf",
  mp4: "video/mp4",
  webm: "video/webm",
  mkv: "video/x-matroska",
  mp3: "audio/mpeg",
  flac: "audio/flac",
  m3u8: "application/vnd.apple.mpegurl",
  ts: "video/mp2t",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  svg: "image/svg+xml",
}

/** 按扩展名推断 Content-Type（上游未提供时使用） */
export function contentTypeForPath(reqPath: string): string {
  const ext = reqPath.split(".").pop()?.toLowerCase() || ""
  return EXT_CONTENT_TYPE[ext] || "application/octet-stream"
}

/**
 * 清洗 Content-Disposition，移除 CR/LF 与控制字符。
 * 防止恶意上游通过该头注入额外响应头（Set-Cookie / Location）。
 */
export function sanitizeContentDisposition(value: string): string {
  return value.replace(/[\r\n\u0000-\u001f]+/g, "")
}

// ---------------------------------------------------------------------------
// 平台载荷上限保护（Serverless / 云函数）
// ---------------------------------------------------------------------------
//
// EdgeOne Makers 的 Cloud Functions 对「函数的请求/响应 body」有 6 MiB 硬上限，
// 超限时平台在网关层直接返回 413 + CLOUD_FUNCTION_PAYLOAD_TOO_LARGE
// （Powered by Tencent EdgeOne Makers 的错误页）——请求根本到不了本服务：
// 应用侧的 CORS 头、Range 处理、错误提示一律不会执行。
//
// 而 native_proxy 会把整份文件当作云函数响应体回传，于是任何 >6 MiB 的代理
// 下载在 EdgeOne 上必然失败（OneDrive 此前被硬编码强制代理，正是 issue 中
// 「EO + OneDrive 下载报 413」的根因，见 resolveProxyDecision() 的修复）。
// 因此在发起原生代理前先做一次上限判断：
//   - 未超限（或平台不限制）        → 正常代理
//   - 超限 + raw_url 可被浏览器直连 → 降级 302 直链（下载仍然可用）
//   - 超限 + 无法降级为直链         → 返回可读的 413，而不是平台错误页
//
// 环境变量：
//   RAW_PROXY_MAX_BYTES  平台单次请求/响应上限（字节）。缺省时在 EdgeOne 运行时
//                        自动取 6 MiB；其他平台视为不限制；显式设为 0 关闭限制
//                        （自托管场景可据此恢复「永远代理」）。

/** EdgeOne 云函数对单次请求/响应 body 的硬上限 */
export const DEFAULT_EDGEONE_PAYLOAD_LIMIT = 6 * 1024 * 1024

/** 原生代理前的上限判断结果 */
export type ProxyPayloadAction = "proxy" | "redirect" | "too-large"

const readEnvValue = (c: any, key: string): string => {
  const env = c?.env || {}
  const fromEnv = env[key]
  if (fromEnv !== undefined && fromEnv !== null) return String(fromEnv)
  if (typeof process !== "undefined" && (process as any).env) {
    const value = (process as any).env[key]
    if (value !== undefined && value !== null) return String(value)
  }
  return ""
}

/**
 * 当前运行时是否 EdgeOne（Node 云函数 / 边缘函数）。
 *
 * 判据对齐 internal/model/store/backend.ts 的 isServerlessRuntime()：
 *   1. EdgeOne Node 云函数跑在腾讯 SCF 上，平台会注入 `TENCENTCLOUD_SCF_FUNCTIONNAME`
 *      —— 这是该形态**唯一可靠**的平台特征（旧版只查 EDGEONE/EO_REGION，而这两个
 *      变量并没有证据表明会被云函数注入，会导致本守卫在 EdgeOne 上永不生效）；
 *   2. 绑定了 Blob 命名空间或运行在边缘函数时，有 `EDGEONE_BLOB` / 全局 `EdgeOne`。
 *
 * 刻意**不**使用 `__requestOrigin`：它由本项目 index.ts 中间件在所有平台上注入
 * （见 src/backend/index.ts），拿它判 EdgeOne 会把 Cloudflare / 自托管一并误判，
 * 反而让 CF 上的大文件代理被无故降级为 302。
 *
 * 同理，Cloudflare Workers 与阿里云 ESA 不套用 6 MiB：CF 的函数 body 上限远高于此，
 * 本限制是 EdgeOne 云函数特有的，因此这里只认 EdgeOne 自身的特征。
 */
function isEdgeOneRuntime(c: any): boolean {
  const g: any = typeof globalThis !== "undefined" ? globalThis : {}
  const env = c?.env || {}
  const procEnv: any =
    typeof process !== "undefined" ? (process as any).env || {} : {}
  return Boolean(
    env.EDGEONE ||
    env.EO_REGION ||
    env.EDGEONE_BLOB ||
    g.EDGEONE_BLOB ||
    typeof g.EdgeOne !== "undefined" ||
    env.TENCENTCLOUD_SCF_FUNCTIONNAME ||
    procEnv.TENCENTCLOUD_SCF_FUNCTIONNAME,
  )
}

/** 平台单次请求/响应 body 上限（字节）；0 表示不限制 */
export function getProxyPayloadLimit(c: any): number {
  const raw = readEnvValue(c, "RAW_PROXY_MAX_BYTES").trim()
  if (raw !== "") {
    const parsed = parseInt(raw, 10)
    if (Number.isFinite(parsed) && parsed >= 0) return parsed
  }
  return isEdgeOneRuntime(c) ? DEFAULT_EDGEONE_PAYLOAD_LIMIT : 0
}

/**
 * 本次代理是否会让响应体超过平台上限。
 *
 * Range 只回传一个分片时按分片大小判断（视频拖动进度、断点续传不受影响）；
 * 大小未知时一律放行，交给平台兜底。
 */
export function exceedsProxyPayloadLimit(
  size: number,
  range: string | null | undefined,
  limit: number,
): boolean {
  if (!Number.isFinite(limit) || limit <= 0) return false
  if (!Number.isFinite(size) || size <= 0) return false
  if (range) {
    try {
      return parseRangeHeader(range, size).chunksize > limit
    } catch {
      return false
    }
  }
  return size > limit
}

/**
 * 私有请求头（浏览器无法自带）：只有这些头才让 302 直链失去可行性。
 *
 * 仓库内 33 处 `raw_url_headers` 实际只用到 Authorization / Cookie /
 * User-Agent / Referer / Origin，其中只有前两者是浏览器无法提供的鉴权信息
 * （如 WebDAV、微云、Google Drive、Teldrive）。驱动若引入新的鉴权头，
 * 应按 Go 的 meta.go 把该驱动登记为 MustProxy（见 internal/driver/proxy.ts），
 * 而不是在这里堆一个「猜头名」的规则。
 */
const PRIVATE_HEADER_NAMES = new Set(["authorization", "cookie"])

/** raw_url 是否要求私有请求头（浏览器直连会 401/403） */
export function rawUrlNeedsPrivateHeaders(
  headers?: Record<string, string> | null,
): boolean {
  if (!headers) return false
  return Object.keys(headers).some((k) =>
    PRIVATE_HEADER_NAMES.has(k.trim().toLowerCase()),
  )
}

/**
 * 该下载是否必须由服务端转发字节流、无法降级为 302 直链。
 *
 * 两类情况：
 *   1. 驱动本身没有可公开的直链（Go 的 OnlyProxy / NoLinkURL，即 driverMustProxy）；
 *   2. 直链必须携带私有请求头（Authorization / Cookie，如 WebDAV、微云）。
 */
export function isAuthBoundDownload(
  driver: string,
  rawUrlHeaders?: Record<string, string> | null,
  storage?: any,
): boolean {
  return (
    driverMustProxyForStorage(storage, driver) ||
    rawUrlNeedsPrivateHeaders(rawUrlHeaders)
  )
}

/**
 * 从上游响应头解析本次实际会回传的字节数。
 *
 * 用途：`shouldRetryWithoutRange()` 会删掉 Range 重新请求，上游忽略 Range 时也会
 * 直接回 200 + 完整文件——此时回传的是**整份文件**而不是客户端请求的分片。
 * 仅按「分片大小」通过前置上限检查是不够的，必须用上游给出的实际长度复核，
 * 否则小分片请求会把整份文件塞进云函数响应体（EdgeOne 6 MiB → 413）。
 *
 * 取值优先级：Content-Length → Content-Range 的分段长度 → 0（未知）。
 */
export function upstreamBodySize(
  headers: { get(name: string): string | null } | null | undefined,
): number {
  if (!headers) return 0
  const contentLength = parseInt(headers.get("content-length") || "", 10)
  if (Number.isFinite(contentLength) && contentLength > 0) return contentLength
  const contentRange = headers.get("content-range") || ""
  const match = /bytes\s+(\d+)-(\d+)\/(\d+|\*)/i.exec(contentRange)
  if (match) {
    const start = parseInt(match[1], 10)
    const end = parseInt(match[2], 10)
    if (Number.isFinite(start) && Number.isFinite(end) && end >= start) {
      return end - start + 1
    }
  }
  return 0
}

/**
 * 原生代理前的上限决策。
 *
 * @param size           文件总大小（0 表示未知）
 * @param range          实际会透传给上游的 Range（proxy_range 关闭时应传 undefined，
 *                       因为此时上游返回的是完整文件，分片大小无法作为依据）
 * @param authBound      无法降级为直链时为 true
 *
 * 超限时：可直连（authBound=false）→ 降级 302；否则 → too-large（返回可读 413）。
 */
export function decideProxyPayloadAction(input: {
  size: number
  range?: string | null
  payloadLimit: number
  authBound: boolean
}): ProxyPayloadAction {
  if (!exceedsProxyPayloadLimit(input.size, input.range, input.payloadLimit)) {
    return "proxy"
  }
  // 超过平台上限：能交给浏览器直连就降级 302，否则必须给出可读错误，
  // 而不是让平台返回它自己的 413 错误页。
  return input.authBound ? "too-large" : "redirect"
}
