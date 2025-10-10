interface UsersConfig {
    users_name: string;
    users_pass?: string;
    users_mail?: string;  // 邮箱字段，可选
    users_mask?: string;  // 用户掩码，注册时可选（自动生成）
    is_enabled?: boolean;
    total_size?: number;
    total_used?: number;
    oauth_data?: string;
    mount_data?: string;
    group_name?: string;  // 用户组名称，可选
}

interface UsersResult {
    flag: boolean;
    text?: string;
    code?: number;
    data?: UsersConfig[];
    token?: string;  // 添加token字段用于登录返回
}

export {UsersConfig, UsersResult};