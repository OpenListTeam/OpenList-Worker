// github_releases (GitHub Releases 发布源) - REST API
// API reference: Go drivers/github_releases

export interface DriverGithubReleasesAddition {
  /** 仓库结构：[path:]org/repo，多个用分号分隔 */
  repo_structure?: string
  /** 显示 README/LICENSE */
  show_readme?: boolean
  /** GitHub token（访问私有仓库或提高限流） */
  token?: string
  /** 显示 Source code (zip/tar.gz) */
  show_source_code?: boolean
  /** 显示所有版本 */
  show_all_version?: boolean
  /** GitHub 代理前缀 */
  gh_proxy?: string
}

export interface GHRMountPoint {
  point: string
  repo: string
}

export interface GHRAsset {
  name: string
  size: number
  updated_at: string
  created_at: string
  browser_download_url: string
}

export interface GHRRelease {
  tag_name: string
  created_at: string
  published_at: string
  html_url: string
  zipball_url: string
  tarball_url: string
  assets: GHRAsset[]
}

export interface GHRFileInfo {
  name: string
  size: number
  download_url: string
}

export interface GHRFile {
  path: string
  name: string
  size: number
  isDir: boolean
  modified: string
  url: string
}
