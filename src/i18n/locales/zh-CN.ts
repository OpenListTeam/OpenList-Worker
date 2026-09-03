/**
 * 简体中文翻译 (zh-CN) — 基准语言
 */

// ============================================================
// 通用消息
// ============================================================
const common = {
    'common.success': 'success',
    'common.operation_failed': '操作失败',
    'common.not_logged_in': '未登录',
    'common.unauthorized': '未登录或 Token 已过期',
    'common.forbidden': '无权限访问',
    'common.admin_required': '需要管理员权限',
    'common.no_permission': '当前账户无此操作权限',
    'common.guest_forbidden': '游客账户无此操作权限',
    'common.guest_no_write': '游客账户无写入权限',
    'common.not_found': '资源不存在',
    'common.conflict': '资源冲突',
    'common.bad_request': '请求参数错误',
    'common.invalid_json': '请求体格式错误',
    'common.too_many_requests': '请求过于频繁，请稍后再试',
    'common.internal_error': '服务器内部错误',
    'common.not_implemented': '该功能暂未实现',
    'common.service_unavailable': '服务暂时不可用',
    'common.id_required': 'id 不能为空',
    'common.key_required': 'key 不能为空',
    'common.username_required': 'username 不能为空',
    'common.path_required': 'path 不能为空',
    'common.names_required': 'names 不能为空',
    'common.query_failed': '查询失败',
    'common.create_failed': '创建失败',
    'common.update_failed': '更新失败',
    'common.delete_failed': '删除失败',
    'common.save_failed': '保存失败',
    'common.add_failed': '添加失败',
    'common.not_found_user': '用户不存在',
    'common.not_found_storage': '存储不存在',
    'common.not_found_file': '文件不存在',
    'common.not_found_driver': '驱动不存在',
    'common.not_found_setting': '设置项不存在',
    'common.not_found_parent_dir': '父目录不存在',
    'common.not_found_meta': '元数据不存在',
    'common.path_name_required': 'path 和 name 不能为空',
    'common.dir_required': 'dir 不能为空',
    'common.src_dir_required': 'src_dir 不能为空',
    'common.backup_data_required': 'backup_data 不能为空',
    'common.backup_data_empty': '备份数据为空',
    'common.backup_failed': '备份失败',
    'common.restore_failed': '恢复失败',
    'common.reset_default_failed': '恢复默认失败',
    'common.crypt_name_required': 'crypt_name 不能为空',
    'common.token_uuid_required': 'token_uuid 不能为空',
    'common.token_user_required': 'token_user 不能为空',
    'common.remove_empty_dir_failed': '删除空目录失败',
    'common.get_link_failed': '获取链接失败',
    'common.cannot_get_link': '无法获取下载链接',
    'common.download_failed': '下载失败',
    'common.proxy_download_failed': '代理下载失败',
    'common.cannot_proxy': '无法代理下载',
    'common.rename_pairs_required': 'rename_pairs 不能为空',
    'common.private_url_forbidden': '不允许访问内网或本地地址',
    'common.urls_required': 'urls 不能为空',
    'common.file_field_required': '未找到上传文件（字段名应为 file）',
    'common.share_not_found': '分享不存在',
    'common.share_invalid': '分享不存在或已失效',
    'common.at_least_one_path': '至少需要一个文件路径',
    'common.parse_archive_failed': '解析归档失败',
    'common.unsupported_format': '不支持的归档格式',
    'common.list_archive_failed': '列出归档内容失败',
    'common.extract_failed': '提取失败',
    'common.missing_archive_path': '缺少归档路径或内部文件路径',
    'common.async_extract_not_ready': '异步解压功能将在任务系统完成后启用',
    'common.download_link_invalid': '下载链接无效',
    'common.unsupported_download_method': '不支持的下载方式',
};

// ============================================================
// 认证相关
// ============================================================
const auth = {
    'auth.username_password_required': '用户名和密码不能为空',
    'auth.login_failed': '用户名或密码错误',
    'auth.registration_closed': '系统已关闭注册功能，请联系管理员',
    'auth.register_failed': '注册失败',
    'auth.username_immutable': '用户名不可修改',
    'auth.code_secret_required': 'code 和 secret 不能为空',
    'auth.verify_code_error': '验证码错误',
    'auth.ssh_key_required': '公钥内容不能为空',
    'auth.ssh_key_invalid': '公钥格式不正确',
};

