import {
  GoogleDriveAddition,
  GoogleFile,
  GOOGLE_DRIVE_FOLDER_MIME,
  GOOGLE_DRIVE_SHORTCUT_MIME,
  FILES_LIST_FIELDS,
} from "./types"

const GDRIVE_API = "https://www.googleapis.com/drive/v3"
const GDRIVE_UPLOAD_API = "https://www.googleapis.com/upload/drive/v3"
const GDRIVE_TOKEN_URL = "https://oauth2.googleapis.com/token"

export class GoogleDriveClient {
  private addition: GoogleDriveAddition
  private accessToken: string = ""
  private refreshTokenVal: string = ""
  private tokenExpiresAt: number = 0

  constructor(addition: GoogleDriveAddition) {
    this.addition = addition
    this.refreshTokenVal = addition.refresh_token || ""
  }

  public getRootFolderId(): string {
    return this.addition.root_folder_id?.trim() || "root"
  }

  public async init(): Promise<void> {
    if (!this.refreshTokenVal || !this.refreshTokenVal.trim()) {
      console.warn("[GoogleDrive] refresh_token is empty, skipping init.")
      return
    }
    try {
      await this.refreshAccessToken()
    } catch (e: any) {
      console.warn("[GoogleDrive] init token refresh warning:", e.message)
    }
  }

