// 189 Cloud Drive (天翼云盘) driver types
// Based on: https://github.com/OpenListTeam/OpenList/tree/main/drivers/189

export interface Cloud189Addition {
  /** 手机号 / 账号 */
  username: string
  /** 密码 */
  password: string
  /**
   * Cookie（可选），用于遇到滑动验证码时手动填写；
   * 自动登录成功后会自动持久化回此字段。
   */
  cookie?: string
  /** 根文件夹 ID，默认 -11（个人云根目录） */
  root_folder_id?: string
  /** 排序字段 */
  order_by?: "lastOpTime" | "filename" | "fileSize"
  /** 排序方向 */
  order_direction?: "asc" | "desc"
}

export interface FileItem189 {
  id: number | string
  name: string
  size: number
  lastOpTime: string
  icon?: {
    smallUrl?: string
    largeUrl?: string
  }
  url?: string
}

export interface FolderItem189 {
  id: number | string
  name: string
  lastOpTime: string
}

export interface FilesResp189 {
  res_code: number
  res_message: string
  fileListAO?: {
    count: number
    fileList?: FileItem189[]
    folderList?: FolderItem189[]
  }
}

export interface DownResp189 {
  res_code: number
  res_message: string
  fileDownloadUrl?: string
  downloadUrl?: string
}

export interface CapacityResp189 {
  res_code: number
  res_message: string
  account?: string
  cloudCapacityInfo?: {
    freeSize: number
    mail189UsedSize: number
    totalSize: number
    usedSize: number
  }
  familyCapacityInfo?: {
    freeSize: number
    totalSize: number
    usedSize: number
  }
  totalSize?: number
}

export interface AppConfResp189 {
  result: string
  msg: string
  data?: {
    accountType: string
    agreementCheck: string
    appKey: string
    clientType: number
    isOauth2: boolean
    loginSort: string
    mailSuffix: string
    pageKey: string
    paramId: string
    regReturnUrl: string
    reqId: string
    returnUrl: string
    showFeedback: string
    showPwSaveName: string
    showQrSaveName: string
    showSmsSaveName: string
    sso: string
  }
}

export interface EncryptConfResp189 {
  result: number
  data?: {
    upSmsOn: string
    pre: string
    preDomain: string
    pubKey: string
  }
}

export interface RsaKeyResp189 {
  res_code?: number
  res_message?: string
  pubKey: string
  pkId: string
  expire: number
}

export interface UploadPart189 {
  requestURL: string
  requestHeader: string
}

export interface UploadUrlsResp189 {
  code: string
  uploadUrls?: Record<string, UploadPart189>
}

export interface InitMultiUploadResp189 {
  code?: string
  data?: {
    uploadFileId?: string | number
    fileDataExists?: number | string
  }
}
