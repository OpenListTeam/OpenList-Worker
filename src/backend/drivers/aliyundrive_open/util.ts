import {
  AlidriveAddition,
  AliyundriveOpenAddition,
  AliyunTokenResp,
  AliyunFileItem,
  AliyunShareTokenResp,
} from "./types"

// ============================================================
// 常量
// ============================================================
// 旧版 Web API 端点（aliyundrive）
const ALI_WEB_API = "https://api.alipan.com"
// 新版 OpenAPI 端点（aliyundrive_open）
const ALI_OPEN_API = "https://openapi.aliyundrive.com/adrive/v1.0"
// 分享 API 端点（aliyundrive_share）
const ALI_SHARE_API = "https://api.alipan.com"

// ============================================================
// 1. AlidriveClient - 旧版 Web API（不需要 client_id）
//    使用 https://auth.alipan.com/v2/account/token 刷新 token
// ============================================================
export class AlidriveClient {
  private addition: AlidriveAddition
  private accessToken: string = ""
  private refreshTokenVal: string = ""
  public driveId: string = ""
  private tokenExpiresAt: number = 0

  constructor(addition: AlidriveAddition) {
    this.addition = addition
    this.refreshTokenVal = addition.refresh_token || ""
    this.driveId = addition.drive_id || ""
  }

  public async init(): Promise<void> {
    if (!this.refreshTokenVal || !this.refreshTokenVal.trim()) {
      console.warn("[Aliyundrive] refresh_token is empty, skipping init.")
      return
    }
    try {
      await this.refreshAccessToken()
      // 获取 drive_id
      if (!this.driveId) {
        await this.resolveDriveId()
      }
    } catch (e: any) {
      console.warn("[Aliyundrive] init warning:", e.message)
    }
  }

  private async resolveDriveId(): Promise<void> {
    const res = await this.request<any>("/v2/user/get", {})
    const driveType = this.addition.drive_type || "default"
    if (driveType === "resource") {
      this.driveId = res.resource_drive_id || res.default_drive_id || ""
    } else if (driveType === "backup") {
      this.driveId = res.backup_drive_id || res.default_drive_id || ""
    } else {
      this.driveId = res.default_drive_id || ""
    }
  }

