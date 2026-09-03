// Azure Blob Storage driver — 通过 REST API + SharedKey/SAS 认证访问 Azure Blob
// 移植自 OpenList Go 版 drivers/azure_blob。
// 目录采用「虚拟目录」语义（List Blobs delimiter=/），目录标记为空 blob。
import {
  StorageDriver,
  FileItem,
  calcFileType,
} from "../../internal/driver/base"
import { sortFileItems } from "../../internal/driver/sort"
import { AzureBlobAddition, AzureListResult } from "./types"

function extractAccountName(endpoint: string): string {
  let e = endpoint.replace(/^https?:\/\//, "")
  const idx = e.indexOf(".")
  return (idx >= 0 ? e.slice(0, idx) : e).toLowerCase()
}

function ensureTrailingSlash(p: string): string {
  return p.endsWith("/") ? p : p + "/"
}

function joinPath(a: string, b: string): string {
  const left = String(a || "").replace(/\/+$/, "")
  const right = String(b || "").replace(/^\/+/, "")
  if (!left) return right
  if (!right) return left
  return left + "/" + right
}

function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = ""
  for (const b of bytes) binary += String.fromCharCode(b)
  return btoa(binary)
}

async function hmacSha256Base64(
  data: string,
  key: Uint8Array,
): Promise<string> {
  const keyMat = await crypto.subtle.importKey(
    "raw",
    key,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  )
  const sig = await crypto.subtle.sign(
    "HMAC",
    keyMat,
    new TextEncoder().encode(data),
  )
  return bytesToBase64(new Uint8Array(sig))
}

// 简单 XML 提取：从 Azure List Blobs 响应中提取 blob/prefix 信息
function parseListBlobsXml(xml: string): AzureListResult {
  const result: AzureListResult = { blobs: [], prefixes: [] }
  const blobRe = /<Blob>([\s\S]*?)<\/Blob>/g
  const prefixRe =
    /<BlobPrefix>[\s\S]*?<Name>([^<]+)<\/Name>[\s\S]*?<\/BlobPrefix>/g
  let m: RegExpExecArray | null
  while ((m = blobRe.exec(xml))) {
    const block = m[1]
    const name = (block.match(/<Name>([^<]+)<\/Name>/) || [])[1] || ""
    if (name.endsWith("/")) continue
    const size = parseInt(
      (block.match(/<Content-Length>(\d+)<\/Content-Length>/) || [])[1] || "0",
      10,
    )
    const modified =
      (block.match(/<Last-Modified>([^<]+)<\/Last-Modified>/) || [])[1] || ""
    result.blobs.push({
      name,
      size,
      modified: modified
        ? new Date(modified).toISOString()
        : new Date().toISOString(),
    })
  }
  while ((m = prefixRe.exec(xml))) {
    result.prefixes.push(m[1])
  }
  return result
}

export class AzureBlobDriver implements StorageDriver {
  private addition: AzureBlobAddition
  private accountName: string
  private keyBytes: Uint8Array
  private endpoint: string
  private container: string

  constructor(addition: AzureBlobAddition) {
    this.addition = addition || {}
    this.accountName = extractAccountName(this.addition.endpoint || "")
    this.keyBytes = base64ToBytes(this.addition.access_key || "")
    this.endpoint = (this.addition.endpoint || "").replace(/\/+$/, "")
    this.container = (this.addition.container_name || "").replace(
      /^\/+|\/+$/g,
      "",
    )
  }

  async init(): Promise<void> {
    if (!/^[a-z0-9]+$/.test(this.accountName)) {
      throw new Error("[AzureBlob] invalid storage account name")
    }
    if (!this.container) {
      throw new Error("[AzureBlob] container_name is required")
    }
    if (!this.addition.access_key) {
      throw new Error("[AzureBlob] access_key is required")
    }
  }

