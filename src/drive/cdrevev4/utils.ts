/** =========== Cloudreve V4 工具类 ================
 * @author "OpenList Team"
 * @version 25.01.01
 * =======================================================*/

import {Context} from "hono";
import {DriveResult} from "../DriveObject";
import {BasicClouds} from "../BasicClouds";
import * as con from "./const";
import {CONFIG_INFO, SAVING_INFO} from "./metas";

export class HostClouds extends BasicClouds {
    declare public config: CONFIG_INFO;
    declare public saving: SAVING_INFO;

    constructor(c: Context, router: string, config: Record<string, any> | any, saving: Record<string, any> | any) {
        super(c, router, config, saving);
        this.config.address = (this.config.address || "").replace(/\/$/, "");
    }

    async initConfig(): Promise<DriveResult> {
        try {
            if (this.config.username && this.config.password) await this.login();
            else if (this.config.refresh_token) await this.refreshToken();
            else if (this.config.access_token) this.saving.access_token = this.config.access_token;
            this.change = true;
            return {flag: true, text: "初始化成功"};
        } catch (e: any) { return {flag: false, text: e.message}; }
    }

    async loadConfig(): Promise<DriveResult> { await this.getSaves(); return {flag: true, text: ""}; }
    async loadSaving(): Promise<DriveResult> { if (!this.saving?.access_token) await this.initConfig(); return {flag: true, text: ""}; }

    async login(): Promise<void> {
        const resp = await fetch(`${this.config.address}/api/v4${con.API_ENDPOINTS.SESSION}`, {
            method: "POST", headers: {"Content-Type": "application/json"},
            body: JSON.stringify({username: this.config.username, password: this.config.password}),
        });
        const data: any = await resp.json();
        if (data.token) { this.saving.access_token = data.token; if (data.refresh_token) this.saving.refresh_token = data.refresh_token; this.change = true; await this.putSaves(); }
        else throw new Error("登录失败");
    }

    async refreshToken(): Promise<void> {
        const resp = await fetch(`${this.config.address}/api/v4${con.API_ENDPOINTS.REFRESH}`, {
            method: "POST", headers: {"Content-Type": "application/json", "Authorization": `Bearer ${this.saving.refresh_token || this.config.refresh_token}`},
        });
        const data: any = await resp.json();
        if (data.token) { this.saving.access_token = data.token; this.change = true; await this.putSaves(); }
    }

    async request(method: string, endpoint: string, body?: any, retry = false): Promise<any> {
        const headers: Record<string, string> = {"Authorization": `Bearer ${this.saving.access_token || ""}`, "Content-Type": "application/json"};
        if (this.config.custom_ua) headers["User-Agent"] = this.config.custom_ua;
        const options: RequestInit = {method, headers};
        if (body) options.body = JSON.stringify(body);
        const url = `${this.config.address}/api/v4${endpoint}`;
        const resp = await fetch(url, options);
        if (resp.status === 401 && !retry) {
            if (this.saving.refresh_token || this.config.refresh_token) await this.refreshToken();
            else if (this.config.username) await this.login();
            return this.request(method, endpoint, body, true);
        }
        if (method === "DELETE" && resp.ok) return {};
        const data: any = await resp.json();
        return data;
    }
}
