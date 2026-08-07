// 115 Open API client
// Re-ported from: https://github.com/OpenListTeam/OpenList/tree/main/drivers/115_open
// + https://github.com/OpenListTeam/115-sdk-go (authRequest / token refresh / fs API)
import {
  Pan115Addition,
  Pan115DownUrlResp,
  Pan115FolderInfoResp,
  Pan115GetFilesResp,
  Pan115MkdirResp,
  Pan115Resp,
  Pan115UploadGetTokenResp,
  Pan115UploadInitResp,
  Pan115UserInfoResp,
} from "./types"

const API_BASE = "https://proapi.115.com"
const API_AUTH = "https://passportapi.115.com"

// File API
const ApiFsUploadGetToken = API_BASE + "/open/upload/get_token"
const ApiFsUploadInit = API_BASE + "/open/upload/init"
const ApiFsMkdir = API_BASE + "/open/folder/add"
const ApiFsGetFiles = API_BASE + "/open/ufile/files"
const ApiFsGetFolderInfo = API_BASE + "/open/folder/get_info"
const ApiFsCopy = API_BASE + "/open/ufile/copy"
const ApiFsMove = API_BASE + "/open/ufile/move"
const ApiFsDownURL = API_BASE + "/open/ufile/downurl"
const ApiFsUpdate = API_BASE + "/open/ufile/update"
const ApiFsDelete = API_BASE + "/open/ufile/delete"
const ApiUserInfo = API_BASE + "/open/user/info"
const ApiRefreshToken = API_AUTH + "/open/refreshToken"

/** 401 开头或 99 的错误码 → token 失效，需要刷新（对应 SDK Is401Started） */
function isAuthError(code: number): boolean {
  return code === 99 || String(code).startsWith("401")
}

/** SDK Error Code 430004 = 对象不存在 */
export const ERR_OBJECT_NOT_FOUND = 430004

export class Pan115Client {
  private addition: Pan115Addition
  public accessToken = ""
  public refreshTokenValue = ""
  private onTokenUpdate?: (tokens: {
    access_token: string
    refresh_token: string
  }) => void
  /** 简单限流：每秒最多 N 个请求（Go rate.Limiter 等价） */
  private rateLimitMs = 0
  private lastRequestAt = 0

  constructor(
    addition: Pan115Addition,
    onTokenUpdate?: (tokens: {
      access_token: string
      refresh_token: string
    }) => void,
  ) {
    this.addition = addition
    this.accessToken = addition.access_token || ""
    this.refreshTokenValue = addition.refresh_token || ""
    this.onTokenUpdate = onTokenUpdate
    const rate = addition.limit_rate || 0
    if (rate > 0) this.rateLimitMs = 1000 / rate
  }

  private async waitRateLimit(): Promise<void> {
    if (this.rateLimitMs <= 0) return
    const now = Date.now()
    const wait = this.lastRequestAt + this.rateLimitMs - now
    if (wait > 0) {
      await new Promise((r) => setTimeout(r, wait))
    }
    this.lastRequestAt = Date.now()
  }

