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
  /** 排序字段 */
  order_by?: "file_id" | "file_name" | "size" | "created_at" | "updated_at"
  /** 排序方向 */
  order_direction?: "asc" | "desc"
  /**
   * 已保存的登录令牌。设置后优先用令牌验证（避免境外 IP 风控）；
   * 密码登录或 cookie 解析成功后会持久化回此字段。
   */
  access_token?: string
  /**
   * 浏览器 Cookie（可选）。从 123 网盘网页登录后复制的 Cookie 字符串，
   * 或仅粘贴 `Authorization: Bearer <token>` 中的 token / Bearer 值。
   * 解析出其中的 JWT 后用作 Bearer 令牌，效果等同 access_token，
   * 适合 Cloudflare Workers 等出口 IP 被风控、账号密码登录失败的环境。
   */
  cookie?: string
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

// --- 上传（S3 分片会话）响应类型 ---

/** 创建上传会话（/file/upload_request, type=0）的返回 */
export interface Pan123UploadResp {
  code: number
  message?: string
  data: {
    /** AWS 直传凭据（若有则走 AWS SDK 路径，本驱动不使用） */
    AccessKeyId: string
    SecretAccessKey: string
    SessionToken: string
    /** S3 预签名分片上传所需字段 */
    Bucket: string
    Key: string
    UploadId: string
    FileId: number
    StorageNode: string
    EndPoint: string
    /** 命中秒传时为 true（文件已存在，无需实际上传） */
    Reuse: boolean
  }
}

/** 获取 S3 预签名 URL（/file/s3_upload_object/auth 或 /file/s3_repare_upload_parts_batch）的返回 */
export interface Pan123S3PreSignedURLs {
  code: number
  message?: string
  data: {
    /** 分片号(字符串) → 该分片的预签名 PUT URL */
    presignedUrls: Record<string, string>
  }
}
