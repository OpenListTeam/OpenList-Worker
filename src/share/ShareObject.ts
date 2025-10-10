export interface ShareConfig {
    share_uuid: string;
    share_path: string;
    share_pass: string;
    share_user: string;
    share_date: number;
    share_ends: number;
    is_enabled: number;
}

export interface ShareResult {
    flag: boolean;
    text?: string;
    code?: number;
    data?: ShareConfig[];
}