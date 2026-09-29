// Tencent Weiyun Driver Types
// Ported from OpenList: https://github.com/OpenListTeam/OpenList/tree/main/drivers/weiyun
// and https://github.com/foxxorcat/weiyun-sdk-go

export interface WeiyunAddition {
  root_folder_id?: string
  cookies: string
  order_by?: "name" | "size" | "updated_at"
  order_direction?: "asc" | "desc"
  upload_thread?: string
}

export interface WeiyunFile {
  file_id: string
  filename: string
  file_size: number
  file_sha?: string
  file_ctime?: number | string
  file_mtime?: number | string
  ext_info?: {
    thumb_url?: string
  }
  pdir_key?: string
}

export interface WeiyunFolder {
  dir_key: string
  dir_name: string
  dir_ctime?: number | string
  dir_mtime?: number | string
  pdir_key?: string
}

export interface WeiyunFolderPath {
  pdir_key: string
  dir_key: string
  dir_name: string
  dir_ctime?: number | string
  dir_mtime?: number | string
}

export interface DiskListData {
  dir_list?: WeiyunFolder[]
  file_list?: WeiyunFile[]
  pdir_key?: string
  finish_flag?: boolean
  total_dir_count?: number
  total_file_count?: number
  total_space?: number
  hide_dir_count?: number
  hide_file_count?: number
}

export interface DiskUserInfoGetData {
  uin: number
  nick_name?: string
  head_img_url?: string
  user_ctime?: number | string
  user_mtime?: number | string
  used_space: number
  total_space: number
  dir_total?: number
  file_total?: number
  root_dir_key?: string
  main_dir_key?: string
}

export interface DiskFileDownloadData {
  retcode?: number
  retmsg?: string
  cookie_name: string
  cookie_value: string
  download_url: string
}

export interface UploadAuthData {
  upload_key: string
  ex: string
}

export interface UploadChannelData {
  id: number
  offset: number
  len: number
}

export interface PreUploadData {
  file_exist: boolean
  common_upload_rsp?: WeiyunFile
  upload_scr?: number
  upload_key?: string
  ex?: string
  channel_list?: UploadChannelData[]
  speedlimit?: number
  flow_state?: number
  upload_state?: number
  uploaded_data_len?: number
}

export interface AddChannelData {
  orig_channel_count?: number
  final_channel_count?: number
  orig_channels?: UploadChannelData[]
  channels?: UploadChannelData[]
}

export interface UploadPieceData {
  channel?: UploadChannelData
  ex?: string
  upload_state?: number // 1: not finished, 2: finished, 3: no remaining chunks in channel
  flow_state?: number
}

export interface FolderParam {
  ppdir_key?: string
  pdir_key?: string
  dir_key?: string
  dir_name?: string
}

export interface FileParam {
  ppdir_key?: string
  pdir_key?: string
  file_id?: string
  filename?: string
}

export type WeiyunAccountType =
  | "qq"
  | "weixin"
  | "weixin_openid"
  | "qq_openid"
  | "unknown"
