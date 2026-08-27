// Based on: https://github.com/OpenListTeam/OpenList/tree/main/drivers/s3
import { S3Addition, S3File, S3ListResult } from "./types"
import { presignS3Url, rfc3986UriEncode, signS3Headers } from "./sigv4"

const maxCopyObjectSize = 5 * 1000 * 1000 * 1000 // 5GB
const defaultCopyPartSize = 100 * 1024 * 1024 // 100MB
const maxCopyPartSize = 5 * 1024 * 1024 * 1024 // 5GB
const maxCopyParts = 10000

export function joinPath(...parts: string[]): string {
  return parts
    .map((p) => p.replace(/^\/+|\/+$/g, ""))
    .filter(Boolean)
    .join("/")
}

export function getKey(pathStr: string, isDir = false): string {
  let p = (pathStr || "").replace(/^\/+/, "")
  if (p && isDir && !p.endsWith("/")) {
    p += "/"
  }
  return p
}

export function getPlaceholderName(placeholder?: string): string {
  return placeholder && placeholder.trim() ? placeholder.trim() : ".openlist"
}

export function getBaseName(pathStr: string): string {
  const clean = pathStr.replace(/\/+$/, "")
  const lastSlash = clean.lastIndexOf("/")
  return lastSlash >= 0 ? clean.substring(lastSlash + 1) : clean
}

export function getDirName(pathStr: string): string {
  const clean = pathStr.replace(/\/+$/, "")
  const lastSlash = clean.lastIndexOf("/")
  return lastSlash >= 0 ? clean.substring(0, lastSlash) : ""
}

export function isSubPath(parent: string, child: string): boolean {
  const normParent = ("/" + parent + "/").replace(/\/+/g, "/")
  const normChild = ("/" + child + "/").replace(/\/+/g, "/")
  return normChild.startsWith(normParent)
}

function parseXmlTag(xml: string, tag: string): string | undefined {
  const match = xml.match(
    new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"),
  )
  return match ? match[1].trim() : undefined
}

function parseXmlBlocks(xml: string, tag: string): string[] {
  const results: string[] = []
  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "gi")
  let match: RegExpExecArray | null
  while ((match = regex.exec(xml)) !== null) {
    results.push(match[1])
  }
  return results
}

function unescapeXml(str: string): string {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
}

export function parseS3Error(xml: string, status: number): Error {
  const code = parseXmlTag(xml, "Code") || "Unknown"
  const message = parseXmlTag(xml, "Message") || xml || `HTTP ${status}`
  const err = new Error(
    `S3 Error [${code}]: ${unescapeXml(message)} (status ${status})`,
  )
  ;(err as any).code = code
  ;(err as any).status = status
  return err
}

