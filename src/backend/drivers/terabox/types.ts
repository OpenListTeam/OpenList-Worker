export interface TeraboxAddition {
  cookie: string
  download_api?: "official" | "crack"
  order_by?: "name" | "time" | "size" | string
  order_direction?: "asc" | "desc" | string
  root_folder_path?: string
}

export interface TeraboxFile {
  fs_id: number
  server_mtime: number
  thumbs?: {
    url3?: string
  }
  size: number
  path: string
  server_filename: string
  isdir: number // 1: dir, 0: file
}

export interface TeraboxListResp {
  errno: number
  guid_info?: string
  list?: TeraboxFile[]
  guid?: number
}

export interface TeraboxDownloadResp {
  errno: number
  dlink?: Array<{ dlink: string }>
}

export interface TeraboxDownloadResp2 {
  errno: number
  info?: Array<{ dlink: string }>
}

export interface TeraboxHomeInfoResp {
  errno: number
  data?: {
    sign1: string
    sign3: string
    timestamp: number
  }
}

export interface TeraboxPrecreateResp {
  path: string
  uploadid: string
  return_type: number
  block_list: number[]
  errno: number
}

export interface TeraboxCheckLoginResp {
  errno: number
}

export interface TeraboxLocateUploadResp {
  host: string
}

export interface TeraboxCreateResp {
  errno: number
}
