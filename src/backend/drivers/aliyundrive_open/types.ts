export interface AliyundriveOpenAddition {
  drive_type?: "default" | "resource" | "backup"
  drive_id?: string
  refresh_token: string
  client_id?: string
  client_secret?: string
  api_url_address?: string
  root_folder_id?: string
  order_by?: "name" | "size" | "updated_at" | "created_at"
  order_direction?: "ASC" | "DESC"
  remove_way?: "trash" | "delete"
}

export interface AliyunTokenResp {
  access_token: string
  refresh_token: string
  expires_in: number
  token_type: string
  default_drive_id?: string
  resource_drive_id?: string
  backup_drive_id?: string
}

export interface AliyunFileItem {
  drive_id: string
  file_id: string
  parent_file_id: string
  name: string
  size: number
  type: "file" | "folder"
  created_at: string
  updated_at: string
  file_extension?: string
  content_hash?: string
  category?: string
  url?: string
  download_url?: string
}
