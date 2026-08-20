import {
  Cloud189Addition,
  FileItem189,
  FolderItem189,
  FilesResp189,
  DownResp189,
  CapacityResp189,
  AppConfResp189,
  EncryptConfResp189,
} from "./types"
import {
  rsaEncode,
  aes128EcbEncryptHex,
  hmacSha1Hex,
  randomUUID189,
  randomNoCache,
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
  const entries = setCookieHeader.split(/,(?=[a-zA-Z0-9_\-]+=[^;]+)/)
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

export class Pan189Client {
  private addition: Cloud189Addition
  private cookie: string = ""
  private sessionKey: string = ""
  private onCookieUpdate?: (cookie: string) => void

  constructor(
    addition: Cloud189Addition,
    onCookieUpdate?: (cookie: string) => void,
  ) {
    this.addition = addition
    this.cookie = (addition.cookie || "").trim()
    this.onCookieUpdate = onCookieUpdate
  }

  public getCookie(): string {
    return this.cookie
  }

  public getRootId(): string {
    return this.addition.root_folder_id || "-11"
  }

  private updateCookie(setCookie: string | null) {
    if (!setCookie) return
    const updated = mergeSetCookie(this.cookie, setCookie)
    if (updated !== this.cookie) {
      this.cookie = updated
      this.onCookieUpdate?.(this.cookie)
    }
  }

  /**
   * 登录天翼云盘：
   * 1. 尝试使用已有 Cookie 请求主页判断是否已登录
   * 2. 若未登录且配置了账号密码，执行 open.e.189.cn OAuth2 登录流程
   */
  async login(): Promise<void> {
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

    const res = await fetch(loginUrl, {
      method: "GET",
      headers,
      redirect: "manual",
    })

    this.updateCookie(res.headers.get("set-cookie"))

    const loc = res.headers.get("location") || ""
    if (
      loc.includes("cloud.189.cn/web/main") ||
      loc.includes("cloud.189.cn/main.action") ||
      res.url.includes("cloud.189.cn/web/main")
    ) {
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

    // 从跳转链接中提取参数
    const redirectUrlStr = loc || res.url
    let urlObj: URL
    try {
      urlObj = new URL(redirectUrlStr, "https://open.e.189.cn")
    } catch {
      urlObj = new URL("https://open.e.189.cn" + redirectUrlStr)
    }

    const lt = urlObj.searchParams.get("lt") || ""
    const reqId = urlObj.searchParams.get("reqId") || ""
    const appId = urlObj.searchParams.get("appId") || "cloud"

    const authHeaders: Record<string, string> = {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      lt,
      reqid: reqId,
      referer: redirectUrlStr,
      origin: "https://open.e.189.cn",
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      Accept: "application/json;charset=UTF-8",
    }
    if (this.cookie) authHeaders["Cookie"] = this.cookie

    // 1. 获取 App 配置
    const appConfRes = await fetch(
      "https://open.e.189.cn/api/logbox/oauth2/appConf.do",
      {
        method: "POST",
        headers: authHeaders,
        body: new URLSearchParams({
          version: "2.0",
          appKey: appId,
        }),
      },
    )
    this.updateCookie(appConfRes.headers.get("set-cookie"))
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
        headers: authHeaders,
        body: new URLSearchParams({
          appId,
        }),
      },
    )
    this.updateCookie(encConfRes.headers.get("set-cookie"))
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
          ...authHeaders,
          Cookie: this.cookie,
        },
        body: new URLSearchParams(loginParams),
      },
    )
    this.updateCookie(loginRes.headers.get("set-cookie"))
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
      const authFinishRes = await fetch(loginData.toUrl, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Cookie: this.cookie,
        },
        redirect: "follow",
      })
      this.updateCookie(authFinishRes.headers.get("set-cookie"))
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

    this.updateCookie(res.headers.get("set-cookie"))

    const text = await res.text()
    let data: any
    try {
      data = JSON.parse(text)
    } catch {
      throw new Error(`[189Cloud] 非预期响应: ${text.slice(0, 200)}`)
    }

    // 检查 SessionKey 过期
    if (
      data.errorCode === "InvalidSessionKey" ||
      data.res_code === "InvalidSessionKey" ||
      data.res_code === 1010
    ) {
      if (retry) {
        await this.login()
        return this.request<T>(url, {
          ...options,
          retryOnInvalidSession: false,
        })
      }
    }

    if (data.res_code !== undefined && data.res_code !== 0) {
      throw new Error(
        data.res_message || `189 API 错误 (res_code: ${data.res_code})`,
      )
    }

    return data as T
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

    const orderBy = this.addition.order_by || "lastOpTime"
    const descending =
      (this.addition.order_direction || "desc") === "desc" ? "true" : "false"

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

      const fileListAO = resp.fileListAO
      if (!fileListAO || fileListAO.count === 0) {
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
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Referer: "https://cloud.189.cn/",
        },
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
