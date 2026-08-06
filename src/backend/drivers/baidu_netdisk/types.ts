// Baidu Netdisk driver types
// Based on: https://github.com/OpenListTeam/OpenList/tree/main/drivers/baidu_netdisk

export interface BaiduAddition {
  /** 排序字段 */
  order_by?: "name" | "time" | "size"
  /** 排序方向 */
  order_direction?: "asc" | "desc"
  /** 下载方式: official / crack / crack_video */
  download_api?: "official" | "crack" | "crack_video"
  /** 使用在线 API 刷新 token（无需 client_id/client_secret） */
  use_online_api?: boolean
  api_url_address?: string
  client_id?: string
  client_secret?: string
  /** crack 下载方式使用的 UA */
  custom_crack_ua?: string
  /** 刷新令牌（必填） */
  refresh_token: string
  upload_thread?: string
  upload_timeout?: number
  custom_upload_part_size?: number
  use_dynamic_upload_api?: boolean
  upload_api?: string
  low_bandwidth_upload_mode?: boolean
  /** 仅列出视频文件和文件夹 */
  only_list_video_file?: boolean
}

// --- API 响应类型 ---

export interface BaiduFile {
  category: number
  fs_id: number
  thumbs?: { url3?: string }
  size: number
  path: string
  server_filename: string
  md5: string
  isdir: number
  server_ctime?: number
  server_mtime?: number
  local_mtime?: number
  local_ctime?: number
  ctime?: number
  mtime?: number
}

export interface BaiduListResp {
  errno: number
  list: BaiduFile[]
  guid?: number
  guid_info?: string
  request_id?: number
}

export interface BaiduDownloadResp {
  errno: number
  list: { dlink: string }[]
}

export interface BaiduDownloadResp2 {
  errno: number
  info: { dlink: string }[]
}

export interface BaiduQuotaResp {
  errno: number
  total: number
  used: number
}

export interface BaiduUinfoResp {
  errno: number
  vip_type: number
  request_id?: number
}

export interface BaiduTokenResp {
  refresh_token?: string
  access_token?: string
  expires_in?: number
}

export interface BaiduTokenErrResp {
  error?: string
  error_description?: string
}

export interface BaiduOnlineTokenResp {
  refresh_token?: string
  access_token?: string
  text?: string
}
