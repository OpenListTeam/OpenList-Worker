// SFTP Driver Types
// Ported from OpenList: https://github.com/OpenListTeam/OpenList/tree/main/drivers/sftp

export interface SFTPAddition {
  address: string // host:port e.g. "127.0.0.1:22" or "example.com:22"
  username: string
  password?: string
  private_key?: string
  passphrase?: string
  root_folder_path?: string
  ignore_symlink_error?: boolean | string
}

export interface SFTPFileEntry {
  filename: string
  longname?: string
  attrs: {
    mode: number
    uid?: number
    gid?: number
    size: number
    atime: number
    mtime: number
  }
}
