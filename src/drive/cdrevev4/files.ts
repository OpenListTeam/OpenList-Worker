/** =========== Cloudreve V4 文件操作驱动器 ================
 * @author "OpenList Team"
 * @version 25.01.01
 * =======================================================*/

import {Context} from "hono";
import {HostClouds} from "./utils";
import {BasicDriver} from "../BasicDriver";
import {DriveResult} from "../DriveObject";
import * as fso from "../../files/FilesObject";
import * as con from "./const";
import {CONFIG_INFO, SAVING_INFO, CloudreveFile} from "./metas";

export class HostDriver extends BasicDriver {
    declare public clouds: HostClouds;
    declare public config: CONFIG_INFO;
    declare public saving: SAVING_INFO;

    constructor(c: Context, router: string, config: Record<string, any>, saving: Record<string, any>) {
        super(c, router, config, saving);
        this.clouds = new HostClouds(c, router, config, saving);
    }

    async initSelf(): Promise<DriveResult> { const r = await this.clouds.initConfig(); this.saving = this.clouds.saving; this.change = true; return r; }
    async loadSelf(): Promise<DriveResult> { await this.clouds.loadSaving(); this.change = this.clouds.change; this.saving = this.clouds.saving; return {flag: true, text: "OK"}; }

    async listFile(file?: fso.FileFind): Promise<fso.PathInfo> {
        try {
            const dirPath = file?.path || con.DEFAULTS.ROOT_PATH;
            const allFiles: CloudreveFile[] = [];
            let nextToken = "";
            do {
                const params: Record<string, string> = {page_size: "100", uri: dirPath, order_by: this.config.order_by || con.DEFAULTS.ORDER_BY, order_direction: this.config.order_direction || con.DEFAULTS.ORDER_DIRECTION, page: "0"};
                if (nextToken) params.next_page_token = nextToken;
                const resp = await this.clouds.request("GET", `${con.API_ENDPOINTS.FILE_LIST}?${new URLSearchParams(params)}`);
                if (resp.files) allFiles.push(...resp.files);
                nextToken = resp.pagination?.next_token || "";
            } while (nextToken);
            return {pageSize: allFiles.length, filePath: file?.path, fileList: allFiles.map(f => this.fileToObj(f))};
        } catch (e: any) { return {pageSize: 0, filePath: file?.path, fileList: []}; }
    }

    private fileToObj(f: CloudreveFile): fso.FileInfo {
        return {filePath: f.path || "", fileName: f.name || "", fileSize: f.size || 0, fileType: f.type === 1 ? 0 : 1, fileUUID: f.id, timeModify: new Date(f.updated_at), timeCreate: new Date(f.created_at)};
    }

    async downFile(file?: fso.FileFind): Promise<fso.FileLink[]> {
        try {
            const filePath = file?.path;
            if (!filePath) return [{status: false, result: "文件路径不能为空"}];
            const resp = await this.clouds.request("POST", con.API_ENDPOINTS.FILE_URL, {uris: [filePath], download: true});
            if (resp.urls?.length > 0) return [{status: true, direct: resp.urls[0].url}];
            return [{status: false, result: "获取下载链接失败"}];
        } catch (e: any) { return [{status: false, result: e.message}]; }
    }

    async copyFile(file?: fso.FileFind, dest?: fso.FileFind): Promise<fso.FileTask> {
        try {
            if (!file?.path || !dest?.path) throw new Error("路径不能为空");
            await this.clouds.request("POST", con.API_ENDPOINTS.FILE_MOVE, {uris: [file.path], dst: dest.path, copy: true});
            return {taskType: fso.FSAction.COPYTO, taskFlag: fso.FSStatus.SUCCESSFUL_ALL};
        } catch (e: any) { return {taskType: fso.FSAction.COPYTO, taskFlag: fso.FSStatus.UNDETECTED_ERR, messages: e.message}; }
    }

    async moveFile(file?: fso.FileFind, dest?: fso.FileFind): Promise<fso.FileTask> {
        try {
            if (!file?.path || !dest?.path) throw new Error("路径不能为空");
            await this.clouds.request("POST", con.API_ENDPOINTS.FILE_MOVE, {uris: [file.path], dst: dest.path, copy: false});
            return {taskType: fso.FSAction.MOVETO, taskFlag: fso.FSStatus.SUCCESSFUL_ALL};
        } catch (e: any) { return {taskType: fso.FSAction.MOVETO, taskFlag: fso.FSStatus.UNDETECTED_ERR, messages: e.message}; }
    }

    async killFile(file?: fso.FileFind): Promise<fso.FileTask> {
        try {
            if (!file?.path) throw new Error("路径不能为空");
            await this.clouds.request("DELETE", con.API_ENDPOINTS.FILE_DELETE, {uris: [file.path], unlink: false, skip_soft_delete: true});
            return {taskType: fso.FSAction.DELETE, taskFlag: fso.FSStatus.SUCCESSFUL_ALL};
        } catch (e: any) { return {taskType: fso.FSAction.DELETE, taskFlag: fso.FSStatus.UNDETECTED_ERR, messages: e.message}; }
    }

    async makeFile(file?: fso.FileFind, name?: string | null, type?: fso.FileType, data?: any | null): Promise<DriveResult> {
        try {
            const parentPath = file?.path || con.DEFAULTS.ROOT_PATH;
            if (type === fso.FileType.F_DIR) {
                await this.clouds.request("POST", con.API_ENDPOINTS.FILE_CREATE, {type: "folder", uri: `${parentPath}/${name}`, error_on_conflict: true});
                return {flag: true, text: "创建成功"};
            }
            return {flag: false, text: "暂不支持直接上传"};
        } catch (e: any) { return {flag: false, text: e.message}; }
    }

    async pushFile(file?: fso.FileFind, name?: string | null, type?: fso.FileType, data?: string | any | null): Promise<DriveResult> { return this.makeFile(file, name, type, data); }
}
