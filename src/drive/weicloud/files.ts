/** =========== 腾讯微云 文件操作驱动器 ================
 * @author "OpenList Team" @version 25.01.01
 * =======================================================*/
import {Context} from "hono";
import {HostClouds} from "./utils";
import {BasicDriver} from "../BasicDriver";
import {DriveResult} from "../DriveObject";
import * as fso from "../../files/FilesObject";
import * as con from "./const";
import {CONFIG_INFO, SAVING_INFO, WeiyunFile} from "./metas";

export class HostDriver extends BasicDriver {
    declare public clouds: HostClouds; declare public config: CONFIG_INFO; declare public saving: SAVING_INFO;
    constructor(c: Context, router: string, config: Record<string, any>, saving: Record<string, any>) { super(c, router, config, saving); this.clouds = new HostClouds(c, router, config, saving); }
    async initSelf(): Promise<DriveResult> { const r = await this.clouds.initConfig(); this.saving = this.clouds.saving; this.change = true; return r; }
    async loadSelf(): Promise<DriveResult> { await this.clouds.loadSaving(); this.change = this.clouds.change; this.saving = this.clouds.saving; return {flag: true, text: "OK"}; }

    async listFile(file?: fso.FileFind): Promise<fso.PathInfo> {
        try {
            const dirKey = file?.uuid || this.config.root_folder_key || "";
            const resp = await this.clouds.request(con.API_ENDPOINTS.DIR_LIST, {req_body: {dir_key: dirKey, start: 0, count: 200, sort_field: 1, reverse_order: this.config.order_direction === "desc"}});
            const files: WeiyunFile[] = resp.data?.file_list || [];
            const dirs: WeiyunFile[] = resp.data?.dir_list || [];
            const list: fso.FileInfo[] = [];
            dirs.forEach(d => list.push({filePath: "", fileName: d.file_name, fileSize: 0, fileType: 0, fileUUID: d.dir_key, timeModify: new Date(d.file_mtime * 1000)}));
            files.forEach(f => list.push({filePath: "", fileName: f.file_name, fileSize: f.file_size || 0, fileType: 1, fileUUID: f.file_id, timeModify: new Date(f.file_mtime * 1000), fileHash: {md5: f.md5 || ""}}));
            return {pageSize: list.length, filePath: file?.path, fileList: list};
        } catch (e: any) { return {pageSize: 0, filePath: file?.path, fileList: []}; }
    }

    async downFile(file?: fso.FileFind): Promise<fso.FileLink[]> {
        try {
            if (!file?.uuid) return [{status: false, result: "文件ID不能为空"}];
            const resp = await this.clouds.request(con.API_ENDPOINTS.FILE_DOWNLOAD, {req_body: {file_list: [{file_id: file.uuid}]}});
            const url = resp.data?.file_list?.[0]?.download_url;
            if (!url) return [{status: false, result: "获取下载链接失败"}];
            return [{status: true, direct: url}];
        } catch (e: any) { return [{status: false, result: e.message}]; }
    }

    async copyFile(file?: fso.FileFind, dest?: fso.FileFind): Promise<fso.FileTask> {
        try {
            if (!file?.uuid || !dest?.uuid) throw new Error("文件ID不能为空");
            await this.clouds.request(con.API_ENDPOINTS.FILE_COPY, {req_body: {file_list: [{file_id: file.uuid}], dest_dir_key: dest.uuid}});
            return {taskType: fso.FSAction.COPYTO, taskFlag: fso.FSStatus.SUCCESSFUL_ALL};
        } catch (e: any) { return {taskType: fso.FSAction.COPYTO, taskFlag: fso.FSStatus.UNDETECTED_ERR, messages: e.message}; }
    }

    async moveFile(file?: fso.FileFind, dest?: fso.FileFind): Promise<fso.FileTask> {
        try {
            if (!file?.uuid || !dest?.uuid) throw new Error("文件ID不能为空");
            await this.clouds.request(con.API_ENDPOINTS.FILE_MOVE, {req_body: {file_list: [{file_id: file.uuid}], dest_dir_key: dest.uuid}});
            return {taskType: fso.FSAction.MOVETO, taskFlag: fso.FSStatus.SUCCESSFUL_ALL};
        } catch (e: any) { return {taskType: fso.FSAction.MOVETO, taskFlag: fso.FSStatus.UNDETECTED_ERR, messages: e.message}; }
    }

    async killFile(file?: fso.FileFind): Promise<fso.FileTask> {
        try {
            if (!file?.uuid) throw new Error("文件ID不能为空");
            await this.clouds.request(con.API_ENDPOINTS.FILE_DELETE, {req_body: {file_list: [{file_id: file.uuid}]}});
            return {taskType: fso.FSAction.DELETE, taskFlag: fso.FSStatus.SUCCESSFUL_ALL};
        } catch (e: any) { return {taskType: fso.FSAction.DELETE, taskFlag: fso.FSStatus.UNDETECTED_ERR, messages: e.message}; }
    }

    async makeFile(file?: fso.FileFind, name?: string | null, type?: fso.FileType): Promise<DriveResult> {
        try {
            if (type === fso.FileType.F_DIR) { await this.clouds.request(con.API_ENDPOINTS.DIR_CREATE, {req_body: {ppdir_key: file?.uuid || this.config.root_folder_key || "", dir_name: name}}); return {flag: true, text: "创建成功"}; }
            return {flag: false, text: "暂不支持直接上传"};
        } catch (e: any) { return {flag: false, text: e.message}; }
    }

    async pushFile(file?: fso.FileFind, name?: string | null, type?: fso.FileType, data?: string | any | null): Promise<DriveResult> { return this.makeFile(file, name, type); }
}
