// 公用导入 =====================================================
import {Context} from "hono";
import {DriveResult} from "../DriveObject";
import {BasicClouds} from "../BasicClouds";

// 专用导入 =====================================================
import {google} from 'googleapis';
import {JSONClient} from "google-auth-library/build/src/auth/googleauth";


export class HostClouds extends BasicClouds {
    // 公共数据 ================================================
    declare public config: CONFIG_INFO | any
    declare public saving: JSONClient | any

    // 构造函数 ================================================
    constructor(c: Context, router: string,
                config: Record<string, any> | any,
                saving: Record<string, any> | any) {
        super(c, router, config, saving);
    }

    // 初始接口 ================================================
    async initConfig(): Promise<DriveResult> {
        const client: JSONClient | any = await this.loadConfig()
        await client.refreshAccessToken()
        this.saving = client;
        this.change = true;
        return {
            flag: this.saving.credentials.access_token != undefined,
            text: "",
        };
    }

    // 载入接口 ================================================
    async loadConfig(): Promise<JSONClient> {
        const client: Record<string, any> = {
            type: 'authorized_user',
            client_id: this.config.client_id,
            client_secret: this.config.client_secret,
            refresh_token: this.config.refresh_token,
        };
        return google.auth.fromJSON(client);
    }

    // 载入接口 ================================================
    async loadSaving(): Promise<JSONClient> {
        if (this.saving) {
            let saving = this.saving;
            if (typeof this.saving.client === 'string')
                saving = JSON.parse(saving);
            this.saving = await this.loadConfig();
            this.saving["credentials"] = saving["credentials"];
        }
        if (!this.saving || !this.saving.credentials)
            await this.initConfig();
        if (this.saving.isTokenExpiring(this.saving.credentials.access_token))
            await this.initConfig();
        return this.saving;
    }
}