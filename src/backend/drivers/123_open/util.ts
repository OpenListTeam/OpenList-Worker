// 123云盘开放平台 API 客户端
import {
  Driver123OpenAddition,
  File123,
  Resp123,
  FileListData123,
  DownloadInfoData123,
  AccessTokenData123,
} from "./types"

const API = "https://open-api.123pan.com"

export class Client123Open {
  private addition: Driver123OpenAddition
  private accessToken = ""

  constructor(addition: Driver123OpenAddition) {
    this.addition = addition
    this.accessToken = addition.access_token || ""
  }

  async init(): Promise<void> {
    if (!this.accessToken) {
      await this.getAccessToken()
    }
  }

  private async getAccessToken(): Promise<void> {
    // 1. 在线 API 刷新 refresh_token
    if (
      this.addition.use_online_api !== false &&
      this.addition.refresh_token &&
      this.addition.api_url_address
    ) {
      const qs = new URLSearchParams({
        refresh_ui: this.addition.refresh_token,
        server_use: "true",
        driver_txt: "123cloud_oa",
      })
      const resp = await fetch(`${this.addition.api_url_address}?${qs.toString()}`)
      const data: any = await resp.json().catch(() => ({}))
      if (data.access_token && data.refresh_token) {
        this.accessToken = data.access_token
        this.addition.access_token = data.access_token
        this.addition.refresh_token = data.refresh_token
        return
      }
      const err = data.error_description || data.text || data.message || data.error
      if (err) throw new Error(`[123Open] ${err}`)
    }
    // 2. client_id + client_secret
    if (this.addition.client_id && this.addition.client_secret) {
      const resp = await fetch(`${API}/api/v1/access_token`, {
        method: "POST",
        headers: { platform: "open_platform", "Content-Type": "application/json" },
        body: JSON.stringify({
          clientID: this.addition.client_id,
          clientSecret: this.addition.client_secret,
        }),
      })
      const data: Resp123 & { data?: AccessTokenData123 } = await resp.json().catch(() => ({ code: -1 } as any))
      if (data.code !== 0) throw new Error(`[123Open] ${data.message}`)
      if (!data.data?.access_token) throw new Error("[123Open] empty access token")
      this.accessToken = data.data.access_token
      this.addition.access_token = this.accessToken
      return
    }
    throw new Error("[123Open] no valid authentication method (access_token / refresh_token / client_id+client_secret)")
  }

  private async request<T = any>(
    url: string,
    method: string,
    body?: any,
  ): Promise<Resp123 & { data?: T }> {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.accessToken}`,
      platform: "open_platform",
      "Content-Type": "application/json",
    }
    const options: RequestInit = { method, headers }
    if (body !== undefined) options.body = JSON.stringify(body)
    const resp = await fetch(url, options)
    const data: Resp123 = await resp.json().catch(() => ({ code: -1 } as any))
    if (data.code === 401) {
      await this.getAccessToken()
      return this.request<T>(url, method, body)
    }
    return data as Resp123 & { data?: T }
  }

  async getFiles(parentFileId: string): Promise<File123[]> {
    const all: File123[] = []
    let lastFileId = 0
    do {
      const qs = new URLSearchParams({
        parentFileId,
        limit: "100",
        lastFileId: String(lastFileId),
        trashed: "false",
        searchMode: "",
        searchData: "",
      })
      const resp = await this.request<FileListData123>(`${API}/api/v2/file/list?${qs.toString()}`, "GET")
      if (resp.code !== 0) throw new Error(`[123Open] ${resp.message}`)
      const data = resp.data as FileListData123
      const list = (data.file_list || []).filter((f) => (f.trashed ?? 0) === 0)
      all.push(...list)
      lastFileId = data.last_file_id ?? -1
    } while (lastFileId !== -1)
    return all
  }

  async getDownloadUrl(fileId: number): Promise<string> {
    const qs = new URLSearchParams({ fileId: String(fileId) })
    const resp = await this.request<DownloadInfoData123>(`${API}/api/v1/file/download_info?${qs.toString()}`, "GET")
    if (resp.code !== 0) throw new Error(`[123Open] ${resp.message}`)
    const url = resp.data?.download_url || ""
    if (!url) throw new Error("[123Open] empty download url")
    return url
  }

  async mkdir(parentId: string, name: string): Promise<void> {
    const resp = await this.request(`${API}/upload/v1/file/mkdir`, "POST", { parentID: parentId, name })
    if (resp.code !== 0) throw new Error(`[123Open] ${resp.message}`)
  }

  async move(fileId: number, toParentFileId: string): Promise<void> {
    const resp = await this.request(`${API}/api/v1/file/move`, "POST", {
      fileIDs: [fileId],
      toParentFileID: toParentFileId,
    })
    if (resp.code !== 0) throw new Error(`[123Open] ${resp.message}`)
  }

  async rename(fileId: number, fileName: string): Promise<void> {
    const resp = await this.request(`${API}/api/v1/file/name`, "PUT", { fileId, fileName })
    if (resp.code !== 0) throw new Error(`[123Open] ${resp.message}`)
  }

  async remove(fileId: number): Promise<void> {
    const resp = await this.request(`${API}/api/v1/file/trash`, "POST", { fileIDs: [fileId] })
    if (resp.code !== 0) throw new Error(`[123Open] ${resp.message}`)
  }
}
