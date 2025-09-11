CREATE TABLE path
(
    driver_uuid INTEGER PRIMARY KEY NOT NULL,
    driver_path TEXT UNIQUE         NOT NULL,
    driver_type TEXT                NOT NULL,
    config_data TEXT,
    server_data TEXT
);
