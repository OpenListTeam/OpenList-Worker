// cloudreve (Cloudreve V3 自建网盘) - session cookie 认证
// API reference: Go drivers/cloudreve

export interface DriverCloudreveV3Addition {
  address: string
  username?: string
  password?: string
  cookie?: string
  custom_ua?: string
  enable_thumb_and_folder_size?: boolean
}

export interface CloudreveV3Resp {
  code: number
  msg: string
  data: any
}

export interface CloudreveV3Object {
  id: string
  name: string
  path: string
  pic: string
  size: number
  /** "dir" | "file" */
  type: string
  date: string
  create_date: string
  source_enabled?: boolean
}

export interface CloudreveV3DirectoryResp {
  parent: string
  objects: CloudreveV3Object[]
  policy: {
    id: string
    type: string
    name?: string
    max_size?: number
    file_type?: string[]
  }
}
