/** =========== TeraBox 文件操作驱动器 ================
 * @author "OpenList Team" @version 25.01.01
 * =======================================================*/
import {Context} from "hono";
import {HostClouds} from "./utils";
import {BasicDriver} from "../BasicDriver";
import {DriveResult} from "../DriveObject";
import * as fso from "../../files/FilesObject";
import * as con from "./const";
import {CONFIG_INFO, SAVING_INFO, TeraBoxFile} from "./metas";

export class HostDriver extends BasicDriver {
    declare public clouds: HostClouds; declare public config: CONFIG_INFO; declare public saving: SAVING_INFO;
    constructor(c: Context, router: string, config: Record<string, any>, saving: Record<string, any>) { super(c, router, config, saving); this.clouds = new HostClouds(c, router, config, saving); }
    async initSelf(): Promise<DriveResult> { const r = await this.clouds.initConfig(); this.saving = this.clouds.saving; this.change = true; return r; }
    async loadSelf(): Promise<DriveResult> { await this.clouds.loadSaving(); this.change = this.clouds.change; this.saving = this.clouds.saving; return {flag: true, text: "OK"}; }

    private getDir(path?: string): string { return (this.config.root_path || "/") + (path || ""); }

    async listFile(file?: fso.FileFind): Promise<fso.PathInfo> {
        try {
            const dir = this.getDir(file?.path);
            const result: TeraBoxFile[] = [];
            let page = 1;
            while (true) {
                const resp = await this.clouds.request(con.API_ENDPOINTS.LIST, {dir, page: String(page), num: "200", order: this.config.order_by || "name", desc: this.config.order_direction === "desc" ? "1" : "0"});
                if (resp.list) result.push(...resp.list);
                if (!resp.list || resp.list.length < 200) break;
                page++;
            }
            return {pageSize: result.length, filePath: file?.path, fileList: result.map(f => ({filePath: "", fileName: f.server_filename, fileSize: f.size || 0, fileType: f.isdir ? 0 : 1, fileUUID: String(f.fs_id), thumbnails: f.thumbs?.url3 || "", timeModify: new Date(f.server_mtime * 1000), fileHash: {md5: f.md5 || ""}}))};
        } catch (e: any) { return {pageSize: 0, filePath: file?.path, fileList: []}; }
    }

    async downFile(file?: fso.FileFind): Promise<fso.FileLink[]> {
        try {
            if (!file?.uuid) return [{status: false, result: "文件ID不能为空"}];
            const resp = await this.clouds.request(con.API_ENDPOINTS.FILEMETAS, {fsids: `[${file.uuid}]`, dlink: "1"});
            const dlink = resp.list?.[0]?.dlink;
            if (!dlink) return [{status: false, result: "获取下载链接失败"}];
            return [{status: true, direct: dlink, header: {"Cookie": this.config.cookie, "User-Agent": "Mozilla/5.0"}}];
        } catch (e: any) { return [{status: false, result: e.message}]; }
    }

    async copyFile(file?: fso.FileFind, dest?: fso.FileFind): Promise<fso.FileTask> {
        try {
            const srcPath = this.getDir(file?.path);
            const destDir = this.getDir(dest?.path);
            const name = srcPath.split("/").pop() || "";
            await this.clouds.request(con.API_ENDPOINTS.FILEMANAGER, {opera: "copy"}, "POST", {filelist: JSON.stringify([{path: srcPath, dest: destDir, newname: name}])});
            return {taskType: fso.FSAction.COPYTO, taskFlag: fso.FSStatus.SUCCESSFUL_ALL};
        } catch (e: any) { return {taskType: fso.FSAction.COPYTO, taskFlag: fso.FSStatus.UNDETECTED_ERR, messages: e.message}; }
    }

    async moveFile(file?: fso.FileFind, dest?: fso.FileFind): Promise<fso.FileTask> {
        try {
            const srcPath = this.getDir(file?.path);
            const destDir = this.getDir(dest?.path);
            const name = srcPath.split("/").pop() || "";
            await this.clouds.request(con.API_ENDPOINTS.FILEMANAGER, {opera: "move"}, "POST", {filelist: JSON.stringify([{path: srcPath, dest: destDir, newname: name}])});
            return {taskType: fso.FSAction.MOVETO, taskFlag: fso.FSStatus.SUCCESSFUL_ALL};
        } catch (e: any) { return {taskType: fso.FSAction.MOVETO, taskFlag: fso.FSStatus.UNDETECTED_ERR, messages: e.message}; }
    }

    async killFile(file?: fso.FileFind): Promise<fso.FileTask> {
        try {
            const filePath = this.getDir(file?.path);
            await this.clouds.request(con.API_ENDPOINTS.FILEMANAGER, {opera: "delete"}, "POST", {filelist: JSON.stringify([filePath])});
            return {taskType: fso.FSAction.DELETE, taskFlag: fso.FSStatus.SUCCESSFUL_ALL};
        } catch (e: any) { return {taskType: fso.FSAction.DELETE, taskFlag: fso.FSStatus.UNDETECTED_ERR, messages: e.message}; }
    }

    async makeFile(file?: fso.FileFind, name?: string | null, type?: fso.FileType): Promise<DriveResult> {
        try {
            if (type === fso.FileType.F_DIR) {
                await this.clouds.request(con.API_ENDPOINTS.CREATE, {}, "POST", {path: this.getDir(file?.path) + "/" + name, isdir: "1"});
                return {flag: true, text: "创建成功"};
            }
            return {flag: false, text: "暂不支持直接上传"};
        } catch (e: any) { return {flag: false, text: e.message}; }
    }

    async pushFile(file?: fso.FileFind, name?: string | null, type?: fso.FileType, data?: string | any | null): Promise<DriveResult> { return this.makeFile(file, name, type); }
}
