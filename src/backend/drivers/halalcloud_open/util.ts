// HalalCloud Open API 客户端（HL6-HMAC-SHA256 签名，AWS SigV4 变体）
// 签名算法逆向自 github.com/halalcloud/golang-sdk-lite
import {
  DriverHalalCloudOpenAddition,
  HCloudFile,
  HCloudFileListRequest,
  HCloudFileListResponse,
  HCloudBatchOperationRequest,
  HCloudFileDownloadAddressResponse,
  HCloudTokenResponse,
} from "./types"

const SIGN_ALGORITHM = "HL6-HMAC-SHA256"
const SIGN_PREFIX = "HL6"
const REQUEST_SUFFIX = "hl6_request"

function toUtf8(s: string): Uint8Array {
  return new TextEncoder().encode(s)
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
}

async function sha256Hex(data: string | Uint8Array): Promise<string> {
  const bytes = typeof data === "string" ? toUtf8(data) : data
  const buf = await crypto.subtle.digest("SHA-256", bytes as any)
  return bytesToHex(new Uint8Array(buf))
}

async function hmacSha256Bytes(
  data: Uint8Array,
  key: Uint8Array,
): Promise<Uint8Array> {
  const keyMat = await crypto.subtle.importKey(
    "raw",
    key as any,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  )
  const sig = await crypto.subtle.sign("HMAC", keyMat, data as any)
  return new Uint8Array(sig)
}

