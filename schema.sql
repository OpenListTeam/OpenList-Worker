CREATE TABLE mount -- 挂载路径
(
    -- 核心信息 ===============================================
    mount_path TEXT PRIMARY KEY UNIQUE NOT NULL, -- 路径名称
    mount_type TEXT                    NOT NULL, -- 驱动类型
    is_enabled INTEGER                 NOT NULL, -- 是否启用
    -- 拓展信息 ===============================================
    drive_conf TEXT,                             -- 配置数据
    drive_save TEXT,                             -- 服务数据
    cache_time INTEGER DEFAULT 0,                -- 缓存时间
    index_list INTEGER DEFAULT 0,                -- 显示序号
    proxy_mode INTEGER DEFAULT 0,                -- 代理模式
    proxy_data TEXT,                             -- 代理数据
    drive_logs TEXT,                             -- 驱动日志
    drive_tips TEXT                              -- 提示信息
);

CREATE TABLE users -- 用户信息
(
    -- 核心信息 ===============================================
    users_name TEXT PRIMARY KEY UNIQUE NOT NULL, -- 用户名称
    users_mail TEXT                    NOT NULL, -- 密码SHA2
    users_pass TEXT                    NOT NULL, -- 密码SHA2
    users_mask TEXT                    NOT NULL, -- 用户权限
    is_enabled INTEGER                 NOT NULL, -- 是否启用
    -- 拓展信息 ===============================================
    total_size INTEGER,                          -- 分片大小
    total_used INTEGER,                          -- 使用大小
    oauth_data TEXT,                             -- 认证数据
    mount_data TEXT                              -- 连接数据
);

CREATE TABLE oauth -- 授权认证系统配置
(
    -- 核心信息 ===============================================
    oauth_name TEXT PRIMARY KEY UNIQUE NOT NULL, -- 授权名称
    oauth_type TEXT                    NOT NULL, -- 授权类型
    oauth_data TEXT                    NOT NULL, -- 授权数据
    is_enabled INTEGER                 NOT NULL  -- 是否启用
);

CREATE TABLE binds -- 授权认证用户绑定
(
    -- 核心信息 ===============================================
    oauth_uuid TEXT PRIMARY KEY UNIQUE NOT NULL, -- 授权UUID
    oauth_name TEXT                    NOT NULL, -- 授权名称
    binds_user TEXT                    NOT NULL, -- 用户名称
    binds_data TEXT                    NOT NULL, -- 绑定数据
    is_enabled INTEGER                 NOT NULL  -- 是否启用
);

CREATE TABLE crypt -- 加密配置
(
    -- 核心信息 ===============================================
    crypt_name TEXT PRIMARY KEY UNIQUE NOT NULL, -- 加密名称
    crypt_pass TEXT                    NOT NULL, -- 主要密码
    crypt_type INTEGER                 NOT NULL, -- 加密类型
    crypt_mode INTEGER                 NOT NULL, -- 加密模式
    is_enabled INTEGER                 NOT NULL, -- 是否启用
    -- 拓展信息 ===============================================
    crypt_self INTEGER,                          -- 自动解密
    rands_pass INTEGER,                          -- 随机密码
    oauth_data TEXT,                             -- 认证数据
    write_name TEXT                              -- 后缀名称
);

CREATE TABLE mates -- 元组配置
(
    -- 核心信息 ===============================================
    mates_name TEXT PRIMARY KEY UNIQUE NOT NULL, -- 元组路径
    mates_mask INTEGER                 NOT NULL, -- 权限掩码
    mates_user INTEGER                 NOT NULL, -- 所有用户
    is_enabled INTEGER                 NOT NULL, -- 是否启用
    -- 拓展信息 ===============================================
    dir_hidden INTEGER,                          -- 是否隐藏
    dir_shared INTEGER,                          -- 是否共享
    set_zipped TEXT,                             -- 压缩配置
    set_parted TEXT,                             -- 分片配置
    crypt_name TEXT,                             -- 加密配置
    cache_time INTEGER                           -- 缓存时间
);

CREATE TABLE share -- 分享配置
(
    -- 核心信息 ===============================================
    share_uuid TEXT PRIMARY KEY UNIQUE NOT NULL, -- 分享UUID
    share_path TEXT                    NOT NULL, -- 分享路径
    share_pass TEXT                    NOT NULL, -- 分享密码
    share_user TEXT                    NOT NULL, -- 分享用户
    share_date INTEGER                 NOT NULL, -- 分享日期
    share_ends INTEGER                 NOT NULL, -- 有效期限
    is_enabled INTEGER                 NOT NULL  -- 是否启用
    -- 拓展信息 ===============================================
);

CREATE TABLE token -- 连接配置
(
    -- 核心信息 ===============================================
    token_uuid TEXT PRIMARY KEY UNIQUE NOT NULL, -- 唯一UUID
    token_path TEXT                    NOT NULL, -- 连接路径
    token_user TEXT                    NOT NULL, -- 所属用户
    token_type TEXT                    NOT NULL, -- 连接类型
    token_info TEXT                    NOT NULL, -- 登录信息
    is_enabled INTEGER                 NOT NULL  -- 是否启用
    -- 拓展信息 ===============================================
);

CREATE TABLE tasks -- 任务配置
(
    -- 核心信息 ===============================================
    tasks_uuid TEXT PRIMARY KEY UNIQUE NOT NULL, -- 唯一UUID
    tasks_type TEXT                    NOT NULL, -- 任务类型
    tasks_user TEXT                    NOT NULL, -- 所属用户
    tasks_info TEXT                    NOT NULL, -- 任务信息
    tasks_flag INTEGER                 NOT NULL  -- 任务状态
    -- 拓展信息 ===============================================
);

CREATE TABLE fetch -- 离线下载
(
    -- 核心信息 ===============================================
    fetch_uuid TEXT PRIMARY KEY UNIQUE NOT NULL, -- 唯一UUID
    fetch_from TEXT                    NOT NULL, -- 所属用户
    fetch_dest TEXT                    NOT NULL, -- 任务类型
    fetch_user TEXT                    NOT NULL, -- 所属用户
    fetch_flag INTEGER                 NOT NULL  -- 任务状态
    -- 拓展信息 ===============================================
);

CREATE TABLE `group` -- 用户分组 【用反引号转义保留关键字】
(
    -- 核心信息 ===============================================
    group_name TEXT PRIMARY KEY UNIQUE NOT NULL, -- 分组名称
    group_mask TEXT                    NOT NULL, -- 分组掩码
    is_enabled INTEGER                 NOT NULL  -- 是否启用
    -- 拓展信息 ===============================================
);

CREATE TABLE cache -- 缓存信息
(
    -- 核心信息 ===============================================
    cache_path TEXT PRIMARY KEY UNIQUE NOT NULL, -- 缓存路径
    cache_info INTEGER,                          -- 缓存信息
    cache_time INTEGER                           -- 过期时间
    -- 拓展信息 ===============================================
);

CREATE TABLE admin -- 全局设置
(
    admin_keys TEXT PRIMARY KEY UNIQUE NOT NULL, -- 设置路径
    admin_data TEXT                    NOT NULL, -- 设置数据
    -- 拓展信息 ===============================================
);