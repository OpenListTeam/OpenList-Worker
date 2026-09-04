// 115 Open API 客户端
import { Driver115Addition, Cloud115File, Cloud115ListResp, Cloud115UserInfoResp, Cloud115DownResp } from "./types"

const API_BASE = "https://proapi.115.com/open"
const PASSPORT_BASE = "https://passportapi.115.com"
const UA = "Mozilla/5.0 115disk/42.0.0.2"

export class Client115 {
  private accessToken: string
  private refreshToken: string
  private addition: Driver115Addition
  private rootId: string

  constructor(addition: Driver115Addition) {
    this.addition = addition
    this.accessToken = addition.access_token || ""
    this.refreshToken = addition.refresh_token || ""
    this.rootId = addition.root_folder_id || "0"
  }

  getRootFolderId(): string {
    return this.rootId
  }

  async init(): Promise<void> {
    if (!this.accessToken) {
      throw new Error("[115] access_token is required")
    }
    await this.getUserInfo()
  }

  private async request<T = any>(
    path: string,
    body: Record<string, any> = {},
    base: string = API_BASE,
  ): Promise<T> {
    const url = `${base}${path}`
    const resp = await fetch(url, {
      method: "POST",
      headers: {
        "User-Agent": UA,
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.accessToken}`,
      },
      body: JSON.stringify(body),
    })
    const data: any = await resp.json().catch(() => ({}))
    if (data?.state === false || data?.errno) {
      // token 过期尝试刷新
      if (data.errno === 990001 || data.errcode === 990001 || data.errno === 10008) {
        await this.refreshToken()
        return this.request<T>(path, body, base)
      }
      throw new Error(`[115] ${data.error || data.errmsg || "API error"} (${data.errno || data.errcode || ""})`)
    }
    return data as T
  }

  async getUserInfo(): Promise<Cloud115UserInfoResp> {
    return this.request<Cloud115UserInfoResp>("/user/info", {}, PASSPORT_BASE)
  }

  async refreshToken(): Promise<void> {
    const url = `${API_BASE}/oauth2/token`
    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "User-Agent": UA },
      body: JSON.stringify({ grant_type: "refresh_token", refresh_token: this.refreshToken }),
    })
    const data: any = await resp.json().catch(() => ({}))
    if (data?.access_token) {
      this.accessToken = data.access_token
      this.addition.access_token = data.access_token
      if (data.refresh_token) {
        this.refreshToken = data.refresh_token
        this.addition.refresh_token = data.refresh_token
      }
    } else {
      throw new Error(`[115] refresh token failed: ${JSON.stringify(data)}`)
    }
  }

  async getFiles(cid: string): Promise<Cloud115File[]> {
    const resp = await this.request<Cloud115ListResp>("/open/ufile/files", {
      cid,
      limit: 1000,
      offset: 0,
      order: this.addition.order_by || "user_utime",
      asc: this.addition.order_direction === "asc" ? 1 : 0,
      show_dir: 1,
      fc_mix: 1,
    })
    if (resp?.data && Array.isArray(resp.data)) return resp.data
    // 旧格式（小写字段）兼容
    if (resp?.files && Array.isArray(resp.files)) {
      return resp.files.map((f: any) => ({
        Fid: f.fid ?? f.id,
        Fn: f.n ?? f.file_name ?? f.name,
        Fc: String(f.fc ?? f.category ?? (f.pid !== undefined && !f.pid ? "0" : "1")),
        FS: Number(f.s ?? f.size ?? 0),
        Sha1: f.sha1,
        Pc: f.pc ?? f.pick_code,
        Thumbnail: f.thumb ?? f.thumbnail,
        Upt: f.tu ?? f.upt ?? f.updated_at,
        Pid: f.pid ?? f.cid,
      }))
    }
    return []
  }

  /** 通过路径逐级解析文件夹 ID（带缓存由 driver 层管理） */
  async resolvePathId(
    path: string,
    cache: Map<string, string>,
  ): Promise<string> {
    const clean = path.split("/").filter(Boolean).join("/")
    if (!clean) return this.rootId
    if (cache.has(clean)) return cache.get(clean)!

    const parts = clean.split("/")
    let currentId = this.rootId
    for (let i = 0; i < parts.length; i++) {
      const rawPart = parts[i]
      const decoded = (() => {
        try {
          return decodeURIComponent(rawPart)
        } catch {
          return rawPart
        }
      })()
      const files = await this.getFiles(currentId)
      const target = files.find(
        (f) => f.Fn === rawPart || f.Fn === decoded || f.Fid === rawPart,
      )
      if (!target) {
        throw new Error(`[115] Path '${rawPart}' not found in '${currentId}'`)
      }
      currentId = target.Fid
      const subPath = "/" + parts.slice(0, i + 1).join("/")
      cache.set(subPath, currentId)
    }
    return currentId
  }

  async mkdir(pid: string, name: string): Promise<void> {
    await this.request("/open/ufile/add", { pid, cname: name })
  }

  async rename(fid: string, name: string): Promise<void> {
    await this.request("/open/ufile/edit", { fid, fname: name })
  }

  async move(pid: string, fids: string[]): Promise<void> {
    await this.request("/open/ufile/move", { pid, fid: fids, no_dupli: "1" })
  }

  async copy(pid: string, fids: string[]): Promise<void> {
    await this.request("/open/ufile/copy", { pid, fid: fids, no_dupli: "1" })
  }

  async remove(fids: string[]): Promise<void> {
    await this.request("/open/ufile/delete", { fid: fids, ignore_warn: 1 })
  }

  async getDownloadUrl(pickCode: string): Promise<string> {
    const resp = await this.request<Cloud115DownResp>("/open/ufile/downurl", {
      pickcode: pickCode,
    })
    const url = resp?.url || resp?.data?.url || ""
    if (!url) throw new Error("[115] empty download url")
    return url
  }
}
