/** =========== TelDrive 文件操作驱动器 ================
 * @author "OpenList Team" @version 25.01.01
 * =======================================================*/
import {Context} from "hono";
import {HostClouds} from "./utils";
import {BasicDriver} from "../BasicDriver";
import {DriveResult} from "../DriveObject";
import * as fso from "../../files/FilesObject";
import * as con from "./const";
import {CONFIG_INFO, SAVING_INFO, TelDriveFile} from "./metas";

export class HostDriver extends BasicDriver {
    declare public clouds: HostClouds; declare public config: CONFIG_INFO; declare public saving: SAVING_INFO;
    constructor(c: Context, router: string, config: Record<string, any>, saving: Record<string, any>) { super(c, router, config, saving); this.clouds = new HostClouds(c, router, config, saving); }
    async initSelf(): Promise<DriveResult> { const r = await this.clouds.initConfig(); this.saving = this.clouds.saving; this.change = true; return r; }
    async loadSelf(): Promise<DriveResult> { await this.clouds.loadSaving(); this.change = this.clouds.change; this.saving = this.clouds.saving; return {flag: true, text: "OK"}; }

    private getPath(path?: string): string { return (this.config.root_path || "/") + (path || ""); }

    async listFile(file?: fso.FileFind): Promise<fso.PathInfo> {
        try {
            const dirPath = this.getPath(file?.path);
            const resp = await this.clouds.request(`${con.API_ENDPOINTS.FILES_LIST}${encodeURIComponent(dirPath)}`);
            const files: TelDriveFile[] = resp.files || resp || [];
            return {pageSize: files.length, filePath: file?.path, fileList: files.map(f => ({filePath: "", fileName: f.name, fileSize: f.size || 0, fileType: f.type === "folder" ? 0 : 1, fileUUID: f.id, timeModify: new Date(f.updatedAt), timeCreate: new Date(f.createdAt)}))};
        } catch (e: any) { return {pageSize: 0, filePath: file?.path, fileList: []}; }
    }

    async downFile(file?: fso.FileFind): Promise<fso.FileLink[]> {
        try {
            if (!file?.uuid) return [{status: false, result: "文件ID不能为空"}];
            return [{status: true, direct: `${this.clouds.config.url}${con.API_ENDPOINTS.FILES}/${file.uuid}`}];
        } catch (e: any) { return [{status: false, result: e.message}]; }
    }

    async copyFile(): Promise<fso.FileTask> { return {taskType: fso.FSAction.COPYTO, taskFlag: fso.FSStatus.UNDETECTED_ERR, messages: "TelDrive不支持复制"}; }

    async moveFile(file?: fso.FileFind, dest?: fso.FileFind): Promise<fso.FileTask> {
        try {
            if (!file?.uuid || !dest?.uuid) throw new Error("文件ID不能为空");
            await this.clouds.request(con.API_ENDPOINTS.FILES_MOVE, "POST", {ids: [file.uuid], destination: dest.uuid});
            return {taskType: fso.FSAction.MOVETO, taskFlag: fso.FSStatus.SUCCESSFUL_ALL};
        } catch (e: any) { return {taskType: fso.FSAction.MOVETO, taskFlag: fso.FSStatus.UNDETECTED_ERR, messages: e.message}; }
    }

    async killFile(file?: fso.FileFind): Promise<fso.FileTask> {
        try {
            if (!file?.uuid) throw new Error("文件ID不能为空");
            await this.clouds.request(`${con.API_ENDPOINTS.FILES_DELETE}/${file.uuid}`, "DELETE");
            return {taskType: fso.FSAction.DELETE, taskFlag: fso.FSStatus.SUCCESSFUL_ALL};
        } catch (e: any) { return {taskType: fso.FSAction.DELETE, taskFlag: fso.FSStatus.UNDETECTED_ERR, messages: e.message}; }
    }

    async makeFile(file?: fso.FileFind, name?: string | null, type?: fso.FileType): Promise<DriveResult> {
        try {
            if (type === fso.FileType.F_DIR) { await this.clouds.request(con.API_ENDPOINTS.FILES_MKDIR, "POST", {path: this.getPath(file?.path) + "/" + name}); return {flag: true, text: "创建成功"}; }
            return {flag: false, text: "暂不支持直接上传"};
        } catch (e: any) { return {flag: false, text: e.message}; }
    }

    async pushFile(file?: fso.FileFind, name?: string | null, type?: fso.FileType, data?: string | any | null): Promise<DriveResult> { return this.makeFile(file, name, type); }
}
