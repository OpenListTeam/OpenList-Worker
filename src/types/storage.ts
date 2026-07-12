import { MountDetails } from "./obj"

export enum OrderBy {
  Name = "name",
  Size = "size",
  Modified = "modified",
  None = "",
}

export enum OrderDirection {
  Asc = "ASC",
  Desc = "DESC",
  None = "",
}

export enum ExtractFolder {
  Front = "front",
  Back = "back",
  None = "",
}

export enum WebdavPolicy {
  Redirect = "302_redirect",
  UseProxyUrl = "use_proxy_url",
  NativeProxy = "native_proxy",
}

export interface Storage {
  id: number
  mount_path: string
  order: number
  driver: string
  status: string
  addition: string
  remark: string
  modified: string
  cache_expiration?: number
  custom_cache_policies?: string
  web_proxy: boolean
  webdav_policy: WebdavPolicy
  down_proxy_url?: string
  disable_proxy_sign?: boolean
  order_by: OrderBy
  order_direction: OrderDirection
  extract_folder: ExtractFolder
  disable_index?: boolean
  enable_sign?: boolean
  disabled: boolean
  mount_details?: MountDetails
}

export type Addition = Record<string, string | boolean | number>
