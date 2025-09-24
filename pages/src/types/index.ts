// 分享配置
export interface Share {
  share_uuid: string;
  share_path: string;
  share_pass: string;
  share_user: string;
  share_date: number;
  share_ends: number;
  is_enabled: number;
}

// 挂载配置
export interface Mount {
  mount_path: string;
  mount_type: string;
  is_enabled: number;
  drive_conf?: string;
  drive_save?: string;
  cache_time?: number;
}

// 用户信息
export interface User {
  users_uuid: number;
  users_name: string;
  users_pass: string;
  users_mask: string;
  is_enabled: number;
  total_size?: number;
  total_used?: number;
  oauth_data?: string;
  mount_data?: string;
}

// 用户分组
export interface Group {
  group_name: string;
  group_mask: string;
  is_enabled: number;
}

// 授权认证
export interface OAuth {
  oauth_name: string;
  oauth_type: string;
  oauth_data: string;
  is_enabled: number;
}

// 加密配置
export interface Crypt {
  crypt_name: string;
  crypt_pass: string;
  crypt_type: number;
  crypt_mode: number;
  is_enabled: number;
  crypt_self?: number;
  rands_pass?: number;
  oauth_data?: string;
  write_name?: string;
}

// 元组配置
export interface Mates {
  mates_name: string;
  mates_mask: number;
  mates_user: number;
  is_enabled: number;
  dir_hidden?: number;
  dir_shared?: number;
  set_zipped?: string;
  set_parted?: string;
  crypt_name?: string;
  cache_time?: number;
}

// 连接配置
export interface Token {
  token_uuid: string;
  token_path: string;
  token_user: string;
  token_type: string;
  token_info: string;
  is_enabled: number;
}

// 任务配置
export interface Task {
  tasks_uuid: string;
  tasks_type: string;
  tasks_user: string;
  tasks_info: string;
  tasks_flag: number;
}

// 离线下载
export interface Fetch {
  fetch_uuid: string;
  fetch_from: string;
  fetch_dest: string;
  fetch_user: string;
  fetch_flag: number;
}

// 文件项
export interface FileItem {
  id: string;
  name: string;
  size: string;
  modified: string;
  owner: string;
  permissions: string;
  tags: string;
}

// 菜单项
export interface MenuItem {
  id: string;
  title: string;
  icon: string;
  category: 'file' | 'personal' | 'system';
  path: string;
}