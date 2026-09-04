// quark_open (夸克网盘开放平台 API) - 签名认证
// API reference: Go drivers/quark_open

export interface DriverQuarkOpenAddition {
  access_token?: string
  refresh_token: string
  app_id: string
  sign_key: string
  api_url_address?: string
  use_online_api?: boolean
  order_by?: string
  order_direction?: string
}

export interface QuarkFile {
  fid: string
  parent_fid?: string
  filename: string
  size: number
  file_type: string // "0" = 文件夹
  thumbnail_url?: string
  created_at?: number
  updated_at?: number
}

export interface QuarkCommonResp {
  status: number
  errno: number
  error_info?: string
  req_id?: string
  data?: any
}

export interface QuarkFileListData {
  file_list?: QuarkFile[]
  last_page?: boolean
  next_query_cursor?: { version?: string; token?: string }
}

export interface QuarkDownloadData {
  fid?: string
  file_name?: string
  download_url?: string
}

export interface QuarkRefreshResp {
  refresh_token?: string
  access_token?: string
  app_id?: string
  sign_key?: string
  text?: string
}
