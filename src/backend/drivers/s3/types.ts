export interface S3Addition {
  endpoint: string
  region: string
  access_key_id: string
  secret_access_key: string
  session_token?: string
  bucket: string
  root_folder_path?: string
  force_path_style?: boolean
  sign_url_expire?: number
  custom_host?: string
  enable_custom_host_presign?: boolean
  remove_bucket?: boolean
  user_agent?: string
  list_object_version?: "v1" | "v2"
  add_filename_to_disposition?: boolean
  /** Placeholder file used to mark empty directories (e.g. ".openlist"). Hidden from listings. */
  placeholder?: string
}

export interface S3Object {
  Key: string
  LastModified?: string
  Size?: number
  ETag?: string
  StorageClass?: string
}

export interface S3CommonPrefix {
  Prefix: string
}

export interface S3ListResult {
  IsTruncated: boolean
  NextContinuationToken?: string
  Contents: S3Object[]
  CommonPrefixes: S3CommonPrefix[]
  Prefix: string
  Delimiter: string
  MaxKeys: number
}

export interface S3HeadResult {
  contentLength: number
  lastModified: string
  contentType: string
  etag: string
}
