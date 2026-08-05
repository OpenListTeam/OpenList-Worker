// quark (夸克网盘 / UC网盘) - Cookie 认证，支持夸克/UC两种模式
// Based on: https://github.com/OpenListTeam/OpenList/tree/main/drivers/quark_uc

export type QuarkVariant = "Quark" | "UC"

export interface QuarkAddition {
  /** 网盘类型: 夸克 or UC */
  variant?: QuarkVariant
  /** 登录 Cookie（必填），从浏览器复制 */
  cookie: string
  /** 根目录文件夹 ID，默认为 0 (根目录) */
  root_folder_id?: string
  /** 排序字段 */
  order_by?: "none" | "file_type" | "file_name" | "updated_at"
  /** 排序方向 */
  order_direction?: "asc" | "desc"
  /** 转码地址（仅 Quark，需配合代理使用） */
  use_transcoding_address?: boolean
  /** 仅列出视频文件和文件夹 */
  only_list_video_file?: boolean
}

// --- API 响应类型 ---

export interface QuarkResp {
  status: number
  code: number
  message: string
  req_id?: string
}

export interface QuarkFile {
  fid: string
  file_name: string
  pdir_fid: string
  category: number
  file_type?: number
  size: number
  format_type?: string
  status?: number
  /** true = 文件, false / undefined = 文件夹 */
  file: boolean
  created_at: number
  updated_at: number
  l_created_at?: number
  l_updated_at?: number
  obj_category?: string
  thumbnail?: string
}

export interface QuarkSortRespData {
  list: QuarkFile[]
}

export interface QuarkSortRespMetadata {
  size: number
  page: number
  count: number
  total: number
}

export interface QuarkSortResp extends QuarkResp {
  data: QuarkSortRespData
  metadata: QuarkSortRespMetadata
}

export interface QuarkDownloadItem {
  fid: string
  file_name: string
  pdir_fid: string
  download_url: string
}

export interface QuarkDownResp extends QuarkResp {
  data: QuarkDownloadItem[]
}

export interface QuarkMkdirData {
  fid: string
  file_name: string
}

export interface QuarkMkdirResp extends QuarkResp {
  data: QuarkMkdirData[]
}

export interface QuarkRenameData {
  fid: string
  file_name: string
}

export interface QuarkRenameResp extends QuarkResp {
  data: QuarkRenameData[]
}

// Pre-hash upload response
export interface QuarkUploadPreHashResp extends QuarkResp {
  data: {
    task_id: string
    finish?: boolean
    hash_match?: boolean
    fid?: string
    upload_id?: string
    obj_key?: string
    upload_url?: string
    auth_info?: string
    auth_meta?: string
    md5?: string
    callback_url?: string
  }
}

export interface QuarkUploadCommitResp extends QuarkResp {
  data: {
    finish?: boolean
    fid?: string
    file_name?: string
  }
}

// Configuration constants per variant
export interface QuarkConf {
  ua: string
  referer: string
  api: string
  pr: string
}
