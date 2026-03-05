// 百度网盘 文件操作驱动器
// 实现文件列表、下载（支持大文件代理）、上传（秒传+分片）、复制、移动、删除等功能

import {Context} from "hono";
import {HostClouds} from "./utils";
import {BasicDriver} from "../BasicDriver";
import {DriveResult} from "../DriveObject";
import * as fso from "../../files/FilesObject";
import * as con from "./const";
import type * as meta from "./metas";

export class HostDriver extends BasicDriver {
    declare public clouds: HostClouds;
    declare public config: meta.BaiduNetdiskConfig;

    constructor(
        c: Context,
        router: string,
        config: Record<string, any>,
        saving: Record<string, any>
    ) {
        super(c, router, config, saving);
        this.clouds = new HostClouds(c, router, config, saving);
    }

    //====== 初始化和加载 ======

    async initSelf(): Promise<DriveResult> {
        const result: DriveResult = await this.clouds.initConfig();
        this.saving = this.clouds.saving;
        this.change = true;
        return result;
    }

    async loadSelf(): Promise<DriveResult> {
        await this.clouds.loadSaving();
        this.change = this.clouds.change;
        this.saving = this.clouds.saving;
        return {flag: true, text: "loadSelf"};
    }

    //====== 文件列表 ======

    async listFile(file?: fso.FileFind): Promise<fso.PathInfo> {
        try {
            const path = file?.path || this.config.root_path || "/";
            const files = await this.clouds.getFiles(path);
            const fileList: fso.FileInfo[] = files.map((f) => this.convertToFileInfo(f));

            return {
                pageSize: fileList.length,
                filePath: path,
                fileList: fileList,
            };
        } catch (error: any) {
            console.error("listFile error:", error);
            return {fileList: [], pageSize: 0};
        }
    }

    //====== 文件下载 ======

    /**
     * 通过路径查找文件（baiduyun独有功能）
     */
    private async findFileByPath(path: string): Promise<fso.FileFind | null> {
        try {
            const pathParts = path.split('/').filter(part => part.length > 0);
            if (pathParts.length === 0) return null;

            const fileName = pathParts[pathParts.length - 1];
            const dirPath = '/' + pathParts.slice(0, -1).join('/');

            const parentFiles = await this.clouds.getFiles(dirPath);
            const targetFile = parentFiles.find(f =>
                f.server_filename === fileName && f.isdir !== 1
            );

            if (targetFile) {
                return {
                    path: path,
                    uuid: String(targetFile.fs_id),
                    size: targetFile.size || 0
                };
            }

            return null;
        } catch (error: any) {
            console.error("findFileByPath error:", error);
            return null;
        }
    }

    /**
     * 获取文件下载链接
     * 支持官方API、破解API、视频破解API
     * 大文件自动代理下载，小文件获取重定向后的真实URL
     */
    async downFile(file?: fso.FileFind): Promise<fso.FileLink[] | null> {
        try {
            let targetFile = file;

            // 如果没有UUID但有路径，尝试通过路径查找文件
            if (!targetFile?.uuid && targetFile?.path) {
                const foundFile = await this.findFileByPath(targetFile.path);
                if (foundFile) {
                    targetFile = foundFile;
                }
            }

            if (!targetFile?.uuid) {
                return [{status: false, result: "No UUID"}];
            }

            if (this.config.download_api === con.DownloadAPIType.CRACK) {
                return await this.linkCrack(targetFile);
            } else if (this.config.download_api === con.DownloadAPIType.CRACK_VIDEO) {
                return await this.linkCrackVideo(targetFile);
            } else {
                return await this.linkOfficial(targetFile);
            }
        } catch (error: any) {
            console.error("downFile error:", error);
            return [{status: false, result: error.message}];
        }
    }

