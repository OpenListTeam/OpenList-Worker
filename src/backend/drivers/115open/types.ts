// 115 Open (115网盘开放平台) driver types
// Re-ported from: https://github.com/OpenListTeam/OpenList/tree/main/drivers/115_open
// (meta.go + types.go + 115-sdk-go types)

export interface Pan115Addition {
  /** 排序字段: file_name / file_size / user_utime / file_type */
  order_by?: string
  /** 排序方向: asc / desc */
  order_direction?: string
  /** 所有 API 请求限速 ([limit]r/1s)，0 表示不限 */
  limit_rate?: number
  /** 列表分页大小（1~1150，默认 200） */
  page_size?: number
  /** 访问令牌（必填） */
  access_token?: string
  /** 刷新令牌（必填） */
  refresh_token?: string
  /** 根文件夹 ID，默认 "0" */
  root_id?: string
}

// --- API 响应类型（115 开放平台 proapi.115.com） ---

export interface Pan115Resp<T> {
  state: boolean
  code: number
  message: string
  data: T
}

export interface Pan115File {
  fid: string // 文件ID
  aid: string // 状态 1 正常 7 回收站 120 彻底删除
  pid: string // 父文件夹ID
  fc: string // 文件分类 0 文件夹 1 文件
  fn: string // 文件名
  fco: string // 文件夹封面
  pc: string // 文件提取码
  upt: number // 修改时间
  uet: number // 修改时间
  uppt: number // 上传时间
  sha1: string // 文件sha1
  fs: number // 文件大小
  ico: string // 后缀名
  thumbnail: string // 缩略图
}

export interface Pan115GetFilesResp {
  state: boolean
  code: number
  message: string
  data: Pan115File[]
  count: number // 当前目录文件数量
  offset: number
  limit: number
}

export interface Pan115UserInfoResp {
  user_id: number
  user_name: string
  user_face_s: string
  rt_space_info: {
    all_total: { size: string; size_format: string }
    all_remain: { size: string; size_format: string }
    all_use: { size: string; size_format: string }
  }
  vip_info: {
    level_name: string
    expire: number
  }
}

export interface Pan115FolderInfoResp {
  count: number
  size: string
  size_byte: number
  folder_count: number
  ptime: string
  utime: string
  file_name: string
  pick_code: string
  sha1: string
  file_id: string
  file_category: string
  paths: Array<{ file_id: string; file_name: string }>
}

export interface Pan115MkdirResp {
  file_name: string
  file_id: string
}

export interface Pan115DownUrlEntry {
  file_name: string
  file_size: number
  pick_code: string
  sha1: string
  url: { url: string }
}

export type Pan115DownUrlResp = Record<string, Pan115DownUrlEntry>

export interface Pan115UploadGetTokenResp {
  endpoint: string
  AccessKeySecret: string
  SecurityToken: string
  Expiration: string
  AccessKeyId: string
}

export interface Pan115UploadInitResp {
  pick_code: string
  status: number
  sign_key: string
  sign_check: string
  file_id: string
  target: string
  bucket: string
  object: string
  callback: {
    callback: string
    callback_var: string
  }
}
