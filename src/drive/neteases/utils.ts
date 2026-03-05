/** =========== 网易云音乐 工具类 ================
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

    constructor(c: Context, router: string, config: Record<string, any> | any, saving: Record<string, any> | any) {
        super(c, router, config, saving);
    }

    getCookie(name: string): string {
        const match = (this.config.cookie || "").match(new RegExp(`${name}=([^;]+)`));
        return match ? match[1] : "";
    }

    async initConfig(): Promise<DriveResult> {
        this.saving.csrf_token = this.getCookie("__csrf");
        this.saving.music_u = this.getCookie("MUSIC_U");
        if (!this.saving.csrf_token || !this.saving.music_u) return {flag: false, text: "Cookie无效，缺少__csrf或MUSIC_U"};
        this.change = true;
        return {flag: true, text: "初始化成功"};
    }

    async loadConfig(): Promise<DriveResult> { await this.getSaves(); return {flag: true, text: ""}; }
    async loadSaving(): Promise<DriveResult> { if (!this.saving?.csrf_token) await this.initConfig(); return {flag: true, text: ""}; }

    async request(endpoint: string, method = "POST", params?: Record<string, string>): Promise<any> {
        const url = `${con.API_URL}${endpoint}?csrf_token=${this.saving.csrf_token || ""}`;
        const headers: Record<string, string> = {"Cookie": this.config.cookie, "Content-Type": "application/x-www-form-urlencoded", "Referer": con.API_URL, "User-Agent": "Mozilla/5.0"};
        const options: RequestInit = {method, headers};
        if (params && method === "POST") options.body = new URLSearchParams(params).toString();
        const resp = await fetch(url, options);
        return await resp.json();
    }
}
