/** =========== TelDrive 工具类 ================
 * @author "OpenList Team" @version 25.01.01
 * =======================================================*/
import {Context} from "hono";
import {DriveResult} from "../DriveObject";
import {BasicClouds} from "../BasicClouds";
import {CONFIG_INFO, SAVING_INFO} from "./metas";

export class HostClouds extends BasicClouds {
    declare public config: CONFIG_INFO;
    declare public saving: SAVING_INFO;
    constructor(c: Context, router: string, config: Record<string, any> | any, saving: Record<string, any> | any) { super(c, router, config, saving); this.config.url = (this.config.url || "").replace(/\/$/, ""); }

    async initConfig(): Promise<DriveResult> {
        if (!this.config.url) return {flag: false, text: "TelDrive URL不能为空"};
        if (this.config.access_token) this.saving.access_token = this.config.access_token;
        this.change = true;
        return {flag: true, text: "初始化成功"};
    }
    async loadConfig(): Promise<DriveResult> { await this.getSaves(); return {flag: true, text: ""}; }
    async loadSaving(): Promise<DriveResult> { if (!this.saving?.access_token) this.saving.access_token = this.config.access_token; return {flag: true, text: ""}; }

    async request(endpoint: string, method = "GET", body?: any): Promise<any> {
        const headers: Record<string, string> = {"Authorization": `Bearer ${this.saving.access_token || ""}`, "Content-Type": "application/json"};
        const options: RequestInit = {method, headers};
        if (body) options.body = JSON.stringify(body);
        const resp = await fetch(`${this.config.url}${endpoint}`, options);
        if (method === "DELETE" && resp.ok) return {};
        return await resp.json();
    }
}
