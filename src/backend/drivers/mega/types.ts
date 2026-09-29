export interface MegaAddition {
  email: string
  password: string
  two_fa_code?: string
  two_fa_secret?: string
  move_to_trash?: boolean
  root_folder_id?: string
  order_by?: string
  order_direction?: string
}

export interface MegaNodeItem {
  id: string // handle 'h'
  parent_id?: string // 'p'
  name: string
  size: number
  is_dir: boolean
  modified: string
  type: number // 0=file, 1=folder, 2=root, 3=inbox, 4=trash
  raw_url?: string
  key?: string
}

export interface MegaQuotaResp {
  mstrg: number // max storage
  cstrg: number // current storage
}
