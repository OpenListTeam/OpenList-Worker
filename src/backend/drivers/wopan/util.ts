import {
  DefaultAppID,
  DefaultBaseURL,
  DefaultClientID,
  DefaultClientSecret,
  DefaultPartSize,
  DefaultUA,
  DefaultZoneURL,
  ChannelAPIUser,
  ChannelWoCloud,
  ChannelWoHome,
  KeyAppQueryUser,
  KeyAppRefreshToken,
  KeyClassifyRule,
  KeyCopyFile,
  KeyCreateDirectory,
  KeyDeleteFile,
  KeyFamilyUserCurrentEncode,
  KeyGetDownloadUrlV2,
  KeyGetZoneInfo,
  KeyMoveFile,
  KeyQueryAllFiles,
  KeyQueryCloudUsageInfo,
  KeyRenameFileOrDirectory,
  KeyUpload2C,
  SpaceTypeFamily,
  SpaceTypePersonal,
} from "./consts"
import { WoPanCrypto } from "./crypto"
import {
  AppQueryUserData,
  AppRefreshTokenData,
  ClassifyRuleData,
  CreateDirectoryData,
  FamilyUserCurrentEncodeData,
  GetDownloadUrlV2Data,
  GetZoneInfoData,
  QueryAllFilesData,
  QueryCloudUsageInfoData,
  Upload2CResp,
  WoPanAddition,
  WoPanFile,
} from "./types"

function randomChars(length: number): string {
  const charset =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
  let res = ""
  for (let i = 0; i < length; i++) {
    res += charset.charAt(Math.floor(Math.random() * charset.length))
  }
  return res
}

function formatDateToBatchNo(d: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0")
  const y = d.getFullYear()
  const m = pad(d.getMonth() + 1)
  const day = pad(d.getDate())
  const h = pad(d.getHours())
  const min = pad(d.getMinutes())
  const s = pad(d.getSeconds())
  return `${y}${m}${day}${h}${min}${s}`
}

export class WoPanClient {
  private addition: WoPanAddition
  private accessToken: string
  private refreshTokenValue: string
  private phone: string = ""
  private zoneURL: string = ""
  private classifyRuleData: ClassifyRuleData | null = null
  private crypto: WoPanCrypto
  private onTokenUpdate?: (accessToken: string, refreshToken: string) => void

  constructor(
    addition: WoPanAddition,
    onTokenUpdate?: (accessToken: string, refreshToken: string) => void,
  ) {
    this.addition = addition
    this.accessToken = addition.access_token || ""
    this.refreshTokenValue = addition.refresh_token || ""
    this.onTokenUpdate = onTokenUpdate
    this.crypto = new WoPanCrypto(this.accessToken)
  }

  getAccessToken(): string {
    return this.accessToken
  }

  getRefreshToken(): string {
    return this.refreshTokenValue
  }

  setAccessToken(token: string): void {
    this.accessToken = token
    this.crypto.setAccessToken(token)
  }

  setRefreshToken(token: string): void {
    this.refreshTokenValue = token
  }

