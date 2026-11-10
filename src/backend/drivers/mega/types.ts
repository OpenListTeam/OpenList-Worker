export interface MegaAddition {
  email: string
  password: string
  two_fa_code?: string
  two_fa_secret?: string
  move_to_trash?: boolean
  root_folder_id?: string
  order_by?: string
  order_direction?: string
  /** 驱动回写的会话，避免每个 isolate 冷启动都重新登录并做一次 Hashcash */
  sid?: string
  /** 与 sid 配套的账号 master key（base64url，16 字节），用于解密节点密钥 */
  master_key?: string
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
  /** 解密后的节点密钥（16/32 字节，base64url），下载客户端解密时使用 */
  file_key?: string
}

export interface MegaQuotaResp {
  mstrg: number // max storage
  cstrg: number // current storage
}
