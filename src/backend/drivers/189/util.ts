import {
  Cloud189Addition,
  FileItem189,
  FolderItem189,
  FilesResp189,
  DownResp189,
  CapacityResp189,
  AppConfResp189,
  EncryptConfResp189,
  InitMultiUploadResp189,
  UploadPart189,
  UploadUrlsResp189,
} from "./types"
import {
  rsaEncode,
  aes128EcbEncryptHex,
  hmacSha1Hex,
  randomUUID189,
  randomNoCache,
  md5Base64,
} from "./crypto"

/** Cookie 辅助函数 */
function getCookieValue(cookieStr: string, key: string): string | null {
  const match = cookieStr.match(new RegExp(`(?:^|;\\s*)${key}=([^;]*)`))
  return match ? decodeURIComponent(match[1]) : null
}

function setCookieValue(cookieStr: string, key: string, value: string): string {
  const parts = cookieStr ? cookieStr.split(";").map((s) => s.trim()) : []
  const newPart = `${key}=${value}`
  const idx = parts.findIndex((p) => p.startsWith(`${key}=`))
  if (idx !== -1) {
    parts[idx] = newPart
  } else {
    parts.push(newPart)
  }
  return parts.filter(Boolean).join("; ")
}

function mergeSetCookie(
  existingCookie: string,
  setCookieHeader: string | null,
): string {
  if (!setCookieHeader) return existingCookie
  let current = existingCookie
  const entries = setCookieHeader.split(/,(?=\s*[a-zA-Z0-9_\-]+=[^;]+)/)
  for (const entry of entries) {
    const main = entry.split(";")[0].trim()
    const eqIdx = main.indexOf("=")
    if (eqIdx > 0) {
      const k = main.slice(0, eqIdx).trim()
      const v = main.slice(eqIdx + 1).trim()
      current = setCookieValue(current, k, v)
    }
  }
  return current
}

function getSetCookieHeaders(headers: Headers): string[] {
  const withGetSetCookie = headers as Headers & {
    getSetCookie?: () => string[]
  }
  if (typeof withGetSetCookie.getSetCookie === "function") {
    const values = withGetSetCookie.getSetCookie()
    if (values.length > 0) return values
  }

  const combined = headers.get("set-cookie")
  return combined ? [combined] : []
}

/**
 * 189Cloud returns file/folder IDs as JSON numbers. IDs exceed JavaScript's
 * safe integer range, so protect the numeric token before parsing to retain
 * the exact value used by subsequent API requests.
 */
function parseJsonPreservingIds(text: string): any {
  const protectedText = text.replace(
    /("id"\s*:\s*)(-?\d{16,})(?=\s*[,}])/g,
    '$1"$2"',
  )
  return JSON.parse(protectedText)
}

const TRUSTED_REDIRECT_HOSTS = new Set(["cloud.189.cn", "open.e.189.cn"])

function isTrustedHttpsUrl(value: URL): boolean {
  return (
    value.protocol === "https:" && TRUSTED_REDIRECT_HOSTS.has(value.hostname)
  )
}

function hasOAuthParams(value: string): boolean {
  try {
    const url = new URL(value, "https://open.e.189.cn")
    return (
      Boolean(url.searchParams.get("lt")) &&
      Boolean(url.searchParams.get("reqId"))
    )
  } catch {
    return false
  }
}

function isLoggedInUrl(value: string): boolean {
  try {
    const url = new URL(value, "https://open.e.189.cn")
    return (
      url.hostname === "cloud.189.cn" &&
      (url.pathname === "/web/main" || url.pathname === "/main.action")
    )
  } catch {
    return false
  }
}

export class Pan189Client {
  private addition: Cloud189Addition
  private cookie: string = ""
  private cookieDirty = false
  private sessionKey: string = ""
  private rsa = { pubKey: "", pkId: "", expire: 0 }

  constructor(
    addition: Cloud189Addition,
    _onCookieUpdate?: (cookie: string) => void | Promise<void>,
  ) {
    this.addition = addition
    this.cookie = (addition.cookie || "").trim()
  }

  public getCookie(): string {
    return this.cookie
  }