  public async refreshAccessToken(): Promise<void> {
    if (!this.refreshTokenVal || !this.refreshTokenVal.trim()) {
      return
    }
    // 旧版 API 不需要 client_id，直接使用官方端点
    const url = "https://auth.alipan.com/v2/account/token"
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        refresh_token: this.refreshTokenVal.trim(),
        grant_type: "refresh_token",
      }),
    })
    if (!res.ok) {
      const text = await res.text().catch(() => "")
      throw new Error(
        `[Aliyundrive] Token refresh failed [${res.status}]: ${text}`,
      )
    }
    const data: AliyunTokenResp = await res.json()
    if (!data.access_token) {
      throw new Error(
        `[Aliyundrive] Invalid token response: ${JSON.stringify(data)}`,
      )
    }
    this.accessToken = data.access_token
    if (data.refresh_token) {
      this.refreshTokenVal = data.refresh_token
    }
    this.tokenExpiresAt = Date.now() + (data.expires_in || 7200) * 1000 - 60000
  }

  private async ensureToken(): Promise<void> {
    if (!this.accessToken || Date.now() >= this.tokenExpiresAt) {
      await this.refreshAccessToken()
    }
  }

  public getRootFolderId(): string {
    return this.addition.root_folder_id?.trim() || "root"
  }

  public async request<T = any>(
    path: string,
    body: any,
    retry = true,
  ): Promise<T> {
    await this.ensureToken()
    const url = path.startsWith("http") ? path : `${ALI_WEB_API}${path}`
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.accessToken}`,
        Referer: "https://www.alipan.com/",
      },
      body: JSON.stringify(body),
    })
    if (res.status === 401 && retry) {
      await this.refreshAccessToken()
      return this.request<T>(path, body, false)
    }
    if (!res.ok) {
      const err = await res.text().catch(() => "")
      throw new Error(`[Aliyundrive] API error [${res.status}] ${path}: ${err}`)
    }
    return res.json()
  }

  public async listFiles(parentFileId: string): Promise<AliyunFileItem[]> {
    const items: AliyunFileItem[] = []
    let marker: string | undefined
    const orderBy = this.addition.order_by || "updated_at"
    const orderDirection = this.addition.order_direction || "DESC"
    do {
      const body: any = {
        drive_id: this.driveId,
        parent_file_id: parentFileId,
        limit: 100,
        all: false,
        url_expire_sec: 14400,
        image_thumbnail_process: "image/resize,w_400/format,jpeg",
        image_url_process: "image/resize,w_1920/format,jpeg",
        video_thumbnail_process: "video/snapshot,t_0,f_jpg,ar_auto,w_300",
        fields: "*",
        order_by: `${orderBy} ${orderDirection}`,
      }
      if (marker) body.marker = marker
      const resp = await this.request<any>("/adrive/v3/file/list", body)
      items.push(...(resp.items || []))
      marker = resp.next_marker || undefined
    } while (marker)
    return items
  }

  public async getDownloadUrl(fileId: string): Promise<string> {
    const resp = await this.request<any>("/v2/file/get_download_url", {
      drive_id: this.driveId,
      file_id: fileId,
      expire_sec: 14400,
    })
    return resp.url || ""
  }

  public async mkdir(parentFileId: string, name: string): Promise<void> {
    await this.request("/adrive/v2/file/createWithFolders", {
      check_name_mode: "refuse",
      drive_id: this.driveId,
      name,
      parent_file_id: parentFileId,
      type: "folder",
    })
  }

  public async rename(fileId: string, newName: string): Promise<void> {
    await this.request("/v3/file/update", {
      drive_id: this.driveId,
      file_id: fileId,
      name: newName,
      check_name_mode: "refuse",
    })
  }

  public async remove(fileId: string): Promise<void> {
    const removeWay = this.addition.remove_way || "trash"
    if (removeWay === "trash") {
      await this.request("/v2/recyclebin/trash", {
        drive_id: this.driveId,
        file_id: fileId,
      })
    } else {
      await this.request("/v3/file/delete", {
        drive_id: this.driveId,
        file_id: fileId,
      })
    }
  }

  public async move(fileId: string, toParentFileId: string): Promise<void> {
    await this.request("/v3/file/move", {
      drive_id: this.driveId,
      file_id: fileId,
      to_parent_file_id: toParentFileId,
      check_name_mode: "refuse",
    })
  }

  public async copy(fileId: string, toParentFileId: string): Promise<void> {
    await this.request("/v3/file/copy", {
      drive_id: this.driveId,
      file_id: fileId,
      to_parent_file_id: toParentFileId,
      auto_rename: true,
    })
  }
}

// ============================================================
// 2. AliyunOpenClient - 新版 OpenAPI
//    优先通过在线 API 中转（GET 请求，查询参数），
//    备用直连 OAuth 端点（需要 client_id + client_secret）
// ============================================================
export class AliyunOpenClient {
  private addition: AliyundriveOpenAddition
  private accessToken: string = ""
  private refreshTokenVal: string = ""
  public driveId: string = ""
  private tokenExpiresAt: number = 0

  constructor(addition: AliyundriveOpenAddition) {
    this.addition = addition
    this.refreshTokenVal = addition.refresh_token || ""
    this.driveId = addition.drive_id || ""
  }

  public async init(): Promise<void> {
    if (!this.refreshTokenVal || !this.refreshTokenVal.trim()) {
      console.warn("[AliyundriveOpen] refresh_token is empty, skipping init.")
      return
    }
    try {
      await this.refreshAccessToken()
      // 获取 drive_id
      if (!this.driveId) {
        await this.resolveDriveId()
      }
    } catch (e: any) {
      console.warn("[AliyundriveOpen] init warning:", e.message)
    }
  }

  private async resolveDriveId(): Promise<void> {
    const res = await this.openApiRequest<any>("/openFile/getDriveInfo", {})
    const driveType = this.addition.drive_type || "default"
    if (driveType === "resource") {
      this.driveId = res.resource_drive_id || res.default_drive_id || ""
    } else if (driveType === "backup") {
      this.driveId = res.backup_drive_id || res.default_drive_id || ""
    } else {
      this.driveId = res.default_drive_id || ""
    }
  }

  public async refreshAccessToken(): Promise<void> {
    if (!this.refreshTokenVal || !this.refreshTokenVal.trim()) {
      return
    }
    const token = this.refreshTokenVal.trim()

    // 策略1: 通过在线 API 中转（GET + query params）— 最高优先
    // 这是 OpenList 官方推荐方式，不需要 client_id
    const onlineApis: string[] = []
    if (this.addition.api_url_address && this.addition.api_url_address.trim()) {
      onlineApis.push(this.addition.api_url_address.trim())
    }
    onlineApis.push(
      "https://api.alist.nn.ci/alist/ali_open/token",
      "https://api.oplist.org/alist/ali_open/token",
    )

    const driverTxt =
      this.addition.alipan_type === "alipanTV" ? "alicloud_tv" : "alicloud_qr"

    for (const apiUrl of onlineApis) {
      try {
        const params = new URLSearchParams({
          refresh_ui: token,
          server_use: "true",
          driver_txt: driverTxt,
        })
        const res = await fetch(`${apiUrl}?${params.toString()}`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        })
        if (!res.ok) {
          throw new Error(`[Status ${res.status}]`)
        }
        const data: any = await res.json()
        const newToken: string =
          data.refresh_token || data.data?.refresh_token || ""
        const newAccess: string =
          data.access_token || data.data?.access_token || ""
        if (!newAccess) {
          throw new Error(
            `Empty access_token from online API: ${JSON.stringify(data)}`,
          )
        }
        this.accessToken = newAccess
        if (newToken) this.refreshTokenVal = newToken
        this.tokenExpiresAt =
          Date.now() + (data.expires_in || 7200) * 1000 - 60000
        return // Success!
      } catch (err: any) {
        console.warn(
          `[AliyundriveOpen] Online API '${apiUrl}' failed: ${err.message}`,
        )
      }
    }

    // 策略2: 直连 OpenAPI OAuth（需要 client_id + client_secret）
    if (this.addition.client_id && this.addition.client_secret) {
      try {
        const res = await fetch(
          "https://openapi.aliyundrive.com/oauth/access_token",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              client_id: this.addition.client_id,
              client_secret: this.addition.client_secret,
              grant_type: "refresh_token",
              refresh_token: token,
            }),
          },
        )
        if (!res.ok) {
          const text = await res.text().catch(() => "")
          throw new Error(`[Status ${res.status}] ${text}`)
        }
        const data: AliyunTokenResp = await res.json()
        if (!data.access_token) {
          throw new Error(`Invalid response: ${JSON.stringify(data)}`)
        }
        this.accessToken = data.access_token
        if (data.refresh_token) this.refreshTokenVal = data.refresh_token
        this.tokenExpiresAt =
          Date.now() + (data.expires_in || 7200) * 1000 - 60000
        return // Success!
      } catch (err: any) {
        console.warn(`[AliyundriveOpen] Direct OAuth failed: ${err.message}`)
      }
    }

    throw new Error(
      "[AliyundriveOpen] All token refresh strategies failed. " +
        "Please check: 1) refresh_token is valid and not expired, " +
        "2) api_url_address is accessible, " +
        "3) If using direct OAuth, client_id and client_secret are correct.",
    )
  }

  private async ensureToken(): Promise<void> {
    if (!this.accessToken || Date.now() >= this.tokenExpiresAt) {
      await this.refreshAccessToken()
    }
  }

  public getRootFolderId(): string {
    return this.addition.root_folder_id?.trim() || "root"
  }

  public async openApiRequest<T = any>(
    path: string,
    body: any,
    retry = true,
  ): Promise<T> {
    await this.ensureToken()
    const url = path.startsWith("http") ? path : `${ALI_OPEN_API}${path}`
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.accessToken}`,
      },
      body: JSON.stringify(body),
    })
    if (res.status === 401 && retry) {
      await this.refreshAccessToken()
      return this.openApiRequest<T>(path, body, false)
    }
    if (!res.ok) {
      const err = await res.text().catch(() => "")
      throw new Error(
        `[AliyundriveOpen] API error [${res.status}] ${path}: ${err}`,
      )
    }
    return res.json()
  }

  public async listFiles(parentFileId: string): Promise<AliyunFileItem[]> {
    const items: AliyunFileItem[] = []
    let marker: string | undefined
    const orderBy = this.addition.order_by || "updated_at"
    const orderDirection = this.addition.order_direction || "DESC"
    do {
      const body: any = {
        drive_id: this.driveId,
        parent_file_id: parentFileId,
        limit: 100,
        order_by: orderBy,
        order_direction: orderDirection,
      }
      if (marker) body.marker = marker
      const resp = await this.openApiRequest<any>("/openFile/list", body)
      items.push(...(resp.items || []))
      marker = resp.next_marker || undefined
    } while (marker)
    return items
  }

  public async getDownloadUrl(fileId: string): Promise<string> {
    const resp = await this.openApiRequest<any>("/openFile/getDownloadUrl", {
      drive_id: this.driveId,
      file_id: fileId,
      expire_sec: 14400,
    })
    return resp.url || resp.download_url || ""
  }

  public async mkdir(parentFileId: string, name: string): Promise<void> {
    await this.openApiRequest("/openFile/create", {
      drive_id: this.driveId,
      parent_file_id: parentFileId,
      name,
      type: "folder",
      check_name_mode: "refuse",
    })
  }

  public async rename(fileId: string, newName: string): Promise<void> {
    await this.openApiRequest("/openFile/update", {
      drive_id: this.driveId,
      file_id: fileId,
      name: newName,
      check_name_mode: "refuse",
    })
  }

  public async remove(fileId: string): Promise<void> {
    const way = this.addition.remove_way || "trash"
    await this.openApiRequest(
      way === "trash" ? "/openFile/recyclebin" : "/openFile/delete",
      { drive_id: this.driveId, file_id: fileId },
    )
  }

  public async move(fileId: string, toParentFileId: string): Promise<void> {
    await this.openApiRequest("/openFile/move", {
      drive_id: this.driveId,
      file_id: fileId,
      to_parent_file_id: toParentFileId,
      check_name_mode: "refuse",
    })
  }

  public async copy(fileId: string, toParentFileId: string): Promise<void> {
    await this.openApiRequest("/openFile/copy", {
      drive_id: this.driveId,
      file_id: fileId,
      to_parent_file_id: toParentFileId,
      auto_rename: true,
    })
  }

  public async putFile(
    parentFileId: string,
    filename: string,
    content: Buffer,
  ): Promise<void> {
    const size = content.length
    const createResp = await this.openApiRequest<any>("/openFile/create", {
      drive_id: this.driveId,
      parent_file_id: parentFileId,
      name: filename,
      type: "file",
      size,
      check_name_mode: "auto_rename",
      part_info_list: [{ part_number: 1 }],
    })
    const uploadUrl = createResp.part_info_list?.[0]?.upload_url
    if (!uploadUrl) return
    const putRes = await fetch(uploadUrl, { method: "PUT", body: content })
    if (!putRes.ok) {
      throw new Error(`[AliyundriveOpen] Upload failed: ${putRes.status}`)
    }
    await this.openApiRequest("/openFile/complete", {
      drive_id: this.driveId,
      file_id: createResp.file_id,
      upload_id: createResp.upload_id,
    })
  }
}

