// Based on: https://github.com/OpenListTeam/OpenList/tree/main/drivers/s3

export interface S3Addition {
  root_folder_path?: string
  bucket: string
  endpoint: string
  region?: string
  access_key_id: string
  secret_access_key: string
  session_token?: string
  custom_host?: string
  enable_custom_host_presign?: boolean
  sign_url_expire?: number | string
  placeholder?: string
  force_path_style?: boolean
  list_object_version?: "v1" | "v2" | string
  remove_bucket?: boolean
  add_filename_to_disposition?: boolean
  enable_direct_upload?: boolean
  direct_upload_host?: string
  user_agent?: string
  order_by?: "name" | "size" | "modified" | string
  order_direction?: "asc" | "desc" | string
}

export interface S3File {
  name: string
  size: number
  isFolder: boolean
  modified: string
  path: string
  etag?: string
}

export interface S3ListResult {
  files: S3File[]
  isTruncated: boolean
  nextMarker?: string
  nextContinuationToken?: string
  lastEvaluatedKey?: string
}

export interface DogeCredentials {
  accessKeyId: string
  secretAccessKey: string
  sessionToken: string
  expiredAt?: number
}