    /**
     * 官方API获取下载链接
     * 大文件(>2MB)走stream代理下载，小文件获取重定向真实URL
     */
    private async linkOfficial(file: fso.FileFind): Promise<fso.FileLink[]> {
        const params = {
            method: "filemetas",
            fsids: `[${file.uuid}]`,
            dlink: "1",
        };

        const result: meta.DownloadLinkResponse = await this.clouds.get("/xpan/multimedia", params);

        if (!result.list || result.list.length === 0) {
            return [{status: false, result: "No download link"}];
        }

        const dlink = result.list[0].dlink;
        const url = `${dlink}&access_token=${this.clouds.saving.access_token}`;

        const fileSize = file.size || 0;
        const SIZE_THRESHOLD = 2 * con.MB;

        if (fileSize > SIZE_THRESHOLD) {
            // 大文件：获取重定向URL后代理下载
            let finalUrl = url;
            try {
                const response = await fetch(url, {
                    method: "HEAD",
                    redirect: "manual",
                    headers: {"User-Agent": con.DEFAULT_UA},
                });
                const location = response.headers.get("location");
                finalUrl = location || url;
            } catch (error: any) {
                console.warn("Failed to get redirect URL:", error.message);
            }

            return [{
                status: true,
                stream: async (response: Context) => {
                    const downloadResponse = await fetch(finalUrl, {
                        method: "GET",
                        headers: {
                            "User-Agent": con.DEFAULT_UA,
                            "Referer": "https://pan.baidu.com/"
                        }
                    });

                    if (!downloadResponse.ok) {
                        throw new Error(`Download failed: ${downloadResponse.status} ${downloadResponse.statusText}`);
                    }

                    response.status = downloadResponse.status;
                    const contentType = downloadResponse.headers.get("Content-Type");
                    const contentLength = downloadResponse.headers.get("Content-Length");
                    const contentDisposition = downloadResponse.headers.get("Content-Disposition");

                    if (contentType) response.header("Content-Type", contentType);
                    if (contentLength) response.header("Content-Length", contentLength);
                    if (contentDisposition) {
                        response.header("Content-Disposition", contentDisposition);
                    } else {
                        const fileName = file.path?.split('/').pop() || 'download';
                        response.header("Content-Disposition", `attachment; filename="${encodeURIComponent(fileName)}"`);
                    }

                    if (downloadResponse.body) {
                        return downloadResponse.body;
                    } else {
                        throw new Error("Download response body is empty");
                    }
                }
            }];
        } else {
            // 小文件：获取重定向后的真实URL直接返回
            try {
                const response = await fetch(url, {
                    method: "HEAD",
                    redirect: "manual",
                    headers: {"User-Agent": con.DEFAULT_UA},
                });
                const location = response.headers.get("location");
                const finalUrl = location || url;

                return [{
                    status: true,
                    direct: finalUrl,
                    headers: {"User-Agent": con.DEFAULT_UA},
                }];
            } catch (error: any) {
                return [{
                    status: true,
                    direct: url,
                    headers: {"User-Agent": con.DEFAULT_UA},
                }];
            }
        }
    }

    /**
     * 破解API获取下载链接
     */
    private async linkCrack(file: fso.FileFind): Promise<fso.FileLink[]> {
        const params = {
            target: `["${file.path}"]`,
            dlink: "1",
            web: "5",
            origin: "dlna",
        };

        const result: meta.DownloadLinkCrackResponse = await this.clouds.request(
            "https://pan.baidu.com/api/filemetas",
            "GET",
            params
        );

        if (!result.info || result.info.length === 0) {
            return [{status: false, result: "No download link"}];
        }

        const downloadUrl = result.info[0].dlink;
        const ua = this.config.custom_crack_ua || con.NETDISK_UA;
        const fileSize = file.size || 0;
        const SIZE_THRESHOLD = 2 * con.MB;

        if (fileSize > SIZE_THRESHOLD) {
            return [{
                status: true,
                stream: async (response: Context) => {
                    const downloadResponse = await fetch(downloadUrl, {
                        method: "GET",
                        headers: {
                            "User-Agent": ua,
                            "Referer": "https://pan.baidu.com/"
                        }
                    });

                    if (!downloadResponse.ok) {
                        throw new Error(`Download failed: ${downloadResponse.status} ${downloadResponse.statusText}`);
                    }

                    response.status = downloadResponse.status;
                    const contentType = downloadResponse.headers.get("Content-Type");
                    const contentLength = downloadResponse.headers.get("Content-Length");
                    const contentDisposition = downloadResponse.headers.get("Content-Disposition");

                    if (contentType) response.header("Content-Type", contentType);
                    if (contentLength) response.header("Content-Length", contentLength);
                    if (contentDisposition) {
                        response.header("Content-Disposition", contentDisposition);
                    } else {
                        const fileName = file.path?.split('/').pop() || 'download';
                        response.header("Content-Disposition", `attachment; filename="${encodeURIComponent(fileName)}"`);
                    }

                    if (downloadResponse.body) {
                        return downloadResponse.body;
                    } else {
                        throw new Error("Download response body is empty");
                    }
                }
            }];
        } else {
            return [{
                status: true,
                direct: downloadUrl,
                headers: {"User-Agent": ua},
            }];
        }
    }

