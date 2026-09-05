// 189PC utility functions
import { createHash, createHmac } from "crypto"
import { Cloud189PCAddition } from "./types"
import {
  AppID,
  ClientType,
  APIPrefix,
  UploadURL,
} from "./consts"

export class Cloud189PCClient {
  private addition: Cloud189PCAddition
  private accessToken: string = ""
  private sessionKey: string = ""
  private sessionSecret: string = ""
  private deviceId: string = ""

  constructor(addition: Cloud189PCAddition) {
    this.addition = addition
    this.sessionKey = addition.session_key || ""
    this.sessionSecret = addition.session_secret || ""
    this.deviceId = addition.device_id || ""
  }

  setTokens(accessToken: string, sessionKey: string, sessionSecret: string) {
    this.accessToken = accessToken
    this.sessionKey = sessionKey
    this.sessionSecret = sessionSecret
  }

  getAccessToken(): string {
    return this.accessToken
  }

  getSessionKey(): string {
    return this.sessionKey
  }

  getSessionSecret(): string {
    return this.sessionSecret
  }

  getDeviceId(): string {
    return this.deviceId
  }

  setDeviceId(deviceId: string) {
    this.deviceId = deviceId
  }

  private signRequest(params: Record<string, any>): string {
    // Sort params and create signature string
    const keys = Object.keys(params).sort()
    const signStr = keys.map((k) => `${k}=${params[k]}`).join("&")
    
    // HMAC-SHA1 signature
    const hmac = createHmac("sha1", this.sessionSecret)
    hmac.update(signStr)
    return hmac.digest("hex").toUpperCase()
  }

  async request(
    url: string,
    options: {
      method?: string
      headers?: Record<string, string>
      body?: any
      params?: Record<string, any>
      needSign?: boolean
    } = {}
  ): Promise<any> {
    const method = options.method || "GET"
    const headers = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      "Accept": "application/json",
      ...options.headers,
    }

    let finalURL = url
    if (options.params) {
      const params = { ...options.params }
      
      // Add common params
      if (this.accessToken) {
        params.accessToken = this.accessToken
      }
      params.clientType = ClientType
      params.appId = AppID

      // Sign if needed
      if (options.needSign && this.sessionSecret) {
        const timestamp = Date.now().toString()
        params.timestamp = timestamp
        params.Signature = this.signRequest(params)
      }

      const queryString = new URLSearchParams(params).toString()
      finalURL = url.includes("?") ? `${url}&${queryString}` : `${url}?${queryString}`
    }

    const fetchOptions: RequestInit = {
      method,
      headers,
    }

    if (options.body) {
      if (typeof options.body === "string") {
        fetchOptions.body = options.body
      } else if (options.body instanceof FormData) {
        fetchOptions.body = options.body
        delete headers["Content-Type"] // Let browser set it
      } else {
        fetchOptions.body = JSON.stringify(options.body)
        headers["Content-Type"] = "application/json"
      }
    }

    const response = await fetch(finalURL, fetchOptions)
    
    if (!response.ok) {
      throw new Error(`Request failed: ${response.statusText}`)
    }

    const contentType = response.headers.get("content-type") || ""
    if (contentType.includes("application/json")) {
      return await response.json()
    }

    return await response.text()
  }

  async requestAPI(
    endpoint: string,
    params: Record<string, any> = {},
    needSign: boolean = true
  ): Promise<any> {
    const url = endpoint.startsWith("http") ? endpoint : `${APIPrefix}${endpoint}`
    return this.request(url, {
      method: "GET",
      params,
      needSign,
    })
  }

  async requestUploadAPI(
    endpoint: string,
    data: any,
    method: string = "POST"
  ): Promise<any> {
    const url = endpoint.startsWith("http") ? endpoint : `${UploadURL}${endpoint}`
    
    const headers: Record<string, string> = {
      "SessionKey": this.sessionKey,
    }

    return this.request(url, {
      method,
      headers,
      body: data,
    })
  }
}

export function calcMD5(buffer: Buffer): string {
  return createHash("md5").update(buffer).digest("hex").toUpperCase()
}

export function calcSHA1(buffer: Buffer): string {
  return createHash("sha1").update(buffer).digest("hex").toUpperCase()
}
