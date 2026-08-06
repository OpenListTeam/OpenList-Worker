// Baidu Netdisk API client
// Based on: https://github.com/OpenListTeam/OpenList/tree/main/drivers/baidu_netdisk
import {
  BaiduAddition,
  BaiduDownloadResp,
  BaiduDownloadResp2,
  BaiduFile,
  BaiduListResp,
  BaiduOnlineTokenResp,
  BaiduQuotaResp,
  BaiduTokenErrResp,
  BaiduTokenResp,
  BaiduUinfoResp,
} from "./types"

const REST_API = "https://pan.baidu.com/rest/2.0"
const PAN_API = "https://pan.baidu.com"
const OAUTH_API = "https://openapi.baidu.com/oauth/2.0/token"

/** errno 111 / -6 mean the access token expired → refresh & retry once */
const TOKEN_ERRORS = new Set([111, -6])

export class BaiduClient {
  private addition: BaiduAddition
  private accessToken = ""

  constructor(addition: BaiduAddition) {
    this.addition = addition
  }

  public getAccessToken(): string {
    return this.accessToken
  }

  public getAddition(): BaiduAddition {
    return this.addition
  }

  // ---- Token refresh ----

  public async refreshToken(): Promise<void> {
    const a = this.addition
    if (a.use_online_api && a.api_url_address) {
      // OpenListNext online API — no client_id/client_secret needed
      const u = new URL(a.api_url_address)
      u.searchParams.set("refresh_ui", a.refresh_token)
      u.searchParams.set("server_use", "true")
      u.searchParams.set("driver_txt", "baiduyun_go")
      const res = await fetch(u.toString())
      const data = (await res.json()) as BaiduOnlineTokenResp
      if (!data.refresh_token || !data.access_token) {
        throw new Error(
          data.text ||
            "empty token returned from official API, a wrong refresh token may have been used",
        )
      }
      this.accessToken = data.access_token
      a.refresh_token = data.refresh_token
      return
    }

    // Local OAuth refresh
    if (!a.client_id || !a.client_secret) {
      throw new Error("empty ClientID or ClientSecret")
    }
    const u = new URL(OAUTH_API)
    u.searchParams.set("grant_type", "refresh_token")
    u.searchParams.set("refresh_token", a.refresh_token)
    u.searchParams.set("client_id", a.client_id)
    u.searchParams.set("client_secret", a.client_secret)
    const res = await fetch(u.toString())
    const data = (await res.json()) as BaiduTokenResp & BaiduTokenErrResp
    if (data.error) {
      throw new Error(`${data.error}: ${data.error_description || ""}`)
    }
    if (!data.refresh_token) {
      throw new Error("empty refresh token returned from OAuth")
    }
    this.accessToken = data.access_token || ""
    a.refresh_token = data.refresh_token
  }

  private async ensureToken(): Promise<void> {
    if (!this.accessToken) {
      await this.refreshToken()
    }
  }

  // ---- Core request ----

  /**
   * Perform an API request with access_token attached.
   * If the server reports errno 111/-6 (expired token), refresh once and retry.
   */
  public async request(
    url: string,
    method: "GET" | "POST",
    params: Record<string, string> = {},
    form?: Record<string, string>,
  ): Promise<any> {
    await this.ensureToken()

    const doReq = async (): Promise<any> => {
      const u = new URL(url)
      u.searchParams.set("access_token", this.accessToken)
      for (const [k, v] of Object.entries(params)) {
        u.searchParams.set(k, v)
      }
      const headers: Record<string, string> = {
        Accept: "application/json, text/plain, */*",
        "User-Agent": "pan.baidu.com",
      }
      let body: BodyInit | undefined
      if (form) {
        headers["Content-Type"] = "application/x-www-form-urlencoded"
        body = new URLSearchParams(form).toString()
      }
      const res = await fetch(u.toString(), { method, headers, body })
      return res.json()
    }

    let data = await doReq()
    const errno = data && typeof data.errno === "number" ? data.errno : 0
    if (errno !== 0) {
      if (TOKEN_ERRORS.has(errno)) {
        await this.refreshToken()
        data = await doReq()
        const retryErrno =
          data && typeof data.errno === "number" ? data.errno : 0
        if (retryErrno !== 0) {
          throw new Error(
            `baidu api error: ${retryErrno}, refer to https://pan.baidu.com/union/doc/`,
          )
        }
        return data
      }
      throw new Error(
        `baidu api error: ${errno}, refer to https://pan.baidu.com/union/doc/`,
      )
    }
    return data
  }

