/**
 * HTTP client utilities for OpenList backend.
 * Uses native fetch — compatible with Cloudflare Workers and Node.js 18+.
 */

export interface FetchConfig {
  headers?: Record<string, string>
  params?: Record<string, string>
  timeout?: number
  signal?: AbortSignal
  /** Alias kept for API compatibility */
  responseType?: "json" | "arraybuffer" | "text"
}

/** Axios-compatible response shape */
export interface HttpResponse<T = any> {
  data: T
  status: number
  headers: Record<string, string>
}

const DEFAULT_TIMEOUT = 30_000

function buildUrl(url: string, params?: Record<string, string>): string {
  if (!params || Object.keys(params).length === 0) return url
  const qs = new URLSearchParams(params).toString()
  return `${url}${url.includes("?") ? "&" : "?"}${qs}`
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeout: number,
): Promise<Response> {
  const controller = new AbortController()
  const id = setTimeout(() => controller.abort(), timeout)
  try {
    return await fetch(url, { ...init, signal: controller.signal })
  } finally {
    clearTimeout(id)
  }
}

async function parseResponse<T>(
  res: Response,
  responseType?: string,
): Promise<HttpResponse<T>> {
  const headers: Record<string, string> = {}
  res.headers.forEach((v, k) => {
    headers[k] = v
  })

  if (!res.ok) {
    let errBody: any
    try {
      errBody = await res.json()
    } catch {
      errBody = await res.text().catch(() => "")
    }
    const err: any = new Error(`Request failed with status ${res.status}`)
    err.response = { status: res.status, data: errBody, headers }
    throw err
  }

  let data: T
  if (responseType === "arraybuffer") {
    data = (await res.arrayBuffer()) as unknown as T
  } else if (responseType === "text") {
    data = (await res.text()) as unknown as T
  } else {
    const text = await res.text()
    try {
      data = JSON.parse(text)
    } catch {
      data = text as unknown as T
    }
  }
  return { data, status: res.status, headers }
}

export async function get<T = any>(
  url: string,
  config?: FetchConfig,
): Promise<HttpResponse<T>> {
  const finalUrl = buildUrl(url, config?.params)
  const res = await fetchWithTimeout(
    finalUrl,
    { method: "GET", headers: config?.headers },
    config?.timeout ?? DEFAULT_TIMEOUT,
  )
  return parseResponse<T>(res, config?.responseType)
}

export async function post<T = any>(
  url: string,
  data?: any,
  config?: FetchConfig,
): Promise<HttpResponse<T>> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(config?.headers ?? {}),
  }
  const body = typeof data === "string" ? data : JSON.stringify(data)
  const res = await fetchWithTimeout(
    url,
    { method: "POST", headers, body },
    config?.timeout ?? DEFAULT_TIMEOUT,
  )
  return parseResponse<T>(res, config?.responseType)
}

export async function request<T = any>(config: {
  url: string
  method: string
  data?: any
  headers?: Record<string, string>
  params?: Record<string, string>
  timeout?: number
  responseType?: string
}): Promise<HttpResponse<T>> {
  const finalUrl = buildUrl(config.url, config.params)
  const headers: Record<string, string> = { ...(config.headers ?? {}) }
  let body: BodyInit | undefined
  if (config.data !== undefined) {
    if (typeof config.data === "string") {
      body = config.data
    } else {
      body = JSON.stringify(config.data)
      if (!headers["Content-Type"]) headers["Content-Type"] = "application/json"
    }
  }
  const res = await fetchWithTimeout(
    finalUrl,
    { method: config.method.toUpperCase(), headers, body },
    config.timeout ?? DEFAULT_TIMEOUT,
  )
  return parseResponse<T>(res, config.responseType)
}

/** Thin axios-compat shim for `axios({ url, method, ... })` call style */
export const HttpClient = {
  get,
  post,
  request: (config: any) => request(config),
}

/** Download a URL and return its raw bytes */
export async function download(
  url: string,
  config?: FetchConfig,
): Promise<ArrayBuffer> {
  const res = await get<ArrayBuffer>(url, {
    ...config,
    responseType: "arraybuffer",
  })
  return res.data
}

/**
 * Validate that a target URL is safe against SSRF attacks:
 * 1. Protocol must be http: or https:
 * 2. Hostname/IP must not point to loopback, private RFC 1918 networks, link-local, or cloud metadata endpoints.
 * 
 * 2026-09-08 安全增强：
 * - 扩展 IPv6 检测（包括 IPv4-mapped IPv6）
 * - 检测 DNS 重绑定特征
 * - 阻止整数/十六进制 IP 表示
 * - 检测混淆 IP 格式
 */
