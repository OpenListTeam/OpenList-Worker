/** =========== 百度网盘 文件操作驱动器 ================
 * 本文件实现了百度网盘云存储服务的文件操作功能，包括：
 * - 文件和文件夹列表、创建、删除、移动、复制、上传、下载
 * - 百度网盘 API 的认证和初始化、路径解析
 * - 该驱动器继承自 BasicDriver，实现标准统一的云存储接口
 * =========================================================
 * @author "OpenList Team"
 * @version 25.11.21
 * =======================================================*/

// 公用导入 ================================================
import {Context} from "hono";
import {HostClouds, BaiduFile} from "./utils";
import {BasicDriver} from "../BasicDriver";
import {DriveResult} from "../DriveObject";
import * as fso from "../../files/FilesObject";
import * as con from "./const";
import {CONFIG_INFO} from "./metas";

//====== 百度网盘下载响应接口 ======
interface DownloadResponse {
    errno: number;
    list: Array<{
        dlink: string;
    }>;
}

interface DownloadResponse2 {
    errno: number;
    info: Array<{
        dlink: string;
    }>;
}

/**
 * 百度网盘 文件操作驱动器类
 *
 * 继承自 BasicDriver，实现了百度网盘云存储的完整文件操作功能。
 * 通过百度网盘 API 提供文件的增删改查、上传下载等操作。
 */
export class HostDriver extends BasicDriver {
    declare public clouds: HostClouds;
    declare public config: CONFIG_INFO;

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
    /**
     * 初始化驱动
     * 执行Token刷新和配置初始化
     */
    async initSelf(): Promise<DriveResult> {
        const result: DriveResult = await this.clouds.initConfig();
        this.saving = this.clouds.saving;
        this.change = true;
        return result;
    }

    /**
     * 加载驱动
     * 加载保存的认证信息
     */
    async loadSelf(): Promise<DriveResult> {
        await this.clouds.loadSaving();
        this.change = this.clouds.change;
        this.saving = this.clouds.saving;
        return {
            flag: true,
            text: "loadSelf",
        };
    }

