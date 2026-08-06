export interface Addition {
  root_folder_path: string
  region: string
  is_sharepoint: boolean
  use_online_api: boolean
  api_url_address: string
  client_id: string
  client_secret: string
  redirect_uri: string
  refresh_token: string
  site_id: string
  chunk_size: number
  custom_host: string
  disable_disk_usage: boolean
  enable_direct_upload: boolean
  order_by?: string
  order_direction?: string
}

export const config = {
  name: "Onedrive",
  localSort: true,
  defaultRoot: "/",
}

export const onedriveHostMap: Record<string, { oauth: string; api: string }> = {
  global: {
    oauth: "https://login.microsoftonline.com",
    api: "https://graph.microsoft.com",
  },
  cn: {
    oauth: "https://login.partner.microsoftonline.cn",
    api: "https://microsoftgraph.chinacloudapi.cn",
  },
  us: {
    oauth: "https://login.microsoftonline.us",
    api: "https://graph.microsoft.us",
  },
  de: {
    oauth: "https://login.microsoftonline.de",
    api: "https://graph.microsoft.de",
  },
}