export function isSafeUrl(
  urlStr: string,
  allowHosts?: ReadonlySet<string> | string[],
): boolean {
  try {
    const parsed = new URL(urlStr)
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return false
    }

    const host = parsed.hostname.toLowerCase().trim()
    if (!host) return false

    // 白名单：管理员在存储配置里主动填写的 endpoint host（可能是内网/私有地址）
    // 视为受信。SSRF 防护只针对用户/第三方可控的 URL，不应拦截管理员自己的
    // 内网存储（自建 MinIO / 内网 S3 / 内网 WebDAV 等）。仅做精确 host 匹配，
    // 不放过子域名，避免被「受信域名下的任意子域」绕过。
    if (allowHosts) {
      const allow = new Set(allowHosts)
      if (allow.has(host)) return true
    }

    // 1. 检查危险主机名
    const dangerousHosts = [
      "localhost",
      ".localhost",
      ".local",
      ".internal",
      "metadata.google.internal",
      "169.254.169.254", // AWS/GCP/Azure metadata
      "metadata.azure.com",
      "metadata",
    ]
    for (const dangerous of dangerousHosts) {
      if (host === dangerous || host.endsWith(dangerous)) {
        return false
      }
    }

    // 2. 扩展 IPv6 检测（包括 IPv4-mapped IPv6）
    const ipv6Patterns = [
      "::1", // loopback
      "[::1]",
      "::ffff:127.", // IPv4-mapped IPv6 loopback
      "::ffff:10.", // IPv4-mapped IPv6 private
      "::ffff:172.", // IPv4-mapped IPv6 private
      "::ffff:192.168.", // IPv4-mapped IPv6 private
      "::ffff:169.254.", // IPv4-mapped IPv6 link-local
      "fe80:", // link-local
      "fc00:", // unique local
      "fd00:", // unique local
      "[fe80:",
      "[fc",
      "[fd",
    ]
    for (const pattern of ipv6Patterns) {
      if (host.includes(pattern)) {
        return false
      }
    }

    // 3. 检测前导零八进制绕过（0177.0.0.1 = 127.0.0.1）
    if (
      /^\d{1,3}(\.\d{1,3}){1,3}$/.test(host) &&
      /(^|\.)0\d+/.test(host)
    ) {
      return false
    }

    // 4. 检测 IPv4 地址
    const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/
    const match = host.match(ipv4Regex)
    if (match) {
      const [, aStr, bStr, cStr, dStr] = match
      const a = parseInt(aStr, 10)
      const b = parseInt(bStr, 10)
      const c = parseInt(cStr, 10)
      const d = parseInt(dStr, 10)
      if (a > 255 || b > 255 || c > 255 || d > 255) return false

      // RFC 1918 私有网络和特殊用途地址
      if (a === 0) return false // 0.0.0.0/8 (This network)
      if (a === 127) return false // 127.0.0.0/8 (Loopback)
      if (a === 10) return false // 10.0.0.0/8 (Private)
      if (a === 172 && b >= 16 && b <= 31) return false // 172.16.0.0/12 (Private)
      if (a === 192 && b === 168) return false // 192.168.0.0/16 (Private)
      if (a === 169 && b === 254) return false // 169.254.0.0/16 (Link-local + metadata)
      if (a === 100 && b >= 64 && b <= 127) return false // 100.64.0.0/10 (CGNAT)
      if (a === 100 && b === 100) return false // Aliyun metadata 100.100.100.200
      if (a === 224 && b === 0 && c === 0) return false // 224.0.0.0/24 (Multicast)
      if (a >= 240) return false // 240.0.0.0/4 (Reserved)
    }

    // 5. 阻止整数/十六进制 IP 表示（2130706433 = 127.0.0.1, 0x7f000001 = 127.0.0.1）
    if (/^\d{8,}$/.test(host) || /^0x[0-9a-fA-F]{6,}$/i.test(host)) {
      return false
    }

    // 6. 检测 DNS 重绑定特征域名（攻击者常用模式）
    // 注意：整数/十六进制 IP 检测必须锚定到「完整的 label」，不能做子串匹配。
    // 例如腾讯云 COS 的 hostname 形如 {bucket}-{10位AppID}.cos.{region}.myqcloud.com，
    // 其中 AppID 就是连续的 10 位数字；若用 /\d{10}/ 子串匹配会误判为整数 IP，
    // 导致正常公网下载被 SSRF 拦截。这里只拦截「某个 label 整体是整数/十六进制 IP」。
    const dnsRebindPatterns = [
      /(^|\.)\d{1,3}-\d{1,3}-\d{1,3}-\d{1,3}(\.|$)/, // 127-0-0-1.example.com
      /(^|\.)0x[0-9a-f]{6,8}(\.|$)/i, // 0x7f000001.example.com (十六进制IP label)
      /(^|\.)\d{8,}(\.|$)/, // 2130706433.example.com (整数IP label)
      /(^|\.)127\.0\.0\.1\.nip\.io$/, // nip.io DNS rebinding service
      /(^|\.)localtest\.me$/, // localtest.me resolves to 127.0.0.1
      /(^|\.)vcap\.me$/, // vcap.me resolves to 127.0.0.1
      /(^|\.)xip\.io$/, // xip.io DNS rebinding service
    ]
    for (const pattern of dnsRebindPatterns) {
      if (pattern.test(host)) {
        return false
      }
    }

    return true
  } catch {
    return false
  }
}

