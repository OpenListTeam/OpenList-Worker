import {
  DropboxAddition,
  DropboxFileEntry,
  DropboxListResp,
  DropboxCurrentAccountResp,
  DropboxSpaceUsageResp,
} from "./types"

export class DropboxApiClient {
  private addition: DropboxAddition
  private onTokenRefreshed?: (tokens: {
    accessToken: string
    refreshToken: string
  }) => Promise<void>
  private base = "https://api.dropboxapi.com"
  private contentBase = "https://content.dropboxapi.com"

  constructor(
    addition: DropboxAddition,
    onTokenRefreshed?: (tokens: {
      accessToken: string
      refreshToken: string
    }) => Promise<void>,
  ) {
    this.addition = addition
    this.onTokenRefreshed = onTokenRefreshed
  }

  async refreshToken(): Promise<void> {
    if (this.addition.use_online_api && this.addition.api_url_address) {
      const u = new URL(this.addition.api_url_address)
      u.searchParams.set("refresh_ui", this.addition.refresh_token)
      u.searchParams.set("server_use", "true")
      u.searchParams.set("driver_txt", "dropboxs_go")

      const res = await fetch(u.toString())
      if (!res.ok) {
        throw new Error(`Failed to refresh token: HTTP ${res.status}`)
      }
      const data = (await res.json()) as any
      if (!data.access_token) {
        throw new Error(data.text || "Empty token returned from renew API")
      }
      this.addition.access_token = data.access_token
      if (data.refresh_token) {
        this.addition.refresh_token = data.refresh_token
      }
    } else {
      const url = `${this.base}/oauth2/token`
      const body = new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: this.addition.refresh_token,
        client_id: this.addition.client_id || "",
        client_secret: this.addition.client_secret || "",
      })

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: body.toString(),
      })

      if (!res.ok) {
        const text = await res.text()
        throw new Error(`Failed to refresh token: HTTP ${res.status} - ${text}`)
      }
      const data = (await res.json()) as any
      this.addition.access_token = data.access_token
      if (data.refresh_token) {
        this.addition.refresh_token = data.refresh_token
      }
    }

    if (this.onTokenRefreshed) {
      await this.onTokenRefreshed({
        accessToken: this.addition.access_token || "",
        refreshToken: this.addition.refresh_token || "",
      })
    }
  }

  async request<T = any>(
    uri: string,
    options: {
      method?: string
      body?: any
      isContentApi?: boolean
      customHeaders?: Record<string, string>
    } = {},
    retry = true,
  ): Promise<T> {
    if (!this.addition.access_token) {
      await this.refreshToken()
    }

    const host = options.isContentApi ? this.contentBase : this.base
    const url = `${host}${uri}`
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.addition.access_token}`,
      ...options.customHeaders,
    }

    if (this.addition.root_namespace_id) {
      headers["Dropbox-API-Path-Root"] = JSON.stringify({
        ".tag": "root",
        root: this.addition.root_namespace_id,
      })
    }

    let requestBody: any = undefined
    if (options.body !== undefined) {
      if (
        typeof options.body === "object" &&
        !(options.body instanceof Uint8Array) &&
        !(options.body instanceof ArrayBuffer) &&
        !(options.body instanceof ReadableStream)
      ) {
        headers["Content-Type"] = "application/json"
        requestBody = JSON.stringify(options.body)
      } else {
        requestBody = options.body
      }
    }

    const res = await fetch(url, {
      method: options.method || "POST",
      headers,
      body: requestBody,
    })

    if (!res.ok) {
      const text = await res.text()
      const isAuthErr =
        res.status === 401 ||
        text.includes("expired_access_token") ||
        text.includes("invalid_access_token")

      if (retry && isAuthErr) {
        await this.refreshToken()
        return this.request<T>(uri, options, false)
      }

      throw new Error(`Dropbox API error (${res.status}): ${text}`)
    }

    const contentType = res.headers.get("content-type") || ""
    if (contentType.includes("application/json")) {
      return (await res.json()) as T
    }
    return (await res.text()) as any
  }

  async init(): Promise<void> {
    if (!this.addition.access_token && this.addition.refresh_token) {
      await this.refreshToken()
    }
    if (!this.addition.root_namespace_id) {
      try {
        const account = await this.getCurrentAccount()
        if (account.root_info?.root_namespace_id) {
          this.addition.root_namespace_id = account.root_info.root_namespace_id
        }
      } catch (e) {
        console.warn("[Dropbox] failed to get root namespace ID:", e)
      }
    }
  }

  async getCurrentAccount(): Promise<DropboxCurrentAccountResp> {
    return this.request<DropboxCurrentAccountResp>(
      "/2/users/get_current_account",
      {
        method: "POST",
        body: null,
      },
    )
  }

  async getSpaceUsage(): Promise<DropboxSpaceUsageResp> {
    return this.request<DropboxSpaceUsageResp>("/2/users/get_space_usage", {
      method: "POST",
      body: null,
    })
  }

  async getFiles(dirPath: string): Promise<DropboxFileEntry[]> {
    const cleanPath = dirPath === "/" || dirPath === "" ? "" : dirPath
    let resp = await this.request<DropboxListResp>("/2/files/list_folder", {
      method: "POST",
      body: {
        path: cleanPath,
        recursive: false,
        include_deleted: false,
        include_has_explicit_shared_members: false,
        include_mounted_folders: true,
        include_non_downloadable_files: false,
        limit: 2000,
      },
    })

    const entries: DropboxFileEntry[] = [...resp.entries]
    while (resp.has_more) {
      resp = await this.request<DropboxListResp>(
        "/2/files/list_folder/continue",
        {
          method: "POST",
          body: { cursor: resp.cursor },
        },
      )
      entries.push(...resp.entries)
    }

    return entries
  }

  async getTemporaryLink(filePath: string): Promise<string> {
    const res = await this.request<{ link: string }>(
      "/2/files/get_temporary_link",
      {
        method: "POST",
        body: { path: filePath },
      },
    )
    return res.link
  }

  async createFolder(folderPath: string): Promise<void> {
    await this.request("/2/files/create_folder_v2", {
      method: "POST",
      body: {
        path: folderPath,
        autorename: false,
      },
    })
  }

  async move(fromPath: string, toPath: string): Promise<void> {
    await this.request("/2/files/move_v2", {
      method: "POST",
      body: {
        from_path: fromPath,
        to_path: toPath,
        autorename: false,
        allow_ownership_transfer: false,
        allow_shared_folder: false,
      },
    })
  }

  async copy(fromPath: string, toPath: string): Promise<void> {
    await this.request("/2/files/copy_v2", {
      method: "POST",
      body: {
        from_path: fromPath,
        to_path: toPath,
        autorename: false,
        allow_ownership_transfer: false,
        allow_shared_folder: false,
      },
    })
  }

  async delete(filePath: string): Promise<void> {
    await this.request("/2/files/delete_v2", {
      method: "POST",
      body: { path: filePath },
    })
  }
}
