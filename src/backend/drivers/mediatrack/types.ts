export interface MediatrackAddition {
  access_token: string
  project_id?: string
  root_folder_id?: string
  order_by?: "updated_at" | "title" | "size" | string
  order_desc?: boolean
}

export interface MediatrackBaseResp {
  status: string
  message?: string
}

export interface MediatrackFile {
  id: string
  category?: number
  created_at?: string
  deleted_at?: string
  description?: string
  file?: {
    cover?: string
    src?: string
  }
  size?: string
  title: string
  updated_at?: string
}

export interface MediatrackChildrenResp {
  status: string
  data?: {
    total: number
    assets: MediatrackFile[]
  }
  message?: string
}

export interface MediatrackUploadResp {
  status: string
  data?: {
    credentials: {
      TmpSecretId: string
      TmpSecretKey: string
      Token: string
      ExpiredTime: number
      Expiration: string
      StartTime: number
    }
    object: string
    bucket: string
    region: string
    url: string
    size: string
  }
  message?: string
}
