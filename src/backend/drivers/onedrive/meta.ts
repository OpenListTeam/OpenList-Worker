import { registerDriverProxyCapability } from "../../internal/driver/proxy"

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
  // 对齐 Go drivers/onedrive/meta.go：config 里不设 only_proxy / prefer_proxy，
  // 因此 webdav_policy 的默认值为 302_redirect，OneDrive 默认走直链。
  preferProxy: false,
}

// 显式声明「不强制代理、不默认代理」：下载模式完全由存储级
// web_proxy / webdav_policy 决定，默认 302 直链（与 Go 一致）。
registerDriverProxyCapability(config.name, {
  preferProxy: false,
  forceProxy: false,
})

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
