// kodbox (可道云 / KodBox 自建网盘) - form POST + accessToken
// API reference: Go drivers/kodbox

export interface DriverKodboxAddition {
  /** KodBox 站点地址（如 https://kod.example.com） */
  address: string
  /** 登录用户名 */
  username?: string
  /** 登录密码 */
  password?: string
  /** 根目录路径（可选） */
  root_path?: string
}

export interface KodboxCommonResp {
  /** true/false（成功）或字符串错误码 */
  code: boolean | string
  info?: string | boolean
  data?: any
}

export interface KodboxFolderOrFile {
  path: string
  name: string
  createTime: number
  modifyTime: number
  size: number
  type: string // "folder" | "file"
}

export interface KodboxListData {
  folderList: KodboxFolderOrFile[]
  fileList: KodboxFolderOrFile[]
}
