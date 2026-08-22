export interface WebDavAddition {
  address: string
  username: string
  password: string
  root_folder_path?: string
  tls_insecure_skip_verify?: boolean
}

export interface WebDavResponse {
  status: number
  body: string
}

export interface WebDavResource {
  href: string
  displayName: string
  resourceType: string // "collection" | ""
  contentLength: number
  lastModified: string
  contentType: string
  etag: string
}
