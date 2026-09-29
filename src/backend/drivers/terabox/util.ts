import {
  TeraboxAddition,
  TeraboxCheckLoginResp,
  TeraboxDownloadResp,
  TeraboxDownloadResp2,
  TeraboxHomeInfoResp,
} from "./types"

export function teraboxSign(s1: string, s2: string): string {
  const a = new Array(256)
  const p = new Array(256)
  const o: number[] = []
  const v = s1.length

  for (let q = 0; q < 256; q++) {
    a[q] = s1.charCodeAt(q % v)
    p[q] = q
  }

  let u = 0
  for (let q = 0; q < 256; q++) {
    u = (u + p[q] + a[q]) % 256
    const tmp = p[q]
    p[q] = p[u]
    p[u] = tmp
  }

  let i = 0
  u = 0
  for (let q = 0; q < s2.length; q++) {
    i = (i + 1) % 256
    u = (u + p[i]) % 256
    const tmp = p[i]
    p[i] = p[u]
    p[u] = tmp
    const k = p[(p[i] + p[u]) % 256]
    o.push(s2.charCodeAt(q) ^ k)
  }

  let binary = ""
  for (const b of o) {
    binary += String.fromCharCode(b)
  }
  return btoa(binary)
}

export class TeraboxApiClient {
  private addition: TeraboxAddition
  private baseUrl: string = "https://www.terabox.com"
  private urlDomainPrefix: string = "jp"
  private jsToken: string = ""
  private onCookieRefreshed?: (cookie: string) => Promise<void>

  constructor(
    addition: TeraboxAddition,
    onCookieRefreshed?: (cookie: string) => Promise<void>,
  ) {
    this.addition = addition
    this.onCookieRefreshed = onCookieRefreshed
  }

  async resetJsToken(): Promise<void> {
    const res = await fetch(this.baseUrl, {
      method: "GET",
      headers: {
        Cookie: this.addition.cookie,
        Accept: "application/json, text/plain, */*",
        Referer: this.baseUrl,
        "User-Agent":
          "terabox;1.37.0.7;PC;PC-Windows;10.0.22631;WindowsTeraBox",
        "X-Requested-With": "XMLHttpRequest",
      },
    })

    if (!res.ok) {
      throw new Error(`Failed to fetch TeraBox home page: ${res.statusText}`)
    }

    const html = await res.text()
    const match = html.match(
      /`function%20fn%28a%29%7Bwindow.jsToken%20%3D%20a%7D%3Bfn%28%22([^"]+?)%22%29`/,
    )
    if (match && match[1]) {
      this.jsToken = match[1]
      return
    }

    const simpleMatch = html.match(/jsToken\s*=\s*["']([^"']+)["']/)
    if (simpleMatch && simpleMatch[1]) {
      this.jsToken = simpleMatch[1]
      return
    }

    // Default fallback jsToken if present in cookies or empty
    this.jsToken = ""
  }

