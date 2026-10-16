// CtFile (城通网盘) driver types
// Based on: https://openapi.ctfile.com/ (CTFile REST API v1)
// 站点: https://www.ctfile.com / https://web.ctfile.com

export interface CtFileAddition {
  /**
   * 开放接口 Session Token。
   * 获取方式：登录城通网盘管理后台 →「开放接口登录密钥管理」生成，
   * 或通过 openapi 文档中的 /v1/user/auth/login 登录接口获取。
   */
  session?: string

  /** 云类型：public=公有云（默认）、private=私有云 */
  cloud_type?: "public" | "private"

  /** API 基础地址，默认 https://rest.ctfile.com/v1 */
  base_url?: string

  /** 列表排序字段：name=名称、size=大小、time=修改时间 */
  order_by?: "name" | "size" | "time"

  /** 列表排序方向 */
  order_direction?: "asc" | "desc"

  /** 请求头 User-Agent（上传/下载直链均使用） */
  user_agent?: string
}

/** OpenAPI 统一响应包装：{ code, message?, ...业务字段 } */
export interface CtFileResp<T = any> {
  code?: number
  message?: string
  error_code?: string
  results?: T
  [key: string]: any
}

/** POST /v1/user/info/profile 成功响应（业务字段平铺在根级） */
export interface CtFileProfile {
  userid?: number | string
  username?: string
  nick_name?: string
  group_type?: number
  group_name?: string
  is_vip?: number | boolean
  reg_time?: string | number
  max_filesize?: number
}

/** POST /v1/{ns}/folder/list 单个文件夹 */
export interface CtFileFolder {
  /** 文件夹 ID，形如 "d123456" */
  key: string
  icon?: string
  name: string
  /** 修改时间：unix 秒 或 "YYYY-MM-DD HH:mm:ss" */
  date?: number | string
}

/** POST /v1/{ns}/file/list 单个文件 */
export interface CtFileFile {
  /** 文件 ID，形如 "f478659195" */
  key: string
  icon?: string
  /** 缩略图地址（图片/视频/音频） */
  imgsrc?: string
  name: string
  /** 字节数 */
  size?: number
  /** 上传时间：unix 秒 或 "YYYY-MM-DD HH:mm:ss" */
  date?: number | string
  /** 1=完整 2=未完成（未完成的文件不支持下载） */
  status?: number
}

/** POST /v1/{ns}/folder/meta 成功响应 */
export interface CtFileFolderMeta {
  key?: string
  key_id?: number | string
  name?: string
  description?: string
  path?: string
  date?: number | string
  parent_folder_id?: number | string
  folder_id?: string
}

/** POST /v1/{ns}/file/meta 成功响应 */
export interface CtFileFileMeta {
  key?: string
  file_id?: number | string
  name?: string
  description?: string
  size?: number
  date?: number | string
  folder_id?: string
  path?: string
  is_locked?: number
}

/** POST /v1/{ns}/folder/create 成功响应 */
export interface CtFileFolderCreateResult {
  folder_id?: string
  folder_path?: string
  path?: string
}

/** POST /v1/{ns}/file/fetch_url 成功响应 */
export interface CtFileDownloadUrl {
  download_url?: string
}

/** POST /v1/{ns}/file/upload 成功响应（获取上传凭据） */
export interface CtFileUploadTicket {
  upload_url?: string
  /** >0 表示秒传命中（文件已存在，无需真正上传） */
  exists?: number
}

/** POST /v1/{ns}/file/upload 上传完成后的返回（2025.7 起新版结构） */
export interface CtFileUploadResult {
  code?: number
  message?: string
  id?: number
  name?: string
  size?: number
  time?: number
  userid?: number
  folderid?: number
  workspaceid?: number
}
