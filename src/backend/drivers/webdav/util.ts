import CryptoJS from "crypto-js"
import { WebdavAddition, WebdavFile, WebdavLinkResult } from "./types"

export function fixSlash(s: string): string {
  if (!s.endsWith("/")) {
    s += "/"
  }
  return s
}

export function fixSlashes(s: string): string {
  if (!s.startsWith("/")) {
    s = "/" + s
  }
  return fixSlash(s)
}

export function joinPath(path0: string, path1: string): string {
  const p0 = path0.replace(/\/+$/, "")
  const p1 = path1.replace(/^\/+/, "")
  if (!p0 && !p1) return "/"
  if (!p0) return "/" + p1
  if (!p1) return p0
  return `${p0}/${p1}`
}

export function pathEscape(p: string): string {
  return p
    .split("/")
    .map((seg) => encodeURIComponent(seg))
    .join("/")
}

/**
 * Robust WebDAV XML Multistatus parser.
 * Handles diverse namespace prefixes (d:, D:, a:, xmlns="DAV:") and case variations.
 */
export function parseMultistatusXml(
  xml: string,
  targetPath: string,
): { self?: WebdavFile; items: WebdavFile[] } {
  const items: WebdavFile[] = []
  let selfItem: WebdavFile | undefined

  // Regex to extract all <...response> ... </...response> blocks
  const responseRegex =
    /<(?:[a-zA-Z0-9_-]+:)?response\b[^>]*>([\s\S]*?)<\/(?:[a-zA-Z0-9_-]+:)?response>/gi
  let respMatch: RegExpExecArray | null

  while ((respMatch = responseRegex.exec(xml)) !== null) {
    const respBlock = respMatch[1]

    // Extract href
    const hrefMatch =
      /<(?:[a-zA-Z0-9_-]+:)?href\b[^>]*>([\s\S]*?)<\/(?:[a-zA-Z0-9_-]+:)?href>/i.exec(
        respBlock,
      )
    if (!hrefMatch) continue
    const rawHref = hrefMatch[1].trim()
    let decodedHref = rawHref
    try {
      decodedHref = decodeURIComponent(rawHref)
    } catch {
      // ignore URI decode error
    }

    // Extract propstat with 200 OK
    const propstatRegex =
      /<(?:[a-zA-Z0-9_-]+:)?propstat\b[^>]*>([\s\S]*?)<\/(?:[a-zA-Z0-9_-]+:)?propstat>/gi
    let propstatMatch: RegExpExecArray | null
    let propContent = ""

    while ((propstatMatch = propstatRegex.exec(respBlock)) !== null) {
      const psBlock = propstatMatch[1]
      const statusMatch =
        /<(?:[a-zA-Z0-9_-]+:)?status\b[^>]*>([\s\S]*?)<\/(?:[a-zA-Z0-9_-]+:)?status>/i.exec(
          psBlock,
        )
      const statusText = statusMatch ? statusMatch[1] : ""
      if (
        statusText.includes("200") ||
        statusText.toLowerCase().includes("ok")
      ) {
        const propMatch =
          /<(?:[a-zA-Z0-9_-]+:)?prop\b[^>]*>([\s\S]*?)<\/(?:[a-zA-Z0-9_-]+:)?prop>/i.exec(
            psBlock,
          )
        if (propMatch) {
          propContent = propMatch[1]
          break
        }
      }
    }

    if (!propContent) continue

    // Extract isFolder from resourcetype
    const isFolder =
      /<(?:[a-zA-Z0-9_-]+:)?resourcetype\b[^>]*>[\s\S]*?<(?:[a-zA-Z0-9_-]+:)?collection\b/i.test(
        propContent,
      )

    // Extract displayname
    const dnMatch =
      /<(?:[a-zA-Z0-9_-]+:)?displayname\b[^>]*>([\s\S]*?)<\/(?:[a-zA-Z0-9_-]+:)?displayname>/i.exec(
        propContent,
      )
    let displayName = dnMatch ? dnMatch[1].trim() : ""

    // Derive name from href if displayname is missing or is pure path
    const cleanHref = decodedHref.replace(/\/+$/, "")
    const hrefBaseName = cleanHref ? cleanHref.split("/").pop() || "" : ""
    const name = displayName || hrefBaseName

    // Extract content length (size)
    const lenMatch =
      /<(?:[a-zA-Z0-9_-]+:)?getcontentlength\b[^>]*>([\s\S]*?)<\/(?:[a-zA-Z0-9_-]+:)?getcontentlength>/i.exec(
        propContent,
      )
    const size = isFolder
      ? 0
      : lenMatch
        ? parseInt(lenMatch[1].trim(), 10) || 0
        : 0

    // Extract last modified
    const modMatch =
      /<(?:[a-zA-Z0-9_-]+:)?getlastmodified\b[^>]*>([\s\S]*?)<\/(?:[a-zA-Z0-9_-]+:)?getlastmodified>/i.exec(
        propContent,
      )
    let modified = new Date().toISOString()
    if (modMatch) {
      const parsedDate = new Date(modMatch[1].trim())
      if (!isNaN(parsedDate.getTime())) {
        modified = parsedDate.toISOString()
      }
    }

    // Extract content type & etag
    const ctMatch =
      /<(?:[a-zA-Z0-9_-]+:)?getcontenttype\b[^>]*>([\s\S]*?)<\/(?:[a-zA-Z0-9_-]+:)?getcontenttype>/i.exec(
        propContent,
      )
    const contentType = ctMatch ? ctMatch[1].trim() : undefined

    const etagMatch =
      /<(?:[a-zA-Z0-9_-]+:)?getetag\b[^>]*>([\s\S]*?)<\/(?:[a-zA-Z0-9_-]+:)?getetag>/i.exec(
        propContent,
      )
    const etag = etagMatch
      ? etagMatch[1].trim().replace(/^"|"$/g, "")
      : undefined

    const file: WebdavFile = {
      name,
      path: decodedHref,
      size,
      modified,
      isFolder,
      contentType,
      etag,
    }

    // Check if this response represents the directory itself
    const normTarget = targetPath.replace(/\/+$/, "").toLowerCase()
    const normHref = cleanHref.toLowerCase()

    if (
      !selfItem &&
      (normHref === normTarget ||
        normHref.endsWith(normTarget) ||
        (normTarget === "" && normHref === ""))
    ) {
      selfItem = file
    } else {
      items.push(file)
    }
  }

  return { self: selfItem, items }
}

