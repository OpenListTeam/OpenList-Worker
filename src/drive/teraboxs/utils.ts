/** =========== TeraBox 工具类 ================
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
        if (!this.config.cookie) return {flag: false, text: "Cookie不能为空"};
        this.change = true;
        return {flag: true, text: "初始化成功"};
    }
    async loadConfig(): Promise<DriveResult> { await this.getSaves(); return {flag: true, text: ""}; }
    async loadSaving(): Promise<DriveResult> { return {flag: true, text: ""}; }

    async request(endpoint: string, params?: Record<string, string>, method = "GET", body?: any): Promise<any> {
        let url = `${con.API_URL}${endpoint}`;
        if (params) url += "?" + new URLSearchParams(params).toString();
        const headers: Record<string, string> = {"Cookie": this.config.cookie, "User-Agent": "Mozilla/5.0", "Accept": "application/json"};
        const options: RequestInit = {method, headers};
        if (body && method === "POST") { options.body = new URLSearchParams(body).toString(); headers["Content-Type"] = "application/x-www-form-urlencoded"; }
        const resp = await fetch(url, options);
        return await resp.json();
    }
}
