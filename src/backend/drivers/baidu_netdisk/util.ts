// Baidu Netdisk API client
// Re-ported from: https://github.com/OpenListTeam/OpenList/tree/main/drivers/baidu_netdisk
// (util.go + driver.go API helpers)
import {
  BaiduAddition,
  BaiduDownloadResp,
  BaiduDownloadResp2,
  BaiduFile,
  BaiduListResp,
  BaiduOnlineTokenResp,
  BaiduPrecreateResp,
  BaiduQuotaResp,
  BaiduRespBody,
  BaiduTokenErrResp,
  BaiduTokenResp,
  BaiduUinfoResp,
  BaiduUploadServerResp,
} from "./types"

const OAUTH_API = "https://openapi.baidu.com/oauth/2.0/token"
const PAN_API = "https://pan.baidu.com/rest/2.0"

// Go constants
export const DEFAULT_SLICE_SIZE = 4 * 1024 * 1024 // 4MB, non-vip
export const VIP_SLICE_SIZE = 16 * 1024 * 1024 // 16MB, normal member
export const SVIP_SLICE_SIZE = 32 * 1024 * 1024 // 32MB, super member
export const MAX_SLICE_NUM = 2048
export const SLICE_STEP = 1 * 1024 * 1024
export const UPLOAD_FALLBACK_API = "https://d.pcs.baidu.com"
export const DEFAULT_UPLOAD_SLICE_TIMEOUT_MS = 60 * 1000
export const UPLOAD_RETRY_COUNT = 3
export const UPLOAD_RETRY_WAIT_MS = 1000
export const UPLOAD_RETRY_MAX_WAIT_MS = 5000

// 百度 access_token 无效/过期的错误码（实测：uinfo 假 token → 20016；list/filemetas 空或假 token → -6；111 为文档标准）
const TOKEN_ERRORS = new Set([111, -6, 20016])

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

/** Trim a `raw_url` (Baidu dlink) so it can be proxied: keep the base URL and the query params Baidu requires (uk/shareid/method...), dropping access_token if present. */
function sanitizeDlink(dlink: string): string {
  if (!dlink) return dlink
  try {
    const u = new URL(dlink)
    u.searchParams.delete("access_token")
    return u.toString()
  } catch {
    return dlink
  }
}

// --- MD5 obfuscation helpers (Go DecryptMd5 / EncryptMd5) ---

export function decryptMd5(encryptMd5: string): string {
  // If it's already a valid plain MD5 hex, return as-is
  if (/^[0-9a-fA-F]{32}$/.test(encryptMd5)) return encryptMd5

  const out: string[] = []
  for (let i = 0; i < encryptMd5.length; i++) {
    let n: number
    if (i === 9) {
      n = encryptMd5[i].toLowerCase().charCodeAt(0) - "g".charCodeAt(0)
    } else {
      n = parseInt(encryptMd5[i], 16)
    }
    out.push((n ^ (15 & i)).toString(16))
  }
  const s = out.join("")
  return s.slice(8, 16) + s.slice(0, 8) + s.slice(24, 32) + s.slice(16, 24)
}

export function encryptMd5(originalMd5: string): string {
  const reversed =
    originalMd5.slice(8, 16) +
    originalMd5.slice(0, 8) +
    originalMd5.slice(24, 32) +
    originalMd5.slice(16, 24)
  const out: string[] = []
  for (let i = 0; i < reversed.length; i++) {
    let n = parseInt(reversed[i], 16)
    n ^= 15 & i
    if (i === 9) {
      out.push(String.fromCharCode(n + "g".charCodeAt(0)))
    } else {
      out.push(n.toString(16))
    }
  }
  return out.join("")
}

/** Fill missing optional fields with Go-meta defaults (also normalizes
 *  string booleans from the form UI, e.g. "false" → false). */
