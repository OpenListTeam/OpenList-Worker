export interface AliyundriveShareAddition {
  refresh_token?: string
  share_id: string
  share_pwd?: string
  root_folder_id?: string
  order_by?: string
  order_direction?: string
}

export interface AliyundriveShareItem {
  drive_id?: string
  file_id: string
  parent_file_id?: string
  name: string
  size?: number
  type: "file" | "folder" | string
  created_at?: string
  updated_at?: string
  thumbnail?: string
  download_url?: string
}

export interface AliyundriveShareListResp {
  items?: AliyundriveShareItem[]
  next_marker?: string
}