    //====== 文件列表 ======
    /**
     * 列出文件
     * 获取指定目录下的所有文件和文件夹
     */
    async listFile(file?: fso.FileFind): Promise<fso.PathInfo> {
        try {
            // 获取文件路径
            const path = file?.path || this.config.root_path || "/";

            // 获取文件列表
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
     * 通过路径查找文件
     */
    private async findFileByPath(path: string): Promise<fso.FileFind | null> {
        try {
            // 获取文件的父目录和文件名
            const pathParts = path.split('/').filter(part => part.length > 0);
            if (pathParts.length === 0) return null;

            const fileName = pathParts[pathParts.length - 1];
            const dirPath = '/' + pathParts.slice(0, -1).join('/');

            // 获取父目录的文件列表
            const parentFiles = await this.clouds.getFiles(dirPath);

            // 查找匹配的文件
            const targetFile = parentFiles.find(f =>
                f.server_filename === fileName && f.isdir !== 1
            );

            if (targetFile) {
                const fileInfo = this.convertToFileInfo(targetFile);
                return {
                    path: path,
                    uuid: fileInfo.fileUUID,
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
     * 支持官方API、破解API、视频破解API三种方式
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

            // 如果仍然没有UUID，返回错误
            if (!targetFile?.uuid) {
                return [{status: false, result: "No UUID"}];
            }

            // 根据配置选择下载方式
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

    //====== 文件复制 ======
    /**
     * 复制文件
     * 将文件复制到目标目录
     */
    async copyFile(file?: fso.FileFind, dest?: fso.FileFind): Promise<fso.FileTask> {
        try {
            if (!file?.path || !dest?.path) {
                return {taskFlag: fso.FSStatus.FILESYSTEM_ERR};
            }

            const data = [{
                path: file.path,
                dest: dest.path,
                newname: file.name || this.getFileName(file.path),
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
    /**
     * 移动文件
     * 将文件移动到目标目录
     */
    async moveFile(file?: fso.FileFind, dest?: fso.FileFind): Promise<fso.FileTask> {
        try {
            if (!file?.path || !dest?.path) {
                return {taskFlag: fso.FSStatus.FILESYSTEM_ERR};
            }

            const data = [{
                path: file.path,
                dest: dest.path,
                newname: file.name || this.getFileName(file.path),
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
    /**
     * 删除文件
     * 删除指定的文件或文件夹
     */
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
    /**
     * 创建文件或文件夹
     * 在指定目录下创建新的文件或文件夹
     */
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

            // 创建文件夹
            if (type === fso.FileType.F_DIR) {
                const result = await this.clouds.create(fullPath, 0, 1);
                return {flag: true, text: String(result.fs_id)};
            }
            // 创建文件
            else {
                return await this.uploadFile(fullPath, data);
            }
        } catch (error: any) {
            console.error("makeFile error:", error);
            return {flag: false, text: error.message};
        }
    }

    //====== 文件上传 ======
    /**
     * 上传文件
     * 支持秒传和分片上传
     */
    async pushFile(
        file?: fso.FileFind,
        name?: string | null,
        type?: fso.FileType,
        data?: any | null
    ): Promise<DriveResult | null> {
        return this.makeFile(file, name, type, data);
    }

    //====== 下载链接获取（私有方法）======
    /**
     * 官方API获取下载链接
     */
    private async linkOfficial(file: fso.FileFind): Promise<fso.FileLink[]> {
        const params = {
            method: "filemetas",
            fsids: `[${file.uuid}]`,
            dlink: "1",
        };

        const result: DownloadResponse = await this.clouds.get("/xpan/multimedia", params);

        if (!result.list || result.list.length === 0) {
            return [{status: false, result: "No download link"}];
        }

        const dlink = result.list[0].dlink;
        const url = `${dlink}&access_token=${this.clouds.saving.access_token}`;

        // 如果文件超过2M，则代理下载
        const fileSize = file.size || 0;
        const SIZE_THRESHOLD = 2 * 1024 * 1024; // 2MB

        if (fileSize > SIZE_THRESHOLD) {
            // 获取重定向后的真实URL
            let finalUrl = url;
            try {
                const response = await fetch(url, {
                    method: "HEAD",
                    redirect: "manual",
                    headers: {
                        "User-Agent": "pan.baidu.com",
                    },
                });
                const location = response.headers.get("location");
                finalUrl = location || url;
            } catch (error: any) {
                console.warn("[BaiduYun] 获取重定向URL失败:", error.message);
            }

            // 返回下载流，由后端代理下载
            return [
                {
                    status: true,
                    stream: async (response: Context) => {
                        try {
                            console.log("[BaiduYun] 开始代理下载:", finalUrl);

                            // 发起下载请求
                            const downloadResponse = await fetch(finalUrl, {
                                method: "GET",
                                headers: {
                                    "User-Agent": "pan.baidu.com",
                                    "Referer": "https://pan.baidu.com/"
                                }
                            });

                            if (!downloadResponse.ok) {
                                throw new Error(`下载请求失败: ${downloadResponse.status} ${downloadResponse.statusText}`);
                            }

                            // 设置响应头
                            response.status = downloadResponse.status;

                            // 复制重要的响应头
                            const contentType = downloadResponse.headers.get("Content-Type");
                            const contentLength = downloadResponse.headers.get("Content-Length");
                            const contentDisposition = downloadResponse.headers.get("Content-Disposition");

                            if (contentType) response.header("Content-Type", contentType);
                            if (contentLength) response.header("Content-Length", contentLength);
                            if (contentDisposition) {
                                response.header("Content-Disposition", contentDisposition);
                            } else {
                                // 如果没有Content-Disposition，根据文件名设置一个
                                const fileName = file.path?.split('/').pop() || 'download';
                                response.header("Content-Disposition", `attachment; filename="${encodeURIComponent(fileName)}"`);
                            }

                            // 直接返回ReadableStream，让Hono框架处理流传输
                            if (downloadResponse.body) {
                                console.log("[BaiduYun] 返回流式响应");
                                return downloadResponse.body;
                            } else {
                                throw new Error("下载响应体为空");
                            }
                        } catch (error: any) {
                            console.error("[BaiduYun] 代理下载失败:", error.message);
                            throw error;
                        }
                    }
                }
            ];
        } else {
            // 小文件直接返回下载链接
            // 获取重定向后的真实URL
            try {
                const response = await fetch(url, {
                    method: "HEAD",
                    redirect: "manual",
                    headers: {
                        "User-Agent": "pan.baidu.com",
                    },
                });

                const location = response.headers.get("location");
                const finalUrl = location || url;

                return [{
                    status: true,
                    direct: finalUrl,
                    headers: {
                        "User-Agent": "pan.baidu.com",
                    },
                }];
            } catch (error: any) {
                return [{
                    status: true,
                    direct: url,
                    headers: {
                        "User-Agent": "pan.baidu.com",
                    },
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

        const result: DownloadResponse2 = await this.clouds.request(
            "https://pan.baidu.com/api/filemetas",
            "GET",
            params
        );

        if (!result.info || result.info.length === 0) {
            return [{status: false, result: "No download link"}];
        }

        const downloadUrl = result.info[0].dlink;

        // 如果文件超过2M，则代理下载
        const fileSize = file.size || 0;
        const SIZE_THRESHOLD = 2 * 1024 * 1024; // 2MB

        if (fileSize > SIZE_THRESHOLD) {
            // 返回下载流，由后端代理下载
            return [
                {
                    status: true,
                    stream: async (response: Context) => {
                        try {
                            console.log("[BaiduYun] 开始代理下载 (Crack):", downloadUrl);

                            // 发起下载请求
                            const downloadResponse = await fetch(downloadUrl, {
                                method: "GET",
                                headers: {
                                    "User-Agent": this.config.custom_crack_ua || "netdisk",
                                    "Referer": "https://pan.baidu.com/"
                                }
                            });

                            if (!downloadResponse.ok) {
                                throw new Error(`下载请求失败: ${downloadResponse.status} ${downloadResponse.statusText}`);
                            }

                            // 设置响应头
                            response.status = downloadResponse.status;

                            // 复制重要的响应头
                            const contentType = downloadResponse.headers.get("Content-Type");
                            const contentLength = downloadResponse.headers.get("Content-Length");
                            const contentDisposition = downloadResponse.headers.get("Content-Disposition");

                            if (contentType) response.header("Content-Type", contentType);
                            if (contentLength) response.header("Content-Length", contentLength);
                            if (contentDisposition) {
                                response.header("Content-Disposition", contentDisposition);
                            } else {
                                // 如果没有Content-Disposition，根据文件名设置一个
                                const fileName = file.path?.split('/').pop() || 'download';
                                response.header("Content-Disposition", `attachment; filename="${encodeURIComponent(fileName)}"`);
                            }

                            // 直接返回ReadableStream，让Hono框架处理流传输
                            if (downloadResponse.body) {
                                console.log("[BaiduYun] 返回流式响应 (Crack)");
                                return downloadResponse.body;
                            } else {
                                throw new Error("下载响应体为空");
                            }
                        } catch (error: any) {
                            console.error("[BaiduYun] 代理下载失败 (Crack):", error.message);
                            throw error;
                        }
                    }
                }
            ];
        } else {
            // 小文件直接返回下载链接
            return [{
                status: true,
                direct: downloadUrl,
                headers: {
                    "User-Agent": this.config.custom_crack_ua || "netdisk",
                },
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

        // 如果文件超过2M，则代理下载
        const fileSize = file.size || 0;
        const SIZE_THRESHOLD = 2 * 1024 * 1024; // 2MB

        if (fileSize > SIZE_THRESHOLD) {
            // 返回下载流，由后端代理下载
            return [
                {
                    status: true,
                    stream: async (response: Context) => {
                        try {
                            console.log("[BaiduYun] 开始代理下载 (Video):", dlink);

                            // 发起下载请求
                            const downloadResponse = await fetch(dlink, {
                                method: "GET",
                                headers: {
                                    "User-Agent": this.config.custom_crack_ua || "netdisk",
                                    "Referer": "https://pan.baidu.com/"
                                }
                            });

                            if (!downloadResponse.ok) {
                                throw new Error(`下载请求失败: ${downloadResponse.status} ${downloadResponse.statusText}`);
                            }

                            // 设置响应头
                            response.status = downloadResponse.status;

                            // 复制重要的响应头
                            const contentType = downloadResponse.headers.get("Content-Type");
                            const contentLength = downloadResponse.headers.get("Content-Length");
                            const contentDisposition = downloadResponse.headers.get("Content-Disposition");

                            if (contentType) response.header("Content-Type", contentType);
                            if (contentLength) response.header("Content-Length", contentLength);
                            if (contentDisposition) {
                                response.header("Content-Disposition", contentDisposition);
                            } else {
                                // 如果没有Content-Disposition，根据文件名设置一个
                                const fileName = file.path?.split('/').pop() || 'download';
                                response.header("Content-Disposition", `attachment; filename="${encodeURIComponent(fileName)}"`);
                            }

                            // 直接返回ReadableStream，让Hono框架处理流传输
                            if (downloadResponse.body) {
                                console.log("[BaiduYun] 返回流式响应 (Video)");
                                return downloadResponse.body;
                            } else {
                                throw new Error("下载响应体为空");
                            }
                        } catch (error: any) {
                            console.error("[BaiduYun] 代理下载失败 (Video):", error.message);
                            throw error;
                        }
                    }
                }
            ];
        } else {
            // 小文件直接返回下载链接
            return [{
                status: true,
                direct: dlink,
                headers: {
                    "User-Agent": this.config.custom_crack_ua || "netdisk",
                },
            }];
        }
    }

    //====== 上传实现（私有方法）======
    /**
     * 上传文件
     * 实现秒传和分片上传逻辑
     */
    private async uploadFile(path: string, data: any): Promise<DriveResult> {
        try {
            // 获取文件数据和大小
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
            const {contentMd5, sliceMd5, blockList} = await this.calculateMd5(
                fileData,
                fileSize
            );

            // 尝试秒传
            try {
                const rapidResult = await this.rapidUpload(
                    path,
                    fileSize,
                    contentMd5,
                    sliceMd5,
                    blockList
                );
                if (rapidResult.flag) {
                    return rapidResult;
                }
            } catch (error) {
                console.log("[BaiduYun] 秒传失败，使用分片上传");
            }

            // 分片上传
            return await this.sliceUpload(
                path,
                fileData,
                fileSize,
                contentMd5,
                sliceMd5,
                blockList
            );
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
    ): Promise<{ contentMd5: string; sliceMd5: string; blockList: string[] }> {
        const sliceSize = this.clouds.getSliceSize(fileSize);
        const count = Math.ceil(fileSize / sliceSize);

        // 使用Web Crypto API计算MD5（这里简化处理，实际应使用crypto库）
        // 注意：浏览器环境需要使用第三方库如spark-md5
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
     * 尝试通过MD5匹配实现秒传
     */
    private async rapidUpload(
        path: string,
        size: number,
        contentMd5: string,
        sliceMd5: string,
        blockList: string[]
    ): Promise<DriveResult> {
        const params = {
            method: "precreate",
        };

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

        // return_type=2 表示秒传成功
        if (result.return_type === 2) {
            return {flag: true, text: String(result.info?.fs_id)};
        }

        // return_type=1 表示需要上传
        throw new Error("Need to upload");
    }

    /**
     * 分片上传
     * 将文件分片上传到百度网盘
     */
    private async sliceUpload(
        path: string,
        fileData: ArrayBuffer,
        fileSize: number,
        contentMd5: string,
        sliceMd5: string,
        blockList: string[]
    ): Promise<DriveResult> {
        // 预创建
        const params = {
            method: "precreate",
        };

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
            // 秒传成功
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
            path,
            fileSize,
            0,
            uploadid,
            JSON.stringify(blockList)
        );

        return {flag: true, text: String(createResult.fs_id)};
    }

    //====== 辅助方法 ======
    /**
     * 转换文件信息
     * 将百度网盘文件信息转换为标准文件信息格式
     */
    private convertToFileInfo(file: BaiduFile): fso.FileInfo {
        const isFolder = file.isdir === 1;
        const thumbnail = file.thumbs?.url3 || "";

        return {
            filePath: file.path,
            fileUUID: String(file.fs_id),
            fileName: file.server_filename,
            fileSize: file.size,
            fileType: isFolder ? fso.FileType.F_DIR : fso.FileType.F_ALL,
            thumbnails: thumbnail,
            timeModify: new Date(file.server_mtime * 1000),
            timeCreate: new Date(file.server_ctime * 1000),
        };
    }

    /**
     * 从路径获取文件名
     */
    private getFileName(path: string): string {
        const parts = path.split("/");
        return parts[parts.length - 1] || "";
    }

    /**
     * 拼接路径
     */
    private joinPath(parent: string, name: string): string {
        if (parent.endsWith("/")) {
            return parent + name;
        }
        return parent + "/" + name;
    }
}
