CREATE TABLE mount -- 挂载路径
(
    -- 核心信息 ===============================================
    mount_uuid INTEGER AUTOINCREMENT   NOT NULL, -- 路径UUID
    mount_path TEXT PRIMARY KEY UNIQUE NOT NULL, -- 路径名称
    mount_type TEXT                    NOT NULL, -- 驱动类型
    is_enabled INTEGER                 NOT NULL, -- 是否启用
    -- 拓展信息 ===============================================
    drive_conf TEXT,                             -- 配置数据
    drive_save TEXT                              -- 服务数据
);

CREATE TABLE users -- 用户信息
(
    -- 核心信息 ===============================================
    users_uuid INTEGER AUTOINCREMENT   NOT NULL, -- 用户UUID
    users_name TEXT PRIMARY KEY UNIQUE NOT NULL, -- 用户名称
    users_pass TEXT                    NOT NULL, -- 密码SHA2
    users_mask TEXT                    NOT NULL, -- 用户权限
    is_enabled INTEGER                 NOT NULL, -- 是否启用
    -- 拓展信息 ===============================================
    total_size INTEGER,                          -- 分片大小
    total_used INTEGER,                          -- 使用大小
    oauth_data TEXT,                             -- 认证数据
    mount_data TEXT,                             -- 连接数据

);

CREATE TABLE group -- 用户分组
(
    -- 核心信息 ===============================================
    group_name TEXT PRIMARY KEY UNIQUE NOT NULL, -- 分组名称
    group_mask TEXT                    NOT NULL, -- 分组掩码
    is_enabled INTEGER                 NOT NULL  -- 是否启用
);

CREATE TABLE oauth -- 授权认证
(
    -- 核心信息 ===============================================
    oauth_name TEXT PRIMARY KEY UNIQUE NOT NULL, -- 授权名称
    oauth_type TEXT                    NOT NULL, -- 授权类型
    oauth_data TEXT                    NOT NULL, -- 授权数据
    is_enabled INTEGER                 NOT NULL, -- 是否启用
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
    write_name TEXT,                             -- 后缀名称
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
