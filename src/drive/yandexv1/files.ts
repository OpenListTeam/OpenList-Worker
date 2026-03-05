/** =========== Yandex Disk 文件操作驱动器 ================
 * @author "OpenList Team" @version 25.01.01
 * =======================================================*/
import {Context} from "hono";
import {HostClouds} from "./utils";
import {BasicDriver} from "../BasicDriver";
import {DriveResult} from "../DriveObject";
import * as fso from "../../files/FilesObject";
import * as con from "./const";
import {CONFIG_INFO, SAVING_INFO, YandexFile} from "./metas";

export class HostDriver extends BasicDriver {
    declare public clouds: HostClouds; declare public config: CONFIG_INFO; declare public saving: SAVING_INFO;
    constructor(c: Context, router: string, config: Record<string, any>, saving: Record<string, any>) { super(c, router, config, saving); this.clouds = new HostClouds(c, router, config, saving); }
    async initSelf(): Promise<DriveResult> { const r = await this.clouds.initConfig(); this.saving = this.clouds.saving; this.change = true; return r; }
    async loadSelf(): Promise<DriveResult> { await this.clouds.loadSaving(); this.change = this.clouds.change; this.saving = this.clouds.saving; return {flag: true, text: "OK"}; }

    private getPath(path?: string): string { const root = this.config.root_path || "/"; const sub = path || ""; return root.endsWith("/") ? root + sub : root + "/" + sub; }

    async listFile(file?: fso.FileFind): Promise<fso.PathInfo> {
        try {
            const dirPath = this.getPath(file?.path);
            const allFiles: YandexFile[] = [];
            let offset = 0;
            while (true) {
                const params = new URLSearchParams({path: dirPath, limit: "200", offset: String(offset), sort: this.config.order_by || "name"});
                const resp = await this.clouds.request(`${con.API_URL}${con.API_ENDPOINTS.RESOURCES}?${params}`);
                if (resp._embedded?.items) allFiles.push(...resp._embedded.items);
                const total = resp._embedded?.total || 0;
                offset += 200;
                if (offset >= total) break;
            }
            return {pageSize: allFiles.length, filePath: file?.path, fileList: allFiles.map(f => ({filePath: f.path, fileName: f.name, fileSize: f.size || 0, fileType: f.type === "dir" ? 0 : 1, thumbnails: f.preview || "", timeModify: new Date(f.modified), timeCreate: new Date(f.created), fileHash: {md5: f.md5 || ""}}))};
        } catch (e: any) { return {pageSize: 0, filePath: file?.path, fileList: []}; }
    }

    async downFile(file?: fso.FileFind): Promise<fso.FileLink[]> {
        try {
            const filePath = this.getPath(file?.path);
            const resp = await this.clouds.request(`${con.API_URL}${con.API_ENDPOINTS.DOWNLOAD}?path=${encodeURIComponent(filePath)}`);
            if (resp.href) return [{status: true, direct: resp.href}];
            return [{status: false, result: "获取下载链接失败"}];
        } catch (e: any) { return [{status: false, result: e.message}]; }
    }

    async copyFile(file?: fso.FileFind, dest?: fso.FileFind): Promise<fso.FileTask> {
        try {
            const from = this.getPath(file?.path);
            const to = this.getPath(dest?.path);
            await this.clouds.request(`${con.API_URL}${con.API_ENDPOINTS.COPY}?from=${encodeURIComponent(from)}&path=${encodeURIComponent(to)}`, "POST");
            return {taskType: fso.FSAction.COPYTO, taskFlag: fso.FSStatus.SUCCESSFUL_ALL};
        } catch (e: any) { return {taskType: fso.FSAction.COPYTO, taskFlag: fso.FSStatus.UNDETECTED_ERR, messages: e.message}; }
    }

    async moveFile(file?: fso.FileFind, dest?: fso.FileFind): Promise<fso.FileTask> {
        try {
            const from = this.getPath(file?.path);
            const to = this.getPath(dest?.path);
            await this.clouds.request(`${con.API_URL}${con.API_ENDPOINTS.MOVE}?from=${encodeURIComponent(from)}&path=${encodeURIComponent(to)}`, "POST");
            return {taskType: fso.FSAction.MOVETO, taskFlag: fso.FSStatus.SUCCESSFUL_ALL};
        } catch (e: any) { return {taskType: fso.FSAction.MOVETO, taskFlag: fso.FSStatus.UNDETECTED_ERR, messages: e.message}; }
    }

    async killFile(file?: fso.FileFind): Promise<fso.FileTask> {
        try {
            const filePath = this.getPath(file?.path);
            await this.clouds.request(`${con.API_URL}${con.API_ENDPOINTS.RESOURCES}?path=${encodeURIComponent(filePath)}&permanently=true`, "DELETE");
            return {taskType: fso.FSAction.DELETE, taskFlag: fso.FSStatus.SUCCESSFUL_ALL};
        } catch (e: any) { return {taskType: fso.FSAction.DELETE, taskFlag: fso.FSStatus.UNDETECTED_ERR, messages: e.message}; }
    }

    async makeFile(file?: fso.FileFind, name?: string | null, type?: fso.FileType): Promise<DriveResult> {
        try {
            if (type === fso.FileType.F_DIR) {
                const dirPath = this.getPath(file?.path) + "/" + name;
                await this.clouds.request(`${con.API_URL}${con.API_ENDPOINTS.RESOURCES}?path=${encodeURIComponent(dirPath)}`, "PUT");
                return {flag: true, text: "创建成功"};
            }
            return {flag: false, text: "暂不支持直接上传"};
        } catch (e: any) { return {flag: false, text: e.message}; }
    }

    async pushFile(file?: fso.FileFind, name?: string | null, type?: fso.FileType, data?: string | any | null): Promise<DriveResult> { return this.makeFile(file, name, type); }
}
