/**
 * 原生代理的上游请求构造与响应判定。
 *
 * 从 raw.ts 抽出的原因：这些逻辑（Range 透传、412/200 兜底、响应头清洗）
 * 是纯函数式判断，抽离后可以脱离 Hono 上下文直接做单元测试，
 * 覆盖「Range 透传 + 签名 + 上游不支持 Range」的交互边界。
 */

export const PROXY_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

export interface BuildUpstreamHeadersInput {
  /** 驱动提供的原始头（Cookie / Referer / Authorization 等） */
  rawUrlHeaders?: Record<string, string> | null
  /** 客户端请求携带的 Range */
  rangeHeader?: string | null
  /** 存储的 proxy_range 开关（对齐 Go model.Proxy.ProxyRange） */
  proxyRange: boolean
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
  const headers: Record<string, string> = {
    ...(input.rawUrlHeaders || {}),
  }

  // 驱动已显式设置 UA 时不覆盖
  if (!headers["User-Agent"]) {
    headers["User-Agent"] = PROXY_USER_AGENT
  }

  if (input.proxyRange && input.rangeHeader) {
    headers["Range"] = input.rangeHeader
  }

  return headers
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
