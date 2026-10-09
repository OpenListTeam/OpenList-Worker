// GuangYaPan (光亚盘) driver types
// Ported from: OpenList-Backends/drivers/guangyapan

export interface GuangYaPanAddition {
  root_folder_path: string
  phone_number: string
  captcha_token: string
  send_code: boolean
  verify_code: string
  verification_id: string
  access_token: string
  refresh_token: string
  client_id: string
  device_id: string
  device_sign: string
  page_size: number
  order_by: number
  sort_type: number
}

export interface GypFileItem {
  fileId: string
  parentId: string
  fileName: string
  fileSize: number
  resType: number // 2 = folder
  ctime: number
  utime: number
}

export interface GypListResp {
  code: number
  msg: string
  data: { total: number; list: GypFileItem[] }
}

export interface GypDownloadResp {
  code: number
  msg: string
  data: { signedURL: string; downloadUrl: string }
}

export interface GypCommonResp {
  code: number
  msg: string
  data?: any
}

export interface GypTaskResp {
  code: number
  msg: string
  data: { taskId: string }
}

export interface GypTaskStatusResp {
  code: number
  msg: string
  data: { status: number }
}

export interface GypTokenResp {
  access_token: string
  refresh_token: string
  expires_in: number
  error: string
  error_description: string
}

/** get_res_center_token 返回的 OSS 临时凭据（嵌套在 data.creds 下） */
export interface GypUploadCreds {
  accessKeyID: string
  secretAccessKey: string
  sessionToken: string
  expiration: string
}

export interface GypUploadTokenData {
  taskId: string
  objectPath: string
  bucketName: string
  endPoint: string
  fullEndPoint: string
  /**
   * 实时接口把 OSS 凭据嵌套在 creds 下，而不是平铺在 data 上。
   * 平铺字段保留为可选，仅用于兼容旧版响应。
   */
  creds?: GypUploadCreds
  accessKeyID?: string
  secretAccessKey?: string
  sessionToken?: string
}

export interface GypUploadTokenResp {
  code: number
  msg: string
  data: GypUploadTokenData
}

export interface GypTaskInfoResp {
  code: number
  msg: string
  data: { fileId: string }
}
