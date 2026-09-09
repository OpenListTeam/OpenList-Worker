// cloudflare_imgbed driver types
// Ported from: OpenList-Backends/drivers/cloudflare_imgbed

export interface CFImgBedAddition {
  root_folder_path: string
  address: string
  token: string
  small_channel_name: string
  large_channel_name: string
  large_channel_type: string
  upload_thread: number
}

export interface CFImgBedFile {
  name: string
  metadata?: Record<string, any>
}

export interface CFImgBedListResp {
  files: CFImgBedFile[]
  directories: string[]
}

export interface CFImgBedApiError {
  error?: string
  message?: string
}

export interface CFImgBedUploadRespItem {
  src: string
  publicUrl?: string
}
