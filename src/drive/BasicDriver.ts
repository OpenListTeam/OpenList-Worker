import {Context} from "hono";
import {HostClouds} from "./goodrive/utils";

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
    public c: Context
    public router: string
    public config: any | Record<string, any> | CONFIG_INFO
    public saving: any | Record<string, any> | undefined
    public clouds: any | HostClouds
    public change: boolean = false

    constructor(
        c: Context, router: string,
        in_config: Record<string, any>,
        in_saving: Record<string, any>,
    ) {
        this.c = c;
        this.router = router;
        this.config = in_config;
        this.saving = in_saving;
        this.clouds = new HostClouds(
            this.c, this.router,
            this.config,
            this.saving
        )
    }
}

