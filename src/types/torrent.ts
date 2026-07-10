// Torrent 文件中的单个文件信息
export interface TorrentFile {
  path: string
  size: number
}

// CAS 扩展信息（天翼云秒传）
export interface CASInfo {
  file_md5: string
  slice_md5: string
  slice_size: number
  cloud: string
}

// Torrent 解析结果
export interface TorrentInfo {
  name: string
  total_size: number
  piece_length: number
  piece_count: number
  info_hash: string
  files: TorrentFile[]
  has_cas: boolean
  cas?: CASInfo
}

// 上传解析 torrent 的响应
export interface TorrentUploadParseResult {
  info: TorrentInfo
  torrent_data: string // Base64 编码的 torrent 数据
}

// 秒传结果
export interface TorrentRapidUploadResult {
  message: string
  file_name: string
  file_size: number
}
