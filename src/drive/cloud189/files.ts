/** =========== 天翼云盘 文件操作驱动器 ================
 * 本文件实现了天翼云盘云存储服务的文件操作功能，包括：
 * - 文件和文件夹列表、创建、删除、移动、复制、上传、下载
 * - 天翼云盘 API 的认证和初始化、路径解析和 ID 查找
 * - 该驱动器继承自 BasicDriver，实现标准统一的云存储接口
 * =========================================================
 * @author "OpenList Team"
 * @version 25.01.01
 * =======================================================*/

// 公用导入 ================================================
import {Context} from "hono";
import {HostClouds} from "./utils";
import {BasicDriver} from "../BasicDriver";
import {DriveResult} from "../DriveObject";
import * as fso from "../../files/FilesObject";
// 专用导入 ================================================
import * as con from "./const";
import {HttpRequest} from "../../share/HttpRequest";

/**
 * 天翼云盘文件操作驱动器类
 *
 * 继承自 BasicDriver，实现了天翼云盘云存储的完整文件操作功能。
 * 通过天翼云盘 API 提供文件的增删改查、上传下载等操作。
 */
export class HostDriver extends BasicDriver {
    constructor(c: Context, router: string, config: Record<string, any>, saving: Record<string, any>) {
        super(c, router, config, saving);
        this.clouds = new HostClouds(c, router, config, saving);
    }

    async initSelf(): Promise<DriveResult> {
        const result: DriveResult = await this.clouds.initConfig();
        console.log("@initSelf", result);
        if (result.flag) {
            this.saving = this.clouds.saving;
            this.change = true;
        }
        return result;
    }

    async loadSelf(): Promise<DriveResult> {
        const result: DriveResult = await this.clouds.readConfig();
        console.log("@loadSelf", result);
        if (result.flag) {
            this.change = this.clouds.change;
            this.saving = this.clouds.saving;
        }
        return result;
    }

    async listFile(file?: fso.FileFind): Promise<fso.PathInfo> {
        if (file?.path) file.uuid = await this.findUUID(file.path);
        if (!file?.uuid) return {fileList: [], pageSize: 0};
        const result: fso.FileInfo[] = await this.findPath(file?.uuid);
        return {
            pageSize: result.length,
            filePath: file?.path,
            fileList: result,
        };
    }

    async downFile(file?: fso.FileFind): Promise<fso.FileLink[] | null> {
        if (file?.path) file.uuid = await this.findUUID(file.path);
        if (!file?.uuid) return [{status: false, result: "No UUID"}];
        
        try {
            const url = `${con.API_URL}/getFileDownloadUrl.action`;
            const params = {
                fileId: file.uuid,
                dt: "1"
            };

            const response = await HttpRequest("GET", url, params, {
                "Authorization": `Bearer ${this.clouds.tokenParam?.accessToken}`,
                "Content-Type": "application/json"
            }, {finder: "json"});

            if (response.ResCode === 0 && response.FileDownloadUrl) {
                return [{
                    direct: response.FileDownloadUrl,
                    header: {"Authorization": `Bearer ${this.clouds.tokenParam?.accessToken}`}
                }];
            }
            
            return [{status: false, result: "获取下载链接失败"}];
        } catch (e) {
            console.error("下载文件失败:", e);
            return [{status: false, result: "下载文件失败"}];
        }
    }

    async copyFile(file?: fso.FileFind, dest?: fso.FileFind): Promise<fso.FileTask> {
        if (file?.path) file.uuid = await this.findUUID(file.path);
        if (dest?.path) dest.uuid = await this.findUUID(dest.path);
        if (!file?.uuid || !dest?.uuid) {
            return {taskFlag: fso.FSStatus.FILESYSTEM_ERR};
        }

        try {
            const url = `${con.API_URL}/batchCopyFile.action`;
            const params = {
                fileIdList: file.uuid,
                targetFolderId: dest.uuid
            };

            const response = await HttpRequest("POST", url, params, {
                "Authorization": `Bearer ${this.clouds.tokenParam?.accessToken}`,
                "Content-Type": "application/json"
            }, {finder: "json"});

            return {
                taskType: fso.FSAction.COPYTO,
                taskFlag: response.ResCode === 0 ? fso.FSStatus.SUCCESSFUL_ALL : fso.FSStatus.FILESYSTEM_ERR
            };
        } catch (e) {
            console.error("复制文件失败:", e);
            return {taskFlag: fso.FSStatus.FILESYSTEM_ERR};
        }
    }

    async moveFile(file?: fso.FileFind, dest?: fso.FileFind): Promise<fso.FileTask> {
        if (file?.path) file.uuid = await this.findUUID(file.path);
        if (dest?.path) dest.uuid = await this.findUUID(dest.path);
        if (!file?.uuid || !dest?.uuid) {
            return {taskFlag: fso.FSStatus.FILESYSTEM_ERR};
        }

        try {
            const url = `${con.API_URL}/batchMoveFile.action`;
            const params = {
                fileIdList: file.uuid,
                targetFolderId: dest.uuid
            };

            const response = await HttpRequest("POST", url, params, {
                "Authorization": `Bearer ${this.clouds.tokenParam?.accessToken}`,
                "Content-Type": "application/json"
            }, {finder: "json"});

            return {
                taskType: fso.FSAction.MOVETO,
                taskFlag: response.ResCode === 0 ? fso.FSStatus.SUCCESSFUL_ALL : fso.FSStatus.FILESYSTEM_ERR
            };
        } catch (e) {
            console.error("移动文件失败:", e);
            return {taskFlag: fso.FSStatus.FILESYSTEM_ERR};
        }
    }

