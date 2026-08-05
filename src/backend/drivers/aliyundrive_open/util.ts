import {
  AliyundriveOpenAddition,
  AliyunFileItem,
  AliyunTokenResp,
} from "./types"

const ALIYUN_OPEN_API = "https://openapi.aliyundrive.com/adrive/v1.0"

export class AliyunOpenClient {
  private addition: AliyundriveOpenAddition
  private accessToken: string = ""
  private refreshTokenVal: string = ""
  private driveId: string = ""
  private tokenExpiresAt: number = 0
  private pathToFileIdCache = new Map<string, string>()

  constructor(addition: AliyundriveOpenAddition) {
    this.addition = addition
    this.refreshTokenVal = addition.refresh_token || ""
    this.driveId = addition.drive_id || ""
  }

  public getDriveId(): string {
    return this.driveId
  }

  public getRootFolderId(): string {
    return this.addition.root_folder_id && this.addition.root_folder_id.trim()
      ? this.addition.root_folder_id.trim()
      : "root"
  }

  public async init(): Promise<void> {
    try {
      await this.refreshAccessToken()
    } catch (e: any) {
      console.warn("AliyundriveOpen initial token refresh warning:", e.message)
    }
  }

  public async refreshAccessToken(): Promise<void> {
    if (!this.refreshTokenVal || !this.refreshTokenVal.trim()) {
      console.warn(
        "AliyunDrive refresh_token is empty, skipping token refresh.",
      )
      return
    }

    const candidateApis: string[] = []
    if (this.addition.api_url_address && this.addition.api_url_address.trim()) {
      candidateApis.push(this.addition.api_url_address.trim())
    }
    candidateApis.push(
      "https://api.alist.nn.ci/aliyundrive/token",
      "https://api-sam.oplist.org/aliyundrive/token",
      "https://openapi.aliyundrive.com/oauth/access_token",
      "https://auth.aliyundrive.com/v2/account/token",
    )

    const clientId =
      (this.addition.client_id || "").trim() ||
      "25ab4837190e48718a28f80073574a4d"
    const payload: any = {
      grant_type: "refresh_token",
      refresh_token: this.refreshTokenVal.trim(),
      client_id: clientId,
    }
    if (this.addition.client_secret) {
      payload.client_secret = this.addition.client_secret
    }

    let lastError: Error | null = null

    for (const tokenApi of candidateApis) {
      try {
        const res = await fetch(tokenApi, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })

        if (!res.ok) {
          const errText = await res.text().catch(() => "")
          throw new Error(`[Status ${res.status}] ${errText}`)
        }

        const data: any = await res.json()
        const tokenData: AliyunTokenResp = data.data || data

        if (!tokenData.access_token) {
          throw new Error(
            `Invalid response token payload: ${JSON.stringify(data)}`,
          )
        }

        this.accessToken = tokenData.access_token
        if (tokenData.refresh_token) {
          this.refreshTokenVal = tokenData.refresh_token
        }
        this.tokenExpiresAt =
          Date.now() + (tokenData.expires_in || 7200) * 1000 - 60000

        // Auto-resolve drive_id if not specified
        if (!this.addition.drive_id) {
          const driveType = this.addition.drive_type || "default"
          if (driveType === "resource" && tokenData.resource_drive_id) {
            this.driveId = tokenData.resource_drive_id
          } else if (driveType === "backup" && tokenData.backup_drive_id) {
            this.driveId = tokenData.backup_drive_id
          } else {
            this.driveId =
              tokenData.default_drive_id ||
              tokenData.resource_drive_id ||
              tokenData.backup_drive_id ||
              ""
          }
        }

        // Successfully refreshed token!
        return
      } catch (err: any) {
        lastError = err
        console.warn(
          `AliyunDrive token refresh endpoint '${tokenApi}' failed: ${err.message}`,
        )
      }
    }

