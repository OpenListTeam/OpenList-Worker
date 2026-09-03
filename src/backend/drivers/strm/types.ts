// Strm driver types — 将底层网盘的视频文件以 .strm 文件形式暴露
export interface StrmAddition {
  paths: string
  siteUrl?: string
  PathPrefix?: string
  downloadFileTypes?: string
  filterFileTypes?: string
  encodePath?: boolean
  withoutUrl?: boolean
  withSign?: boolean
  root_folder_path?: string
}
