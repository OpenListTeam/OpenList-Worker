// degoo (Degoo) - GraphQL API + JWT
// API reference: Go drivers/degoo

export interface DriverDegooAddition {
  root_folder_id?: string
  username?: string
  password?: string
  refresh_token?: string
  access_token?: string
}

export interface DegooFileItem {
  ID: string
  ParentID: string
  Name: string
  Category: number
  Size: string
  URL?: string
  CreationTime: string
  LastModificationTime: string
  LastUploadTime: string
  MetadataID?: string
  DeviceID?: number
  FilePath?: string
  IsInRecycleBin?: boolean
}

export interface DegooLoginResp {
  Token?: string
  RefreshToken?: string
}

export interface DegooAccessTokenResp {
  AccessToken?: string
}

export interface DegooGraphqlResp {
  data?: any
  errors?: { errorType?: string; message?: string }[]
}
