export interface TokenConfig {
    token_uuid: string;
    token_name?: string;
    token_data?: string;
    token_user: string;
    token_ends?: string;
    is_enabled?: number;
    // 兼容前端字段
    token_path?: string;
    token_type?: string;
    token_info?: string;
}

export interface TokenResult {
    flag: boolean;
    text?: string;
    code?: number;
    data?: TokenConfig[];
}