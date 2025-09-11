CREATE TABLE path
(
    driver_uuid INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    driver_path TEXT UNIQUE NOT NULL,
    driver_type TEXT        NOT NULL,
    config_data TEXT,
    server_data TEXT
);

CREATE TABLE user
(
    -- 核心信息 ===============================================
    user_uuid INTEGER PRIMARY KEY AUTOINCREMENT UNIQUE NOT NULL,
    user_name TEXT UNIQUE NOT NULL,
    user_pass TEXT,
    user_mask TEXT,
    is_enable INTEGER,
    -- 拓展信息 ===============================================
    size_sets INTEGER,
    size_used INTEGER,
    auth_data TEXT,
    conn_data TEXT,
);

CREATE TABLE grps
(
    grps_name TEXT PRIMARY KEY UNIQUE NOT NULL,
    grps_mask TEXT,
    is_enable INTEGER                 NOT NULL
);

CREATE TABLE auth
(
    auth_name TEXT PRIMARY KEY UNIQUE NOT NULL,
    auth_type TEXT                    NOT NULL,
    auth_data TEXT,
    is_enable INTEGER                 NOT NULL
);
CREATE TABLE encs
(
    encs_name TEXT PRIMARY KEY UNIQUE NOT NULL,
    is_enable INTEGER                 NOT NULL,
    main_pass TEXT                    NOT NULL,
    encs_type INTEGER                 NOT NULL,
    encs_mode INTEGER                 NOT NULL,
    encs_self INTEGER                 NOT NULL,
    rand_pass INTEGER                 NOT NULL,
    auth_data TEXT
);
CREATE TABLE mate
(
    path_name TEXT PRIMARY KEY UNIQUE NOT NULL,
    is_enable INTEGER                 NOT NULL,
    is_hidden INTEGER                 NOT NULL,
    is_shared INTEGER                 NOT NULL,
    path_mask INTEGER                 NOT NULL,
    path_user INTEGER                 NOT NULL,
    part_size INTEGER,
    encs_name TEXT,
    zips_data TEXT,
    time_save INTEGER
);
