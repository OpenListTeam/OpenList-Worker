// openlist_share (挂载 OpenList 分享链接) - 只读
// API reference: Go drivers/openlist_share

export interface DriverOpenlistShareAddition {
  /** 对端 OpenList 实例地址 */
  url: string
  /** 分享 ID */
  sid: string
  /** 分享密码（可选） */
  pwd?: string
  /** 转发归档请求（可选） */
  forward_archive_requests?: boolean
}

export interface OLShareResp<T = any> {
  code: number
  message: string
  data: T
}

export interface OLShareFile {
  name: string
  size: number
  is_dir: boolean
  modified: string
  created?: string
  thumb?: string
  sign?: string
  type?: number
}

export interface OLShareListData {
  content: OLShareFile[]
  total: number
  readme?: string
  write?: boolean
  provider?: string
}
