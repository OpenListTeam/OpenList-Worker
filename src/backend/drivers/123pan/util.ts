// 123 Cloud Drive API client
// Based on: https://github.com/OpenListTeam/OpenList/tree/main/drivers/123
import {
  Pan123Addition,
  Pan123DownloadResp,
  Pan123File,
  Pan123FilesResp,
  Pan123LoginResp,
  Pan123BaseResp,
  Pan123UserInfoResp,
  Pan123UploadResp,
  Pan123S3PreSignedURLs,
  Pan123MkdirResp,
} from "./types"

const MAIN_API = "https://yun.123pan.com/b/api"
const LOGIN_API = "https://login.123pan.com/api"
const SignIn = LOGIN_API + "/user/sign_in"

// --- Cookie → token extraction ---

/**
 * 从浏览器 Cookie 字符串（或仅 Bearer/裸 JWT 值）中提取 123 网盘鉴权 JWT。
 * 支持以下来源，按优先级返回首个命中的有效令牌：
 *   1. 裸 `Bearer xxx` 或裸 JWT（`eyJ...` 形式）
 *   2. Cookie 中的 `sso-token=`（123 网页登录令牌，即 Authorization 用的 JWT）
 *   3. Cookie 中的 `token=` / `authorization=`
 * 解析不到时返回空字符串，调用方应回退到账号密码登录。
 */
function extractTokenFromCookie(raw: string): string {
  const s = (raw || "").trim()
  if (!s) return ""

  // 1) 纯 Bearer / 纯 JWT
  if (/^Bearer\s+/i.test(s)) {
    return s.replace(/^Bearer\s+/i, "").trim()
  }
  if (/^eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(s)) {
    return s
  }

  // 2) Cookie 字符串：拆成键值对再取令牌字段
  const cookieMap: Record<string, string> = {}
  for (const part of s.split(";")) {
    const idx = part.indexOf("=")
    if (idx < 0) continue
    const k = part.slice(0, idx).trim()
    const v = part.slice(idx + 1).trim()
    if (k) cookieMap[k] = v
  }
  const pick = (key: string): string => {
    const v = cookieMap[key] || ""
    if (/^Bearer\s+/i.test(v)) return v.replace(/^Bearer\s+/i, "").trim()
    return v
  }
  return pick("sso-token") || pick("token") || pick("authorization") || ""
}

const UserInfo = MAIN_API + "/user/info"
const FileList = MAIN_API + "/file/list/new"
const DownloadInfo = MAIN_API + "/file/download_info"
const Mkdir = MAIN_API + "/file/upload_request"
const Move = MAIN_API + "/file/mod_pid"
const Rename = MAIN_API + "/file/rename"
const Trash = MAIN_API + "/file/trash"

// --- 上传（S3 分片上传会话）---
const UploadRequest = MAIN_API + "/file/upload_request"
const S3Auth = MAIN_API + "/file/s3_upload_object/auth"
const S3PreSignedUrls = MAIN_API + "/file/s3_repare_upload_parts_batch"
const UploadCompleteV2 = MAIN_API + "/file/upload_complete/v2"

// --- CRC32-based API path signing (Go signPath equivalent) ---

const CRC32_TABLE: number[] = (() => {
  const table = new Array<number>(256)
  for (let i = 0; i < 256; i++) {
    let c = i
    for (let j = 0; j < 8; j++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    }
    table[i] = c
  }
  return table
})()

function crc32(str: string): number {
  let crc = 0xffffffff
  for (let i = 0; i < str.length; i++) {
    crc = CRC32_TABLE[(crc ^ str.charCodeAt(i)) & 0xff] ^ (crc >>> 8)
  }
  return (crc ^ 0xffffffff) >>> 0
}

