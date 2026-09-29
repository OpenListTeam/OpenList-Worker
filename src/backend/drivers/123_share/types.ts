export interface Pan123ShareAddition {
  sharekey: string
  sharepassword?: string
  root_folder_id?: string
  accesstoken?: string
  order_by?: string
  order_direction?: string
}

export interface Pan123ShareFileInfo {
  FileId: number | string
  FileName: string
  Size: number
  Etag?: string
  S3KeyFlag?: string
  Type: number // 0 = file, 1 = folder
  UpdateAt?: string
  CreateAt?: string
  trashed?: boolean
}

export interface Pan123ShareFilesResp {
  code: number
  message: string
  data: {
    InfoList?: Pan123ShareFileInfo[]
    Next?: string | number
    Total?: number
  }
}

export interface Pan123ShareDownloadInfoResp {
  code: number
  message: string
  data: {
    DownloadURL?: string
  }
}