  private get(pathname: string, params: Record<string, string>): Promise<any> {
    return this.request(REST_API + pathname, "GET", params)
  }

  private postForm(
    pathname: string,
    params: Record<string, string>,
    form: Record<string, string>,
  ): Promise<any> {
    return this.request(REST_API + pathname, "POST", params, form)
  }

  // ---- User info ----

  public async uinfo(): Promise<number> {
    const data = (await this.get("/xpan/nas", {
      method: "uinfo",
    })) as BaiduUinfoResp
    return data.vip_type ?? 0
  }

  public async quota(): Promise<{ total: number; used: number }> {
    const data = (await this.request(PAN_API + "/api/quota", "GET", {
      checkexpire: "1",
      checkfree: "1",
    })) as BaiduQuotaResp
    return { total: data.total ?? 0, used: data.used ?? 0 }
  }

  // ---- Files ----

  public async getFiles(dir: string): Promise<BaiduFile[]> {
    const a = this.addition
    const params: Record<string, string> = {
      method: "list",
      dir: dir || "/",
      web: "web",
    }
    if (a.order_by) {
      params["order"] = a.order_by
      if (a.order_direction === "desc") {
        params["desc"] = "1"
      }
    }

    const files: BaiduFile[] = []
    const limit = 1000
    let start = 0
    for (;;) {
      params["start"] = String(start)
      params["limit"] = String(limit)
      const resp = (await this.get("/xpan/file", params)) as BaiduListResp
      const list = resp.list || []
      if (list.length === 0) break

      if (a.only_list_video_file) {
        for (const f of list) {
          if (f.isdir === 1 || f.category === 1) {
            files.push(f)
          }
        }
      } else {
        files.push(...list)
      }

      if (list.length < limit) break
      start += limit
    }
    return files
  }

  // ---- Download links ----

  public async getDownloadLink(
    file: BaiduFile,
    path: string,
  ): Promise<{ url: string; headers: Record<string, string> }> {
    const a = this.addition
    const crackUA = a.custom_crack_ua || "netdisk"

    if (a.download_api === "crack") {
      const data = (await this.request(PAN_API + "/api/filemetas", "GET", {
        target: JSON.stringify([path]),
        dlink: "1",
        web: "5",
        origin: "dlna",
      })) as BaiduDownloadResp2
      const dlink = data.info?.[0]?.dlink
      if (!dlink) throw new Error("no dlink returned")
      return { url: dlink, headers: { "User-Agent": crackUA } }
    }

    if (a.download_api === "crack_video") {
      const data = await this.request(PAN_API + "/api/mediainfo", "GET", {
        type: "VideoURL",
        path,
        fs_id: String(file.fs_id),
        devuid: "0%1",
        clienttype: "1",
        channel: "android_15_25010PN30C_bd-netdisk_1523a",
        nom3u8: "1",
        dlink: "1",
        media: "1",
        origin: "dlna",
      })
      const dlink = data?.info?.dlink
      if (!dlink) throw new Error("no dlink returned")
      return { url: dlink, headers: { "User-Agent": crackUA } }
    }

    // official
    const data = (await this.get("/xpan/multimedia", {
      method: "filemetas",
      fsids: `[${file.fs_id}]`,
      dlink: "1",
    })) as BaiduDownloadResp
    const dlink = data.list?.[0]?.dlink
    if (!dlink) throw new Error("no dlink returned")
    const sep = dlink.includes("?") ? "&" : "?"
    // 大文件下载需要 UA: pan.baidu.com（由 rawRouter 代理时携带）
    return {
      url: `${dlink}${sep}access_token=${this.accessToken}`,
      headers: { "User-Agent": "pan.baidu.com" },
    }
  }

  // ---- File operations ----

  public async create(
    path: string,
    size: number,
    isdir: number,
    blockList?: string,
    uploadId?: string,
  ): Promise<any> {
    const form: Record<string, string> = {
      path,
      size: String(size),
      isdir: String(isdir),
      rtype: "3",
    }
    if (uploadId) form["uploadid"] = uploadId
    if (blockList) form["block_list"] = blockList
    return this.postForm("/xpan/file", { method: "create" }, form)
  }

  public async manage(opera: string, filelist: any[]): Promise<any> {
    return this.postForm(
      "/xpan/file",
      { method: "filemanager", opera },
      { async: "0", filelist: JSON.stringify(filelist), ondup: "fail" },
    )
  }
}
