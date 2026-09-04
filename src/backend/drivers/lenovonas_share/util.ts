// 联想 NAS 分享 API 客户端
import {
  DriverLenovoNasShareAddition,
  LenovoFile,
  LenovoResp,
  LenovoAccessData,
  LenovoFilesData,
  LenovoLinkData,
} from "./types"

const DEFAULT_HOST = "https://siot-share.lenovo.com.cn"

export class ClientLenovoNasShare {
  private host: string
  private shareId: string
  private sharePwd: string
  private stoken = ""
  private expireAt = 0

  constructor(addition: DriverLenovoNasShareAddition) {
    this.host = (addition.host || DEFAULT_HOST).replace(/\/+$/, "")
    this.shareId = (addition.share_id || "").split("/").pop() || ""
    this.sharePwd = addition.share_pwd || ""
  }

  async init(): Promise<void> {
    if (!this.shareId) throw new Error("[Lenovo NAS Share] share_id is required")
    await this.getStoken()
  }

  private async request<T = any>(url: string): Promise<T> {
    const resp = await fetch(url, {
      method: "GET",
      headers: {
        origin: "https://siot-share.lenovo.com.cn",
        referer: "https://siot-share.lenovo.com.cn/",
        "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) openlist-client",
        platform: "web",
        "app-version": "3",
      },
    })
    const data: LenovoResp<T> = await resp.json().catch(() => ({ result: false } as any))
    if (!data.result) {
      throw new Error(`[Lenovo NAS Share] ${data.error?.msg || "request failed"}`)
    }
    return data.data
  }

  private async getStoken(): Promise<void> {
    const qs = new URLSearchParams({ code: this.shareId, password: this.sharePwd })
    const data = await this.request<LenovoAccessData>(
      `${this.host}/oneproxy/api/share/v1/access?${qs.toString()}`,
    )
    this.stoken = data.stoken || ""
    this.expireAt = Date.now() + (data.expires_in || 3600) * 1000 - 60000
  }

  private async checkStoken(): Promise<void> {
    if (Date.now() >= this.expireAt) await this.getStoken()
  }

  async list(path: string): Promise<LenovoFile[]> {
    await this.checkStoken()
    const clean = path.startsWith("/") ? path : "/" + path
    const qs = new URLSearchParams({
      code: this.shareId,
      num: "5000",
      stoken: this.stoken,
      path: clean,
    })
    const data = await this.request<LenovoFilesData>(
      `${this.host}/oneproxy/api/share/v1/files?${qs.toString()}`,
    )
    return data.list || []
  }

  async getDownloadUrl(path: string): Promise<string> {
    await this.checkStoken()
    const qs = new URLSearchParams({
      code: this.shareId,
      stoken: this.stoken,
      path: path.startsWith("/") ? path : "/" + path,
    })
    const data = await this.request<LenovoLinkData>(
      `${this.host}/oneproxy/api/share/v1/file/link?${qs.toString()}`,
    )
    const dtoken = data.param?.dtoken || ""
    return `${this.host}/oneproxy/api/share/v1/file/download?code=${encodeURIComponent(this.shareId)}&dtoken=${encodeURIComponent(dtoken)}`
  }

  downloadHeaders(): Record<string, string> {
    return { Referer: "https://siot-share.lenovo.com.cn" }
  }
}
