import {DBResult} from "../saves/SavesManage";

export interface AdminConfig {
    admin_keys: string;
    admin_data: string;
    admin_type?: string;
    admin_group?: string;
    admin_flag?: number;
}

export interface AdminResult {
    flag: boolean;
    text?: string;
    data?: AdminConfig[] | any;
}