    throw new Error(
      `AliyunDrive token refresh failed across all fallback endpoints: ${
        lastError?.message || "Unknown error"
      }`,
    )
  }

  private async ensureToken(): Promise<void> {
    if (!this.accessToken || Date.now() >= this.tokenExpiresAt) {
      await this.refreshAccessToken()
    }
  }

  public async request<T = any>(
    path: string,
    body: any = {},
    retryOnUnauthorized: boolean = true,
  ): Promise<T> {
    await this.ensureToken()

    const url = path.startsWith("http") ? path : `${ALIYUN_OPEN_API}${path}`
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.accessToken}`,
      },
      body: JSON.stringify(body),
    })

    if (res.status === 401 && retryOnUnauthorized) {
      console.warn(
        "AliyunDrive 401 Unauthorized, refreshing token and retrying...",
      )
      await this.refreshAccessToken()
      return this.request<T>(path, body, false)
    }

    if (!res.ok) {
      const errorText = await res.text().catch(() => "")
      throw new Error(
        `AliyunDrive API error [${res.status}] ${path}: ${errorText}`,
      )
    }

    return (await res.json()) as T
  }

  // Resolve physical path (e.g., "/documents/pic.jpg") to AliyunDrive file_id
  public async getFileIdByPath(physicalPath: string): Promise<string> {
    const cleanPath = (physicalPath || "").split("/").filter(Boolean).join("/")

    if (!cleanPath) {
      return this.getRootFolderId()
    }

    if (this.pathToFileIdCache.has(cleanPath)) {
      return this.pathToFileIdCache.get(cleanPath)!
    }

    const parts = cleanPath.split("/")
    let currentId = this.getRootFolderId()

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]
      const subPath = parts.slice(0, i + 1).join("/")

      if (this.pathToFileIdCache.has(subPath)) {
        currentId = this.pathToFileIdCache.get(subPath)!
        continue
      }

      const items = await this.listOpenFiles(currentId)
      const target = items.find((item) => item.name === part)

      if (!target) {
        throw new Error(`Path component '${part}' not found in AliyunDrive`)
      }

      currentId = target.file_id
      this.pathToFileIdCache.set(subPath, currentId)
    }

    return currentId
  }

  public async listOpenFiles(parentFileId: string): Promise<AliyunFileItem[]> {
    const items: AliyunFileItem[] = []
    let marker: string | undefined = undefined

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
      if (marker) {
        body.marker = marker
      }

      const resp = await this.request<any>("/openFile/list", body)
      const fetchedItems: AliyunFileItem[] = resp.items || []
      items.push(...fetchedItems)

      marker =
        resp.next_marker && resp.next_marker !== ""
          ? resp.next_marker
          : undefined
    } while (marker)

    return items
  }

  public async getOpenFile(fileId: string): Promise<AliyunFileItem> {
    return await this.request<AliyunFileItem>("/openFile/get", {
      drive_id: this.driveId,
      file_id: fileId,
    })
  }

  public async getDownloadUrl(fileId: string): Promise<string> {
    const resp = await this.request<any>("/openFile/getDownloadUrl", {
      drive_id: this.driveId,
      file_id: fileId,
      expire_sec: 14400,
    })
    return resp.url || resp.download_url || ""
  }

  public async mkdir(
    parentFileId: string,
    name: string,
  ): Promise<AliyunFileItem> {
    return await this.request<AliyunFileItem>("/openFile/create", {
      drive_id: this.driveId,
      parent_file_id: parentFileId,
      name,
      type: "folder",
      check_name_mode: "refuse",
    })
  }

  public async rename(fileId: string, newName: string): Promise<void> {
    await this.request("/openFile/update", {
      drive_id: this.driveId,
      file_id: fileId,
      name: newName,
      check_name_mode: "refuse",
    })
  }

  public async remove(fileId: string): Promise<void> {
    const removeWay = this.addition.remove_way || "trash"
    if (removeWay === "trash") {
      await this.request("/openFile/recyclebin", {
        drive_id: this.driveId,
        file_id: fileId,
      })
    } else {
      await this.request("/openFile/delete", {
        drive_id: this.driveId,
        file_id: fileId,
      })
    }
  }

  public async move(fileId: string, toParentFileId: string): Promise<void> {
    await this.request("/openFile/move", {
      drive_id: this.driveId,
      file_id: fileId,
      to_parent_file_id: toParentFileId,
      check_name_mode: "refuse",
    })
  }

  public async copy(fileId: string, toParentFileId: string): Promise<void> {
    await this.request("/openFile/copy", {
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

    // Step 1: Create file upload session
    const createResp = await this.request<any>("/openFile/create", {
      drive_id: this.driveId,
      parent_file_id: parentFileId,
      name: filename,
      type: "file",
      size,
      check_name_mode: "auto_rename",
      part_info_list: [{ part_number: 1 }],
    })

    const uploadUrl = createResp.part_info_list?.[0]?.upload_url
    const uploadId = createResp.upload_id
    const fileId = createResp.file_id

    if (!uploadUrl) {
      // File already rapidly uploaded or created
      return
    }

    // Step 2: Upload content chunk via PUT
    const putRes = await fetch(uploadUrl, {
      method: "PUT",
      body: content,
    })

    if (!putRes.ok) {
      throw new Error(`AliyunDrive chunk upload failed: ${putRes.status}`)
    }

    // Step 3: Complete upload session
    await this.request("/openFile/complete", {
      drive_id: this.driveId,
      file_id: fileId,
      upload_id: uploadId,
    })
  }
}
