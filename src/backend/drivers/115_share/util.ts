import {
  Pan115ShareAddition,
  Pan115ShareItem,
  Pan115ShareSnapResp,
} from "./types"

export class Pan115ShareApiClient {
  private addition: Pan115ShareAddition

  constructor(addition: Pan115ShareAddition) {
    this.addition = addition
  }

  async init(): Promise<void> {
    if (!this.addition.share_code || !this.addition.receive_code) {
      throw new Error("115 Share: share_code and receive_code are required")
    }
  }

  async getFiles(cid = "0"): Promise<Pan115ShareItem[]> {
    const pageSize = this.addition.page_size || 1000
    const items: Pan115ShareItem[] = []
    let offset = 0
    let total = 0

    do {
      const u = new URL("https://webapi.115.com/share/snap")
      u.searchParams.set("share_code", this.addition.share_code)
      u.searchParams.set("receive_code", this.addition.receive_code)
      u.searchParams.set("cid", cid || "0")
      u.searchParams.set("limit", String(pageSize))
      u.searchParams.set("offset", String(offset))

      const headers: Record<string, string> = {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Referer: "https://115.com/",
      }
      if (this.addition.cookie) {
        headers["Cookie"] = this.addition.cookie
      }

      const res = await fetch(u.toString(), { headers })
      if (!res.ok) {
        throw new Error(`115 Share API error: HTTP ${res.status}`)
      }

      const json = (await res.json()) as Pan115ShareSnapResp
      if (!json.state) {
        throw new Error(`115 Share API error: ${json.msg || "failed"}`)
      }

      const list = json.data?.list || []
      items.push(...list)
      total = json.data?.count || 0
      offset += list.length

      if (list.length === 0) break
    } while (offset < total)

    return items
  }

  async getDownloadUrl(fileId: string): Promise<string> {
    const u = new URL("https://proapi.115.com/app/share/downurl")
    const body = new URLSearchParams({
      share_code: this.addition.share_code,
      receive_code: this.addition.receive_code,
      file_id: fileId,
    })

    const headers: Record<string, string> = {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      "Content-Type": "application/x-www-form-urlencoded",
    }
    if (this.addition.cookie) {
      headers["Cookie"] = this.addition.cookie
    }

    const res = await fetch(u.toString(), {
      method: "POST",
      headers,
      body: body.toString(),
    })

    if (!res.ok) {
      throw new Error(`115 Share download error: HTTP ${res.status}`)
    }

    const json = (await res.json()) as any
    const rawUrl = json.data?.url?.url || json.data?.url
    if (!rawUrl) {
      throw new Error(json.msg || "Empty download URL received from 115 Share")
    }
    return rawUrl
  }
}
