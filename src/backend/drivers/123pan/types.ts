// 123 Cloud Drive (123Pan) driver types
// Based on: https://github.com/OpenListTeam/OpenList/tree/main/drivers/123

export interface Pan123Addition {
  /** 用户名（手机号或邮箱） */
  username: string
  /** 密码 */
  password: string
  /** 根文件夹 ID，默认为 0（根目录） */
  root_id?: string
  /** 上传线程数，默认 3 */
  upload_thread?: number
  /** 请求使用的 platform header，默认 "web" */
  platform?: string
}

// --- API response types ---

export interface Pan123File {
  FileId: number
  FileName: string
  Size: number
  Type: number // 0 = file, 1 = folder
  UpdateAt: string // ISO 8601 timestamp
  Etag: string
  S3KeyFlag: string
  DownloadUrl?: string
}

export interface Pan123FilesResp {
  code: number
  message?: string
  data: {
    Next: string
    Total: number
    InfoList: Pan123File[]
  }
}

export interface Pan123LoginResp {
  code: number
  message?: string
  data: {
    token: string
  }
}

export interface Pan123DownloadResp {
  code: number
  message?: string
  data: {
    DownloadUrl: string
  }
}

export interface Pan123UserInfoResp {
  code: number
  data: {
    UID: number
    Nickname: string
    SpaceUsed: number
    SpacePermanent: number
    SpaceTemp: number
    FileCount: number
  }
}

export interface Pan123MkdirResp {
  code: number
  message?: string
  data: {
    FileId: number
  }
}

export interface Pan123BaseResp {
  code: number
  message?: string
}
