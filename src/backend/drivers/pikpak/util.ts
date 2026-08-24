import { md5, sha1 } from "../../pkg/crypto"
import {
  PikPakAddition,
  PikPakCaptchaTokenResp,
  PikPakErrResp,
  PikPakTokenResp,
} from "./types"

export const ANDROID_ALGORITHMS = [
  "SOP04dGzk0TNO7t7t9ekDbAmx+eq0OI1ovEx",
  "nVBjhYiND4hZ2NCGyV5beamIr7k6ifAsAbl",
  "Ddjpt5B/Cit6EDq2a6cXgxY9lkEIOw4yC1GDF28KrA",
  "VVCogcmSNIVvgV6U+AochorydiSymi68YVNGiz",
  "u5ujk5sM62gpJOsB/1Gu/zsfgfZO",
  "dXYIiBOAHZgzSruaQ2Nhrqc2im",
  "z5jUTBSIpBN9g4qSJGlidNAutX6",
  "KJE2oveZ34du/g1tiimm",
]

export const WEB_ALGORITHMS = [
  "C9qPpZLN8ucRTaTiUMWYS9cQvWOE",
  "+r6CQVxjzJV6LCV",
  "F",
  "pFJRC",
  "9WXYIDGrwTCz2OiVlgZa90qpECPD6olt",
  "/750aCr4lm/Sly/c",
  "RB+DT/gZCrbV",
  "",
  "CyLsf7hdkIRxRm215hl",
  "7xHvLi2tOYP0Y92b",
  "ZGTXXxu8E/MIWaEDB+Sm/",
  "1UI3",
  "E7fP5Pfijd+7K+t6Tg/NhuLq0eEUVChpJSkrKxpO",
  "ihtqpG6FMt65+Xk+tWUH2",
  "NhXXU9rg4XXdzo7u5o",
]

export const PC_ALGORITHMS = [
  "KHBJ07an7ROXDoK7Db",
  "G6n399rSWkl7WcQmw5rpQInurc1DkLmLJqE",
  "JZD1A3M4x+jBFN62hkr7VDhkkZxb9g3rWqRZqFAAb",
  "fQnw/AmSlbbI91Ik15gpddGgyU7U",
  "/Dv9JdPYSj3sHiWjouR95NTQff",
  "yGx2zuTjbWENZqecNI+edrQgqmZKP",
  "ljrbSzdHLwbqcRn",
  "lSHAsqCkGDGxQqqwrVu",
  "TsWXI81fD1",
  "vk7hBjawK/rOSrSWajtbMk95nfgf3",
]

export const ANDROID_CLIENT_ID = "YNxT9w7GMdWvEOKa"
export const ANDROID_CLIENT_SECRET = "dbw2OtmVEeuUvIptb1Coyg"
export const ANDROID_CLIENT_VERSION = "1.53.2"
export const ANDROID_PACKAGE_NAME = "com.pikcloud.pikpak"
export const ANDROID_SDK_VERSION = "2.0.6.206003"

export const WEB_CLIENT_ID = "YUMx5nI8ZU8Ap8pm"
export const WEB_CLIENT_SECRET = "dbw2OtmVEeuUvIptb1Coyg"
export const WEB_CLIENT_VERSION = "2.0.0"
export const WEB_PACKAGE_NAME = "mypikpak.com"
export const WEB_SDK_VERSION = "8.0.3"

export const PC_CLIENT_ID = "YvtoWO6GNHiuCl7x"
export const PC_CLIENT_SECRET = "1NIH5R1IEe2pAxZE3hv3uA"
export const PC_CLIENT_VERSION = "undefined"
export const PC_PACKAGE_NAME = "mypikpak.com"
export const PC_SDK_VERSION = "8.0.3"

export async function generateDeviceSign(
  deviceId: string,
  packageName: string,
): Promise<string> {
  const signatureBase = `${deviceId}${packageName}1appkey`
  const sha1Result = await sha1(signatureBase)
  const md5Result = md5(sha1Result)
  return `div101.${deviceId}${md5Result}`
}

