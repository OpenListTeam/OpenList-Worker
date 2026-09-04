// Cloudreve V4 API 客户端
import { DriverCloudreveAddition, CloudreveFile, CloudreveListResp, CloudreveUrlResp } from "./types"

export class ClientCloudreve {
  private address: string
  private addition: DriverCloudreveAddition
  private accessToken = ""

  constructor(addition: DriverCloudreveAddition) {
    this.addition = addition
    this.address = (addition.address || "").replace(/\/+$/, "")
    this.accessToken = addition.access_token || ""
  }

  async init(): Promise<void> {
    if (!this.address) throw new Error("[Cloudreve] address is required")
    if (this.addition.username && this.addition.password) {
      await this.login()
    } else if (this.addition.refresh_token) {
      await this.refreshToken()
    }
  }

  private async login(): Promise<void> {
    const resp = await fetch(`${this.address}/api/v4/session`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: this.addition.username,
        password: this.addition.password,
      }),
    })
    const data: any = await resp.json().catch(() => ({}))
    if (data?.token) {
      this.accessToken = data.token
      if (data.refresh_token) this.addition.refresh_token = data.refresh_token
    } else {
      throw new Error("[Cloudreve] login failed")
    }
  }

  private async refreshToken(): Promise<void> {
    const resp = await fetch(`${this.address}/api/v4/session/renew`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.addition.refresh_token}`,
      },
    })
    const data: any = await resp.json().catch(() => ({}))
    if (data?.token) this.accessToken = data.token
  }

  private async request<T = any>(
    method: string,
    endpoint: string,
    body?: any,
    retry = false,
  ): Promise<T> {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.accessToken}`,
      "Content-Type": "application/json",
    }
    if (this.addition.custom_ua) headers["User-Agent"] = this.addition.custom_ua
    const options: RequestInit = { method, headers }
    if (body) options.body = JSON.stringify(body)
    const resp = await fetch(`${this.address}/api/v4${endpoint}`, options)
    if (resp.status === 401 && !retry) {
      if (this.addition.refresh_token) await this.refreshToken()
      else if (this.addition.username) await this.login()
      return this.request<T>(method, endpoint, body, true)
    }
    if (method === "DELETE" && resp.ok) return {} as T
    const data: any = await resp.json().catch(() => ({}))
    if (resp.status >= 400) {
      throw new Error(`[Cloudreve] ${data?.msg || data?.message || `HTTP ${resp.status}`}`)
    }
    return data as T
  }

  async listFiles(uri: string): Promise<CloudreveFile[]> {
    const all: CloudreveFile[] = []
    let nextToken = ""
    const cleanUri = uri === "/" ? "/" : uri
    do {
      const params: Record<string, string> = {
        page_size: "100",
        uri: cleanUri,
        order_by: this.addition.order_by || "name",
        order_direction: this.addition.order_direction || "asc",
        page: "0",
      }
      if (nextToken) params.next_page_token = nextToken
      const qs = new URLSearchParams(params).toString()
      const resp = await this.request<CloudreveListResp>("GET", `/file?${qs}`)
      if (resp?.files) all.push(...resp.files)
      nextToken = resp?.pagination?.next_token || ""
    } while (nextToken)
    return all
  }

  async getDownloadUrl(uri: string): Promise<string> {
    const resp = await this.request<CloudreveUrlResp>("POST", "/file/url", {
      uris: [uri],
      download: true,
    })
    const url = resp?.urls?.[0]?.url || ""
    if (!url) throw new Error("[Cloudreve] empty download url")
    return url
  }

  async mkdir(parentUri: string, name: string): Promise<void> {
    const uri = `${parentUri.replace(/\/+$/, "")}/${name}`
    await this.request("POST", "/file/create", {
      type: "folder",
      uri,
      error_on_conflict: true,
    })
  }

  async rename(uri: string, newName: string): Promise<void> {
    const idx = uri.lastIndexOf("/")
    const parent = idx >= 0 ? uri.slice(0, idx + 1) : "/"
    const newUri = `${parent}${newName}`
    await this.request("POST", "/file/rename", { uris: [uri], new_uri: newUri })
  }

  async move(uris: string[], dst: string, copy: boolean): Promise<void> {
    await this.request("POST", "/file/move", { uris, dst, copy })
  }

  async remove(uris: string[]): Promise<void> {
    await this.request("DELETE", "/file", {
      uris,
      unlink: false,
      skip_soft_delete: true,
    })
  }
}
