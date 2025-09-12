interface UsersConfig {
    users_name: string;
    users_pass: string;
    users_mask: string;
    is_enabled: boolean;
    total_size: number;
    total_used: number;
    oauth_data: string;
    mount_data: string;
}

interface UsersResult {
    flag: boolean;
    text: string;
    data?: UsersConfig[];
}