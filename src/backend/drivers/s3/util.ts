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
          key as BufferSource,
          { name: "HMAC", hash: "SHA-256" },
          false,
          ["sign"],
        )
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(data))
  // Ensure we return a plain ArrayBuffer (TS 5.9 strict types)
  const buf = new ArrayBuffer(sig.byteLength)
  new Uint8Array(buf).set(new Uint8Array(sig))
  return buf
}

async function sha256(data: ArrayBuffer | Uint8Array): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-256", data as BufferSource)
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
  const kFinal = await hmacSha256(kService, "aws4_request")
  return await crypto.subtle.importKey(
    "raw",
    kFinal as BufferSource,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  )
}

function formatDate(date: Date): { dateStamp: string; amzDate: string } {
  const d = date.toISOString().replace(/[:-]|\.\d{3}/g, "")
  return { dateStamp: d.slice(0, 8), amzDate: d.slice(0, 15) + "Z" }
}

function uriEncode(input: string): string {
  return input.replace(/[^A-Za-z0-9\-._~]/g, (c) => {
    return "%" + c.charCodeAt(0).toString(16).toUpperCase().padStart(2, "0")
  })
}

function parseXmlTag(xml: string, tag: string): string | null {
  const regex = new RegExp(`<${tag}[^>]*>([^<]*)<\\/${tag}>`, "i")
  const match = xml.match(regex)
  return match ? match[1] : null
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

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
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

  private get bucket(): string {
    return this.addition.bucket
  }

  private get pathStyle(): boolean {
    return !!this.addition.force_path_style
  }

  private get normalizedEndpoint(): string {
    let ep = this.addition.endpoint.replace(/\/+$/, "")
    if (!/^https?:\/\//i.test(ep)) ep = `https://${ep}`
    return ep
  }

  private get host(): string {
    const ep = this.normalizedEndpoint.replace(/^https?:\/\//, "")
    if (this.pathStyle) return ep
    return `${this.bucket}.${ep}`
  }

  private keyUrl(key: string): string {
    const ep = this.normalizedEndpoint
    const k = key ? key.split("/").map(uriEncode).join("/") : ""
    if (this.pathStyle) return `${ep}/${this.bucket}/${k}`
    return `https://${this.host}/${k}`
  }

  private canonicalPath(key: string): string {
    const k = key ? key.split("/").map(uriEncode).join("/") : ""
    if (this.pathStyle) return `/${this.bucket}/${k}`
    return `/${k}`
  }

  private buildCanonicalQuery(params: Record<string, string>): string {
    return Object.entries(params)
      .sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)
      .map(([k, v]) => `${uriEncode(k)}=${uriEncode(v)}`)
      .join("&")
  }

  private async signRequest(
    method: string,
    canonicalPath: string,
    query: string = "",
    headers: Record<string, string> = {},
    payload: ArrayBuffer | Uint8Array = new Uint8Array(0),
  ): Promise<Record<string, string>> {
    const now = new Date()
    const { dateStamp, amzDate } = formatDate(now)
    const payloadHash = await sha256(payload)

    const signedHeaders: Record<string, string> = {
      host: this.host,
      "x-amz-content-sha256": payloadHash,
      "x-amz-date": amzDate,
      ...headers,
    }

    if (this.addition.session_token) {
      signedHeaders["x-amz-security-token"] = this.addition.session_token
    }

    const sortedKeys = Object.keys(signedHeaders).sort()
    const canonicalHeaders = sortedKeys.map((k) => `${k}:${signedHeaders[k]}\n`).join("")
    const signedHeaderList = sortedKeys.join(";")

    const canonicalQuery = query
      .split("&")
      .filter(Boolean)
      .sort()
      .join("&")

    const canonicalRequest = [
      method,
      canonicalPath,
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

  async listObjects(
    prefix: string,
    continuationToken?: string,
    maxKeys: number = 1000,
  ): Promise<S3ListResult> {
    const cleanPrefix = prefix.replace(/^\/+|\/+$/g, "")
    const queryPrefix = cleanPrefix ? `${cleanPrefix}/` : ""

    console.log("[S3] listObjects queryPrefix:", JSON.stringify(queryPrefix))

    const params: Record<string, string> = {
      "list-type": "2",
      prefix: queryPrefix,
      delimiter: "/",
      "max-keys": String(maxKeys),
    }
    if (continuationToken) params["continuation-token"] = continuationToken

    const queryString = this.buildCanonicalQuery(params)
    const cPath = this.canonicalPath("")
    const url = `${this.keyUrl("")}?${queryString}`

    const authHeaders = await this.signRequest("GET", cPath, queryString)
    const resp = await fetch(url, { headers: authHeaders })

    if (!resp.ok) {
      const body = await resp.text()
      throw new Error(`S3 ListObjectsV2 failed: ${resp.status} ${body}`)
    }

    const xml = await resp.text()
    const isTruncated = parseXmlTag(xml, "IsTruncated") === "true"
    const nextToken = parseXmlTag(xml, "NextContinuationToken") || undefined
    const objects = parseXmlObjects(xml)
    const commonPrefixes = parseCommonPrefixes(xml)

    return {
      IsTruncated: isTruncated,
      NextContinuationToken: nextToken,
      Contents: objects.map((o) => ({ Key: o.key, LastModified: o.lastModified, Size: o.size, ETag: o.etag })),
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

    console.log("[S3] listObjectsV1 queryPrefix:", JSON.stringify(queryPrefix))

    const params: Record<string, string> = {
      prefix: queryPrefix,
      delimiter: "/",
      "max-keys": String(maxKeys),
    }
    if (marker) params.marker = marker

    const queryString = this.buildCanonicalQuery(params)
    const cPath = this.canonicalPath("")
    const url = `${this.keyUrl("")}?${queryString}`

    const authHeaders = await this.signRequest("GET", cPath, queryString)
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
      Contents: objects.map((o) => ({ Key: o.key, LastModified: o.lastModified, Size: o.size, ETag: o.etag })),
      CommonPrefixes: commonPrefixes.map((p) => ({ Prefix: p })),
      Prefix: queryPrefix,
      Delimiter: "/",
      MaxKeys: maxKeys,
    }
  }

  async headObject(key: string): Promise<S3HeadResult> {
    const url = this.keyUrl(key)
    const authHeaders = await this.signRequest("GET", this.canonicalPath(key))
    const resp = await fetch(url, { method: "HEAD", headers: authHeaders })

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

  async getObjectStream(
    key: string,
    range?: string,
  ): Promise<{ body: ReadableStream; headers: Record<string, string> } | null> {
    const url = this.keyUrl(key)
    const extraHeaders: Record<string, string> = {}
    if (range) extraHeaders["range"] = range
    const authHeaders = await this.signRequest("GET", this.canonicalPath(key), "", extraHeaders)
    const resp = await fetch(url, {
      method: "GET",
      headers: { ...authHeaders, ...extraHeaders },
    })

    if (!resp.ok || !resp.body) return null

    const respHeaders: Record<string, string> = {}
    resp.headers.forEach((v, k) => {
      respHeaders[k.toLowerCase()] = v
    })

    return { body: resp.body as ReadableStream, headers: respHeaders }
  }

  async getObjectBuffer(key: string): Promise<Buffer> {
    const url = this.keyUrl(key)
    const authHeaders = await this.signRequest("GET", this.canonicalPath(key))
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
    body: Buffer | ArrayBuffer | Uint8Array,
    contentType: string = "application/octet-stream",
  ): Promise<void> {
    const url = this.keyUrl(key)
    const payload = body instanceof Buffer ? new Uint8Array(body) : new Uint8Array(body)
    const authHeaders = await this.signRequest("PUT", this.canonicalPath(key), "", {
      "content-type": contentType,
    }, payload)

    const resp = await fetch(url, {
      method: "PUT",
      headers: { ...authHeaders, "Content-Type": contentType },
      body: payload,
    })

    if (!resp.ok) {
      const respBody = await resp.text()
      throw new Error(`S3 PutObject failed: ${resp.status} ${respBody}`)
    }
  }

  async deleteObject(key: string): Promise<void> {
    const url = this.keyUrl(key)
    const authHeaders = await this.signRequest("DELETE", this.canonicalPath(key))
    const resp = await fetch(url, { method: "DELETE", headers: authHeaders })

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

    const payload = encoder.encode(body)
    const cPath = this.canonicalPath("")
    const queryString = "delete="
    const url = `${this.keyUrl("")}?delete`

    const authHeaders = await this.signRequest("POST", cPath, queryString, {}, payload)
    const resp = await fetch(url, {
      method: "POST",
      headers: { ...authHeaders, "Content-Type": "application/xml" },
      body: payload,
    })

    if (!resp.ok) {
      const respBody = await resp.text()
      throw new Error(`S3 DeleteObjects failed: ${resp.status} ${respBody}`)
    }
  }

  async copyObject(srcKey: string, dstKey: string): Promise<void> {
    const url = this.keyUrl(dstKey)
    const copySource = `/${this.bucket}/${srcKey.split("/").map(uriEncode).join("/")}`

    const authHeaders = await this.signRequest("PUT", this.canonicalPath(dstKey), "", {
      "x-amz-copy-source": copySource,
    })

    const resp = await fetch(url, {
      method: "PUT",
      headers: { ...authHeaders, "x-amz-copy-source": copySource },
    })

    if (!resp.ok) {
      const body = await resp.text()
      throw new Error(`S3 CopyObject failed: ${resp.status} ${body}`)
    }
  }
}