/**
 * Digest Auth Support
 */
interface DigestParts {
  realm?: string
  nonce?: string
  qop?: string
  opaque?: string
  algorithm?: string
}

function parseDigestChallenge(header: string): DigestParts {
  const parts: DigestParts = {}
  const matchParts = header.replace(/^digest\s+/i, "").split(/,\s*/)
  for (const part of matchParts) {
    const eqIdx = part.indexOf("=")
    if (eqIdx !== -1) {
      const key = part.slice(0, eqIdx).trim()
      const val = part
        .slice(eqIdx + 1)
        .trim()
        .replace(/^"|"$/g, "")
      if (key === "realm") parts.realm = val
      else if (key === "nonce") parts.nonce = val
      else if (key === "qop") parts.qop = val
      else if (key === "opaque") parts.opaque = val
      else if (key === "algorithm") parts.algorithm = val
    }
  }
  return parts
}

function computeDigestAuth(
  parts: DigestParts,
  username: string,
  password: string,
  method: string,
  uri: string,
  nc: number = 1,
): string {
  const ncStr = nc.toString(16).padStart(8, "0")
  const cnonce = Math.random().toString(36).substring(2, 18)
  const realm = parts.realm || ""
  const nonce = parts.nonce || ""
  const algorithm = (parts.algorithm || "MD5").toUpperCase()
  const qop = parts.qop || ""

  let ha1 = ""
  if (algorithm === "MD5" || algorithm === "") {
    ha1 = CryptoJS.MD5(`${username}:${realm}:${password}`).toString()
  } else if (algorithm === "MD5-SESS") {
    const inner = CryptoJS.MD5(`${username}:${realm}:${password}`).toString()
    ha1 = CryptoJS.MD5(`${inner}:${nonce}:${cnonce}`).toString()
  }

  let ha2 = ""
  if (qop === "auth" || qop === "") {
    ha2 = CryptoJS.MD5(`${method}:${uri}`).toString()
  }

  let response = ""
  if (!qop) {
    response = CryptoJS.MD5(`${ha1}:${nonce}:${ha2}`).toString()
  } else {
    response = CryptoJS.MD5(
      `${ha1}:${nonce}:${ncStr}:${cnonce}:${qop}:${ha2}`,
    ).toString()
  }

  let authHeader = `Digest username="${username}", realm="${realm}", nonce="${nonce}", uri="${uri}", response="${response}"`
  if (algorithm) {
    authHeader += `, algorithm=${algorithm}`
  }
  if (qop) {
    authHeader += `, qop=${qop}, nc=${ncStr}, cnonce="${cnonce}"`
  }
  if (parts.opaque) {
    authHeader += `, opaque="${parts.opaque}"`
  }
  return authHeader
}

