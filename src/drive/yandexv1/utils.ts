/** =========== Yandex Disk 工具类 ================
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
    constructor(c: Context, router: string, config: Record<string, any> | any, saving: Record<string, any> | any) { super(c, router, config, saving); }

    async initConfig(): Promise<DriveResult> {
        try {
            if (this.config.refresh_token && this.config.client_id) await this.refreshToken();
            else if (this.config.access_token) this.saving.access_token = this.config.access_token;
            this.change = true;
            return {flag: true, text: "初始化成功"};
        } catch (e: any) { return {flag: false, text: e.message}; }
    }
    async loadConfig(): Promise<DriveResult> { await this.getSaves(); return {flag: true, text: ""}; }
    async loadSaving(): Promise<DriveResult> { if (!this.saving?.access_token) await this.initConfig(); return {flag: true, text: ""}; }

    async refreshToken(): Promise<void> {
        const resp = await fetch("https://oauth.yandex.com/token", {
            method: "POST", headers: {"Content-Type": "application/x-www-form-urlencoded"},
            body: new URLSearchParams({grant_type: "refresh_token", refresh_token: this.config.refresh_token, client_id: this.config.client_id, client_secret: this.config.client_secret || ""}).toString(),
        });
        const data: any = await resp.json();
        if (data.access_token) { this.saving.access_token = data.access_token; if (data.refresh_token) { this.config.refresh_token = data.refresh_token; this.saving.refresh_token = data.refresh_token; } this.change = true; await this.putSaves(); }
        else throw new Error("Yandex Token刷新失败");
    }

    async request(url: string, method = "GET", body?: any, retry = false): Promise<any> {
        const headers: Record<string, string> = {"Authorization": `OAuth ${this.saving.access_token || ""}`, "Content-Type": "application/json"};
        const options: RequestInit = {method, headers};
        if (body) options.body = JSON.stringify(body);
        const resp = await fetch(url, options);
        if (resp.status === 401 && !retry && this.config.refresh_token) { await this.refreshToken(); return this.request(url, method, body, true); }
        if (method === "DELETE" && resp.ok) return {};
        return await resp.json();
    }
}
