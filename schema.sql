CREATE TABLE path -- 挂载路径
(
    driver_uuid INTEGER PRIMARY KEY AUTOINCREMENT, -- 路径UUID
    driver_path TEXT UNIQUE NOT NULL,              -- 路径名称
    driver_type TEXT        NOT NULL,              -- 驱动类型
    config_data TEXT,                              -- 配置数据
    server_data TEXT                               -- 服务数据
);

CREATE TABLE user -- 用户信息
(
    -- 核心信息 ===============================================
    user_uuid INTEGER PRIMARY KEY AUTOINCREMENT, -- 用户UUID
    user_name TEXT UNIQUE NOT NULL,              -- 用户名称
    user_pass TEXT,                              -- 密码SHA2
    user_mask TEXT,                              -- 用户权限
    is_enable INTEGER,                           -- 是否启用
    -- 拓展信息 ===============================================
    size_sets INTEGER,                           -- 分片大小
    size_used INTEGER,                           -- 使用大小
    auth_data TEXT,                              -- 认证数据
    conn_data TEXT,                              -- 连接数据
);

CREATE TABLE grps -- 用户分组
(
    grps_name TEXT PRIMARY KEY UNIQUE NOT NULL, -- 分组名称
    grps_mask TEXT                    NOT NULL, -- 分组掩码
    is_enable INTEGER                 NOT NULL  -- 是否启用
);

CREATE TABLE auth -- 授权认证
(
    auth_name TEXT PRIMARY KEY UNIQUE NOT NULL, -- 授权名称
    is_enable INTEGER                 NOT NULL, -- 是否启用
    auth_type TEXT                    NOT NULL, -- 授权类型
    auth_data TEXT                    NOT NULL, -- 授权数据
);
CREATE TABLE encs -- 加密配置
(
    encs_name TEXT PRIMARY KEY UNIQUE NOT NULL, -- 加密名称
    is_enable INTEGER                 NOT NULL, -- 是否启用
    main_pass TEXT                    NOT NULL, -- 主要密码
    encs_type INTEGER                 NOT NULL, -- 加密类型
    encs_mode INTEGER                 NOT NULL, -- 加密模式
    encs_self INTEGER                 NOT NULL, -- 自动解密
    rand_pass INTEGER                 NOT NULL, -- 随机密码
    auth_data TEXT,                             -- 认证数据
    is_subfix TEXT,                             -- 启用后缀
    subs_name TEXT                              -- 后缀名称
);
CREATE TABLE mate -- 元组配置
(
    path_name TEXT PRIMARY KEY UNIQUE NOT NULL, -- 元组路径
    is_enable INTEGER                 NOT NULL, -- 是否启用
    is_hidden INTEGER                 NOT NULL, -- 是否隐藏
    is_shared INTEGER                 NOT NULL, -- 是否共享
    path_mask INTEGER                 NOT NULL, -- 权限掩码
    path_user INTEGER                 NOT NULL, -- 所有用户
    part_size INTEGER,                          -- 分片大小
    encs_name TEXT,                             -- 加密配置
    zips_data TEXT,                             -- 压缩配置
    time_save INTEGER                           -- 缓存时间
);
