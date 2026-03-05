/** =========== 迅雷网盘 文件操作驱动器 ================
 * @author "OpenList Team" @version 25.01.01
 * =======================================================*/
import {Context} from "hono";
import {HostClouds} from "./utils";
import {BasicDriver} from "../BasicDriver";
import {DriveResult} from "../DriveObject";
import * as fso from "../../files/FilesObject";
import * as con from "./const";
import {CONFIG_INFO, SAVING_INFO, ThunderFile} from "./metas";

export class HostDriver extends BasicDriver {
    declare public clouds: HostClouds; declare public config: CONFIG_INFO; declare public saving: SAVING_INFO;
    constructor(c: Context, router: string, config: Record<string, any>, saving: Record<string, any>) { super(c, router, config, saving); this.clouds = new HostClouds(c, router, config, saving); }
    async initSelf(): Promise<DriveResult> { const r = await this.clouds.initConfig(); this.saving = this.clouds.saving; this.change = true; return r; }
    async loadSelf(): Promise<DriveResult> { await this.clouds.loadSaving(); this.change = this.clouds.change; this.saving = this.clouds.saving; return {flag: true, text: "OK"}; }

    async listFile(file?: fso.FileFind): Promise<fso.PathInfo> {
        try {
            const parentId = file?.uuid || this.config.root_folder_id || "";
            const files = await this.getFiles(parentId);
            return {pageSize: files.length, filePath: file?.path, fileList: files.map(f => this.fileToObj(f))};
        } catch (e: any) { return {pageSize: 0, filePath: file?.path, fileList: []}; }
    }

    private async getFiles(parentId: string): Promise<ThunderFile[]> {
        const result: ThunderFile[] = [];
        let pageToken = "";
        do {
            const params = new URLSearchParams({parent_id: parentId, page_token: pageToken, with_audit: "false", filters: JSON.stringify({phase: {eq: "PHASE_TYPE_COMPLETE"}, trashed: {eq: false}})});
            const resp = await this.clouds.request(`${con.API_URL}${con.API_ENDPOINTS.FILES}?${params}`);
            if (resp.files) result.push(...resp.files);
            pageToken = resp.next_page_token || "";
        } while (pageToken);
        return result;
    }

    private fileToObj(f: ThunderFile): fso.FileInfo {
        return {filePath: "", fileName: f.name || "", fileSize: parseInt(f.size) || 0, fileType: f.kind === "drive#folder" ? 0 : 1, fileUUID: f.id, thumbnails: f.thumbnail_link || "", timeModify: new Date(f.modified_time), timeCreate: new Date(f.created_time), fileHash: {md5: f.hash || ""}};
    }

    async downFile(file?: fso.FileFind): Promise<fso.FileLink[]> {
        try {
            if (!file?.uuid) return [{status: false, result: "文件ID不能为空"}];
            const resp = await this.clouds.request(`${con.API_URL}${con.API_ENDPOINTS.FILE_DOWNLOAD}/${file.uuid}?_magic=2021&usage=FETCH&thumbnail_size=SIZE_LARGE`);
            let url = resp.web_content_link || "";
            if (resp.medias?.length > 0 && resp.medias[0].link?.url) url = resp.medias[0].link.url;
            return [{status: true, direct: url}];
        } catch (e: any) { return [{status: false, result: e.message}]; }
    }

    async copyFile(file?: fso.FileFind, dest?: fso.FileFind): Promise<fso.FileTask> {
        try {
            if (!file?.uuid || !dest?.uuid) throw new Error("文件ID不能为空");
            await this.clouds.request(`${con.API_URL}${con.API_ENDPOINTS.FILE_BATCH_COPY}`, "POST", {ids: [file.uuid], to: {parent_id: dest.uuid}});
            return {taskType: fso.FSAction.COPYTO, taskFlag: fso.FSStatus.SUCCESSFUL_ALL};
        } catch (e: any) { return {taskType: fso.FSAction.COPYTO, taskFlag: fso.FSStatus.UNDETECTED_ERR, messages: e.message}; }
    }

    async moveFile(file?: fso.FileFind, dest?: fso.FileFind): Promise<fso.FileTask> {
        try {
            if (!file?.uuid || !dest?.uuid) throw new Error("文件ID不能为空");
            await this.clouds.request(`${con.API_URL}${con.API_ENDPOINTS.FILE_BATCH_MOVE}`, "POST", {ids: [file.uuid], to: {parent_id: dest.uuid}});
            return {taskType: fso.FSAction.MOVETO, taskFlag: fso.FSStatus.SUCCESSFUL_ALL};
        } catch (e: any) { return {taskType: fso.FSAction.MOVETO, taskFlag: fso.FSStatus.UNDETECTED_ERR, messages: e.message}; }
    }

    async killFile(file?: fso.FileFind): Promise<fso.FileTask> {
        try {
            if (!file?.uuid) throw new Error("文件ID不能为空");
            await this.clouds.request(`${con.API_URL}${con.API_ENDPOINTS.FILE_BATCH}`, "POST", {ids: [file.uuid]});
            return {taskType: fso.FSAction.DELETE, taskFlag: fso.FSStatus.SUCCESSFUL_ALL};
        } catch (e: any) { return {taskType: fso.FSAction.DELETE, taskFlag: fso.FSStatus.UNDETECTED_ERR, messages: e.message}; }
    }

    async makeFile(file?: fso.FileFind, name?: string | null, type?: fso.FileType): Promise<DriveResult> {
        try {
            if (type === fso.FileType.F_DIR) { await this.clouds.request(`${con.API_URL}${con.API_ENDPOINTS.FILES}`, "POST", {kind: "drive#folder", parent_id: file?.uuid || "", name}); return {flag: true, text: "创建成功"}; }
            return {flag: false, text: "暂不支持直接上传"};
        } catch (e: any) { return {flag: false, text: e.message}; }
    }

    async pushFile(file?: fso.FileFind, name?: string | null, type?: fso.FileType, data?: string | any | null): Promise<DriveResult> { return this.makeFile(file, name, type); }
}
