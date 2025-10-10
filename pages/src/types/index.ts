// 分享配置
export interface ShareConfig {
  share_uuid: string;
  share_path: string;
  share_pass: string;
  share_user: string;
  share_date: number;
  share_ends: number;
  is_enabled: number;
}

// 挂载配置
export interface MountConfig {
  mount_path: string;
  mount_type?: string;
  is_enabled?: number;
  drive_conf?: string;
  drive_save?: string;
  cache_time?: number;
  index_list?: number;
  proxy_mode?: number;
  proxy_data?: string;
  drive_logs?: string;
  drive_tips?: string;
}

// 用户信息（用于前端显示）
export interface User {
  users_name?: string;
  users_mail?: string;
  users_pass?: string;
  users_mask?: string;
  is_enabled?: string ; // 支持字符串和布尔值
  total_size?: number;
  total_used?: number;
  oauth_data?: string;
  mount_data?: string;
}

// 用户配置接口（与后端API保持一致）
export interface UsersConfig {
  users_name: string;
  users_mail?: string;
  users_pass?: string;
  users_mask?: string;
  is_enabled?: string; // 支持字符串和布尔值
  total_size?: number;
  total_used?: number;
  oauth_data?: string;
  mount_data?: string;
}

// 用户操作结果接口（与后端API保持一致）
export interface UsersResult {
  flag: boolean;
  text: string;
  code?: number;
  data?: UsersConfig[];
  token?: string;
}

// 用户登录请求接口
export interface LoginRequest {
  users_name: string;
  users_pass: string;
}

// 用户创建请求接口
export interface CreateUserRequest {
  users_name: string;
  users_mail?: string;
  users_pass: string;
  is_enabled?: boolean;
  total_size?: number;
}

// 用户更新请求接口
export interface UpdateUserRequest {
  users_name: string;
  users_mail?: string;
  users_pass?: string;
  users_mask?: string;
  is_enabled?: boolean;
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

// 文件哈希信息
export interface FileHash {
  md5?: string;
  sha1?: string;
  sha256?: string;
}

// 加密数据信息
export interface CryptInfo {
  crypt_name: string;
  crypt_user: string;
  crypt_pass: string;
  crypt_type: number;
  crypt_mode: number;
  is_enabled: boolean;
  crypt_self?: boolean;
  rands_pass?: boolean;
  write_name?: string;
  // write_info?: string;
  oauth_data?: Record<string, any>;
}

// 文件信息 - 匹配后端FileInfo接口
export interface FileInfo {
  // 必要属性
  filePath: string;      // 文件路径
  fileName: string;      // 文件名称
  fileSize: number;      // 文件大小
  fileType: number;      // 文件类型 (0: 目录, 1: 文件)
  // 拓展属性
  fileHash?: FileHash;   // 文件哈希
  fileUUID?: string;     // 文件标识
  // 可选属性
  thumbnails?: string;   // 预览地址
  timeModify?: Date;     // 修改时间
  timeCreate?: Date;     // 创建时间
  fileCrypts?: CryptInfo;// 加密数据
  fileExtend?: Record<string, string>;
}

// 目录信息 - 匹配后端PathInfo接口
export interface PathInfo {
  pageSize?: number;     // 文件数量
  pageNums?: number;     // 页面编号
  filePath?: string;     // 文件路径
  fileList?: FileInfo[]; // 文件列表
}

// 菜单项
export interface MenuItem {
  id: string;
  title: string;
  icon: string;
  category: 'file' | 'personal' | 'system';
  path: string;
}