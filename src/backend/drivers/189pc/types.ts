// 189PC driver types
// Ported from: https://github.com/OpenListTeam/OpenList/tree/main/drivers/189pc

export interface Cloud189PCAddition {
  username: string
  password: string
  root_folder_id?: string
  captcha_mode?: string
  device_id?: string
  session_key?: string
  session_secret?: string
  login_type?: string
}

export interface Cloud189PCLoginResp {
  accessToken: string
  familyId: number
  keepAlive: number
  refreshToken: string
  sessionKey: string
  sessionSecret: string
  tokenType: string
}

export interface Cloud189PCFile {
  id: number | string
  parentId: number | string
  name: string
  size: number
  createDate: string
  lastOpTime: string
  isFolder: boolean
  md5?: string
  icon?: {
    smallUrl?: string
    largeUrl?: string
  }
  downloadUrl?: string
}

export interface Cloud189PCListResp {
  fileList: Cloud189PCFile[]
  folderList: Cloud189PCFile[]
  fileListSize: number
  recordCount: number
}

export interface Cloud189PCUploadResp {
  uploadFileId: string
}

export interface Cloud189PCInitMultiUploadResp {
  uploadFileId: string
  uploadType: number
  fileDataExists: number
}

export interface Cloud189PCUploadUrlResp {
  uploadUrls: string[]
}
