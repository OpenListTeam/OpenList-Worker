// 123_open (123云盘开放平台) - Bearer token 认证
// API reference: Go drivers/123_open

export interface Driver123OpenAddition {
  client_id?: string
  client_secret?: string
  access_token?: string
  refresh_token?: string
  use_online_api?: boolean
  api_url_address?: string
  root_folder_id?: string
}

export interface File123 {
  filename: string
  size: number
  create_at?: string
  update_at?: string
  fileId: number
  type: number // 1=目录 2=文件
  etag?: string
  trashed?: number
}

export interface Resp123 {
  code: number
  message?: string
  data?: any
}

export interface FileListData123 {
  last_file_id?: number
  file_list?: File123[]
}

export interface DownloadInfoData123 {
  download_url?: string
}

export interface AccessTokenData123 {
  access_token?: string
  expired_at?: string
}
