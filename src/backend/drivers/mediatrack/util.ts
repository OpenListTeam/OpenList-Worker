import {
  MediatrackAddition,
  MediatrackBaseResp,
  MediatrackChildrenResp,
  MediatrackFile,
} from "./types"

export class MediatrackApiClient {
  private addition: MediatrackAddition

  constructor(addition: MediatrackAddition) {
    this.addition = addition
  }

  async request<T = any>(
    url: string,
    options: {
      method?: string
      params?: Record<string, string>
      body?: any
    } = {},
  ): Promise<T> {
    const { method = "GET", params, body } = options

    let fullUrl = url
    if (params && Object.keys(params).length > 0) {
      const q = new URLSearchParams(params).toString()
      fullUrl += (fullUrl.includes("?") ? "&" : "?") + q
    }

    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.addition.access_token}`,
      Accept: "application/json",
    }
    if (body && typeof body === "object" && !(body instanceof Uint8Array)) {
      headers["Content-Type"] = "application/json"
    }

    const res = await fetch(fullUrl, {
      method,
      headers,
      body:
        body && typeof body === "object" && !(body instanceof Uint8Array)
          ? JSON.stringify(body)
          : body,
    })

    const text = await res.text()
    let data: any = {}
    try {
      data = JSON.parse(text)
    } catch {
      data = text
    }

    if (
      data &&
      typeof data === "object" &&
      data.status &&
      data.status !== "SUCCESS"
    ) {
      throw new Error(
        `MediaTrack API Error: ${data.message || JSON.stringify(data)}`,
      )
    }

    if (!res.ok) {
      throw new Error(`MediaTrack request failed (${res.status}): ${text}`)
    }

    return data as T
  }

  async init(): Promise<void> {
    await this.request("https://kayle.api.mediatrack.cn/users", {
      method: "GET",
    })
  }

  async getFiles(parentId: string): Promise<MediatrackFile[]> {
    const allFiles: MediatrackFile[] = []
    let page = 1

    let sort = ""
    if (this.addition.order_by) {
      sort = (this.addition.order_desc ? "-" : "") + this.addition.order_by
    }

    while (true) {
      const params: Record<string, string> = {
        page: String(page),
        size: "50",
      }
      if (sort) params.sort = sort

      const resp: MediatrackChildrenResp = await this.request(
        `https://jayce.api.mediatrack.cn/v4/assets/${encodeURIComponent(parentId)}/children`,
        {
          method: "GET",
          params,
        },
      )

      const assets = resp.data?.assets || []
      if (assets.length === 0) break

      allFiles.push(...assets)
      page++
    }

    return allFiles
  }

  async getDownloadUrl(assetId: string): Promise<string> {
    const projectId = this.addition.project_id || ""
    const tokenUrl = `https://kayn.api.mediatrack.cn/v1/download_token/asset?asset_id=${encodeURIComponent(assetId)}&source_type=project&password=&source_id=${encodeURIComponent(projectId)}`

    const tokenResp = await this.request<{ data: { token: string } }>(
      tokenUrl,
      {
        method: "GET",
      },
    )

    const token = tokenResp?.data?.token
    if (!token) {
      throw new Error(`Failed to get download token for asset ${assetId}`)
    }

    const redirectUrl = `https://kayn.api.mediatrack.cn/v1/download/redirect?token=${encodeURIComponent(token)}`
    const headRes = await fetch(redirectUrl, {
      method: "GET",
      redirect: "manual",
    })

    const location = headRes.headers.get("location")
    return location || redirectUrl
  }
}