export function normalizeBaiduAddition(a: any): BaiduAddition {
  const norm = { ...(a || {}) } as any
  const bool = (v: any, def: boolean): boolean => {
    if (v === undefined || v === null || v === "") return def
    if (typeof v === "boolean") return v
    return String(v).toLowerCase() === "true"
  }
  norm.use_online_api = bool(norm.use_online_api, true)
  norm.api_url_address =
    norm.api_url_address || "https://api.oplist.org/baiduyun/renewapi"
  norm.download_api = norm.download_api || "official"
  norm.custom_crack_ua = norm.custom_crack_ua || "netdisk"
  norm.order_by = norm.order_by || "name"
  norm.order_direction = norm.order_direction || "asc"
  norm.upload_thread = norm.upload_thread || "3"
  norm.upload_api = norm.upload_api || UPLOAD_FALLBACK_API
  norm.use_dynamic_upload_api = bool(norm.use_dynamic_upload_api, true)
  norm.custom_upload_part_size = norm.custom_upload_part_size || 0
  norm.low_bandwith_upload_mode = bool(norm.low_bandwith_upload_mode, false)
  norm.only_list_video_file = bool(norm.only_list_video_file, false)
  return norm as BaiduAddition
}

export class BaiduClient {
  private addition: BaiduAddition
  public accessToken = ""
  /** Called after a successful refresh so the new tokens can be persisted */
  private onTokenUpdate?: (tokens: {
    access_token: string
    refresh_token: string
  }) => void

  constructor(
    addition: BaiduAddition,
    onTokenUpdate?: (tokens: {
      access_token: string
      refresh_token: string
    }) => void,
  ) {
    // Normalize defaults even when constructed directly (defensive:
    // use_online_api defaults to true so the online refresh API is used)
    this.addition = normalizeBaiduAddition(addition)
    this.onTokenUpdate = onTokenUpdate
    if (this.addition.access_token) {
      this.accessToken = this.addition.access_token
    }
  }

  /** User-Agent for normal API calls — aligned with the OpenList Go driver (drivers/base/client.go UserAgentNT) */
  private static readonly apiUA =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Safari/537.36 Chrome/142.0.0.0 OpenList/425.6.30"

  // ---- Token refresh ----

