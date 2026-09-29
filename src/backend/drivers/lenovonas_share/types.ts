// lenovonas_share (联想 NAS 分享) - 只读，纯 REST
// API reference: Go drivers/lenovonas_share

export interface DriverLenovoNasShareAddition {
  share_id: string
  share_pwd: string
  host?: string
  show_root_folder?: boolean
  root_path?: string
}

export interface LenovoFile {
  name: string
  size: number
  path: string
  type: string // "dir" | 其他（文件）
  time: number
  chtime: number
}

export interface LenovoResp<T = any> {
  result: boolean
  error?: { msg?: string }
  data: T
}

export interface LenovoAccessData {
  stoken: string
  expires_in: number
}

export interface LenovoFilesData {
  list: LenovoFile[]
}

export interface LenovoLinkData {
  param: { dtoken: string }
}
