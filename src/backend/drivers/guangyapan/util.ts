// GuangYaPan (光亚盘) HTTP client + helpers
import { hmacSha1Base64, md5 } from "../../pkg/crypto"
import {
  GypListResp,
  GypUploadTokenData,
  GypUploadTokenResp,
} from "./types"

export const gypAccountBaseURL = "https://account.guangyapan.com"
export const gypApiBaseURL = "https://api.guangyapan.com"

export function normalizePhoneE164(phone: string): string {
  let p = (phone || "").trim().replace(/\s/g, "")
  if (!p) return ""
  if (p.startsWith("+")) {
    if (p.startsWith("+86") && p.length > 3) {
      return "+86 " + p.slice(3)
    }
    return p
  }
  const digits = p.replace(/\D/g, "")
  if (digits.startsWith("86") && digits.length > 11) {
    // handled below
  }
  if (digits.length === 11) return "+86 " + digits
  return p
}

export function randomDeviceID(): string {
  const b = crypto.getRandomValues(new Uint8Array(16))
  return Array.from(b)
    .map((x) => x.toString(16).padStart(2, "0"))
    .join("")
}

export function normalizeDeviceID(v: string): string {
  const s = (v || "").toLowerCase().replace(/-/g, "")
  if (s.length !== 32 || !/^[0-9a-f]+$/.test(s)) return ""
  return s
}

export function unixOrNow(v: number): string {
  return v > 0 ? new Date(v * 1000).toISOString() : new Date().toISOString()
}

function isSuccessMsg(msg: string): boolean {
  const m = (msg || "").trim().toLowerCase()
  if (!m) return true
  return m === "success" || m === "ok" || m.includes("成功")
}

function isUploadAlreadyDone(msg: string): boolean {
  const m = (msg || "").trim().toLowerCase()
  if (!m) return false
  return (
    m === "上传已完成" ||
    m === "upload completed" ||
    m === "already uploaded" ||
    m === "秒传成功"
  )
}

export class GuangYaPanClient {
  private accessToken = ""
  private refreshToken = ""
  private clientId: string
  private deviceId: string
  private deviceSign: string
  onTokensChanged?: (accessToken: string, refreshToken: string) => Promise<void>

  constructor(addition: any) {
    this.clientId = addition.client_id || ""
    this.deviceId = addition.device_id || ""
    this.deviceSign = addition.device_sign || ""
    this.accessToken = addition.access_token || ""
    this.refreshToken = addition.refresh_token || ""
  }

  private accountHeaders(): Record<string, string> {
    return {
      Accept: "application/json, text/plain, */*",
      "Content-Type": "application/json",
      "X-Device-Model": "chrome%2F147.0.0.0",
      "X-Device-Name": "PC-Chrome",
      "X-Device-Sign": this.deviceSign,
      "X-Net-Work-Type": "NONE",
      "X-OS-Version": "MacIntel",
      "X-Platform-Version": "1",
      "X-Protocol-Version": "301",
      "X-Provider-Name": "NONE",
      "X-SDK-Version": "9.0.2",
      "X-Client-Id": this.clientId,
      "X-Client-Version": "0.0.1",
      "X-Device-Id": this.deviceId,
    }
  }

  private apiHeaders(): Record<string, string> {
    return {
      Accept: "application/json, text/plain, */*",
      "Content-Type": "application/json",
      Did: this.deviceId,
      Dt: "4",
      Authorization: "Bearer " + this.accessToken,
    }
  }

  get hasToken(): boolean {
    return !!this.accessToken
  }

  get hasRefreshToken(): boolean {
    return !!this.refreshToken
  }

  async validateToken(): Promise<void> {
    const res = await fetch(`${gypAccountBaseURL}/v1/user/me`, {
      headers: {
        ...this.accountHeaders(),
        Authorization: "Bearer " + this.accessToken,
      },
    })
    if (!res.ok) throw new Error(`validate token failed: ${res.status}`)
  }

