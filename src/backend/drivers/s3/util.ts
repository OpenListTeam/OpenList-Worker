import { S3Addition, S3HeadResult, S3ListResult } from "./types"

const encoder = new TextEncoder()

async function hmacSha256(
  key: CryptoKey | ArrayBuffer,
  data: string,
): Promise<ArrayBuffer> {
  const cryptoKey =
    key instanceof CryptoKey
      ? key
      : await crypto.subtle.importKey(
          "raw",
          key,
          { name: "HMAC", hash: "SHA-256" },
          false,
          ["sign"],
        )
  return crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(data))
}

async function sha256(data: ArrayBuffer | Uint8Array): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-256", data)
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, "0")).join("")
}

async function getSignatureKey(
  secretKey: string,
  dateStamp: string,
  region: string,
  service: string,
): Promise<CryptoKey> {
  const kDate = await hmacSha256(encoder.encode(`AWS4${secretKey}`), dateStamp)
  const kRegion = await hmacSha256(kDate, region)
  const kService = await hmacSha256(kRegion, service)
  const kSigning = await hmacSha256(kService, "aws4_request")
  return kSigning as CryptoKey
}

function formatDate(date: Date): { dateStamp: string; amzDate: string } {
  const d = date.toISOString().replace(/[:-]|\.\d{3}/g, "")
  return {
    dateStamp: d.slice(0, 8),
    amzDate: d.slice(0, 15) + "Z",
  }
}

function uriEncode(input: string): string {
  return encodeURIComponent(input)
    .replace(/%2F/g, "/")
    .replace(/%7E/g, "~")
    .replace(/\*/g, "%2A")
    .replace(/\+/g, "%2B")
}

function parseXmlTag(xml: string, tag: string): string | null {
  const regex = new RegExp(`<${tag}[^>]*>([^<]*)<\\/${tag}>`, "i")
  const match = xml.match(regex)
  return match ? match[1] : null
}

function parseXmlSection(xml: string, tag: string): string | null {
  const start = xml.indexOf(`<${tag}`)
  const end = xml.indexOf(`</${tag}>`, start)
  if (start === -1 || end === -1) return null
  return xml.slice(start, end + tag.length + 3)
}

function parseXmlArray(xml: string, tag: string): string[] {
  const results: string[] = []
  const regex = new RegExp(`<${tag}[^>]*>([^<]*)<\\/${tag}>`, "gi")
  let match
  while ((match = regex.exec(xml)) !== null) {
    if (match[1]) results.push(match[1])
  }
  return results
}