  /**
   * Return a newly merged Cookie once so the storage layer can persist it
   * outside the request's critical path.
   */
  public consumePendingCookie(): string | null {
    if (!this.cookieDirty) return null
    this.cookieDirty = false
    return this.cookie
  }

  public getRootId(): string {
    return this.addition.root_folder_id || "-11"
  }

  public setSessionKey(sessionKey: string): void {
    this.sessionKey = sessionKey
  }

  /** Headers required when proxying a generated 189Cloud download URL. */
  public getDownloadHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Referer: "https://cloud.189.cn/",
    }
    if (this.cookie) headers.Cookie = this.cookie
    return headers
  }

  private async updateCookie(headers: Headers): Promise<void> {
    const setCookies = getSetCookieHeaders(headers)
    if (setCookies.length === 0) return

    const updated = setCookies.reduce(
      (cookie, setCookie) => mergeSetCookie(cookie, setCookie),
      this.cookie,
    )
    if (updated !== this.cookie) {
      this.cookie = updated
      this.cookieDirty = true
    }
  }

  private async followRedirectsWithCookies(
    initialUrl: string,
    headers: Record<string, string>,
  ): Promise<{ response: Response; url: string }> {
    let currentUrl = initialUrl

    for (let redirectCount = 0; redirectCount <= 8; redirectCount++) {
      const currentUrlObj = new URL(currentUrl)
      if (!isTrustedHttpsUrl(currentUrlObj)) {
        throw new Error(
          currentUrlObj.protocol !== "https:"
            ? `[189Cloud] 登录重定向必须使用 HTTPS: ${currentUrlObj.origin}`
            : `[189Cloud] 不受信任的登录重定向地址: ${currentUrlObj.origin}`,
        )
      }
      const requestHeaders: Record<string, string> = { ...headers }
      if (redirectCount > 0) requestHeaders.Referer = currentUrl
      if (this.cookie) requestHeaders.Cookie = this.cookie

      const response = await fetch(currentUrl, {
        method: "GET",
        headers: requestHeaders,
        redirect: "manual",
      })
      await this.updateCookie(response.headers)

      const location = response.headers.get("location")
      const isRedirect = response.status >= 300 && response.status < 400
      if (!isRedirect || !location) {
        // In Workers, Response.url can remain the original URL after a
        // redirect. When it does expose a different final URL, use it so
        // OAuth parameters are not lost just because Location is hidden.
        let terminalUrl = currentUrl
        if (response.url && response.url !== currentUrl) {
          const responseUrl = new URL(response.url, currentUrl)
          if (
            hasOAuthParams(responseUrl.toString()) ||
            isLoggedInUrl(responseUrl.toString())
          ) {
            if (!isTrustedHttpsUrl(responseUrl)) {
              throw new Error(
                responseUrl.protocol !== "https:"
                  ? `[189Cloud] 登录重定向必须使用 HTTPS: ${responseUrl.origin}`
                  : `[189Cloud] 不受信任的登录重定向地址: ${responseUrl.origin}`,
              )
            }
            terminalUrl = responseUrl.toString()
          }
        }
        return { response, url: terminalUrl }
      }
      if (redirectCount === 8) {
        throw new Error("[189Cloud] 登录重定向次数过多")
      }

      const nextUrl = new URL(location, currentUrl)
      if (!isTrustedHttpsUrl(nextUrl)) {
        throw new Error(
          nextUrl.protocol !== "https:"
            ? `[189Cloud] 登录重定向必须使用 HTTPS: ${nextUrl.origin}`
            : `[189Cloud] 不受信任的登录重定向地址: ${nextUrl.origin}`,
        )
      }
      currentUrl = nextUrl.toString()
    }

    throw new Error("[189Cloud] 登录重定向失败")
  }

  private async resolveLoginUrl(
    loginUrl: string,
    headers: Record<string, string>,
  ): Promise<string> {
    let lastUrl = loginUrl
    for (let attempt = 0; attempt < 3; attempt++) {
      const requestUrl = new URL(loginUrl)
      requestUrl.searchParams.set("noCache", randomNoCache())
      const result = await this.followRedirectsWithCookies(
        requestUrl.toString(),
        headers,
      )
      lastUrl = result.url

      if (hasOAuthParams(result.url) || isLoggedInUrl(result.url)) {
        return result.url
      }

      if (attempt < 2) {
        await new Promise((resolve) => setTimeout(resolve, 150 * (attempt + 1)))
      }
    }
    return lastUrl
  }

  /**
   * 登录天翼云盘：
   * 1. 尝试使用已有 Cookie 请求主页判断是否已登录
   * 2. 若未登录且配置了账号密码，执行 open.e.189.cn OAuth2 登录流程
   */
  async login(options: { force?: boolean } = {}): Promise<void> {
    if (this.cookie && !options.force) return

    const loginUrl =
      "https://cloud.189.cn/api/portal/loginUrl.action?redirectURL=https%3A%2F%2Fcloud.189.cn%2Fmain.action"

    const headers: Record<string, string> = {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Referer: "https://cloud.189.cn/",
    }
    if (this.cookie) {
      headers["Cookie"] = this.cookie
    }

    const redirectUrlStr = await this.resolveLoginUrl(loginUrl, headers)
    if (isLoggedInUrl(redirectUrlStr)) {
      // 已经处于登录状态
      return
    }

    if (!this.addition.username || !this.addition.password) {
      if (this.cookie) {
        // 用户仅提供了 Cookie
        return
      }
      throw new Error("[189Cloud] 账号或密码为空，且未提供有效 Cookie")
    }

    let urlObj: URL
    try {
      urlObj = new URL(redirectUrlStr, "https://open.e.189.cn")
    } catch {
      urlObj = new URL("https://open.e.189.cn" + redirectUrlStr)
    }

    const lt = urlObj.searchParams.get("lt") || ""
    const reqId = urlObj.searchParams.get("reqId") || ""
    const appId = urlObj.searchParams.get("appId") || "cloud"
    if (!lt || !reqId) {
      throw new Error("[189Cloud] 登录跳转参数不完整，未获取到 lt 或 reqId")
    }

    const authHeaders = () => {
      const result: Record<string, string> = {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        lt,
        reqid: reqId,
        referer: redirectUrlStr,
        origin: "https://open.e.189.cn",
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        Accept: "application/json;charset=UTF-8",
      }
      if (this.cookie) result.Cookie = this.cookie
      return result
    }

    // 1. 获取 App 配置
    const appConfRes = await fetch(
      "https://open.e.189.cn/api/logbox/oauth2/appConf.do",
      {
        method: "POST",
        headers: authHeaders(),
        body: new URLSearchParams({
          version: "2.0",
          appKey: appId,
        }),
      },
    )
    await this.updateCookie(appConfRes.headers)
    const appConf: AppConfResp189 = await appConfRes.json()
    if (appConf.result !== "0" || !appConf.data) {
      throw new Error(
        `[189Cloud] 获取 AppConf 失败: ${appConf.msg || JSON.stringify(appConf)}`,
      )
    }

    // 2. 获取加密配置 (公钥 & 前缀)
    const encConfRes = await fetch(
      "https://open.e.189.cn/api/logbox/config/encryptConf.do",
      {
        method: "POST",
        headers: authHeaders(),
        body: new URLSearchParams({
          appId,
        }),
      },
    )
    await this.updateCookie(encConfRes.headers)
    const encConf: EncryptConfResp189 = await encConfRes.json()
    if (encConf.result !== 0 || !encConf.data?.pubKey) {
      throw new Error(
        `[189Cloud] 获取 EncryptConf 失败: ${JSON.stringify(encConf)}`,
      )
    }

    const pre = encConf.data.pre || ""
    const pubKey = encConf.data.pubKey

    // 3. RSA 加密用户名和密码
    const encUsername = pre + rsaEncode(this.addition.username, pubKey, true)
    const encPassword = pre + rsaEncode(this.addition.password, pubKey, true)

    // 4. 提交登录
    const loginParams: Record<string, string> = {
      version: "v2.0",
      apToken: "",
      appKey: appId,
      accountType: appConf.data.accountType || "01",
      userName: encUsername,
      epd: encPassword,
      captchaType: "",
      validateCode: "",
      smsValidateCode: "",
      captchaToken: "",
      returnUrl: appConf.data.returnUrl || "https://cloud.189.cn/main.action",
      mailSuffix: appConf.data.mailSuffix || "@189.cn",
      dynamicCheck: "FALSE",
      clientType: String(appConf.data.clientType ?? "10010"),
      cb_SaveName: "3",
      isOauth2: String(appConf.data.isOauth2 ?? false),
      state: "",
      paramId: appConf.data.paramId || "",
    }

    const loginRes = await fetch(
      "https://open.e.189.cn/api/logbox/oauth2/loginSubmit.do",
      {
        method: "POST",
        headers: {
          ...authHeaders(),
        },
        body: new URLSearchParams(loginParams),
      },
    )
    await this.updateCookie(loginRes.headers)
    const loginData = await loginRes.json()
    if (loginData.result !== 0) {
      const msg = loginData.msg || "登录失败"
      if (
        msg.includes("验证码") ||
        msg.includes("滑块") ||
        msg.includes("设备锁")
      ) {
        throw new Error(
          `[189Cloud] 登录触发验证码/设备保护: ${msg}。请在浏览器登录后复制 Cookie 填入配置。`,
        )
      }
      throw new Error(`[189Cloud] 登录失败: ${msg}`)
    }

    // 5. 跟随跳转完成授权
    if (loginData.toUrl) {
      await this.followRedirectsWithCookies(loginData.toUrl, {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      })
    }
  }

  /**
   * 发送 189 API 请求，带 SessionKey 自动恢复与 Cookie 传递
   */
  async request<T = any>(
    url: string,
    options: {
      method?: "GET" | "POST"
      params?: Record<string, string>
      body?: Record<string, string>
      retryOnInvalidSession?: boolean
    } = {},
  ): Promise<T> {
    const method = options.method || "GET"
    const retry = options.retryOnInvalidSession !== false

    const urlObj = new URL(url)
    urlObj.searchParams.set("noCache", randomNoCache())
    if (options.params) {
      for (const [k, v] of Object.entries(options.params)) {
        if (v !== undefined) urlObj.searchParams.set(k, v)
      }
    }

    const headers: Record<string, string> = {
      Accept: "application/json;charset=UTF-8",
      Referer: "https://cloud.189.cn/",
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    }
    if (this.cookie) {
      headers["Cookie"] = this.cookie
    }

    let reqBody: string | undefined = undefined
    if (options.body) {
      headers["Content-Type"] =
        "application/x-www-form-urlencoded; charset=UTF-8"
      reqBody = new URLSearchParams(options.body).toString()
    }

    const res = await fetch(urlObj.toString(), {
      method,
      headers,
      body: reqBody,
    })

    await this.updateCookie(res.headers)

    const text = await res.text()
    let data: any
    try {
      data = parseJsonPreservingIds(text)
    } catch {
      throw new Error(`[189Cloud] 非预期响应: ${text.slice(0, 200)}`)
    }

    const invalidSession =
      data.errorCode === "InvalidSessionKey" ||
      data.res_code === "InvalidSessionKey" ||
      String(data.res_code) === "1010"
    if (invalidSession) {
      if (retry) {
        await this.login({ force: true })
        return this.request<T>(url, {
          ...options,
          retryOnInvalidSession: false,
        })
      }
      throw new Error(
        data.errorMsg || data.res_message || "[189Cloud] 登录会话已失效",
      )
    }

    if (data.errorCode) {
      throw new Error(data.errorMsg || `[189Cloud] API 错误: ${data.errorCode}`)
    }

    if (!res.ok) {
      throw new Error(
        data.errorMsg ||
          data.res_message ||
          `[189Cloud] HTTP 请求失败 (${res.status})`,
      )
    }

    if (data.res_code !== undefined && String(data.res_code) !== "0") {
      throw new Error(
        data.res_message || `189 API 错误 (res_code: ${data.res_code})`,
      )
    }

    return data as T
  }

  private async getFilesPage(
    folderId: string,
    pageNum: number,
    pageSize: string,
  ): Promise<FilesResp189> {
    const orderBy = this.addition.order_by || "lastOpTime"
    const descending =
      (this.addition.order_direction || "desc") === "desc" ? "true" : "false"

    const resp = await this.request<FilesResp189>(
      "https://cloud.189.cn/api/open/file/listFiles.action",
      {
        method: "GET",
        params: {
          pageSize,
          pageNum: String(pageNum),
          mediaType: "0",
          folderId: folderId || this.getRootId(),
          iconOption: "5",
          orderBy,
          descending,
        },
      },
    )

    const rawCount: unknown = resp.fileListAO?.count
    const count =
      typeof rawCount === "number"
        ? rawCount
        : typeof rawCount === "string" && rawCount.trim() !== ""
          ? Number(rawCount)
          : NaN
    if (
      !resp.fileListAO ||
      typeof resp.fileListAO !== "object" ||
      Array.isArray(resp.fileListAO) ||
      !Number.isFinite(count) ||
      count < 0 ||
      !Array.isArray(resp.fileListAO.fileList) ||
      !Array.isArray(resp.fileListAO.folderList)
    ) {
      throw new Error("[189Cloud] 文件列表响应缺少有效的 fileListAO 数组字段")
    }
    return resp
  }

  async validateRoot(folderId: string): Promise<void> {
    await this.getFilesPage(folderId, 1, "1")
  }

  /**
   * 获取目录下的文件与文件夹列表
   */
  async getFiles(
    folderId: string,
    options?: {
      findName?: string
      findIsDir?: boolean
      budget?: { used: number; limit: number }
    },
  ): Promise<{ files: FileItem189[]; folders: FolderItem189[] }> {
    const allFiles: FileItem189[] = []
    const allFolders: FolderItem189[] = []
    let pageNum = 1
    const pageSize = "60"

    while (true) {
      if (options?.budget) {
        if (options.budget.used >= options.budget.limit) {
          console.warn(
            "[189Cloud] Cloudflare Worker subrequest budget limit reached.",
          )
          break
        }
        options.budget.used++
      }

      const resp = await this.getFilesPage(folderId, pageNum, pageSize)

      const fileListAO = resp.fileListAO!
      if (Number(fileListAO.count) === 0) {
        break
      }

      const files = fileListAO.fileList || []
      const folders = fileListAO.folderList || []

      allFolders.push(...folders)
      allFiles.push(...files)

      // Early-exit check if searching for a specific item
      if (options?.findName) {
        if (
          options.findIsDir &&
          folders.some((f) => f.name === options.findName)
        ) {
          break
        }
        if (
          !options.findIsDir &&
          files.some((f) => f.name === options.findName)
        ) {
          break
        }
      }

      if (files.length + folders.length < parseInt(pageSize, 10)) {
        break
      }
      pageNum++
    }

    return { files: allFiles, folders: allFolders }
  }

  /**
   * 获取文件直链与详情
   */
  async getDownloadUrl(fileId: string): Promise<string> {
    const resp = await this.request<DownResp189>(
      "https://cloud.189.cn/api/portal/getFileInfo.action",
      {
        method: "GET",
        params: { fileId },
      },
    )

    const rawUrl = resp.fileDownloadUrl || resp.downloadUrl
    if (!rawUrl) {
      throw new Error(`[189Cloud] 获取文件下载地址失败 (fileId: ${fileId})`)
    }

    let downloadUrl = rawUrl.startsWith("//") ? "https:" + rawUrl : rawUrl
    downloadUrl = downloadUrl.replace(/^http:\/\//i, "https://")

    // 尝试解析一次 302 重定向获得直接 CDN 地址
    try {
      const probeRes = await fetch(downloadUrl, {
        method: "GET",
        headers: this.getDownloadHeaders(),
        redirect: "manual",
      })
      const loc = probeRes.headers.get("location")
      if (probeRes.status === 302 && loc) {
        downloadUrl = loc.replace(/^http:\/\//i, "https://")
      }
    } catch {
      // Ignore probe errors, fall back to initial downloadUrl
    }

    return downloadUrl
  }

  private async getSessionKey(): Promise<string> {
    const resp = await this.request<any>(
      "https://cloud.189.cn/v2/getUserBriefInfo.action",
      { method: "GET" },
    )
    const sessionKey = String(resp.sessionKey || "")
    if (!sessionKey) throw new Error("[189Cloud] 获取上传 SessionKey 失败")
    return sessionKey
  }

  private async getResKey(): Promise<{ pubKey: string; pkId: string }> {
    if (this.rsa.pubKey && this.rsa.pkId && this.rsa.expire > Date.now()) {
      return this.rsa
    }
    const resp = await this.request<any>(
      "https://cloud.189.cn/api/security/generateRsaKey.action",
      { method: "GET" },
    )
    const pubKey = String(resp.pubKey || "")
    const pkId = String(resp.pkId || "")
    if (!pubKey || !pkId) throw new Error("[189Cloud] 获取上传 RSA 公钥失败")
    this.rsa = {
      pubKey,
      pkId,
      expire: Number(resp.expire) || Date.now() + 5 * 60_000,
    }
    return this.rsa
  }

  /** Call the encrypted upload.cloud.189.cn API used by OpenList. */
  private async uploadRequest<T = any>(
    uri: string,
    form: Record<string, string>,
  ): Promise<T> {
    if (!this.sessionKey) this.sessionKey = await this.getSessionKey()
    const requestDate = String(Date.now())
    const requestId = randomUUID189()
    const randomKey = randomUUID189("xxxxxxxxxxxx4xxxyxxxxxxxxxxxxxxx").slice(
      0,
      16 + Math.floor(Math.random() * 17),
    )
    const params = Object.keys(form)
      .sort()
      .map((key) => `${key}=${form[key]}`)
      .join("&")
    const encryptedParams = aes128EcbEncryptHex(params, randomKey.slice(0, 16))
    const signature = hmacSha1Hex(
      `SessionKey=${this.sessionKey}&Operate=GET&RequestURI=${uri}&Date=${requestDate}&params=${encryptedParams}`,
      randomKey,
    )
    const { pubKey, pkId } = await this.getResKey()
    const headers: Record<string, string> = {
      accept: "application/json;charset=UTF-8",
      SessionKey: this.sessionKey,
      Signature: signature,
      "X-Request-Date": requestDate,
      "X-Request-ID": requestId,
      EncryptionText: rsaEncode(randomKey, pubKey, false),
      PkId: pkId,
    }
    if (this.cookie) headers.Cookie = this.cookie

    const response = await fetch(
      `https://upload.cloud.189.cn${uri}?params=${encryptedParams}`,
      { method: "GET", headers },
    )
    await this.updateCookie(response.headers)
    const text = await response.text()
    if (!response.ok) {
      throw new Error(
        `[189Cloud] 上传接口 HTTP ${response.status}: ${text.slice(0, 200)}`,
      )
    }
    let data: any
    try {
      data = parseJsonPreservingIds(text)
    } catch {
      throw new Error(`[189Cloud] 上传接口返回无效响应: ${text.slice(0, 200)}`)
    }
    if (data.code !== "SUCCESS") {
      throw new Error(
        data.msg || data.message || `[189Cloud] 上传接口失败: ${uri}`,
      )
    }
    return data as T
  }

  async createMultiUpload(
    parentFolderId: string,
    fileName: string,
    fileSize: number,
    fileMd5: string,
  ): Promise<{
    uploadFileId: string
    fileDataExists: boolean
    sessionKey: string
  }> {
    const sessionKey = await this.getSessionKey()
    this.sessionKey = sessionKey
    const baseParams = {
      parentFolderId,
      fileName: encodeURIComponent(fileName).replace(/%20/g, "+"),
      fileSize: String(fileSize),
      sliceSize: String(10 * 1024 * 1024),
    }
    let response: InitMultiUploadResp189
    try {
      response = await this.uploadRequest<InitMultiUploadResp189>(
        "/person/initMultiUpload",
        { ...baseParams, fileMd5, sliceMd5: fileMd5 },
      )
    } catch (error: any) {
      const message = String(error?.message || error)
      if (
        !/InfoSecurityErrorCode|file md5 is in black list|security check not pass/i.test(
          message,
        )
      ) {
        throw error
      }
      // Match OpenList's ordinary 189PC upload: omit MD5 during init so
      // Tianyi's security filter does not reject the file before upload.
      response = await this.uploadRequest<InitMultiUploadResp189>(
        "/person/initMultiUpload",
        { ...baseParams, lazyCheck: "1" },
      )
    }
    const uploadFileId = String(response.data?.uploadFileId || "")
    if (!uploadFileId)
      throw new Error("[189Cloud] 创建上传会话失败：缺少 uploadFileId")
    return {
      uploadFileId,
      fileDataExists: String(response.data?.fileDataExists || "0") === "1",
      sessionKey,
    }
  }

  async getMultiUploadUrls(
    uploadFileId: string,
    partNumber: number,
    content: Uint8Array,
  ): Promise<UploadPart189> {
    const response = await this.uploadRequest<UploadUrlsResp189>(
      "/person/getMultiUploadUrls",
      {
        partInfo: `${partNumber}-${md5Base64(content)}`,
        uploadFileId,
      },
    )
    const uploadPart = response.uploadUrls?.[`partNumber_${partNumber}`]
    if (!uploadPart?.requestURL) {
      throw new Error(`[189Cloud] 获取第 ${partNumber} 个分片上传地址失败`)
    }
    return uploadPart
  }

  async commitMultiUpload(
    uploadFileId: string,
    fileMd5: string,
    sliceMd5: string,
  ): Promise<void> {
    await this.uploadRequest("/person/commitMultiUploadFile", {
      uploadFileId,
      fileMd5,
      sliceMd5,
      lazyCheck: "1",
      opertype: "3",
    })
  }

  /**
   * 创建文件夹
   */
  async mkdir(parentFolderId: string, folderName: string): Promise<void> {
    await this.request(
      "https://cloud.189.cn/api/open/file/createFolder.action",
      {
        method: "POST",
        body: {
          parentFolderId: parentFolderId || this.getRootId(),
          folderName,
        },
      },
    )
  }

  /**
   * 重命名文件或文件夹
   */
  async rename(id: string, isFolder: boolean, newName: string): Promise<void> {
    const url = isFolder
      ? "https://cloud.189.cn/api/open/file/renameFolder.action"
      : "https://cloud.189.cn/api/open/file/renameFile.action"

    const body: Record<string, string> = isFolder
      ? { folderId: id, destFolderName: newName }
      : { fileId: id, destFileName: newName }

    await this.request(url, {
      method: "POST",
      body,
    })
  }

  /**
   * 批量任务：移动 / 复制 / 删除
   */
  private async batchTask(
    type: "MOVE" | "COPY" | "DELETE",
    items: Array<{ id: string; name: string; isFolder: boolean }>,
    targetFolderId: string = "",
  ): Promise<void> {
    const taskInfos = items.map((item) => ({
      fileId: item.id,
      fileName: item.name,
      isFolder: item.isFolder ? 1 : 0,
    }))

    await this.request(
      "https://cloud.189.cn/api/open/batch/createBatchTask.action",
      {
        method: "POST",
        body: {
          type,
          targetFolderId,
          taskInfos: JSON.stringify(taskInfos),
        },
      },
    )
  }

  async move(
    fileId: string,
    isFolder: boolean,
    fileName: string,
    targetFolderId: string,
  ): Promise<void> {
    await this.batchTask(
      "MOVE",
      [{ id: fileId, name: fileName, isFolder }],
      targetFolderId,
    )
  }

  async copy(
    fileId: string,
    isFolder: boolean,
    fileName: string,
    targetFolderId: string,
  ): Promise<void> {
    await this.batchTask(
      "COPY",
      [{ id: fileId, name: fileName, isFolder }],
      targetFolderId,
    )
  }

  async remove(
    fileId: string,
    isFolder: boolean,
    fileName: string,
  ): Promise<void> {
    await this.batchTask(
      "DELETE",
      [{ id: fileId, name: fileName, isFolder }],
      "",
    )
  }

  /**
   * 获取容量信息
   */
  async getCapacityInfo(): Promise<CapacityResp189> {
    return this.request<CapacityResp189>(
      "https://cloud.189.cn/api/portal/getUserSizeInfo.action",
      { method: "GET" },
    )
  }
}
