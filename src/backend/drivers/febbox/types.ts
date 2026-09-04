// febbox (FebBox) - OAuth2 client credentials / refresh token
// API reference: Go drivers/febbox

export interface DriverFebBoxAddition {
  root_folder_id?: string
  client_id: string
  client_secret: string
  refresh_token?: string
  sort_rule?: string
  page_size?: number
  user_ip?: string
}

export interface FebBoxFile {
  fid: number
  file_name: string
  file_size: number
  is_dir: number
  file_create_time: number
  file_update_time: number
  thumb?: string
  thumb_small?: string
}

export interface FebBoxFileListResp {
  code: number
  msg: string
  data: {
    file_list: FebBoxFile[]
    show_type?: string
  }
}

export interface FebBoxFileDownloadResp {
  code: number
  msg: string
  data: {
    download_url: string
    fid: number
    file_name: string
  }[]
}

export interface FebBoxTokenResp {
  code: number
  msg: string
  data: {
    access_token: string
    expires_in: number
    token_type: string
    scope?: string
    refresh_token?: string
  }
}

export interface FebBoxErrResp {
  code: number
  msg: string
  server_runtime?: number
  server_name?: string
}
