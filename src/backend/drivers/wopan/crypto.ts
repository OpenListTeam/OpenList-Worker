import CryptoJS from "crypto-js"
import { DefaultClientSecret, ChannelAPIUser } from "./consts"

const DEFAULT_IV = "wNSOYIB1k1DjY5lA"

export interface HeaderResult {
  key: string
  resTime: number
  reqSeq: number
  channel: string
  sign: string
  version: string
}

export class WoPanCrypto {
  private key: string = DefaultClientSecret
  private iv: string = DEFAULT_IV
  private accessKey: string = ""

  constructor(accessToken?: string) {
    if (accessToken) {
      this.setAccessToken(accessToken)
    }
  }

  setAccessToken(token: string): void {
    if (token && token.length >= 16) {
      this.accessKey = token.slice(0, 16)
    } else if (token) {
      this.accessKey = token
    }
  }

  encrypt(content: string, channel: string): string {
    const keyStr =
      channel === ChannelAPIUser ? this.key : this.accessKey || this.key
    const key = CryptoJS.enc.Utf8.parse(keyStr)
    const iv = CryptoJS.enc.Utf8.parse(this.iv)
    const encrypted = CryptoJS.AES.encrypt(
      CryptoJS.enc.Utf8.parse(content),
      key,
      {
        iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7,
      },
    )
    return encrypted.toString()
  }

  decrypt(cipherBase64: string, channel: string): string {
    const keyStr =
      channel === ChannelAPIUser ? this.key : this.accessKey || this.key
    const key = CryptoJS.enc.Utf8.parse(keyStr)
    const iv = CryptoJS.enc.Utf8.parse(this.iv)
    const decrypted = CryptoJS.AES.decrypt(cipherBase64, key, {
      iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    })
    return decrypted.toString(CryptoJS.enc.Utf8)
  }

  userEncrypt(content: string): string {
    return this.encrypt(content, ChannelAPIUser)
  }

  userDecrypt(content: string): string {
    return this.decrypt(content, ChannelAPIUser)
  }

  woHomeEncrypt(content: string): string {
    return this.encrypt(content, "wohome")
  }

  woHomeDecrypt(content: string): string {
    return this.decrypt(content, "wohome")
  }

  calHeader(channel: string, key: string): HeaderResult {
    const resTime = Date.now()
    const reqSeq = Math.floor(Math.random() * 8999) + 100000
    const version = ""
    const sign = CryptoJS.MD5(
      `${key}${resTime}${reqSeq}${channel}${version}`,
    ).toString()
    return {
      key,
      resTime,
      reqSeq,
      channel,
      sign,
      version,
    }
  }
}
