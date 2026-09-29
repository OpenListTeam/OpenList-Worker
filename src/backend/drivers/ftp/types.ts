// FTP Driver Types
// Ported from OpenList: https://github.com/OpenListTeam/OpenList/tree/main/drivers/ftp

export interface FTPAddition {
  address: string // host:port e.g. "127.0.0.1:21" or "example.com:21"
  username: string
  password?: string
  encoding?: string // default "utf-8", can be "gbk", "gb2312", etc.
  cwd_list?: boolean | string // enter directory before listing
  root_folder_path?: string // default "/"
}

export interface FTPFileEntry {
  name: string
  size: number
  is_dir: boolean
  modified: Date
}
