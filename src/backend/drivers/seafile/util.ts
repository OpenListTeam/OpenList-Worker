import {
  SeafileAddition,
  SeafileAuthTokenResp,
  SeafileLibraryItem,
} from "./types"

export class SeafileApiClient {
  private addition: SeafileAddition
  private address: string
  private authorization: string = ""
  private onTokenRefreshed?: (token: string) => Promise<void>
  private decryptedRepos: Map<string, number> = new Map() // repoId -> decrypted timestamp

  constructor(
    addition: SeafileAddition,
    onTokenRefreshed?: (token: string) => Promise<void>,
  ) {
    this.addition = addition
    this.address = (addition.address || "").replace(/\/+$/, "")
    this.onTokenRefreshed = onTokenRefreshed
    if (addition.token) {
      this.authorization = `Token ${addition.token}`
    }
  }

  async getToken(): Promise<void> {
    if (this.addition.token) {
      this.authorization = `Token ${this.addition.token}`
      return
    }

    if (!this.addition.username || !this.addition.password) {
      throw new Error(
        "Seafile requires either token or username/password to authenticate",
      )
    }

    const form = new URLSearchParams()
    form.set("username", this.addition.username)
    form.set("password", this.addition.password)

    const res = await fetch(`${this.address}/api2/auth-token/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: form.toString(),
    })

    if (!res.ok) {
      const errText = await res.text()
      throw new Error(`Seafile auth failed (${res.status}): ${errText}`)
    }

    const data: SeafileAuthTokenResp = await res.json()
    this.authorization = `Token ${data.token}`
    this.addition.token = data.token

    if (this.onTokenRefreshed) {
      await this.onTokenRefreshed(data.token)
    }
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
      : `${this.address}${pathOrUrl}`
    if (params && Object.keys(params).length > 0) {
      const q = new URLSearchParams(params).toString()
      fullUrl += (fullUrl.includes("?") ? "&" : "?") + q
    }

    const headers: Record<string, string> = {
      Accept: "application/json",
    }
    if (this.authorization) {
      headers["Authorization"] = this.authorization
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

    if (res.status === 401 && retryCount < 1) {
      await this.getToken()
      return this.request<T>(pathOrUrl, {
        ...options,
        retryCount: retryCount + 1,
      })
    }

    if (!res.ok) {
      const errText = await res.text()
      throw new Error(`Seafile request failed (${res.status}): ${errText}`)
    }

    const contentType = res.headers.get("content-type") || ""
    if (contentType.includes("application/json")) {
      return (await res.json()) as T
    }
    const text = await res.text()
    return text as unknown as T
  }

  async getLibraryInfo(repoId: string): Promise<SeafileLibraryItem> {
    return this.request<SeafileLibraryItem>(`/api2/repos/${repoId}/`)
  }

  async decryptLibrary(repo: SeafileLibraryItem): Promise<void> {
    if (!repo.encrypted) return
    if (!this.addition.repo_pwd) {
      throw new Error(
        "Seafile encrypted library password (repo_pwd) is not configured",
      )
    }

    const lastDecrypted = this.decryptedRepos.get(repo.id) || 0
    if (Date.now() - lastDecrypted < 30 * 60 * 1000) {
      return
    }

    const resText = await this.request<string>(`/api2/repos/${repo.id}/`, {
      method: "POST",
      isFormData: true,
      body: {
        password: this.addition.repo_pwd,
      },
    })

    if (typeof resText === "string" && !resText.includes("success")) {
      throw new Error(`Failed to decrypt Seafile library: ${resText}`)
    }

    this.decryptedRepos.set(repo.id, Date.now())
  }
}