  /** 计算 SharedKey 签名（stringToSign） */
  private async sharedKeySignature(
    method: string,
    path: string,
    query: string,
    extraHeaders: Record<string, string>,
    contentLength: string,
    contentType: string,
  ): Promise<string> {
    const xmsDate = extraHeaders["x-ms-date"] || ""
    const canonicalHeaders = Object.keys(extraHeaders)
      .filter((k) => k.startsWith("x-ms-"))
      .sort()
      .map((k) => `${k.toLowerCase()}:${extraHeaders[k].trim()}\n`)
      .join("")
    const canonicalResource = `/${this.accountName}${path ? "/" + path : ""}\n${query
      .split("&")
      .filter(Boolean)
      .sort()
      .map((p) => {
        const [k, v] = p.split("=")
        return `${k.toLowerCase()}:${v || ""}`
      })
      .join("\n")}`
    const stringToSign = `${method}\n\n\n${contentLength}\n\n${contentType}\n\n\n\n\n\n\n${canonicalHeaders}${canonicalResource}`
    return hmacSha256Base64(stringToSign, this.keyBytes)
  }

  /** 发起带 SharedKey 认证的请求 */
  private async request(
    method: string,
    path: string,
    query: string,
    options: {
      body?: Uint8Array
      contentType?: string
      extraHeaders?: Record<string, string>
    } = {},
  ): Promise<Response> {
    const xmsDate = new Date().toUTCString()
    const contentType = options.contentType || ""
    const contentLength = options.body ? String(options.body.length) : ""
    const extraHeaders = {
      "x-ms-date": xmsDate,
      "x-ms-version": "2021-08-06",
      ...(options.extraHeaders || {}),
    }
    const signature = await this.sharedKeySignature(
      method,
      path,
      query,
      extraHeaders,
      contentLength,
      contentType,
    )
    const url = `${this.endpoint}/${this.container}${path ? "/" + path : ""}${query ? "?" + query : ""}`
    const headers: Record<string, string> = {
      Authorization: `SharedKey ${this.accountName}:${signature}`,
      "x-ms-date": xmsDate,
      "x-ms-version": "2021-08-06",
      ...extraHeaders,
    }
    if (contentLength) headers["Content-Length"] = contentLength
    if (contentType) headers["Content-Type"] = contentType
    return fetch(url, {
      method,
      headers,
      ...(options.body ? { body: options.body as any } : {}),
    })
  }

  /** 生成 SAS 下载 URL */
  private async sasUrl(blobPath: string): Promise<string> {
    const expiry = new Date(
      Date.now() + (this.addition.sign_url_expire || 4) * 3600 * 1000,
    )
    const se = expiry.toISOString().replace(/\.\d+Z$/, "Z")
    const canonicalResource = `/blob/${this.accountName}/${this.container}/${blobPath}`
    const stringToSign = `r\n\n\n${se}\n${canonicalResource}\n\n\n\n\n\n\n\n\n`
    const sig = encodeURIComponent(
      await hmacSha256Base64(stringToSign, this.keyBytes),
    )
    return `${this.endpoint}/${this.container}/${blobPath}?sp=r&st=&se=${encodeURIComponent(se)}&sv=2021-08-06&sr=b&sig=${sig}`
  }

  private getKey(physicalPath: string): string {
    return String(physicalPath || "/").replace(/^\/+/, "")
  }

  async list(_v: string, physicalPath: string): Promise<FileItem[]> {
    let prefix = this.getKey(physicalPath)
    if (prefix) prefix = ensureTrailingSlash(prefix)
    const query = `restype=container&comp=list&delimiter=%2F&prefix=${encodeURIComponent(prefix)}`
    const res = await this.request("GET", "", query)
    if (!res.ok) throw new Error(`[AzureBlob] list failed: HTTP ${res.status}`)
    const xml = await res.text()
    const { blobs, prefixes } = parseListBlobsXml(xml)

    const items: FileItem[] = []
    for (const p of prefixes) {
      const name = p.replace(/\/+$/, "").split("/").filter(Boolean).pop() || p
      items.push({
        name,
        size: 0,
        is_dir: true,
        modified: new Date().toISOString(),
        sign: "",
        type: 1,
        raw_url: "",
      })
    }
    for (const b of blobs) {
      const name = b.name.split("/").filter(Boolean).pop() || b.name
      items.push({
        name,
        size: b.size,
        is_dir: false,
        modified: b.modified,
        sign: b.name,
        type: calcFileType(name, false),
        raw_url: "",
      })
    }
    return sortFileItems(items, "name", "asc")
  }