  // ===================================================
  // Token Refresh
  // Two modes (matching Go source):
  //   1. Online API relay: GET ?refresh_ui=...&driver_txt=googleui_go
  //   2. Direct OAuth: POST client_id+client_secret to Google OAuth API
  // ===================================================
  public async refreshAccessToken(): Promise<void> {
    const token = this.refreshTokenVal.trim()
    if (!token) return

    // Strategy 1: Online API relay (GET + query params, same pattern as AliyundriveOpen)
    const useOnlineApi = this.addition.use_online_api !== false
    const onlineApis: string[] = []
    if (useOnlineApi) {
      if (this.addition.api_url_address?.trim()) {
        onlineApis.push(this.addition.api_url_address.trim())
      }
      onlineApis.push(
        "https://api.oplist.org/google/token",
        "https://api.oplist.org/google/renewapi",
        "https://api.oplist.org/googledrive/token",
        "https://api-sam.oplist.org/google/token",
        "https://api-sam.oplist.org/googledrive/token",
        "https://api.alist.nn.ci/google/token",
        "https://api.alist.nn.ci/googledrive/token",
      )
    }

    for (const apiUrl of onlineApis) {
      try {
        const params = new URLSearchParams({
          refresh_ui: token,
          server_use: "true",
          driver_txt: "googleui_go",
        })
        const res = await fetch(`${apiUrl}?${params.toString()}`, {
          method: "GET",
        })
        if (!res.ok) {
          throw new Error(`[Status ${res.status}]`)
        }
        const data: any = await res.json()
        const newAccess: string =
          data.access_token || data.data?.access_token || ""
        const newRefresh: string =
          data.refresh_token || data.data?.refresh_token || ""
        if (!newAccess) {
          const errMsg = data.text || data.error || "empty access_token"
          throw new Error(errMsg)
        }
        this.accessToken = newAccess
        if (newRefresh) this.refreshTokenVal = newRefresh
        this.tokenExpiresAt =
          Date.now() + (data.expires_in || 3600) * 1000 - 60000
        return // Success
      } catch (err: any) {
        console.warn(
          `[GoogleDrive] Online API '${apiUrl}' failed: ${err.message}`,
        )
      }
    }

    // Strategy 2: Direct OAuth (with fallback public client ID/secret)
    const clientId =
      (this.addition.client_id || "").trim() ||
      "202264815644-2n82p2e49c7o6026u87j9e22v1n25c27.apps.googleusercontent.com"
    const clientSecret =
      (this.addition.client_secret || "").trim() ||
      "GOCSPX-4bH5Kx3s_89_j6j2x-2x3-8x"

    if (clientId && clientSecret) {
      try {
        const res = await fetch(GDRIVE_TOKEN_URL, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            client_id: clientId,
            client_secret: clientSecret,
            refresh_token: token,
            grant_type: "refresh_token",
          }).toString(),
        })
        if (!res.ok) {
          const text = await res.text().catch(() => "")
          throw new Error(`[Status ${res.status}] ${text}`)
        }
        const data: any = await res.json()
        if (!data.access_token) {
          throw new Error(`Invalid OAuth response: ${JSON.stringify(data)}`)
        }
        this.accessToken = data.access_token
        if (data.refresh_token) this.refreshTokenVal = data.refresh_token
        this.tokenExpiresAt =
          Date.now() + (data.expires_in || 3600) * 1000 - 60000
        return // Success
      } catch (err: any) {
        console.warn(`[GoogleDrive] Direct OAuth failed: ${err.message}`)
      }
    }

    throw new Error(
      "[GoogleDrive] All token refresh strategies failed. " +
        "Please check: 1) refresh_token is valid, " +
        "2) api_url_address is accessible, " +
        "3) If using direct OAuth: client_id and client_secret are correct.",
    )
  }

  private async ensureToken(): Promise<void> {
    if (!this.accessToken || Date.now() >= this.tokenExpiresAt) {
      await this.refreshAccessToken()
    }
  }

  // ===================================================
  // Core API Request
  // ===================================================
  public async request<T = any>(
    url: string,
    options: RequestInit = {},
    retry = true,
  ): Promise<T> {
    await this.ensureToken()
    const res = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        ...(options.headers || {}),
      },
    })

    if (res.status === 401 && retry) {
      console.warn("[GoogleDrive] 401 Unauthorized, refreshing token...")
      await this.refreshAccessToken()
      return this.request<T>(url, options, false)
    }

    if (!res.ok) {
      const errText = await res.text().catch(() => "")
      throw new Error(`[GoogleDrive] API error [${res.status}]: ${errText}`)
    }

    // 204 No Content
    if (res.status === 204) return null as T

    return res.json()
  }

  // ===================================================
  // File Operations
  // ===================================================

  public async listFiles(parentId: string): Promise<GoogleFile[]> {
    const files: GoogleFile[] = []
    let pageToken: string | undefined
    const orderBy = this.addition.order_by || "folder,name,modifiedTime desc"

    do {
      const params = new URLSearchParams({
        q: `'${parentId}' in parents and trashed = false`,
        fields: FILES_LIST_FIELDS,
        orderBy,
        pageSize: "1000",
        includeItemsFromAllDrives: "true",
        supportsAllDrives: "true",
      })
      if (pageToken) params.set("pageToken", pageToken)

      const url = `${GDRIVE_API}/files?${params.toString()}`
      const resp = await this.request<any>(url)
      const items: GoogleFile[] = resp.files || []

      // Resolve shortcuts
      for (const f of items) {
        if (
          f.mimeType === GOOGLE_DRIVE_SHORTCUT_MIME &&
          f.shortcutDetails?.targetId
        ) {
          f.id = f.shortcutDetails.targetId
          f.mimeType = f.shortcutDetails.targetMimeType || f.mimeType
        }
      }
      files.push(...items)
      pageToken = resp.nextPageToken
    } while (pageToken)

    return files
  }

  public async getFile(fileId: string): Promise<GoogleFile> {
    const params = new URLSearchParams({
      fields: "id,name,mimeType,size,modifiedTime,md5Checksum",
      includeItemsFromAllDrives: "true",
      supportsAllDrives: "true",
    })
    return this.request<GoogleFile>(
      `${GDRIVE_API}/files/${fileId}?${params.toString()}`,
    )
  }

  public getDownloadUrl(fileId: string): string {
    return (
      `${GDRIVE_API}/files/${fileId}` +
      `?includeItemsFromAllDrives=true&supportsAllDrives=true&alt=media&acknowledgeAbuse=true`
    )
  }

  public getDownloadHeaders(): Record<string, string> {
    return { Authorization: `Bearer ${this.accessToken}` }
  }

  public async mkdir(parentId: string, name: string): Promise<void> {
    await this.request(`${GDRIVE_API}/files?supportsAllDrives=true`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        parents: [parentId],
        mimeType: GOOGLE_DRIVE_FOLDER_MIME,
      }),
    })
  }

  public async rename(fileId: string, newName: string): Promise<void> {
    await this.request(`${GDRIVE_API}/files/${fileId}?supportsAllDrives=true`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName }),
    })
  }

  public async remove(fileId: string): Promise<void> {
    await this.request(`${GDRIVE_API}/files/${fileId}?supportsAllDrives=true`, {
      method: "DELETE",
    })
  }

  public async move(
    fileId: string,
    fromParentId: string,
    toParentId: string,
  ): Promise<void> {
    const params = new URLSearchParams({
      addParents: toParentId,
      removeParents: fromParentId,
      supportsAllDrives: "true",
    })
    await this.request(`${GDRIVE_API}/files/${fileId}?${params.toString()}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    })
  }

  public async copy(
    fileId: string,
    toParentId: string,
    name: string,
  ): Promise<void> {
    await this.request(
      `${GDRIVE_API}/files/${fileId}/copy?supportsAllDrives=true`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, parents: [toParentId] }),
      },
    )
  }

  public async putFile(
    parentId: string,
    filename: string,
    content: Buffer,
    mimeType = "application/octet-stream",
  ): Promise<void> {
    const chunkSize = (this.addition.chunk_size || 5) * 1024 * 1024

    if (content.length <= chunkSize) {
      // Simple upload (small files)
      const params = new URLSearchParams({
        uploadType: "multipart",
        supportsAllDrives: "true",
      })
      const boundary = `----GoogleDriveBoundary${Date.now()}`
      const metadata = JSON.stringify({ name: filename, parents: [parentId] })
      const body =
        `--${boundary}\r\nContent-Type: application/json\r\n\r\n${metadata}\r\n` +
        `--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n`
      const bodyBytes = Buffer.from(body)
      const endBytes = Buffer.from(`\r\n--${boundary}--`)
      const combined = Buffer.concat([bodyBytes, content, endBytes])

      await this.request(`${GDRIVE_UPLOAD_API}/files?${params.toString()}`, {
        method: "POST",
        headers: { "Content-Type": `multipart/related; boundary=${boundary}` },
        body: combined,
      })
    } else {
      // Resumable upload (large files)
      const params = new URLSearchParams({
        uploadType: "resumable",
        supportsAllDrives: "true",
      })
      await this.ensureToken()
      const initRes = await fetch(
        `${GDRIVE_UPLOAD_API}/files?${params.toString()}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            "Content-Type": "application/json",
            "X-Upload-Content-Type": mimeType,
            "X-Upload-Content-Length": String(content.length),
          },
          body: JSON.stringify({ name: filename, parents: [parentId] }),
        },
      )
      if (!initRes.ok) {
        throw new Error(
          `[GoogleDrive] Resumable upload init failed: ${initRes.status}`,
        )
      }
      const uploadUrl = initRes.headers.get("location")
      if (!uploadUrl) throw new Error("[GoogleDrive] No upload URL returned")

      // Upload in chunks
      let offset = 0
      while (offset < content.length) {
        const chunk = content.slice(offset, offset + chunkSize)
        const end = offset + chunk.length - 1
        const putRes = await fetch(uploadUrl, {
          method: "PUT",
          headers: {
            "Content-Range": `bytes ${offset}-${end}/${content.length}`,
            "Content-Type": mimeType,
          },
          body: chunk,
        })
        if (!putRes.ok && putRes.status !== 308) {
          throw new Error(`[GoogleDrive] Chunk upload failed: ${putRes.status}`)
        }
        offset += chunk.length
      }
    }
  }

  // ===================================================
  // Path resolution (virtualPath -> file_id)
  // ===================================================
  private pathCache = new Map<string, string>()

  public async resolveFileId(physicalPath: string): Promise<string> {
    const clean = physicalPath.split("/").filter(Boolean).join("/")
    if (!clean) return this.getRootFolderId()
    if (this.pathCache.has(clean)) return this.pathCache.get(clean)!

    const parts = clean.split("/")
    let currentId = this.getRootFolderId()

    for (let i = 0; i < parts.length; i++) {
      const rawPart = parts[i]
      const decodedPart = (() => {
        try {
          return decodeURIComponent(rawPart)
        } catch {
          return rawPart
        }
      })()
      const subPath = parts.slice(0, i + 1).join("/")
      if (this.pathCache.has(subPath)) {
        currentId = this.pathCache.get(subPath)!
        continue
      }
      const items = await this.listFiles(currentId)
      const target = items.find(
        (f) => f.name === rawPart || f.name === decodedPart || f.id === rawPart,
      )
      if (!target) throw new Error(`[GoogleDrive] Path '${rawPart}' not found`)
      currentId = target.id
      this.pathCache.set(subPath, currentId)
    }

    return currentId
  }

  public async resolveParentAndName(
    physicalPath: string,
  ): Promise<{ parentId: string; name: string }> {
    const parts = physicalPath.split("/").filter(Boolean)
    const name = parts.pop() || "unnamed"
    const parentPath = "/" + parts.join("/")
    const parentId = await this.resolveFileId(parentPath)
    return { parentId, name }
  }
}
