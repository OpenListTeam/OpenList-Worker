export interface PikPakShareAddition {
  share_id: string
  share_pwd?: string
  platform?: "web" | "android" | "pc"
  device_id?: string
  use_transcoding_address?: boolean
  root_folder_id?: string
  order_by?: string
  order_direction?: string
}

export interface PikPakShareFileItem {
  id: string
  share_id: string
  kind: string // "drive#folder" | "drive#file"
  name: string
  modified_time?: string
  size?: string | number
  thumbnail_link?: string
  web_content_link?: string
  medias?: Array<{
    link?: {
      url?: string
      expire?: string
    }
  }>
}

export interface PikPakShareResp {
  share_status?: string
  share_status_text?: string
  file_info?: PikPakShareFileItem
  files?: PikPakShareFileItem[]
  next_page_token?: string
  pass_code_token?: string
}
