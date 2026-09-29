// FebBox API 客户端
import {
  DriverFebBoxAddition,
  FebBoxFile,
  FebBoxFileListResp,
  FebBoxFileDownloadResp,
  FebBoxTokenResp,
  FebBoxErrResp,
} from "./types"

export class ClientFebBox {
  private addition: DriverFebBoxAddition
  private accessToken = ""
  private tokenType = "Bearer"
  private persist?: (refreshToken: string) => void | Promise<void>

  constructor(
    addition: DriverFebBoxAddition,
    persist?: (refreshToken: string) => void | Promise<void>,
  ) {
    this.addition = addition
    this.persist = persist
  }

  async init(): Promise<void> {
    if (!this.addition.client_id || !this.addition.client_secret) {
      throw new Error("[FebBox] client_id and client_secret are required")
    }
    await this.refreshToken()
  }

  async refreshToken(): Promise<void> {
    const form = new URLSearchParams()
    if (this.addition.refresh_token) {
      form.set("grant_type", "refresh_token")
      form.set("refresh_token", this.addition.refresh_token)
    } else {
      form.set("grant_type", "client_credentials")
    }
    form.set("client_id", this.addition.client_id)
    form.set("client_secret", this.addition.client_secret)

    const resp = await fetch("https://api.febbox.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form.toString(),
    })
    const data = (await resp.json()) as FebBoxTokenResp
    if (data.code !== 1 || !data.data?.access_token) {
      throw new Error(`[FebBox] token fetch failed: ${data.msg}`)
    }
    this.accessToken = data.data.access_token
    this.tokenType = data.data.token_type || "Bearer"
    if (data.data.refresh_token) {
      this.addition.refresh_token = data.data.refresh_token
      if (this.persist) await this.persist(data.data.refresh_token)
    }
  }

  private async request(params: Record<string, string>): Promise<any> {
    const fd = new FormData()
    for (const [k, v] of Object.entries(params)) {
      fd.append(k, v)
    }
    const resp = await fetch("https://api.febbox.com/oauth", {
      method: "POST",
      headers: { Authorization: `${this.tokenType} ${this.accessToken}` },
      body: fd,
    })
    const data = (await resp.json().catch(() => ({}))) as FebBoxErrResp & any
    // access_token 过期：-10001 且带 server_name 时刷新后重试
    if (data.code === -10001 && data.server_name) {
      await this.refreshToken()
      return this.request(params)
    }
    if (data.code !== 0 && data.code !== 1) {
      throw new Error(`[FebBox] ${data.msg || data.code}`)
    }
    return data
  }

  async getFilesList(id: string): Promise<FebBoxFile[]> {
    const pageSize = this.addition.page_size || 100
    const files: FebBoxFile[] = []
    let page = 1
    for (;;) {
      const data = (await this.request({
        module: "file_list",
        parent_id: id,
        page: String(page),
        pagelimit: String(pageSize),
        order: this.addition.sort_rule || "name_asc",
      })) as FebBoxFileListResp
      const list = data.data?.file_list || []
      files.push(...list)
      if (list.length < pageSize) break
      page++
    }
    return files
  }

  async getDownloadLink(id: string, ip: string): Promise<string> {
    const data = (await this.request({
      module: "file_get_download_url",
      "fids[]": id,
      ip,
    })) as FebBoxFileDownloadResp
    if (!data.data || data.data.length === 0) {
      throw new Error(`[FebBox] can not get download link: ${data.msg}`)
    }
    return data.data[0].download_url
  }

  async makeDir(id: string, name: string): Promise<void> {
    await this.request({
      module: "create_dir",
      parent_id: id,
      name,
    })
  }

  async move(id: string, dstId: string): Promise<void> {
    await this.request({
      module: "file_move",
      "fids[]": id,
      to: dstId,
    })
  }

  async rename(id: string, name: string): Promise<void> {
    await this.request({
      module: "file_rename",
      fid: id,
      name,
    })
  }

  async copy(id: string, dstId: string): Promise<void> {
    await this.request({
      module: "file_copy",
      "fids[]": id,
      to: dstId,
    })
  }

  async remove(id: string): Promise<void> {
    await this.request({
      module: "file_delete",
      "fids[]": id,
    })
  }
}
