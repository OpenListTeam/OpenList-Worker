import {google} from 'googleapis';
import {BasicClouds} from "../BasicClouds";
import {Context} from "hono";
import {JSONClient} from "google-auth-library/build/src/auth/googleauth";
import {UserRefreshClient} from "google-auth-library/build/src/auth/refreshclient";

interface CONFIG_INFO {
    client_id: string;
    client_secret: string;
    refresh_token: string;
    use_online_api: boolean;
    url_online_api: string;
}

export class HostClouds extends BasicClouds {
    // 公共数据 ================================================
    declare public config: Record<string, any> | any
    declare public saving: JSONClient | any


    // 构造函数 ================================================
    constructor(c: Context, router: string,
                public in_configData: Record<string, any>,
                public in_serverData: Record<string, any>,) {
        super(c, router);
        this.config = in_configData;
        this.saving = in_serverData || {};
    }

    // 初始接口 ================================================
    async initConfig(): Promise<boolean> {
        const client: JSONClient | any = await this.readConfig()
        await client.refreshAccessToken()
        this.saving = client;
        this.change = true;
        return this.saving.credentials.access_token != undefined;
    }

    // 载入接口 ================================================
    async readConfig(): Promise<JSONClient> {
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
        // console.log("###loadSaving", this.saving);
        if (this.saving) {
            let saving = this.saving;
            if (typeof this.saving.client === 'string')
                saving = JSON.parse(saving);
            this.saving = await this.readConfig();
            this.saving["credentials"] = saving["credentials"];
        }
        if (!this.saving || !this.saving.credentials)
            await this.initConfig();
        if (this.saving.isTokenExpiring(this.saving.credentials.access_token))
            await this.initConfig();
        // console.log("loadSaving", this.saving.constructor.name, this.saving);
        return this.saving;
    }
}