export function parseListObjectsV1(
  xml: string,
  dirPath: string,
  placeholder: string,
  showPlaceholder = false,
): S3ListResult {
  const files: S3File[] = []
  const placeholderName = getPlaceholderName(placeholder)

  // CommonPrefixes (Folders)
  const commonPrefixBlocks = parseXmlBlocks(xml, "CommonPrefixes")
  for (const block of commonPrefixBlocks) {
    const prefix = parseXmlTag(block, "Prefix")
    if (prefix) {
      const decodedPrefix = unescapeXml(prefix)
      const name = getBaseName(decodedPrefix)
      if (name) {
        files.push({
          name,
          size: 0,
          isFolder: true,
          modified: new Date().toISOString(),
          path: joinPath(dirPath, name),
        })
      }
    }
  }

  // Contents (Files)
  const contentBlocks = parseXmlBlocks(xml, "Contents")
  for (const block of contentBlocks) {
    const key = parseXmlTag(block, "Key")
    if (!key) continue
    const decodedKey = unescapeXml(key)
    if (decodedKey.endsWith("/")) continue // skip directory markers

    const name = getBaseName(decodedKey)
    if (
      !showPlaceholder &&
      (name === placeholderName || name === placeholder)
    ) {
      continue
    }

    const size = parseInt(parseXmlTag(block, "Size") || "0", 10)
    const modified =
      parseXmlTag(block, "LastModified") || new Date().toISOString()
    const etag = parseXmlTag(block, "ETag")?.replace(/"/g, "")

    files.push({
      name,
      size,
      isFolder: false,
      modified,
      path: joinPath(dirPath, name),
      etag,
    })
  }

  const isTruncated = parseXmlTag(xml, "IsTruncated") === "true"
  const nextMarker = parseXmlTag(xml, "NextMarker")

  return {
    files,
    isTruncated,
    nextMarker,
    lastEvaluatedKey:
      files.length > 0 ? files[files.length - 1].path : undefined,
  }
}

export function parseListObjectsV2(
  xml: string,
  dirPath: string,
  placeholder: string,
  showPlaceholder = false,
): S3ListResult {
  const files: S3File[] = []
  const placeholderName = getPlaceholderName(placeholder)

  // CommonPrefixes
  const commonPrefixBlocks = parseXmlBlocks(xml, "CommonPrefixes")
  for (const block of commonPrefixBlocks) {
    const prefix = parseXmlTag(block, "Prefix")
    if (prefix) {
      const decodedPrefix = unescapeXml(prefix)
      const name = getBaseName(decodedPrefix)
      if (name) {
        files.push({
          name,
          size: 0,
          isFolder: true,
          modified: new Date().toISOString(),
          path: joinPath(dirPath, name),
        })
      }
    }
  }

  // Contents
  const contentBlocks = parseXmlBlocks(xml, "Contents")
  for (const block of contentBlocks) {
    const key = parseXmlTag(block, "Key")
    if (!key) continue
    const decodedKey = unescapeXml(key)
    if (decodedKey.endsWith("/")) continue

    const name = getBaseName(decodedKey)
    if (
      !showPlaceholder &&
      (name === placeholderName || name === placeholder)
    ) {
      continue
    }

    const size = parseInt(parseXmlTag(block, "Size") || "0", 10)
    const modified =
      parseXmlTag(block, "LastModified") || new Date().toISOString()
    const etag = parseXmlTag(block, "ETag")?.replace(/"/g, "")

    files.push({
      name,
      size,
      isFolder: false,
      modified,
      path: joinPath(dirPath, name),
      etag,
    })
  }

  const isTruncated = parseXmlTag(xml, "IsTruncated") === "true"
  const nextContinuationToken = parseXmlTag(xml, "NextContinuationToken")

  return {
    files,
    isTruncated,
    nextContinuationToken,
    lastEvaluatedKey:
      files.length > 0 ? files[files.length - 1].path : undefined,
  }
}

export function parseInitiateMultipartUpload(xml: string): string {
  const uploadId = parseXmlTag(xml, "UploadId")
  if (!uploadId) {
    throw new Error("InitiateMultipartUpload returned empty UploadId: " + xml)
  }
  return unescapeXml(uploadId)
}

export function parseCopyPartResult(xml: string): string {
  const etag = parseXmlTag(xml, "ETag")
  if (!etag) {
    throw new Error("UploadPartCopy returned empty ETag: " + xml)
  }
  return unescapeXml(etag).replace(/"/g, "")
}

function getCopyPartSize(size: number): number {
  const partSize = Math.max(
    defaultCopyPartSize,
    Math.floor((size - 1) / maxCopyParts) + 1,
  )
  if (partSize > maxCopyPartSize) {
    throw new Error(`Object size ${size} exceeds multipart copy limit`)
  }
  return partSize
}

export class S3Client {
  private addition: S3Addition
  private bucket: string
  private endpoint: string
  private region: string
  private accessKeyId: string
  private secretAccessKey: string
  private sessionToken?: string
  private isPathStyle: boolean
  private userAgent?: string

  constructor(addition: S3Addition) {
    this.addition = addition
    this.bucket = (addition.bucket || "").trim()

    let ep = (addition.endpoint || "").trim()
    if (!ep.startsWith("http://") && !ep.startsWith("https://")) {
      ep = "https://" + ep
    }
    this.endpoint = ep.replace(/\/+$/, "")

    this.region = (addition.region || "").trim() || "openlist"
    this.accessKeyId = (addition.access_key_id || "").trim()
    this.secretAccessKey = (addition.secret_access_key || "").trim()
    this.sessionToken = addition.session_token
      ? addition.session_token.trim()
      : undefined
    this.userAgent = addition.user_agent
      ? addition.user_agent.trim()
      : undefined

    // Determine path style
    const epUrl = new URL(this.endpoint)
    const isIp =
      /^(\d{1,3}\.){3}\d{1,3}$/.test(epUrl.hostname) ||
      epUrl.hostname === "localhost"
    this.isPathStyle = !!addition.force_path_style || isIp
  }

  public updateCredentials(credentials: {
    accessKeyId: string
    secretAccessKey: string
    sessionToken?: string
  }) {
    this.accessKeyId = credentials.accessKeyId
    this.secretAccessKey = credentials.secretAccessKey
    this.sessionToken = credentials.sessionToken
  }

  /**
   * Build full URL for a key or bucket action
   */
  public getUrl(key = "", queryParams?: Record<string, string>): string {
    const epUrl = new URL(this.endpoint)
    let urlStr = ""

    const cleanKey = key ? getKey(key, false) : ""

    if (this.isPathStyle) {
      const basePath = epUrl.pathname.replace(/\/+$/, "")
      const fullPath = [basePath, this.bucket, cleanKey]
        .filter(Boolean)
        .join("/")
      epUrl.pathname = "/" + fullPath.replace(/^\/+/, "")
      urlStr = epUrl.toString()
    } else {
      // Virtual host style
      const hostParts = epUrl.host.split(":")
      const port = hostParts[1] ? `:${hostParts[1]}` : ""
      const newHost = `${this.bucket}.${hostParts[0]}${port}`
      epUrl.host = newHost
      const basePath = epUrl.pathname.replace(/\/+$/, "")
      const fullPath = [basePath, cleanKey].filter(Boolean).join("/")
      epUrl.pathname = "/" + fullPath.replace(/^\/+/, "")
      urlStr = epUrl.toString()
    }

    const finalUrl = new URL(urlStr)
    if (queryParams) {
      for (const [k, v] of Object.entries(queryParams)) {
        if (v !== undefined && v !== null) {
          finalUrl.searchParams.set(k, v)
        }
      }
    }
    return finalUrl.toString()
  }

  private async fetch(
    method: string,
    url: string,
    body: string | Uint8Array | null = null,
    extraHeaders: Record<string, string> = {},
  ): Promise<Response> {
    const customHeaders: Record<string, string> = { ...extraHeaders }
    if (this.userAgent) {
      customHeaders["user-agent"] = this.userAgent
    }

    const { headers } = await signS3Headers({
      method,
      url,
      region: this.region,
      accessKeyId: this.accessKeyId,
      secretAccessKey: this.secretAccessKey,
      sessionToken: this.sessionToken,
      headers: customHeaders,
      body,
    })

    const reqInit: RequestInit = {
      method,
      headers,
    }
    if (
      body !== null &&
      body !== undefined &&
      method !== "GET" &&
      method !== "HEAD"
    ) {
      reqInit.body = body as any
    }

    return await fetch(url, reqInit)
  }

  public async listObjects(
    dirPath: string,
    version: "v1" | "v2" = "v1",
    showPlaceholder = false,
  ): Promise<S3File[]> {
    const prefix = getKey(dirPath, true)
    const files: S3File[] = []
    const placeholder = this.addition.placeholder || ""

    if (version === "v2") {
      let continuationToken: string | undefined
      let startAfter: string | undefined

      while (true) {
        const queryParams: Record<string, string> = {
          "list-type": "2",
          prefix,
          delimiter: "/",
        }
        if (continuationToken) {
          queryParams["continuation-token"] = continuationToken
        }
        if (startAfter) {
          queryParams["start-after"] = startAfter
        }

        const url = this.getUrl("", queryParams)
        const resp = await this.fetch("GET", url)
        const text = await resp.text()

        if (!resp.ok) {
          throw parseS3Error(text, resp.status)
        }

        const result = parseListObjectsV2(
          text,
          dirPath,
          placeholder,
          showPlaceholder,
        )
        files.push(...result.files)

        if (!result.isTruncated) {
          break
        }

        if (result.nextContinuationToken) {
          continuationToken = result.nextContinuationToken
          continue
        }

        if (result.files.length === 0) {
          break
        }
        startAfter = result.lastEvaluatedKey
      }
    } else {
      let marker: string | undefined

      while (true) {
        const queryParams: Record<string, string> = {
          prefix,
          delimiter: "/",
        }
        if (marker) {
          queryParams["marker"] = marker
        }

        const url = this.getUrl("", queryParams)
        const resp = await this.fetch("GET", url)
        const text = await resp.text()

        if (!resp.ok) {
          throw parseS3Error(text, resp.status)
        }

        const result = parseListObjectsV1(
          text,
          dirPath,
          placeholder,
          showPlaceholder,
        )
        files.push(...result.files)

        if (!result.isTruncated) {
          break
        }

        if (result.nextMarker) {
          marker = result.nextMarker
        } else if (result.files.length > 0) {
          marker = result.files[result.files.length - 1].path
        } else {
          break
        }
      }
    }

    return files
  }

  public async headObject(
    key: string,
  ): Promise<{ size: number; modified: string; etag: string } | null> {
    const url = this.getUrl(key)
    const resp = await this.fetch("HEAD", url)
    if (resp.status === 404) {
      return null
    }
    if (!resp.ok) {
      const text = await resp.text().catch(() => "")
      throw parseS3Error(text, resp.status)
    }

    const size = parseInt(resp.headers.get("content-length") || "0", 10)
    const modified =
      resp.headers.get("last-modified") || new Date().toISOString()
    const etag = (resp.headers.get("etag") || "").replace(/"/g, "")

    return { size, modified, etag }
  }

  public async listPrefixProbe(
    prefixKey: string,
    version: "v1" | "v2" = "v1",
  ): Promise<boolean> {
    const prefix = getKey(prefixKey, true)
    const queryParams: Record<string, string> = {
      prefix,
      "max-keys": "1",
    }
    if (version === "v2") {
      queryParams["list-type"] = "2"
    }
    const url = this.getUrl("", queryParams)
    const resp = await this.fetch("GET", url)
    if (!resp.ok) {
      return false
    }
    const text = await resp.text()
    return text.includes("<Contents>") || text.includes("<CommonPrefixes>")
  }

  public async putObject(
    key: string,
    body: Uint8Array | Buffer | string,
    contentType = "application/octet-stream",
  ): Promise<void> {
    const url = this.getUrl(key)
    const extraHeaders: Record<string, string> = {
      "content-type": contentType,
    }
    const resp = await this.fetch("PUT", url, body, extraHeaders)
    if (!resp.ok) {
      const text = await resp.text().catch(() => "")
      throw parseS3Error(text, resp.status)
    }
  }

  public async deleteObject(key: string): Promise<void> {
    const url = this.getUrl(key)
    const resp = await this.fetch("DELETE", url)
    if (!resp.ok && resp.status !== 404 && resp.status !== 204) {
      const text = await resp.text().catch(() => "")
      throw parseS3Error(text, resp.status)
    }
  }

  public async copyObject(
    srcKey: string,
    dstKey: string,
    size?: number,
  ): Promise<void> {
    if (size !== undefined && size > maxCopyObjectSize) {
      return this.copyMultipart(srcKey, dstKey, size)
    }

    const cleanSrc = getKey(srcKey, false)
    const cleanDst = getKey(dstKey, false)
    const encodedSource = rfc3986UriEncode(`${this.bucket}/${cleanSrc}`, false)

    const url = this.getUrl(cleanDst)
    const extraHeaders: Record<string, string> = {
      "x-amz-copy-source": encodedSource,
    }

    const resp = await this.fetch("PUT", url, null, extraHeaders)
    if (!resp.ok) {
      const text = await resp.text().catch(() => "")
      throw parseS3Error(text, resp.status)
    }
  }

  public async copyMultipart(
    srcKey: string,
    dstKey: string,
    size: number,
  ): Promise<void> {
    const cleanSrc = getKey(srcKey, false)
    const cleanDst = getKey(dstKey, false)
    const encodedSource = rfc3986UriEncode(`${this.bucket}/${cleanSrc}`, false)

    // 1. Create Multipart Upload
    const initUrl = this.getUrl(cleanDst, { uploads: "" })
    const initResp = await this.fetch("POST", initUrl)
    const initText = await initResp.text()
    if (!initResp.ok) {
      throw parseS3Error(initText, initResp.status)
    }
    const uploadId = parseInitiateMultipartUpload(initText)

    // 2. Upload parts
    const partSize = getCopyPartSize(size)
    const parts: { partNumber: number; etag: string }[] = []

    try {
      let start = 0
      let partNumber = 1
      while (start < size) {
        const end = Math.min(start + partSize, size) - 1
        const partUrl = this.getUrl(cleanDst, {
          partNumber: partNumber.toString(),
          uploadId,
        })
        const partHeaders: Record<string, string> = {
          "x-amz-copy-source": encodedSource,
          "x-amz-copy-source-range": `bytes=${start}-${end}`,
        }

        const partResp = await this.fetch("PUT", partUrl, null, partHeaders)
        const partText = await partResp.text()
        if (!partResp.ok) {
          throw parseS3Error(partText, partResp.status)
        }

        const etag = parseCopyPartResult(partText)
        parts.push({ partNumber, etag })

        start += partSize
        partNumber++
      }

      // 3. Complete Multipart Upload
      const completeUrl = this.getUrl(cleanDst, { uploadId })
      const completeBody = [
        "<CompleteMultipartUpload>",
        ...parts.map(
          (p) =>
            `<Part><PartNumber>${p.partNumber}</PartNumber><ETag>${p.etag}</ETag></Part>`,
        ),
        "</CompleteMultipartUpload>",
      ].join("")

      const completeResp = await this.fetch("POST", completeUrl, completeBody, {
        "content-type": "application/xml",
      })
      if (!completeResp.ok) {
        const completeText = await completeResp.text().catch(() => "")
        throw parseS3Error(completeText, completeResp.status)
      }
    } catch (err) {
      // Abort multipart on failure
      const abortUrl = this.getUrl(cleanDst, { uploadId })
      await this.fetch("DELETE", abortUrl).catch(() => {})
      throw err
    }
  }

  public async getLink(
    key: string,
    fileName: string,
    signUrlExpireHours = 4,
    customHost = "",
    enableCustomHostPresign = false,
    removeBucket = false,
    addFilenameToDisposition = false,
  ): Promise<{ url: string; headers?: Record<string, string> }> {
    const cleanKey = getKey(key, false)
    const expireSeconds = Math.max(60, Math.floor(signUrlExpireHours * 3600))
    const rawS3Url = this.getUrl(cleanKey)

    if (customHost) {
      if (enableCustomHostPresign) {
        // Presign using the original S3 URL, then replace host.
        // Do NOT include response-content-disposition in presigned URLs:
        // many S3-compatible services (Cloudflare R2, etc.) reject such
        // parameters with HTTP 403.
        const presigned = await presignS3Url({
          url: rawS3Url,
          region: this.region,
          accessKeyId: this.accessKeyId,
          secretAccessKey: this.secretAccessKey,
          sessionToken: this.sessionToken,
          expiresInSeconds: expireSeconds,
        })

        const presignedUrl = new URL(presigned)
        const hostSplit = customHost.split("://")
        if (
          hostSplit.length === 2 &&
          (hostSplit[0] === "http" || hostSplit[0] === "https")
        ) {
          presignedUrl.protocol = hostSplit[0] + ":"
          presignedUrl.host = hostSplit[1].replace(/\/+$/, "")
        } else {
          presignedUrl.host = customHost.replace(/\/+$/, "")
        }

        if (removeBucket) {
          const bucketPrefix = "/" + this.bucket
          if (presignedUrl.pathname.startsWith(bucketPrefix)) {
            let pathWithoutBucket = presignedUrl.pathname.substring(
              bucketPrefix.length,
            )
            if (!pathWithoutBucket) pathWithoutBucket = "/"
            presignedUrl.pathname = pathWithoutBucket
          }
        }
        return { url: presignedUrl.toString() }
      } else {
        // Direct custom host URL without signature
        const hostSplit = customHost.split("://")
        let scheme = "https"
        let host = customHost
        if (
          hostSplit.length === 2 &&
          (hostSplit[0] === "http" || hostSplit[0] === "https")
        ) {
          scheme = hostSplit[0]
          host = hostSplit[1].replace(/\/+$/, "")
        }

        let pathPart = this.isPathStyle
          ? `/${this.bucket}/${cleanKey}`
          : `/${cleanKey}`
        if (removeBucket && pathPart.startsWith(`/${this.bucket}`)) {
          pathPart = pathPart.substring(`/${this.bucket}`.length)
          if (!pathPart) pathPart = "/"
        }
        return {
          url: `${scheme}://${host}${pathPart.startsWith("/") ? "" : "/"}${pathPart}`,
        }
      }
    }

    // Default presigned URL.
    // Only add response-content-disposition when there is no custom host,
    // as many S3-compatible services return HTTP 403 when this parameter is
    // present in a presigned URL.
    const customQueryParams: Record<string, string> = {}
    if (addFilenameToDisposition) {
      const encoded = encodeURIComponent(fileName)
      customQueryParams["response-content-disposition"] =
        `attachment; filename="${encoded}"; filename*=UTF-8''${encoded}`
    }

    const presigned = await presignS3Url({
      url: rawS3Url,
      region: this.region,
      accessKeyId: this.accessKeyId,
      secretAccessKey: this.secretAccessKey,
      sessionToken: this.sessionToken,
      expiresInSeconds: expireSeconds,
      customQueryParams: Object.keys(customQueryParams).length
        ? customQueryParams
        : undefined,
    })

    return { url: presigned }
  }

  public async getDirectUploadInfo(
    dstDir: string,
    fileName: string,
    signUrlExpireHours = 4,
    directUploadHost = "",
  ): Promise<{ upload_url: string; method: string }> {
    const fullPath = joinPath(dstDir, fileName)
    const cleanKey = getKey(fullPath, false)
    const expireSeconds = Math.max(60, Math.floor(signUrlExpireHours * 3600))
    let targetUrl = this.getUrl(cleanKey)

    if (directUploadHost) {
      const parsed = new URL(targetUrl)
      const hostSplit = directUploadHost.split("://")
      if (
        hostSplit.length === 2 &&
        (hostSplit[0] === "http" || hostSplit[0] === "https")
      ) {
        parsed.protocol = hostSplit[0] + ":"
        parsed.host = hostSplit[1].replace(/\/+$/, "")
      } else {
        parsed.host = directUploadHost.replace(/\/+$/, "")
      }
      targetUrl = parsed.toString()
    }

    const presigned = await presignS3Url({
      method: "PUT",
      url: targetUrl,
      region: this.region,
      accessKeyId: this.accessKeyId,
      secretAccessKey: this.secretAccessKey,
      sessionToken: this.sessionToken,
      expiresInSeconds: expireSeconds,
    })

    return {
      upload_url: presigned,
      method: "PUT",
    }
  }
}
