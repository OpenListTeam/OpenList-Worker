/** =========== 夸克网盘开放平台 工具类 ================
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
            if (this.config.use_online_api && this.config.refresh_token) await this.refreshTokenOnline();
            else if (this.config.access_token) this.saving.access_token = this.config.access_token;
            this.change = true;
            return {flag: true, text: "初始化成功"};
        } catch (e: any) { return {flag: false, text: e.message}; }
    }

    async loadConfig(): Promise<DriveResult> { await this.getSaves(); return {flag: true, text: ""}; }
    async loadSaving(): Promise<DriveResult> { if (!this.saving?.access_token) await this.initConfig(); return {flag: true, text: ""}; }

    async refreshTokenOnline(): Promise<void> {
        const apiUrl = this.config.api_url_address || "https://api.oplist.org/quarkyun/renewapi";
        const resp = await fetch(apiUrl, { method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify({refresh_token: this.config.refresh_token, app_id: this.config.app_id}) });
        const data: any = await resp.json();
        if (data.access_token) { this.saving.access_token = data.access_token; if (data.refresh_token) { this.config.refresh_token = data.refresh_token; this.saving.refresh_token = data.refresh_token; } this.change = true; await this.putSaves(); }
        else throw new Error("夸克Token刷新失败");
    }

    async request(endpoint: string, method = "GET", body?: any, retry = false): Promise<any> {
        const headers: Record<string, string> = {"Authorization": `Bearer ${this.saving.access_token || ""}`, "Content-Type": "application/json"};
        const options: RequestInit = {method, headers};
        if (body) options.body = JSON.stringify(body);
        const resp = await fetch(`${con.API_URL}${endpoint}`, options);
        const data: any = await resp.json();
        if (data.status === 401 && !retry) { await this.refreshTokenOnline(); return this.request(endpoint, method, body, true); }
        return data;
    }
}
