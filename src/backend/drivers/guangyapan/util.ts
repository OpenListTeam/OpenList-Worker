// GuangYaPan (光亚盘) HTTP client + helpers
import { hmacSha1Base64, md5 } from "../../pkg/crypto"
import {
  GuangYaPanStateChanges,
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
  private phoneNumber: string
  private captchaToken = ""
  /** 需要回写到存储配置的字段（token / captcha_token / verification_id 等） */
  onStateChanged?: (changes: GuangYaPanStateChanges) => Promise<void>

  constructor(addition: any) {
    this.clientId = addition.client_id || ""
    this.deviceId = addition.device_id || ""
    this.deviceSign = addition.device_sign || ""
    this.accessToken = addition.access_token || ""
    this.refreshToken = addition.refresh_token || ""
    this.phoneNumber = addition.phone_number || ""
    this.captchaToken = addition.captcha_token || ""
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
    await this.onStateChanged?.({
      access_token: this.accessToken,
      refresh_token: this.refreshToken,
    })
  }

  /** 账号 API 错误信息整理：优先 error_description */
  private static accountErr(json: any, status: number): string {
    return (
      (json?.error_description || json?.error || "").trim() ||
      `status=${status}`
    )
  }

  /**
   * 获取/刷新图形验证 token（滑块验证的服务端凭据）。
   * force=false 且已有 token 时直接复用。对齐 Go 版 ensureCaptchaToken。
   */
  async ensureCaptchaToken(force = false): Promise<void> {
    if (!force && this.captchaToken) return

    const headers = this.accountHeaders()
    if (this.captchaToken) headers["X-Captcha-Token"] = this.captchaToken
    const res = await fetch(`${gypAccountBaseURL}/v1/shield/captcha/init`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        client_id: this.clientId,
        action: "POST:/v1/auth/verification",
        device_id: this.deviceId,
        meta: {
          username: this.phoneNumber,
          phone_number: this.phoneNumber,
          VERIFICATION_PHONE: this.phoneNumber,
        },
      }),
    })
    const out = (await res.json().catch(() => ({}))) as any
    if (!res.ok || out.error || !(out.captcha_token || "").trim()) {
      throw new Error(
        "init captcha token failed: " +
          GuangYaPanClient.accountErr(out, res.status),
      )
    }
    this.captchaToken = out.captcha_token.trim()
    await this.onStateChanged?.({ captcha_token: this.captchaToken })
  }

  /**
   * 请求发送短信验证码，返回 verification_id。
   * captcha token 过期/失效时自动刷新一次重试。对齐 Go 版 requestVerificationID。
   */
  async requestVerificationID(): Promise<string> {
    const doRequest = async (): Promise<{ res: Response; out: any }> => {
      const headers = this.accountHeaders()
      if (this.captchaToken) headers["X-Captcha-Token"] = this.captchaToken
      const res = await fetch(`${gypAccountBaseURL}/v1/auth/verification`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          phone_number: this.phoneNumber,
          target: "ANY",
          client_id: this.clientId,
        }),
      })
      return { res, out: (await res.json().catch(() => ({}))) as any }
    }

    let { res, out } = await doRequest()
    // captcha 失效才触发刷新重试，重试上限 MAX_CAPTCHA_RETRIES 次
    // （初次请求 + 最多 2 次刷新重试 = 最多 3 次发码请求）
    const MAX_CAPTCHA_RETRIES = 2
    for (let retries = 0; ; retries++) {
      if (!this.isCaptchaInvalid(out)) {
        if (!res.ok || out.error || !(out.verification_id || "").trim()) {
          throw new Error(
            "request verification failed: " +
              GuangYaPanClient.accountErr(out, res.status),
          )
        }
        return out.verification_id.trim()
      }
      if (retries >= MAX_CAPTCHA_RETRIES) {
        throw new Error(
          "request verification failed after " +
            MAX_CAPTCHA_RETRIES +
            " captcha refreshes: " +
            GuangYaPanClient.accountErr(out, res.status),
        )
      }
      // captcha token 过期/失效：刷新后重试
      await this.ensureCaptchaToken(true)
      ;({ res, out } = await doRequest())
    }
  }

  private isCaptchaInvalid(out: any): boolean {
    const e = `${out?.error || ""} ${out?.error_description || ""}`
    return e.includes("captcha_invalid") || e.includes("captcha_token expired")
  }

  /**
   * 用短信验证码完成登录：verify → signin，成功后写入 token 并回写。
   * 对齐 Go 版 loginBySMSCode。
   */
  async loginBySMSCode(
    verifyCode: string,
    verificationId: string,
  ): Promise<void> {
    let vid = (verificationId || "").trim()
    if (!vid) vid = await this.requestVerificationID()

    const verifyRes = await fetch(
      `${gypAccountBaseURL}/v1/auth/verification/verify`,
      {
        method: "POST",
        headers: this.accountHeaders(),
        body: JSON.stringify({
          verification_id: vid,
          verification_code: verifyCode,
          client_id: this.clientId,
        }),
      },
    )
    const step2 = (await verifyRes.json().catch(() => ({}))) as any
    if (
      !verifyRes.ok ||
      step2.error ||
      !(step2.verification_token || "").trim()
    ) {
      throw new Error(
        "verify code failed: " +
          GuangYaPanClient.accountErr(step2, verifyRes.status),
      )
    }

    const signinRes = await fetch(`${gypAccountBaseURL}/v1/auth/signin`, {
      method: "POST",
      headers: this.accountHeaders(),
      body: JSON.stringify({
        verification_code: verifyCode,
        verification_token: step2.verification_token.trim(),
        username: this.phoneNumber,
        client_id: this.clientId,
      }),
    })
    const out = (await signinRes.json().catch(() => ({}))) as any
    if (!signinRes.ok || out.error || !(out.access_token || "").trim()) {
      throw new Error(
        "signin failed: " + GuangYaPanClient.accountErr(out, signinRes.status),
      )
    }

    this.accessToken = out.access_token.trim()
    this.refreshToken = (out.refresh_token || "").trim()
    // 一次性短信码登录成功后不应复用，verification_id 也已消费
    await this.onStateChanged?.({
      access_token: this.accessToken,
      refresh_token: this.refreshToken,
      verify_code: "",
      verification_id: "",
      send_code: false,
    })
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
