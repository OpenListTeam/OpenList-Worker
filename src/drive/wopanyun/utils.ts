/** =========== 联通沃盘 工具类 ================
 * @author "OpenList Team" @version 25.01.01
 * =======================================================*/
import {Context} from "hono";
import {DriveResult} from "../DriveObject";
import {BasicClouds} from "../BasicClouds";
import * as con from "./const";
import {CONFIG_INFO, SAVING_INFO} from "./metas";

export class HostClouds extends BasicClouds {
    declare public config: CONFIG_INFO;
    declare public saving: SAVING_INFO;
    constructor(c: Context, router: string, config: Record<string, any> | any, saving: Record<string, any> | any) { super(c, router, config, saving); if (!this.config.root_folder_id) this.config.root_folder_id = con.DEFAULTS.ROOT_FOLDER_ID; }

    async initConfig(): Promise<DriveResult> {
        try {
            if (this.config.refresh_token) await this.refreshToken();
            else if (this.config.access_token) this.saving.access_token = this.config.access_token;
            this.change = true;
            return {flag: true, text: "初始化成功"};
        } catch (e: any) { return {flag: false, text: e.message}; }
    }
    async loadConfig(): Promise<DriveResult> { await this.getSaves(); return {flag: true, text: ""}; }
    async loadSaving(): Promise<DriveResult> { if (!this.saving?.access_token) await this.initConfig(); return {flag: true, text: ""}; }

    async refreshToken(): Promise<void> {
        this.saving.access_token = this.config.refresh_token;
        this.change = true;
        await this.putSaves();
    }

    async request(endpoint: string, method = "POST", body?: any, retry = false): Promise<any> {
        const headers: Record<string, string> = {"Authorization": `Bearer ${this.saving.access_token || ""}`, "Content-Type": "application/json"};
        const options: RequestInit = {method, headers};
        if (body) options.body = JSON.stringify(body);
        const resp = await fetch(`${con.API_URL}${endpoint}`, options);
        const data: any = await resp.json();
        if ((data.code === 401 || resp.status === 401) && !retry) { await this.refreshToken(); return this.request(endpoint, method, body, true); }
        return data;
    }
}
