// Cloudreve V3 API 客户端（session cookie 认证）
import {
  DriverCloudreveV3Addition,
  CloudreveV3Resp,
  CloudreveV3Object,
} from "./types"

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

export class ClientCloudreveV3 {
  private addition: DriverCloudreveV3Addition
  private address: string
  private cookie: string
  private persistCookie?: (cookie: string) => void | Promise<void>

  constructor(
    addition: DriverCloudreveV3Addition,
    persistCookie?: (cookie: string) => void | Promise<void>,
  ) {
    this.addition = addition
    this.address = (addition.address || "").replace(/\/+$/, "")
    this.cookie = addition.cookie || ""
    this.persistCookie = persistCookie
  }

  async init(): Promise<void> {
    if (!this.address) throw new Error("[Cloudreve] address is required")
    if (!this.cookie) {
      await this.login()
    }
  }

  getCookie(): string {
    return this.cookie
  }

  private getUA(): string {
    return this.addition.custom_ua || UA
  }

  private async login(): Promise<void> {
    if (!this.addition.username || !this.addition.password) {
      throw new Error("[Cloudreve] username/password or cookie is required")
    }
    const resp = await fetch(`${this.address}/api/v3/user/session`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": this.getUA(),
      },
      body: JSON.stringify({
        username: this.addition.username,
        Password: this.addition.password,
        captchaCode: "",
      }),
    })
    const data = (await resp.json().catch(() => ({}))) as CloudreveV3Resp
    if (data.code !== 0) {
      throw new Error(`[Cloudreve] login failed: ${data.msg}`)
    }
    const sess = this.extractSessionCookie(resp)
    if (!sess) {
      throw new Error("[Cloudreve] login failed: no session cookie")
    }
    this.cookie = sess
    if (this.persistCookie) await this.persistCookie(this.cookie)
  }

  private extractSessionCookie(resp: Response): string {
    const setCookies =
      typeof (resp.headers as any).getSetCookie === "function"
        ? (resp.headers as any).getSetCookie()
        : []
    if (Array.isArray(setCookies)) {
      for (const sc of setCookies) {
        if (sc && sc.includes("cloudreve-session=")) {
          return sc.split(";")[0].split("=")[1]
        }
      }
    }
    const sc = resp.headers.get("set-cookie") || ""
    const m = /cloudreve-session=([^;]+)/.exec(sc)
    return m ? m[1] : ""
  }

  private async request<T = any>(
    method: string,
    path: string,
    body?: unknown,
    retry = false,
  ): Promise<T> {
    const headers: Record<string, string> = {
      Cookie: `cloudreve-session=${this.cookie}`,
      Accept: "application/json, text/plain, */*",
      "User-Agent": this.getUA(),
    }
    const options: RequestInit = { method, headers }
    if (body !== undefined) {
      headers["Content-Type"] = "application/json"
      options.body = JSON.stringify(body)
    }
    const resp = await fetch(`${this.address}/api/v3${path}`, options)
    const data = (await resp.json().catch(() => ({}))) as CloudreveV3Resp
    if (data.code === 401 && path !== "/user/session" && !retry) {
      if (this.addition.username && this.addition.password) {
        await this.login()
        return this.request<T>(method, path, body, true)
      }
    }
    if (data.code !== 0) {
      throw new Error(`[Cloudreve] ${data.msg || `HTTP ${resp.status}`}`)
    }
    // 更新 cookie（响应可能刷新 session）
    const sess = this.extractSessionCookie(resp)
    if (sess) this.cookie = sess
    return data.data as T
  }

  async listFiles(uri: string): Promise<CloudreveV3Object[]> {
    const resp = await this.request<CloudreveV3DirectoryResp>(
      "GET",
      `/directory${uri}`,
    )
    return resp?.objects || []
  }

  async getDownloadUrl(id: string): Promise<string> {
    const url = await this.request<string>("PUT", `/file/download/${id}`)
    if (!url) throw new Error("[Cloudreve] empty download url")
    if (url.startsWith("/api")) return this.address + url
    return url
  }

  downloadHeaders(): Record<string, string> {
    return {
      Referer: this.address,
      "User-Agent": this.getUA(),
    }
  }

  async mkdir(path: string): Promise<void> {
    await this.request("PUT", "/directory", { path })
  }

  async move(
    srcDir: string,
    dst: string,
    src: { dirs: string[]; items: string[] },
  ): Promise<void> {
    await this.request("PATCH", "/object", {
      action: "move",
      src_dir: srcDir,
      dst,
      src,
    })
  }

  async rename(
    src: { dirs: string[]; items: string[] },
    newName: string,
  ): Promise<void> {
    await this.request("PATCH", "/object/rename", {
      action: "rename",
      new_name: newName,
      src,
    })
  }

  async copy(
    srcDir: string,
    dst: string,
    src: { dirs: string[]; items: string[] },
  ): Promise<void> {
    await this.request("POST", "/object/copy", {
      src_dir: srcDir,
      dst,
      src,
    })
  }

  async remove(src: { dirs: string[]; items: string[] }): Promise<void> {
    await this.request("DELETE", "/object", src)
  }
}
