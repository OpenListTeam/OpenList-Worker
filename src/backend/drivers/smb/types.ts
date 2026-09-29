export interface SMBAddition {
  address: string
  username: string
  password?: string
  share_name: string
  domain?: string
  port?: number
  root_folder_path?: string
  order_by?: string
  order_direction?: string
}

export interface SMBFileEntry {
  name: string
  size: number
  is_dir: boolean
  modified: string
  created?: string
}
