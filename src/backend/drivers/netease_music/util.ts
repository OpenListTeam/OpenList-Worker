// 网易云音乐 API 客户端
import {
  DriverNeteaseMusicAddition,
  NeteaseSongItem,
  NeteaseListResp,
  NeteaseSongResp,
} from "./types"
import { weapi, linuxapi } from "./crypto"

interface ReqOption {
  crypto: "weapi" | "linuxapi"
  data: Record<string, string>
  cookies?: { name: string; value: string }[]
}

export class ClientNeteaseMusic {
  private addition: DriverNeteaseMusicAddition
  private csrfToken = ""
  private musicU = ""

  constructor(addition: DriverNeteaseMusicAddition) {
    this.addition = addition
  }

  init(): void {
    this.csrfToken = this.getCookie("__csrf")
    this.musicU = this.getCookie("MUSIC_U")
    if (!this.csrfToken || !this.musicU) {
      throw new Error("[NeteaseMusic] cookie must contain __csrf and MUSIC_U")
    }
  }

  private getCookie(name: string): string {
    const re = new RegExp(name + "=([^(;|$)]+)")
    const m = re.exec(this.addition.cookie)
    return m ? m[1] : ""
  }

  private async request(
    url: string,
    method: string,
    opt: ReqOption,
  ): Promise<any> {
    const headers: Record<string, string> = { Cookie: this.addition.cookie }
    if (url.includes("music.163.com")) {
      headers.Referer = "https://music.163.com"
    }

    let data: Record<string, string>
    if (opt.crypto === "weapi") {
      data = await weapi(opt.data)
      url = url.replace(/\/\w*api\//, "/weapi/")
    } else {
      data = await linuxapi({
        url: url.replace(/\/\w*api\//, "/api/"),
        method,
        params: opt.data,
      })
      headers["User-Agent"] =
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/60.0.3112.90 Safari/537.36"
      url = "https://music.163.com/api/linux/forward"
    }

    if (opt.cookies) {
      const extra = opt.cookies.map((c) => `${c.name}=${c.value}`).join("; ")
      headers.Cookie = headers.Cookie + "; " + extra
    }

    const resp = await fetch(url, {
      method,
      headers: {
        ...headers,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams(data).toString(),
    })
    return resp.json()
  }

  async getSongObjs(limit: number): Promise<NeteaseSongItem[]> {
    const resp = (await this.request(
      "https://music.163.com/weapi/v1/cloud/get",
      "POST",
      {
        crypto: "weapi",
        data: { limit: String(limit), offset: "0" },
        cookies: [{ name: "os", value: "pc" }],
      },
    )) as NeteaseListResp
    return resp.data || []
  }

  async getSongLink(id: string): Promise<string> {
    const resp = (await this.request(
      "https://music.163.com/api/song/enhance/player/url",
      "POST",
      {
        crypto: "linuxapi",
        data: { ids: "[" + id + "]", br: "999000" },
        cookies: [{ name: "os", value: "pc" }],
      },
    )) as NeteaseSongResp
    if (!resp.data || resp.data.length < 1) {
      throw new Error("[NeteaseMusic] song url not found")
    }
    return resp.data[0].url || ""
  }

  async removeSong(id: string): Promise<void> {
    await this.request("http://music.163.com/weapi/cloud/del", "POST", {
      crypto: "weapi",
      data: { songIds: "[" + id + "]" },
    })
  }
}
