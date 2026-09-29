// chaoxing (超星小组网盘) - Cookie 认证 + AES 登录
// API reference: Go drivers/chaoxing

export interface DriverChaoXingAddition {
  user_name: string
  password: string
  bbsid: string
  root_folder_id?: string
  cookie?: string
}

// 手机端学习通上传的文件 content 字段与网页端不同：
// 网页端 json `"puid": 54321, "size": 12345`
// 手机端 json `"puid": "54321", "size": "12345"`
export interface ChaoXingFileContent {
  folderName?: string
  name?: string
  fileId?: string
  objectId?: string
  size?: number | string
  uploadDate?: number
}

export interface ChaoXingFile {
  id: number
  inserttime?: number
  content: ChaoXingFileContent
}

export interface ChaoXingListResp {
  msg?: string
  result?: number
  status?: boolean
  list?: ChaoXingFile[]
}

export interface ChaoXingDownResp {
  msg?: string
  download?: string
  fileStatus?: string
  status?: boolean
}

export interface ChaoXingUploadConfigResp {
  result?: number
  msg?: {
    puid?: number
    token?: string
  }
}

export interface ChaoXingUploadFileResp {
  result?: boolean
  msg?: string
  objectId?: string
  data?: Record<string, unknown>
}
