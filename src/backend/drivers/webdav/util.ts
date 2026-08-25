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

function getTag(xml: string, localName: string): string | null {
  const nsRe = new RegExp(`<[^>]*:${localName}[^>]*>([\\s\\S]*?)</[^>]*:${localName}>`, "i")
  const m1 = xml.match(nsRe)
  if (m1) return m1[1].trim()
  const noNsRe = new RegExp(`<${localName}[^>]*>([\\s\\S]*?)</${localName}>`, "i")
  const m2 = xml.match(noNsRe)
  return m2 ? m2[1].trim() : null
}

function hasChildTag(xml: string, parentLocal: string, childLocal: string): boolean {
  const re1 = new RegExp(`<[^>]*:${parentLocal}[^>]*>[\\s\\S]*?<[^>]*:${childLocal}[^>]*/?>[\\s\\S]*?</[^>]*:${parentLocal}>`, "i")
  if (re1.test(xml)) return true
  const re2 = new RegExp(`<${parentLocal}[^>]*>[\\s\\S]*?<${childLocal}[^>]*/?>[\\s\\S]*?</${parentLocal}>`, "i")
  return re2.test(xml)
}

function getNestedBlock(xml: string, outerLocal: string, innerLocal: string): string | null {
  const re = new RegExp(`<[^>]*${outerLocal}[^>]*>([\\s\\S]*?)</[^>]*${outerLocal}>`, "i")
  const m = xml.match(re)
  if (!m) return null
  const inner = new RegExp(`<[^>]*${innerLocal}[^>]*>([\\s\\S]*?)</[^>]*${innerLocal}>`, "i")
  const m2 = m[1].match(inner)
  return m2 ? m2[1] : null
}

function parsePropfindXml(xml: string): WebDavResource[] {
  const items: WebDavResource[] = []
  const re = /<[^>]*response[^>]*>([\s\S]*?)<\/[^>]*response>/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(xml)) !== null) {
    const block = m[1]
    const href = getTag(block, "href") || ""
    if (!href) continue
    const propBlock = getNestedBlock(block, "propstat", "prop") || ""
    const status = getTag(block, "status") || ""
    if (status.includes("404")) continue
    const displayName = getTag(propBlock, "displayname") || ""
    const isCollection = hasChildTag(propBlock, "resourcetype", "collection")
    const contentLength = parseInt(getTag(propBlock, "getcontentlength") || "0", 10) || 0
    const lastModified = getTag(propBlock, "getlastmodified") || ""
    const contentType = getTag(propBlock, "getcontenttype") || ""
    const etag = (getTag(propBlock, "getetag") || "").replace(/"/g, "")
    items.push({
      href,
      displayName,
      resourceType: isCollection ? "collection" : "",
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
      init.body = typeof body === "string" ? body : new Uint8Array(body)
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

  async getStream(
    path: string,
  ): Promise<{ body: ReadableStream; headers: Record<string, string> } | null> {
    const url = buildUrl(this.addition.address, path)
    const headers: Record<string, string> = {
      Authorization: this.authHeader,
    }
    const resp = await fetch(url, {
      method: "GET",
      headers,
      redirect: "follow",
    })
    if (!resp.ok || !resp.body) return null
    const respHeaders: Record<string, string> = {}
    resp.headers.forEach((v, k) => {
      respHeaders[k.toLowerCase()] = v
    })
    return { body: resp.body as ReadableStream, headers: respHeaders }
  }

  /** Extract the path portion from the address URL, preserving leading slash.
   *  e.g. "https://dav.koofr.net/dav/Koofr" → "/dav/Koofr"
   *  Must keep leading slash because server PROPFIND hrefs always start with "/" */
  get addressPath(): string {
    try {
      const u = new URL(this.addition.address)
      return u.pathname.replace(/\/+$/, "") || "/"
    } catch {
      return "/"
    }
  }

  resolvePath(virtualPath: string): string {
    const root = this.rootPath
    const rel = cleanPath(virtualPath)
    if (rel === "/") return root
    return root === "/" ? rel : `${root}/${rel.replace(/^\//, "")}`
  }
}

export { cleanPath }
