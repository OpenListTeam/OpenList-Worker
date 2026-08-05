// aliyundrive_open (阿里云盘 OAuth2 OpenAPI) - 支持在线 API 中转或直接 OAuth
export interface AliyundriveOpenAddition {
  drive_type: "default" | "resource" | "backup"
  drive_id?: string
  root_folder_id?: string
  refresh_token: string
  order_by?: string
  order_direction?: string
  remove_way?: "trash" | "delete"
  chunk_size?: number
  // 在线 API 模式
  use_online_api?: boolean
  api_url_address?: string
  alipan_type?: "alipanQR" | "alipanTV"
  // 直接 OAuth 模式（使用自己的应用）
  client_id?: string
  client_secret?: string
}

// Token 响应结构
export interface AliyunTokenResp {
  access_token: string
  refresh_token?: string
  expires_in?: number
  token_type?: string
  user_id?: string
  default_drive_id?: string
  resource_drive_id?: string
  backup_drive_id?: string
}

// 阿里云盘文件对象
export interface AliyunFileItem {
  file_id: string
  name: string
  type: "file" | "folder"
  size?: number
  created_at?: string
  updated_at?: string
  parent_file_id?: string
  mime_type?: string
  thumbnail?: string
  download_url?: string
}
