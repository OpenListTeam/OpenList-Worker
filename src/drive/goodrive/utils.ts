import {google} from 'googleapis';
import {BaseClouds} from "../BaseDriver";
import {Context} from "hono";
import {JSONClient} from "google-auth-library/build/src/auth/googleauth";


interface SAVING_INFO {
    client: string;
    access: string;
}

export class HostClouds extends BaseClouds {
    // 公共数据 ================================================
    declare public config: Record<string, any> | any
    declare public saving: Record<string, any> | SAVING_INFO

    // 构造函数 ================================================
    constructor(c: Context, router: string,
                public in_configData: Record<string, any>,
                public in_serverData: Record<string, any>,) {
        super(c, router);
        this.config = in_configData;
        this.saving = in_serverData;
        console.log("HostClouds Init:", this.config, this.saving);
    }

    // 首次启动 ================================================
    async getStart(): Promise<boolean> {
        const client: JSONClient | any = await this.getAuthy()
        await client.refreshAccessToken()
        this.saving.access = client.credentials.access_token;
        await this.getSaves();
        return this.saving.access != undefined;
    }

    // 执行登录 ================================================
    async newLogin(): Promise<boolean> {
        console.log('newLogin');
        this.saving.client = JSON.stringify({
            type: 'authorized_user',
            // scopes: 'https://www.googleapis.com/auth/drive',
            client_id: this.config.client_app_id,
            client_secret: this.config.client_secret,
            refresh_token: this.config.refresh_token,
        });
        return true;
    }

    // 获取接口 ================================================
    async getAuthy(): Promise<JSONClient> {
        // await this.getSaves();
        await this.newLogin();
        if (!this.saving.client) await this.newLogin();
        const saves_info: any = JSON.parse(this.saving.client)
        return google.auth.fromJSON(saves_info);
    }
}