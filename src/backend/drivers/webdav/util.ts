import { WebDavAddition, WebDavResource } from "./types"

function cleanPath(p: string): string {
  if (!p) return "/"
  const normalized = p.replace(/\\/g, "/").replace(/\/+/g, "/")
  return normalized.replace(/^\/|\/$/g, "") || "/"
}

function encodePath(p: string): string {
  return p
    .split("/")
    .filter(Boolean)
    .map((seg) => encodeURIComponent(seg))
    .join("/")
}

function buildUrl(base: string, path: string): string {
  const b = base.replace(/\/+$/, "")
  const p = cleanPath(path)
  return `${b}/${encodePath(p)}`
}

function getAuthHeader(addition: WebDavAddition): string {
  const credentials = `${addition.username}:${addition.password}`
  return `Basic ${btoa(credentials)}`
}

function xmlTag(xml: string, tag: string): string | null {
  const regex = new RegExp(`<[^>]*:${tag}[^>]*>([^<]*)</[^>]*:${tag}>`, "i")
  const match = xml.match(regex)
  if (match) return match[1]
  const regex2 = new RegExp(`<${tag}[^>]*>([^<]*)</${tag}>`, "i")
  const match2 = xml.match(regex2)
  return match2 ? match2[1] : null
}

function parsePropfindXml(xml: string): WebDavResource[] {
  const items: WebDavResource[] = []
  // Split by <d:response> or <D:response> or <response>
  const responseBlocks = xml.split(/<[^>]*:response[^>]*>/i).slice(1)

  for (const block of responseBlocks) {
    const endIdx = block.toLowerCase().indexOf("</")
    const section = endIdx !== -1 ? block.slice(0, endIdx) : block

    // Extract href (may be <d:href> or <D:href>)
    const hrefMatch = section.match(/<[^>]*:href[^>]*>([^<]*)</i) ||
      section.match(/<href[^>]*>([^<]*)</i)
    const href = hrefMatch ? hrefMatch[1] : ""
    if (!href) continue

    // Check for 404 status in propstat
    if (section.includes("404")) continue

    const displayName = xmlTag(section, "displayname") || ""
    const hasCollection = /<[^>]*collection[^>]*\/?\s*>/i.test(section)
    const contentLength = parseInt(
      xmlTag(section, "getcontentlength") || "0", 10,
    ) || 0
    const lastModified = xmlTag(section, "getlastmodified") || ""
    const contentType = xmlTag(section, "getcontenttype") || ""
    const etag = (xmlTag(section, "getetag") || "").replace(/"/g, "")

    items.push({
      href,
      displayName,
      resourceType: hasCollection ? "collection" : "",
      contentLength,
      lastModified,
      contentType,
      etag,
    })
  }

  return items
}

export function dirname(p: string): string {
  const cleaned = cleanPath(p)
  if (cleaned === "/") return "/"
  const parts = cleaned.split("/")
  parts.pop()
  return parts.length ? "/" + parts.join("/") : "/"
}

export function basename(p: string): string {
  const cleaned = cleanPath(p)
  if (cleaned === "/") return ""
  const parts = cleaned.split("/")
  return parts[parts.length - 1] || ""
}

export class WebDavClient {
  private addition: WebDavAddition
  private authHeader: string

  constructor(addition: WebDavAddition) {
    this.addition = addition
    this.authHeader = getAuthHeader(addition)
  }

  private get rootPath(): string {
    return cleanPath(this.addition.root_folder_path || "/")
  }

  private async request(
    method: string,
    path: string,
    body?: string | Buffer,
    extraHeaders?: Record<string, string>,
  ): Promise<{ status: number; body: string; headers: Record<string, string> }> {
    const url = buildUrl(this.addition.address, path)
    const headers: Record<string, string> = {
      Authorization: this.authHeader,
      ...extraHeaders,
    }

    const init: RequestInit = {
      method,
      headers,
      redirect: "follow",
    }

    if (body !== undefined) {
      init.body = body
    }

    // Cloudflare Workers fetch doesn't support tlsOptions directly.
    // For self-signed certs, users should use http:// or configure their server properly.
    const resp = await fetch(url, init)
    const respHeaders: Record<string, string> = {}
    resp.headers.forEach((v, k) => {
      respHeaders[k.toLowerCase()] = v
    })

    const respBody = await resp.text()
    return { status: resp.status, body: respBody, headers: respHeaders }
  }

  async propfind(
    path: string,
    depth: number = 1,
  ): Promise<WebDavResource[]> {
    const body = `<?xml version="1.0" encoding="utf-8"?>
<D:propfind xmlns:D="DAV:">
  <D:allprop/>
</D:propfind>`

    const result = await this.request("PROPFIND", path, body, {
      "Content-Type": "application/xml",
      Depth: String(depth),
    })

    if (result.status >= 400) {
      throw new Error(`PROPFIND ${path} failed: ${result.status} ${result.body}`)
    }

    return parsePropfindXml(result.body)
  }

  async mkdir(path: string): Promise<void> {
    const result = await this.request("MKCOL", path)
    if (result.status >= 400 && result.status !== 405) {
      throw new Error(`MKCOL ${path} failed: ${result.status} ${result.body}`)
    }
  }

  async put(path: string, content: Buffer): Promise<void> {
    const result = await this.request("PUT", path, content, {
      "Content-Type": "application/octet-stream",
    })
    if (result.status >= 400) {
      throw new Error(`PUT ${path} failed: ${result.status} ${result.body}`)
    }
  }

  async remove(path: string): Promise<void> {
    const result = await this.request("DELETE", path)
    if (result.status >= 400) {
      throw new Error(`DELETE ${path} failed: ${result.status} ${result.body}`)
    }
  }

  async move(srcPath: string, dstPath: string): Promise<void> {
    const destUrl = buildUrl(this.addition.address, dstPath)
    const result = await this.request("MOVE", srcPath, undefined, {
      Destination: destUrl,
      Overwrite: "T",
    })
    if (result.status >= 400) {
      throw new Error(`MOVE ${srcPath} -> ${dstPath} failed: ${result.status} ${result.body}`)
    }
  }

  async copy(srcPath: string, dstPath: string): Promise<void> {
    const destUrl = buildUrl(this.addition.address, dstPath)
    const result = await this.request("COPY", srcPath, undefined, {
      Destination: destUrl,
      Overwrite: "T",
    })
    if (result.status >= 400) {
      throw new Error(`COPY ${srcPath} -> ${dstPath} failed: ${result.status} ${result.body}`)
    }
  }

  async head(path: string): Promise<WebDavResource | null> {
    const resources = await this.propfind(path, 0)
    return resources.length > 0 ? resources[0] : null
  }

  resolvePath(virtualPath: string): string {
    const root = this.rootPath
    const rel = cleanPath(virtualPath)
    if (rel === "/") return root
    return root === "/" ? rel : `${root}/${rel.replace(/^\//, "")}`
  }
}

export { cleanPath }
