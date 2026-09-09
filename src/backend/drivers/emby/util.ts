// Emby HTTP client
import {
  EmbyAuthResp,
  EmbyItemDetailResp,
  EmbyListResp,
} from "./types"

const embyClientHeader =
  `MediaBrowser Client="OpenList", Device="OpenList", DeviceId="openlist-emby", Version="1.0.0"`

export class EmbyClient {
  baseURL: string
  token: string
  userID: string

  constructor(baseURL: string, token = "", userID = "") {
    this.baseURL = (baseURL || "").trim().replace(/\/+$/, "")
    this.token = token
    this.userID = userID
  }

  async login(username: string, password: string): Promise<void> {
    const res = await fetch(`${this.baseURL}/Users/AuthenticateByName`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Emby-Authorization": embyClientHeader,
      },
      body: JSON.stringify({ Username: username, Pw: password }),
    })
    if (!res.ok) {
      throw new Error(`emby auth failed: status=${res.status}`)
    }
    const data = (await res.json()) as EmbyAuthResp
    if (!data.AccessToken || !data.User?.Id) {
      throw new Error("emby auth response missing access token or user id")
    }
    this.token = data.AccessToken
    this.userID = data.User.Id
  }

  async getItems(parentID: string): Promise<EmbyListResp> {
    const q = new URLSearchParams({
      ParentId: parentID,
      Recursive: "false",
      Fields: "Path,Size,DateCreated,SeriesName,IndexNumber,ParentIndexNumber",
      api_key: this.token,
    })
    const res = await fetch(
      `${this.baseURL}/Users/${this.userID}/Items?${q.toString()}`,
    )
    if (!res.ok) {
      throw new Error(`emby list failed: status=${res.status}`)
    }
    return (await res.json()) as EmbyListResp
  }

  async getItemDetail(fileID: string): Promise<EmbyItemDetailResp | null> {
    const q = new URLSearchParams({ Fields: "MediaSources", api_key: this.token })
    const res = await fetch(
      `${this.baseURL}/Users/${this.userID}/Items/${encodeURIComponent(fileID)}?${q.toString()}`,
    )
    if (!res.ok) return null
    return (await res.json()) as EmbyItemDetailResp
  }
}
