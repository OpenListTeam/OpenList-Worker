import {
  MoPanAddition,
  DeviceInfo,
  LoginResp,
  UserInfo,
  QueryFilesResp,
  DownloadUrlResp,
  CreateFolderResp,
  TaskParam,
  AddBatchTaskResp,
  CheckBatchTaskResp,
  InitMultiUploadData,
  MultiUploadPart,
  CommitUploadResp,
  UsedSpaceResp,
} from "./types"
import {
  MoPanProxyFamily,
  createDefaultDeviceInfo,
  DefaultMpVersion,
} from "./consts"
import {
  aesEncrypt,
  aesDecrypt,
  base64Encode,
  base64Decode,
  generateSecretKey,
  rsaEncrypt,
  RSAPublicKeyV2,
} from "./crypto"

interface MoPanResponse<T = any> {
  code: number
  message: string
  data: T
  status: boolean
}

export class MoPanClient {
  private addition: MoPanAddition
  private authorization: string = ""
  private deviceInfo: DeviceInfo
  private onAuthorizationExpired?: (err: Error) => Promise<void>

  constructor(
    addition: MoPanAddition,
    onAuthorizationExpired?: (err: Error) => Promise<void>,
  ) {
    this.addition = addition
    this.onAuthorizationExpired = onAuthorizationExpired

    // Parse or create device info
    if (addition.device_info?.trim()) {
      try {
        this.deviceInfo = JSON.parse(addition.device_info)
      } catch {
        this.deviceInfo = JSON.parse(createDefaultDeviceInfo())
      }
    } else {
      this.deviceInfo = JSON.parse(createDefaultDeviceInfo())
    }
  }

  setAuthorization(token: string): void {
    if (!token.startsWith("Bearer ")) {
      token = `Bearer ${token}`
    }
    this.authorization = token
  }

  getAuthorization(): string {
    return this.authorization
  }

  getDeviceInfo(): DeviceInfo {
    return this.deviceInfo
  }

  getDeviceInfoJson(): string {
    return JSON.stringify(this.deviceInfo)
  }

  private async request<T = any>(
    url: string,
    data: Record<string, any> | null,
    retry: boolean = true,
  ): Promise<T> {
    const secretKey = generateSecretKey()

    // Encrypt device info
    const remoteInfo = base64Encode(
      aesEncrypt(
        Buffer.from(JSON.stringify(this.deviceInfo), "utf-8"),
        Buffer.from(secretKey, "utf-8"),
      ),
    )

    // Encrypt secret key with RSA
    const encryptedKey = rsaEncrypt(secretKey, RSAPublicKeyV2)

    const headers: Record<string, string> = {
      Authorization: this.authorization,
      remoteInfo,
      version: this.deviceInfo.mpVersion || DefaultMpVersion,
      "encrypted-key": encryptedKey,
      "Content-Type": "application/json",
    }

    let body: string | undefined
    if (data !== null) {
      const jsonData = JSON.stringify(data)
      const encrypted = aesEncrypt(
        Buffer.from(jsonData, "utf-8"),
        Buffer.from(secretKey, "utf-8"),
      )
      body = base64Encode(encrypted)
    }

    const res = await fetch(url, {
      method: "POST",
      headers,
      body: body ? JSON.stringify(body) : undefined,
    })

    if (!res.ok) {
      throw new Error(
        `[MoPan] Request failed: ${res.status} ${res.statusText}`,
      )
    }

    let respText = await res.text()

    // Decrypt response if encrypted
    if (respText.startsWith('"') && respText.endsWith('"')) {
      respText = respText.slice(1, -1)
      const decrypted = aesDecrypt(
        base64Decode(respText),
        Buffer.from(secretKey, "utf-8"),
      )
      respText = decrypted.toString("utf-8")
    }

    const result: MoPanResponse<any> = JSON.parse(respText)

    if (result.code === 401 && retry && this.onAuthorizationExpired) {
      await this.onAuthorizationExpired(
        new Error("Authorization expired: " + result.message),
      )
      return this.request<T>(url, data, false)
    }

    if (result.code !== 200) {
      throw new Error(
        `[MoPan] API error: code=${result.code}, message=${result.message}`,
      )
    }

    return result.data as T
  }

  async login(phone: string, password: string): Promise<LoginResp> {
    const data = {
      phone,
      password,
    }
    return this.request<LoginResp>(MoPanProxyFamily + "/login", data)
  }

  async loginBySms(phone: string): Promise<void> {
    const data = {
      phone,
    }
    await this.request(MoPanProxyFamily + "/sendSmsCode", data)
  }

