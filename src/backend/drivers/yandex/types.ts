export interface YandexAddition {
  refresh_token: string
  order_by?: string
  order_direction?: string
  root_folder_path?: string
  use_online_api?: boolean
  api_url_address?: string
  client_id?: string
  client_secret?: string
}

export interface YandexFile {
  name: string
  size?: number
  modified?: string
  created?: string
  preview?: string
  path?: string
  type?: "dir" | "file" | string
  file?: string
}

export interface YandexFilesResp {
  _embedded?: {
    sort?: string
    items: YandexFile[]
    limit: number
    offset: number
    path: string
    total: number
  }
  name?: string
  resource_id?: string
  created?: string
  modified?: string
  path?: string
  type?: "dir" | "file" | string
}

export interface YandexDownloadResp {
  href: string
  method: string
  templated?: boolean
}

export interface YandexUploadResp {
  operation_id?: string
  href: string
  method: string
  templated?: boolean
}

export interface YandexTokenResp {
  access_token: string
  refresh_token: string
  expires_in?: number
  token_type?: string
}