  async request<T = any>(
    channel: string,
    key: string,
    param: Record<string, any> | null,
    other: Record<string, any> = {},
    retry: boolean = true,
  ): Promise<T> {
    const header = this.crypto.calHeader(channel, key)

    const body: Record<string, any> = { ...other }
    if (param !== null && param !== undefined) {
      const paramStr = JSON.stringify(param)
      const encrypted = this.crypto.encrypt(paramStr, channel)
      body.param = encrypted
    }

    const headers: Record<string, string> = {
      Origin: "https://pan.wo.cn",
      Referer: "https://pan.wo.cn/",
      "User-Agent": DefaultUA,
      "Content-Type": "application/json;charset=UTF-8",
    }
    if (this.accessToken) {
      headers["Accesstoken"] = this.accessToken
    }

    const url = `${DefaultBaseURL}/${channel}/dispatcher`
    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({
        header,
        body,
      }),
    })

    if (!res.ok) {
      throw new Error(
        `[WoPan] Request failed with HTTP status: ${res.status} ${res.statusText}`,
      )
    }

    const resJson: any = await res.json().catch(() => null)
    if (!resJson) {
      throw new Error(`[WoPan] Response is not valid JSON from ${key}`)
    }

    if (resJson.STATUS !== "200") {
      throw new Error(
        `[WoPan] Request failed with status: ${resJson.STATUS}, msg: ${resJson.MSG || ""}`,
      )
    }

    const rspCode = resJson.RSP?.RSP_CODE
    if (rspCode !== "0000") {
      if (channel !== ChannelAPIUser && retry && rspCode === "9999") {
        await this.refreshToken()
        return this.request<T>(channel, key, param, other, false)
      }
      throw new Error(
        `[WoPan] Request failed with rsp_code: ${rspCode}, rsp_desc: ${resJson.RSP?.RSP_DESC || ""}`,
      )
    }

    let data = resJson.RSP?.DATA
    if (data === undefined || data === null) {
      return {} as T
    }

    if (typeof data === "string") {
      let trimmed = data.trim()
      if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
        trimmed = trimmed.slice(1, -1)
      }
      try {
        const decrypted = this.crypto.decrypt(trimmed, channel)
        if (decrypted) {
          return JSON.parse(decrypted) as T
        }
      } catch {
        try {
          return JSON.parse(trimmed) as T
        } catch {
          return trimmed as unknown as T
        }
      }
    }

    return data as T
  }

  async requestApiUser<T = any>(
    key: string,
    param: Record<string, any> | null,
    other: Record<string, any> = {},
  ): Promise<T> {
    return this.request<T>(ChannelAPIUser, key, param, other)
  }

  async requestWoHome<T = any>(
    key: string,
    param: Record<string, any> | null,
    other: Record<string, any> = {},
  ): Promise<T> {
    return this.request<T>(ChannelWoHome, key, param, other)
  }

  async appRefreshToken(): Promise<AppRefreshTokenData> {
    const data = await this.requestApiUser<AppRefreshTokenData>(
      KeyAppRefreshToken,
      {
        refreshToken: this.refreshTokenValue,
        clientSecret: DefaultClientSecret,
      },
      {
        clientId: DefaultClientID,
        secret: true,
      },
    )
    return data
  }

  async refreshToken(): Promise<void> {
    const resp = await this.appRefreshToken()
    if (!resp.access_token) {
      throw new Error("[WoPan] Failed to refresh token: empty access_token")
    }
    this.setAccessToken(resp.access_token)
    if (resp.refresh_token) {
      this.setRefreshToken(resp.refresh_token)
    }
    this.onTokenUpdate?.(this.accessToken, this.refreshTokenValue)
  }

  async appQueryUser(): Promise<AppQueryUserData> {
    return this.requestApiUser<AppQueryUserData>(
      KeyAppQueryUser,
      {
        accessToken: this.accessToken,
      },
      {
        clientId: DefaultClientID,
        secret: true,
      },
    )
  }

  async initPhone(): Promise<void> {
    if (this.phone) return
    const user = await this.appQueryUser()
    if (user?.userId) {
      this.phone = user.userId
    }
  }

  async classifyRule(): Promise<ClassifyRuleData> {
    return this.requestWoHome<ClassifyRuleData>(
      KeyClassifyRule,
      {},
      { key: true },
    )
  }

  async initClassifyRule(): Promise<void> {
    if (this.classifyRuleData) return
    const rules = await this.classifyRule().catch(() => null)
    if (rules) {
      this.classifyRuleData = rules
    }
  }

  async getZoneInfo(): Promise<GetZoneInfoData> {
    return this.requestWoHome<GetZoneInfoData>(
      KeyGetZoneInfo,
      {
        appId: DefaultAppID,
      },
      { key: true },
    )
  }

  async initZoneURL(): Promise<void> {
    if (this.zoneURL) return
    const zone = await this.getZoneInfo().catch(() => null)
    this.zoneURL = zone?.url || DefaultZoneURL
  }

  async familyUserCurrentEncode(): Promise<FamilyUserCurrentEncodeData> {
    return this.requestWoHome<FamilyUserCurrentEncodeData>(
      KeyFamilyUserCurrentEncode,
      {
        clientId: DefaultClientID,
      },
      { secret: true },
    )
  }

  async initData(): Promise<void> {
    if (!this.accessToken && this.refreshTokenValue) {
      await this.refreshToken()
    }
    await this.initPhone().catch(() => {})
    await this.initClassifyRule().catch(() => {})
    await this.initZoneURL().catch(() => {})
  }

  getFileType(filename: string): string {
    const ext = (filename.split(".").pop() || "").toLowerCase()
    if (!ext) return "5"
    if (this.classifyRuleData?.fileTypes?.[ext]) {
      return this.classifyRuleData.fileTypes[ext].type
    }
    return "5"
  }

  async queryAllFiles(
    spaceType: string,
    parentDirectoryId: string,
    pageNum: number,
    pageSize: number,
    sortRule: number,
    familyId: string = "",
  ): Promise<QueryAllFilesData> {
    const param: Record<string, any> = {
      spaceType,
      parentDirectoryId,
      pageNum,
      pageSize,
      sortRule,
      clientId: DefaultClientID,
    }
    if (spaceType === SpaceTypeFamily && familyId) {
      param.familyId = familyId
    }
    return this.requestWoHome<QueryAllFilesData>(KeyQueryAllFiles, param, {
      secret: true,
    })
  }

  async getDownloadUrlV2(fidList: string[]): Promise<GetDownloadUrlV2Data> {
    const param = {
      type: "1",
      fidList,
      clientId: DefaultClientID,
    }
    return this.requestWoHome<GetDownloadUrlV2Data>(
      KeyGetDownloadUrlV2,
      param,
      { secret: true },
    )
  }

  async createDirectory(
    spaceType: string,
    parentDirectoryId: string,
    directoryName: string,
    familyId: string = "",
  ): Promise<CreateDirectoryData> {
    const param: Record<string, any> = {
      spaceType,
      familyId,
      parentDirectoryId,
      directoryName,
      clientId: DefaultClientID,
    }
    return this.requestWoHome<CreateDirectoryData>(KeyCreateDirectory, param, {
      secret: true,
    })
  }

  async renameFileOrDirectory(
    spaceType: string,
    type: number, // 0: dir, 1: file
    id: string,
    name: string,
    familyId: string = "",
  ): Promise<void> {
    const fileType = type === 0 ? "0" : this.getFileType(name)
    const param: Record<string, any> = {
      spaceType,
      type,
      fileType,
      id,
      name,
      clientId: DefaultClientID,
    }
    if (spaceType === SpaceTypeFamily && familyId) {
      param.familyId = familyId
    }
    await this.requestWoHome(KeyRenameFileOrDirectory, param, { secret: true })
  }

  async moveFile(
    dirList: string[],
    fileList: string[],
    targetDirId: string,
    sourceType: string,
    targetType: string,
    fromFamilyId: string = "",
    targetFamilyId: string = "",
  ): Promise<void> {
    const param: Record<string, any> = {
      targetDirId,
      sourceType,
      targetType,
      dirList,
      fileList,
      secret: false,
      clientId: DefaultClientID,
    }
    if (sourceType === SpaceTypeFamily && fromFamilyId) {
      param.fromFamilyId = fromFamilyId
    }
    if (targetType === SpaceTypeFamily && targetFamilyId) {
      param.familyId = targetFamilyId
    }
    await this.requestWoHome(KeyMoveFile, param, { secret: true })
  }

  async copyFile(
    dirList: string[],
    fileList: string[],
    targetDirId: string,
    sourceType: string,
    targetType: string,
    fromFamilyId: string = "",
    targetFamilyId: string = "",
  ): Promise<void> {
    const param: Record<string, any> = {
      targetDirId,
      sourceType,
      targetType,
      dirList,
      fileList,
      secret: false,
      clientId: DefaultClientID,
    }
    if (sourceType === SpaceTypeFamily && fromFamilyId) {
      param.fromFamilyId = fromFamilyId
    }
    if (targetType === SpaceTypeFamily && targetFamilyId) {
      param.familyId = targetFamilyId
    }
    await this.requestWoHome(KeyCopyFile, param, { secret: true })
  }

  async deleteFile(
    spaceType: string,
    dirList: string[],
    fileList: string[],
  ): Promise<void> {
    const param = {
      spaceType,
      vipLevel: "0",
      dirList,
      fileList,
      clientId: DefaultClientID,
    }
    await this.requestWoHome(KeyDeleteFile, param, { secret: true })
  }

  async queryCloudUsageInfo(): Promise<QueryCloudUsageInfoData> {
    await this.initPhone()
    return this.requestWoHome<QueryCloudUsageInfoData>(
      KeyQueryCloudUsageInfo,
      {
        phoneNum: this.phone,
        clientId: DefaultClientID,
      },
      { secret: true },
    )
  }

  async upload2C(
    spaceType: string,
    fileName: string,
    fileBytes: Uint8Array | Buffer | ArrayBuffer,
    targetDirId: string,
    familyId: string = "",
    onProgress?: (finished: number, total: number) => void,
  ): Promise<string> {
    await this.initZoneURL()
    const zoneURL = this.zoneURL || DefaultZoneURL
    const uploadURL = `${zoneURL}/openapi/client/${KeyUpload2C}`

    const uint8 =
      fileBytes instanceof Uint8Array
        ? fileBytes
        : fileBytes instanceof ArrayBuffer
          ? new Uint8Array(fileBytes)
          : new Uint8Array(fileBytes)
    const fileSize = uint8.length
    const totalPart = Math.max(1, Math.ceil(fileSize / DefaultPartSize))
    const batchNo = formatDateToBatchNo()

    const fileInfo: Record<string, any> = {
      spaceType,
      directoryId: targetDirId,
      batchNo,
      fileName,
      fileSize,
      fileType: this.getFileType(fileName),
    }
    if (spaceType === SpaceTypeFamily && familyId) {
      fileInfo.familyId = familyId
    }

    const fileInfoStr = this.crypto.encrypt(
      JSON.stringify(fileInfo),
      ChannelWoHome,
    )
    const uniqueId = `${Date.now()}_${randomChars(6)}`

    let finishedSize = 0
    let lastFid = ""

    for (let partIndex = 1; partIndex <= totalPart; partIndex++) {
      const offset = (partIndex - 1) * DefaultPartSize
      const partSize =
        partIndex === totalPart ? fileSize - offset : DefaultPartSize
      const chunkBytes = uint8.subarray(offset, offset + partSize)

      const formData = new FormData()
      formData.append("uniqueId", uniqueId)
      formData.append("accessToken", this.accessToken)
      formData.append("fileName", fileName)
      formData.append("psToken", "undefined")
      formData.append("fileSize", String(fileSize))
      formData.append("totalPart", String(totalPart))
      formData.append("channel", ChannelWoCloud)
      formData.append("directoryId", targetDirId)
      formData.append("fileInfo", fileInfoStr)
      formData.append("partSize", String(partSize))
      formData.append("partIndex", String(partIndex))

      const blob = new Blob(
        [
          chunkBytes.buffer.slice(
            chunkBytes.byteOffset,
            chunkBytes.byteOffset + chunkBytes.byteLength,
          ) as ArrayBuffer,
        ],
        {
          type: "application/octet-stream",
        },
      )
      formData.append("file", blob, fileName)

      const res = await fetch(uploadURL, {
        method: "POST",
        headers: {
          Origin: "https://pan.wo.cn",
          Referer: "https://pan.wo.cn/",
          "User-Agent": DefaultUA,
        },
        body: formData,
      })

      if (!res.ok) {
        throw new Error(
          `[WoPan] Upload part ${partIndex}/${totalPart} failed with HTTP status: ${res.status}`,
        )
      }

      const resp: Upload2CResp = await res.json().catch(() => ({}) as any)
      if (resp.code !== "0000") {
        throw new Error(
          `[WoPan] Upload part ${partIndex}/${totalPart} failed: ${resp.code} ${resp.msg || ""}`,
        )
      }

      if (resp.data?.fid) {
        lastFid = resp.data.fid
      }

      finishedSize += partSize
      onProgress?.(finishedSize, fileSize)
    }

    return lastFid
  }
}