export function assertSafeUrl(
  urlStr: string,
  context = "Request",
  allowHosts?: ReadonlySet<string> | string[],
): void {
  if (!isSafeUrl(urlStr, allowHosts)) {
    throw new Error(
      `${context} blocked: URL points to a restricted or private network destination (SSRF protection)`,
    )
  }
}

/**
 * 从存储配置 addition 中提取管理员配置的受信 host。
 *
 * 背景：SSRF 防护针对的是「用户/第三方可控」的 URL。而 addition 的所有字段都是
 * 管理员在后台主动填写的（S3 的 endpoint、WebDAV 的 address、阿里云中转的
 * api_url_address 等），属于受信输入。管理员完全可能配置内网自建存储（MinIO、
 * 内网 S3、内网 WebDAV），此时驱动生成的 raw_url host 就是内网地址，会命中 SSRF
 * 拦截。因此把这些 host 加入白名单，使管理员自己的内网存储能正常下载。
 *
 * 实现：只扫描「字段名含 url/host/address/endpoint/server/domain/site/base 等
 * 关键词」的字段（避免把 username 之类的普通字符串误当 host），且值必须能解析成
 * http(s) URL 或裸 host[:port]，提取其 hostname。
 */
export function extractTrustedHosts(addition: any): Set<string> {
  const hosts = new Set<string>()
  if (addition == null) return hosts

  let obj = addition
  if (typeof addition === "string") {
    try {
      obj = JSON.parse(addition)
    } catch {
      return hosts
    }
  }
  if (typeof obj !== "object" || Array.isArray(obj)) return hosts

  const HOST_KEY_RE =
    /(url|host|address|endpoint|server|domain|site|base|gateway|api)/i

  const visit = (node: any) => {
    if (node == null || typeof node !== "object") return
    for (const [key, val] of Object.entries(node)) {
      if (typeof val === "string") {
        if (HOST_KEY_RE.test(key)) {
          const h = hostFromValue(val)
          if (h) hosts.add(h)
        }
      } else if (val != null && typeof val === "object") {
        visit(val)
      }
    }
  }
  visit(obj)
  return hosts
}

/**
 * 从一段字符串（完整 URL 或裸 host[:port]）提取 hostname。
 * 失败返回 undefined。
 */
function hostFromValue(raw: string): string | undefined {
  const val = raw.trim()
  if (!val) return undefined
  // 有 scheme 直接用，没有则补 http://（覆盖 "192.168.1.10:9000" 这类 endpoint）
  const candidates = /^[a-z][a-z0-9+.-]*:\/\//i.test(val)
    ? [val]
    : [`http://${val}`]
  for (const c of candidates) {
    try {
      const u = new URL(c)
      if (u.protocol !== "http:" && u.protocol !== "https:") continue
      const h = u.hostname.toLowerCase().trim()
      if (h) return h
    } catch {
      // 不是合法 URL，继续尝试下一个候选
    }
  }
  return undefined
}

/**
 * 解析 SSRF_ALLOWED_HOSTS 环境变量的值：逗号 / 空格 / 分号分隔的
 * URL 或裸 host[:port] 列表，提取出 hostname 集合。
 * 例如："192.168.1.10:9000, https://minio.internal, 10.0.0.5"
 */
export function parseAllowHostsEnv(raw: string): Set<string> {
  const hosts = new Set<string>()
  if (!raw) return hosts
  for (const part of raw.split(/[,;\s]+/)) {
    const h = hostFromValue(part)
    if (h) hosts.add(h)
  }
  return hosts
}

/**
 * 合并所有受信 host 白名单来源：
 * 1. 存储配置 addition 中管理员填写的 endpoint host（内网自建 S3/WebDAV/MinIO）
 * 2. 全局环境变量 SSRF_ALLOWED_HOSTS（手动追加，逗号/空格分隔的 URL 或裸 host[:port]）
 *
 * env 参数优先取 Cloudflare Workers 的 c.env，Node 环境回退 process.env。
 */
export function getTrustedHosts(addition: any, env?: any): Set<string> {
  const hosts = extractTrustedHosts(addition)
  const raw =
    env?.["SSRF_ALLOWED_HOSTS"] ??
    (typeof process !== "undefined"
      ? process.env?.["SSRF_ALLOWED_HOSTS"]
      : undefined)
  if (typeof raw === "string" && raw.trim()) {
    for (const h of parseAllowHostsEnv(raw)) hosts.add(h)
  }
  return hosts
}