const TABLE = [
  "a",
  "d",
  "e",
  "f",
  "g",
  "h",
  "l",
  "m",
  "y",
  "i",
  "j",
  "n",
  "o",
  "p",
  "k",
  "q",
  "r",
  "s",
  "t",
  "u",
  "b",
  "c",
  "v",
  "w",
  "s",
  "z",
]

function signPath(path: string): string {
  const random = Math.round(1e7 * Math.random()).toString()
  const now = new Date()
  // UTC+8 (CST)
  const ts = Math.round((now.getTime() + 8 * 3600000) / 1000)
  const timestamp = ts.toString()

  // Format YYYYMMDDhhmm in CST, then map each digit through TABLE
  const y = now.getUTCFullYear()
  const mo = String(now.getUTCMonth() + 1).padStart(2, "0")
  const d = String(now.getUTCDate()).padStart(2, "0")
  const h = String(now.getUTCHours() + 8).padStart(2, "0") // CST hours
  const mi = String(now.getUTCMinutes()).padStart(2, "0")
  const dateStr = `${y}${mo}${d}${h}${mi}`
  const mapped = dateStr
    .split("")
    .map((ch) => TABLE[parseInt(ch)])
    .join("")

  const timeSign = (crc32(mapped) >>> 0).toString()
  const data = [timestamp, random, path, "web", "3", timeSign].join("|")
  const dataSign = (crc32(data) >>> 0).toString()

  return `${timeSign}=${timestamp}-${random}-${dataSign}`
}

function getApi(rawUrl: string): string {
  const idx = rawUrl.indexOf("?")
  const base = idx >= 0 ? rawUrl.substring(0, idx) : rawUrl
  const existing = idx >= 0 ? rawUrl.substring(idx + 1) : ""
  // Extract path from URL
  const u = new URL(rawUrl)
  const sig = signPath(u.pathname)
  const sep = existing ? "&" : ""
  return `${base}?${existing}${sep}${sig}`
}

// --- Client ---

export class Pan123Client {
  private addition: Pan123Addition
  private accessToken = ""
  /** Called after a successful password login so the new token can be persisted */
  private onTokenUpdate?: (token: string) => void

  constructor(
    addition: Pan123Addition,
    onTokenUpdate?: (token: string) => void,
  ) {
    this.addition = addition
    this.onTokenUpdate = onTokenUpdate
  }

  public getRootId(): string {
    return (this.addition.root_id || "0").trim() || "0"
  }

  // ---- Login ----

  /**
   * Login strategy to avoid overseas-IP risk control (precedence):
   * 1. 显式 access_token —— 直接校验，有效即用（最高优先级）。
   * 2. cookie —— 解析其中 JWT 作 Bearer 令牌并校验；成功后持久化，
   *    适合出口 IP 被风控、账号密码登录失败的环境。
   * 3. 账号密码 —— 仅在前两者都缺失/失效时回退。
   */
  public async login(): Promise<void> {
    if (this.addition.access_token) {
      this.accessToken = this.addition.access_token
      try {
        // skipLoginRetry=true：token 校验请求遇到 401 直接抛错，
        // 防止 request() 的 401 分支再次调用 login() 造成无限递归
        await this.userInfo(true)
        return // token is valid
      } catch {
        // token invalid/expired — fall through to cookie / password login
        this.accessToken = ""
      }
    }

    // 2) 从浏览器 Cookie 解析令牌（等同于 access_token）
    if (this.addition.cookie) {
      const token = extractTokenFromCookie(this.addition.cookie)
      if (token) {
        this.accessToken = token
        try {
          await this.userInfo(true) // 校验令牌有效性（跳过登录重试，避免递归）
          // 解析成功：持久化为 access_token，后续冷启动免 cookie 也可登录
          this.addition.access_token = token
          this.onTokenUpdate?.(token)
          return
        } catch {
          this.accessToken = ""
        }
      }
    }

    // 3) 无 token / cookie 或均失效：需要账号密码
    if (!this.addition.username || !this.addition.password) {
      throw new Error(
        "123 网盘登录凭证缺失：请填写 123 网盘手机号 + 密码；" +
          "若部署环境（如 Cloudflare Workers 数据中心 IP）密码登录会被风控，" +
          "可在「Cookie」字段粘贴浏览器登录后的 Cookie（含 sso-token），" +
          "或填写有效的访问令牌 access_token（在本机浏览器登录 https://www.123pan.com/ 后从开发者工具获取）。",
      )
    }
    await this.signIn()
  }

