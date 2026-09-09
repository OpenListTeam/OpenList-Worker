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
export function isSafeUrl(urlStr: string): boolean {
  try {
    const parsed = new URL(urlStr)
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return false
    }

    const host = parsed.hostname.toLowerCase().trim()
    if (!host) return false

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
    const dnsRebindPatterns = [
      /\d{1,3}-\d{1,3}-\d{1,3}-\d{1,3}/, // 127-0-0-1.example.com
      /0x[0-9a-f]{8}/i, // 0x7f000001.example.com
      /\d{10}/, // 2130706433.example.com (整数IP)
      /127\.0\.0\.1\.nip\.io/, // nip.io DNS rebinding service
      /localtest\.me/, // localtest.me resolves to 127.0.0.1
      /vcap\.me/, // vcap.me resolves to 127.0.0.1
      /\.xip\.io/, // xip.io DNS rebinding service
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

export function assertSafeUrl(urlStr: string, context = "Request"): void {
  if (!isSafeUrl(urlStr)) {
    throw new Error(
      `${context} blocked: URL points to a restricted or private network destination (SSRF protection)`,
    )
  }
}