/**
 * SharePoint SAML Auth via SOAP
 */
const SHAREPOINT_LOGIN_URLS: Record<string, string> = {
  com: "https://login.microsoftonline.com",
  cn: "https://login.chinacloudapi.cn",
  us: "https://login.microsoftonline.us",
  de: "https://login.microsoftonline.de",
}

export async function getSharepointCookie(
  username: string,
  password: string,
  siteUrl: string,
): Promise<string> {
  const urlObj = new URL(siteUrl)
  const hostParts = urlObj.hostname.split(".")
  const tld = hostParts[hostParts.length - 1]
  const loginBase =
    SHAREPOINT_LOGIN_URLS[tld] || "https://login.microsoftonline.com"
  const loginUrl = `${loginBase}/extSTS.srf`

  const samlRequest = `<s:Envelope xmlns:s="http://www.w3.org/2003/05/soap-envelope"
xmlns:a="http://www.w3.org/2005/08/addressing"
xmlns:u="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd">
<s:Header>
<a:Action s:mustUnderstand="1">http://schemas.xmlsoap.org/ws/2005/02/trust/RST/Issue</a:Action>
<a:ReplyTo>
<a:Address>http://www.w3.org/2005/08/addressing/anonymous</a:Address>
</a:ReplyTo>
<a:To s:mustUnderstand="1">${loginUrl}</a:To>
<o:Security s:mustUnderstand="1"
 xmlns:o="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd">
<o:UsernameToken>
  <o:Username>${username.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</o:Username>
  <o:Password>${password.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</o:Password>
</o:UsernameToken>
</o:Security>
</s:Header>
<s:Body>
<t:RequestSecurityToken xmlns:t="http://schemas.xmlsoap.org/ws/2005/02/trust">
<wsp:AppliesTo xmlns:wsp="http://schemas.xmlsoap.org/ws/2004/09/policy">
  <a:EndpointReference>
    <a:Address>${siteUrl.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</a:Address>
  </a:EndpointReference>
</wsp:AppliesTo>
<t:KeyType>http://schemas.xmlsoap.org/ws/2005/05/identity/NoProofKey</t:KeyType>
<t:RequestType>http://schemas.xmlsoap.org/ws/2005/02/trust/Issue</t:RequestType>
<t:TokenType>urn:oasis:names:tc:SAML:1.0:assertion</t:TokenType>
</t:RequestSecurityToken>
</s:Body>
</s:Envelope>`

  const tokenResp = await fetch(loginUrl, {
    method: "POST",
    headers: { "Content-Type": "application/soap+xml; charset=utf-8" },
    body: samlRequest,
  })

  if (!tokenResp.ok) {
    throw new Error(`SharePoint SAML auth failed with HTTP ${tokenResp.status}`)
  }

  const tokenXml = await tokenResp.text()
  const tokenMatch =
    /<(?:[a-zA-Z0-9_-]+:)?BinarySecurityToken\b[^>]*>([\s\S]*?)<\/(?:[a-zA-Z0-9_-]+:)?BinarySecurityToken>/i.exec(
      tokenXml,
    )

  if (!tokenMatch) {
    // Check if error response
    const faultMatch =
      /<(?:[a-zA-Z0-9_-]+:)?Text\b[^>]*>([\s\S]*?)<\/(?:[a-zA-Z0-9_-]+:)?Text>/i.exec(
        tokenXml,
      )
    const errText = faultMatch
      ? faultMatch[1]
      : "Failed to obtain BinarySecurityToken"
    throw new Error(`SharePoint login failed: ${errText}`)
  }

  const binaryToken = tokenMatch[1].trim()
  const signinUrl = `https://${urlObj.host}/_forms/default.aspx?wa=wsignin1.0`

  const signinResp = await fetch(signinUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: binaryToken,
    redirect: "manual",
  })

  let rtFa = ""
  let fedAuth = ""

  // Extract set-cookie
  const getCookies = (resp: Response) => {
    const rawCookies: string[] = []
    if (resp.headers.getSetCookie) {
      rawCookies.push(...resp.headers.getSetCookie())
    } else {
      const sc = resp.headers.get("set-cookie")
      if (sc) rawCookies.push(sc)
    }
    for (const c of rawCookies) {
      const matchRtFa = /rtFa=([^;]+)/.exec(c)
      if (matchRtFa) rtFa = matchRtFa[1]
      const matchFed = /FedAuth=([^;]+)/.exec(c)
      if (matchFed) fedAuth = matchFed[1]
    }
  }

  getCookies(signinResp)

  if (!rtFa || !fedAuth) {
    // Some endpoints may redirect once more
    const location = signinResp.headers.get("location")
    if (location) {
      const redirectUrl = new URL(location, signinUrl).toString()
      const followResp = await fetch(redirectUrl, {
        method: "GET",
        headers: {
          Cookie: `rtFa=${rtFa}; FedAuth=${fedAuth}`,
        },
        redirect: "manual",
      })
      getCookies(followResp)
    }
  }

  if (!rtFa && !fedAuth) {
    throw new Error(
      "SharePoint auth failed: rtFa / FedAuth cookies not returned",
    )
  }

  return `rtFa=${rtFa}; FedAuth=${fedAuth}`
}

