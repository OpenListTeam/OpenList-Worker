// Baidu Netdisk driver types
// Re-ported from: https://github.com/OpenListTeam/OpenList/tree/main/drivers/baidu_netdisk
// (types.go + meta.go)

export interface BaiduAddition {
  /** 排序字段: name / time / size */
  order_by?: string
  /** 排序方向: asc / desc */
  order_direction?: string
  /** 下载 API: official / crack / crack_video */
  download_api?: string
  /** 使用在线 API 刷新 token（无需 ClientID/ClientSecret） */
  use_online_api?: boolean | string
  /** 在线 token API 地址 */
  api_url_address?: string
  /** 本地 OAuth 的 ClientID */
  client_id?: string
  /** 本地 OAuth 的 ClientSecret */
  client_secret?: string
  /** crack / crack_video 下载模式使用的 UA */
  custom_crack_ua?: string
  /** 已保存的 access token（自动持久化） */
  access_token?: string
  /** 刷新令牌（必填） */
  refresh_token: string
  /** 上传线程数，默认 "3"，范围 1~32 */
  upload_thread?: string
  /** 单个分片上传超时（秒），默认 60 */
  upload_timeout?: number
  /** 上传 API 域名，默认 https://d.pcs.baidu.com */
  upload_api?: string
  /** 动态获取上传域名，失败时回退到 upload_api */
  use_dynamic_upload_api?: boolean | string
  /** 自定义分片大小，0 为自动 */
  custom_upload_part_size?: number
  /** 低带宽上传模式 */
  low_bandwith_upload_mode?: boolean | string
  /** 仅列出视频文件 */
  only_list_video_file?: boolean | string
}

// --- API response types ---

export interface BaiduTokenResp {
  access_token?: string
  refresh_token?: string
  expires_in?: number
}

export interface BaiduTokenErrResp {
  error?: string
  error_description?: string
}

/** 在线 API 响应（api.oplist.org/baiduyun/renewapi） */
export interface BaiduOnlineTokenResp {
  refresh_token?: string
  access_token?: string
  text?: string
}

export interface BaiduFile {
  category: number
  fs_id: number
  size: number
  path: string
  server_filename: string
  md5: string
  isdir: number
  // list resp
  server_ctime: number
  server_mtime: number
  local_mtime: number
  local_ctime: number
  // only create and precreate resp
  ctime: number
  mtime: number
  thumbs?: {
    url3?: string
  }
}

export interface BaiduListResp {
  errno: number
  guid_info: string
  list: BaiduFile[]
  request_id: number
  guid: number
}

export interface BaiduDownloadResp {
  errmsg: string
  errno: number
  list: Array<{ dlink: string }>
  request_id: string
}

export interface BaiduDownloadResp2 {
  errno: number
  info: Array<{ dlink: string }>
  request_id: number
}

export interface BaiduPrecreateResp {
  errno: number
  request_id: number
  return_type: number
  // return_type=1
  path: string
  uploadid: string
  block_list: number[]
  // return_type=2
  info?: BaiduFile
  /** 断点续传对应的上传域名（运行时缓存，不来自 API） */
  upload_url?: string
}

export interface BaiduUploadServerResp {
  bak_server: any[]
  bak_servers: Array<{ server: string }>
  client_ip: string
  error_code: number
  error_msg: string
  expire: number
  host: string
  newno: string
  quic_server: any[]
  quic_servers: Array<{ server: string }>
  request_id: number
  server: any[]
  server_time: number
  servers: Array<{ server: string }>
  sl: number
}

export interface BaiduQuotaResp {
  errno: number
  request_id: number
  total: number
  used: number
}

export interface BaiduUinfoResp {
  errno: number
  request_id: number
  vip_type: number
  [k: string]: any
}

export interface BaiduRespBody {
  errno?: number
  error_code?: number
  error_msg?: string
  [k: string]: any
}
