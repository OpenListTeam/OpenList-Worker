import {
  YandexAddition,
  YandexDownloadResp,
  YandexFile,
  YandexFilesResp,
  YandexTokenResp,
  YandexUploadResp,
} from "./types"

export class YandexApiClient {
  private addition: YandexAddition
  private accessToken: string = ""
  private refreshTokenVal: string = ""
  private onTokenRefreshed?: (tokens: {
    accessToken: string
    refreshToken: string
  }) => Promise<void>

  constructor(
    addition: YandexAddition,
    onTokenRefreshed?: (tokens: {
      accessToken: string
      refreshToken: string
    }) => Promise<void>,
  ) {
    this.addition = addition
    this.refreshTokenVal = addition.refresh_token || ""
    this.onTokenRefreshed = onTokenRefreshed
  }

  async refreshToken(): Promise<void> {
    if (this.addition.use_online_api !== false) {
      const apiUrl =
        this.addition.api_url_address ||
        "https://api.oplist.org/yandexui/renewapi"
      const url = `${apiUrl}?refresh_ui=${encodeURIComponent(this.refreshTokenVal)}&server_use=true&driver_txt=yandexui_go`

      const res = await fetch(url, {
        method: "GET",
        headers: { Accept: "application/json" },
      })

      if (!res.ok) {
        throw new Error(
          `Failed to refresh Yandex token online: ${res.statusText}`,
        )
      }

      const data = await res.json()
      if (!data.access_token) {
        throw new Error(
          `Yandex online token refresh failed: ${data.text || "No access token returned"}`,
        )
      }

      this.accessToken = data.access_token
      if (data.refresh_token) {
        this.refreshTokenVal = data.refresh_token
        this.addition.refresh_token = data.refresh_token
      }

      if (this.onTokenRefreshed) {
        await this.onTokenRefreshed({
          accessToken: this.accessToken,
          refreshToken: this.refreshTokenVal,
        })
      }
      return
    }

    if (!this.addition.client_id || !this.addition.client_secret) {
      throw new Error(
        "Yandex Disk requires client_id and client_secret when online API is disabled",
      )
    }

    const form = new URLSearchParams()
    form.set("grant_type", "refresh_token")
    form.set("refresh_token", this.refreshTokenVal)
    form.set("client_id", this.addition.client_id)
    form.set("client_secret", this.addition.client_secret)

    const res = await fetch("https://oauth.yandex.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: form.toString(),
    })

    if (!res.ok) {
      const err = await res.text()
      throw new Error(`Yandex OAuth refresh failed (${res.status}): ${err}`)
    }

    const data: YandexTokenResp = await res.json()
    this.accessToken = data.access_token
    this.refreshTokenVal = data.refresh_token
    this.addition.refresh_token = data.refresh_token

    if (this.onTokenRefreshed) {
      await this.onTokenRefreshed({
        accessToken: this.accessToken,
        refreshToken: this.refreshTokenVal,
      })
    }
  }

  async init(): Promise<void> {
    await this.refreshToken()
  }

  async request<T = any>(
    pathOrUrl: string,
    options: {
      method?: string
      params?: Record<string, string>
      body?: any
      retryCount?: number
    } = {},
  ): Promise<T> {
    const { method = "GET", params, body, retryCount = 0 } = options

    let fullUrl = pathOrUrl.startsWith("http")
      ? pathOrUrl
      : `https://cloud-api.yandex.net/v1/disk/resources${pathOrUrl}`

    if (params && Object.keys(params).length > 0) {
      const q = new URLSearchParams(params).toString()
      fullUrl += (fullUrl.includes("?") ? "&" : "?") + q
    }

    const headers: Record<string, string> = {
      Accept: "application/json",
      Authorization: `OAuth ${this.accessToken}`,
    }
    if (body && typeof body === "object" && !(body instanceof Uint8Array)) {
      headers["Content-Type"] = "application/json"
    }

    const res = await fetch(fullUrl, {
      method,
      headers,
      body:
        body && typeof body === "object" && !(body instanceof Uint8Array)
          ? JSON.stringify(body)
          : body,
    })

    if (res.status === 401 && retryCount < 1) {
      await this.refreshToken()
      return this.request<T>(pathOrUrl, {
        ...options,
        retryCount: retryCount + 1,
      })
    }

    if (!res.ok) {
      const errText = await res.text()
      let msg = errText
      try {
        const errJson = JSON.parse(errText)
        msg = errJson.message || errJson.description || errText
      } catch {}
      throw new Error(`Yandex Disk API Error (${res.status}): ${msg}`)
    }

    const contentType = res.headers.get("content-type") || ""
    if (contentType.includes("application/json")) {
      return (await res.json()) as T
    }
    return (await res.text()) as unknown as T
  }

  async getFiles(
    path: string,
    orderBy?: string,
    orderDirection?: string,
  ): Promise<YandexFile[]> {
    const limit = 100
    let offset = 0
    const allFiles: YandexFile[] = []

    while (true) {
      const params: Record<string, string> = {
        path: path || "/",
        limit: String(limit),
        offset: String(offset),
      }
      if (orderBy) {
        params.sort = orderDirection === "desc" ? `-${orderBy}` : orderBy
      }

      const res: YandexFilesResp = await this.request("", {
        method: "GET",
        params,
      })

      const embedded = res._embedded
      if (!embedded || !embedded.items) break

      allFiles.push(...embedded.items)
      if (embedded.total <= offset + limit || embedded.items.length === 0) {
        break
      }
      offset += limit
    }

    return allFiles
  }

  async getDownloadLink(path: string): Promise<string> {
    const res: YandexDownloadResp = await this.request("/download", {
      method: "GET",
      params: { path },
    })
    return res.href
  }

  async getUploadLink(path: string): Promise<string> {
    const res: YandexUploadResp = await this.request("/upload", {
      method: "GET",
      params: { path, overwrite: "true" },
    })
    return res.href
  }
}
