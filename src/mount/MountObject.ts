interface MountConfig {
    mount_path: string;
    mount_type?: string;
    is_enabled?: number;
    drive_conf?: Record<string, any> | any;
    drive_save?: Record<string, any> | any;
    cache_time?: number;
    order_number?: number;
    proxy_mode?: string;
    proxy_url?: string;
    remarks?: string;
}

interface MountResult {
    flag: boolean;
    text: string;
    data?: MountConfig[];
}