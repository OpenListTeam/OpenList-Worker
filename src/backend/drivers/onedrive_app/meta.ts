export interface Addition {
  root_folder_path: string
  region: string
  client_id: string
  client_secret: string
  tenant_id: string
  email: string
  chunk_size: number
  custom_host: string
  disable_disk_usage: boolean
  enable_direct_upload: boolean
  order_by?: string
  order_direction?: string
}

export const config = {
  name: "OnedriveAPP",
  localSort: true,
  defaultRoot: "/",
}

export const onedriveHostMap: Record<string, { oauth: string; api: string }> = {
  global: {
    oauth: "https://login.microsoftonline.com",
    api: "https://graph.microsoft.com",
  },
  cn: {
    oauth: "https://login.chinacloudapi.cn",
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
