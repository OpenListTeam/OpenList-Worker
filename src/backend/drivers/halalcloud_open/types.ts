// halalcloud_open (HalalCloud Open API) - HL6-HMAC-SHA256 签名 + refresh_token
// API reference: Go drivers/halalcloud_open（golang-sdk-lite 逆向）

export interface DriverHalalCloudOpenAddition {
  client_id: string
  client_secret: string
  refresh_token?: string
  host?: string
  root_folder_id?: string
}

export interface HCloudFile {
  identity?: string
  parent?: string
  name?: string
  path?: string
  mime_type?: string
  size?: string | number
  type?: string | number
  create_ts?: string | number
  update_ts?: string | number
  dir?: boolean
}

export interface HCloudFileListRequest {
  parent?: { path?: string; identity?: string }
  list_info?: { limit?: number; token?: string }
}

export interface HCloudFileListResponse {
  files?: HCloudFile[]
  list_info?: { limit?: number; token?: string }
}

export interface HCloudBatchOperationRequest {
  source?: HCloudFile[]
  dest?: HCloudFile
}

export interface HCloudFileDownloadAddressResponse {
  download_address?: string
  file_size?: string | number
  name?: string
  path?: string
}

export interface HCloudTokenResponse {
  access_token?: string
  refresh_token?: string
  expires_in?: number
}

export interface HCloudError {
  code?: string
  message?: string
  msg?: string
}
