import {
  AliyundriveOpenAddition,
  AliyunTokenResp,
  AliyunFileItem,
} from "./types"

const ALI_OPEN_API = "https://openapi.aliyundrive.com/adrive/v1.0"

// ============================================================
// AliyunOpenClient - 阿里云盘 OAuth2 OpenAPI 客户端
// 优先通过在线 API 中转（GET + query params），
// 备用直连 OAuth 端点（需要 client_id + client_secret）
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
      if (!this.driveId) {
        await this.resolveDriveId()
      }
    } catch (e: any) {
      console.warn("[AliyundriveOpen] init warning:", e.message)
    }
  }

  private async resolveDriveId(forceResource = false): Promise<void> {
    if (
      !forceResource &&
      this.addition.drive_id &&
      this.addition.drive_id.trim()
    ) {
      this.driveId = this.addition.drive_id.trim()
      return
    }

    try {
      const res = await this.openApiRequest<any>("/user/getDriveInfo", {})
      const driveType = forceResource
        ? "resource"
        : this.addition.drive_type || "resource"

      let pickedDriveId = ""
      if (driveType === "resource" && res.resource_drive_id) {
        pickedDriveId = res.resource_drive_id
      } else if (driveType === "backup" && res.backup_drive_id) {
        pickedDriveId = res.backup_drive_id
      } else if (driveType === "default" && res.default_drive_id) {
        pickedDriveId = res.default_drive_id
      }

      if (!pickedDriveId) {
        pickedDriveId =
          res.resource_drive_id ||
          res.default_drive_id ||
          res.backup_drive_id ||
          ""
      }

      this.driveId = pickedDriveId
      console.log(
        `[AliyundriveOpen] Resolved drive_id: ${this.driveId} (driveType: ${driveType})`,
      )
    } catch (e: any) {
      console.warn("[AliyundriveOpen] resolveDriveId failed:", e.message)
    }
  }

  public async refreshAccessToken(): Promise<void> {
    if (!this.refreshTokenVal || !this.refreshTokenVal.trim()) {
      return
    }
    const token = this.refreshTokenVal.trim()

    // 策略1: 通过在线 API 中转（GET + query params）
    const onlineApis: string[] = []
    if (this.addition.api_url_address && this.addition.api_url_address.trim()) {
      onlineApis.push(this.addition.api_url_address.trim())
    }
    onlineApis.push(
      "https://api.oplist.org/alicloud/renewapi",
      "https://api.oplist.org/ali_open/token",
      "https://api.oplist.org/aliyundrive/token",
      "https://api.alist.nn.ci/alist/ali_open/token",
      "https://api.alist.nn.ci/aliyundrive/token",
      "https://api-sam.oplist.org/aliyundrive/token",
    )

    const driverTxt =
      this.addition.alipan_type === "alipanTV" ? "alicloud_tv" : "alicloud_qr"

    for (const apiUrl of onlineApis) {
      try {
        const params = new URLSearchParams({
          refresh_ui: token,
          refresh_token: token,
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

    // 策略2: 直连 OpenAPI OAuth（需要 client_id + client_secret，或默认 Client ID）
    const clientId =
      (this.addition.client_id || "").trim() ||
      "25ab4837190e48718a28f80073574a4d"
    const clientSecret = (this.addition.client_secret || "").trim()

    try {
      const payload: any = {
        grant_type: "refresh_token",
        refresh_token: token,
        client_id: clientId,
      }
      if (clientSecret) payload.client_secret = clientSecret

      const res = await fetch(
        "https://openapi.aliyundrive.com/oauth/access_token",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
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
    if (!this.driveId) {
      await this.resolveDriveId()
    }
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

      let resp: any
      try {
        resp = await this.openApiRequest<any>("/openFile/list", body)
      } catch (err: any) {
        if (err.message?.includes("UserNotAllowedAccessDrive")) {
          console.warn(
            `[AliyundriveOpen] UserNotAllowedAccessDrive for drive ${this.driveId}, auto re-resolving drive_id...`,
          )
          await this.resolveDriveId(true)
          body.drive_id = this.driveId
          resp = await this.openApiRequest<any>("/openFile/list", body)
        } else {
          throw err
        }
      }

      items.push(...(resp.items || []))
      marker = resp.next_marker || undefined
    } while (marker)
    return items
  }

  public async getFile(fileId: string): Promise<AliyunFileItem> {
    if (!this.driveId) {
      await this.resolveDriveId()
    }
    return this.openApiRequest<AliyunFileItem>("/openFile/get", {
      drive_id: this.driveId,
      file_id: fileId,
    })
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
    const putRes = await fetch(uploadUrl, {
      method: "PUT",
      body: content as any,
    })
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
