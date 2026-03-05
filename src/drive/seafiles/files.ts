/** =========== Seafile 文件操作驱动器 ================
 * @author "OpenList Team" @version 25.01.01
 * =======================================================*/
import {Context} from "hono";
import {HostClouds} from "./utils";
import {BasicDriver} from "../BasicDriver";
import {DriveResult} from "../DriveObject";
import * as fso from "../../files/FilesObject";
import * as con from "./const";
import {CONFIG_INFO, SAVING_INFO, SeafileEntry} from "./metas";

export class HostDriver extends BasicDriver {
    declare public clouds: HostClouds; declare public config: CONFIG_INFO; declare public saving: SAVING_INFO;
    constructor(c: Context, router: string, config: Record<string, any>, saving: Record<string, any>) { super(c, router, config, saving); this.clouds = new HostClouds(c, router, config, saving); }
    async initSelf(): Promise<DriveResult> { const r = await this.clouds.initConfig(); this.saving = this.clouds.saving; this.change = true; return r; }
    async loadSelf(): Promise<DriveResult> { await this.clouds.loadSaving(); this.change = this.clouds.change; this.saving = this.clouds.saving; return {flag: true, text: "OK"}; }

    private getPath(filePath?: string): string { return (this.config.root_path || "/") + (filePath || ""); }

    async listFile(file?: fso.FileFind): Promise<fso.PathInfo> {
        try {
            const dirPath = this.getPath(file?.path);
            const resp = await this.clouds.request(`${con.API_ENDPOINTS.DIR_LIST}?p=${encodeURIComponent(dirPath)}`);
            const entries: SeafileEntry[] = Array.isArray(resp) ? resp : [];
            return {pageSize: entries.length, filePath: file?.path, fileList: entries.map(e => ({filePath: "", fileName: e.name, fileSize: e.size || 0, fileType: e.type === "dir" ? 0 : 1, fileUUID: e.id, timeModify: new Date(e.mtime * 1000)}))};
        } catch (e: any) { return {pageSize: 0, filePath: file?.path, fileList: []}; }
    }

    async downFile(file?: fso.FileFind): Promise<fso.FileLink[]> {
        try {
            const filePath = this.getPath(file?.path);
            const url = await this.clouds.request(`${con.API_ENDPOINTS.FILE_DOWNLOAD}?p=${encodeURIComponent(filePath)}`);
            if (typeof url === "string" && url.startsWith("http")) return [{status: true, direct: url.replace(/"/g, "")}];
            return [{status: false, result: "获取下载链接失败"}];
        } catch (e: any) { return [{status: false, result: e.message}]; }
    }

    async copyFile(file?: fso.FileFind, dest?: fso.FileFind): Promise<fso.FileTask> {
        try {
            const srcPath = this.getPath(file?.path);
            const dstPath = this.getPath(dest?.path);
            await this.clouds.request(con.API_ENDPOINTS.FILE_COPY, "POST", new URLSearchParams({p: srcPath, operation: "copy", dst_repo: this.config.repo_id, dst_dir: dstPath}).toString());
            return {taskType: fso.FSAction.COPYTO, taskFlag: fso.FSStatus.SUCCESSFUL_ALL};
        } catch (e: any) { return {taskType: fso.FSAction.COPYTO, taskFlag: fso.FSStatus.UNDETECTED_ERR, messages: e.message}; }
    }

    async moveFile(file?: fso.FileFind, dest?: fso.FileFind): Promise<fso.FileTask> {
        try {
            const srcPath = this.getPath(file?.path);
            const dstPath = this.getPath(dest?.path);
            await this.clouds.request(con.API_ENDPOINTS.FILE_MOVE, "POST", new URLSearchParams({p: srcPath, operation: "move", dst_repo: this.config.repo_id, dst_dir: dstPath}).toString());
            return {taskType: fso.FSAction.MOVETO, taskFlag: fso.FSStatus.SUCCESSFUL_ALL};
        } catch (e: any) { return {taskType: fso.FSAction.MOVETO, taskFlag: fso.FSStatus.UNDETECTED_ERR, messages: e.message}; }
    }

    async killFile(file?: fso.FileFind): Promise<fso.FileTask> {
        try {
            const filePath = this.getPath(file?.path);
            await this.clouds.request(`${con.API_ENDPOINTS.FILE_DELETE}?p=${encodeURIComponent(filePath)}`, "DELETE");
            return {taskType: fso.FSAction.DELETE, taskFlag: fso.FSStatus.SUCCESSFUL_ALL};
        } catch (e: any) { return {taskType: fso.FSAction.DELETE, taskFlag: fso.FSStatus.UNDETECTED_ERR, messages: e.message}; }
    }

    async makeFile(file?: fso.FileFind, name?: string | null, type?: fso.FileType): Promise<DriveResult> {
        try {
            if (type === fso.FileType.F_DIR) {
                const dirPath = this.getPath(file?.path) + "/" + name;
                await this.clouds.request(`${con.API_ENDPOINTS.DIR_NEW}?p=${encodeURIComponent(dirPath)}`, "POST", new URLSearchParams({operation: "mkdir"}).toString());
                return {flag: true, text: "创建成功"};
            }
            return {flag: false, text: "暂不支持直接上传"};
        } catch (e: any) { return {flag: false, text: e.message}; }
    }

    async pushFile(file?: fso.FileFind, name?: string | null, type?: fso.FileType, data?: string | any | null): Promise<DriveResult> { return this.makeFile(file, name, type); }
}