  async loginBySmsStep2(phone: string, smsCode: string): Promise<LoginResp> {
    const data = {
      phone,
      smsCode,
    }
    return this.request<LoginResp>(MoPanProxyFamily + "/loginBySms", data)
  }

  async getUserInfo(): Promise<UserInfo> {
    return this.request<UserInfo>(MoPanProxyFamily + "/getUserInfo", null)
  }

  async queryFiles(
    folderId: string,
    page: number = 1,
    orderBy: string = "filename",
    descending: boolean = false,
    cloudId?: string,
  ): Promise<QueryFilesResp> {
    const data: Record<string, any> = {
      folderId,
      pageNum: page,
      orderBy,
      descending,
    }
    if (cloudId) {
      data.cloudId = cloudId
    }
    return this.request<QueryFilesResp>(
      MoPanProxyFamily + "/queryFiles",
      data,
    )
  }

  async getFileDownloadUrl(
    fileId: string,
    cloudId?: string,
  ): Promise<DownloadUrlResp> {
    const data: Record<string, any> = {
      fileId,
    }
    if (cloudId) {
      data.cloudId = cloudId
    }
    return this.request<DownloadUrlResp>(
      MoPanProxyFamily + "/getFileDownloadUrl",
      data,
    )
  }

  async createFolder(
    name: string,
    parentId: string,
    cloudId?: string,
  ): Promise<CreateFolderResp> {
    const data: Record<string, any> = {
      name,
      parentId,
    }
    if (cloudId) {
      data.cloudId = cloudId
    }
    return this.request<CreateFolderResp>(
      MoPanProxyFamily + "/createFolder",
      data,
    )
  }

  async renameFolder(
    folderId: string,
    newName: string,
    cloudId?: string,
  ): Promise<void> {
    const data: Record<string, any> = {
      folderId,
      newName,
    }
    if (cloudId) {
      data.cloudId = cloudId
    }
    await this.request(MoPanProxyFamily + "/renameFolder", data)
  }

  async renameFile(
    fileId: string,
    newName: string,
    cloudId?: string,
  ): Promise<void> {
    const data: Record<string, any> = {
      fileId,
      newName,
    }
    if (cloudId) {
      data.cloudId = cloudId
    }
    await this.request(MoPanProxyFamily + "/renameFile", data)
  }

  async addBatchTask(param: TaskParam): Promise<AddBatchTaskResp> {
    return this.request<AddBatchTaskResp>(
      MoPanProxyFamily + "/addBatchTask",
      param,
    )
  }

  async checkBatchTask(param: {
    taskId: string
    taskType: number
    targetType: number
    targetFolderID: string
    targetSource: number
    targetUserOrCloudID: string
  }): Promise<CheckBatchTaskResp> {
    return this.request<CheckBatchTaskResp>(
      MoPanProxyFamily + "/checkBatchTask",
      param,
    )
  }

  async cancelBatchTask(taskId: string, taskType: number): Promise<void> {
    await this.request(MoPanProxyFamily + "/cancelBatchTask", {
      taskId,
      taskType,
    })
  }

  async deleteToRecycle(
    files: Array<{ fileID: string; isFolder: boolean; fileName: string }>,
    cloudId?: string,
  ): Promise<void> {
    const data: Record<string, any> = {
      files,
    }
    if (cloudId) {
      data.cloudId = cloudId
    }
    await this.request(MoPanProxyFamily + "/deleteToRecycle", data)
  }

  async initMultiUpload(
    fileMd5: string,
    fileName: string,
    fileSize: number,
    parentFolderId: string,
    cloudId?: string,
  ): Promise<InitMultiUploadData> {
    const data: Record<string, any> = {
      fileMd5,
      fileName,
      fileSize,
      parentFolderId,
    }
    if (cloudId) {
      data.cloudId = cloudId
    }
    return this.request<InitMultiUploadData>(
      MoPanProxyFamily + "/initMultiUpload",
      data,
    )
  }

  async getAllMultiUploadUrls(
    uploadFileId: string,
    partInfos: string[],
  ): Promise<MultiUploadPart[]> {
    const data = {
      uploadFileId,
      partInfos,
    }
    return this.request<MultiUploadPart[]>(
      MoPanProxyFamily + "/getAllMultiUploadUrls",
      data,
    )
  }

  async commitMultiUploadFile(
    uploadFileId: string,
  ): Promise<CommitUploadResp> {
    const data = {
      uploadFileId,
    }
    return this.request<CommitUploadResp>(
      MoPanProxyFamily + "/commitMultiUploadFile",
      data,
    )
  }

  async usedSpace(): Promise<UsedSpaceResp> {
    return this.request<UsedSpaceResp>(MoPanProxyFamily + "/usedSpace", null)
  }
}