  public async refreshToken(): Promise<void> {
    const a = this.addition
    if (a.use_online_api && a.api_url_address) {
      // OpenList online API — no client_id/client_secret needed
      const u = new URL(a.api_url_address)
      u.searchParams.set("refresh_ui", a.refresh_token)
      u.searchParams.set("server_use", "true")
      u.searchParams.set("driver_txt", "baiduyun_go")
      const res = await fetch(u.toString(), {
        headers: { "User-Agent": BaiduClient.apiUA },
      })
      let data: any
      const rawText = await res.text()
      try {
        data = JSON.parse(rawText)
      } catch {
        // Non-JSON error page — surface the raw body for diagnosis
        throw new Error(
          `在线 API 刷新失败 (HTTP ${res.status})：${rawText.slice(0, 300) || "非 JSON 响应"}。请确认 refresh_token 是通过 https://api.oplist.org/ 获取的有效令牌。`,
        )
      }
      if (!data.refresh_token || !data.access_token) {
        throw new Error(
          data.text ||
            (res.status !== 200
              ? `在线 API 返回 HTTP ${res.status}`
              : "empty token returned from official API, a wrong refresh token may have been used"),
        )
      }
      this.accessToken = data.access_token
      a.refresh_token = data.refresh_token
      a.access_token = data.access_token
      this.onTokenUpdate?.({
        access_token: data.access_token,
        refresh_token: data.refresh_token,
      })
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
    a.access_token = data.access_token || ""
    this.onTokenUpdate?.({
      access_token: data.access_token || "",
      refresh_token: data.refresh_token,
    })
  }

  /** Call at init to pre-obtain a valid token (avoids cold-start OAuth wind control) */
  public async login(): Promise<void> {
    if (!this.accessToken) {
      await this.refreshToken()
    }
  }

  private async ensureToken(): Promise<void> {
    if (!this.accessToken) {
      await this.refreshToken()
    }
  }

  // ---- Core request (Go `request` with retry) ----

  /**
   * Execute an API request against pan.baidu.com.
   * Retries up to 3 times with backoff (1s, 2s). On errno 111/-6 refreshes
   * the token. For download_api=crack_video, errno 31023 bodies are returned
   * as-is (the mediainfo response may still contain the dlink).
   */
  public async request(
    fullUrl: string,
    method: "GET" | "POST",
    params?: Record<string, string>,
    form?: Record<string, string>,
  ): Promise<BaiduRespBody> {
    await this.ensureToken()

    const doRequest = async (): Promise<BaiduRespBody> => {
      const u = new URL(fullUrl)
      u.searchParams.set("access_token", this.accessToken)
      for (const [k, v] of Object.entries(params || {})) {
        u.searchParams.set(k, v)
      }
      const headers: Record<string, string> = {
        "User-Agent": BaiduClient.apiUA,
        Accept: "application/json",
      }
      const init: RequestInit = { method, headers }
      if (form && method === "POST") {
        const body = new URLSearchParams()
        for (const [k, v] of Object.entries(form)) body.set(k, v)
        headers["Content-Type"] = "application/x-www-form-urlencoded"
        init.body = body.toString()
      }
      const res = await fetch(u.toString(), init)
      const text = await res.text()
      let body: BaiduRespBody
      try {
        body = JSON.parse(text) as BaiduRespBody
      } catch {
        // Non-JSON (e.g. HTML risk-control page) — treat as API error
        throw new Error(
          `req: [${fullUrl}] invalid JSON response, status ${res.status}`,
        )
      }
      const errno = typeof body.errno === "number" ? body.errno : 0
      if (errno !== 0) {
        if (TOKEN_ERRORS.has(errno)) {
          // Go refreshes the token, then the outer retry loop re-runs
          await this.refreshToken()
        }
        if (errno === 31023 && this.addition.download_api === "crack_video") {
          // mediainfo may still return the dlink under risk control
          return body
        }
        const base = `req: [${fullUrl}] ,errno: ${errno}, refer to https://pan.baidu.com/union/doc/`
        if (errno === 31023) {
          throw new Error(
            `${base} 百度网盘风控 (Trigger security policy: Please try again later) — 触发原因通常是：① 当前部署环境的出口 IP（如 Cloudflare Workers 数据中心 IP）被百度安全策略拦截；② refresh_token 无效或从非官方渠道获取，导致账号被风控。请确认：refresh_token 必须通过 https://api.oplist.org/ 获取（本驱动默认已开启"使用在线 API"）；风控为临时性，等待数分钟至数小时后自动解除；长期使用请将后端部署到境内服务器（或配置 HTTPS_PROXY 境内代理）。`,
          )
        }
        throw new Error(base)
      }
      return body
    }

    let lastErr: unknown
    for (let attempt = 0; attempt < UPLOAD_RETRY_COUNT; attempt++) {
      try {
        return await doRequest()
      } catch (e) {
        lastErr = e
        if (attempt < UPLOAD_RETRY_COUNT - 1) {
          await sleep(UPLOAD_RETRY_WAIT_MS * Math.pow(2, attempt))
        }
      }
    }
    throw lastErr
  }

  private get(
    pathname: string,
    params: Record<string, string>,
  ): Promise<BaiduRespBody> {
    return this.request(PAN_API + pathname, "GET", params)
  }

  private postForm(
    pathname: string,
    params: Record<string, string>,
    form: Record<string, string>,
  ): Promise<BaiduRespBody> {
    return this.request(PAN_API + pathname, "POST", params, form)
  }

  // ---- User info (Init) ----

  public async uinfo(): Promise<number> {
    const body = await this.get("/xpan/nas", { method: "uinfo" })
    return typeof body.vip_type === "number" ? body.vip_type : 0
  }

  // ---- Files ----

  public async getFiles(dir: string): Promise<BaiduFile[]> {
    const start = 0
    const limit = 1000
    const params: Record<string, string> = {
      method: "list",
      dir,
      web: "web",
    }
    if (this.addition.order_by) {
      params["order"] = this.addition.order_by
      if (this.addition.order_direction === "desc") {
        params["desc"] = "1"
      }
    }
    const res: BaiduFile[] = []
    for (let s = start; ; s += limit) {
      params["start"] = String(s)
      params["limit"] = String(limit)
      const body = (await this.get("/xpan/file", params)) as BaiduListResp
      const list = body.list || []
      if (list.length === 0) break

      if (this.addition.only_list_video_file) {
        for (const f of list) {
          if (f.isdir === 1 || f.category === 1) res.push(f)
        }
      } else {
        res.push(...list)
      }

      if (list.length < limit) break
    }
    return res
  }

  // ---- Download links ----

  /** Official API: filemetas → follow 302 to real URL */
  public async getOfficialLink(fsId: number | string): Promise<{
    url: string
    headers: Record<string, string>
  }> {
    const body = (await this.get("/xpan/multimedia", {
      method: "filemetas",
      fsids: `[${fsId}]`,
      dlink: "1",
    })) as BaiduDownloadResp
    const dlink = body.list?.[0]?.dlink
    if (!dlink) throw new Error("no dlink returned from filemetas")

    // Go: NoRedirectClient.Head(dlink+"&access_token=...", UA=pan.baidu.com) → location
    const u = `${dlink}&access_token=${this.accessToken}`
    const res = await fetch(u, {
      method: "HEAD",
      redirect: "manual",
      headers: { "User-Agent": "pan.baidu.com" },
    })
    const location = res.headers.get("location") || u
    return {
      url: sanitizeDlink(location),
      headers: { "User-Agent": "pan.baidu.com" },
    }
  }

  /** Crack API: pan.baidu.com/api/filemetas with web=5&origin=dlna */
  public async getCrackLink(filePath: string): Promise<{
    url: string
    headers: Record<string, string>
  }> {
    const body = (await this.request(
      "https://pan.baidu.com/api/filemetas",
      "GET",
      {
        target: `["${filePath}"]`,
        dlink: "1",
        web: "5",
        origin: "dlna",
      },
    )) as BaiduDownloadResp2
    const dlink = body.info?.[0]?.dlink
    if (!dlink) throw new Error("no dlink returned from crack filemetas")
    return {
      url: sanitizeDlink(dlink),
      headers: { "User-Agent": this.addition.custom_crack_ua || "netdisk" },
    }
  }

  /** Crack video API: pan.baidu.com/api/mediainfo */
  public async getCrackVideoLink(
    filePath: string,
    fsId: number | string,
  ): Promise<{ url: string; headers: Record<string, string> }> {
    const body = await this.request(
      "https://pan.baidu.com/api/mediainfo",
      "GET",
      {
        type: "VideoURL",
        path: filePath,
        fs_id: String(fsId),
        devuid: "0%1",
        clienttype: "1",
        channel: "android_15_25010PN30C_bd-netdisk_1523a",
        nom3u8: "1",
        dlink: "1",
        media: "1",
        origin: "dlna",
      },
    )
    const dlink = body?.info?.dlink
    if (!dlink) throw new Error("no dlink returned from mediainfo")
    return {
      url: sanitizeDlink(dlink),
      headers: { "User-Agent": this.addition.custom_crack_ua || "netdisk" },
    }
  }

  // ---- File management (Go manage / create) ----

  public async manage(
    opera: string,
    filelist: unknown,
  ): Promise<BaiduRespBody> {
    return this.postForm(
      "/xpan/file",
      { method: "filemanager", opera },
      {
        async: "0",
        filelist: JSON.stringify(filelist),
        ondup: "fail",
      },
    )
  }

  public async create(
    path: string,
    size: number,
    isdir: number,
    uploadid: string,
    block_list: string,
    mtime: number,
    ctime: number,
  ): Promise<BaiduRespBody> {
    const form: Record<string, string> = {
      path,
      size: String(size),
      isdir: String(isdir),
      rtype: "3",
    }
    if (mtime !== 0 && ctime !== 0) {
      joinTime(form, ctime, mtime)
    }
    if (uploadid) form["uploadid"] = uploadid
    if (block_list) form["block_list"] = block_list
    return this.postForm("/xpan/file", { method: "create" }, form)
  }

  // ---- Upload ----

  public async precreate(
    path: string,
    streamSize: number,
    blockListStr: string,
    contentMd5: string,
    sliceMd5: string,
    ctime: number,
    mtime: number,
  ): Promise<BaiduPrecreateResp> {
    const form: Record<string, string> = {
      path,
      size: String(streamSize),
      isdir: "0",
      autoinit: "1",
      rtype: "3",
      block_list: blockListStr,
    }
    // Only include md5s on first upload (not on uploadid-expired retry)
    if (contentMd5 !== "" && sliceMd5 !== "") {
      form["content-md5"] = contentMd5
      form["slice-md5"] = sliceMd5
    }
    joinTime(form, ctime, mtime)

    const body = (await this.postForm(
      "/xpan/file",
      { method: "precreate" },
      form,
    )) as BaiduPrecreateResp
    // Fix time (see Put note: Baidu returns current time, actual stored time is file time)
    if (body.return_type === 2 && body.info) {
      body.info.ctime = ctime
      body.info.mtime = mtime
    }
    return body
  }

  /** Upload a single slice via multipart/form-data (Go uploadSlice) */
  public async uploadSlice(
    uploadUrl: string,
    params: Record<string, string>,
    fileName: string,
    slice: Uint8Array,
    timeoutMs: number,
  ): Promise<void> {
    const u = new URL(uploadUrl + "/rest/2.0/pcs/superfile2")
    for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v)

    const form = new FormData()
    form.append("file", new Blob([slice as BlobPart]), fileName)

    const controller = new AbortController()
    const timer = setTimeout(
      () => controller.abort(),
      timeoutMs > 0 ? timeoutMs : DEFAULT_UPLOAD_SLICE_TIMEOUT_MS,
    )
    try {
      const res = await fetch(u.toString(), {
        method: "POST",
        body: form,
        signal: controller.signal,
      })
      const respStr = await res.text()
      const lower = respStr.toLowerCase()
      // Uploadid-expired detection (Go merges invalid/expired/not found)
      if (
        lower.includes("uploadid") &&
        (lower.includes("invalid") ||
          lower.includes("expired") ||
          lower.includes("not found"))
      ) {
        throw new ErrUploadIDExpired()
      }
      let body: any
      try {
        body = JSON.parse(respStr)
      } catch {
        body = {}
      }
      const errCode = body?.error_code ?? 0
      const errno = body?.errno ?? 0
      if (errCode !== 0 || errno !== 0) {
        throw new Error(`error uploading to baidu, response=${respStr}`)
      }
    } finally {
      clearTimeout(timer)
    }
  }

