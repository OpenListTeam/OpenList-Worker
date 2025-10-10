export interface OauthConfig {
    oauth_name: string;
    oauth_type: string;
    oauth_data: string;
    is_enabled: number;
}

export interface OauthResult {
    flag: boolean;
    text?: string;
    code?: number;
    data?: OauthConfig[];
}