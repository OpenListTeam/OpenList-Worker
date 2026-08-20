// Lanzou (蓝奏云) driver types
// Based on: https://github.com/OpenListTeam/OpenList/tree/main/drivers/lanzou

export interface LanzouAddition {
  /** 挂载模式：cookie（推荐）、account（账号密码）、url（公开分享链接） */
  type?: "cookie" | "account" | "url"

  /** 账号（手机号/UID），account 模式使用 */
  account?: string
  /** 密码，account 模式使用 */
  password?: string

  /** 登录 Cookie（含 ylogin, phpdisk_info 等），cookie 模式使用 */
  cookie?: string

  /** 根文件夹 ID / 分享 ID（个人盘默认 -1，分享链接填分享 ID 如 b00xxxx） */
  root_folder_id?: string
  /** 提取码 / 分享密码 */
  share_password?: string

  /** 基础 API 域名，默认 https://pc.woozooo.com */
  baseUrl?: string
  /** 分享页面域名，默认 https://pan.lanzoui.com */
  shareUrl?: string
  /** User-Agent 请求头 */
  user_agent?: string

  /** 是否通过 HEAD 请求修正文件精确大小与修改时间 */
  repair_file_info?: boolean

  /** 排序字段 */
  order_by?: "name" | "size" | "time"
  /** 排序方向 */
  order_direction?: "asc" | "desc"
}

export interface LanzouFileOrFolder {
  name?: string
  id?: string
  name_all?: string
  size?: string
  time?: string
  fol_id?: string
  is_folder?: boolean
  url?: string
  pwd?: string
}

export interface LanzouFileShare {
  pwd?: string
  onof?: string
  taoc?: string
  is_newd?: string
  f_id?: string
  new_url?: string
  name?: string
  des?: string
}

export interface LanzouShareResp<T = any> {
  dom?: string
  url?: string
  inf?: T
  zt?: number
  info?: string
  text?: any
}