/**
 * WebDAV HTTP Client
 */
export class WebdavClient {
  private address: string
  private username: string
  private password: string
  private isSharepoint: boolean
  private sharepointCookie: string = ""
  private digestParts: DigestParts | null = null
  private ncCount: number = 0

  constructor(addition: WebdavAddition) {
    this.address = addition.address.replace(/\/+$/, "")
    this.username = addition.username || ""
    this.password = addition.password || ""
    this.isSharepoint = addition.vendor === "sharepoint"
  }

  async init(): Promise<void> {
    if (this.isSharepoint) {
      this.sharepointCookie = await getSharepointCookie(
        this.username,
        this.password,
        this.address,
      )
    }
  }

  private buildUrl(remotePath: string): string {
    const cleanPath = remotePath.replace(/^\/+/, "")
    if (!cleanPath) return this.address
    return `${this.address}/${pathEscape(cleanPath)}`
  }

  private getAuthHeaders(method: string, uri: string): Record<string, string> {
    const headers: Record<string, string> = {}
    if (this.isSharepoint && this.sharepointCookie) {
      headers["Cookie"] = this.sharepointCookie
    } else if (this.digestParts) {
      this.ncCount++
      headers["Authorization"] = computeDigestAuth(
        this.digestParts,
        this.username,
        this.password,
        method,
        uri,
        this.ncCount,
      )
    } else if (this.username || this.password) {
      const basicToken = btoa(
        unescape(encodeURIComponent(`${this.username}:${this.password}`)),
      )
      headers["Authorization"] = `Basic ${basicToken}`
    }
    return headers
  }