  async get(_v: string, physicalPath: string): Promise<FileItem> {
    const key = this.getKey(physicalPath)
    const name = key.split("/").filter(Boolean).pop() || key
    const rawUrl = await this.sasUrl(key)
    return {
      name,
      size: 0,
      is_dir: false,
      modified: new Date().toISOString(),
      sign: key,
      type: calcFileType(name, false),
      raw_url: rawUrl,
    }
  }

  async mkdir(_v: string, physicalPath: string): Promise<void> {
    const key = ensureTrailingSlash(this.getKey(physicalPath))
    const res = await this.request("PUT", key, "", {
      body: new Uint8Array(0),
      contentType: "application/octet-stream",
      extraHeaders: {
        "x-ms-blob-type": "BlockBlob",
        "x-ms-meta-hdi_isfolder": "true",
      },
    })
    if (!res.ok) throw new Error(`[AzureBlob] mkdir failed: HTTP ${res.status}`)
  }

  async rename(
    _v: string,
    physicalPath: string,
    newName: string,
  ): Promise<void> {
    const srcKey = this.getKey(physicalPath)
    const dstKey = joinPath(
      physicalPath.split("/").slice(0, -1).join("/"),
      newName,
    ).replace(/^\/+/, "")
    await this.copyBlob(srcKey, dstKey)
    await this.deleteBlob(srcKey)
  }

  async remove(
    _v: string,
    physicalPath: string,
    _names: string[],
  ): Promise<void> {
    const key = this.getKey(physicalPath)
    await this.deleteBlob(key)
  }

  async move(
    _s: string,
    _d: string,
    names: string[],
    srcPhys: string,
    dstPhys: string,
  ): Promise<void> {
    for (const name of names) {
      const srcKey = joinPath(this.getKey(srcPhys), name)
      const dstKey = joinPath(this.getKey(dstPhys), name)
      await this.copyBlob(srcKey, dstKey)
      await this.deleteBlob(srcKey)
    }
  }

  async copy(
    _s: string,
    _d: string,
    names: string[],
    srcPhys: string,
    dstPhys: string,
  ): Promise<void> {
    for (const name of names) {
      const srcKey = joinPath(this.getKey(srcPhys), name)
      const dstKey = joinPath(this.getKey(dstPhys), name)
      await this.copyBlob(srcKey, dstKey)
    }
  }

  async put(_v: string, physicalPath: string, content: Buffer): Promise<void> {
    const key = this.getKey(physicalPath)
    const res = await this.request("PUT", key, "", {
      body: new Uint8Array(content),
      contentType: "application/octet-stream",
      extraHeaders: { "x-ms-blob-type": "BlockBlob" },
    })
    if (!res.ok) throw new Error(`[AzureBlob] put failed: HTTP ${res.status}`)
  }

  private async copyBlob(srcKey: string, dstKey: string): Promise<void> {
    const srcUrl = `${this.endpoint}/${this.container}/${srcKey}`
    const res = await this.request("PUT", dstKey, "", {
      body: new Uint8Array(0),
      contentType: "application/octet-stream",
      extraHeaders: {
        "x-ms-blob-type": "BlockBlob",
        "x-ms-copy-source": srcUrl,
      },
    })
    // 202 表示复制已接受（异步）
    if (res.status !== 201 && res.status !== 202 && !res.ok) {
      throw new Error(`[AzureBlob] copy failed: HTTP ${res.status}`)
    }
  }

  private async deleteBlob(key: string): Promise<void> {
    const res = await this.request("DELETE", key, "")
    if (res.status !== 202 && res.status !== 404 && !res.ok) {
      throw new Error(`[AzureBlob] delete failed: HTTP ${res.status}`)
    }
  }
}
