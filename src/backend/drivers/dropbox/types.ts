export interface DropboxAddition {
  root_folder_path?: string
  use_online_api?: boolean
  api_url_address?: string
  client_id?: string
  client_secret?: string
  access_token?: string
  refresh_token: string
  root_namespace_id?: string
  order_by?: string
  order_direction?: string
}

export interface DropboxFileEntry {
  ".tag": "file" | "folder" | "deleted"
  name: string
  id: string
  client_modified?: string
  server_modified?: string
  rev?: string
  size?: number
  path_lower?: string
  path_display?: string
  is_downloadable?: boolean
}

export interface DropboxListResp {
  entries: DropboxFileEntry[]
  cursor: string
  has_more: boolean
}

export interface DropboxCurrentAccountResp {
  account_id: string
  name: {
    given_name: string
    surname: string
    familiar_name: string
    display_name: string
  }
  email: string
  root_info?: {
    ".tag": string
    root_namespace_id: string
    home_namespace_id: string
  }
}

export interface DropboxSpaceUsageResp {
  used: number
  allocation: {
    ".tag": string
    allocated: number
  }
}
