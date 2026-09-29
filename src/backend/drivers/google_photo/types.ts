// google_photo (Google Photos) - OAuth2 refresh token
// API reference: Go drivers/google_photo

export interface DriverGooglePhotoAddition {
  root_folder_id?: string
  refresh_token: string
  client_id: string
  client_secret: string
  show_archive?: boolean
}

export interface GooglePhotoMediaItem {
  id: string
  title?: string
  baseUrl?: string
  coverPhotoBaseUrl?: string
  mimeType?: string
  filename?: string
  mediaMetadata?: {
    creationTime?: string
    width?: string
    height?: string
  }
}

export interface GooglePhotoItems {
  nextPageToken?: string
  mediaItems?: GooglePhotoMediaItem[]
  albums?: GooglePhotoMediaItem[]
  sharedAlbums?: GooglePhotoMediaItem[]
}

export interface GooglePhotoTokenResp {
  access_token?: string
  expires_in?: number
  token_type?: string
}

export interface GooglePhotoTokenError {
  error?: string
  error_description?: string
}

export interface GooglePhotoApiError {
  error?: {
    code?: number
    message?: string
    errors?: { message?: string }[]
  }
}
