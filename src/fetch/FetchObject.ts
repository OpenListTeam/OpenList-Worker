export interface FetchConfig {
    fetch_uuid: string;
    fetch_from: string;
    fetch_dest: string;
    fetch_user: string;
    fetch_flag: number;
}

export interface FetchResult {
    flag: boolean;
    text?: string;
    code?: number;
    data?: FetchConfig[];
}