    /**
     * 视频破解API获取下载链接
     */
    private async linkCrackVideo(file: fso.FileFind): Promise<fso.FileLink[]> {
        const params = {
            type: "VideoURL",
            path: file.path || "",
            fs_id: file.uuid || "",
            devuid: "0%1",
            clienttype: "1",
            channel: "android_15_25010PN30C_bd-netdisk_1523a",
            nom3u8: "1",
            dlink: "1",
            media: "1",
            origin: "dlna",
        };

        const result = await this.clouds.request(
            "https://pan.baidu.com/api/mediainfo",
            "GET",
            params
        );

        const dlink = result.info?.dlink;
        if (!dlink) {
            return [{status: false, result: "No download link"}];
        }

        const ua = this.config.custom_crack_ua || con.NETDISK_UA;
        const fileSize = file.size || 0;
        const SIZE_THRESHOLD = 2 * con.MB;

        if (fileSize > SIZE_THRESHOLD) {
            return [{
                status: true,
                stream: async (response: Context) => {
                    const downloadResponse = await fetch(dlink, {
                        method: "GET",
                        headers: {
                            "User-Agent": ua,
                            "Referer": "https://pan.baidu.com/"
                        }
                    });

                    if (!downloadResponse.ok) {
                        throw new Error(`Download failed: ${downloadResponse.status} ${downloadResponse.statusText}`);
                    }

                    response.status = downloadResponse.status;
                    const contentType = downloadResponse.headers.get("Content-Type");
                    const contentLength = downloadResponse.headers.get("Content-Length");
                    const contentDisposition = downloadResponse.headers.get("Content-Disposition");

                    if (contentType) response.header("Content-Type", contentType);
                    if (contentLength) response.header("Content-Length", contentLength);
                    if (contentDisposition) {
                        response.header("Content-Disposition", contentDisposition);
                    } else {
                        const fileName = file.path?.split('/').pop() || 'download';
                        response.header("Content-Disposition", `attachment; filename="${encodeURIComponent(fileName)}"`);
                    }

                    if (downloadResponse.body) {
                        return downloadResponse.body;
                    } else {
                        throw new Error("Download response body is empty");
                    }
                }
            }];
        } else {
            return [{
                status: true,
                direct: dlink,
                headers: {"User-Agent": ua},
            }];
        }
    }

    //====== 文件复制 ======

    async copyFile(file?: fso.FileFind, dest?: fso.FileFind): Promise<fso.FileTask> {
        try {
            if (!file?.path || !dest?.path) {
                return {taskFlag: fso.FSStatus.FILESYSTEM_ERR};
            }

            // dest.path 是完整目标路径（含文件名），需要分离目录和文件名
            const destDir = dest.path.includes('/')
                ? dest.path.substring(0, dest.path.lastIndexOf('/')) || '/'
                : '/'
            const destName = dest.path.includes('/')
                ? dest.path.substring(dest.path.lastIndexOf('/') + 1)
                : dest.path

            const data = [{
                path: file.path,
                dest: destDir,
                newname: destName || file.name || this.getFileName(file.path),
            }];

            await this.clouds.manage("copy", data);

            return {
                taskType: fso.FSAction.COPYTO,
                taskFlag: fso.FSStatus.SUCCESSFUL_ALL,
            };
        } catch (error: any) {
            console.error("copyFile error:", error);
            return {taskFlag: fso.FSStatus.FILESYSTEM_ERR, messages: error.message};
        }
    }

    //====== 文件移动 ======

    async moveFile(file?: fso.FileFind, dest?: fso.FileFind): Promise<fso.FileTask> {
        try {
            if (!file?.path || !dest?.path) {
                return {taskFlag: fso.FSStatus.FILESYSTEM_ERR};
            }

            // dest.path 是完整目标路径（含文件名），需要分离目录和文件名
            const destDir = dest.path.includes('/')
                ? dest.path.substring(0, dest.path.lastIndexOf('/')) || '/'
                : '/'
            const destName = dest.path.includes('/')
                ? dest.path.substring(dest.path.lastIndexOf('/') + 1)
                : dest.path

            const data = [{
                path: file.path,
                dest: destDir,
                newname: destName || file.name || this.getFileName(file.path),
            }];

            await this.clouds.manage("move", data);

            return {
                taskType: fso.FSAction.MOVETO,
                taskFlag: fso.FSStatus.SUCCESSFUL_ALL,
            };
        } catch (error: any) {
            console.error("moveFile error:", error);
            return {taskFlag: fso.FSStatus.FILESYSTEM_ERR, messages: error.message};
        }
    }