function rfc3986Encode(s: string): string {
  return encodeURIComponent(s)
    .replace(/%20/g, "%20")
    .replace(
      /[!'()*]/g,
      (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase(),
    )
}

export interface HCloudSignInput {
  apiHost: string
  secretId: string
  secretKey: string
  accessToken: string
  method: string
  apiPath: string
  bodyRaw: Uint8Array
  query?: Record<string, string>
  now?: Date
}

export interface HCloudSignOutput {
  headers: Record<string, string>
  url: string
}

export async function hcloudSign(
  input: HCloudSignInput,
): Promise<HCloudSignOutput> {
  const now = input.now ?? new Date()
  const dateString = now.toISOString().slice(0, 10)
  const timestamp = now.toISOString()
  const nonce = (
    BigInt(Math.floor(now.getTime())) * 1000000n +
    BigInt(Math.floor(Math.random() * 1000000))
  ).toString(36)

  const hasBody = input.bodyRaw.length > 0

  const headers: Record<string, string> = {
    host: input.apiHost,
    "x-hl-nonce": nonce,
    "x-hl-timestamp": timestamp,
  }
  const headersToSign: string[] = []
  if (hasBody) {
    headers["content-type"] = "application/json; charset=utf-8"
    headersToSign.push("content-type")
  }

  // canonical headers
  const sortedHeaders = [...headersToSign].sort()
  const canonicalHeaders = sortedHeaders
    .map((h) => `${h}:${headers[h]}\n`)
    .join("")
  const signedHeaders = sortedHeaders.join(";")

  // sorted query string
  let sortedQuery = ""
  if (input.query && Object.keys(input.query).length > 0) {
    const keys = Object.keys(input.query).sort()
    sortedQuery = keys
      .map((k) => `${rfc3986Encode(k)}=${rfc3986Encode(input.query![k] ?? "")}`)
      .join("&")
  }

  const bodyHash = await sha256Hex(input.bodyRaw)

  const canonicalRequest = [
    input.method,
    input.apiPath,
    sortedQuery,
    canonicalHeaders,
    signedHeaders,
    bodyHash,
  ].join("\n")

  const credentialScope = `${dateString}/${input.accessToken}/${REQUEST_SUFFIX}`

  const stringToSign = [
    SIGN_ALGORITHM,
    timestamp,
    credentialScope,
    await sha256Hex(canonicalRequest),
  ].join("\n")

  // 派生签名密钥
  const secretKey = toUtf8(SIGN_PREFIX + input.secretKey)
  const dateKey = await hmacSha256Bytes(toUtf8(dateString), secretKey)
  const tokenKey = await hmacSha256Bytes(toUtf8(input.accessToken), dateKey)
  const signingKey = await hmacSha256Bytes(toUtf8(REQUEST_SUFFIX), tokenKey)
  const signature = bytesToHex(
    await hmacSha256Bytes(toUtf8(stringToSign), signingKey),
  )

  const authorization = `${SIGN_ALGORITHM} Credential=${input.secretId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`
  headers.authorization = authorization

  const url = `https://${input.apiHost}${input.apiPath}${sortedQuery ? "?" + sortedQuery : ""}`

  return { headers, url }
}

export class ClientHalalCloudOpen {
  private addition: DriverHalalCloudOpenAddition
  private accessToken = ""
  private host: string
  private persistRefreshToken?: (refreshToken: string) => void | Promise<void>

  constructor(
    addition: DriverHalalCloudOpenAddition,
    persistRefreshToken?: (refreshToken: string) => void | Promise<void>,
  ) {
    this.addition = addition
    this.host = addition.host || "openapi.2dland.cn"
    this.persistRefreshToken = persistRefreshToken
  }

  async init(): Promise<void> {
    if (!this.addition.client_id || !this.addition.client_secret) {
      throw new Error("[HalalCloud] client_id and client_secret are required")
    }
    if (!this.addition.refresh_token) {
      throw new Error(
        "[HalalCloud] refresh_token 为空：请从 HalalCloud 官方获取 refresh_token",
      )
    }
    await this.refreshToken()
  }

  async refreshToken(): Promise<void> {
    const body = {
      refresh_token: this.addition.refresh_token,
      grant_type: "refresh_token",
      client_id: this.addition.client_id,
    }
    const bodyRaw = toUtf8(JSON.stringify(body))
    const sign = await hcloudSign({
      apiHost: this.host,
      secretId: this.addition.client_id,
      secretKey: this.addition.client_secret,
      accessToken: this.accessToken,
      method: "POST",
      apiPath: "/v6/oauth/refresh_token",
      bodyRaw,
    })
    const resp = await fetch(sign.url, {
      method: "POST",
      headers: sign.headers,
      body: bodyRaw,
    })
    const data = (await resp.json().catch(() => ({}))) as HCloudTokenResponse
    if (!data.access_token) {
      throw new Error("[HalalCloud] refresh token failed")
    }
    this.accessToken = data.access_token
    if (data.refresh_token) {
      this.addition.refresh_token = data.refresh_token
      if (this.persistRefreshToken)
        await this.persistRefreshToken(data.refresh_token)
    }
  }

  private async request<T = any>(
    apiPath: string,
    body?: unknown,
    retry = false,
  ): Promise<T> {
    const bodyRaw =
      body !== undefined ? toUtf8(JSON.stringify(body)) : new Uint8Array(0)
    const sign = await hcloudSign({
      apiHost: this.host,
      secretId: this.addition.client_id,
      secretKey: this.addition.client_secret,
      accessToken: this.accessToken,
      method: "POST",
      apiPath,
      bodyRaw,
    })
    const resp = await fetch(sign.url, {
      method: "POST",
      headers: sign.headers,
      body: bodyRaw.length > 0 ? bodyRaw : undefined,
    })

    if (resp.status === 401 && !retry) {
      await this.refreshToken()
      return this.request<T>(apiPath, body, true)
    }

    const text = await resp.text()
    let data: any
    try {
      data = JSON.parse(text)
    } catch {
      data = {}
    }
    if (resp.status >= 300) {
      throw new Error(
        `[HalalCloud] API error: ${data.message || data.msg || `HTTP ${resp.status}`}`,
      )
    }
    return data as T
  }

  async listFiles(path: string): Promise<HCloudFile[]> {
    const files: HCloudFile[] = []
    let token = ""
    for (;;) {
      const req: HCloudFileListRequest = {
        parent: { path },
        list_info: { limit: 100, token },
      }
      const resp = await this.request<HCloudFileListResponse>(
        "/v6/userfile/list",
        req,
      )
      const list = resp.files || []
      files.push(...list)
      token = resp.list_info?.token || ""
      if (!token || list.length === 0) break
    }
    return files
  }

  async getFile(path: string): Promise<HCloudFile | null> {
    const resp = await this.request<HCloudFile>("/v6/userfile/get", { path })
    return resp.identity ? resp : null
  }

  async createDir(parentPath: string, name: string): Promise<void> {
    const filePath = joinPath(parentPath, name)
    await this.request("/v6/userfile/create", {
      parent: parentPath,
      path: filePath,
      name,
      dir: true,
    })
  }

  async rename(path: string, newName: string): Promise<void> {
    await this.request("/v6/userfile/rename", {
      path,
      name: newName,
    })
  }

  async move(
    srcPath: string,
    dstPath: string,
    identity: string,
  ): Promise<void> {
    const req: HCloudBatchOperationRequest = {
      source: [{ path: srcPath, identity }],
      dest: { path: dstPath },
    }
    await this.request("/v6/userfile/move", req)
  }

  async copy(
    srcPath: string,
    dstPath: string,
    identity: string,
  ): Promise<void> {
    const req: HCloudBatchOperationRequest = {
      source: [{ path: srcPath, identity }],
      dest: { path: dstPath },
    }
    await this.request("/v6/userfile/copy", req)
  }

  async remove(srcPath: string, identity: string, dir: boolean): Promise<void> {
    const req: HCloudBatchOperationRequest = {
      source: [{ path: srcPath, identity, dir }],
    }
    await this.request("/v6/userfile/delete", req)
  }

  async getDownloadUrl(path: string, identity: string): Promise<string> {
    const resp = await this.request<HCloudFileDownloadAddressResponse>(
      "/v6/userfile/get_direct_download_address",
      { path, identity },
    )
    if (!resp.download_address) {
      throw new Error("[HalalCloud] 获取下载地址失败")
    }
    return resp.download_address
  }
}

function joinPath(a: string, b: string): string {
  const left = String(a || "").replace(/\/+$/, "")
  const right = String(b || "").replace(/^\/+/, "")
  if (!left) return "/" + right
  if (!right) return left
  return left + "/" + right
}