// ============================================================
// 文件系统
// ============================================================
const fs = {
    'fs.path_not_found': '路径不存在',
    'fs.file_not_found': '文件不存在',
    'fs.keywords_required': 'keywords 不能为空',
    'fs.invalid_share_id': '无效的分享 ID',
    'fs.share_invalid': '分享不存在或已失效',
    'fs.parent_dir_not_found': '父目录不存在',
    'fs.mkdir_failed': '创建目录失败',
    'fs.name_invalid': '文件名不能包含路径分隔符',
    'fs.rename_failed': '重命名失败',
    'fs.src_dst_required': 'src_dir 和 dst_dir 不能为空',
    'fs.move_failed': '移动 {{name}} 失败: {{error}}',
    'fs.copy_failed': '复制 {{name}} 失败: {{error}}',
    'fs.file_path_required': 'File-Path 请求头不能为空',
    'fs.target_dir_not_found': '目标目录不存在',
    'fs.body_empty': '请求体为空',
    'fs.upload_failed': '上传失败',
    'fs.target_path_required': '目标路径不能为空',
    'fs.form_parse_failed': '解析表单数据失败',
    'fs.no_file_found': '未找到上传文件',
    'fs.path_required': 'path 不能为空',
    'fs.archive_meta_failed': '获取归档信息失败',
    'fs.archive_list_failed': '列出归档内容失败',
    'fs.decompress_failed': '解压失败',
    'fs.decompress_src_dst_required': '归档路径和目标路径不能为空',
};

// ============================================================
// 分享
// ============================================================
const share = {
    'share.create_failed': '创建分享失败',
    'share.update_failed': '更新分享失败',
    'share.delete_failed': '删除分享失败',
    'share.id_required': '分享 ID 不能为空',
    'share.not_found': '分享不存在',
    'share.path_required': '分享路径不能为空',
    'share.password_required': '分享密码错误',
    'share.expired': '分享已过期',
};

// ============================================================
// 任务
// ============================================================
const task = {
    'task.type_required': '任务类型不能为空',
    'task.id_required': '任务 ID 不能为空',
    'task.not_found': '任务不存在',
    'task.cancel_failed': '取消任务失败',
    'task.delete_failed': '删除任务失败',
    'task.retry_failed': '重试任务失败',
};

// ============================================================
// 管理员
// ============================================================
const admin = {
    'admin.user_not_found': '用户不存在',
    'admin.username_password_required': 'username 和 password 不能为空',
    'admin.storage_not_found': '存储不存在',
    'admin.mount_path_driver_required': 'mount_path 和 driver 不能为空',
    'admin.storage_init_failed': '创建成功但初始化失败',
    'admin.driver_required': 'driver 不能为空',
    'admin.setting_not_found': '设置项不存在',
    'admin.setting_body_invalid': '请求体应为设置数组',
    'admin.media_path_required': '扫描路径不能为空',
    'admin.media_scan_failed': '启动扫描失败',
    'admin.media_scrape_failed': '启动刮削失败',
    'admin.media_clear_failed': '清空媒体库失败',
};

// ============================================================
// 存储/挂载
// ============================================================
const storage = {
    'storage.not_found': '存储不存在',
    'storage.mount_path_required': '挂载路径不能为空',
    'storage.driver_not_found': '驱动不存在',
    'storage.load_failed': '加载存储失败',
    'storage.init_failed': '初始化存储失败',
    'storage.enable_failed': '启用存储失败',
    'storage.disable_failed': '禁用存储失败',
};

// ============================================================
// 系统初始化
// ============================================================
const setup = {
    'setup.already_initialized': '系统已初始化',
    'setup.init_failed': '初始化失败',
    'setup.admin_required': '需要管理员账户初始化',
};

// ============================================================
// WebDAV
// ============================================================
const webdav = {
    'webdav.auth_required': '需要 WebDAV 认证',
    'webdav.auth_failed': 'WebDAV 认证失败',
    'webdav.not_found': 'WebDAV 资源不存在',
    'webdav.method_not_allowed': '不支持的 WebDAV 方法',
    'webdav.locked': '资源已锁定',
};

// ============================================================
// 媒体库
// ============================================================
const media = {
    'media.scan_path_required': '扫描路径不能为空',
    'media.scan_started': '扫描已启动',
    'media.scan_already_running': '扫描已在运行中',
    'media.scrape_started': '刮削已启动',
    'media.item_not_found': '媒体项不存在',
    'media.update_failed': '更新媒体项失败',
    'media.delete_failed': '删除媒体项失败',
    'media.clear_failed': '清空媒体库失败',
};

// ============================================================
// 导出合并
// ============================================================
export const zhCN: Record<string, string> = {
    ...common,
    ...auth,
    ...fs,
    ...share,
    ...task,
    ...admin,
    ...storage,
    ...setup,
    ...webdav,
    ...media,
};