  /** fetch + 20s 超时 + 网络错误重试 3 次（瞬时故障恢复） */
  private async fetchWithRetry(
    url: string,
    init: RequestInit,
  ): Promise<Response> {
    let lastErr: unknown
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const controller = new AbortController()
        const timer = setTimeout(() => controller.abort(), 20000)
        try {
          return await fetch(url, { ...init, signal: controller.signal })
        } finally {
          clearTimeout(timer)
        }
      } catch (e) {
        lastErr = e
        if (attempt < 2) {
          await new Promise((r) => setTimeout(r, 500 * (attempt + 1)))
        }
      }
    }
    throw lastErr
  }

  /** 格式化网络错误（含 cause 诊断，如 ECONNREFUSED / ENOTFOUND） */
  private static describeNetError(e: unknown): string {
    const err = e as any
    const causeCode = err?.cause?.code || err?.cause?.cause?.code
    const causeMsg = err?.cause?.message || err?.cause?.cause?.message
    if (causeCode) return `${err?.message || "fetch failed"}（${causeCode}）`
    if (causeMsg) return `${err?.message || "fetch failed"}（${causeMsg}）`
    return err?.message || String(e)
  }

  // ---- Token refresh ----

  public async refreshToken(): Promise<void> {
    if (!this.refreshTokenValue) {
      throw new Error("115 网盘缺少 refresh_token（必填）")
    }
    const form = new URLSearchParams()
    form.set("refresh_token", this.refreshTokenValue)
    const res = await this.fetchWithRetry(ApiRefreshToken, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form.toString(),
    })
    const data = (await res.json()) as Pan115Resp<{
      access_token?: string
      refresh_token?: string
    }>
    if (
      data.code !== 0 ||
      !data.data?.access_token ||
      !data.data?.refresh_token
    ) {
      throw new Error(
        `115 网盘 token 刷新失败（code ${data.code} ${data.message}）：请确认 refresh_token 有效。`,
      )
    }
    this.accessToken = data.data.access_token
    this.refreshTokenValue = data.data.refresh_token
    this.addition.access_token = this.accessToken
    this.addition.refresh_token = this.refreshTokenValue
    this.onTokenUpdate?.({
      access_token: this.accessToken,
      refresh_token: this.refreshTokenValue,
    })
  }

  // ---- Core request (对应 SDK authRequest) ----

  /**
   * 鉴权请求：Bearer access_token；响应 state=false 且 code 为 401 开头/99 时
   * 自动刷新 token 并重试一次（防止无限递归）。
   */
  public async request(
    url: string,
    method: "GET" | "POST",
    query?: Record<string, string>,
    form?: Record<string, string>,
    ua?: string,
    skipAuthRetry = false,
  ): Promise<any> {
    await this.waitRateLimit()

    const doReq = async (): Promise<{ body: any; rawText: string }> => {
      const u = new URL(url)
      for (const [k, v] of Object.entries(query || {})) {
        if (v !== "") u.searchParams.set(k, v)
      }
      const headers: Record<string, string> = {
        Accept: "application/json",
        "User-Agent":
          ua ||
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Safari/537.36 Chrome/142.0.0.0 OpenList/425.6.30",
      }
      if (this.accessToken)
        headers["Authorization"] = `Bearer ${this.accessToken}`
      const init: RequestInit = { method, headers }
      if (form && method === "POST") {
        const body = new URLSearchParams()
        for (const [k, v] of Object.entries(form)) {
          if (v !== "") body.set(k, v)
        }
        headers["Content-Type"] = "application/x-www-form-urlencoded"
        init.body = body.toString()
      }
      const res = await this.fetchWithRetry(u.toString(), init)
      const rawText = await res.text()
      let body: any
      try {
        body = JSON.parse(rawText)
      } catch {
        body = {
          state: false,
          code: res.status,
          message: rawText.slice(0, 200),
        }
      }
      return { body, rawText }
    }

    let body: any
    try {
      ;({ body } = await doReq())
    } catch (e) {
      // 网络层失败（fetch failed / ECONNREFUSED / 超时）→ 透传 cause 便于诊断
      throw new Error(Pan115Client.describeNetError(e))
    }
    const state = body?.state
    if (state === false || state === undefined) {
      const code = Number(body?.code ?? 0)
      if (isAuthError(code) && !skipAuthRetry) {
        // token 失效 → 刷新一次并重试（防递归：skipAuthRetry=true 时不再刷新）
        await this.refreshToken()
        const retry = await doReq()
        body = retry.body
        const retryState = body?.state
        if (retryState !== false && retryState !== undefined) {
          return body
        }
        throw new Error(
          `115 网盘 API 错误（code ${body?.code} ${body?.message}）`,
        )
      }
      // 对象不存在错误（430004）——SDK ErrObjectNotFound
      if (code === ERR_OBJECT_NOT_FOUND) {
        const err: any = new Error("115 object not found")
        err.code = ERR_OBJECT_NOT_FOUND
        throw err
      }
      throw new Error(
        `115 网盘 API 错误（code ${code} ${body?.message || ""}）`,
      )
    }
    return body
  }

  // ---- User ----

  public async userInfo(): Promise<Pan115UserInfoResp> {
    return (await this.request(ApiUserInfo, "GET"))?.data as Pan115UserInfoResp
  }

  // ---- Files ----

  public async getFiles(opts: {
    cid: string
    limit: number
    offset: number
    asc: boolean
    o?: string
    showDir?: boolean
  }): Promise<{ files: Pan115GetFilesResp["data"]; count: number }> {
    const resp = (await this.request(ApiFsGetFiles, "GET", {
      cid: opts.cid,
      limit: String(opts.limit),
      offset: String(opts.offset),
      asc: opts.asc ? "1" : "0",
      o: opts.o || "",
      show_dir: opts.showDir ? "1" : "0",
      cur: "1",
    })) as Pan115GetFilesResp
    return { files: resp.data || [], count: resp.count || 0 }
  }

  public async getFolderInfo(fileId: string): Promise<Pan115FolderInfoResp> {
    return (
      await this.request(ApiFsGetFolderInfo, "GET", {
        file_id: fileId,
      })
    )?.data as Pan115FolderInfoResp
  }

  public async getFolderInfoByPath(
    path: string,
  ): Promise<Pan115FolderInfoResp> {
    return (
      await this.request(ApiFsGetFolderInfo, "POST", undefined, {
        path,
      })
    )?.data as Pan115FolderInfoResp
  }

  public async mkdir(pid: string, fileName: string): Promise<Pan115MkdirResp> {
    return (
      await this.request(ApiFsMkdir, "POST", undefined, {
        pid,
        file_name: fileName,
      })
    )?.data as Pan115MkdirResp
  }

  public async move(fileIds: string, toCid: string): Promise<void> {
    await this.request(ApiFsMove, "POST", undefined, {
      file_ids: fileIds,
      to_cid: toCid,
    })
  }

  public async updateFile(fileId: string, fileName: string): Promise<void> {
    await this.request(ApiFsUpdate, "POST", undefined, {
      file_id: fileId,
      file_name: fileName,
    })
  }

  public async copy(pid: string, fileId: string): Promise<void> {
    await this.request(ApiFsCopy, "POST", undefined, {
      pid,
      file_id: fileId,
      no_dupli: "1",
    })
  }

  public async delFile(fileIds: string, parentId: string): Promise<void> {
    await this.request(ApiFsDelete, "POST", undefined, {
      file_ids: fileIds,
      parent_id: parentId,
    })
  }

  /** 下载链接（DownURL），需要 UA（Go Link 传入请求 UA 或默认 UA） */
  public async downUrl(
    pickCode: string,
    ua: string,
  ): Promise<Pan115DownUrlResp> {
    return (
      await this.request(
        ApiFsDownURL,
        "POST",
        undefined,
        { pick_code: pickCode },
        ua,
      )
    )?.data as Pan115DownUrlResp
  }

  // ---- Upload（OSS 直传所需 token / init） ----

  public async uploadGetToken(): Promise<Pan115UploadGetTokenResp> {
    return (await this.request(ApiFsUploadGetToken, "GET"))
      ?.data as Pan115UploadGetTokenResp
  }

  public async uploadInit(opts: {
    fileName: string
    fileSize: number
    target: string
    fileId: string // sha1 大写
    preId: string // 前128k sha1 大写
    signKey?: string
    signVal?: string
  }): Promise<Pan115UploadInitResp> {
    return (
      await this.request(ApiFsUploadInit, "POST", undefined, {
        file_name: opts.fileName,
        file_size: String(opts.fileSize),
        target: `U_1_${opts.target}`,
        fileid: opts.fileId,
        preid: opts.preId,
        sign_key: opts.signKey || "",
        sign_val: opts.signVal || "",
      })
    )?.data as Pan115UploadInitResp
  }
}
