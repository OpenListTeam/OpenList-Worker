// teldrive (Telegram Drive 自托管) - Bearer token 认证
// API reference: last branch src/drive/teldrive

export interface DriverTeldriveAddition {
  /** TelDrive 服务地址 */
  url: string
  /** 访问令牌（JWT） */
  access_token: string
  /** 根路径 */
  root_path?: string
}

export interface TeldriveFile {
  id: string
  name: string
  /** "folder" | "file" */
  type: string
  mimeType: string
  size: number
  parentId: string
  createdAt: string
  updatedAt: string
}
