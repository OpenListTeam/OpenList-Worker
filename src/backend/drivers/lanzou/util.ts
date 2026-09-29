import {
  LanzouAddition,
  LanzouFileOrFolder,
  LanzouFileShare,
  LanzouShareResp,
} from "./types"
import {
  mustParseTime,
  sizeStrToInt64,
  removeNotes,
  removeJSComment,
  calcAcwScV2,
  htmlJsonToMap,
  getJSFunctionByName,
} from "./help"

/** 蓝奏云分享页候选域名（分享 ID 全局可用，任一域名都能访问同一分享）。
 *  数据中心出口 IP（如 CF Workers）被某个 CDN 域名 WAF 拦截时，可自动切换到其他域名重试。 */
const LANZOU_SHARE_DOMAINS = [
  "pan.lanzoui.com",
  "lanzouw.com",
  "lanzoux.com",
  "lanzouy.com",
  "lanzou.com",
]

/** 蓝奏云 Cookie 过期提示文案（cookie 有效期约 15 天） */
const COOKIE_EXPIRED_MSG = "[Lanzou] Cookie 已过期或失效，请在管理后台重新填写 Cookie（有效期约 15 天）"

export class LanzouClient {
  private addition: LanzouAddition
  private cookie: string = ""
  private uid: string = ""
  private vei: string = ""
  private onCookieUpdate?: (cookie: string) => void
  /** acw_sc__v2 挑战值，按域名缓存（cookie 域绑定）。
   *  求解后持久化，后续请求都携带对应域名的值；
   *  数据中心 IP（CF Workers）不带此 cookie 会被蓝奏云 CDN WAF 403。 */
  private acwMap = new Map<string, string>()
  /** 故障转移后成功的工作域名（如 lanzouw.com）。
   *  记录后后续分享域请求优先使用它，避免分享页与 ajaxfile.php 跨域导致 sign 失效。 */
  private workingShareHost: string = ""

  constructor(
    addition: LanzouAddition,
    onCookieUpdate?: (cookie: string) => void,
  ) {
    this.addition = addition
    this.cookie = (addition.cookie || "").trim()
    this.onCookieUpdate = onCookieUpdate
  }

  public getBaseUrl(): string {
    return (
      this.addition.baseUrl ||
      (this.addition as any).base_url ||
      "https://pc.woozooo.com"
    ).replace(/\/$/, "")
  }

  public getShareUrl(): string {
    return (
      this.addition.shareUrl ||
      (this.addition as any).share_url ||
      "https://pan.lanzoui.com"
    ).replace(/\/$/, "")
  }

  /** 分享页域名对应的主机名（用于 acw_sc__v2 按域缓存） */
  private shareHost(): string {
    try {
      return new URL(this.getShareUrl()).host
    } catch {
      return "pan.lanzoui.com"
    }
  }

  public getUserAgent(): string {
    return (
      this.addition.user_agent ||
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    )
  }

  public getCookie(): string {
    return this.cookie
  }

  private updateCookie(setCookie: string | null, host?: string) {
    if (!setCookie) return
    // set-cookie 里可能直接下发 acw_sc__v2（WAF 挑战通过后），按域缓存
    const acwMatch = setCookie.match(
      /(?:^|,\s*)acw_sc__v2=([^;,\s]+)/i,
    )
    if (acwMatch && acwMatch[1]) {
      this.acwMap.set(host || this.shareHost(), acwMatch[1])
    }
    const parts = this.cookie ? this.cookie.split(";").map((s) => s.trim()) : []
    const entries = setCookie.split(/,(?=[a-zA-Z0-9_\-]+=[^;]+)/)
    for (const entry of entries) {
      const main = entry.split(";")[0].trim()
      const eqIdx = main.indexOf("=")
      if (eqIdx > 0) {
        const k = main.slice(0, eqIdx).trim()
        const v = main.slice(eqIdx + 1).trim()
        const idx = parts.findIndex((p) => p.startsWith(`${k}=`))
        if (idx !== -1) {
          parts[idx] = `${k}=${v}`
        } else {
          parts.push(`${k}=${v}`)
        }
      }
    }
    const updated = parts.filter(Boolean).join("; ")
    if (updated !== this.cookie) {
      this.cookie = updated
      this.onCookieUpdate?.(this.cookie)
    }
  }

