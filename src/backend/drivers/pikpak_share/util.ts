import {
  PikPakShareAddition,
  PikPakShareFileItem,
  PikPakShareResp,
} from "./types"

export class PikPakShareApiClient {
  private addition: PikPakShareAddition
  private passCodeToken = ""
  private deviceId = ""

  constructor(addition: PikPakShareAddition) {
    this.addition = addition
    this.deviceId = addition.device_id || this.generateDeviceId()
  }

  private generateDeviceId(): string {
    return "web_" + Math.random().toString(36).substring(2, 15)
  }

  async init(): Promise<void> {
    if (!this.addition.share_id) {
      throw new Error("PikPak Share: share_id is required")
    }
  }

  async getFiles(parentId = ""): Promise<PikPakShareFileItem[]> {
    const items: PikPakShareFileItem[] = []
    let pageToken = ""

    do {
      const u = new URL("https://api-drive.mypikpak.com/drive/v1/share")
      u.searchParams.set("share_id", this.addition.share_id)
      if (this.addition.share_pwd) {
        u.searchParams.set("pass_code", this.addition.share_pwd)
      }
      if (parentId) {
        u.searchParams.set("parent_id", parentId)
      }
      if (pageToken) {
        u.searchParams.set("page_token", pageToken)
      }
      u.searchParams.set("thumbnail_size", "SIZE_LARGE")

      const headers: Record<string, string> = {
        "X-Client-ID": "YUMx5nI8ZU8Ap8pm",
        "X-Device-ID": this.deviceId,
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      }
      if (this.passCodeToken) {
        headers["X-Share-Token"] = this.passCodeToken
      }

      const res = await fetch(u.toString(), { headers })
      if (!res.ok) {
        throw new Error(`PikPak Share error: HTTP ${res.status}`)
      }

      const json = (await res.json()) as PikPakShareResp
      if (json.pass_code_token) {
        this.passCodeToken = json.pass_code_token
      }

      const list = json.files || []
      items.push(...list)
      pageToken = json.next_page_token || ""

      if (list.length === 0) break
    } while (pageToken)

    return items
  }

  async getDownloadUrl(file: PikPakShareFileItem): Promise<string> {
    if (file.web_content_link) {
      return file.web_content_link
    }
    if (file.medias && file.medias.length > 0 && file.medias[0].link?.url) {
      return file.medias[0].link.url
    }
    throw new Error("Download URL not found in PikPak share item")
  }
}