  private async signIn(): Promise<void> {
    const isEmail = /@/.test(this.addition.username)
    const body = isEmail
      ? {
          mail: this.addition.username,
          password: this.addition.password,
          type: 2,
        }
      : {
          passport: this.addition.username,
          password: this.addition.password,
          remember: true,
        }

    const res = await fetch(SignIn, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        origin: "https://yun.123pan.com",
        referer: "https://yun.123pan.com/",
        "user-agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) openlist-client",
        platform: "web",
        "app-version": "3",
      },
      body: JSON.stringify(body),
    })
    const data = (await res.json()) as Pan123LoginResp
    if (data.code !== 200) {
      throw new Error(
        `123 网盘登录失败（${data.message || `code ${data.code}`}）。` +
          `当前部署环境的出口 IP 被 123 判定为境外/陌生设备（如 Cloudflare Workers 数据中心 IP），` +
          `账号密码登录会被风控拦截。可靠方案：` +
          `① 在本机浏览器登录 https://www.123pan.com/（登录一次或修改密码可解除账号风险），` +
          `打开开发者工具 → Application/Network → 复制请求头中的 Bearer 令牌，填入存储设置的 access_token 字段` +
          `（令牌有效期内 API 请求不受 IP 风控影响）；` +
          `② 或将该网盘部署到境内服务器（Node 容器模式）后使用账号密码。`,
      )
    }
    this.accessToken = data.data?.token || ""
    if (!this.accessToken) throw new Error("login returned empty token")
    // Persist the fresh token so subsequent boots skip password login
    this.addition.access_token = this.accessToken
    this.onTokenUpdate?.(this.accessToken)
  }

  // ---- Core request ----

  public async request(
    url: string,
    method: "GET" | "POST",
    body?: any,
    respType?: any,
    skipLoginRetry = false,
  ): Promise<any> {
    const doReq = async (): Promise<any> => {
      const signed = getApi(url)
      const headers: Record<string, string> = {
        origin: "https://yun.123pan.com",
        referer: "https://yun.123pan.com/",
        authorization: this.accessToken ? `Bearer ${this.accessToken}` : "",
        "user-agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) openlist-client",
        platform: this.addition.platform || "web",
        "app-version": "3",
        Accept: "application/json",
      }
      const init: RequestInit = { method, headers }
      if (body !== undefined && method !== "GET") {
        headers["Content-Type"] = "application/json"
        init.body = JSON.stringify(body)
      }
      const res = await fetch(signed, init)
      return res.json()
    }

    let data = await doReq()
    const code = data?.code
    if (code !== 0 && code !== 200) {
      // 401 → token expired, retry login once.
      // skipLoginRetry=true（login 内部校验 token 时）直接抛错，
      // 避免 login → userInfo → 401 → login 无限递归。
      if (code === 401 && !skipLoginRetry) {
        await this.login()
        data = await doReq()
        const retryCode = data?.code
        if (retryCode !== 0 && retryCode !== 200) {
          throw new Error(data?.message || `api error: code ${retryCode}`)
        }
        return data
      }
      throw new Error(data?.message || `api error: code ${code}`)
    }
    return data
  }

  // ---- User info ----

  public async userInfo(
    skipLoginRetry = false,
  ): Promise<Pan123UserInfoResp["data"]> {
    const data = (await this.request(
      UserInfo,
      "GET",
      undefined,
      undefined,
      skipLoginRetry,
    )) as Pan123UserInfoResp
    return data.data
  }

  // ---- Files ----

  /**
   * 分页获取文件列表。
   * - findName/findIsDir：提前终止模式——在分页中查找目标项，命中立即返回（只含命中项），
   *   避免为解析路径而拉取全部分页（减少 Cloudflare subrequest）。
   * - budget：共享 subrequest 预算（used/limit）。超过 limit 时截断并告警，
   *   防止单次 invocation 超过 Cloudflare Workers 的 50 次子请求上限。
   */
  public async getFiles(
    parentId: string,
    opts?: {
      findName?: string
      findIsDir?: boolean
      maxPages?: number
      budget?: { used: number; limit: number }
    },
  ): Promise<Pan123File[]> {
    const files: Pan123File[] = []
    let page = 1
    let nextToken = "0"
    const maxPages = opts?.maxPages ?? 45
    for (;;) {
      // Cloudflare Workers subrequest 预算检查
      if (opts?.budget) {
        if (opts.budget.used >= opts.budget.limit) {
          console.warn(
            `[123Pan] 已达 Cloudflare subrequest 预算上限(${opts.budget.limit} 次)，结果已截断（目录文件过多或路径过深）`,
          )
          break
        }
        opts.budget.used++
      }
      if (page > maxPages) {
        console.warn(
          `[123Pan] 分页超过 ${maxPages} 页，结果可能不完整（目录文件过多）`,
        )
        break
      }

      const query = new URLSearchParams({
        driveId: "0",
        limit: "100",
        next: nextToken,
        orderBy: this.addition.order_by || "file_id",
        orderDirection: this.addition.order_direction || "desc",
        parentFileId: parentId,
        trashed: "false",
        SearchData: "",
        Page: String(page),
        OnlyLookAbnormalFile: "0",
        event: "homeListFile",
        operateType: "4",
        inDirectSpace: "false",
      })
      const url = `${FileList}?${query.toString()}`
      const resp = (await this.request(url, "GET")) as Pan123FilesResp
      const list = resp.data?.InfoList || []
      files.push(...list)

      // 提前终止：目标项命中立即返回
      if (opts?.findName) {
        const hit = list.find(
          (f) =>
            f.FileName === opts.findName &&
            (opts.findIsDir === undefined || (f.Type === 1) === opts.findIsDir),
        )
        if (hit) return [hit]
      }

      const nextVal = String(resp.data?.Next ?? "-1")
      if (!resp.data || list.length === 0 || nextVal === "-1") break
      nextToken = nextVal
      page++
    }
    return files
  }

  // ---- Download ----

  public async getDownloadLink(file: Pan123File): Promise<string> {
    const body = {
      driveId: 0,
      etag: file.Etag,
      fileId: file.FileId,
      fileName: file.FileName,
      s3keyFlag: file.S3KeyFlag,
      size: file.Size,
      type: file.Type,
    }
    const resp = (await this.request(
      DownloadInfo,
      "POST",
      body,
    )) as Pan123DownloadResp
    let downloadUrl = resp.data?.DownloadUrl || ""
    if (!downloadUrl) throw new Error("no download url")

    // Some download URLs contain a base64-encoded "params" query parameter
    // that encodes the real redirect URL
    try {
      const u = new URL(downloadUrl)
      const params = u.searchParams.get("params")
      if (params) {
        const decoded = atob(params)
        const decodedUrl = new URL(decoded)
        downloadUrl = decodedUrl.toString()
      }
    } catch {
      // if parsing fails, use original URL
    }

    // Follow the redirect to get the real download URL
    const res = await fetch(downloadUrl, {
      method: "GET",
      redirect: "manual",
      headers: { Referer: "https://yun.123pan.com/" },
    })
    if (res.status === 302) {
      return res.headers.get("location") || downloadUrl
    }
    if (res.status < 300) {
      const body = await res.json().catch(() => ({}))
      return body.data?.redirect_url || downloadUrl
    }
    return downloadUrl
  }

  // ---- File operations ----

  public async mkdir(parentId: string, dirName: string): Promise<string> {
    const resp = (await this.request(Mkdir, "POST", {
      driveId: 0,
      etag: "",
      fileName: dirName,
      parentFileId: parseInt(parentId, 10) || 0,
      size: 0,
      type: 1,
    })) as Pan123MkdirResp
    return resp.data?.FileId != null ? String(resp.data.FileId) : ""
  }

  public async rename(fileId: string, newName: string): Promise<void> {
    await this.request(Rename, "POST", {
      driveId: 0,
      fileId: parseInt(fileId, 10),
      fileName: newName,
    })
  }

  public async move(fileIds: string[], targetParentId: string): Promise<void> {
    await this.request(Move, "POST", {
      fileIdList: fileIds.map((id) => ({ FileId: parseInt(id, 10) })),
      parentFileId: parseInt(targetParentId, 10),
    })
  }

  public async remove(fileId: string, file: Pan123File): Promise<void> {
    await this.request(Trash, "POST", {
      driveId: 0,
      operation: true,
      fileTrashInfoList: [file],
    })
  }

  // ---- 上传（S3 分片会话，无状态环境友好）----

  /**
   * 获取指定分片的预签名 PUT URL（供分片会话上传逐片使用）。
   * 注意：123pan 的 partNumberStart/partNumberEnd 是 [start, end) 半开区间，
   * 因此取第 n 片要传 (n, n+1)。
   * @param totalParts 整个文件的总分片数；为 1 时走单文件 auth 接口
   */
  public async getPartUploadUrl(
    up: Pick<
      Pan123UploadResp["data"],
      "Bucket" | "Key" | "UploadId" | "StorageNode"
    >,
    partNumber: number,
    totalParts: number,
  ): Promise<string> {
    const data =
      totalParts === 1
        ? await this.getS3Auth(
            up as Pan123UploadResp["data"],
            partNumber,
            partNumber + 1,
          )
        : await this.getS3PreSignedUrls(
            up as Pan123UploadResp["data"],
            partNumber,
            partNumber + 1,
          )
    const url = data.presignedUrls[String(partNumber)]
    if (!url) {
      throw new Error(`[123Pan] 未返回第 ${partNumber} 分片的上传 URL`)
    }
    return url
  }

  /**
   * 通知服务端上传完成（供分片会话上传收尾使用）。
   */
  public async completeUpload(
    up: Pick<
      Pan123UploadResp["data"],
      "Bucket" | "Key" | "UploadId" | "FileId" | "StorageNode"
    >,
    size: number,
    isMultipart: boolean,
  ): Promise<void> {
    await this.completeS3(up as Pan123UploadResp["data"], size, isMultipart)
  }

  /**
   * 创建上传会话。返回 S3 分片上传所需的 Bucket/Key/UploadId/FileId/StorageNode。
   * 若服务端命中秒传（Reuse）或未分配 Key，则无需实际上传。
   */
  public async createUpload(
    fileName: string,
    parentFileId: string,
    size: number,
    etag: string,
  ): Promise<Pan123UploadResp["data"]> {
    const body = {
      driveId: 0,
      duplicate: 2, // 2=覆盖 1=重命名 0=默认
      etag,
      fileName,
      parentFileId,
      size,
      type: 0,
    }
    const resp = (await this.request(
      UploadRequest,
      "POST",
      body,
    )) as Pan123UploadResp
    return resp.data
  }

  private async getS3Auth(
    up: Pan123UploadResp["data"],
    start: number,
    end: number,
  ): Promise<Pan123S3PreSignedURLs["data"]> {
    const body = {
      StorageNode: up.StorageNode,
      bucket: up.Bucket,
      key: up.Key,
      partNumberEnd: end,
      partNumberStart: start,
      uploadId: up.UploadId,
    }
    const resp = (await this.request(
      S3Auth,
      "POST",
      body,
    )) as Pan123S3PreSignedURLs
    return resp.data
  }

  private async getS3PreSignedUrls(
    up: Pan123UploadResp["data"],
    start: number,
    end: number,
  ): Promise<Pan123S3PreSignedURLs["data"]> {
    const body = {
      bucket: up.Bucket,
      key: up.Key,
      partNumberEnd: end,
      partNumberStart: start,
      uploadId: up.UploadId,
      StorageNode: up.StorageNode,
    }
    const resp = (await this.request(
      S3PreSignedUrls,
      "POST",
      body,
    )) as Pan123S3PreSignedURLs
    return resp.data
  }

  private async completeS3(
    up: Pan123UploadResp["data"],
    size: number,
    isMultipart: boolean,
  ): Promise<void> {
    await this.request(UploadCompleteV2, "POST", {
      StorageNode: up.StorageNode,
      bucket: up.Bucket,
      fileId: up.FileId,
      fileSize: size,
      isMultipart,
      key: up.Key,
      uploadId: up.UploadId,
    })
  }

  /**
   * 完整上传流程（替代直接 put 的“无状态环境不支持”报错）：
   * 1. 计算 MD5（用于秒传/去重；失败则留空，服务端仍会新建上传）
   * 2. 创建上传会话
   * 3. 按 16MB 分片，逐片 PUT 到预签名 URL（无需 AWS SDK，适合 Cloudflare Workers 等无状态环境）
   * 4. 通知服务端完成上传
   */
  public async uploadFile(
    parentId: string,
    fileName: string,
    content: Buffer,
  ): Promise<void> {
    let etag = ""
    try {
      const cryptoMod = await import("node:crypto")
      etag = cryptoMod.createHash("md5").update(content).digest("hex")
    } catch {
      etag = ""
    }

    const upload = await this.createUpload(
      fileName,
      parentId,
      content.length,
      etag,
    )
    // 秒传命中或未分配 Key：文件已存在，无需实际上传
    if (upload.Reuse || upload.Key === "") {
      return
    }

    const CHUNK = 16 * 1024 * 1024 // 16MB
    let chunkCount = 1
    if (content.length > CHUNK) {
      chunkCount = Math.ceil(content.length / CHUNK)
    }
    let lastChunkSize = content.length % CHUNK
    if (lastChunkSize === 0) lastChunkSize = CHUNK

    // 获取各分片的预签名 PUT URL
    // 注意：123pan S3 预签名接口的 partNumberStart/partNumberEnd 是 [start, end) 半开区间。
    // 单片(end=2 覆盖第1片)；多片(end=chunkCount+1 覆盖 1..chunkCount 全部)。
    let urls: Record<string, string>
    if (chunkCount === 1) {
      urls = (await this.getS3Auth(upload, 1, 2)).presignedUrls
    } else {
      urls = (await this.getS3PreSignedUrls(upload, 1, chunkCount + 1))
        .presignedUrls
    }

    // 逐片上传
    for (let cur = 1; cur <= chunkCount; cur++) {
      const offset = (cur - 1) * CHUNK
      const curSize = cur === chunkCount ? lastChunkSize : CHUNK
      const url = urls[String(cur)]
      if (!url) {
        throw new Error(`[123Pan] 缺少第 ${cur} 分片的上传 URL`)
      }
      const chunk = content.subarray(offset, offset + curSize)
      const res = await fetch(url, { method: "PUT", body: chunk as any })
      if (res.status !== 200) {
        const text = await res.text().catch(() => "")
        throw new Error(
          `[123Pan] 上传第 ${cur}/${chunkCount} 分片失败：HTTP ${res.status} ${text}`,
        )
      }
    }

    // 完成上传
    await this.completeS3(upload, content.length, chunkCount > 1)
  }
}
