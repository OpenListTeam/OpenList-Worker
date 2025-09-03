import {DataBase, DataSave} from "../saving/Database";
import {Context} from "hono";

import * as cloud189 from "./cloud189/files"
import * as goodrive from "./goodrive/files"

export interface SAVING_INFO {
    config: any | Record<string, any> | CONFIG_INFO;
    saving: any | Record<string, any> | undefined;
}

export interface CONFIG_INFO {
    mount_path_id: string;
    client_app_id: string;
    client_secret: string;
    refresh_token: string;
    auth_api_urls: string;
    auth_api_flag: boolean;
}

export const driver_list: Record<string, any> = {
    cloud189: cloud189.HostDriver,
    goodrive: goodrive.HostDriver,
};

export class BaseDriver {
    public config: any | Record<string, any> | CONFIG_INFO
    public saving: any | Record<string, any> | undefined
    public router: string
    public c: Context
    constructor(c: Context, router: string) {
        this.c = c
        this.router = router
    }
}

export class BaseClouds {
    public config: any | Record<string, any> | CONFIG_INFO
    public saving: any | Record<string, any> | undefined
    public router: string
    public c: Context

    // 构造函数 ================================================
    constructor(c: Context, router: string) {
        this.c = c
        this.router = router
    }


    // 存储信息 ================================================
    async getSaves(): Promise<CONFIG_INFO | any> {
        let db_api: DataBase = new DataBase(this.c)
        let saving: DataSave[] = await db_api.find(
            this.c, {
                main: "path",
                keys: [{"path": this.router}],
            }
        )
        if (saving.length > 0) {
            const select: DataSave = saving[0];
            const info: SAVING_INFO | undefined = select.data
            if (!info) return null
            this.config = info.config;
            this.saving = info.saving;
        }
        return this.config
    }

    // 存储信息 ================================================
    async putSaves(): Promise<boolean> {
        let db_api: DataBase = new DataBase(this.c)
        return await db_api.save(
            this.c, {
                main: "path",
                keys: [{"path": this.router}],
                data: {
                    config: this.config,
                    saving: this.saving
                }
            }
        )
    }
}
