CREATE TABLE mount
(
    mount_path TEXT PRIMARY KEY UNIQUE NOT NULL,
    mount_type TEXT                    NOT NULL,
    is_enabled INTEGER                 NOT NULL,
    drive_conf TEXT,
    drive_save TEXT,
    cache_time INTEGER DEFAULT 0,
    index_list INTEGER DEFAULT 0,
    proxy_mode INTEGER DEFAULT 0,
    proxy_data TEXT,
    drive_logs TEXT,
    drive_tips TEXT
)

CREATE TABLE users
(
    users_name TEXT PRIMARY KEY UNIQUE NOT NULL,
    users_mail TEXT                    NOT NULL,
    users_pass TEXT                    NOT NULL,
    users_mask TEXT                    NOT NULL,
    is_enabled INTEGER                 NOT NULL,
    total_size INTEGER,
    total_used INTEGER,
    oauth_data TEXT,
    mount_data TEXT

)

CREATE TABLE oauth
(
    oauth_name TEXT PRIMARY KEY UNIQUE NOT NULL,
    oauth_type TEXT                    NOT NULL,
    oauth_data TEXT                    NOT NULL,
    is_enabled INTEGER                 NOT NULL
)

CREATE TABLE binds
(
    oauth_name TEXT    NOT NULL,
    binds_user TEXT    NOT NULL,
    binds_data TEXT    NOT NULL,
    is_enabled INTEGER NOT NULL
)

CREATE TABLE crypt
(
    crypt_name TEXT PRIMARY KEY UNIQUE NOT NULL,
    crypt_pass TEXT                    NOT NULL,
    crypt_type INTEGER                 NOT NULL,
    crypt_mode INTEGER                 NOT NULL,
    is_enabled INTEGER                 NOT NULL,
    crypt_self INTEGER,
    rands_pass INTEGER,
    oauth_data TEXT,
    write_name TEXT
)

CREATE TABLE mates
(
    mates_name TEXT PRIMARY KEY UNIQUE NOT NULL,
    mates_mask INTEGER                 NOT NULL,
    mates_user INTEGER                 NOT NULL,
    is_enabled INTEGER                 NOT NULL,
    dir_hidden INTEGER,
    dir_shared INTEGER,
    set_zipped TEXT,
    set_parted TEXT,
    crypt_name TEXT,
    cache_time INTEGER
)

CREATE TABLE share
(
    share_uuid TEXT PRIMARY KEY UNIQUE NOT NULL,
    share_path TEXT                    NOT NULL,
    share_pass TEXT                    NOT NULL,
    share_user TEXT                    NOT NULL,
    share_date INTEGER                 NOT NULL,
    share_ends INTEGER                 NOT NULL,
    is_enabled INTEGER                 NOT NULL
)

CREATE TABLE token
(
    token_uuid TEXT    NOT NULL,
    token_path TEXT    NOT NULL,
    token_user TEXT    NOT NULL,
    token_type TEXT    NOT NULL,
    token_info TEXT    NOT NULL,
    is_enabled INTEGER NOT NULL
)

CREATE TABLE tasks
(
    tasks_uuid TEXT    NOT NULL,
    tasks_type TEXT    NOT NULL,
    tasks_user TEXT    NOT NULL,
    tasks_info TEXT    NOT NULL,
    tasks_flag INTEGER NOT NULL
)

CREATE TABLE fetch
(
    fetch_uuid TEXT    NOT NULL,
    fetch_from TEXT    NOT NULL,
    fetch_dest TEXT    NOT NULL,
    fetch_user TEXT    NOT NULL,
    fetch_flag INTEGER NOT NULL
)

CREATE TABLE group
(
    group_name TEXT PRIMARY KEY UNIQUE NOT NULL,
    group_mask TEXT                    NOT NULL,
    is_enabled INTEGER                 NOT NULL
)

CREATE TABLE cache
(
    cache_path TEXT PRIMARY KEY UNIQUE NOT NULL,
    cache_info INTEGER,
    cache_time INTEGER
);

CREATE TABLE admin
(
    admin_keys TEXT PRIMARY KEY UNIQUE NOT NULL,
    admin_data TEXT
);

INSERT INTO users (users_name, users_mail, users_pass, users_mask, is_enabled)
VALUES ('admin', '', '', '', 1);
