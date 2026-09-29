// cloudreve_v4 (Cloudreve V4 自建网盘) - RESTful API
// API reference: last branch src/drive/cdrevev4

export interface DriverCloudreveAddition {
  /** Cloudreve 站点地址（含协议，如 https://cloud.example.com） */
  address: string
  /** 登录用户名（可选，提供则密码登录） */
  username?: string
  /** 登录密码（可选） */
  password?: string
  /** 访问令牌（可选，直接使用） */
  access_token?: string
  /** 刷新令牌（可选） */
  refresh_token?: string
  /** 自定义 User-Agent */
  custom_ua?: string
  /** 启用缩略图 */
  enable_thumb?: boolean
  /** 排序字段 */
  order_by?: string
  /** 排序方向 */
  order_direction?: string
}

export interface CloudreveFile {
  id: string
  path: string
  name: string
  size: number
  /** 0=文件, 1=目录 */
  type: number
  created_at: string
  updated_at: string
}

export interface CloudreveListResp {
  files: CloudreveFile[]
  pagination: { next_token: string }
}

export interface CloudreveUrlResp {
  urls: { url: string }[]
}