// ============================================================
// 3. AliyunShareClient - 分享链接（不需要 access_token，但需要 share_token）
// ============================================================
export class AliyunShareClient {
  private shareId: string
  private sharePwd: string
  private shareToken: string = ""
  private shareTokenExpiresAt: number = 0
  // 可选的访问账号 token（用于挂载分享文件）
  private accessToken: string = ""

  constructor(shareId: string, sharePwd: string = "") {
    this.shareId = shareId
    this.sharePwd = sharePwd
  }

  public async init(): Promise<void> {
    try {
      await this.refreshShareToken()
    } catch (e: any) {
      console.warn("[AliyundriveShare] init warning:", e.message)
    }
  }

  public async refreshShareToken(): Promise<void> {
    const data: any = { share_id: this.shareId }
    if (this.sharePwd) {
      data.share_pwd = this.sharePwd
    }
    const res = await fetch(
      `${ALI_SHARE_API}/adrive/v2/share_link/get_share_token`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Canary": "client=web,app=share,version=v2.3.1",
        },
        body: JSON.stringify(data),
      },
    )
    if (!res.ok) {
      const text = await res.text().catch(() => "")
      throw new Error(
        `[AliyundriveShare] Share token refresh failed [${res.status}]: ${text}`,
      )
    }
    const resp: AliyunShareTokenResp = await res.json()
    if (!resp.share_token) {
      throw new Error(`[AliyundriveShare] Empty share_token returned`)
    }
    this.shareToken = resp.share_token
    // Share tokens typically expire in ~2 hours
    this.shareTokenExpiresAt = Date.now() + 7200 * 1000 - 60000
  }

  private async ensureShareToken(): Promise<void> {
    if (!this.shareToken || Date.now() >= this.shareTokenExpiresAt) {
      await this.refreshShareToken()
    }
  }

  public async listFiles(
    parentFileId: string = "root",
  ): Promise<AliyunFileItem[]> {
    await this.ensureShareToken()
    const items: AliyunFileItem[] = []
    let marker: string | undefined
    do {
      const body: any = {
        share_id: this.shareId,
        parent_file_id: parentFileId,
        limit: 100,
        order_by: "updated_at",
        order_direction: "DESC",
      }
      if (marker) body.marker = marker
      const res = await fetch(`${ALI_SHARE_API}/adrive/v2/file/list_by_share`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Share-Token": this.shareToken,
          "X-Canary": "client=web,app=share,version=v2.3.1",
        },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const text = await res.text().catch(() => "")
        throw new Error(
          `[AliyundriveShare] List failed [${res.status}]: ${text}`,
        )
      }
      const resp: any = await res.json()
      items.push(...(resp.items || []))
      marker = resp.next_marker || undefined
    } while (marker)
    return items
  }

  public async getDownloadUrl(fileId: string): Promise<string> {
    await this.ensureShareToken()
    const res = await fetch(
      `${ALI_SHARE_API}/v2/file/get_share_link_download_url`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Share-Token": this.shareToken,
          "X-Canary": "client=web,app=share,version=v2.3.1",
        },
        body: JSON.stringify({
          share_id: this.shareId,
          file_id: fileId,
          expire_sec: 14400,
        }),
      },
    )
    if (!res.ok) {
      const text = await res.text().catch(() => "")
      throw new Error(
        `[AliyundriveShare] GetDownloadUrl failed [${res.status}]: ${text}`,
      )
    }
    const data: any = await res.json()
    return data.download_url || data.url || ""
  }
}
