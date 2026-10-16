import CryptoJS from "crypto-js"
import {
  Yun139Addition,
  QueryRoutePolicyResp,
  Yun139DiskResp,
  Yun139DownloadResp,
  Yun139FileItem,
  Yun139StorageDetailsResp,
  PersonalListResp,
  PersonalDownloadResp,
  PersonalFileItem,
  Yun139TokenRefreshResp,
} from "./types"

export function encodeURIComponentCustom(str: string): string {
  let r = encodeURIComponent(str)
  r = r.replace(/\+/g, "%20")
  r = r.replace(/!/g, "%21")
  r = r.replace(/'/g, "%27")
  r = r.replace(/\(/g, "%28")
  r = r.replace(/\)/g, "%29")
  r = r.replace(/\*/g, "%2A")
  return r
}

export function md5(str: string): string {
  return CryptoJS.MD5(str).toString(CryptoJS.enc.Hex)
}

export function calSign(body: string, ts: string, randStr: string): string {
  const enc = encodeURIComponentCustom(body)
  const sorted = enc.split("").sort().join("")
  const words = CryptoJS.enc.Utf8.parse(sorted)
  const b64 = CryptoJS.enc.Base64.stringify(words)
  const res = md5(b64) + md5(`${ts}:${randStr}`)
  return md5(res).toUpperCase()
}

export function randomString(len: number): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
  let res = ""
  for (let i = 0; i < len; i++) {
    res += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return res
}

export function formatTime(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

// personal_new（新版个人云）的 /file/list 等端点只存在于 queryRoutePolicy
// 下发的路由 host（如 xxx/hcy）上；向这个默认域发请求会命中旧版 legacy 端点，
// 该端点会**静默忽略 parentFileId、恒返回根目录内容**（HTTP 200 + success:true，
// 不会抛错，因此此前任何“校验 success/code 再决定是否报错”的防御都拦不住）。
// 对齐 AlistGo/alist 官方 Go 驱动 ensurePersonalCloudHost 的做法：拿不到路由
// host 就是硬失败，绝不允许静默回退到这个占位域名。
const YUN139_DEFAULT_HOST = "https://yun.139.com"

/** 139 目录 id 的"根"写法：这些父 id 不做内容归属校验（根列表出现什么都不奇怪）。 */
const ROOT_PARENT_IDS = new Set(["/", "0", "root", "cloud139_root"])

/** 路由类业务错误码：遇到时应换下一个候选 URL 重试（对齐社区实现 boxplayer）。 */
const ROUTE_RETRY_CODES = new Set(["9000", "9008", "9100"])

/** 该父 id 是否为"根"哨兵值。 */
export function isRootParentId(id: string | undefined | null): boolean {
  const v = String(id ?? "").trim()
  return v === "" || ROOT_PARENT_IDS.has(v)
}

/**
 * 判断一次目录列表响应是否"列错了目录"（issue #112 的核心自检）。
 *
 * 唯一判据，数学上无歧义：**一个节点不可能出现在它自己的子项里**。
 * 当服务端忽略了 parentFileId（旧版端点、错误的路由形态等）而返回了该目录的
 * 父级/根内容时，我们请求的那个目录本身必然以同一个 id 出现在返回结果里——
 * 这正是观测到的形态：`/手机软件` 的列表里又出现 `手机软件`、
 * `/139/手机备份` 的列表里出现 `手机备份` 自己。
 *
 * 返回 null 表示无法判定为异常（含根目录列表：根列表出现任何内容都合法）。
 */
export function detectWrongListing(
  requestedParentId: string | undefined | null,
  items: Array<Partial<PersonalFileItem> & Record<string, any>> | undefined,
): string | null {
  if (isRootParentId(requestedParentId)) return null
  const wanted = String(requestedParentId)
  for (const item of items || []) {
    if (!item) continue
    const id = String(
      item.fileId || item.catalogId || item.catalogID || item.contentID || "",
    )
    if (id && id === wanted) {
      return (
        `the returned listing contains the requested folder itself ` +
        `("${item.name ?? ""}", id=${wanted}); the server ignored parentFileId ` +
        `and returned the parent directory instead`
      )
    }
  }
  return null
}

export class Yun139ApiClient {
  private addition: Yun139Addition
  public personalHost = YUN139_DEFAULT_HOST
  public familyHost = YUN139_DEFAULT_HOST
  public groupHost = YUN139_DEFAULT_HOST
  public account = ""
  private onAuthorizationRefresh?: (authorization: string) => Promise<void>

  constructor(
    addition: Yun139Addition,
    onAuthorizationRefresh?: (authorization: string) => Promise<void>,
  ) {
    this.addition = addition
    this.onAuthorizationRefresh = onAuthorizationRefresh
    this.extractAccount()
  }

  private extractAccount(): void {
    if (!this.addition.authorization) return
    try {
      const authStr = this.getAuthString()
      const decoded = CryptoJS.enc.Base64.parse(authStr).toString(
        CryptoJS.enc.Utf8,
      )
      const splits = decoded.split(":")
      if (splits.length >= 2) {
        this.account = splits[1]
      }
    } catch {
      // Ignored
    }
  }

  public getAuthString(): string {
    let auth = (this.addition.authorization || "").trim()
    if (auth.startsWith("Basic ")) {
      auth = auth.slice(6).trim()
    }
    return auth
  }

  isPersonalNew(): boolean {
    return !this.addition.type || this.addition.type === "personal_new"
  }

  isFamily(): boolean {
    return this.addition.type === "family"
  }

  isGroup(): boolean {
    return this.addition.type === "group"
  }

  getHost(): string {
    if (this.isFamily()) return this.familyHost
    if (this.isGroup()) return this.groupHost
    return this.personalHost
  }

  /**
   * 发送请求，按候选 URL 逐个尝试。
   *
   * 何时换下一个候选（其余错误一律原样抛出，避免被后续候选的错误掩盖）：
   *   - HTTP 404 / "route not found"：该形态下路由不存在；
   *   - options.validate 判定响应"明显不属于请求目标"：这是 issue #112 的
   *     关键——错误端点会静默忽略 parentFileId 并返回父级内容（HTTP 200 +
   *     success:true），只按 404 回退是永远发现不了的；
   *   - 路由类业务码 9000/9008/9100（对齐社区实现 gaozhangmin/boxplayer）。
   */
  async request<T = any>(
    uriOrUrl: string,
    body: any,
    options: { validate?: (json: any) => string | null } = {},
  ): Promise<T> {
    // Worker driver instances are cached; check at request time as well as init
    // so a long-lived isolate cannot miss the refresh window.
    await this.refreshAuthorizationIfNeeded()

    const ts = formatTime(new Date())
    const randStr = randomString(16)
    const bodyStr = JSON.stringify(body || {})
    const sign = calSign(bodyStr, ts, randStr)

    // 候选 URL 顺序即优先级；回退条件见上方注释
    const urls = this.buildRequestUrls(uriOrUrl)

    const svcType = this.isFamily() ? "2" : "1"
    const headers: Record<string, string> = {
      Accept: "application/json, text/plain, */*",
      "Content-Type": "application/json",
      "CMS-DEVICE": "default",
      Authorization: `Basic ${this.getAuthString()}`,
      Caller: "web",
      "Mcloud-Channel": "1000101",
      "Mcloud-Client": "10701",
      "Mcloud-Route": "001",
      "mcloud-channel": "1000101",
      "mcloud-client": "10701",
      "mcloud-sign": `${ts},${randStr},${sign}`,
      "mcloud-version": "7.14.0",
      Origin: "https://yun.139.com",
      Referer: "https://yun.139.com/w/",
      "x-DeviceInfo": "||9|7.14.0|chrome|120.0.0.0|||windows 10||zh-CN|||",
      "x-huawei-channelSrc": "10000034",
      "x-inner-ntwk": "2",
      "x-m4c-caller": "PC",
      "x-m4c-src": "10002",
      "x-SvcType": svcType,
      "Inner-Hcy-Router-Https": "1",
      "X-Yun-Api-Version": "v1",
      "X-Yun-App-Channel": "10000034",
      "X-Yun-Channel-Source": "10000034",
      "X-Yun-Client-Info":
        "||9|7.14.0|chrome|120.0.0.0|||windows 10||zh-CN|||dW5kZWZpbmVk||",
      "X-Yun-Module-Type": "100",
      "X-Yun-Svc-Type": "1",
    }

    const tried: string[] = []
    let lastStatus = 0
    let lastReason = ""

    for (let i = 0; i < urls.length; i++) {
      const candidate = urls[i]
      const isLast = i === urls.length - 1
      tried.push(candidate)

      const res = await fetch(candidate, {
        method: "POST",
        headers,
        body: bodyStr,
      })

      if (!res.ok) {
        const text = await res.text()
        lastStatus = res.status
        lastReason = `HTTP ${res.status}: ${text}`
        // 只有"路由不存在"才尝试下一候选；校验/权限/签名错误必须原样抛出，
        // 不能被后续候选的错误掩盖。
        const routeMissing = res.status === 404 || /route not found/i.test(text)
        if (!routeMissing || isLast) {
          throw new Error(
            `139 Cloud API error (${res.status}) [${candidate}]: ${text}`,
          )
        }
        continue
      }

      let json: any
      try {
        json = await res.json()
      } catch {
        // 非 JSON（如被重定向到网页）：换下一个候选，全部失败时列出 URL
        lastReason = "non-JSON response body"
        if (isLast) {
          throw new Error(
            `139 Cloud returned a non-JSON response, tried: ${tried.join(", ")}`,
          )
        }
        continue
      }

      const code = String(json?.code ?? "")
      if (json?.success === false && json?.message) {
        // 业务层明确报错：非路由类错误原样抛出（换候选只会掩盖真实原因）
        if (!ROUTE_RETRY_CODES.has(code) || isLast) {
          throw new Error(`139 Cloud API error: ${json.message}`)
        }
        lastReason = `business error: ${json.message}`
        continue
      }
      if (ROUTE_RETRY_CODES.has(code)) {
        const detail = json?.message || json?.msg || `code=${code}`
        lastReason = `routing error (code=${code}): ${detail}`
        if (isLast) {
          throw new Error(
            `139 Cloud API error [${candidate}]: ${detail} (code=${code})`,
          )
        }
        continue
      }

      // 内容级自检：响应"明显不属于请求目标"时换下一个候选（issue #112）
      const rejected = options.validate?.(json) || null
      if (rejected) {
        lastReason = rejected
        if (isLast) {
          throw new Error(
            `139 Cloud API ignored parentFileId on every candidate URL: ${rejected}; tried: ${tried.join(", ")}`,
          )
        }
        continue
      }

      return json as T
    }

    throw new Error(
      `139 Cloud API exhausted all candidate URLs (last status ${lastStatus}); ` +
        `tried: ${tried.join(", ")}; last reason: ${lastReason || "unknown"}`,
    )
  }

  /**
   * 计算请求候选 URL（顺序即优先级）。对齐 AlistGo/alist 官方 Go 驱动与社区
   * 实现 gaozhangmin/boxplayer：路由下发的个人云 host 存在多个等价形态
   * （裸 host / host+/hcy / host+/orchestration / host+/hcy+/orchestration），
   * 不同账号下发的形态不同，且错误的形态会**静默返回父级/根目录内容**而不是
   * 报错，因此必须准备多个候选并允许"内容级"回退（见 detectWrongListing）。
   *
   * 顺序原则：把"现网已工作的形态"排在前面，健康账号只发一次请求。
   *   - host 已带 /orchestration：直拼，单一候选；
   *   - 带其它路径段（如 .../hcy）：先直拼，再补 /orchestration；
   *   - 裸 host：先补 /orchestration（boxplayer 规则），再尝试直拼。
   * 另外把路由 host 去掉 /hcy 的形态作为后备（同 boxplayer 的 withoutHcy）。
   *
   * personal_new 禁止落到默认域：默认域的 /file/list 会忽略 parentFileId
   * 恒返回根目录内容（issue #112）；init() 已硬失败，这里是防御性兜底。
   */
  private buildRequestUrls(uriOrUrl: string): string[] {
    if (uriOrUrl.startsWith("http://") || uriOrUrl.startsWith("https://")) {
      return [uriOrUrl]
    }
    if (uriOrUrl.startsWith("/orchestration/")) {
      // Orchestration APIs are strictly hosted on yun.139.com
      return [`https://yun.139.com${uriOrUrl}`]
    }

    const host = this.getHost()
    if (this.isPersonalNew() && (!host || host === YUN139_DEFAULT_HOST)) {
      throw new Error(
        `[139] routed personal host unavailable, refusing to call ${uriOrUrl} on the default host`,
      )
    }

    const bases: string[] = []
    const pushBase = (value: string): void => {
      const b = (value || "").replace(/\/+$/, "")
      if (b && !bases.includes(b)) bases.push(b)
    }
    pushBase(host)
    // /hcy 与非 /hcy 两种形态互备（路由可能下发任一形态）
    pushBase(
      (host || "")
        .replace(/\/+$/, "")
        .replace(/\/hcy\/orchestration\/?$/i, "/orchestration")
        .replace(/\/hcy\/?$/i, ""),
    )

    const urls: string[] = []
    const pushUrl = (value: string): void => {
      if (value && !urls.includes(value)) urls.push(value)
    }
    const pathOf = (value: string): string => {
      try {
        return new URL(value).pathname.replace(/\/+$/, "")
      } catch {
        return ""
      }
    }

    for (const base of bases) {
      const basePath = pathOf(base)
      if (basePath.endsWith("/orchestration")) {
        // host 本身已带 /orchestration：直拼即目标形态
        pushUrl(`${base}${uriOrUrl}`)
      } else if (basePath && basePath !== "/") {
        // 带路径段的 host（如 .../hcy）：先按现网已工作的直拼形态，再补
        // /orchestration（新版接口也可能挂在 /hcy/orchestration 下）
        pushUrl(`${base}${uriOrUrl}`)
        pushUrl(`${base}/orchestration${uriOrUrl}`)
      } else {
        // 裸 host：先按社区实现补 /orchestration，再尝试直拼
        pushUrl(`${base}/orchestration${uriOrUrl}`)
        pushUrl(`${base}${uriOrUrl}`)
      }
    }
    return urls
  }

  /**
   * Refresh before the token enters its final 15 days. Called during init and
   * before each API request because Worker driver instances may stay cached.
   */
  private async refreshAuthorizationIfNeeded(): Promise<void> {
    const auth = this.getAuthString()
    let decoded: string
    try {
      decoded = CryptoJS.enc.Base64.parse(auth).toString(CryptoJS.enc.Utf8)
    } catch {
      // Keep the previous behavior for non-standard authorization values.
      return
    }

    const pieces = decoded.split(":")
    if (pieces.length < 3) return

    const token = pieces.slice(2).join(":")
    const tokenFields = token.split("|")
    const expiresAt = Number(tokenFields[3])
    if (!Number.isFinite(expiresAt) || expiresAt <= 0) return

    const refreshWindowMs = 15 * 24 * 60 * 60 * 1000
    if (expiresAt - Date.now() > refreshWindowMs) return

    const userDomainId = (this.addition.user_domain_id || "").trim()
    if (!userDomainId) {
      throw new Error(
        "139 Cloud token is near expiry; configure user_domain_id to use the PC refreshToken API",
      )
    }

    const authHeader = `Basic ${auth}`

    // Match the minimal header set from the successful PowerShell request.
    // Do not send Cookie or unverified synthetic PC/device headers.
    const headers: Record<string, string> = {
      Accept: "application/json",
      "Content-Type": "application/json; charset=utf-8",
      app_auth: authHeader,
      app_cp: "1",
      authorization: authHeader,
      cp_version: "8.9.1.20260929",
      "x-yun-api-version": "v1",
      "x-yun-app-channel": "10200153",
      "x-yun-op-type": "1",
      "x-yun-svc-type": "1",
      "x-yun-module-type": "1",
      "x-yun-market-source": "1",
      "x-yun-client-info": "PC",
    }

    const response = await fetch(
      "https://user-njs.yun.139.com/user/auth/refreshToken",
      {
        method: "POST",
        // Omit captured cookies (mc_at, mc_bt, mc_pat, mc_pbt, mc_pac):
        // refresh succeeded without them in our test; other sessions remain unverified.
        credentials: "omit",
        headers,
        body: JSON.stringify({ userDomainId }),
      },
    )

    if (!response.ok) {
      const body = await response.text()
      throw new Error(
        `139 Cloud PC token refresh failed (${response.status}): ${body}`,
      )
    }

    const result = (await response.json()) as Yun139TokenRefreshResp
    const newToken = result.data?.token?.trim()
    if (!result.success || result.code !== "0000" || !newToken) {
      throw new Error(
        `139 Cloud PC token refresh failed: code=${result.code || "unknown"}, message=${result.message || "empty token"}`,
      )
    }
    const newExpiresAt = Number(newToken.split("|")[3])
    if (!Number.isFinite(newExpiresAt) || newExpiresAt <= Date.now()) {
      throw new Error(
        "139 Cloud PC refresh returned a token without a valid future expiry",
      )
    }

    this.addition.authorization = CryptoJS.enc.Base64.stringify(
      CryptoJS.enc.Utf8.parse(`${pieces[0]}:${this.account}:${newToken}`),
    )
    await this.onAuthorizationRefresh?.(this.addition.authorization)
  }

  async init(): Promise<void> {
    if (!this.addition.authorization) {
      throw new Error("139 Cloud Authorization is required")
    }

    await this.refreshAuthorizationIfNeeded()

    let routeError: unknown = null
    try {
      const routeRes = await this.request<QueryRoutePolicyResp>(
        "https://user-njs.yun.139.com/user/route/qryRoutePolicy",
        {
          userInfo: {
            userType: 1,
            accountType: 1,
            accountName: this.account,
          },
          modAddrType: 1,
        },
      )

      if (routeRes.data?.routePolicyList) {
        for (const policy of routeRes.data.routePolicyList) {
          if (policy.modName === "personal" && policy.httpsUrl) {
            this.personalHost = policy.httpsUrl
          } else if (policy.modName === "group" && policy.httpsUrl) {
            this.groupHost = policy.httpsUrl
          } else if (policy.modName === "family" && policy.httpsUrl) {
            this.familyHost = policy.httpsUrl
          }
        }
      }
    } catch (e) {
      routeError = e
    }

    // 新版个人云必须拿到路由下发的 personal host 才能工作：静默回退默认域
    // 会让 /file/list 命中忽略 parentFileId 的旧版端点——按名解析目录仍然
    // "成功"（因为该端点恒返回根目录内容，根目录下确有同名文件夹时查找不会
    // 落空），resolveCatalogId 的任何 throw 都不会被触发，表现为访问子目录
    // 却看到根目录的全部文件夹，点击文件又出现路径自我嵌套（issue #112）。
    // Go 官方驱动 ensurePersonalCloudHost 同样是硬失败；旧版个人云
    // （isPersonalNew()===false）走 /orchestration 硬编码路径，不依赖路由，
    // 保留告警即可，不强制失败。
    if (
      this.isPersonalNew() &&
      (!this.personalHost || this.personalHost === YUN139_DEFAULT_HOST)
    ) {
      const detail = routeError
        ? routeError instanceof Error
          ? routeError.message
          : String(routeError)
        : "queryRoutePolicy returned no personal host"
      throw new Error(
        `[139] failed to resolve personal cloud host via queryRoutePolicy (${detail}); ` +
          "refusing to fall back to the default host, which silently ignores " +
          "parentFileId and always returns the root directory",
      )
    }
    if (routeError) {
      console.warn(
        "[139] queryRoutePolicy warning, fallback to default host:",
        routeError,
      )
    }
  }

  async listFiles(folderId = ""): Promise<{
    files: Yun139FileItem[]
    folders: Array<{
      catalogID: string
      catalogName: string
      updateTime?: string
    }>
  }> {
    if (this.isPersonalNew()) {
      let nextPageCursor = ""
      const allItems: PersonalFileItem[] = []
      const parentFileId = folderId || this.addition.root_folder_id || "/"

      do {
        const res = await this.request<PersonalListResp>(
          "/file/list",
          {
            parentFileId,
            pageInfo: {
              pageCursor: nextPageCursor,
              pageSize: 100,
            },
            orderBy: "updated_at",
            orderDirection: "DESC",
            imageThumbnailStyleList: ["Small", "Large"],
          },
          {
            // 内容级自检：响应里出现"被请求的目录自己"就是服务端忽略了
            // parentFileId 的铁证（见 detectWrongListing）——此时换下一个
            // 候选 URL 再试；全部候选都如此则抛错并列出所有试过的 URL。
            validate: (json: any) =>
              detectWrongListing(parentFileId, json?.data?.items),
          },
        )

        const items = res.data?.items || []
        allItems.push(...items)
        // data.nextPageCursor 是 Go 官方驱动（drivers/139/util.go）确认的权威
        // 字段；额外防御游标与上一轮相同时终止，避免服务端重复回显同一游标
        // 导致死循环。
        const nextCursor = res.data?.nextPageCursor || ""
        if (nextCursor === nextPageCursor) break
        nextPageCursor = nextCursor
      } while (nextPageCursor)

      const folders = allItems
        .filter((i) => i.type === "folder")
        .map((i) => ({
          // 与社区实现 gaozhangmin/boxplayer 的 mapCloud139FileToAliModel
          // 字段映射比对一致：部分条目以 catalogId/catalogID 携带 id 而非
          // fileId。只读 fileId 会拿到 undefined，随后 listFiles(undefined)
          // 回退 parentFileId="/" 静默列出根目录（issue #112 症状1）。
          catalogID: i.fileId || i.catalogId || i.catalogID || "",
          catalogName: i.name,
          updateTime: i.updatedAt,
        }))

      const files: Yun139FileItem[] = allItems
        .filter((i) => i.type !== "folder")
        .map((i) => ({
          contentID: i.fileId || i.catalogId || i.catalogID || "",
          contentName: i.name,
          contentSize: i.size,
          updateTime: i.updatedAt,
          createTime: i.createdAt,
          thumbnailURL: i.thumbnailUrls?.[0]?.url,
        }))

      return { files, folders }
    }

    return this.getDisk(folderId)
  }

  async getDisk(catalogId = ""): Promise<{
    files: Yun139FileItem[]
    folders: Array<{
      catalogID: string
      catalogName: string
      updateTime?: string
    }>
  }> {
    const res = await this.request<Yun139DiskResp>(
      "/orchestration/personalCloud/catalog/v1.0/getDisk",
      {
        catalogID: catalogId || "",
        sortDirection: 1,
        filterType: 0,
        catalogSortType: 0,
        contentSortType: 0,
        startNumber: 1,
        endNumber: 5000,
        commonAccountInfo: {
          account: this.account,
          accountType: 1,
        },
      },
    )

    const diskResult = res.data?.getDiskResult
    return {
      files: diskResult?.fileList || [],
      folders: diskResult?.catalogList || [],
    }
  }

  async getDownloadUrl(contentIdOrFileId: string): Promise<string> {
    if (this.isPersonalNew()) {
      const res = await this.request<PersonalDownloadResp>(
        "/file/getDownloadUrl",
        {
          fileId: contentIdOrFileId,
        },
      )
      const url =
        (res.data?.cdnSwitch ? res.data?.cdnUrl : null) ||
        res.data?.url ||
        res.data?.cdnUrl
      if (!url) {
        throw new Error("Empty download URL received from 139 Cloud")
      }
      return url
    }

    const res = await this.request<Yun139DownloadResp>(
      "/orchestration/personalCloud/uploadAndDownload/v1.0/downloadRequest",
      {
        contentID: contentIdOrFileId,
        commonAccountInfo: {
          account: this.account,
          accountType: 1,
        },
      },
    )

    const url = res.data?.downloadURL || res.data?.url
    if (!url) {
      throw new Error("Empty download URL received from 139 Cloud")
    }
    return url
  }

  async createCatalog(parentCatalogId: string, name: string): Promise<string> {
    if (this.isPersonalNew()) {
      const res = await this.request<any>("/file/create", {
        parentFileId: parentCatalogId || this.addition.root_folder_id || "/",
        name,
        description: "",
        type: "folder",
        fileRenameMode: "force_rename",
      })
      return res.data?.fileId || ""
    }

    const res = await this.request<any>(
      "/orchestration/personalCloud/catalog/v1.0/createCatalog",
      {
        parentCatalogID: parentCatalogId || "",
        catalogName: name,
        commonAccountInfo: {
          account: this.account,
          accountType: 1,
        },
      },
    )
    return res.data?.catalogID || ""
  }

  async deleteFile(contentIdOrFileId: string): Promise<void> {
    if (this.isPersonalNew()) {
      await this.request("/file/delete", {
        fileIds: [contentIdOrFileId],
      })
      return
    }

    await this.request(
      "/orchestration/personalCloud/catalog/v1.0/deleteContent",
      {
        contentID: contentIdOrFileId,
        commonAccountInfo: {
          account: this.account,
          accountType: 1,
        },
      },
    )
  }

  async deleteCatalog(catalogIdOrFileId: string): Promise<void> {
    if (this.isPersonalNew()) {
      await this.request("/file/delete", {
        fileIds: [catalogIdOrFileId],
      })
      return
    }

    await this.request(
      "/orchestration/personalCloud/catalog/v1.0/deleteCatalog",
      {
        catalogID: catalogIdOrFileId,
        commonAccountInfo: {
          account: this.account,
          accountType: 1,
        },
      },
    )
  }

  async rename(id: string, newName: string): Promise<void> {
    if (this.isPersonalNew()) {
      await this.request("/file/update", {
        fileId: id,
        name: newName,
        description: "",
      })
      return
    }

    await this.request(
      "/orchestration/personalCloud/catalog/v1.0/updateCatalogInfo",
      {
        catalogID: id,
        catalogName: newName,
        commonAccountInfo: {
          account: this.account,
          accountType: 1,
        },
      },
    )
  }

  async getStorageDetails(): Promise<{ total?: number; used?: number }> {
    try {
      const res = await this.request<Yun139StorageDetailsResp>(
        "/orchestration/personalCloud/catalog/v1.0/getUserDomainInfo",
        {
          commonAccountInfo: {
            account: this.account,
            accountType: 1,
          },
        },
      )
      return {
        total: res.data?.totalSize,
        used: res.data?.usedSize,
      }
    } catch {
      return {}
    }
  }
}
