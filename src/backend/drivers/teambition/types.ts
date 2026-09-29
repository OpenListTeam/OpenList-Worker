// teambition (Teambition 网盘) - Cookie 认证
// API reference: Go drivers/teambition

export interface DriverTeambitionAddition {
  region: string // "china" | "international"
  cookie: string
  project_id: string
  order_by?: string
  order_direction?: string
}

export interface TbCollection {
  _id: string
  title: string
  updated: string
}

export interface TbWork {
  _id: string
  fileName: string
  fileSize: number
  downloadUrl?: string
  thumbnail?: string
  thumbnailUrl?: string
  updated: string
}

export interface TbErrResp {
  name?: string
  message?: string
}
