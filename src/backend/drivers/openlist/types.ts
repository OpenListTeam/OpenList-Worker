// openlist (挂载另一个 OpenList 实例) - 直接调用对端 /api/fs/* 接口
// API reference: last branch src/drive/openlist

export interface DriverOpenlistAddition {
  /** 对端 OpenList 实例地址 */
  url: string
  /** 登录用户名（可选，提供则密码登录） */
  username?: string
  /** 登录密码（可选） */
  password?: string
  /** 访问 token（可选，直接使用） */
  token?: string
  /** 元信息密码（可选） */
  meta_password?: string
  /** 根目录 */
  root_path?: string
}

export interface OLFile {
  name: string
  size: number
  is_dir: boolean
  modified: string
  created?: string
  thumb?: string
  sign?: string
  raw_url?: string
}

export interface OLResp<T = any> {
  code: number
  message: string
  data: T
}

export interface OLListData {
  content: OLFile[]
  total: number
}

export interface OLGetData {
  name: string
  size: number
  is_dir: boolean
  modified: string
  raw_url: string
  sign: string
}
