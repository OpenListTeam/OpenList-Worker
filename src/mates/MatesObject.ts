import {FileInfo} from "../files/FilesObject";

export interface MatesConfig {
    mates_name: string;
    mates_mask: number;
    mates_user: number;
    is_enabled: number;
    dir_hidden?: number;
    dir_shared?: number;
    set_zipped?: string;
    set_parted?: string;
    crypt_name?: string;
    cache_time?: number;
}

export interface MatesResult {
    flag: boolean;
    text?: string;
    code?: number;
    data?: MatesConfig[];
}
