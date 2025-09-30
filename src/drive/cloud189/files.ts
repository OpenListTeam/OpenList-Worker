import {Context} from "hono";
import {DriveResult} from "../DriveObject";
import {BasicDriver} from "../BasicDriver";
import {HostClouds} from "./utils";
import * as con from "./const";
import {HttpRequest} from "../../share/HttpRequest";
import {FILE_INFO, FOLDER_INFO, UPLOAD_RESULT} from "./metas";

export class HostDriver extends BasicDriver {
    private clouds: HostClouds;

    constructor(c: Context, router: string, config: Record<string, any>, saving: Record<string, any>) {
        super(c, router, config, saving);
        this.clouds = new HostClouds(c, router, config, saving);
    }

    // 兼容性方法 - 保持与原有系统的兼容性
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

    async list(path: string): Promise<DriveResult> {
        try {
            const result = await this.clouds.readConfig();
            if (!result.flag) {
                return result;
            }

            // 解析路径获取文件夹ID
            const folderId = this.parseFolderId(path);
            
            // 获取文件列表
            const files = await this.getFileList(folderId);
            if (!files) {
                return {
                    flag: false,
                    text: "获取文件列表失败"
                };
            }

            // 转换为标准格式
            const fileList = files.map((file: any) => ({
                name: file.fileName || file.name,
                size: file.fileSize || file.size || 0,
                time: file.createTime || file.lastOpTime || new Date().toISOString(),
                type: file.isFolder ? "folder" : "file",
                id: file.fileId || file.id,
                path: `${path}/${file.fileName || file.name}`,
                download_url: file.isFolder ? null : this.getDownloadUrl(file.fileId || file.id)
            }));

            return {
                flag: true,
                text: "OK",
                data: fileList
            };
        } catch (e) {
            return {
                flag: false,
                text: `获取文件列表失败: ${(e as Error).message}`
            };
        }
    }

    async link(path: string): Promise<DriveResult> {
        try {
            const result = await this.clouds.readConfig();
            if (!result.flag) {
                return result;
            }

            const fileId = this.parseFileId(path);
            const downloadUrl = await this.getDownloadUrl(fileId);
            
            if (!downloadUrl) {
                return {
                    flag: false,
                    text: "获取下载链接失败"
                };
            }

            return {
                flag: true,
                text: "OK",
                data: {
                    download_url: downloadUrl
                }
            };
        } catch (e) {
            return {
                flag: false,
                text: `下载失败: ${(e as Error).message}`
            };
        }
    }

    async copy(fromPath: string, toPath: string): Promise<DriveResult> {
        try {
            const result = await this.clouds.readConfig();
            if (!result.flag) {
                return result;
            }

            const fileId = this.parseFileId(fromPath);
            const targetFolderId = this.parseFolderId(toPath);
            
            const success = await this.copyFile(fileId, targetFolderId);
            
            return {
                flag: success,
                text: success ? "复制成功" : "复制失败"
            };
        } catch (e) {
            return {
                flag: false,
                text: `复制失败: ${(e as Error).message}`
            };
        }
    }

    async move(fromPath: string, toPath: string): Promise<DriveResult> {
        try {
            const result = await this.clouds.readConfig();
            if (!result.flag) {
                return result;
            }

            const fileId = this.parseFileId(fromPath);
            const targetFolderId = this.parseFolderId(toPath);
            
            const success = await this.moveFile(fileId, targetFolderId);
            
            return {
                flag: success,
                text: success ? "移动成功" : "移动失败"
            };
        } catch (e) {
            return {
                flag: false,
                text: `移动失败: ${(e as Error).message}`
            };
        }
    }

    async delete(path: string): Promise<DriveResult> {
        try {
            const result = await this.clouds.readConfig();
            if (!result.flag) {
                return result;
            }

            const fileId = this.parseFileId(path);
            const success = await this.deleteFile(fileId);
            
            return {
                flag: success,
                text: success ? "删除成功" : "删除失败"
            };
        } catch (e) {
            return {
                flag: false,
                text: `删除失败: ${(e as Error).message}`
            };
        }
    }

    async upload(path: string, file: File): Promise<DriveResult> {
        try {
            const result = await this.clouds.readConfig();
            if (!result.flag) {
                return result;
            }

            const folderId = this.parseFolderId(path);
            const uploadResult = await this.uploadFile(file, folderId);
            
            if (!uploadResult) {
                return {
                    flag: false,
                    text: "上传失败"
                };
            }

            return {
                flag: true,
                text: "上传成功",
                data: uploadResult
            };
        } catch (e) {
            return {
                flag: false,
                text: `上传失败: ${(e as Error).message}`
            };
        }
    }

    // 私有方法实现
    private parseFolderId(path: string): string {
        // 从路径解析文件夹ID，根路径返回 -11
        if (path === "/" || path === "") {
            return "-11";
        }
        // 这里可以根据实际需求实现路径到ID的映射
        return "-11";
    }

    private parseFileId(path: string): string {
        // 从路径解析文件ID
        // 这里需要根据实际的路径格式来解析
        const parts = path.split("/");
        return parts[parts.length - 1];
    }

