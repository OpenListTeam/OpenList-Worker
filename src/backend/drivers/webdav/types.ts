export interface WebdavAddition {
  vendor?: "sharepoint" | "other" | string
  address: string
  username: string
  password: string
  root_folder_path?: string
  tls_insecure_skip_verify?: boolean
  order_by?: string
  order_direction?: string
}

export interface WebdavFile {
  name: string
  path: string
  size: number
  modified: string
  isFolder: boolean
  contentType?: string
  etag?: string
}

export interface WebdavLinkResult {
  url: string
  headers: Record<string, string>
}
