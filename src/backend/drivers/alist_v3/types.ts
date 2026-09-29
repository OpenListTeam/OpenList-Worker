// AList V3 driver types — 通过 HTTP API 访问另一个 OpenList / AList 实例
export interface AListV3Addition {
  url: string
  meta_password?: string
  username?: string
  password?: string
  token?: string
  pass_ip_to_upsteam?: boolean
  pass_ua_to_upsteam?: boolean
  forward_archive_requests?: boolean
  root_folder_path?: string
}

export interface AListObj {
  name: string
  size: number
  is_dir: boolean
  modified: string
  created?: string
  sign?: string
  thumb?: string
  type?: number
  hashinfo?: string
}

export interface AListResp<T> {
  code: number
  message: string
  data: T
}
