interface MountConfig {
    mount_path: string;
    mount_type: string;
    is_enabled: boolean;
    drive_conf: Record<string, any> | any;
    drive_save: Record<string, any> | any;
}

interface MountResult {
    flag: boolean;
    text: string;
    data?: MountConfig[];
}