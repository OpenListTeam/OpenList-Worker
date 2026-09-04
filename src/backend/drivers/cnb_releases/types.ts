// cnb_releases (CNB 代码托管 Releases) - Bearer token 认证
// API base: https://api.cnb.cool

export interface DriverCnbReleasesAddition {
  /** 仓库 slug（org/repo） */
  repo: string
  /** 访问令牌（必填） */
  token: string
  /** 使用 tag name 作为版本名 */
  use_tag_name?: boolean
  /** 新建 release 的目标分支 */
  default_branch?: string
}

export interface CNBAsset {
  id: string
  name: string
  size: number
  path: string
  created_at: string
  updated_at: string
}

export interface CNBRelease {
  id: string
  name: string
  tag_name: string
  created_at: string
  updated_at: string
  assets: CNBAsset[]
}
