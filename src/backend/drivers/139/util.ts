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

export class Yun139ApiClient {
  private addition: Yun139Addition
  public personalHost = "https://yun.139.com"
  public familyHost = "https://yun.139.com"
  public groupHost = "https://yun.139.com"
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

  async request<T = any>(uriOrUrl: string, body: any): Promise<T> {
    // Worker driver instances are cached; check at request time as well as init
    // so a long-lived isolate cannot miss the refresh window.
    await this.refreshAuthorizationIfNeeded()

    const ts = formatTime(new Date())
    const randStr = randomString(16)
    const bodyStr = JSON.stringify(body || {})
    const sign = calSign(bodyStr, ts, randStr)

    let url: string
    if (uriOrUrl.startsWith("http://") || uriOrUrl.startsWith("https://")) {
      url = uriOrUrl
    } else if (uriOrUrl.startsWith("/orchestration/")) {
      // Orchestration APIs are strictly hosted on yun.139.com
      url = `https://yun.139.com${uriOrUrl}`
    } else {
      url = `${this.getHost()}${uriOrUrl}`
    }

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

    const res = await fetch(url, {
      method: "POST",
      headers,
      body: bodyStr,
    })

    if (!res.ok) {
      const text = await res.text()
      throw new Error(`139 Cloud API error (${res.status}): ${text}`)
    }

    const json = (await res.json()) as any
    if (json.success === false && json.message) {
      throw new Error(`139 Cloud API error: ${json.message}`)
    }
    return json as T
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
        // Cookie is intentionally omitted: the captured successful request
        // worked without it, and this Worker has no reliable browser-cookie
        // jar to forward. This does NOT prove cookies are unnecessary for every
        // account/session. If refresh fails for cookie-bound sessions, follow
        // up by defining an explicit, securely stored cookie input and tests
        // for expiry/rotation; do not silently depend on ambient cookies.
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
      throw new Error("139 Cloud PC refresh returned a token without a valid future expiry")
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
      console.warn(
        "[139] queryRoutePolicy warning, fallback to default host:",
        e,
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
        const res = await this.request<PersonalListResp>("/file/list", {
          parentFileId,
          pageInfo: {
            pageCursor: nextPageCursor,
            pageSize: 100,
          },
          orderBy: "updated_at",
          orderDirection: "DESC",
          imageThumbnailStyleList: ["Small", "Large"],
        })

        const items = res.data?.items || []
        allItems.push(...items)
        nextPageCursor = res.data?.nextPageCursor || ""
      } while (nextPageCursor)

      const folders = allItems
        .filter((i) => i.type === "folder")
        .map((i) => ({
          catalogID: i.fileId,
          catalogName: i.name,
          updateTime: i.updatedAt,
        }))

      const files: Yun139FileItem[] = allItems
        .filter((i) => i.type !== "folder")
        .map((i) => ({
          contentID: i.fileId,
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