    //====== 文件删除 ======

    async killFile(file?: fso.FileFind): Promise<fso.FileTask> {
        try {
            if (!file?.path) {
                return {taskFlag: fso.FSStatus.FILESYSTEM_ERR};
            }

            const data = [file.path];
            await this.clouds.manage("delete", data);

            return {
                taskType: fso.FSAction.DELETE,
                taskFlag: fso.FSStatus.SUCCESSFUL_ALL,
            };
        } catch (error: any) {
            console.error("killFile error:", error);
            return {taskFlag: fso.FSStatus.FILESYSTEM_ERR, messages: error.message};
        }
    }

    //====== 文件创建 ======

    async makeFile(
        file?: fso.FileFind,
        name?: string | null,
        type?: fso.FileType,
        data?: any | null
    ): Promise<DriveResult | null> {
        try {
            const parentPath = file?.path || this.config.root_path || "/";
            if (!name) {
                return {flag: false, text: "Invalid parameters"};
            }

            const fullPath = this.joinPath(parentPath, name);

            if (type === fso.FileType.F_DIR) {
                const result = await this.clouds.create(fullPath, 0, 1);
                return {flag: true, text: String(result.fs_id)};
            } else {
                return await this.uploadFile(fullPath, data);
            }
        } catch (error: any) {
            console.error("makeFile error:", error);
            return {flag: false, text: error.message};
        }
    }

    //====== 文件上传 ======

    async pushFile(
        file?: fso.FileFind,
        name?: string | null,
        type?: fso.FileType,
        data?: any | null
    ): Promise<DriveResult | null> {
        return this.makeFile(file, name, type, data);
    }

    /**
     * 上传文件
     * 支持 File, Blob, ArrayBuffer, string 数据类型
     * 实现秒传和分片上传逻辑
     */
    private async uploadFile(path: string, data: any): Promise<DriveResult> {
        try {
            let fileData: ArrayBuffer;
            let fileSize: number;

            if (data instanceof File || data instanceof Blob) {
                fileSize = data.size;
                fileData = await data.arrayBuffer();
            } else if (data instanceof ArrayBuffer) {
                fileSize = data.byteLength;
                fileData = data;
            } else if (typeof data === "string") {
                fileData = new TextEncoder().encode(data).buffer;
                fileSize = fileData.byteLength;
            } else {
                return {flag: false, text: "Unsupported data type"};
            }

            // 计算MD5
            const {contentMd5, sliceMd5, blockList} = await this.calculateMd5(fileData, fileSize);

            // 尝试秒传
            try {
                const rapidResult = await this.rapidUpload(path, fileSize, contentMd5, sliceMd5, blockList);
                if (rapidResult.flag) {
                    return rapidResult;
                }
            } catch (error) {
                console.log("Rapid upload failed, using slice upload");
            }

            // 分片上传
            return await this.sliceUpload(path, fileData, fileSize, contentMd5, sliceMd5, blockList);
        } catch (error: any) {
            console.error("uploadFile error:", error);
            return {flag: false, text: error.message};
        }
    }

    /**
     * 计算文件MD5
     * 包括完整MD5、前256KB的MD5和分片MD5列表
     */
    private async calculateMd5(
        fileData: ArrayBuffer,
        fileSize: number
    ): Promise<{contentMd5: string; sliceMd5: string; blockList: string[]}> {
        const sliceSize = this.clouds.getSliceSize(fileSize);
        const count = Math.ceil(fileSize / sliceSize);

        const crypto = await import("crypto");

        // 计算完整文件MD5
        const contentHash = crypto.createHash("md5");
        contentHash.update(Buffer.from(fileData));
        const contentMd5 = contentHash.digest("hex");

        // 计算前256KB的MD5
        const sliceMd5Size = Math.min(con.SLICE_MD5_SIZE, fileSize);
        const sliceHash = crypto.createHash("md5");
        sliceHash.update(Buffer.from(fileData.slice(0, sliceMd5Size)));
        const sliceMd5 = sliceHash.digest("hex");

        // 计算每个分片的MD5
        const blockList: string[] = [];
        for (let i = 0; i < count; i++) {
            const start = i * sliceSize;
            const end = Math.min(start + sliceSize, fileSize);
            const blockHash = crypto.createHash("md5");
            blockHash.update(Buffer.from(fileData.slice(start, end)));
            blockList.push(blockHash.digest("hex"));
        }

        return {contentMd5, sliceMd5, blockList};
    }

