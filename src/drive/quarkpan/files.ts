/** =========== 夸克网盘开放平台 文件操作驱动器 ================
 * @author "OpenList Team" @version 25.01.01
 * =======================================================*/
import {Context} from "hono";
import {HostClouds} from "./utils";
import {BasicDriver} from "../BasicDriver";
import {DriveResult} from "../DriveObject";
import * as fso from "../../files/FilesObject";
import * as con from "./const";
import {CONFIG_INFO, SAVING_INFO, QuarkFile} from "./metas";

export class HostDriver extends BasicDriver {
    declare public clouds: HostClouds; declare public config: CONFIG_INFO; declare public saving: SAVING_INFO;
    constructor(c: Context, router: string, config: Record<string, any>, saving: Record<string, any>) { super(c, router, config, saving); this.clouds = new HostClouds(c, router, config, saving); }
    async initSelf(): Promise<DriveResult> { const r = await this.clouds.initConfig(); this.saving = this.clouds.saving; this.change = true; return r; }
    async loadSelf(): Promise<DriveResult> { await this.clouds.loadSaving(); this.change = this.clouds.change; this.saving = this.clouds.saving; return {flag: true, text: "OK"}; }

    async listFile(file?: fso.FileFind): Promise<fso.PathInfo> {
        try {
            const parentId = file?.uuid || this.config.root_folder_id || "0";
            const files = await this.getFiles(parentId);
            return {pageSize: files.length, filePath: file?.path, fileList: files.map(f => this.fileToObj(f))};
        } catch (e: any) { return {pageSize: 0, filePath: file?.path, fileList: []}; }
    }

    private async getFiles(parentId: string): Promise<QuarkFile[]> {
        const result: QuarkFile[] = [];
        let page = 1;
        while (true) {
            const resp = await this.clouds.request(`${con.API_ENDPOINTS.FILE_LIST}?pdir_fid=${parentId}&page=${page}&size=100&order=${this.config.order_by || "none"}&asc=${this.config.order_direction === "asc" ? 1 : 0}`);
            if (resp.data?.list) result.push(...resp.data.list);
            if (!resp.data?.list || resp.data.list.length < 100) break;
            page++;
        }
        return result;
    }

    private fileToObj(f: QuarkFile): fso.FileInfo {
        return {filePath: "", fileName: f.file_name || "", fileSize: f.size || 0, fileType: f.dir ? 0 : 1, fileUUID: f.fid, thumbnails: f.thumbnail || "", timeModify: new Date(f.updated_at * 1000), timeCreate: new Date(f.created_at * 1000), fileHash: {md5: f.md5 || ""}};
    }

    async downFile(file?: fso.FileFind): Promise<fso.FileLink[]> {
        try {
            if (!file?.uuid) return [{status: false, result: "文件ID不能为空"}];
            const resp = await this.clouds.request(con.API_ENDPOINTS.FILE_DOWNLOAD, "POST", {fid: file.uuid});
            return [{status: true, direct: resp.data?.download_url || ""}];
        } catch (e: any) { return [{status: false, result: e.message}]; }
    }

    async copyFile(): Promise<fso.FileTask> { return {taskType: fso.FSAction.COPYTO, taskFlag: fso.FSStatus.UNDETECTED_ERR, messages: "夸克网盘不支持复制"}; }

    async moveFile(file?: fso.FileFind, dest?: fso.FileFind): Promise<fso.FileTask> {
        try {
            if (!file?.uuid || !dest?.uuid) throw new Error("文件ID不能为空");
            await this.clouds.request(con.API_ENDPOINTS.FILE_MOVE, "POST", {action_type: 1, fid_list: [file.uuid], to_pdir_fid: dest.uuid});
            return {taskType: fso.FSAction.MOVETO, taskFlag: fso.FSStatus.SUCCESSFUL_ALL};
        } catch (e: any) { return {taskType: fso.FSAction.MOVETO, taskFlag: fso.FSStatus.UNDETECTED_ERR, messages: e.message}; }
    }

    async killFile(file?: fso.FileFind): Promise<fso.FileTask> {
        try {
            if (!file?.uuid) throw new Error("文件ID不能为空");
            await this.clouds.request(con.API_ENDPOINTS.FILE_DELETE, "POST", {action_type: 1, fid_list: [file.uuid]});
            return {taskType: fso.FSAction.DELETE, taskFlag: fso.FSStatus.SUCCESSFUL_ALL};
        } catch (e: any) { return {taskType: fso.FSAction.DELETE, taskFlag: fso.FSStatus.UNDETECTED_ERR, messages: e.message}; }
    }

    async makeFile(file?: fso.FileFind, name?: string | null, type?: fso.FileType): Promise<DriveResult> {
        try {
            if (type === fso.FileType.F_DIR) { await this.clouds.request(con.API_ENDPOINTS.DIR_CREATE, "POST", {dir_path: name, pdir_fid: file?.uuid || this.config.root_folder_id || "0"}); return {flag: true, text: "创建成功"}; }
            return {flag: false, text: "暂不支持直接上传"};
        } catch (e: any) { return {flag: false, text: e.message}; }
    }

    async pushFile(file?: fso.FileFind, name?: string | null, type?: fso.FileType, data?: string | any | null): Promise<DriveResult> { return this.makeFile(file, name, type); }
}
