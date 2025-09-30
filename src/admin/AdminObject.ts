import {DBResult, SavesManage} from "../saves/SavesManage";

export interface AdminConfig {
    keys: string;
    data: string;
}


export interface AdminResult extends DBResult {
    data: AdminConfig;
}