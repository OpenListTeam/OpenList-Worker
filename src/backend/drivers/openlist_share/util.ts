// OpenList 分享链接 API 客户端
import {
  DriverOpenlistShareAddition,
  OLShareResp,
  OLShareFile,
  OLShareListData,
} from "./types"

export class ClientOpenlistShare {
  private url: string
  private sid: string
  private pwd: string

  constructor(addition: DriverOpenlistShareAddition) {
    this.url = (addition.url || "").replace(/\/+$/, "")
    this.sid = addition.sid || ""
    this.pwd = addition.pwd || ""
  }

  init(): void {
    if (!this.url) throw new Error("[OpenListShare] url is required")
    if (!this.sid) throw new Error("[OpenListShare] sid is required")
  }

  private async request<T = any>(
    endpoint: string,
    method = "POST",
    body?: any,
  ): Promise<OLShareResp<T>> {
    const resp = await fetch(`${this.url}${endpoint}`, {
      method,
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    })
    return (await resp.json()) as OLShareResp<T>
  }

  /** 驱动物理路径 → 分享路径（/@s/{sid} + path） */
  private sharePath(path: string): string {
    return "/@s/" + this.sid + (path === "/" ? "" : path)
  }

  async list(path: string): Promise<OLShareFile[]> {
    const resp = await this.request<OLShareListData>("/api/fs/list", "POST", {
      path: this.sharePath(path),
      password: this.pwd,
      refresh: false,
      page: 1,
      per_page: 0,
    })
    if (resp.code !== 200) throw new Error(`[OpenListShare] ${resp.message}`)
    return resp.data?.content || []
  }

  downloadUrl(path: string): string {
    const fullPath = "/" + this.sid + path
    return `${this.url}/sd${fullPath}?pwd=${encodeURIComponent(this.pwd)}`
  }
}
