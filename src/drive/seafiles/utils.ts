/** =========== Seafile 工具类 ================
 * @author "OpenList Team" @version 25.01.01
 * =======================================================*/
import {Context} from "hono";
import {DriveResult} from "../DriveObject";
import {BasicClouds} from "../BasicClouds";
import {CONFIG_INFO, SAVING_INFO} from "./metas";

export class HostClouds extends BasicClouds {
    declare public config: CONFIG_INFO;
    declare public saving: SAVING_INFO;
    constructor(c: Context, router: string, config: Record<string, any> | any, saving: Record<string, any> | any) { super(c, router, config, saving); this.config.address = (this.config.address || "").replace(/\/$/, ""); }

    async initConfig(): Promise<DriveResult> {
        try {
            if (this.config.token) { this.saving.token = this.config.token; }
            else if (this.config.username && this.config.password) await this.login();
            this.change = true;
            return {flag: true, text: "初始化成功"};
        } catch (e: any) { return {flag: false, text: e.message}; }
    }

    async loadConfig(): Promise<DriveResult> { await this.getSaves(); return {flag: true, text: ""}; }
    async loadSaving(): Promise<DriveResult> { if (!this.saving?.token) await this.initConfig(); return {flag: true, text: ""}; }

    async login(): Promise<void> {
        const resp = await fetch(`${this.config.address}/api2/auth-token/`, { method: "POST", headers: {"Content-Type": "application/x-www-form-urlencoded"}, body: new URLSearchParams({username: this.config.username, password: this.config.password}).toString() });
        const data: any = await resp.json();
        if (data.token) { this.saving.token = data.token; this.change = true; await this.putSaves(); }
        else throw new Error("Seafile登录失败");
    }

    async request(endpoint: string, method = "GET", body?: any): Promise<any> {
        const url = `${this.config.address}${endpoint.replace("{repo_id}", this.config.repo_id || "")}`;
        const headers: Record<string, string> = {"Authorization": `Token ${this.saving.token || ""}`, "Accept": "application/json"};
        const options: RequestInit = {method, headers};
        if (body && method !== "GET") {
            if (typeof body === "string") { options.body = body; headers["Content-Type"] = "application/x-www-form-urlencoded"; }
            else { options.body = JSON.stringify(body); headers["Content-Type"] = "application/json"; }
        }
        const resp = await fetch(url, options);
        const text = await resp.text();
        try { return JSON.parse(text); } catch { return text; }
    }
}
