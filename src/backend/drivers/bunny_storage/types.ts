// Bunny Storage driver types
// Ported from: OpenList-Backends/drivers/bunny_storage

export interface BunnyAddition {
  root_folder_path: string
  storage_zone_name: string
  access_key: string
  endpoint: string
  cdn_base_url: string
  cdn_token_key: string
  /** sha256 | hmac_sha256 */
  cdn_token_method: string
  cdn_token_include_ip: boolean
  sign_url_expire: number
  placeholder: string
}

export interface BunnyObject {
  Guid: string
  StorageZoneName: string
  Path: string
  ObjectName: string
  Length: number
  LastChanged: string
  IsDirectory: boolean
  ServerId: number
  DateCreated: string
  StorageZoneId: number
}

export interface BunnyApiError {
  HttpCode: number
  Message: string
}
