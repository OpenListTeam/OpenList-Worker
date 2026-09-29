// 189_tv (天翼云盘 TV/家庭云) - HMAC-SHA1 签名 + AccessToken 登录
// API reference: Go drivers/189_tv

export interface Driver189TVAddition {
  /** 通过二维码登录获得的 E189AccessToken */
  access_token?: string
  root_folder_id?: string
  order_by?: string
  order_direction?: string
  /** personal | family */
  type?: string
  family_id?: string
}

export interface AppSessionResp {
  sessionKey?: string
  sessionSecret?: string
  familySessionKey?: string
  familySessionSecret?: string
  loginName?: string
  accessToken?: string
  refreshToken?: string
  res_code?: number
  res_message?: string
}

export interface Cloud189TVFile {
  id: string
  name: string
  size: number
  md5?: string
  lastOpTime?: string
  createDate?: string
  icon?: {
    smallUrl?: string
    largeUrl?: string
  }
}

export interface Cloud189TVFolder {
  id: string
  parentId?: number
  name: string
  lastOpTime?: string
  createDate?: string
}

export interface Cloud189TVFilesResp {
  fileListAO?: {
    count?: number
    fileList?: Cloud189TVFile[]
    folderList?: Cloud189TVFolder[]
  }
}

export interface RespErr {
  res_code?: unknown
  res_message?: string
  errorCode?: string
  errorMsg?: string
  code?: string
  msg?: string
  error?: string
  message?: string
}

export interface CreateBatchTaskResp {
  taskId?: string
}

export interface BatchTaskStateResp {
  taskStatus?: number
  failedCount?: number
  successedCount?: number
  process?: number
}

export interface BatchTaskInfo {
  fileId: string
  fileName: string
  isFolder: number
}

export interface CreateUploadFileResp {
  uploadFileId?: number
  fileUploadUrl?: string
  fileCommitUrl?: string
  fileDataExists?: number
}

export interface DownResp {
  fileDownloadUrl?: string
}