  /** Upload API domain (dynamic or fallback) — Go getUploadUrl */
  public getUploadUrl(path: string, uploadId: string): string {
    const a = this.addition
    if (!a.use_dynamic_upload_api || !uploadId) {
      return a.upload_api || UPLOAD_FALLBACK_API
    }
    // Dynamic lookup is async in TS; callers should use requestForUploadUrl
    return a.upload_api || UPLOAD_FALLBACK_API
  }

  /** Go requestForUploadUrl: locateupload → servers[0].server */
  public async requestForUploadUrl(
    path: string,
    uploadId: string,
  ): Promise<string> {
    const body = (await this.request(
      "https://d.pcs.baidu.com/rest/2.0/pcs/file",
      "GET",
      {
        method: "locateupload",
        appid: "250528",
        path,
        uploadid: uploadId,
        upload_version: "2.0",
      },
    )) as BaiduUploadServerResp
    let uploadUrl = ""
    if (body.servers && body.servers.length > 0) {
      uploadUrl = body.servers[0].server
    } else if (body.bak_servers && body.bak_servers.length > 0) {
      uploadUrl = body.bak_servers[0].server
    }
    if (!uploadUrl) throw new Error("upload URL is empty")
    return uploadUrl
  }

  /** Slice size based on vip type and custom setting — Go getSliceSize */
  public getSliceSize(filesize: number, vipType: number): number {
    const a = this.addition
    const custom = a.custom_upload_part_size || 0
    // Non-vip is fixed at 4MB
    if (vipType === 0) {
      if (custom !== 0) {
        console.warn(
          "[baidu_netdisk] CustomUploadPartSize is not supported for non-vip user, use DefaultSliceSize",
        )
      }
      if (filesize > MAX_SLICE_NUM * DEFAULT_SLICE_SIZE) {
        console.warn(
          `[baidu_netdisk] File size(${filesize}) is too large, may cause upload failure`,
        )
      }
      return DEFAULT_SLICE_SIZE
    }

    if (custom !== 0) {
      if (custom < DEFAULT_SLICE_SIZE) {
        console.warn(
          `[baidu_netdisk] CustomUploadPartSize(${custom}) is less than DefaultSliceSize, use DefaultSliceSize`,
        )
        return DEFAULT_SLICE_SIZE
      }
      if (vipType === 1 && custom > VIP_SLICE_SIZE) {
        console.warn(
          `[baidu_netdisk] CustomUploadPartSize(${custom}) is greater than VipSliceSize, use VipSliceSize`,
        )
        return VIP_SLICE_SIZE
      }
      if (vipType === 2 && custom > SVIP_SLICE_SIZE) {
        console.warn(
          `[baidu_netdisk] CustomUploadPartSize(${custom}) is greater than SVipSliceSize, use SVipSliceSize`,
        )
        return SVIP_SLICE_SIZE
      }
      return custom
    }

    let maxSliceSize = DEFAULT_SLICE_SIZE
    if (vipType === 1) maxSliceSize = VIP_SLICE_SIZE
    if (vipType === 2) maxSliceSize = SVIP_SLICE_SIZE

    // Upload on low bandwidth: pick the smallest workable slice size
    if (a.low_bandwith_upload_mode) {
      let size = DEFAULT_SLICE_SIZE
      while (size <= maxSliceSize) {
        if (filesize <= MAX_SLICE_NUM * size) return size
        size += SLICE_STEP
      }
    }

    if (filesize > MAX_SLICE_NUM * maxSliceSize) {
      console.warn(
        `[baidu_netdisk] File size(${filesize}) is too large, may cause upload failure`,
      )
    }
    return maxSliceSize
  }

  // ---- Quota (GetDetails) ----

  public async quota(): Promise<{ total: number; used: number }> {
    const body = (await this.request(
      "https://pan.baidu.com/api/quota",
      "GET",
    )) as BaiduQuotaResp
    return { total: body.total || 0, used: body.used || 0 }
  }
}

/** Sentinel error: uploadid expired, restart upload from scratch */
export class ErrUploadIDExpired extends Error {
  constructor() {
    super("uploadid expired")
    this.name = "ErrUploadIDExpired"
  }
}

export function joinTime(
  form: Record<string, string>,
  ctime: number,
  mtime: number,
): void {
  form["local_mtime"] = String(mtime)
  form["local_ctime"] = String(ctime)
}