  async request<T = any>(
    pathOrUrl: string,
    options: {
      method?: string
      params?: Record<string, string>
      body?: any
      isFormData?: boolean
      retryCount?: number
    } = {},
  ): Promise<T> {
    const {
      method = "GET",
      params,
      body,
      isFormData = false,
      retryCount = 0,
    } = options

    let fullUrl = pathOrUrl.startsWith("http")
      ? pathOrUrl
      : `${this.baseUrl}${pathOrUrl}`

    const queryParams: Record<string, string> = {
      app_id: "250528",
      web: "1",
      channel: "dubox",
      clienttype: "0",
      ...(params || {}),
    }
    if (this.jsToken) {
      queryParams.jsToken = this.jsToken
    }

    const q = new URLSearchParams(queryParams).toString()
    fullUrl += (fullUrl.includes("?") ? "&" : "?") + q

    const headers: Record<string, string> = {
      Cookie: this.addition.cookie,
      Accept: "application/json, text/plain, */*",
      Referer: this.baseUrl,
      "User-Agent": "terabox;1.37.0.7;PC;PC-Windows;10.0.22631;WindowsTeraBox",
      "X-Requested-With": "XMLHttpRequest",
    }

    let requestBody: any = body
    if (isFormData && body && !(body instanceof FormData)) {
      const form = new URLSearchParams()
      for (const [k, v] of Object.entries(body)) {
        form.set(k, String(v))
      }
      headers["Content-Type"] = "application/x-www-form-urlencoded"
      requestBody = form.toString()
    } else if (
      body &&
      typeof body === "object" &&
      !(body instanceof FormData) &&
      !(body instanceof Uint8Array)
    ) {
      headers["Content-Type"] = "application/json"
      requestBody = JSON.stringify(body)
    }

    const res = await fetch(fullUrl, {
      method,
      headers,
      body: requestBody,
    })

    const text = await res.text()
    let data: any = {}
    try {
      data = JSON.parse(text)
    } catch {
      data = text
    }

    if (data && typeof data === "object" && data.errno !== undefined) {
      const errno = Number(data.errno)
      if ((errno === 4000023 || errno === 450016) && retryCount < 2) {
        await this.resetJsToken()
        return this.request<T>(pathOrUrl, {
          ...options,
          retryCount: retryCount + 1,
        })
      }
      if (errno === -6 && retryCount < 2) {
        const prefix = res.headers.get("url-domain-prefix")
        if (prefix) {
          this.urlDomainPrefix = prefix
          this.baseUrl = `https://${prefix}.terabox.com`
          return this.request<T>(pathOrUrl, {
            ...options,
            retryCount: retryCount + 1,
          })
        }
      }
    }

    return data as T
  }

  async init(): Promise<void> {
    const check: TeraboxCheckLoginResp = await this.request(
      "/api/check/login",
      { method: "GET" },
    )
    if (check.errno !== 0) {
      if (check.errno === 9000) {
        throw new Error(
          "TeraBox is not yet available in this area (errno 9000)",
        )
      }
      throw new Error(
        `Failed to verify TeraBox login status according to cookie (errno ${check.errno})`,
      )
    }
  }

  async genSign(): Promise<string> {
    const home: TeraboxHomeInfoResp = await this.request("/api/home/info", {
      method: "GET",
    })
    if (!home.data || !home.data.sign1 || !home.data.sign3) {
      throw new Error("Failed to get TeraBox sign keys from home/info")
    }
    return teraboxSign(home.data.sign3, home.data.sign1)
  }

  async linkOfficial(fsId: string | number): Promise<string> {
    const signString = await this.genSign()
    const params = {
      type: "dlink",
      fidlist: `[${fsId}]`,
      sign: signString,
      vip: "2",
      timestamp: String(Math.floor(Date.now() / 1000)),
    }

    const resp: TeraboxDownloadResp = await this.request("/api/download", {
      method: "GET",
      params,
    })

    if (!resp.dlink || resp.dlink.length === 0) {
      throw new Error(
        `TeraBox fid ${fsId} no dlink found (errno: ${resp.errno})`,
      )
    }

    // Follow first redirect to get direct URL without downloading content
    const dlink = resp.dlink[0].dlink
    const headRes = await fetch(dlink, {
      method: "GET",
      redirect: "manual",
      headers: {
        Cookie: this.addition.cookie,
        "User-Agent":
          "terabox;1.37.0.7;PC;PC-Windows;10.0.22631;WindowsTeraBox",
      },
    })

    const loc = headRes.headers.get("location")
    return loc || dlink
  }

  async linkCrack(path: string): Promise<string> {
    const params = {
      target: JSON.stringify([path]),
      dlink: "1",
      origin: "dlna",
    }

    const resp: TeraboxDownloadResp2 = await this.request("/api/filemetas", {
      method: "GET",
      params,
    })

    if (!resp.info || resp.info.length === 0 || !resp.info[0].dlink) {
      throw new Error(`TeraBox crack download failed for ${path}`)
    }

    return resp.info[0].dlink
  }

  async manage(opera: string, filelist: any): Promise<any> {
    const form = new URLSearchParams()
    form.set("async", "0")
    form.set("filelist", JSON.stringify(filelist))
    form.set("ondup", "newcopy")

    return this.request("/api/filemanager", {
      method: "POST",
      params: {
        onnest: "fail",
        opera,
      },
      isFormData: true,
      body: {
        async: "0",
        filelist: JSON.stringify(filelist),
        ondup: "newcopy",
      },
    })
  }
}