  async refresh(): Promise<void> {
    if (!this.refreshToken) throw new Error("refresh_token is empty")
    const res = await fetch(`${gypAccountBaseURL}/v1/auth/token`, {
      method: "POST",
      headers: this.accountHeaders(),
      body: JSON.stringify({
        client_id: this.clientId,
        grant_type: "refresh_token",
        refresh_token: this.refreshToken,
      }),
    })
    const out = (await res.json()) as any
    if (!res.ok || out.error || !out.access_token) {
      throw new Error(
        "refresh token failed: " + (out.error_description || out.error || res.status),
      )
    }
    this.accessToken = out.access_token
    if (out.refresh_token) this.refreshToken = out.refresh_token
    await this.onTokensChanged?.(this.accessToken, this.refreshToken)
  }

  async postAPI<T>(path: string, body: any): Promise<T> {
    const doPost = async () => {
      const res = await fetch(`${gypApiBaseURL}${path}`, {
        method: "POST",
        headers: this.apiHeaders(),
        body: JSON.stringify(body ?? {}),
      })
      return { res, json: (await res.json().catch(() => ({}))) as T }
    }

    let { res, json } = await doPost()
    if ((res.status === 401 || res.status === 403) && this.refreshToken) {
      await this.refresh()
      const retried = await doPost()
      res = retried.res
      json = retried.json
    }
    if (!res.ok) {
      throw new Error(`request failed: status=${res.status}`)
    }
    return json
  }

  async getFileList(parentId: string, pageSize: number, orderBy: number, sortType: number): Promise<GypListResp> {
    return this.postAPI<GypListResp>("/userres/v1/file/get_file_list", {
      parentId,
      page: 0,
      pageSize,
      orderBy,
      sortType,
    })
  }

  async getDownloadURL(fileId: string): Promise<string> {
    const resp = await this.postAPI<any>(
      "/nd.bizuserres.s/v1/get_res_download_url",
      { fileId },
    )
    return (resp?.data?.signedURL || resp?.data?.downloadUrl || "").trim()
  }

  async getUploadToken(
    parentId: string,
    name: string,
    size: number,
    md5sum: string,
  ): Promise<{ data: GypUploadTokenData; code: number; alreadyDone: boolean }> {
    const res: any = { fileSize: size }
    if (md5sum) res.md5 = md5sum
    const resp = await this.postAPI<GypUploadTokenResp>(
      "/nd.bizuserres.s/v1/get_res_center_token",
      { capacity: 2, name, parentId, res },
    )
    const msg = resp.msg || ""
    const alreadyDone = resp.code === 156 || isUploadAlreadyDone(msg)
    if (!isSuccessMsg(msg) && !alreadyDone) {
      throw new Error("get upload token failed: " + msg)
    }
    return { data: resp.data, code: resp.code, alreadyDone }
  }

  async waitTaskDone(taskId: string): Promise<void> {
    for (let i = 0; i < 30; i++) {
      const out = await this.postAPI<any>("/nd.bizuserres.s/v1/get_task_status", {
        taskId,
      })
      if (!isSuccessMsg(out.msg)) {
        throw new Error("get task status failed: " + out.msg)
      }
      if (out.data?.status === 2) return
      if (out.data?.status === -1 || out.data?.status === 3) {
        throw new Error(`task ${taskId} failed with status=${out.data.status}`)
      }
      await new Promise((r) => setTimeout(r, 300))
    }
    throw new Error(`task ${taskId} timeout`)
  }

  async waitUploadTaskInfo(taskId: string): Promise<void> {
    for (let i = 0; i < 300; i++) {
      const out = await this.postAPI<any>(
        "/nd.bizuserres.s/v1/file/get_info_by_task_id",
        { taskId },
      )
      if (out.data?.fileId) return
      await new Promise((r) => setTimeout(r, 1000))
    }
    throw new Error(`upload task ${taskId} timeout`)
  }

  /** 计算文件 MD5（用于秒传） */
  static md5(content: Uint8Array): string {
    return md5(content)
  }
}

export { hmacSha1Base64, isSuccessMsg }
