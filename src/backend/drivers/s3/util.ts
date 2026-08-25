import { S3Addition, S3HeadResult, S3ListResult } from "./types"
import { rfc3986UriEncode, presignS3Url, signS3Headers } from "./sigv4"

function parseXmlTag(xml: string, tag: string): string | null {
  const regex = new RegExp(`<${tag}[^>]*>([^<]*)<\\/${tag}>`, "i")
  const match = xml.match(regex)
  return match ? match[1] : null
}

function parseXmlObjects(
  xml: string,
): Array<{ key: string; lastModified: string; size: number; etag: string }> {
  const objects: Array<{
    key: string
    lastModified: string
    size: number
    etag: string
  }> = []
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
  private isPathStyle: boolean
  private bucket: string
  private region: string
  private endpoint: string

  constructor(addition: S3Addition) {
    this.addition = addition
    this.bucket = (addition.bucket || "").trim()
    let ep = (addition.endpoint || "").trim()
    if (!/^https?:\/\//i.test(ep)) ep = `https://${ep}`
    this.endpoint = ep.replace(/\/+$/, "")
    this.region = (addition.region || "").trim() || "us-east-1"
    try {
      const epUrl = new URL(this.endpoint)
      const isIp =
        /^(\d{1,3}\.){3}\d{1,3}$/.test(epUrl.hostname) ||
        epUrl.hostname === "localhost"
      this.isPathStyle = !!addition.force_path_style || isIp
    } catch {
      this.isPathStyle = !!addition.force_path_style
    }
  }

  private get pathStyle(): boolean {
    return this.isPathStyle
  }

  private keyUrl(key: string): string {
    const cleanKey = key ? key.replace(/^\/+/, "") : ""
    if (this.pathStyle) {
      const epUrl = new URL(this.endpoint)
      const basePath = epUrl.pathname.replace(/\/+$/, "")
      const fullPath = [basePath, this.bucket, cleanKey]
        .filter(Boolean)
        .join("/")
      epUrl.pathname = "/" + fullPath.replace(/^\/+/, "")
      return epUrl.toString()
    }
    // Virtual host style
    const epUrl = new URL(this.endpoint)
    const hostParts = epUrl.host.split(":")
    const port = hostParts[1] ? `:${hostParts[1]}` : ""
    epUrl.host = `${this.bucket}.${hostParts[0]}${port}`
    const basePath = epUrl.pathname.replace(/\/+$/, "")
    const fullPath = [basePath, cleanKey].filter(Boolean).join("/")
    epUrl.pathname = "/" + fullPath.replace(/^\/+/, "")
    return epUrl.toString()
  }

  private async signRequest(
    method: string,
    url: string,
    headers: Record<string, string> = {},
    payload: ArrayBuffer | Uint8Array = new Uint8Array(0),
  ): Promise<{ authHeaders: Record<string, string>; signedUrl: string }> {
    const bodyBytes =
      payload && payload.byteLength > 0
        ? payload instanceof Uint8Array
          ? payload
          : new Uint8Array(payload)
        : null
    const { headers: signedHeaders } = await signS3Headers({
      method,
      url,
      region: this.region,
      accessKeyId: this.addition.access_key_id,
      secretAccessKey: this.addition.secret_access_key,
      sessionToken: this.addition.session_token,
      headers,
      body: bodyBytes,
    })
    return {
      authHeaders: signedHeaders,
      signedUrl: url,
    }
  }

  async listObjects(
    prefix: string,
    continuationToken?: string,
    maxKeys: number = 1000,
  ): Promise<S3ListResult> {
    const cleanPrefix = prefix.replace(/^\/+|\/+$/g, "")
    const queryPrefix = cleanPrefix ? `${cleanPrefix}/` : ""

    const urlObj = new URL(this.keyUrl(""))
    urlObj.searchParams.set("list-type", "2")
    urlObj.searchParams.set("prefix", queryPrefix)
    urlObj.searchParams.set("delimiter", "/")
    urlObj.searchParams.set("max-keys", String(maxKeys))
    if (continuationToken)
      urlObj.searchParams.set("continuation-token", continuationToken)

    const { authHeaders, signedUrl } = await this.signRequest(
      "GET",
      urlObj.toString(),
    )
    const resp = await fetch(signedUrl, { headers: authHeaders })

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

  async listObjectsV1(
    prefix: string,
    marker?: string,
    maxKeys: number = 1000,
  ): Promise<S3ListResult> {
    const cleanPrefix = prefix.replace(/^\/+|\/+$/g, "")
    const queryPrefix = cleanPrefix ? `${cleanPrefix}/` : ""

    const urlObj = new URL(this.keyUrl(""))
    urlObj.searchParams.set("prefix", queryPrefix)
    urlObj.searchParams.set("delimiter", "/")
    urlObj.searchParams.set("max-keys", String(maxKeys))
    if (marker) urlObj.searchParams.set("marker", marker)

    const { authHeaders, signedUrl } = await this.signRequest(
      "GET",
      urlObj.toString(),
    )
    const resp = await fetch(signedUrl, { headers: authHeaders })

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
    const { authHeaders, signedUrl } = await this.signRequest(
      "HEAD",
      this.keyUrl(key),
    )
    const resp = await fetch(signedUrl, {
      method: "HEAD",
      headers: authHeaders,
    })

    if (!resp.ok) {
      const body = await resp.text()
      throw new Error(`S3 HeadObject failed: ${resp.status} ${body}`)
    }

    return {
      contentLength: parseInt(resp.headers.get("content-length") || "0", 10),
      lastModified:
        resp.headers.get("last-modified") || new Date().toISOString(),
      contentType:
        resp.headers.get("content-type") || "application/octet-stream",
      etag: (resp.headers.get("etag") || "").replace(/"/g, ""),
    }
  }

  async getObjectStream(
    key: string,
    range?: string,
  ): Promise<{ body: ReadableStream; headers: Record<string, string> } | null> {
    const extraHeaders: Record<string, string> = {}
    if (range) extraHeaders["range"] = range
    const { authHeaders, signedUrl } = await this.signRequest(
      "GET",
      this.keyUrl(key),
      extraHeaders,
    )
    const resp = await fetch(signedUrl, {
      method: "GET",
      headers: { ...authHeaders, ...extraHeaders },
    })

    if (!resp.ok) {
      const body = await resp.text()
      console.error(
        `[S3] getObjectStream failed: ${resp.status} ${body} (key=${key}, url=${signedUrl})`,
      )
      return null
    }
    if (!resp.body) {
      console.error(`[S3] getObjectStream no body for key=${key}`)
      return null
    }

    const respHeaders: Record<string, string> = {}
    resp.headers.forEach((v, k) => {
      respHeaders[k.toLowerCase()] = v
    })

    return { body: resp.body as ReadableStream, headers: respHeaders }
  }

  async getDownloadUrl(
    key: string,
    fileName?: string,
  ): Promise<{ url: string; headers?: Record<string, string> }> {
    const cleanKey = key.replace(/^\/+/, "")
    const expire = Math.max(
      60,
      Math.floor((this.addition.sign_url_expire || 4) * 3600),
    )
    const customQueryParams: Record<string, string> = {}
    if (fileName) {
      customQueryParams["response-content-disposition"] =
        `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`
    }
    const url = await presignS3Url({
      method: "GET",
      url: this.keyUrl(cleanKey),
      region: this.region,
      accessKeyId: this.addition.access_key_id,
      secretAccessKey: this.addition.secret_access_key,
      sessionToken: this.addition.session_token,
      expiresInSeconds: expire,
      customQueryParams,
    })
    return { url }
  }

  async getObjectBuffer(key: string): Promise<Buffer> {
    const { authHeaders, signedUrl } = await this.signRequest(
      "GET",
      this.keyUrl(key),
    )
    const resp = await fetch(signedUrl, { headers: authHeaders })

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
    let payload: Uint8Array
    if (body instanceof ArrayBuffer) {
      payload = new Uint8Array(body)
    } else {
      payload = new Uint8Array(
        body.buffer as ArrayBuffer,
        body.byteOffset,
        body.byteLength,
      )
    }
    const { authHeaders, signedUrl } = await this.signRequest(
      "PUT",
      this.keyUrl(key),
      { "content-type": contentType },
      payload,
    )

    const resp = await fetch(signedUrl, {
      method: "PUT",
      headers: { ...authHeaders, "Content-Type": contentType },
      body: payload as any,
    })

    if (!resp.ok) {
      const respBody = await resp.text()
      throw new Error(`S3 PutObject failed: ${resp.status} ${respBody}`)
    }
  }

  async deleteObject(key: string): Promise<void> {
    const { authHeaders, signedUrl } = await this.signRequest(
      "DELETE",
      this.keyUrl(key),
    )
    const resp = await fetch(signedUrl, {
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

    const payload = new TextEncoder().encode(body)
    const urlObj = new URL(this.keyUrl(""))
    urlObj.searchParams.set("delete", "")

    const { authHeaders, signedUrl } = await this.signRequest(
      "POST",
      urlObj.toString(),
      {},
      payload,
    )
    const resp = await fetch(signedUrl, {
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
    const cleanSrc = srcKey.replace(/^\/+/, "")
    const encodedSource = rfc3986UriEncode(`${this.bucket}/${cleanSrc}`, false)

    const { authHeaders, signedUrl } = await this.signRequest(
      "PUT",
      this.keyUrl(dstKey),
      { "x-amz-copy-source": encodedSource },
    )

    const resp = await fetch(signedUrl, {
      method: "PUT",
      headers: { ...authHeaders, "x-amz-copy-source": encodedSource },
    })

    if (!resp.ok) {
      const body = await resp.text()
      throw new Error(`S3 CopyObject failed: ${resp.status} ${body}`)
    }
  }
}
