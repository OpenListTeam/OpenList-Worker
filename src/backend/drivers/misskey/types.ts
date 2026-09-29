// misskey (Misskey 网盘 drive) - JSON POST + Bearer token
// API reference: Go drivers/misskey

export interface DriverMisskeyAddition {
  endpoint: string
  access_token: string
  root_path?: string
}

export interface MisskeyFile {
  id: string
  name: string
  size: number
  createdAt: string
  url: string
  thumbnailUrl: string
}

export interface MisskeyFolder {
  id: string
  name: string
  createdAt: string
}
