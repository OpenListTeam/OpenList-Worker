// chunk (分片打包存储) - 将大文件切分为多个分片存入底层存储
// API reference: Go drivers/chunk

export interface ChunkAddition {
  /** 底层存储挂载路径 */
  remote_path: string
  /** 分片大小（字节） */
  part_size: number
  /** 仅当文件大小 > part_size 时才分片 */
  chunk_large_file_only?: boolean
  /** 分片目录前缀 */
  chunk_prefix?: string
  /** 分片文件后缀（可选） */
  custom_ext?: string
  /** 是否存储 hash 文件 */
  store_hash?: boolean
  /** 列表并发数 */
  num_list_workers?: number
  /** 是否启用缩略图 */
  thumbnail?: boolean
  /** 是否显示隐藏文件 */
  show_hidden?: boolean
}

export interface ChunkPart {
  name: string
  size: number
  modified: string
  raw_url: string
  raw_url_headers?: Record<string, string>
}