  /**
   * 初始化驱动并获取凭证
   */
  async init(): Promise<void> {
    const type = this.addition.type || "cookie"
    if (type === "account") {
      await this.login()
      await this.initVeiAndUid()
    } else if (type === "cookie") {
      if (this.cookie) {
        await this.initVeiAndUid()
      }
    }
    // 预热 acw_sc__v2：主动请求一次分享页触发/通过 WAF 挑战，
    // 让后续 ajaxfile.php 等请求都带上 acw_sc__v2 cookie（数据中心 IP 必需）
    if (!this.acwMap.has(this.shareHost())) {
      try {
        await this.request(`${this.getShareUrl()}/`, "GET")
      } catch {}
    }
  }

  /**
   * 探测分享页真实域名。
   * 蓝奏云每个账号的分享页域名都不同（如 https://自定义部分.lanzn.com），
   * 配置的 shareUrl 只是兜底。向兜底域名请求一次分享页，从页面 HTML 的
   * iframe/src 或 JS 变量里提取真实分享域名；失败时回退到配置域名。
   */
  async probeShareDomain(shareId: string): Promise<string> {
    const cleanShareId = (shareId || "").replace(/^\//, "")
    if (!cleanShareId) return this.getShareUrl()
    try {
      const pageData = await this.request(
        `${this.getShareUrl()}/${cleanShareId}`,
        "GET",
      )
      const realDomain = this.extractRealShareDomain(pageData)
      return realDomain || this.getShareUrl()
    } catch {
      return this.getShareUrl()
    }
  }

  /** 从分享页 HTML 中提取真实分享域名（iframe src / /fn? 链接 / 域名变量） */
  private extractRealShareDomain(pageData: string): string {
    const candidates: string[] = []
    const iframeMatch = pageData.match(/<iframe[^>]*?src=["'](https?:\/\/[^"'/]+)/i)
    if (iframeMatch) candidates.push(iframeMatch[1])
    const fnMatch = pageData.match(/["'](https?:\/\/[^"']*?\/fn\?[^"']*)["']/i)
    if (fnMatch) candidates.push(fnMatch[1])
    const domMatch = pageData.match(/["']?(?:dom|url)\s*[:=]\s*["']?(https?:\/\/[^"'\s]+)/i)
    if (domMatch) candidates.push(domMatch[1])
    for (const raw of candidates) {
      try {
        const u = new URL(raw)
        return `${u.protocol}//${u.host}`
      } catch {
        // 继续下一个候选
      }
    }
    return ""
  }

  /**
   * 账号密码登录
   */
  async login(): Promise<void> {
    if (!this.addition.account || !this.addition.password) {
      throw new Error("[Lanzou] 账号模式下必须提供账号与密码")
    }

    for (let retry = 0; retry < 3; retry++) {
      const headers: Record<string, string> = {
        "User-Agent": this.getUserAgent(),
        Referer: "https://pc.woozooo.com",
        "Content-Type": "application/x-www-form-urlencoded",
      }
      if (this.acwMap.has("up.woozooo.com")) {
        headers["Cookie"] = `acw_sc__v2=${this.acwMap.get("up.woozooo.com")}`
      }

      const res = await fetch("https://up.woozooo.com/mlogin.php", {
        method: "POST",
        headers,
        body: new URLSearchParams({
          task: "3",
          uid: this.addition.account,
          pwd: this.addition.password,
          setSessionId: "",
          setSig: "",
          setScene: "",
          setTocen: "",
          formhash: "",
        }),
      })

      this.updateCookie(res.headers.get("set-cookie"), "up.woozooo.com")
      const bodyStr = await res.text()

      if (bodyStr.includes("acw_sc__v2")) {
        this.acwMap.set("up.woozooo.com", calcAcwScV2(bodyStr))
        continue
      }

      let data: any
      try {
        data = JSON.parse(bodyStr)
      } catch {
        throw new Error(`[Lanzou] 登录响应异常: ${bodyStr.slice(0, 200)}`)
      }

      if (data.zt !== 1) {
        throw new Error(`[Lanzou] 登录失败: ${data.info || bodyStr}`)
      }

      return
    }

    throw new Error("[Lanzou] 登录多次触发 WAF 校验失败")
  }

  /**
   * 从 mydisk.php 获取 uid 与 vei 凭证
   */
  async initVeiAndUid(): Promise<void> {
    const html = await this.request(
      `${this.getBaseUrl()}/mydisk.php?item=files&action=index`,
      "GET",
    )

    const uidMatch = html.match(/uid=([^'"&;]+)/)
    if (!uidMatch) {
      throw new Error(COOKIE_EXPIRED_MSG)
    }
    this.uid = uidMatch[1]

    const cleanHtml = removeNotes(html)
    try {
      const data = htmlJsonToMap(cleanHtml)
      this.vei = data["vei"] || ""
    } catch {
      const veiMatch = html.match(/['"]?vei['"]?\s*:\s*['"]?([^'",\s]+)['"]?/)
      if (veiMatch) this.vei = veiMatch[1]
    }
  }

  /**
   * 通用 HTTP 请求（包含 acw_sc__v2 自动求解、down_ip 头处理、
   *  以及分享页请求被 CDN 403 时自动切换其他蓝奏云域名重试）
   */
  async request(
    url: string,
    method: "GET" | "POST" = "GET",
    body?: Record<string, string>,
    customReferer?: string,
  ): Promise<string> {
    // 若已记录工作域名，且当前 URL 属于分享域（getShareUrl 或其候选域），
    // 则优先把 URL 切换到工作域名，确保分享页与 ajaxfile.php 同域（sign 绑定域名）。
    let effectiveUrl = url
    const urlHost = safeHost(url)
    const isShareHost =
      urlHost === this.shareHost() ||
      LANZOU_SHARE_DOMAINS.includes(urlHost)
    if (isShareHost && this.workingShareHost && urlHost !== this.workingShareHost) {
      effectiveUrl = targetUrlWithDomain(url, this.workingShareHost)
    }

    // 分享页请求 403/405 时自动切换候选域名重试（数据中心 IP 被单域名 WAF 拦截时有用）
    const isShareDomainReq = isShareHost
    const shareCandidates = isShareDomainReq
      ? LANZOU_SHARE_DOMAINS.filter((d) => !url.includes(d))
      : []

    const tryUrl = (targetUrl: string): Promise<string> => {
      const targetHost = safeHost(targetUrl)
      const targetIsShareDomain =
        targetHost === this.shareHost() ||
        LANZOU_SHARE_DOMAINS.includes(targetHost)
      // referer 必须与目标 URL 同域（蓝奏云对跨域 AJAX 返回 zt=0/403）
      let referer: string
      if (targetIsShareDomain) {
        // 分享域请求：referer 用目标域名自身（优先）或重写后的 customReferer
        if (customReferer && LANZOU_SHARE_DOMAINS.includes(safeHost(customReferer))) {
          referer = targetUrlWithDomain(customReferer, targetHost)
        } else if (customReferer && safeHost(customReferer) === this.shareHost()) {
          referer = targetUrlWithDomain(customReferer, targetHost)
        } else {
          referer = `${new URL(targetUrl).origin}/`
        }
      } else {
        referer = customReferer || this.getBaseUrl()
      }

      return this.requestOnce(
        targetUrl,
        method,
        body,
        referer,
        targetHost,
      )
    }

    try {
      return await tryUrl(effectiveUrl)
    } catch (err: any) {
      // 仅在分享页请求（非 baseUrl API）且确实被 WAF/403/405 拒绝时换域名重试
      const blocked =
        isShareDomainReq &&
        (err?.status === 403 || err?.status === 405 || /403|405/.test(err?.message || ""))
      if (!blocked) throw err
      for (const domain of shareCandidates) {
        const altUrl = targetUrlWithDomain(effectiveUrl, domain)
        try {
          const result = await tryUrl(altUrl)
          // 记录成功的工作域名，后续分享域请求优先使用
          this.workingShareHost = domain
          return result
        } catch (e2: any) {
          const stillBlocked =
            e2?.status === 403 || e2?.status === 405 || /403|405/.test(e2?.message || "")
          if (!stillBlocked) throw e2
          // 继续尝试下一个域名
        }
      }
      throw err
    }
  }

  /**
   * 单次请求（含 acw_sc__v2 求解与重试）
   */
  private async requestOnce(
    url: string,
    method: "GET" | "POST",
    body: Record<string, string> | undefined,
    referer: string,
    host: string,
  ): Promise<string> {
    for (let retry = 0; retry < 3; retry++) {
      const headers: Record<string, string> = {
        Referer: referer,
        "User-Agent": this.getUserAgent(),
        "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
        // 蓝奏云 WAF 校验 AJAX 请求必须带 X-Requested-With，否则返回 403/405
        "X-Requested-With": "XMLHttpRequest",
        // 模拟浏览器 AJAX 的 Fetch 元数据头，降低被 WAF 拦的概率
        "Sec-Fetch-Dest": "empty",
        "Sec-Fetch-Mode": "cors",
        "Sec-Fetch-Site": "same-origin",
        Accept: "*/*",
      }
      // 同源 AJAX 请求带 Origin（与 Referer 同域）
      const refHost = (() => {
        try {
          return new URL(referer).host
        } catch {
          return ""
        }
      })()
      if (refHost === host) {
        headers["Origin"] = referer.slice(0, referer.indexOf(refHost) + refHost.length)
      }

      let cookieStr = this.cookie
      if (url.includes("/file/")) {
        cookieStr = (cookieStr ? cookieStr + "; " : "") + "down_ip=1"
      }
      const acw = this.acwMap.get(host)
      if (acw) {
        cookieStr = (cookieStr ? cookieStr + "; " : "") + `acw_sc__v2=${acw}`
      }
      if (cookieStr) {
        headers["Cookie"] = cookieStr
      }

      let reqBody: string | undefined = undefined
      if (body && method === "POST") {
        headers["Content-Type"] =
          "application/x-www-form-urlencoded; charset=UTF-8"
        reqBody = new URLSearchParams(body).toString()
      }

      const res = await fetch(url, {
        method,
        headers,
        body: reqBody,
      })

      // 先处理 set-cookie（403 时 WAF 也可能下发 acw_sc__v2，必须缓存）
      this.updateCookie(res.headers.get("set-cookie"), host)

      if (res.status === 403 || res.status === 405) {
        const err: any = new Error(`[Lanzou] ${url} 返回 HTTP ${res.status}`)
        err.status = res.status
        throw err
      }

      // 偶发的 429/5xx/网络波动不是业务错误：延迟后重试（蓝奏云限流常见）
      if (
        res.status === 429 ||
        res.status >= 500 ||
        res.status === 408
      ) {
        if (retry < 2) {
          await new Promise((resolve) =>
            setTimeout(resolve, 300 * (retry + 1)),
          )
          continue
        }
        const err: any = new Error(
          `[Lanzou] ${url} 返回 HTTP ${res.status}（多次重试仍失败）`,
        )
        err.status = res.status
        throw err
      }

      const bodyStr = await res.text()

      if (bodyStr.includes("acw_sc__v2")) {
        this.acwMap.set(host, calcAcwScV2(bodyStr))
        continue
      }

      return bodyStr
    }

    throw new Error("[Lanzou] 请求触发 acw_sc__v2 校验超限")
  }

  /**
   * 执行 doupload.php 后台任务
   */
  async doupload(params: Record<string, string>): Promise<any> {
    const url = `${this.getBaseUrl()}/doupload.php?uid=${this.uid}&vei=${this.vei}`
    const bodyStr = await this.request(url, "POST", params)
    let data: any
    try {
      data = JSON.parse(bodyStr)
    } catch {
      throw new Error(`[Lanzou] 非 JSON 响应: ${bodyStr.slice(0, 200)}`)
    }

    if (data.zt === 9) {
      if (this.addition.type === "account") {
        await this.login()
        await this.initVeiAndUid()
        return this.doupload(params)
      }
      throw new Error(COOKIE_EXPIRED_MSG)
    }

    if (data.zt !== 1 && data.zt !== 2 && data.zt !== 4) {
      throw new Error(
        data.inf || data.info || `[Lanzou] API 错误 (zt: ${data.zt})`,
      )
    }

    return data
  }

  /**
   * 主动校验当前 Cookie 是否有效。
   * 蓝奏云 Cookie 有效期约 15 天，过期后 doupload 返回 zt=9。
   * 此处通过请求根目录文件列表来探测；url 模式（公开分享）不依赖 Cookie，恒为有效。
   * @returns { valid: true } 或 { valid: false, error: 过期提示 }
   */
  async checkCookieValid(): Promise<{ valid: boolean; error?: string }> {
    if (this.addition.type === "url") {
      return { valid: true }
    }
    try {
      if (this.addition.type === "account") {
        // account 模式自动重登，无需手动更新 Cookie
        return { valid: true }
      }
      // cookie 模式：请求一次根目录列表探测有效性
      await this.getFiles("-1")
      return { valid: true }
    } catch (err: any) {
      const msg = err?.message || String(err)
      // 过期/uid 丢失/WAF 拒绝都视为 Cookie 失效，给出明确提示
      return {
        valid: false,
        error: /Cookie 已过期|未能获取到 uid|请检查 Cookie|zt=9/i.test(msg)
          ? COOKIE_EXPIRED_MSG
          : msg,
      }
    }
  }

  /**
   * 获取个人网盘目录下所有文件夹与文件
   */
  async getAllFiles(folderId: string): Promise<LanzouFileOrFolder[]> {
    const folders = await this.getFolders(folderId)
    const files = await this.getFiles(folderId)
    return [...folders, ...files]
  }

  async getFolders(folderId: string): Promise<LanzouFileOrFolder[]> {
    const resp = await this.doupload({
      task: "47",
      folder_id: folderId || "-1",
    })
    const list: any[] = resp.text || []
    return list.map((item) => ({
      ...item,
      name: item.name,
      fol_id: item.fol_id || item.id,
      is_folder: true,
    }))
  }

  async getFiles(folderId: string): Promise<LanzouFileOrFolder[]> {
    const allFiles: LanzouFileOrFolder[] = []
    for (let pg = 1; ; pg++) {
      const resp = await this.doupload({
        task: "5",
        folder_id: folderId || "-1",
        pg: String(pg),
      })
      const list: any[] = resp.text || []
      if (list.length === 0) break
      allFiles.push(
        ...list.map((item) => ({
          ...item,
          name_all: item.name_all || item.name,
          id: item.id,
          size: item.size,
          time: item.time,
          is_folder: false,
        })),
      )
    }
    return allFiles
  }

  /**
   * 获取个人盘文件的公开分享信息
   */
  async getFileShareUrlById(fileId: string): Promise<LanzouFileShare> {
    const resp = await this.doupload({
      task: "22",
      file_id: fileId,
    })
    return resp.info || {}
  }

  /**
   * 通过公开分享页面获取目录或单个文件
   */
  async getFileOrFolderByShareUrl(
    shareId: string,
    pwd: string = "",
  ): Promise<LanzouFileOrFolder[]> {
    const cleanShareId = shareId.replace(/^\//, "")
    const pageData = await this.request(
      `${this.getShareUrl()}/${cleanShareId}`,
      "GET",
    )

    if (pageData.includes("取消分享")) {
      throw new Error("[Lanzou] 该文件已取消分享")
    }
    if (pageData.includes("文件不存在")) {
      throw new Error("[Lanzou] 文件不存在")
    }

    const isFile = /class="fileinfo"|id="file"|文件描述/i.test(pageData)
    if (!isFile) {
      // 目录分享
      return this.getFolderByShareUrl(pwd, pageData)
    } else {
      // 单文件分享
      const file = await this.getFilesByShareUrl(cleanShareId, pwd, pageData)
      return [file]
    }
  }

  /**
   * 解析分享目录列表
   */
  private async getFolderByShareUrl(
    pwd: string,
    sharePageData: string,
  ): Promise<LanzouFileOrFolder[]> {
    const cleanHtml = removeNotes(sharePageData)
    let form: Record<string, string> = {}
    try {
      form = htmlJsonToMap(cleanHtml)
    } catch {
      form = {}
    }

    const files: LanzouFileOrFolder[] = []

    // 匹配子文件夹
    const subFolderMatches = Array.from(
      sharePageData.matchAll(
        /(?:folderlink|mbxfolder)[^>]*href=["']\/?([^"']+)["'][^>]*>(.+?)<\//gi,
      ),
    )
    for (const m of subFolderMatches) {
      files.push({
        id: m[1],
        name_all: m[2].trim(),
        is_folder: true,
      })
    }

    // 分页获取文件
    form["pwd"] = pwd || this.addition.share_password || ""
    for (let page = 1; ; page++) {
      form["pg"] = String(page)
      const resStr = await this.request(
        `${this.getShareUrl()}/filemoreajax.php`,
        "POST",
        form,
      )
      let resp: any
      try {
        resp = JSON.parse(resStr)
      } catch {
        break
      }
      if (
        resp.zt !== 1 ||
        !Array.isArray(resp.text) ||
        resp.text.length === 0
      ) {
        break
      }
      const list: any[] = resp.text

      files.push(
        ...list.map((item) => ({
          id: item.id,
          name_all: item.name_all || item.name,
          size: item.size,
          time: item.time,
          is_folder: false,
          pwd: form["pwd"],
        })),
      )
    }

    return files
  }

  /**
   * 解析单文件分享页面并提取下载直链
   */
  async getFilesByShareUrl(
    shareId: string,
    pwd: string = "",
    cachedPageData?: string,
    customShareDomain?: string,
  ): Promise<LanzouFileOrFolder> {
    const cleanShareId = shareId.replace(/^\//, "")
    const shareBaseDomain = (
      customShareDomain ||
      (await this.probeShareDomain(cleanShareId))
    ).replace(/\/+$/, "")
    const sharePageUrl = `${shareBaseDomain}/${cleanShareId}`
    let pageData = cachedPageData
    if (!pageData) {
      pageData = await this.request(sharePageUrl, "GET")
    }

    pageData = removeNotes(pageData)
    pageData = removeJSComment(pageData)

    let param: Record<string, string> = {}
    let baseUrl = ""
    let downloadUrl = ""
    const fileResult: LanzouFileOrFolder = {
      id: cleanShareId,
      is_folder: false,
    }

    const needsPassword =
      pageData.includes("pwdload") || pageData.includes("passwddiv")

    if (needsPassword) {
      const fnCode = getJSFunctionByName(pageData, "down_p")
      param = htmlJsonToMap(fnCode, pageData)
      param["p"] = pwd || this.addition.share_password || ""

      const fileIdMatch =
        fnCode.match(/['"]?\/?ajax(?:file|m)\.php\?file=(\d+)['"]?/) ||
        pageData.match(/['"]?\/?ajax(?:file|m)\.php\?file=(\d+)['"]?/) ||
        fnCode.match(/file\s*[:=]\s*['"]?(\d+)['"]?/) ||
        pageData.match(/file\s*[:=]\s*['"]?(\d+)['"]?/) ||
        fnCode.match(/var\s+file_id\s*=\s*['"]?(\d+)['"]?/) ||
        pageData.match(/var\s+file_id\s*=\s*['"]?(\d+)['"]?/)
      const fileId = fileIdMatch ? fileIdMatch[1] : ""
      if (!fileId) throw new Error("[Lanzou] 未找到文件 ID")

      const resStr = await this.request(
        `${shareBaseDomain}/ajaxfile.php?file=${fileId}`,
        "POST",
        param,
        sharePageUrl,
      )
      let resp: LanzouShareResp<string>
      try {
        resp = JSON.parse(resStr)
      } catch {
        throw new Error(`[Lanzou] ajaxfile.php 响应格式错误: ${resStr}`)
      }
      if (resp.zt !== 1) {
        throw new Error(
          resp.info ||
            resp.text ||
            `[Lanzou] 密码错误或提取链接失败 (zt=${resp.zt})`,
        )
      }

      fileResult.name_all = resp.inf || "download"
      baseUrl = `${resp.dom}/file`
      downloadUrl = `${baseUrl}/${resp.url}`
    } else {
      const iframeMatch =
        pageData.match(/<iframe[^>]*?src=["']([^"']+)["']/i) ||
        pageData.match(/href=["'](\/fn\?[^"']+)["']/i) ||
        pageData.match(/["'](\/fn\?[^"']+)["']/i)
      if (!iframeMatch) {
        throw new Error("[Lanzou] 未找到下载页面 iframe 参数")
      }

      const iframePath = iframeMatch[1]
      const iframeFullUrl = `${shareBaseDomain}${iframePath.startsWith("/") ? "" : "/"}${iframePath}`
      const nextPageData = await this.request(
        iframeFullUrl,
        "GET",
        undefined,
        sharePageUrl,
      )
      const cleanNextPage = removeNotes(nextPageData)
      param = htmlJsonToMap(cleanNextPage, cleanNextPage)

      const fileIdMatch =
        cleanNextPage.match(/['"]?\/?ajax(?:file|m)\.php\?file=(\d+)['"]?/) ||
        cleanNextPage.match(/file\s*[:=]\s*['"]?(\d+)['"]?/) ||
        cleanNextPage.match(/file=(\d+)/) ||
        cleanNextPage.match(/var\s+file_id\s*=\s*['"]?(\d+)['"]?/)
      const fileId = fileIdMatch ? fileIdMatch[1] : ""
      if (!fileId) throw new Error("[Lanzou] 未找到文件 ID")

      const resStr = await this.request(
        `${shareBaseDomain}/ajaxfile.php?file=${fileId}`,
        "POST",
        param,
        iframeFullUrl,
      )
      let resp: LanzouShareResp
      try {
        resp = JSON.parse(resStr)
      } catch {
        throw new Error(`[Lanzou] ajaxfile.php 响应格式错误: ${resStr}`)
      }
      if (resp.zt !== 1) {
        throw new Error(
          resp.info || resp.text || `[Lanzou] 提取链接失败 (zt=${resp.zt})`,
        )
      }

      baseUrl = `${resp.dom}/file`
      downloadUrl = `${baseUrl}/${resp.url}`

      const nameMatch = pageData.match(
        /<title>(.+?) - 蓝奏云<\/title>|id="filenajax">(.+?)<\/div>|var filename = ['"](.+?)['"];|<div style="font-size[^>]*>([^<>]+)<\/div>|<div class="filethetext"[^>]*>([^<>]+)<\/div>/i,
      )
      if (nameMatch) {
        for (let i = 1; i < nameMatch.length; i++) {
          if (nameMatch[i]) {
            fileResult.name_all = nameMatch[i].trim()
            break
          }
        }
      }
    }

    const sizeMatch = pageData.match(/大小\W*([0-9.]+\s*[bkm]+)/i)
    if (sizeMatch) fileResult.size = sizeMatch[1]

    const timeMatch = pageData.match(
      /\d+\s*[秒天分小][钟时]?前|[昨前]天|\d{4}-\d{2}-\d{2}/,
    )
    if (timeMatch) fileResult.time = timeMatch[0]

    // 解析 302 重定向获得真实直链。
    // 蓝奏云直链服务器（dom 返回的 lanrar.com 等）偶发限流/超时，
    // 网络错误必须重试而非直接失败，避免"直链解析失败"随机出现。
    let realDirectUrl = downloadUrl
    let vs = ""
    let resolved = false
    for (let i = 0; i < 3; i++) {
      const headers: Record<string, string> = {
        Referer: baseUrl,
        "User-Agent": this.getUserAgent(),
        "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8,en-GB;q=0.7,en-US;q=0.6",
      }
      let c = "down_ip=1"
      if (vs) c += `; acw_sc__v2=${vs}`
      headers["Cookie"] = c

      let probeRes: Response
      try {
        probeRes = await fetch(downloadUrl, {
          method: "GET",
          headers,
          redirect: "manual",
        })
      } catch {
        // 网络层偶发失败（超时/断连），退避重试
        if (i < 2) {
          await new Promise((resolve) => setTimeout(resolve, 400 * (i + 1)))
          continue
        }
        throw new Error("[Lanzou] 直链探测网络错误，请稍后重试")
      }

      if (
        probeRes.status === 301 ||
        probeRes.status === 302 ||
        probeRes.status === 303 ||
        probeRes.status === 307 ||
        probeRes.status === 308
      ) {
        const loc = probeRes.headers.get("location")
        if (loc) {
          realDirectUrl = new URL(loc, downloadUrl).toString()
          resolved = true
          break
        }
      }

      if (
        probeRes.status === 200 &&
        probeRes.url &&
        probeRes.url !== downloadUrl
      ) {
        realDirectUrl = probeRes.url
        resolved = true
        break
      }

      // 429/5xx 偶发限流：退避重试
      if (probeRes.status === 429 || probeRes.status >= 500) {
        if (i < 2) {
          await new Promise((resolve) => setTimeout(resolve, 400 * (i + 1)))
          continue
        }
        throw new Error(
          `[Lanzou] 直链探测返回 HTTP ${probeRes.status}，请稍后重试`,
        )
      }

      const bodyText = await probeRes.text()
      if (bodyText.includes("acw_sc__v2")) {
        vs = calcAcwScV2(bodyText)
        continue
      }

      // 二次验证 ajax.php 兜底
      try {
        const ajaxParam = htmlJsonToMap(bodyText, bodyText)
        ajaxParam["el"] = "2"
        await new Promise((resolve) => setTimeout(resolve, 1500))

        const ajaxResStr = await this.request(
          `${baseUrl}/ajax.php`,
          "POST",
          ajaxParam,
          baseUrl,
        )
        const ajaxData = JSON.parse(ajaxResStr)
        if (ajaxData.url) {
          realDirectUrl = ajaxData.url.startsWith("http")
            ? ajaxData.url
            : new URL(ajaxData.url, baseUrl).toString()
          resolved = true
          break
        }
      } catch {
        // ajax.php 兜底失败：再试一轮（可能是瞬时限流）
        if (i < 2) {
          await new Promise((resolve) => setTimeout(resolve, 600 * (i + 1)))
          continue
        }
      }
      break
    }

    if (!resolved) {
      throw new Error("[Lanzou] 直链解析失败，请稍后重试")
    }

    fileResult.url = realDirectUrl
    return fileResult
  }

  /**
   * 通过 HEAD 请求获取真实 Content-Length 和 Last-Modified
   */
  async getFileRealInfo(
    downUrl: string,
  ): Promise<{ size?: number; time?: string }> {
    try {
      const res = await fetch(downUrl, {
        method: "HEAD",
        headers: { "User-Agent": this.getUserAgent() },
      })
      const len = res.headers.get("content-length")
      const modified = res.headers.get("last-modified")
      return {
        size: len ? parseInt(len, 10) : undefined,
        time: modified ? new Date(modified).toISOString() : undefined,
      }
    } catch {
      return {}
    }
  }

  /**
   * 目录与文件管理操作
   */
  async mkdir(parentId: string, dirName: string): Promise<void> {
    await this.doupload({
      task: "2",
      parent_id: parentId || "-1",
      folder_name: dirName,
      folder_description: "",
    })
  }

  async rename(fileId: string, newName: string): Promise<void> {
    await this.doupload({
      task: "46",
      file_id: fileId,
      file_name: newName,
      type: "2",
    })
  }

  async move(fileId: string, targetFolderId: string): Promise<void> {
    await this.doupload({
      task: "20",
      file_id: fileId,
      folder_id: targetFolderId,
    })
  }

  async remove(id: string, isFolder: boolean): Promise<void> {
    if (isFolder) {
      await this.doupload({
        task: "3",
        folder_id: id,
      })
    } else {
      await this.doupload({
        task: "6",
        file_id: id,
      })
    }
  }
}

/**
 * 将分享页 URL 的主机名替换为指定候选域名（分享 ID 全局可用）
 */
function targetUrlWithDomain(url: string, domain: string): string {
  try {
    const u = new URL(url)
    u.host = domain
    return u.toString()
  } catch {
    return url
  }
}

/** 安全提取 URL 主机名 */
function safeHost(url: string): string {
  try {
    return new URL(url).host
  } catch {
    return ""
  }
}
