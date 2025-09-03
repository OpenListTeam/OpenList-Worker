import {google} from 'googleapis';
import {BaseClouds} from "../manifest";
import {Context} from "hono";
import {JSONClient} from "google-auth-library/build/src/auth/googleauth";


interface SAVING_INFO {
    client: string;
}

export class HostClouds extends BaseClouds {
    // 公共数据 ================================================
    declare public config: Record<string, any> | any
    declare public saving: Record<string, any> | SAVING_INFO

    // 构造函数 ================================================
    constructor(c: Context, router: string) {
        super(c, router);
    }

    // 执行登录 ================================================
    async newLogin(): Promise<boolean> {
        this.saving.client = JSON.stringify({
            type: 'authorized_user',
            client_id: this.config.client_app_id,
            client_secret: this.config.client_secret,
            refresh_token: this.config.refresh_token,
        });
        return true;
    }

    // 获取接口 ================================================
    async getAuthy(): Promise<JSONClient> {
        await this.getSaves();
        if (!this.saving.client) await this.newLogin();
        const saves_info: any = JSON.parse(this.saving.client)
        return google.auth.fromJSON(saves_info);
    }
}