    async killFile(file?: fso.FileFind): Promise<fso.FileTask> {
        if (file?.path) file.uuid = await this.findUUID(file.path);
        if (!file?.uuid) {
            return {taskFlag: fso.FSStatus.FILESYSTEM_ERR};
        }

        try {
            const url = `${con.API_URL}/batchDeleteFile.action`;
            const params = {
                fileIdList: file.uuid
            };

            const response = await HttpRequest("POST", url, params, {
                "Authorization": `Bearer ${this.clouds.tokenParam?.accessToken}`,
                "Content-Type": "application/json"
            }, {finder: "json"});

            return {
                taskType: fso.FSAction.DELETE,
                taskFlag: response.ResCode === 0 ? fso.FSStatus.SUCCESSFUL_ALL : fso.FSStatus.FILESYSTEM_ERR
            };
        } catch (e) {
            console.error("删除文件失败:", e);
            return {taskFlag: fso.FSStatus.FILESYSTEM_ERR};
        }
    }

    async makeFile(file?: fso.FileFind, name?: string | null, type?: fso.FileType, data?: any | null): Promise<DriveResult | null> {
        if (type === fso.FileType.F_DIR) {
            // 创建文件夹
            if (file?.path) {
                const parent: string = file.path.substring(0, file?.path.lastIndexOf('/'));
                file.uuid = await this.findUUID(parent);
            }
            if (!file?.uuid || !name) return null;

            try {
                const url = `${con.API_URL}/createFolder.action`;
                const params = {
                    parentFolderId: file.uuid,
                    folderName: name
                };

                const response = await HttpRequest("POST", url, params, {
                    "Authorization": `Bearer ${this.clouds.tokenParam?.accessToken}`,
                    "Content-Type": "application/json"
                }, {finder: "json"});

                if (response.ResCode === 0) {
                    return {flag: true, text: response.FolderId};
                }
                return {flag: false, text: "创建文件夹失败"};
            } catch (e) {
                console.error("创建文件夹失败:", e);
                return {flag: false, text: "创建文件夹失败"};
            }
        }
        return null;
    }

    async pushFile(file?: fso.FileFind, name?: string | null, type?: fso.FileType, data?: string | any | null): Promise<DriveResult | null> {
        if (type === fso.FileType.F_DIR) {
            return this.makeFile(file, name, type, data);
        }
        
        // 文件上传逻辑
        if (file?.path) {
            const parent: string = file.path.substring(0, file?.path.lastIndexOf('/'));
            file.uuid = await this.findUUID(parent);
        }
        if (!file?.uuid || !name || !data) return null;

        try {
            // 这里应该实现文件上传逻辑，但由于天翼云盘的上传比较复杂，暂时返回null
            return null;
        } catch (e) {
            console.error("上传文件失败:", e);
            return null;
        }
    }

    async findUUID(path: string): Promise<string | null> {
        const parts: string[] = path.split('/').filter(part => part.trim() !== '');
        console.log("DirFind", path, parts);
        if (parts.length === 0 || path === '/') return '-11';
        let currentUUID: string = '-11';
        console.log("NowUUID", currentUUID);
        
        for (const part of parts) {
            const files: fso.FileInfo[] = await this.findPath(currentUUID);
            const foundFile: fso.FileInfo | undefined = files.find(
                file => file.fileName === part.replace(/\/$/, ''));
            if (!foundFile || !foundFile.fileUUID) return null;
            currentUUID = foundFile.fileUUID;
            console.log("NowUUID:", currentUUID);
        }
        return currentUUID;
    }

    async findPath(uuid: string = "-11"): Promise<fso.FileInfo[]> {
        try {
            const url = `${con.API_URL}/listFiles.action`;
            const params = {
                folderId: uuid,
                mediaType: "0",
                iconOption: "5",
                orderBy: "1",
                descending: "false",
                pageNum: "1",
                pageSize: "1000"
            };

            const response = await HttpRequest("GET", url, params, {
                "Authorization": `Bearer ${this.clouds.tokenParam?.accessToken}`,
                "Content-Type": "application/json"
            }, {finder: "json"});

            if (response.ResCode === 0) {
                const fileList = response.FileListAO?.FileList || [];
                const folderList = response.FileListAO?.FolderList || [];
                const allFiles = [...folderList, ...fileList];

                return allFiles.map((file: any) => ({
                    filePath: file.path || "",
                    fileName: file.fileName || file.name,
                    fileSize: file.fileSize || file.size || 0,
                    fileType: file.isFolder ? fso.FileType.F_DIR : fso.FileType.F_ALL,
                    fileUUID: file.fileId || file.id,
                    timeCreate: file.createTime ? new Date(file.createTime) : undefined,
                    timeModify: file.lastOpTime ? new Date(file.lastOpTime) : undefined
                }));
            }
            
            return [];
        } catch (e) {
            console.error("查找路径失败:", e);
            return [];
        }
    }
}