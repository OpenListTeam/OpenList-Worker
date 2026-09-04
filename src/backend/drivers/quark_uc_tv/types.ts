// quark_uc_tv (夸克/UC TV 版网盘，只读) - 签名认证
// API reference: Go drivers/quark_uc_tv

export interface DriverQuarkUcTvAddition {
  refresh_token: string
  device_id?: string
  order_by?: string // "file_name" | "updated_at"
  order_direction?: string // "asc" | "desc"
  link_method?: "download" | "streaming"
  /** "quark" 或 "uc"，决定内置 clientID/signKey */
  variant?: "quark" | "uc"
}

export interface QuarkTvFile {
  fid: string
  parent_fid?: string
  filename: string
  size: number
  isdir: number // 1 = 目录
  category: number
  thumbnail_url?: string
  created_at?: number
  updated_at?: number
}

export interface QuarkTvCommonResp {
  status: number
  errno: number
  error_info?: string
  req_id?: string
  data?: any
}

export interface QuarkTvFilesData {
  total_count?: number
  files?: QuarkTvFile[]
}

export interface QuarkTvDownloadData {
  fid?: string
  file_name?: string
  size?: number
  download_url?: string
}

export interface QuarkTvStreamingData {
  video_info?: { url?: string; resolution?: string }[]
}