  private async request(
    method: string,
    remotePath: string,
    options: {
      headers?: Record<string, string>
      body?: BodyInit | null
      redirect?: RequestRedirect
    } = {},
  ): Promise<Response> {
    const fullUrl = this.buildUrl(remotePath)
    const urlObj = new URL(fullUrl)
    const uri = urlObj.pathname + urlObj.search

    const authHeaders = this.getAuthHeaders(method, uri)
    const headers = { ...authHeaders, ...(options.headers || {}) }

    let resp = await fetch(fullUrl, {
      method,
      headers,
      body: options.body,
      redirect: options.redirect || "follow",
    })

    // Handle 401 Digest Auth negotiation
    if (resp.status === 401 && !this.isSharepoint) {
      const wwwAuth = resp.headers.get("www-authenticate") || ""
      if (/digest/i.test(wwwAuth)) {
        this.digestParts = parseDigestChallenge(wwwAuth)
        this.ncCount = 1
        const retryAuth = computeDigestAuth(
          this.digestParts,
          this.username,
          this.password,
          method,
          uri,
          this.ncCount,
        )
        const retryHeaders = {
          ...headers,
          Authorization: retryAuth,
        }
        resp = await fetch(fullUrl, {
          method,
          headers: retryHeaders,
          body: options.body,
          redirect: options.redirect || "follow",
        })
      }
    }

    return resp
  }

  /**
   * PROPFIND - List directory contents (Depth: 1)
   */
  async readDir(remotePath: string): Promise<WebdavFile[]> {
    const propfindXml = `<?xml version="1.0" encoding="utf-8" ?>
<d:propfind xmlns:d="DAV:">
  <d:prop>
    <d:displayname/>
    <d:resourcetype/>
    <d:getcontentlength/>
    <d:getcontenttype/>
    <d:getetag/>
    <d:getlastmodified/>
  </d:prop>
</d:propfind>`

    const resp = await this.request("PROPFIND", remotePath, {
      headers: {
        Depth: "1",
        "Content-Type": "application/xml; charset=utf-8",
        Accept: "application/xml, text/xml",
      },
      body: propfindXml,
    })

    if (resp.status === 404) {
      throw new Error(`Directory not found: ${remotePath}`)
    }

    if (resp.status !== 207 && !resp.ok) {
      const errText = await resp.text()
      throw new Error(
        `WebDAV PROPFIND failed with status ${resp.status}: ${errText || resp.statusText}`,
      )
    }

    const xml = await resp.text()
    const { items } = parseMultistatusXml(xml, remotePath)
    return items
  }

  /**
   * PROPFIND - Stat single file or directory (Depth: 0)
   */
  async stat(remotePath: string): Promise<WebdavFile> {
    const propfindXml = `<?xml version="1.0" encoding="utf-8" ?>
<d:propfind xmlns:d="DAV:">
  <d:prop>
    <d:displayname/>
    <d:resourcetype/>
    <d:getcontentlength/>
    <d:getcontenttype/>
    <d:getetag/>
    <d:getlastmodified/>
  </d:prop>
</d:propfind>`

    const resp = await this.request("PROPFIND", remotePath, {
      headers: {
        Depth: "0",
        "Content-Type": "application/xml; charset=utf-8",
        Accept: "application/xml, text/xml",
      },
      body: propfindXml,
    })

    if (resp.status === 404) {
      throw new Error(`Object not found: ${remotePath}`)
    }

    if (resp.status !== 207 && !resp.ok) {
      const errText = await resp.text()
      throw new Error(
        `WebDAV PROPFIND failed with status ${resp.status}: ${errText || resp.statusText}`,
      )
    }

    const xml = await resp.text()
    const { self, items } = parseMultistatusXml(xml, remotePath)
    const result = self || items[0]
    if (!result) {
      throw new Error(`Object not found in PROPFIND response: ${remotePath}`)
    }
    return result
  }

  /**
   * MKCOL - Create directory
   */
  async mkdir(remotePath: string): Promise<void> {
    const resp = await this.request("MKCOL", remotePath)
    if (resp.status === 201 || resp.status === 405) {
      return
    }
    throw new Error(`WebDAV MKCOL failed with status ${resp.status}`)
  }

