export interface ThunderAddition {
  root_folder_id?: string
  username?: string
  password?: string
  captcha_token?: string
  credit_key?: string
  device_id?: string
  space?: string
  order_by?: string
  order_direction?: string
}

export interface ThunderExpertAddition {
  root_folder_id?: string
  login_type?: "user" | "refresh_token"
  sign_type?: "algorithms" | "captcha_sign"
  username?: string
  password?: string
  refresh_token?: string
  algorithms?: string
  captcha_sign?: string
  timestamp?: string
  captcha_token?: string
  credit_key?: string
  device_id?: string
  client_id?: string
  client_secret?: string
  client_version?: string
  package_name?: string
  user_agent?: string
  download_user_agent?: string
  use_video_url?: boolean
  space?: string
  order_by?: string
  order_direction?: string
}

export interface ThunderMediaLink {
  url: string
  token?: string
  expire?: string
  type?: string
}

export interface ThunderMedia {
  link: ThunderMediaLink
}

export interface ThunderFile {
  kind: string // "drive#folder" | "drive#file"
  id: string
  parent_id: string
  name: string
  size: string
  web_content_link?: string
  created_time?: string
  modified_time?: string
  icon_link?: string
  thumbnail_link?: string
  hash?: string
  medias?: ThunderMedia[]
  trashed?: boolean
  delete_time?: string
  original_url?: string
}

export interface ThunderFileListResp {
  kind: string
  next_page_token?: string
  files: ThunderFile[]
  version?: string
  version_outdated?: boolean
}

export interface ThunderTokenResp {
  token_type: string
  access_token: string
  refresh_token: string
  expires_in: number
  sub?: string
  user_id?: string
}

export interface ThunderCoreLoginResp {
  account?: string
  creditkey?: string
  expires_in?: number
  isCompressed?: string
  isSetPassWord?: string
  loginKey?: string
  nickName?: string
  platformVersion?: string
  protocolVersion?: string
  secureKey?: string
  sequenceNo?: string
  sessionID: string
  timestamp?: string
  userID: string
  userName?: string
  version?: string
}

export interface ThunderLoginReviewResp {
  creditkey: string
  error?: string
  errorCode?: string
  errorDesc?: string
  errorDescUrl?: string
  errorDescription?: string
  reviewurl: string
  sequenceNo?: string
  userID?: string
  verifyType?: string
}

export interface ThunderReviewData {
  creditkey: string
  reviewurl: string
  deviceid: string
  devicesign: string
}

export interface ThunderCaptchaTokenRequest {
  action: string
  captcha_token: string
  client_id: string
  device_id: string
  meta: Record<string, string>
  redirect_uri: string
}

export interface ThunderCaptchaTokenResponse {
  captcha_token: string
  expires_in: number
  url?: string
}

export interface ThunderUploadTaskResp {
  upload_type: string
  resumable?: {
    kind: string
    params: {
      access_key_id: string
      access_key_secret: string
      bucket: string
      endpoint: string
      expiration: string
      key: string
      security_token: string
    }
    provider: string
  }
  file?: ThunderFile
}

export interface ThunderErrResp {
  error_code?: number
  error?: string
  error_description?: string
}
