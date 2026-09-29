export interface Pan115ShareAddition {
  cookie?: string
  qrcode_token?: string
  qrcode_source?: string
  page_size?: number
  share_code: string
  receive_code: string
  root_folder_id?: string
  order_by?: string
  order_direction?: string
}

export interface Pan115ShareItem {
  file_id?: string
  category_id?: string
  file_name?: string
  file_size?: number | string
  sha1?: string
  is_file?: number // 0 = folder, 1 = file
  user_utime?: number | string
  thumb_url?: string
}

export interface Pan115ShareSnapResp {
  state: boolean
  msg?: string
  data?: {
    count?: number
    list?: Pan115ShareItem[]
  }
}

export interface Pan115ShareDownResp {
  state: boolean
  msg?: string
  data?: {
    url?: {
      url: string
    }
  }
}
