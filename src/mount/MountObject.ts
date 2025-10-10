interface MountConfig {
    mount_path: string;
    mount_type?: string;
    is_enabled?: number;
    drive_conf?: Record<string, any> | any;
    drive_save?: Record<string, any> | any;
    cache_time?: number;
    index_list?: number;
    proxy_mode?: number;
    proxy_data?: string;
    drive_logs?: string;
    drive_tips?: string;
}

interface MountResult {
    flag: boolean;
    text?: string | undefined;
    data?: MountConfig[] | any;
}