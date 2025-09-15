import {Context} from "hono";

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

export class BasicDriver {
    public config: any | Record<string, any> | CONFIG_INFO
    public saving: any | Record<string, any> | undefined
    public change: boolean = false
    public router: string
    public c: Context

    constructor(c: Context, router: string) {
        this.c = c
        this.router = router
    }
}

