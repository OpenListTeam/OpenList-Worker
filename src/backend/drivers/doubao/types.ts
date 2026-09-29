// doubao (豆包 / 抖音豆包网盘) - Cookie 认证
// API reference: Go drivers/doubao

export interface DriverDoubaoAddition {
  cookie: string
  download_api?: "get_file_url" | "get_download_info"
  limit_rate?: number
}

export interface DoubaoFile {
  id: string
  name: string
  key: string
  node_type: number // 1=目录
  size: number
  parent_id: string
  create_time: number
  update_time: number
}

export interface DoubaoCommonResp {
  code: number
  msg?: string
  message?: string
  data?: any
  error?: { code: number; message: string }
}

export interface DoubaoNodeInfoData {
  node_info?: DoubaoFile
  children?: DoubaoFile[]
  next_cursor?: string
  has_more?: boolean
}

export interface DoubaoDownloadInfoData {
  download_infos?: { node_id: string; main_url: string; backup_url?: string }[]
}

export interface DoubaoFileUrlData {
  file_urls?: { uri: string; main_url: string; back_url?: string }[]
}

export interface DoubaoVideoUrlData {
  original_media_info?: { main_url: string; backup_url?: string }
  media_info?: { main_url: string; backup_url?: string }[]
}
