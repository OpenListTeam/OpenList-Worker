/** =========== 迅雷网盘 工具类 ================
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
            if (this.config.refresh_token) await this.refreshToken(this.config.refresh_token);
            else if (this.config.username && this.config.password) await this.login();
            this.change = true;
            return {flag: true, text: "初始化成功"};
        } catch (e: any) { return {flag: false, text: e.message}; }
    }

    async loadConfig(): Promise<DriveResult> { await this.getSaves(); return {flag: true, text: ""}; }
    async loadSaving(): Promise<DriveResult> { if (!this.saving?.access_token) await this.initConfig(); return {flag: true, text: ""}; }

    async login(): Promise<void> {
        const resp = await fetch(`${con.USER_API_URL}/shield/token/sign`, {
            method: "POST", headers: {"Content-Type": "application/json", "client_id": con.DEFAULTS.CLIENT_ID},
            body: JSON.stringify({client_id: con.DEFAULTS.CLIENT_ID, client_secret: con.DEFAULTS.CLIENT_SECRET, username: this.config.username, password: this.config.password}),
        });
        const data: any = await resp.json();
        if (data.access_token) { this.saving.access_token = data.access_token; this.saving.refresh_token = data.refresh_token; this.saving.token_type = data.token_type; this.change = true; await this.putSaves(); }
        else throw new Error("迅雷登录失败");
    }

    async refreshToken(token: string): Promise<void> {
        const resp = await fetch(`${con.USER_API_URL}/auth/token`, {
            method: "POST", headers: {"Content-Type": "application/json"},
            body: JSON.stringify({client_id: con.DEFAULTS.CLIENT_ID, client_secret: con.DEFAULTS.CLIENT_SECRET, grant_type: "refresh_token", refresh_token: token}),
        });
        const data: any = await resp.json();
        if (data.access_token) { this.saving.access_token = data.access_token; this.saving.refresh_token = data.refresh_token; this.saving.token_type = data.token_type; this.change = true; await this.putSaves(); }
        else throw new Error("Token刷新失败");
    }

    async request(url: string, method = "GET", body?: any, retry = false): Promise<any> {
        const headers: Record<string, string> = {"Authorization": `${this.saving.token_type || "Bearer"} ${this.saving.access_token || ""}`, "Content-Type": "application/json"};
        if (this.saving.captcha_token) headers["X-Captcha-Token"] = this.saving.captcha_token;
        if (this.saving.device_id) headers["X-Device-Id"] = this.saving.device_id;
        const options: RequestInit = {method, headers};
        if (body) options.body = JSON.stringify(body);
        const resp = await fetch(url, options);
        if (resp.status === 401 && !retry && this.saving.refresh_token) { await this.refreshToken(this.saving.refresh_token); return this.request(url, method, body, true); }
        return await resp.json();
    }
}