    /**
     * 秒传
     */
    private async rapidUpload(
        path: string,
        size: number,
        contentMd5: string,
        sliceMd5: string,
        blockList: string[]
    ): Promise<DriveResult> {
        const params = {method: "precreate"};

        const form = {
            path: path,
            size: String(size),
            isdir: "0",
            autoinit: "1",
            rtype: "3",
            block_list: JSON.stringify(blockList),
            "content-md5": contentMd5,
            "slice-md5": sliceMd5,
        };

        const result = await this.clouds.postForm("/xpan/file", params, form);

        if (result.return_type === 2) {
            return {flag: true, text: String(result.info?.fs_id)};
        }

        throw new Error("Need to upload");
    }

    /**
     * 分片上传
     */
    private async sliceUpload(
        path: string,
        fileData: ArrayBuffer,
        fileSize: number,
        contentMd5: string,
        sliceMd5: string,
        blockList: string[]
    ): Promise<DriveResult> {
        const params = {method: "precreate"};

        const form = {
            path: path,
            size: String(fileSize),
            isdir: "0",
            autoinit: "1",
            rtype: "3",
            block_list: JSON.stringify(blockList),
            "content-md5": contentMd5,
            "slice-md5": sliceMd5,
        };

        const precreateResult = await this.clouds.postForm("/xpan/file", params, form);

        if (precreateResult.return_type === 2) {
            return {flag: true, text: String(precreateResult.info?.fs_id)};
        }

        const uploadid = precreateResult.uploadid;
        const blockListToUpload = precreateResult.block_list || [];

        // 上传分片
        const sliceSize = this.clouds.getSliceSize(fileSize);
        const uploadApi = this.config.upload_api || con.BAIDU_PCS_BASE;

        for (const partseq of blockListToUpload) {
            const start = partseq * sliceSize;
            const end = Math.min(start + sliceSize, fileSize);
            const chunk = fileData.slice(start, end);

            const uploadUrl = new URL(`${uploadApi}/rest/2.0/pcs/superfile2`);
            uploadUrl.searchParams.set("method", "upload");
            uploadUrl.searchParams.set("access_token", this.clouds.saving.access_token || "");
            uploadUrl.searchParams.set("type", "tmpfile");
            uploadUrl.searchParams.set("path", path);
            uploadUrl.searchParams.set("uploadid", uploadid);
            uploadUrl.searchParams.set("partseq", String(partseq));

            const formData = new FormData();
            formData.append("file", new Blob([chunk]), "file");

            const response = await fetch(uploadUrl.toString(), {
                method: "POST",
                body: formData,
            });

            const result = await response.json();
            if (result.error_code !== 0 && result.errno !== 0) {
                throw new Error(`Upload slice failed: ${JSON.stringify(result)}`);
            }
        }

        // 创建文件
        const createResult = await this.clouds.create(
            path, fileSize, 0, uploadid, JSON.stringify(blockList)
        );

        return {flag: true, text: String(createResult.fs_id)};
    }

    //====== 辅助方法 ======

    /**
     * 转换文件信息
     * 将百度网盘文件信息转换为标准文件信息格式
     * 保留fileHash（MD5解密）
     */
    private convertToFileInfo(file: meta.BaiduFile): fso.FileInfo {
        const isFolder = file.isdir === 1;
        const thumbnail = file.thumbs?.url3 || "";

        return {
            filePath: file.path,
            fileUUID: String(file.fs_id),
            fileName: file.server_filename,
            fileSize: file.size,
            fileType: isFolder ? fso.FileType.F_DIR : fso.FileType.F_ALL,
            fileHash: file.md5 ? {
                md5: HostClouds.decryptMd5(file.md5)
            } : undefined,
            thumbnails: thumbnail,
            timeModify: new Date(file.server_mtime * 1000),
            timeCreate: new Date(file.server_ctime * 1000),
        };
    }

    private getFileName(path: string): string {
        const parts = path.split("/");
        return parts[parts.length - 1] || "";
    }

    private joinPath(parent: string, name: string): string {
        if (parent.endsWith("/")) {
            return parent + name;
        }
        return parent + "/" + name;
    }
}