export interface PikPakAddition {
  username?: string
  password?: string
  platform?: "web" | "android" | "pc"
  refresh_token?: string
  captcha_token?: string
  device_id?: string
  root_folder_id?: string
  disable_media_link?: boolean
  order_by?: string
  order_direction?: string
}

export interface PikPakFile {
  id: string
  kind: string // "drive#folder" | "drive#file"
  name: string
  created_time?: string
  modified_time?: string
  hash?: string
  size?: string
  thumbnail_link?: string
  web_content_link?: string
  medias?: PikPakMedia[]
}

export interface PikPakMedia {
  media_id: string
  media_name: string
  video?: {
    height: number
    width: number
    duration: number
    bit_rate: number
    frame_rate: number
    video_codec: string
    audio_codec: string
    video_type: string
  }
  link?: {
    url: string
    token: string
    expire: string
  }
  need_more_quota?: boolean
  redirect_link?: string
  icon_link?: string
  is_default?: boolean
  priority?: number
  is_origin?: boolean
  resolution_name?: string
  is_visible?: boolean
  category?: string
}

export interface PikPakFileListResp {
  files: PikPakFile[]
  next_page_token?: string
}

export interface PikPakTokenResp {
  access_token: string
  refresh_token: string
  sub?: string
  expires_in?: number
  token_type?: string
}

export interface PikPakErrResp {
  error_code?: number
  error?: string
  error_description?: string
}

export interface PikPakCaptchaTokenResp {
  captcha_token: string
  expires_in: number
  url?: string
}

export interface PikPakAboutResp {
  quota: {
    limit: string
    usage: string
    usage_in_trash?: string
    is_unlimited?: boolean
    complimentary?: string
  }
  expires_at?: string
  user_type?: number
}
