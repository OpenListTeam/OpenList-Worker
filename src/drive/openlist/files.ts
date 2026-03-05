/** =========== OpenList 文件操作驱动器 ================
 * @author "OpenList Team" @version 25.01.01
 * =======================================================*/
import {Context} from "hono";
import {HostClouds} from "./utils";
import {BasicDriver} from "../BasicDriver";
import {DriveResult} from "../DriveObject";
import * as fso from "../../files/FilesObject";
import * as con from "./const";
import {CONFIG_INFO, SAVING_INFO, OLFile} from "./metas";

export class HostDriver extends BasicDriver {
    declare public clouds: HostClouds; declare public config: CONFIG_INFO; declare public saving: SAVING_INFO;

    constructor(c: Context, router: string, config: Record<string, any>, saving: Record<string, any>) { super(c, router, config, saving); this.clouds = new HostClouds(c, router, config, saving); }
    async initSelf(): Promise<DriveResult> { const r = await this.clouds.initConfig(); this.saving = this.clouds.saving; this.change = true; return r; }
    async loadSelf(): Promise<DriveResult> { await this.clouds.loadSaving(); this.change = this.clouds.change; this.saving = this.clouds.saving; return {flag: true, text: "OK"}; }

    async listFile(file?: fso.FileFind): Promise<fso.PathInfo> {
        try {
            const dirPath = (this.config.root_path || "/") + (file?.path || "");
            const resp = await this.clouds.request(con.API_ENDPOINTS.FS_LIST, "POST", {path: dirPath, page: 1, per_page: 0, refresh: false});
            const files: OLFile[] = resp.data?.content || [];
            return {pageSize: files.length, filePath: file?.path, fileList: files.map(f => ({filePath: "", fileName: f.name, fileSize: f.size || 0, fileType: f.is_dir ? 0 : 1, thumbnails: f.thumb || "", timeModify: new Date(f.modified), fileHash: f.hash_info?.md5 ? {md5: f.hash_info.md5} : undefined}))};
        } catch (e: any) { return {pageSize: 0, filePath: file?.path, fileList: []}; }
    }

    async downFile(file?: fso.FileFind): Promise<fso.FileLink[]> {
        try {
            const filePath = (this.config.root_path || "/") + (file?.path || "");
            const resp = await this.clouds.request(con.API_ENDPOINTS.FS_GET, "POST", {path: filePath});
            if (resp.data?.raw_url) return [{status: true, direct: resp.data.raw_url}];
            return [{status: false, result: "获取下载链接失败"}];
        } catch (e: any) { return [{status: false, result: e.message}]; }
    }

    async copyFile(file?: fso.FileFind, dest?: fso.FileFind): Promise<fso.FileTask> {
        try {
            const srcDir = (this.config.root_path || "") + (file?.path?.substring(0, file.path.lastIndexOf("/")) || "");
            const dstDir = (this.config.root_path || "") + (dest?.path || "");
            const name = file?.path?.split("/").pop() || "";
            await this.clouds.request(con.API_ENDPOINTS.FS_COPY, "POST", {src_dir: srcDir, dst_dir: dstDir, names: [name]});
            return {taskType: fso.FSAction.COPYTO, taskFlag: fso.FSStatus.SUCCESSFUL_ALL};
        } catch (e: any) { return {taskType: fso.FSAction.COPYTO, taskFlag: fso.FSStatus.UNDETECTED_ERR, messages: e.message}; }
    }

    async moveFile(file?: fso.FileFind, dest?: fso.FileFind): Promise<fso.FileTask> {
        try {
            const srcDir = (this.config.root_path || "") + (file?.path?.substring(0, file.path.lastIndexOf("/")) || "");
            const dstDir = (this.config.root_path || "") + (dest?.path || "");
            const name = file?.path?.split("/").pop() || "";
            await this.clouds.request(con.API_ENDPOINTS.FS_MOVE, "POST", {src_dir: srcDir, dst_dir: dstDir, names: [name]});
            return {taskType: fso.FSAction.MOVETO, taskFlag: fso.FSStatus.SUCCESSFUL_ALL};
        } catch (e: any) { return {taskType: fso.FSAction.MOVETO, taskFlag: fso.FSStatus.UNDETECTED_ERR, messages: e.message}; }
    }

    async killFile(file?: fso.FileFind): Promise<fso.FileTask> {
        try {
            const dir = (this.config.root_path || "") + (file?.path?.substring(0, file.path.lastIndexOf("/")) || "");
            const name = file?.path?.split("/").pop() || "";
            await this.clouds.request(con.API_ENDPOINTS.FS_REMOVE, "POST", {dir, names: [name]});
            return {taskType: fso.FSAction.DELETE, taskFlag: fso.FSStatus.SUCCESSFUL_ALL};
        } catch (e: any) { return {taskType: fso.FSAction.DELETE, taskFlag: fso.FSStatus.UNDETECTED_ERR, messages: e.message}; }
    }

    async makeFile(file?: fso.FileFind, name?: string | null, type?: fso.FileType, data?: any | null): Promise<DriveResult> {
        try {
            if (type === fso.FileType.F_DIR) {
                const dirPath = (this.config.root_path || "") + (file?.path || "/") + "/" + name;
                await this.clouds.request(con.API_ENDPOINTS.FS_MKDIR, "POST", {path: dirPath});
                return {flag: true, text: "创建成功"};
            }
            return {flag: false, text: "暂不支持直接上传"};
        } catch (e: any) { return {flag: false, text: e.message}; }
    }

    async pushFile(file?: fso.FileFind, name?: string | null, type?: fso.FileType, data?: string | any | null): Promise<DriveResult> { return this.makeFile(file, name, type, data); }
}
