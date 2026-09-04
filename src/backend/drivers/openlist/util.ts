// OpenList（对端实例）API 客户端
import { DriverOpenlistAddition, OLFile, OLResp, OLListData, OLGetData } from "./types"

export class ClientOpenlist {
  private url: string
  private addition: DriverOpenlistAddition
  private token = ""

  constructor(addition: DriverOpenlistAddition) {
    this.addition = addition
    this.url = (addition.url || "").replace(/\/+$/, "")
    this.token = addition.token || ""
  }

  async init(): Promise<void> {
    if (!this.url) throw new Error("[OpenList] url is required")
    if (this.addition.username && this.addition.password) {
      await this.login()
    }
  }

  private async login(): Promise<void> {
    const resp = await fetch(`${this.url}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: this.addition.username,
        password: this.addition.password,
      }),
    })
    const data: any = await resp.json().catch(() => ({}))
    if (data?.data?.token) {
      this.token = data.data.token
    } else {
      throw new Error("[OpenList] login failed")
    }
  }

  private async request<T = any>(
    endpoint: string,
    method = "POST",
    body?: any,
  ): Promise<OLResp<T>> {
    const headers: Record<string, string> = { "Content-Type": "application/json" }
    if (this.token) headers["Authorization"] = this.token
    if (this.addition.meta_password) headers["Meta-Password"] = this.addition.meta_password
    const options: RequestInit = { method, headers }
    if (body) options.body = JSON.stringify(body)
    const resp = await fetch(`${this.url}${endpoint}`, options)
    return (await resp.json()) as OLResp<T>
  }

  async list(path: string): Promise<OLFile[]> {
    const resp = await this.request<OLListData>("/api/fs/list", "POST", {
      path,
      page: 1,
      per_page: 0,
    })
    if (resp.code !== 200) throw new Error(`[OpenList] ${resp.message}`)
    return resp.data?.content || []
  }

  async get(path: string): Promise<OLGetData> {
    const resp = await this.request<OLGetData>("/api/fs/get", "POST", { path })
    if (resp.code !== 200) throw new Error(`[OpenList] ${resp.message}`)
    return resp.data
  }

  async mkdir(path: string): Promise<void> {
    const resp = await this.request("/api/fs/mkdir", "POST", { path })
    if (resp.code !== 200) throw new Error(`[OpenList] ${resp.message}`)
  }

  async rename(path: string, name: string): Promise<void> {
    const resp = await this.request("/api/fs/rename", "POST", { path, name })
    if (resp.code !== 200) throw new Error(`[OpenList] ${resp.message}`)
  }

  async move(srcDir: string, dstDir: string, names: string[]): Promise<void> {
    const resp = await this.request("/api/fs/move", "POST", {
      src_dir: srcDir,
      dst_dir: dstDir,
      names,
    })
    if (resp.code !== 200) throw new Error(`[OpenList] ${resp.message}`)
  }

  async copy(srcDir: string, dstDir: string, names: string[]): Promise<void> {
    const resp = await this.request("/api/fs/copy", "POST", {
      src_dir: srcDir,
      dst_dir: dstDir,
      names,
    })
    if (resp.code !== 200) throw new Error(`[OpenList] ${resp.message}`)
  }

  async remove(dir: string, names: string[]): Promise<void> {
    const resp = await this.request("/api/fs/remove", "POST", { dir, names })
    if (resp.code !== 200) throw new Error(`[OpenList] ${resp.message}`)
  }
}
