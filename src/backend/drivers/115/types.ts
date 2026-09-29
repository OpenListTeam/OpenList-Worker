// 115 (115网盘 / 115 Open API) - Bearer Token 认证
// API reference: last branch src/drive/cloud115 (Open API)

export interface Driver115Addition {
  /** Open API 访问令牌（必填） */
  access_token: string
  /** Open API 刷新令牌（必填） */
  refresh_token: string
  /** 根目录文件夹 ID，默认 "0" */
  root_folder_id?: string
  /** 排序字段 */
  order_by?: "file_name" | "file_size" | "user_utime" | "file_type"
  /** 排序方向 */
  order_direction?: "asc" | "desc"
}

// --- 115 Open API 响应类型 ---

/** Open API 文件对象（大写字段） */
export interface Cloud115File {
  Fid: string
  Fn: string
  /** "0" = 文件夹 */
  Fc: string
  FS: number
  Sha1?: string
  /** PickCode（下载用） */
  Pc?: string
  Thumbnail?: string
  Upt?: number
  Pid?: string
}

export interface Cloud115ListResp {
  state: boolean
  errcode?: number
  errno?: number
  error?: string
  count?: number
  offset?: number
  page_size?: number
  data?: Cloud115File[]
  // 旧格式（小写字段）兼容
  files?: any[]
}

export interface Cloud115UserInfoResp {
  state: boolean
  data?: {
    user_id: string | number
    user_name: string
  }
}

export interface Cloud115DownResp {
  state: boolean
  url?: string
  data?: { url?: string }
}
