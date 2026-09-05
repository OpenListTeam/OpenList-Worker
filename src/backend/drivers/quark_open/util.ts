// 夸克网盘开放平台 API 客户端
import {
  DriverQuarkOpenAddition,
  QuarkFile,
  QuarkCommonResp,
  QuarkFileListData,
  QuarkDownloadData,
  QuarkRefreshResp,
} from "./types"

const API = "https://open-api-drive.quark.cn"
const UA = "go-resty/3.0.0-beta.1 (https://resty.dev)"

async function sha256Hex(data: string): Promise<string> {
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(data),
  )
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
}

export class ClientQuarkOpen {
  private addition: DriverQuarkOpenAddition
  private accessToken: string
  private refreshToken: string
  private appId: string
  private signKey: string

  constructor(addition: DriverQuarkOpenAddition) {
    this.addition = addition
    this.accessToken = addition.access_token || ""
    this.refreshToken = addition.refresh_token || ""
    this.appId = addition.app_id || ""
    this.signKey = addition.sign_key || ""
  }

  async init(): Promise<void> {
    if (!this.refreshToken)
      throw new Error("[QuarkOpen] refresh_token is required")
  }

  /** 生成签名：x-pan-token = sha256(method&path&tm&signKey) */
  private async generateSign(
    method: string,
    pathname: string,
  ): Promise<{ tm: string; token: string; reqId: string }> {
    const tm = String(Date.now())
    const tokenData = `${method}&${pathname}&${tm}&${this.signKey}`
    const token = await sha256Hex(tokenData)
    const reqId =
      typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`
    return { tm, token, reqId }
  }

  private async request<T = any>(
    pathname: string,
    method: string,
    body?: any,
  ): Promise<T> {
    const { tm, token, reqId } = await this.generateSign(method, pathname)
    const qs = new URLSearchParams({
      req_id: reqId,
      access_token: this.accessToken,
    })
    const headers: Record<string, string> = {
      Accept: "application/json, text/plain, */*",
      "User-Agent": UA,
      "x-pan-tm": tm,
      "x-pan-token": token,
      "x-pan-client-id": this.appId,
    }
    const options: RequestInit = { method, headers }
    if (body !== undefined) {
      options.body = JSON.stringify(body)
      headers["Content-Type"] = "application/json"
    }
    const resp = await fetch(`${API}${pathname}?${qs.toString()}`, options)
    const data: QuarkCommonResp = await resp
      .json()
      .catch(() => ({ status: -1, errno: -1 }) as any)
    // token 过期 → 刷新重试
    if (
      data.status === -1 &&
      (data.errno === 11001 ||
        (data.errno === 14001 &&
          (data.error_info || "").includes("access_token")))
    ) {
      await this.refreshAccessToken()
      return this.request<T>(pathname, method, body)
    }
    if (data.status >= 400 || data.errno !== 0) {
      throw new Error(`[QuarkOpen] ${data.error_info || `errno ${data.errno}`}`)
    }
    return data as T
  }

  private async refreshAccessToken(): Promise<void> {
    const url =
      this.addition.api_url_address ||
      "https://api.oplist.org/quarkyun/renewapi"
    const qs = new URLSearchParams({
      refresh_ui: this.refreshToken,
      server_use: "true",
      driver_txt: "quarkyun_oa",
    })
    const resp = await fetch(`${url}?${qs.toString()}`)
    const data: QuarkRefreshResp = await resp.json().catch(() => ({}))
    if (!data.refresh_token || !data.access_token) {
      throw new Error(
        `[QuarkOpen] refresh token failed: ${data.text || "empty token"}`,
      )
    }
    this.refreshToken = data.refresh_token
    this.accessToken = data.access_token
    if (data.app_id) this.appId = data.app_id
    if (data.sign_key) this.signKey = data.sign_key
    this.addition.refresh_token = data.refresh_token
    this.addition.access_token = data.access_token
  }

  async getFiles(parentFid: string): Promise<QuarkFile[]> {
    const all: QuarkFile[] = []
    let queryCursor: { version?: string; token?: string } | undefined
    do {
      const body: Record<string, any> = {
        parent_fid: parentFid,
        size: 100,
        sort:
          this.addition.order_by && this.addition.order_by !== "none"
            ? `${this.addition.order_by}:${this.addition.order_direction || "asc"}`
            : "file_name:asc",
      }
      if (queryCursor?.token) body.query_cursor = queryCursor
      const resp = await this.request<QuarkCommonResp>(
        "/open/v1/file/list",
        "POST",
        body,
      )
      const data = resp.data as QuarkFileListData | undefined
      if (data?.file_list) all.push(...data.file_list)
      if (data?.last_page) break
      queryCursor = data?.next_query_cursor
    } while (queryCursor?.token)
    return all
  }

  async getDownloadUrl(fid: string): Promise<string> {
    const resp = await this.request<QuarkCommonResp>(
      "/open/v1/file/get_download_url",
      "POST",
      { fid },
    )
    const data = resp.data as QuarkDownloadData
    if (!data.download_url) throw new Error("[QuarkOpen] empty download url")
    return data.download_url
  }

  downloadCookie(): string {
    return `x_pan_client_id=${this.appId}; x_pan_access_token=${this.accessToken}`
  }

  async mkdir(parentFid: string, name: string): Promise<void> {
    await this.request("/open/v1/dir", "POST", {
      dir_path: name,
      pdir_fid: parentFid,
    })
  }

  async rename(fid: string, newName: string): Promise<void> {
    await this.request("/open/v1/file/rename", "POST", {
      fid,
      file_name: newName,
      conflict_mode: "REUSE",
    })
  }

  async move(fid: string, toPdirFid: string): Promise<void> {
    await this.request("/open/v1/file/move", "POST", {
      action_type: 1,
      fid_list: [fid],
      to_pdir_fid: toPdirFid,
    })
  }

  async remove(fid: string): Promise<void> {
    await this.request("/open/v1/file/delete", "POST", {
      action_type: 1,
      fid_list: [fid],
    })
  }
}