function parseXmlObjects(xml: string): Array<{ key: string; lastModified: string; size: number; etag: string }> {
  const objects: Array<{ key: string; lastModified: string; size: number; etag: string }> = []
  const contents = xml.split("<Contents>").slice(1)

  for (const block of contents) {
    const end = block.indexOf("</Contents>")
    const section = end !== -1 ? block.slice(0, end) : block
    const key = parseXmlTag(section, "Key") || ""
    const lastModified = parseXmlTag(section, "LastModified") || ""
    const size = parseInt(parseXmlTag(section, "Size") || "0", 10) || 0
    const etag = (parseXmlTag(section, "ETag") || "").replace(/"/g, "")
    if (key) objects.push({ key, lastModified, size, etag })
  }

  return objects
}

function parseCommonPrefixes(xml: string): string[] {
  const prefixes: string[] = []
  const blocks = xml.split("<CommonPrefixes>").slice(1)

  for (const block of blocks) {
    const end = block.indexOf("</CommonPrefixes>")
    const section = end !== -1 ? block.slice(0, end) : block
    const prefix = parseXmlTag(section, "Prefix") || ""
    if (prefix) prefixes.push(prefix)
  }

  return prefixes
}

export class S3Client {
  private addition: S3Addition
  private service = "s3"

  constructor(addition: S3Addition) {
    this.addition = addition
  }

  private get region(): string {
    return this.addition.region || "us-east-1"
  }

  private get endpoint(): string {
    return this.addition.endpoint
  }

  private get bucket(): string {
    return this.addition.bucket
  }

  private get pathStyle(): boolean {
    return !!this.addition.force_path_style
  }

  private get bucketUrl(): string {
    const ep = this.endpoint.replace(/\/+$/, "")
    if (this.pathStyle) {
      return `${ep}/${this.bucket}`
    }
    return `${ep}`
  }

  private getSigningUrl(key: string): string {
    const ep = this.endpoint.replace(/\/+$/, "")
    const encodedKey = key.split("/").map(encodeURIComponent).join("/")

    if (this.pathStyle) {
      return `${ep}/${this.bucket}/${encodedKey}`
    }
    return `https://${this.bucket}.${ep.replace(/^https?:\/\//, "")}/${encodedKey}`
  }

  private buildBaseUrl(): string {
    const ep = this.endpoint.replace(/\/+$/, "")
    if (this.pathStyle) {
      return `${ep}/${this.bucket}`
    }
    return `https://${this.bucket}.${ep.replace(/^https?:\/\//, "")}`
  }

  private async signRequest(
    method: string,
    path: string,
    query: string = "",
    headers: Record<string, string> = {},
    payload: ArrayBuffer | Uint8Array = new Uint8Array(0),
  ): Promise<Record<string, string>> {
    const now = new Date()
    const { dateStamp, amzDate } = formatDate(now)

    const payloadHash = await sha256(payload)

    const host = this.buildBaseUrl().replace(/^https?:\/\//, "")
    const signedHeaders: Record<string, string> = {
      host,
      "x-amz-content-sha256": payloadHash,
      "x-amz-date": amzDate,
      ...headers,
    }

    if (this.addition.session_token) {
      signedHeaders["x-amz-security-token"] = this.addition.session_token
    }

    const sortedHeaders = Object.keys(signedHeaders).sort()
    const canonicalHeaders = sortedHeaders
      .map((k) => `${k}:${signedHeaders[k]}\n`)
      .join("")
    const signedHeaderList = sortedHeaders.join(";")

    const canonicalQuery = query
      .split("&")
      .filter(Boolean)
      .sort()
      .join("&")

    const canonicalRequest = [
      method,
      path || "/",
      canonicalQuery,
      canonicalHeaders,
      signedHeaderList,
      payloadHash,
    ].join("\n")

    const credentialScope = `${dateStamp}/${this.region}/${this.service}/aws4_request`
    const stringToSign = [
      "AWS4-HMAC-SHA256",
      amzDate,
      credentialScope,
      await sha256(encoder.encode(canonicalRequest)),
    ].join("\n")

    const signatureKey = await getSignatureKey(
      this.addition.secret_access_key,
      dateStamp,
      this.region,
      this.service,
    )
    const signatureBytes = await hmacSha256(signatureKey, stringToSign)
    const signature = [...new Uint8Array(signatureBytes)]
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")

    const authHeader = `AWS4-HMAC-SHA256 Credential=${this.addition.access_key_id}/${credentialScope}, SignedHeaders=${signedHeaderList}, Signature=${signature}`

    return {
      Authorization: authHeader,
      "x-amz-content-sha256": payloadHash,
      "x-amz-date": amzDate,
      ...(this.addition.session_token
        ? { "x-amz-security-token": this.addition.session_token }
        : {}),
    }
  }

  private buildQueryString(params: Record<string, string>): string {
    return Object.entries(params)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${uriEncode(k)}=${uriEncode(v)}`)
      .join("&")
  }

  async listObjects(
    prefix: string,
    continuationToken?: string,
    maxKeys: number = 1000,
  ): Promise<S3ListResult> {
    const cleanPrefix = prefix.replace(/^\/+|\/+$/g, "")
    const queryPrefix = cleanPrefix ? `${cleanPrefix}/` : ""

    const params: Record<string, string> = {
      "list-type": "2",
      prefix: queryPrefix,
      delimiter: "/",
      "max-keys": String(maxKeys),
    }

    if (continuationToken) {
      params["continuation-token"] = continuationToken
    }

    const queryString = this.buildQueryString(params)
    const path = "/"
    const url = `${this.buildBaseUrl()}/?${queryString}`

    const authHeaders = await this.signRequest("GET", path, queryString)
    const resp = await fetch(url, { headers: authHeaders })

    if (!resp.ok) {
      const body = await resp.text()
      throw new Error(`S3 ListObjectsV2 failed: ${resp.status} ${body}`)
    }

    const xml = await resp.text()

    const isTruncated = parseXmlTag(xml, "IsTruncated") === "true"
    const nextToken = parseXmlTag(xml, "NextContinuationToken") || undefined
    const keys = parseXmlArray(xml, "Key")
    const objects = parseXmlObjects(xml)
    const commonPrefixes = parseCommonPrefixes(xml)

    // Build contents from parsed objects
    const contents = objects.map((o) => ({
      Key: o.key,
      LastModified: o.lastModified,
      Size: o.size,
      ETag: o.etag,
    }))

    return {
      IsTruncated: isTruncated,
      NextContinuationToken: nextToken,
      Contents: contents,
      CommonPrefixes: commonPrefixes.map((p) => ({ Prefix: p })),
      Prefix: queryPrefix,
      Delimiter: "/",
      MaxKeys: maxKeys,
    }
  }

  async listObjectsV1(
    prefix: string,
    marker?: string,
    maxKeys: number = 1000,
  ): Promise<S3ListResult> {
    const cleanPrefix = prefix.replace(/^\/+|\/+$/g, "")
    const queryPrefix = cleanPrefix ? `${cleanPrefix}/` : ""

    const params: Record<string, string> = {
      prefix: queryPrefix,
      delimiter: "/",
      "max-keys": String(maxKeys),
    }

    if (marker) {
      params.marker = marker
    }

    const queryString = this.buildQueryString(params)
    const path = "/"
    const url = `${this.buildBaseUrl()}/?${queryString}`

    const authHeaders = await this.signRequest("GET", path, queryString)
    const resp = await fetch(url, { headers: authHeaders })

    if (!resp.ok) {
      const body = await resp.text()
      throw new Error(`S3 ListObjects failed: ${resp.status} ${body}`)
    }

    const xml = await resp.text()

    const isTruncated = parseXmlTag(xml, "IsTruncated") === "true"
    const nextMarker = parseXmlTag(xml, "NextMarker") || undefined
    const objects = parseXmlObjects(xml)
    const commonPrefixes = parseCommonPrefixes(xml)

    return {
      IsTruncated: isTruncated,
      NextContinuationToken: nextMarker,
      Contents: objects.map((o) => ({
        Key: o.key,
        LastModified: o.lastModified,
        Size: o.size,
        ETag: o.etag,
      })),
      CommonPrefixes: commonPrefixes.map((p) => ({ Prefix: p })),
      Prefix: queryPrefix,
      Delimiter: "/",
      MaxKeys: maxKeys,
    }
  }

  async headObject(key: string): Promise<S3HeadResult> {
    const path = `/${key}`
    const url = `${this.buildBaseUrl()}/${key.split("/").map(encodeURIComponent).join("/")}`

    const authHeaders = await this.signRequest("GET", path)
    const resp = await fetch(url, {
      method: "HEAD",
      headers: authHeaders,
    })

    if (!resp.ok) {
      const body = await resp.text()
      throw new Error(`S3 HeadObject failed: ${resp.status} ${body}`)
    }

    return {
      contentLength: parseInt(resp.headers.get("content-length") || "0", 10),
      lastModified: resp.headers.get("last-modified") || new Date().toISOString(),
      contentType: resp.headers.get("content-type") || "application/octet-stream",
      etag: (resp.headers.get("etag") || "").replace(/"/g, ""),
    }
  }

  async getObject(key: string): Promise<{ body: ReadableStream; contentType: string; contentLength: number }> {
    const path = `/${key}`
    const url = `${this.buildBaseUrl()}/${key.split("/").map(encodeURIComponent).join("/")}`

    const authHeaders = await this.signRequest("GET", path)
    const resp = await fetch(url, { headers: authHeaders })

    if (!resp.ok) {
      const body = await resp.text()
      throw new Error(`S3 GetObject failed: ${resp.status} ${body}`)
    }

    return {
      body: resp.body!,
      contentType: resp.headers.get("content-type") || "application/octet-stream",
      contentLength: parseInt(resp.headers.get("content-length") || "0", 10),
    }
  }

  async getObjectBuffer(key: string): Promise<Buffer> {
    const path = `/${key}`
    const url = `${this.buildBaseUrl()}/${key.split("/").map(encodeURIComponent).join("/")}`

    const authHeaders = await this.signRequest("GET", path)
    const resp = await fetch(url, { headers: authHeaders })

    if (!resp.ok) {
      const body = await resp.text()
      throw new Error(`S3 GetObject failed: ${resp.status} ${body}`)
    }

    const arrayBuffer = await resp.arrayBuffer()
    return Buffer.from(arrayBuffer)
  }

  async putObject(
    key: string,
    body: Buffer | ArrayBuffer,
    contentType: string = "application/octet-stream",
  ): Promise<void> {
    const path = `/${key}`
    const url = `${this.buildBaseUrl()}/${key.split("/").map(encodeURIComponent).join("/")}`
    const payload = body instanceof Buffer ? new Uint8Array(body) : new Uint8Array(body)

    const authHeaders = await this.signRequest("PUT", path, "", {
      "content-type": contentType,
    }, payload)

    const resp = await fetch(url, {
      method: "PUT",
      headers: {
        ...authHeaders,
        "Content-Type": contentType,
      },
      body: payload,
    })

    if (!resp.ok) {
      const respBody = await resp.text()
      throw new Error(`S3 PutObject failed: ${resp.status} ${respBody}`)
    }
  }

  async deleteObject(key: string): Promise<void> {
    const path = `/${key}`
    const url = `${this.buildBaseUrl()}/${key.split("/").map(encodeURIComponent).join("/")}`

    const authHeaders = await this.signRequest("DELETE", path)
    const resp = await fetch(url, {
      method: "DELETE",
      headers: authHeaders,
    })

    if (!resp.ok && resp.status !== 404) {
      const body = await resp.text()
      throw new Error(`S3 DeleteObject failed: ${resp.status} ${body}`)
    }
  }

  async deleteObjects(keys: string[]): Promise<void> {
    if (keys.length === 0) return

    const body = `<?xml version="1.0" encoding="UTF-8"?>
<Delete>
${keys.map((k) => `  <Object><Key>${escapeXml(k)}</Key></Object>`).join("\n")}
</Delete>`

    const path = "/?delete"
    const queryString = "delete"
    const url = `${this.buildBaseUrl()}/?delete`
    const payload = encoder.encode(body)

    const authHeaders = await this.signRequest("POST", path, queryString, {}, payload)
    const resp = await fetch(url, {
      method: "POST",
      headers: {
        ...authHeaders,
        "Content-Type": "application/xml",
      },
      body: payload,
    })

    if (!resp.ok) {
      const respBody = await resp.text()
      throw new Error(`S3 DeleteObjects failed: ${resp.status} ${respBody}`)
    }
  }

  async copyObject(srcKey: string, dstKey: string): Promise<void> {
    const path = `/${dstKey}`
    const url = `${this.buildBaseUrl()}/${dstKey.split("/").map(encodeURIComponent).join("/")}`
    const copySource = `/${this.bucket}/${srcKey.split("/").map(encodeURIComponent).join("/")}`

    const authHeaders = await this.signRequest("PUT", path, "", {
      "x-amz-copy-source": copySource,
    })

    const resp = await fetch(url, {
      method: "PUT",
      headers: {
        ...authHeaders,
        "x-amz-copy-source": copySource,
      },
    })

    if (!resp.ok) {
      const body = await resp.text()
      throw new Error(`S3 CopyObject failed: ${resp.status} ${body}`)
    }
  }

  async presignUrl(method: string, key: string, expires: number = 3600): Promise<string> {
    const { dateStamp, amzDate } = formatDate(new Date())

    const path = this.pathStyle
      ? `/${this.bucket}/${key}`
      : `/${key}`
    const host = this.buildBaseUrl().replace(/^https?:\/\//, "")

    const credentialScope = `${dateStamp}/${this.region}/${this.service}/aws4_request`

    const queryParams: Record<string, string> = {
      "X-Amz-Algorithm": "AWS4-HMAC-SHA256",
      "X-Amz-Credential": `${this.addition.access_key_id}/${credentialScope}`,
      "X-Amz-Date": amzDate,
      "X-Amz-Expires": String(expires),
      "X-Amz-SignedHeaders": "host",
    }

    if (this.addition.session_token) {
      queryParams["X-Amz-Security-Token"] = this.addition.session_token
    }

    const sortedParams = Object.keys(queryParams).sort()
    const canonicalQueryString = sortedParams
      .map((k) => `${uriEncode(k)}=${uriEncode(queryParams[k])}`)
      .join("&")

    const canonicalRequest = [
      method,
      path,
      canonicalQueryString,
      `host:${host}\n`,
      "host",
      "UNSIGNED-PAYLOAD",
    ].join("\n")

    const stringToSign = [
      "AWS4-HMAC-SHA256",
      amzDate,
      credentialScope,
      await sha256(encoder.encode(canonicalRequest)),
    ].join("\n")

    const signatureKey = await getSignatureKey(
      this.addition.secret_access_key,
      dateStamp,
      this.region,
      this.service,
    )
    const signatureBytes = await hmacSha256(signatureKey, stringToSign)
    const signature = [...new Uint8Array(signatureBytes)]
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")

    const baseUrl = this.addition.custom_host
      ? this.addition.custom_host.replace(/\/+$/, "")
      : this.buildBaseUrl()

    const encodedKey = key.split("/").map(encodeURIComponent).join("/")
    return `${baseUrl}/${encodedKey}?${canonicalQueryString}&X-Amz-Signature=${signature}`
  }
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
}
