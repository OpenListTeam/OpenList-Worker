// TelDrive API 客户端
import { DriverTeldriveAddition, TeldriveFile } from "./types"

export class ClientTeldrive {
  private url: string
  private token: string

  constructor(addition: DriverTeldriveAddition) {
    this.url = (addition.url || "").replace(/\/+$/, "")
    this.token = addition.access_token || ""
  }

  async init(): Promise<void> {
    if (!this.url) throw new Error("[TelDrive] url is required")
    if (!this.token) throw new Error("[TelDrive] access_token is required")
  }

  private async request<T = any>(
    endpoint: string,
    method = "GET",
    body?: any,
  ): Promise<T> {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.token}`,
      "Content-Type": "application/json",
    }
    const options: RequestInit = { method, headers }
    if (body) options.body = JSON.stringify(body)
    const resp = await fetch(`${this.url}${endpoint}`, options)
    if (method === "DELETE" && resp.ok) return {} as T
    const data: any = await resp.json().catch(() => ({}))
    if (resp.status >= 400) {
      throw new Error(`[TelDrive] ${data?.message || `HTTP ${resp.status}`}`)
    }
    return data as T
  }

  async listFiles(path: string): Promise<TeldriveFile[]> {
    const resp = await this.request<any>(
      `/api/files?path=${encodeURIComponent(path)}`,
    )
    if (Array.isArray(resp)) return resp
    return resp?.files || []
  }

  async mkdir(path: string): Promise<void> {
    await this.request("/api/files/mkdir", "POST", { path })
  }

  async move(ids: string[], destination: string): Promise<void> {
    await this.request("/api/files/move", "POST", { ids, destination })
  }

  async remove(id: string): Promise<void> {
    await this.request(`/api/files/${id}`, "DELETE")
  }

  downloadUrl(id: string): string {
    return `${this.url}/api/files/${id}`
  }

  downloadHeaders(): Record<string, string> {
    return { Authorization: `Bearer ${this.token}` }
  }
}
