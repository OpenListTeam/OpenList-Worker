// ProtonDrive utility functions
import { ProtonDriveAddition, ProtonAuthResp } from "./types"
import {
  ProtonAPIBase,
  ProtonAuthInfoURL,
  ProtonAuthURL2,
  ProtonAuth2FAURL,
  ProtonUserURL,
} from "./consts"
import { createHash } from "crypto"

export class ProtonDriveClient {
  private addition: ProtonDriveAddition
  private accessToken: string = ""
  private refreshToken: string = ""
  private uid: string = ""

  constructor(addition: ProtonDriveAddition) {
    this.addition = addition
  }

  setTokens(accessToken: string, refreshToken: string, uid: string) {
    this.accessToken = accessToken
    this.refreshToken = refreshToken
    this.uid = uid
  }

  getAccessToken(): string {
    return this.accessToken
  }

  getUID(): string {
    return this.uid
  }

  async request(
    url: string,
    options: {
      method?: string
      headers?: Record<string, string>
      body?: any
      auth?: boolean
    } = {}
  ): Promise<any> {
    const method = options.method || "GET"
    const headers: Record<string, string> = {
      "User-Agent": "ProtonDrive/1.0",
      "Accept": "application/json",
      "x-pm-appversion": "web-drive@5.0.0",
      ...options.headers,
    }

    if (options.auth && this.accessToken) {
      headers["Authorization"] = `Bearer ${this.accessToken}`
      if (this.uid) {
        headers["x-pm-uid"] = this.uid
      }
    }

    const fetchOptions: RequestInit = {
      method,
      headers,
    }

    if (options.body) {
      if (options.body instanceof FormData || options.body instanceof Blob) {
        fetchOptions.body = options.body
      } else if (typeof options.body === "string") {
        fetchOptions.body = options.body
      } else {
        fetchOptions.body = JSON.stringify(options.body)
        headers["Content-Type"] = "application/json"
      }
    }

    const response = await fetch(url, fetchOptions)

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Request failed: ${response.status} ${errorText}`)
    }

    const contentType = response.headers.get("content-type") || ""
    if (contentType.includes("application/json")) {
      return await response.json()
    }

    return await response.text()
  }

  async requestAPI(
    endpoint: string,
    options: {
      method?: string
      body?: any
      params?: Record<string, any>
    } = {}
  ): Promise<any> {
    let url = endpoint.startsWith("http") ? endpoint : `${ProtonAPIBase}${endpoint}`

    if (options.params) {
      const queryString = new URLSearchParams(options.params).toString()
      url = url.includes("?") ? `${url}&${queryString}` : `${url}?${queryString}`
    }

    return this.request(url, {
      method: options.method || "GET",
      body: options.body,
      auth: true,
    })
  }

  async login(): Promise<void> {
    // Step 1: Get auth info
    const authInfoResp = await this.request(ProtonAuthInfoURL, {
      method: "POST",
      body: {
        Username: this.addition.email,
      },
    })

    // Step 2: Calculate auth
    const password = this.addition.password
    const salt = authInfoResp.Salt
    const modulus = authInfoResp.Modulus
    const serverEphemeral = authInfoResp.ServerEphemeral
    const version = authInfoResp.Version
    const srpSession = authInfoResp.SRPSession

    // Simplified SRP - in production you'd use a proper SRP library
    // For now, just use password hash as client proof
    const clientProof = createHash("sha256")
      .update(password + salt)
      .digest("base64")

    // Step 3: Perform auth
    const authBody: any = {
      Username: this.addition.email,
      ClientProof: clientProof,
      ClientEphemeral: "temp", // Would be calculated properly with SRP
      SRPSession: srpSession,
    }

    // Add 2FA if provided
    if (this.addition.two_fa_code) {
      authBody.TwoFactorCode = this.addition.two_fa_code
    }

    const authResp = await this.request(ProtonAuthURL2, {
      method: "POST",
      body: authBody,
    })

    const auth = authResp as ProtonAuthResp
    this.setTokens(auth.AccessToken, auth.RefreshToken, auth.UID)
  }

  async getUserInfo(): Promise<any> {
    return this.requestAPI(ProtonUserURL)
  }
}

export function calcMD5(buffer: Buffer): string {
  return createHash("md5").update(buffer).digest("hex")
}
