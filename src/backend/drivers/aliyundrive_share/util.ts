import {
  AliyundriveShareAddition,
  AliyundriveShareItem,
  AliyundriveShareListResp,
} from "./types"

export class AliyundriveShareApiClient {
  private addition: AliyundriveShareAddition
  private shareToken = ""
  public driveId = ""

  constructor(addition: AliyundriveShareAddition) {
    this.addition = addition
  }

  async getShareToken(): Promise<string> {
    if (!this.addition.share_id) {
      throw new Error("Aliyundrive Share: share_id is required")
    }

    const body: Record<string, string> = {
      share_id: this.addition.share_id,
    }
    if (this.addition.share_pwd) {
      body["share_pwd"] = this.addition.share_pwd
    }

    const res = await fetch(
      "https://api.alipan.com/v2/share_link/get_share_token",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
    )

    if (!res.ok) {
      throw new Error(`Aliyundrive Share token error: HTTP ${res.status}`)
    }

    const json = (await res.json()) as any
    if (json.code) {
      throw new Error(json.message || `Aliyundrive Share error: ${json.code}`)
    }

    this.shareToken = json.share_token || ""
    return this.shareToken
  }

  async init(): Promise<void> {
    await this.getShareToken()
  }

  async getFiles(parentId = "root"): Promise<AliyundriveShareItem[]> {
    if (!this.shareToken) {
      await this.getShareToken()
    }

    const items: AliyundriveShareItem[] = []
    let marker = ""

    do {
      const body: any = {
        image_thumbnail_process: "image/resize,w_160/format,jpeg",
        image_url_process: "image/resize,w_1920/format,jpeg",
        limit: 200,
        order_by: this.addition.order_by || "name",
        order_direction: this.addition.order_direction || "ASC",
        parent_file_id: parentId || "root",
        share_id: this.addition.share_id,
        video_thumbnail_process: "video/snapshot,t_1000,f_jpg,ar_auto,w_300",
        marker: marker || undefined,
      }

      const res = await fetch("https://api.alipan.com/adrive/v3/file/list", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-share-token": this.shareToken,
          "X-Canary": "client=web,app=share,version=v2.3.1",
        },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        throw new Error(`Aliyundrive Share list error: HTTP ${res.status}`)
      }

      const json = (await res.json()) as any
      if (
        json.code === "ShareLinkTokenInvalid" ||
        json.code === "AccessTokenInvalid"
      ) {
        await this.getShareToken()
        return this.getFiles(parentId)
      }
      if (json.code) {
        throw new Error(json.message || `Aliyundrive list error (${json.code})`)
      }

      const list: AliyundriveShareItem[] = json.items || []
      items.push(...list)
      marker = json.next_marker || ""

      if (list.length > 0 && !this.driveId && list[0].drive_id) {
        this.driveId = list[0].drive_id
      }
    } while (marker)

    return items
  }

  async getDownloadUrl(fileId: string): Promise<string> {
    if (!this.shareToken) {
      await this.getShareToken()
    }

    const body: any = {
      share_id: this.addition.share_id,
      file_id: fileId,
      drive_id: this.driveId || undefined,
      expire_sec: 14400,
    }

    const res = await fetch(
      "https://api.alipan.com/v2/file/get_share_link_download_url",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-share-token": this.shareToken,
          "X-Canary": "client=web,app=share,version=v2.3.1",
        },
        body: JSON.stringify(body),
      },
    )

    if (!res.ok) {
      throw new Error(`Aliyundrive download URL error: HTTP ${res.status}`)
    }

    const json = (await res.json()) as any
    if (json.code === "ShareLinkTokenInvalid") {
      await this.getShareToken()
      return this.getDownloadUrl(fileId)
    }

    const downloadUrl = json.download_url || json.url
    if (!downloadUrl) {
      throw new Error("Failed to get download URL from Aliyundrive Share")
    }

    return downloadUrl
  }
}
