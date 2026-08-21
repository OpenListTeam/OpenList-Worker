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

export class LanzouClient {
  private addition: LanzouAddition
  private cookie: string = ""
  private uid: string = ""
  private vei: string = ""
  private onCookieUpdate?: (cookie: string) => void

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

  public getUserAgent(): string {
    return (
      this.addition.user_agent ||
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    )
  }

  public getCookie(): string {
    return this.cookie
  }

  private updateCookie(setCookie: string | null) {
    if (!setCookie) return
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
  }

  /**
   * 账号密码登录
   */
  async login(): Promise<void> {
    if (!this.addition.account || !this.addition.password) {
      throw new Error("[Lanzou] 账号模式下必须提供账号与密码")
    }

    let vs = ""
    for (let retry = 0; retry < 3; retry++) {
      const headers: Record<string, string> = {
        "User-Agent": this.getUserAgent(),
        Referer: "https://pc.woozooo.com",
        "Content-Type": "application/x-www-form-urlencoded",
      }
      if (vs) {
        headers["Cookie"] = `acw_sc__v2=${vs}`
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

      this.updateCookie(res.headers.get("set-cookie"))
      const bodyStr = await res.text()

      if (bodyStr.includes("acw_sc__v2")) {
        vs = calcAcwScV2(bodyStr)
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
      throw new Error("[Lanzou] 未能获取到 uid，请检查 Cookie 是否有效")
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
   * 通用 HTTP 请求（包含 acw_sc__v2 自动求解与 down_ip 头处理）
   */
  async request(
    url: string,
    method: "GET" | "POST" = "GET",
    body?: Record<string, string>,
    customReferer?: string,
  ): Promise<string> {
    let vs = ""

    const defaultReferer =
      url.startsWith(this.getShareUrl()) ||
      url.includes("ajaxm.php") ||
      url.includes("filemoreajax.php")
        ? this.getShareUrl()
        : this.getBaseUrl()

    for (let retry = 0; retry < 3; retry++) {
      const headers: Record<string, string> = {
        Referer: customReferer || defaultReferer,
        "User-Agent": this.getUserAgent(),
        "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
      }

      let cookieStr = this.cookie
      if (url.includes("/file/")) {
        cookieStr = (cookieStr ? cookieStr + "; " : "") + "down_ip=1"
      }
      if (vs) {
        cookieStr = (cookieStr ? cookieStr + "; " : "") + `acw_sc__v2=${vs}`
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

      this.updateCookie(res.headers.get("set-cookie"))
      const bodyStr = await res.text()

      if (bodyStr.includes("acw_sc__v2")) {
        vs = calcAcwScV2(bodyStr)
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
      throw new Error("[Lanzou] Cookie 已过期，请更新 Cookie")
    }

    if (data.zt !== 1 && data.zt !== 2 && data.zt !== 4) {
      throw new Error(
        data.inf || data.info || `[Lanzou] API 错误 (zt: ${data.zt})`,
      )
    }

    return data
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
    const shareBaseDomain = (customShareDomain || this.getShareUrl()).replace(
      /\/+$/,
      "",
    )
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
        fnCode.match(/['"]?\/?ajaxm\.php\?file=(\d+)['"]?/) ||
        pageData.match(/['"]?\/?ajaxm\.php\?file=(\d+)['"]?/) ||
        fnCode.match(/file\s*[:=]\s*['"]?(\d+)['"]?/) ||
        pageData.match(/file\s*[:=]\s*['"]?(\d+)['"]?/) ||
        fnCode.match(/var\s+file_id\s*=\s*['"]?(\d+)['"]?/) ||
        pageData.match(/var\s+file_id\s*=\s*['"]?(\d+)['"]?/)
      const fileId = fileIdMatch ? fileIdMatch[1] : ""
      if (!fileId) throw new Error("[Lanzou] 未找到文件 ID")

      const resStr = await this.request(
        `${shareBaseDomain}/ajaxm.php?file=${fileId}`,
        "POST",
        param,
        sharePageUrl,
      )
      let resp: LanzouShareResp<string>
      try {
        resp = JSON.parse(resStr)
      } catch {
        throw new Error(`[Lanzou] ajaxm.php 响应格式错误: ${resStr}`)
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
        cleanNextPage.match(/['"]?\/?ajaxm\.php\?file=(\d+)['"]?/) ||
        cleanNextPage.match(/file\s*[:=]\s*['"]?(\d+)['"]?/) ||
        cleanNextPage.match(/file=(\d+)/) ||
        cleanNextPage.match(/var\s+file_id\s*=\s*['"]?(\d+)['"]?/)
      const fileId = fileIdMatch ? fileIdMatch[1] : ""
      if (!fileId) throw new Error("[Lanzou] 未找到文件 ID")

      const resStr = await this.request(
        `${shareBaseDomain}/ajaxm.php?file=${fileId}`,
        "POST",
        param,
        iframeFullUrl,
      )
      let resp: LanzouShareResp
      try {
        resp = JSON.parse(resStr)
      } catch {
        throw new Error(`[Lanzou] ajaxm.php 响应格式错误: ${resStr}`)
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

    // 解析 302 重定向获得真实直链
    let realDirectUrl = downloadUrl
    let vs = ""
    for (let i = 0; i < 3; i++) {
      const headers: Record<string, string> = {
        Referer: baseUrl,
        "User-Agent": this.getUserAgent(),
        "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8,en-GB;q=0.7,en-US;q=0.6",
      }
      let c = "down_ip=1"
      if (vs) c += `; acw_sc__v2=${vs}`
      headers["Cookie"] = c

      const probeRes = await fetch(downloadUrl, {
        method: "GET",
        headers,
        redirect: "manual",
      })

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
          break
        }
      }

      if (
        probeRes.status === 200 &&
        probeRes.url &&
        probeRes.url !== downloadUrl
      ) {
        realDirectUrl = probeRes.url
        break
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
          break
        }
      } catch {}
      break
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
