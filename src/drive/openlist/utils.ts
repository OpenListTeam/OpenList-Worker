/** =========== OpenList 工具类 ================
 * @author "OpenList Team" @version 25.01.01
 * =======================================================*/
import {Context} from "hono";
import {DriveResult} from "../DriveObject";
import {BasicClouds} from "../BasicClouds";
import {CONFIG_INFO, SAVING_INFO} from "./metas";

export class HostClouds extends BasicClouds {
    declare public config: CONFIG_INFO;
    declare public saving: SAVING_INFO;

    constructor(c: Context, router: string, config: Record<string, any> | any, saving: Record<string, any> | any) {
        super(c, router, config, saving);
        this.config.url = (this.config.url || "").replace(/\/$/, "");
    }

    async initConfig(): Promise<DriveResult> {
        try {
            if (this.config.username && this.config.password) await this.login();
            else if (this.config.token) this.saving.token = this.config.token;
            this.change = true;
            return {flag: true, text: "初始化成功"};
        } catch (e: any) { return {flag: false, text: e.message}; }
    }

    async loadConfig(): Promise<DriveResult> { await this.getSaves(); return {flag: true, text: ""}; }
    async loadSaving(): Promise<DriveResult> { if (!this.saving?.token) await this.initConfig(); return {flag: true, text: ""}; }

    async login(): Promise<void> {
        const resp = await fetch(`${this.config.url}/api/auth/login`, {
            method: "POST", headers: {"Content-Type": "application/json"},
            body: JSON.stringify({username: this.config.username, password: this.config.password}),
        });
        const data: any = await resp.json();
        if (data.data?.token) { this.saving.token = data.data.token; this.change = true; await this.putSaves(); }
    }

    async request(endpoint: string, method = "POST", body?: any): Promise<any> {
        const headers: Record<string, string> = {"Content-Type": "application/json"};
        if (this.saving.token) headers["Authorization"] = this.saving.token;
        if (this.config.meta_password) headers["Meta-Password"] = this.config.meta_password;
        const options: RequestInit = {method, headers};
        if (body) options.body = JSON.stringify(body);
        const resp = await fetch(`${this.config.url}${endpoint}`, options);
        return await resp.json();
    }
}