  /**
   * Recursive directory creation (mkdir -p)
   */
  async mkdirAll(remotePath: string): Promise<void> {
    const resp = await this.request("MKCOL", remotePath)
    if (resp.status === 201 || resp.status === 405) {
      return
    }
    if (resp.status === 409) {
      const parts = remotePath.split("/").filter(Boolean)
      let current = ""
      for (const part of parts) {
        current += "/" + part
        const subResp = await this.request("MKCOL", current)
        if (subResp.status !== 201 && subResp.status !== 405) {
          throw new Error(
            `WebDAV MkdirAll failed at ${current} with status ${subResp.status}`,
          )
        }
      }
      return
    }
    throw new Error(`WebDAV MkdirAll failed with status ${resp.status}`)
  }

  /**
   * MOVE - Move / Rename
   */
  async move(
    oldPath: string,
    newPath: string,
    overwrite: boolean = true,
  ): Promise<void> {
    const destUrl = this.buildUrl(newPath)
    const resp = await this.request("MOVE", oldPath, {
      headers: {
        Destination: destUrl,
        Overwrite: overwrite ? "T" : "F",
      },
    })
    if (resp.status === 201 || resp.status === 204) {
      return
    }
    if (resp.status === 409) {
      const parentDir = newPath.substring(0, newPath.lastIndexOf("/"))
      if (parentDir) {
        await this.mkdirAll(parentDir)
        return this.move(oldPath, newPath, overwrite)
      }
    }
    throw new Error(`WebDAV MOVE failed with status ${resp.status}`)
  }

  /**
   * COPY - Copy
   */
  async copy(
    oldPath: string,
    newPath: string,
    overwrite: boolean = true,
  ): Promise<void> {
    const destUrl = this.buildUrl(newPath)
    const resp = await this.request("COPY", oldPath, {
      headers: {
        Destination: destUrl,
        Overwrite: overwrite ? "T" : "F",
      },
    })
    if (resp.status === 201 || resp.status === 204) {
      return
    }
    if (resp.status === 409) {
      const parentDir = newPath.substring(0, newPath.lastIndexOf("/"))
      if (parentDir) {
        await this.mkdirAll(parentDir)
        return this.copy(oldPath, newPath, overwrite)
      }
    }
    throw new Error(`WebDAV COPY failed with status ${resp.status}`)
  }

  /**
   * DELETE - Remove file or directory
   */
  async remove(remotePath: string): Promise<void> {
    const resp = await this.request("DELETE", remotePath)
    if (resp.status === 200 || resp.status === 204 || resp.status === 404) {
      return
    }
    throw new Error(`WebDAV DELETE failed with status ${resp.status}`)
  }

  /**
   * PUT - Upload file
   */
  async put(
    remotePath: string,
    content: ArrayBuffer | Uint8Array | string | Blob,
    contentType?: string,
  ): Promise<void> {
    const headers: Record<string, string> = {}
    if (contentType) {
      headers["Content-Type"] = contentType
    }

    let resp = await this.request("PUT", remotePath, {
      headers,
      body: content as BodyInit,
    })

    if (resp.status === 200 || resp.status === 201 || resp.status === 204) {
      return
    }

    if (resp.status === 409) {
      const parentDir = remotePath.substring(0, remotePath.lastIndexOf("/"))
      if (parentDir) {
        await this.mkdirAll(parentDir)
        resp = await this.request("PUT", remotePath, {
          headers,
          body: content as BodyInit,
        })
        if (resp.status === 200 || resp.status === 201 || resp.status === 204) {
          return
        }
      }
    }

    throw new Error(`WebDAV PUT failed with status ${resp.status}`)
  }

  /**
   * Get direct download link & auth headers
   */
  getLink(remotePath: string): WebdavLinkResult {
    const fullUrl = this.buildUrl(remotePath)
    const urlObj = new URL(fullUrl)
    const uri = urlObj.pathname + urlObj.search
    const headers = this.getAuthHeaders("GET", uri)
    return {
      url: fullUrl,
      headers,
    }
  }
}