    private async getFileList(folderId: string, isFamily: boolean = false): Promise<any[] | null> {
        try {
            const url = isFamily ? 
                `${con.API_URL}/family/file/listFiles.action` : 
                `${con.API_URL}/listFiles.action`;
            
            const params = {
                folderId: folderId,
                mediaType: 0,
                iconOption: 5,
                orderBy: 1,
                descending: false,
                pageNum: 1,
                pageSize: 1000
            };

            const response = await HttpRequest("GET", url, params, {
                "Authorization": `Bearer ${this.clouds.tokenParam?.accessToken}`,
                "Content-Type": "application/json"
            }, {finder: "json"});

            if (response.ResCode === 0) {
                const fileList = response.FileListAO?.FileList || [];
                const folderList = response.FileListAO?.FolderList || [];
                return [...folderList, ...fileList];
            }
            
            return null;
        } catch (e) {
            console.error("获取文件列表错误:", e);
            return null;
        }
    }

    private async getDownloadUrl(fileId: string, isFamily: boolean = false): Promise<string | null> {
        try {
            const url = isFamily ? 
                `${con.API_URL}/family/file/getFileDownloadUrl.action` : 
                `${con.API_URL}/getFileDownloadUrl.action`;
            
            const params = {
                fileId: fileId
            };

            const response = await HttpRequest("GET", url, params, {
                "Authorization": `Bearer ${this.clouds.tokenParam?.accessToken}`,
                "Content-Type": "application/json"
            }, {finder: "json"});

            if (response.ResCode === 0) {
                return response.FileDownloadUrl;
            }
            
            return null;
        } catch (e) {
            console.error("获取下载链接错误:", e);
            return null;
        }
    }

    private async copyFile(fileId: string, targetFolderId: string, isFamily: boolean = false): Promise<boolean> {
        try {
            const url = isFamily ? 
                `${con.API_URL}/family/file/copyFile.action` : 
                `${con.API_URL}/copyFile.action`;
            
            const params = {
                fileId: fileId,
                destParentFolderId: targetFolderId
            };

            const response = await HttpRequest("POST", url, params, {
                "Authorization": `Bearer ${this.clouds.tokenParam?.accessToken}`,
                "Content-Type": "application/x-www-form-urlencoded"
            }, {finder: "json"});

            return response.ResCode === 0;
        } catch (e) {
            console.error("复制文件错误:", e);
            return false;
        }
    }

    private async moveFile(fileId: string, targetFolderId: string, isFamily: boolean = false): Promise<boolean> {
        try {
            const url = isFamily ? 
                `${con.API_URL}/family/file/moveFile.action` : 
                `${con.API_URL}/moveFile.action`;
            
            const params = {
                fileId: fileId,
                destParentFolderId: targetFolderId
            };

            const response = await HttpRequest("POST", url, params, {
                "Authorization": `Bearer ${this.clouds.tokenParam?.accessToken}`,
                "Content-Type": "application/x-www-form-urlencoded"
            }, {finder: "json"});

            return response.ResCode === 0;
        } catch (e) {
            console.error("移动文件错误:", e);
            return false;
        }
    }

    private async deleteFile(fileId: string, isFamily: boolean = false): Promise<boolean> {
        try {
            const url = isFamily ? 
                `${con.API_URL}/family/file/deleteFile.action` : 
                `${con.API_URL}/deleteFile.action`;
            
            const params = {
                fileId: fileId
            };

            const response = await HttpRequest("POST", url, params, {
                "Authorization": `Bearer ${this.clouds.tokenParam?.accessToken}`,
                "Content-Type": "application/x-www-form-urlencoded"
            }, {finder: "json"});

            return response.ResCode === 0;
        } catch (e) {
            console.error("删除文件错误:", e);
            return false;
        }
    }

    private async uploadFile(file: File, folderId: string, isFamily: boolean = false): Promise<UPLOAD_RESULT | null> {
        try {
            // 1. 初始化上传
            const uploadInfo = await this.initUpload(folderId, file.name, file.size.toString(), isFamily);
            if (!uploadInfo) {
                return null;
            }

            // 2. 上传文件
            const uploadUrl = uploadInfo.UploadUrl;
            const headers = {
                "Content-Type": "application/octet-stream",
                "Content-Length": file.size.toString(),
            };

            const response = await HttpRequest("PUT", uploadUrl, file, headers, {finder: "json"});

            if (response.ResCode !== 0) {
                throw new Error(response.ResMessage || "上传失败");
            }

            return response;
        } catch (e) {
            console.error("上传文件错误:", e);
            return null;
        }
    }

    private async initUpload(folderId: string, fileName: string, fileSize: string, isFamily: boolean = false): Promise<any> {
        try {
            const url = isFamily ? 
                `${con.API_URL}/family/file/initUpload.action` : 
                `${con.API_URL}/initUpload.action`;
            
            const params = {
                parentFolderId: folderId,
                fileName: fileName,
                fileSize: fileSize,
                sliceSize: fileSize,
                lazyCheck: 1
            };

            const response = await HttpRequest("POST", url, params, {
                "Authorization": `Bearer ${this.clouds.tokenParam?.accessToken}`,
                "Content-Type": "application/x-www-form-urlencoded"
            }, {finder: "json"});

            if (response.ResCode === 0) {
                return response;
            }
            
            return null;
        } catch (e) {
            console.error("初始化上传错误:", e);
            return null;
        }
    }
}