export async function buildCustomUserAgent(
  deviceId: string,
  clientId: string,
  appName: string,
  sdkVersion: string,
  clientVersion: string,
  packageName: string,
  userId: string,
): Promise<string> {
  const deviceSign = await generateDeviceSign(deviceId, packageName)
  return [
    `ANDROID-${appName}/${clientVersion}`,
    `protocolVersion/200`,
    `accesstype/`,
    `clientid/${clientId}`,
    `clientversion/${clientVersion}`,
    `action_type/`,
    `networktype/WIFI`,
    `sessionid/`,
    `deviceid/${deviceId}`,
    `providername/NONE`,
    `devicesign/${deviceSign}`,
    `refresh_token/`,
    `sdkversion/${sdkVersion}`,
    `datetime/${Date.now()}`,
    `usrno/${userId}`,
    `appname/android-${appName}`,
    `session_origin/`,
    `grant_type/`,
    `appid/`,
    `clientip/`,
    `devicename/Xiaomi_M2004j7ac`,
    `osversion/13`,
    `platformversion/10`,
    `accessmode/`,
    `devicemodel/M2004J7AC`,
  ].join(" ")
}

export function getAction(method: string, url: string): string {
  try {
    const parsed = new URL(url)
    return `${method.toUpperCase()}:${parsed.pathname}`
  } catch {
    const match = url.match(/:\/\/[^/]+((\/[^/\s?#]+)*)/)
    return `${method.toUpperCase()}:${match ? match[1] : ""}`
  }
}

export class PikPakApiClient {
  private addition: PikPakAddition
  private clientId: string
  private clientSecret: string
  private clientVersion: string
  private packageName: string
  private sdkVersion: string
  private algorithms: string[]
  private deviceId: string
  private userId: string = ""
  private userAgent: string = ""
  private accessToken: string = ""
  private refreshTokenVal: string = ""
  private captchaTokenVal: string = ""
  private onTokenRefreshed?: (tokens: {
    accessToken: string
    refreshToken: string
    captchaToken?: string
  }) => Promise<void>

  constructor(
    addition: PikPakAddition,
    onTokenRefreshed?: (tokens: {
      accessToken: string
      refreshToken: string
      captchaToken?: string
    }) => Promise<void>,
  ) {
    this.addition = addition
    this.onTokenRefreshed = onTokenRefreshed
    this.refreshTokenVal = addition.refresh_token || ""
    this.captchaTokenVal = addition.captcha_token || ""

    const platform = addition.platform || "web"
    if (platform === "android") {
      this.clientId = ANDROID_CLIENT_ID
      this.clientSecret = ANDROID_CLIENT_SECRET
      this.clientVersion = ANDROID_CLIENT_VERSION
      this.packageName = ANDROID_PACKAGE_NAME
      this.sdkVersion = ANDROID_SDK_VERSION
      this.algorithms = ANDROID_ALGORITHMS
    } else if (platform === "pc") {
      this.clientId = PC_CLIENT_ID
      this.clientSecret = PC_CLIENT_SECRET
      this.clientVersion = PC_CLIENT_VERSION
      this.packageName = PC_PACKAGE_NAME
      this.sdkVersion = PC_SDK_VERSION
      this.algorithms = PC_ALGORITHMS
      this.userAgent =
        "MainWindow Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) PikPak/2.6.11.4955 Chrome/100.0.4896.160 Electron/18.3.15 Safari/537.36"
    } else {
      // web
      this.clientId = WEB_CLIENT_ID
      this.clientSecret = WEB_CLIENT_SECRET
      this.clientVersion = WEB_CLIENT_VERSION
      this.packageName = WEB_PACKAGE_NAME
      this.sdkVersion = WEB_SDK_VERSION
      this.algorithms = WEB_ALGORITHMS
      this.userAgent =
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }

    this.deviceId =
      addition.device_id ||
      md5(`${addition.username || ""}${addition.password || ""}`)
  }

  getCaptchaSign(): { timestamp: string; sign: string } {
    const timestamp = String(Date.now())
    let str = `${this.clientId}${this.clientVersion}${this.packageName}${this.deviceId}${timestamp}`
    for (const alg of this.algorithms) {
      str = md5(str + alg)
    }
    return { timestamp, sign: `1.${str}` }
  }

  async refreshCaptchaToken(
    action: string,
    metas: Record<string, string>,
  ): Promise<string> {
    const param = {
      action,
      captcha_token: this.captchaTokenVal,
      client_id: this.clientId,
      device_id: this.deviceId,
      meta: metas,
      redirect_uri: "xlaccsdk01://xbase.cloud/callback?state=harbor",
    }

    const res = await fetch(
      `https://user.mypikpak.net/v1/shield/captcha/init?client_id=${encodeURIComponent(this.clientId)}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": this.userAgent || "OpenListNext",
          "X-Device-ID": this.deviceId,
        },
        body: JSON.stringify(param),
      },
    )

    const data: PikPakCaptchaTokenResp & PikPakErrResp = await res.json()
    if (data.error_code && data.error_code !== 0) {
      throw new Error(
        `Captcha error ${data.error_code}: ${data.error_description || data.error}`,
      )
    }

    if (data.url) {
      throw new Error(`PikPak requires captcha verification: ${data.url}`)
    }

    if (data.captcha_token) {
      this.captchaTokenVal = data.captcha_token
    }

    return this.captchaTokenVal
  }

  async refreshCaptchaTokenAtLogin(
    action: string,
    userId: string,
  ): Promise<string> {
    const { timestamp, sign } = this.getCaptchaSign()
    const metas: Record<string, string> = {
      client_version: this.clientVersion,
      package_name: this.packageName,
      user_id: userId,
      timestamp,
      captcha_sign: sign,
    }
    return this.refreshCaptchaToken(action, metas)
  }

  async refreshCaptchaTokenInLogin(
    action: string,
    username: string,
  ): Promise<string> {
    const metas: Record<string, string> = {}
    if (/^\w+([-+.]\w+)*@\w+([-.]\w+)*\.\w+([-.]\w+)*$/.test(username)) {
      metas.email = username
    } else if (username.length >= 11 && username.length <= 18) {
      metas.phone_number = username
    } else {
      metas.username = username
    }
    return this.refreshCaptchaToken(action, metas)
  }

  async login(): Promise<void> {
    if (!this.addition.username || !this.addition.password) {
      throw new Error(
        "PikPak username or password is required when refresh_token is not provided",
      )
    }

    const url = "https://user.mypikpak.net/v1/auth/signin"
    if (!this.captchaTokenVal) {
      await this.refreshCaptchaTokenInLogin(
        getAction("POST", url),
        this.addition.username,
      )
    }

    const res = await fetch(
      `${url}?client_id=${encodeURIComponent(this.clientId)}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": this.userAgent || "OpenListNext",
          "X-Device-ID": this.deviceId,
          "X-Captcha-Token": this.captchaTokenVal,
        },
        body: JSON.stringify({
          captcha_token: this.captchaTokenVal,
          client_id: this.clientId,
          client_secret: this.clientSecret,
          username: this.addition.username,
          password: this.addition.password,
        }),
      },
    )

    const data: PikPakTokenResp & PikPakErrResp = await res.json()
    if (data.error_code && data.error_code !== 0) {
      throw new Error(
        `PikPak login failed (${data.error_code}): ${data.error_description || data.error}`,
      )
    }

    this.accessToken = data.access_token
    this.refreshTokenVal = data.refresh_token
    this.userId = data.sub || ""

    if (this.onTokenRefreshed) {
      await this.onTokenRefreshed({
        accessToken: this.accessToken,
        refreshToken: this.refreshTokenVal,
        captchaToken: this.captchaTokenVal,
      })
    }
  }

  async refreshToken(): Promise<void> {
    if (!this.refreshTokenVal) {
      await this.login()
      return
    }

    const url = "https://user.mypikpak.net/v1/auth/token"
    const res = await fetch(
      `${url}?client_id=${encodeURIComponent(this.clientId)}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": this.userAgent || "OpenListNext",
          "X-Device-ID": this.deviceId,
        },
        body: JSON.stringify({
          client_id: this.clientId,
          client_secret: this.clientSecret,
          grant_type: "refresh_token",
          refresh_token: this.refreshTokenVal,
        }),
      },
    )

    const data: PikPakTokenResp & PikPakErrResp = await res.json()
    if (data.error_code && data.error_code !== 0) {
      if (data.error_code === 4126 && this.addition.username) {
        await this.login()
        return
      }
      throw new Error(
        `PikPak token refresh failed (${data.error_code}): ${data.error_description || data.error}`,
      )
    }

    this.accessToken = data.access_token
    this.refreshTokenVal = data.refresh_token
    this.userId = data.sub || ""

    if (this.onTokenRefreshed) {
      await this.onTokenRefreshed({
        accessToken: this.accessToken,
        refreshToken: this.refreshTokenVal,
        captchaToken: this.captchaTokenVal,
      })
    }
  }

  async init(): Promise<void> {
    if (this.addition.platform === "android") {
      this.userAgent = await buildCustomUserAgent(
        this.deviceId,
        this.clientId,
        this.packageName,
        this.sdkVersion,
        this.clientVersion,
        this.packageName,
        this.userId,
      )
    }

    if (this.refreshTokenVal) {
      await this.refreshToken()
    } else {
      await this.login()
    }

    // Refresh captcha after login
    try {
      await this.refreshCaptchaTokenAtLogin(
        getAction("GET", "https://api-drive.mypikpak.net/drive/v1/files"),
        this.userId,
      )
    } catch (e) {
      console.warn("[PikPak] post-login captcha init warning:", e)
    }

    if (this.addition.platform === "android") {
      this.userAgent = await buildCustomUserAgent(
        this.deviceId,
        this.clientId,
        this.packageName,
        this.sdkVersion,
        this.clientVersion,
        this.packageName,
        this.userId,
      )
    }
  }

  async request<T = any>(
    url: string,
    options: {
      method?: string
      params?: Record<string, string>
      body?: any
      retryCount?: number
    } = {},
  ): Promise<T> {
    const { method = "GET", params, body, retryCount = 0 } = options

    let fullUrl = url
    if (params && Object.keys(params).length > 0) {
      const q = new URLSearchParams(params).toString()
      fullUrl += (url.includes("?") ? "&" : "?") + q
    }

    const headers: Record<string, string> = {
      "User-Agent": this.userAgent || "OpenListNext",
      "X-Device-ID": this.deviceId,
    }
    if (this.captchaTokenVal) {
      headers["X-Captcha-Token"] = this.captchaTokenVal
    }
    if (this.accessToken) {
      headers["Authorization"] = `Bearer ${this.accessToken}`
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

    if (data && typeof data === "object" && data.error_code) {
      const code = data.error_code
      if ((code === 4122 || code === 4121 || code === 16) && retryCount < 2) {
        await this.refreshToken()
        return this.request<T>(url, { ...options, retryCount: retryCount + 1 })
      }
      if (code === 9 && retryCount < 2) {
        await this.refreshCaptchaTokenAtLogin(
          getAction(method, url),
          this.userId,
        )
        return this.request<T>(url, { ...options, retryCount: retryCount + 1 })
      }
      throw new Error(
        `PikPak API Error (${code}): ${data.error_description || data.error || JSON.stringify(data)}`,
      )
    }

    if (!res.ok) {
      throw new Error(
        `PikPak request failed with status ${res.status}: ${text}`,
      )
    }

    return data as T
  }
}
