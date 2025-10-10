export interface GroupConfig {
    group_name: string;
    group_mask: string;
    is_enabled: number;
}

export interface GroupResult {
    flag: boolean;
    text?: string;
    code?: number;
    data?: GroupConfig[];
}