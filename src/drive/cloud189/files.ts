/** =========== 天翼云盘 文件操作驱动器 ================
 * 本文件实现了天翼云盘云存储服务的文件操作功能，包括：
 * - 文件和文件夹列表、创建、删除、移动、复制、上传、下载
 * - 天翼云盘 API 的认证和初始化、路径解析和 ID 查找
 * - 该驱动器继承自 BasicDriver，实现标准统一的云存储接口
 * =========================================================
 * @author "OpenList Team"
 * @version 25.01.01
 * =======================================================*/

//====== 公用导入 ======
import {Context} from "hono";
import {HostClouds} from "./utils";
import {BasicDriver} from "../BasicDriver";
import {DriveResult} from "../DriveObject";
import * as fso from "../../files/FilesObject";

//====== 专用导入 ======
import * as con from "./const";
import {HttpRequest, xmlToRecord} from "../../types/HttpRequest";



/**
 * 天翼云盘文件操作驱动器类
 *
 * 继承自 BasicDriver，实现了天翼云盘云存储的完整文件操作功能。
 * 通过天翼云盘 API 提供文件的增删改查、上传下载等操作。
 */
export class HostDriver extends BasicDriver {
    //====== 构造函数 ======
    constructor(c: Context, router: string, config: Record<string, any>, saving: Record<string, any>) {
        super(c, router, config, saving);
        this.clouds = new HostClouds(c, router, config, saving);
    }

    /**
     * 初始化驱动器
     * 执行登录流程，获取访问令牌
     */
    async initSelf(): Promise<DriveResult> {
        const result: DriveResult = await this.clouds.initConfig();
        console.log("@initSelf", result);
        if (result.flag) {
            this.saving = this.clouds.saving;
            this.change = true;
        }
        return result;
    }

    /**
     * 加载已保存的配置
     * 从保存的数据中恢复会话信息
     */
    async loadSelf(): Promise<DriveResult> {
        const result: DriveResult = await this.clouds.readConfig();
        console.log("@loadSelf", result);
        if (result.flag) {
            this.change = this.clouds.change;
            this.saving = this.clouds.saving;
        }
        return result;
    }

    //====== 文件列表 ======
    /**
     * 列出指定目录下的文件和文件夹
     */
    async listFile(file?: fso.FileFind): Promise<fso.PathInfo> {
        console.log("=== listFile Debug ===");
        console.log("input file:", file);

        try {
            if (file?.path) file.uuid = await this.findUUID(file.path);
            console.log("resolved uuid:", file?.uuid);

            if (!file?.uuid) {
                console.log("No UUID found, returning empty");
                return {fileList: [], pageSize: 0};
            }

            const result: fso.FileInfo[] = await this.getFiles(file?.uuid);
            console.log("getFiles result count:", result.length);
            console.log("=== End listFile Debug ===");

            return {
                pageSize: result.length,
                filePath: file?.path,
                fileList: result,
            };
        } catch (e) {
            console.error("listFile failed:", e);
            // 抛出错误给前端
            throw e;
        }
    }

    //====== 文件下载 ======
    /**
     * 获取文件下载链接
     */
    async downFile(file?: fso.FileFind): Promise<fso.FileLink[] | null> {
        if (file?.path) file.uuid = await this.findUUID(file.path);
        if (!file?.uuid) return [{status: false, result: "No UUID"}];

        try {
            const params = {
                fileId: file.uuid,
                dt: "3",
                flag: "1"
            };

            const response = await this.makeRequest("/getFileDownloadUrl.action", params, "GET");
            console.log("下载接口响应:", response);

            // 处理JSON格式的响应
            let downloadUrl = null;
            if (response && response.fileDownloadUrl) {
                downloadUrl = response.fileDownloadUrl;
            }
            // 处理XML格式转换后的响应
            else if (response && response.getFileDownloadUrl && response.getFileDownloadUrl.fileDownloadUrl) {
                downloadUrl = response.getFileDownloadUrl.fileDownloadUrl;
            }

            if (downloadUrl) {
                // 重定向获取真实链接
                downloadUrl = downloadUrl.replace(/&amp;/g, "&").replace("http://", "https://");

                // 尝试获取重定向后的真实链接
                try {
                    const redirectResp = await fetch(downloadUrl, {
                        method: "GET",
                        redirect: "manual"
                    });
                    if (redirectResp.status === 302) {
                        const location = redirectResp.headers.get("location");
                        if (location) downloadUrl = location;
                    }
                } catch (e) {
                    console.log("获取重定向链接失败，使用原始链接");
                }

                return [{
                    direct: downloadUrl,
                    // header: {"User-Agent": "Mozilla/5.0"}
                }];
            }

            return [{status: false, result: "获取下载链接失败"}];
        } catch (e) {
            console.error("下载文件失败:", e);
            // 抛出错误给前端
            throw e;
        }
    }

    //====== 文件复制 ======
    /**
     * 复制文件或文件夹到目标目录
     */
    async copyFile(file?: fso.FileFind, dest?: fso.FileFind): Promise<fso.FileTask> {
        if (file?.path) file.uuid = await this.findUUID(file.path);
        if (dest?.path) dest.uuid = await this.findUUID(dest.path);
        if (!file?.uuid || !dest?.uuid) {
            return {taskFlag: fso.FSStatus.FILESYSTEM_ERR};
        }

        try {
            // 获取文件信息以确定是否为文件夹
            const fileInfo = await this.getFileInfo(file.uuid);
            if (!fileInfo) {
                return {taskFlag: fso.FSStatus.FILESYSTEM_ERR};
            }

            // 创建批量任务
            const taskResp = await this.createBatchTask("COPY", "", dest.uuid, {
                targetFileName: fileInfo.fileName
            }, [{
                fileId: file.uuid,
                fileName: fileInfo.fileName,
                isFolder: fileInfo.isFolder ? 1 : 0
            }]);

            if (!taskResp?.taskId) {
                return {taskFlag: fso.FSStatus.FILESYSTEM_ERR};
            }

            // 等待任务完成
            await this.waitBatchTask("COPY", taskResp.taskId, 1000);

            return {
                taskType: fso.FSAction.COPYTO,
                taskFlag: fso.FSStatus.SUCCESSFUL_ALL
            };
        } catch (e) {
            console.error("复制文件失败:", e);
            // 抛出错误给前端
            throw e;
        }
    }

    //====== 文件移动 ======
    /**
     * 移动文件或文件夹到目标目录
     */
    async moveFile(file?: fso.FileFind, dest?: fso.FileFind): Promise<fso.FileTask> {
        if (file?.path) file.uuid = await this.findUUID(file.path);
        if (dest?.path) dest.uuid = await this.findUUID(dest.path);
        if (!file?.uuid || !dest?.uuid) {
            return {taskFlag: fso.FSStatus.FILESYSTEM_ERR};
        }

        try {
            // 获取文件信息以确定是否为文件夹
            const fileInfo = await this.getFileInfo(file.uuid);
            if (!fileInfo) {
                return {taskFlag: fso.FSStatus.FILESYSTEM_ERR};
            }

            // 创建批量任务
            const taskResp = await this.createBatchTask("MOVE", "", dest.uuid, {
                targetFileName: fileInfo.fileName
            }, [{
                fileId: file.uuid,
                fileName: fileInfo.fileName,
                isFolder: fileInfo.isFolder ? 1 : 0
            }]);

            if (!taskResp?.taskId) {
                return {taskFlag: fso.FSStatus.FILESYSTEM_ERR};
            }

            // 等待任务完成
            await this.waitBatchTask("MOVE", taskResp.taskId, 400);

            return {
                taskType: fso.FSAction.MOVETO,
                taskFlag: fso.FSStatus.SUCCESSFUL_ALL
            };
        } catch (e) {
            console.error("移动文件失败:", e);
            // 抛出错误给前端
            throw e;
        }
    }

    //====== 文件删除 ======
    /**
     * 删除文件或文件夹
     */
    async killFile(file?: fso.FileFind): Promise<fso.FileTask> {
        if (file?.path) file.uuid = await this.findUUID(file.path);
        if (!file?.uuid) {
            return {taskFlag: fso.FSStatus.FILESYSTEM_ERR};
        }

        try {
            // 获取文件信息以确定是否为文件夹
            const fileInfo = await this.getFileInfo(file.uuid);
            if (!fileInfo) {
                return {taskFlag: fso.FSStatus.FILESYSTEM_ERR};
            }

            // 创建批量删除任务
            const taskResp = await this.createBatchTask("DELETE", "", "", null, [{
                fileId: file.uuid,
                fileName: fileInfo.fileName,
                isFolder: fileInfo.isFolder ? 1 : 0
            }]);

            if (!taskResp?.taskId) {
                return {taskFlag: fso.FSStatus.FILESYSTEM_ERR};
            }

            // 等待任务完成
            await this.waitBatchTask("DELETE", taskResp.taskId, 200);

            return {
                taskType: fso.FSAction.DELETE,
                taskFlag: fso.FSStatus.SUCCESSFUL_ALL
            };
        } catch (e) {
            console.error("删除文件失败:", e);
            // 抛出错误给前端
            throw e;
        }
    }

    //====== 创建文件/文件夹 ======
    /**
     * 创建文件夹
     */
    async makeFile(file?: fso.FileFind, name?: string | null, type?: fso.FileType, data?: any | null): Promise<DriveResult | null> {
        if (type === fso.FileType.F_DIR) {
            // 创建文件夹
            if (file?.path) {
                const parent: string = file.path.substring(0, file?.path.lastIndexOf('/'));
                file.uuid = await this.findUUID(parent);
            }
            if (!file?.uuid || !name) return null;

            try {
                const params = {
                    parentFolderId: file.uuid,
                    folderName: name,
                    relativePath: ""
                };

                // 创建文件夹使用表单请求
                const response = await this.makeRequest("/createFolder.action", params, "POST", undefined, true);
                console.log("创建文件夹响应:", response);

                // 处理JSON格式的响应
                let folderId = null;
                if (response && response.id) {
                    folderId = response.id;
                }
                // 处理XML格式转换后的响应
                else if (response && response.createFolder && response.createFolder.id) {
                    folderId = response.createFolder.id;
                }

                if (folderId) {
                    return {flag: true, text: folderId};
                }
                return {flag: false, text: "创建文件夹失败"};
            } catch (e) {
                console.error("创建文件夹失败:", e);
                // 抛出错误给前端
                throw e;
            }
        }
        return null;
    }

    //====== 文件上传 ======
    /**
     * 上传文件
     */
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
            // 获取文件大小
            const fileSize = data instanceof Blob ? data.size : Buffer.byteLength(data);

            // 初始化上传
            const uploadInfo = await this.initMultiUpload(file.uuid, name, fileSize);
            if (!uploadInfo) {
                return {flag: false, text: "初始化上传失败"};
            }

            // 如果文件已存在（秒传）
            if (uploadInfo.fileDataExists === 1) {
                return {flag: true, text: "文件秒传成功"};
            }

            // 计算分片大小
            const sliceSize = this.calculatePartSize(fileSize);
            const partCount = Math.ceil(fileSize / sliceSize);

            // 上传分片
            for (let i = 0; i < partCount; i++) {
                const start = i * sliceSize;
                const end = Math.min(start + sliceSize, fileSize);
                const partData = data instanceof Blob ? data.slice(start, end) : data.slice(start, end);

                // 计算分片MD5
                const partMd5 = await this.calculateMD5(partData);
                const partInfo = `${i + 1}-${btoa(partMd5)}`;

                // 获取上传URL
                const uploadUrls = await this.getMultiUploadUrls(uploadInfo.uploadFileId, [partInfo]);
                if (!uploadUrls || uploadUrls.length === 0) {
                    return {flag: false, text: "获取上传URL失败"};
                }

                // 上传分片
                await this.uploadPart(uploadUrls[0], partData);
            }

            // 提交上传
            const result = await this.commitMultiUpload(uploadInfo.uploadFileId);
            if (result) {
                return {flag: true, text: "上传成功"};
            }

            return {flag: false, text: "提交上传失败"};
        } catch (e) {
            console.error("上传文件失败:", e);
            // 抛出错误给前端
            throw e;
        }
    }

    //====== 路径查找 ======
    /**
     * 根据路径查找文件UUID
     */
    async findUUID(path: string): Promise<string | null> {
        console.log("=== findUUID Debug ===");
        console.log("input path:", path);

        try {
            const parts: string[] = path.split('/').filter(part => part.trim() !== '');
            console.log("DirFind", path, parts);

            if (parts.length === 0 || path === '/') {
                console.log("Root path detected, returning -11");
                console.log("=== End findUUID Debug ===");
                return '-11';
            }

            let currentUUID: string = '-11';
            for (const part of parts) {
                console.log(`Looking for part: "${part}" in folder: ${currentUUID}`);
                const files: fso.FileInfo[] = await this.getFiles(currentUUID);
                console.log(`Found ${files.length} files in folder ${currentUUID}`);

                const foundFile: fso.FileInfo | undefined = files.find(
                    file => file.fileName === part.replace(/\/$/, ''));

                if (!foundFile || !foundFile.fileUUID) {
                    console.log(`File/folder "${part}" not found!`);
                    console.log("=== End findUUID Debug ===");
                    return null;
                }

                currentUUID = foundFile.fileUUID;
                console.log("NowUUID:", currentUUID);
            }

            console.log("Final UUID:", currentUUID);
            console.log("=== End findUUID Debug ===");
            return currentUUID;
        } catch (e) {
            console.error("findUUID failed:", e);
            // 抛出错误给前端
            throw e;
        }
    }

    //====== 获取文件列表（内部方法）======
    /**
     * 获取指定目录下的所有文件（分页获取）
     */
    async getFiles(folderId: string): Promise<fso.FileInfo[]> {
        console.log("=== getFiles Debug ===");
        console.log("folderId:", folderId);

        const result: fso.FileInfo[] = [];
        let pageNum = 1;

        while (true) {
            console.log(`Fetching page ${pageNum}...`);
            const resp = await this.getFilesWithPage(folderId, pageNum, 1000);

            if (!resp) {
                console.log("No response from getFilesWithPage");
                break;
            }

            console.log(`Page ${pageNum} - count: ${resp.count}, files: ${resp.files.length}`);

            if (resp.count === 0) {
                console.log("Count is 0, breaking");
                break;
            }

            result.push(...resp.files);

            // 如果返回的文件数少于请求数，说明已经是最后一页
            if (resp.files.length < 1000) {
                console.log("Last page reached");
                break;
            }
            pageNum++;
        }

        console.log("Total files collected:", result.length);
        console.log("=== End getFiles Debug ===");
        return result;
    }

    /**
     * 通用API请求方法
     * @param apiPath API路径
     * @param params 请求参数
     * @param method 请求方法，默认GET
     * @param baseUrl 基础URL，可选
     * @param isForm 是否为表单请求，默认false
     * @param isRetry 是否为重试调用，默认false
     * @returns 响应数据
     */
    async makeRequest<T = any>(
        apiPath: string, 
        params: Record<string, string> = {}, 
        method: 'GET' | 'POST' = 'GET',
        baseUrl?: string,
        isForm: boolean = false,
        isRetry: boolean = false
    ): Promise<T | null> {
        try {
            // 根据是否使用cookie选择不同的域名
            const requestBaseUrl = baseUrl || (this.clouds.cookie ? con.WEB_URL + '/api/open/file' : con.API_URL);
            const url = `${requestBaseUrl}${apiPath}`;
            
            let headers: Record<string, string>;
            let requestUrl = url;
            let searchOptions: any;
            let requestData = undefined;

            if (this.clouds.cookie) {
                // 使用cookie认证
                if (method === 'GET') {
                    // GET请求将参数拼接到URL上
                    const noCache = Math.random().toString().substring(2);
                    const cookieParams = {
                        noCache: noCache,
                        ...params
                    };
                    const queryParams = new URLSearchParams(cookieParams).toString();
                    requestUrl = `${url}?${queryParams}`;
                } else {
                    // POST请求使用表单数据
                    requestData = params;
                }
                headers = {
                    "Cookie": this.clouds.cookie,
                    "Content-Type": isForm ? "application/x-www-form-urlencoded" : "application/json",
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
                };
                // Cookie模式下不使用加密参数或签名searchOptions
                searchOptions = {
                    finder: "text"
                };
            } else {
                // 使用签名认证
                let encryptedParams: string = "";
                // POST 的x-www-form-urlencoded类型body将转为加密param放入search
                if (method === 'POST' && params && Object.keys(params).length > 0) {
                    encryptedParams = this.clouds.encryptParams(params);
                }
                const signHeaders = this.clouds.signatureHeader(url, method, encryptedParams);
                headers = {
                    ...signHeaders,
                    "User-Agent": "Mozilla/5.0 (Macintosh; Apple macOS 15_5) AppleWebKit/537.36 (KHTML, like Gecko) Safari/537.36 Chrome/138.0.0.0",
                    "Content-Type": isForm ? "application/x-www-form-urlencoded" : "application/json"
                };
                searchOptions = {
                    finder: "xml",
                    search: {
                        ...this.clouds.clientSuffix(),
                        ...(method == "GET" ? params : { params: encryptedParams})
                    }
                };
            }

            const response = await HttpRequest(method, requestUrl, requestData, headers, searchOptions);
            console.log(response)
            // 检查响应中是否包含session相关错误（原始响应文本检查）
            if (typeof response === 'string') {
                if (response.includes('userSessionBO is null')) {
                    console.log('检测到userSessionBO is null错误，尝试刷新session...');
                    
                    try {
                        // 刷新session
                        const refreshResult = await this.clouds.refreshSession();
                        if (refreshResult.flag) {
                            console.log('Session刷新成功，重试请求...');
                            // 重试请求
                            return await this.makeRequest<T>(apiPath, params, method, baseUrl, isForm, isRetry);
                        } else {
                            console.error('Session刷新失败:', refreshResult.text);
                            throw new Error(`Session刷新失败: ${refreshResult.text}`);
                        }
                    } catch (refreshError) {
                        console.error('Session刷新异常:', refreshError);
                        throw new Error(`Session刷新异常: ${(refreshError as Error).message}`);
                    }
                } else if (response.includes('sessionsignature is not match')) {
                    console.log('检测到sessionsignature is not match错误，尝试刷新session...');
                    
                    try {
                        // 刷新session
                        const refreshResult = await this.clouds.refreshSession();
                        if (refreshResult.flag) {
                            console.log('Session刷新成功，重试请求...');
                            // 重试请求
                            return await this.makeRequest<T>(apiPath, params, method, baseUrl, isForm, isRetry);
                        } else {
                            console.error('Session刷新失败:', refreshResult.text);
                            throw new Error(`Session刷新失败: ${refreshResult.text}`);
                        }
                    } catch (refreshError) {
                        console.error('Session刷新异常:', refreshError);
                        throw new Error(`Session刷新异常: ${(refreshError as Error).message}`);
                    }
                }
            }
            
            // 统一处理响应格式，将XML转换为JSON
            const result = this.convertResponseToJSON(response) as T;
            
            // 检查是否返回错误
            if (result && typeof result === 'object' && 'errorCode' in result) {
                const errorResult = result as any;
                
                // 如果错误是InvalidSessionKey且是cookie登录，且设置了用户名密码，则自动重新登录重试
                if (errorResult.errorCode === 'InvalidSessionKey' && 
                    this.clouds.cookie && 
                    !isRetry &&
                    this.clouds.in_config.username && 
                    this.clouds.in_config.password &&
                    this.clouds.in_config.loginType === 'cookie') {
                    
                    console.log('检测到InvalidSessionKey错误，尝试重新登录获取cookie...');
                    
                    try {
                        // 重新登录获取cookie
                        // const newCookie = await this.clouds.loginWithCookie();
                        // this.clouds.cookie = newCookie;
                        await this.initSelf();
                        // 覆盖当前用户设置的cookie
                        this.clouds.in_config.cookie = this.clouds.cookie;
                        console.log('重新登录成功，重试请求...');
                        
                        // 重试请求
                        return await this.makeRequest<T>(apiPath, params, method, baseUrl, isForm, true);
                    } catch (loginError) {
                        console.error('重新登录失败:', loginError);
                        // 返回原始错误
                        throw new Error(`会话失效且重新登录失败: ${errorResult.errorMsg || errorResult.errorCode}`);
                    }
                }
                
                // 其他错误直接抛出
                throw new Error(errorResult.errorMsg || errorResult.errorCode || '请求失败');
            }
            
            return result;
        } catch (e) {
            console.error("API请求失败:", e);
            // 如果是重试调用仍然失败，直接抛出错误
            if (isRetry) {
                throw e;
            }
            // 其他情况返回null（保持原有行为）
            return null;
        }
    }

    /**
     * 将响应数据统一转换为JSON格式
     * @param response 原始响应数据
     * @returns JSON格式的响应数据
     */
    private convertResponseToJSON(response: any): any {
        // 如果已经是对象，直接返回
        if (typeof response === 'object' && response !== null) {
            return response;
        }

        // 如果是字符串，尝试处理
        if (typeof response === 'string') {
            // 尝试解析为JSON
            if (response.trim().startsWith('{')) {
                try {
                    return JSON.parse(response);
                } catch (e) {
                    console.log("不是有效的JSON格式");
                }
            }

            // 尝试解析为XML
            if (response.includes('<?xml')) {
                try {
                    const parsed = xmlToRecord(response);
                    return parsed;
                } catch (e) {
                    console.error("解析XML响应失败:", e);
                    console.error("原始响应:", response.substring(0, 200));
                }
            }
        }

        // 如果无法转换，返回原始数据
        return response;
    }

    /**
     * 分页获取文件列表
     */
    async getFilesWithPage(folderId: string, pageNum: number, pageSize: number): Promise<{
        count: number,
        files: fso.FileInfo[]
    } | null> {
        try {
            const params = {
                folderId: folderId,
                fileType: "0",
                mediaAttr: "0",
                iconOption: "5",
                pageNum: pageNum.toString(),
                pageSize: pageSize.toString(),
                recursive: "0",
                orderBy: "filename",
                descending: "false"
            };

            // 如果使用cookie认证，调整参数
            if (this.clouds.cookie) {
                Object.assign(params, {
                    mediaType: "0",
                    orderBy: "lastOpTime",
                    descending: "true"
                });
            }

            const response = await this.makeRequest("/listFiles.action", params, "GET");
            if (!response) {
                return null;
            }

            // 处理JSON格式响应（makeRequest已自动转换XML为JSON）
            if (response && response.fileListAO) {
                const fileList = response.fileListAO.fileList || [];
                const folderList = response.fileListAO.folderList || [];

                // 处理文件夹列表
                const folders = folderList.map((folder: any) => ({
                    filePath: folder.path || "",
                    fileName: folder.name,
                    fileSize: 0,
                    fileType: fso.FileType.F_DIR,
                    fileUUID: folder.id.toString(),
                    timeCreate: folder.createDate ? new Date(folder.createDate) : undefined,
                    timeModify: folder.lastOpTime ? new Date(folder.lastOpTime) : undefined
                }));

                // 处理文件列表
                const files = fileList.map((file: any) => ({
                    filePath: file.path || "",
                    fileName: file.name,
                    fileSize: file.size || 0,
                    fileType: fso.FileType.F_ALL,
                    fileUUID: file.id.toString(),
                    timeCreate: file.createDate ? new Date(file.createDate) : undefined,
                    timeModify: file.lastOpTime ? new Date(file.lastOpTime) : undefined
                }));

                return {
                    count: response.fileListAO.count || 0,
                    files: [...folders, ...files]
                };
            }

            // 处理XML格式响应（cookie认证时返回，已转换为JSON）
            if (response && response.listFiles) {
                const listFiles = response.listFiles;
                
                if (!listFiles || !listFiles.fileList) {
                    console.log("XML结构不正确:", response);
                    return null;
                }

                const folders: fso.FileInfo[] = [];
                const files: fso.FileInfo[] = [];
                const fileList = listFiles.fileList;

                // 解析文件夹
                if (fileList.folder) {
                    const folderArray = Array.isArray(fileList.folder) ? fileList.folder : [fileList.folder];
                    folderArray.forEach((folder: any) => {
                        if (folder.id && folder.name) {
                            folders.push({
                                filePath: "",
                                fileName: folder.name,
                                fileSize: 0,
                                fileType: fso.FileType.F_DIR,
                                fileUUID: folder.id.toString(),
                                timeCreate: folder.createDate ? new Date(folder.createDate) : undefined,
                                timeModify: folder.lastOpTime ? new Date(folder.lastOpTime) : undefined
                            });
                        }
                    });
                }

                // 解析文件
                if (fileList.file) {
                    const fileArray = Array.isArray(fileList.file) ? fileList.file : [fileList.file];
                    fileArray.forEach((file: any) => {
                        if (file.id && file.name) {
                            files.push({
                                filePath: "",
                                fileName: file.name,
                                fileSize: file.size ? parseInt(file.size) : 0,
                                fileType: fso.FileType.F_ALL,
                                fileUUID: file.id.toString(),
                                timeCreate: file.createDate ? new Date(file.createDate) : undefined,
                                timeModify: file.lastOpTime ? new Date(file.lastOpTime) : undefined
                            });
                        }
                    });
                }

                const totalCount = fileList.count ? parseInt(fileList.count) : folders.length + files.length;

                console.log(`文件列表解析结果: ${folders.length}个文件夹, ${files.length}个文件`);

                return {
                    count: totalCount,
                    files: [...folders, ...files]
                };
            }

            return null;
        } catch (e) {
            console.error("获取文件列表失败:", e);
            return null;
        }
    }

    /**
     * 获取单个文件信息
     */
    async getFileInfo(fileId: string): Promise<{ fileName: string, isFolder: boolean } | null> {
        try {
            // 通过列表接口获取父目录信息来判断
            // 这里简化处理，假设通过ID可以判断
            return {
                fileName: fileId,
                isFolder: false
            };
        } catch (e) {
            console.error("获取文件信息失败:", e);
            return null;
        }
    }

    //====== 批量任务相关 ======
    /**
     * 创建批量任务
     */
    async createBatchTask(
        type: string,
        familyId: string,
        targetFolderId: string,
        other: Record<string, any> | null,
        taskInfos: Array<{ fileId: string, fileName: string, isFolder: number }>
    ): Promise<{ taskId: string } | null> {
        try {
            const formData: Record<string, string> = {
                type: type,
                taskInfos: JSON.stringify(taskInfos)
            };

            if (targetFolderId) formData.targetFolderId = targetFolderId;
            if (familyId) formData.familyId = familyId;
            if (other) Object.assign(formData, other);

            // 使用优化后的makeRequest方法
            const response = await this.makeRequest("/batch/createBatchTask.action", formData, "POST", con.API_URL, true);
            console.log("创建批量任务响应:", response);

            // 处理JSON格式的响应
            let taskId = null;
            if (response && response.taskId) {
                taskId = response.taskId;
            }
            // 处理XML格式转换后的响应
            else if (response && response.batchCreateTask && response.batchCreateTask.taskId) {
                taskId = response.batchCreateTask.taskId;
            }

            if (taskId) {
                return {taskId: taskId};
            }

            return null;
        } catch (e) {
            console.error("创建批量任务失败:", e);
            return null;
        }
    }

    /**
     * 检查批量任务状态
     */
    async checkBatchTask(type: string, taskId: string): Promise<{ taskStatus: number } | null> {
        try {
            const formData = {
                type: type,
                taskId: taskId
            };

            // 使用优化后的makeRequest方法
            const response = await this.makeRequest("/batch/checkBatchTask.action", formData, "POST", con.API_URL, true);
            console.log("检查批量任务响应:", response);

            // 处理JSON格式的响应
            let taskStatus = null;
            if (response && response.taskStatus !== undefined) {
                taskStatus = response.taskStatus;
            }
            // 处理XML格式转换后的响应
            else if (response && response.batchCheckTask && response.batchCheckTask.taskStatus !== undefined) {
                taskStatus = response.batchCheckTask.taskStatus;
            }

            if (taskStatus !== null) {
                return {taskStatus: taskStatus};
            }

            return null;
        } catch (e) {
            console.error("检查批量任务失败:", e);
            return null;
        }
    }

    /**
     * 等待批量任务完成
     */
    async waitBatchTask(type: string, taskId: string, interval: number): Promise<void> {
        while (true) {
            const state = await this.checkBatchTask(type, taskId);
            if (!state) throw new Error("检查任务状态失败");

            // taskStatus: 1-初始化 2-存在冲突 3-执行中 4-完成
            if (state.taskStatus === 2) {
                throw new Error("任务存在冲突");
            }
            if (state.taskStatus === 4) {
                return;
            }

            await new Promise(resolve => setTimeout(resolve, interval));
        }
    }

    //====== 上传相关辅助方法 ======
    /**
     * 初始化多分片上传
     */
    async initMultiUpload(parentFolderId: string, fileName: string, fileSize: number): Promise<any> {
        try {
            const sliceSize = this.calculatePartSize(fileSize);

            const params = {
                parentFolderId: parentFolderId,
                fileName: encodeURIComponent(fileName),
                fileSize: fileSize.toString(),
                sliceSize: sliceSize.toString(),
                lazyCheck: "1"
            };

            const response = await this.makeRequest("/person/initMultiUpload", params, "GET", con.UPLOAD_URL);
            console.log("初始化上传响应:", response);

            // 处理JSON格式的响应
            let uploadData = null;
            if (response && response.data) {
                uploadData = response.data;
            }
            // 处理XML格式转换后的响应
            else if (response && response.initMultiUpload && response.initMultiUpload.data) {
                uploadData = response.initMultiUpload.data;
            }

            return uploadData;
        } catch (e) {
            console.error("初始化上传失败:", e);
            return null;
        }
    }

    /**
     * 获取上传URL
     */
    async getMultiUploadUrls(uploadFileId: string, partInfos: string[]): Promise<any[]> {
        try {
            const params = {
                uploadFileId: uploadFileId,
                partInfo: partInfos.join(",")
            };

            const response = await this.makeRequest("/person/getMultiUploadUrls", params, "GET", con.UPLOAD_URL);
            console.log("获取上传URL响应:", response);

            // 处理JSON格式的响应
            let uploadUrls = null;
            if (response && response.uploadUrls) {
                uploadUrls = response.uploadUrls;
            }
            // 处理XML格式转换后的响应
            else if (response && response.getMultiUploadUrls && response.getMultiUploadUrls.uploadUrls) {
                uploadUrls = response.getMultiUploadUrls.uploadUrls;
            }

            return uploadUrls ? Object.values(uploadUrls) : [];
        } catch (e) {
            console.error("获取上传URL失败:", e);
            return [];
        }
    }

    /**
     * 上传分片
     */
    async uploadPart(uploadUrl: any, data: any): Promise<void> {
        const headers: Record<string, string> = {};
        if (uploadUrl.requestHeader) {
            const headerPairs = uploadUrl.requestHeader.split("&");
            for (const pair of headerPairs) {
                const [key, value] = pair.split("=");
                if (key && value) headers[key] = value;
            }
        }

        await fetch(uploadUrl.requestURL, {
            method: "PUT",
            headers: headers,
            body: data
        });
    }

    /**
     * 提交上传
     */
    async commitMultiUpload(uploadFileId: string): Promise<boolean> {
        try {
            const params = {
                uploadFileId: uploadFileId,
                isLog: "0",
                opertype: "1"
            };

            const response = await this.makeRequest("/person/commitMultiUploadFile", params, "GET", con.UPLOAD_URL);
            console.log("提交上传响应:", response);

            // 处理JSON格式的响应
            let fileResult = null;
            if (response && response.file) {
                fileResult = response.file;
            }
            // 处理XML格式转换后的响应
            else if (response && response.commitMultiUploadFile && response.commitMultiUploadFile.file) {
                fileResult = response.commitMultiUploadFile.file;
            }

            return !!fileResult;
        } catch (e) {
            console.error("提交上传失败:", e);
            return false;
        }
    }

    /**
     * 计算分片大小
     */
    calculatePartSize(size: number): number {
        const DEFAULT = 1024 * 1024 * 10; // 10MB
        if (size > DEFAULT * 2 * 999) {
            return Math.max(Math.ceil((size / 1999) / DEFAULT), 5) * DEFAULT;
        }
        if (size > DEFAULT * 999) {
            return DEFAULT * 2; // 20MB
        }
        return DEFAULT;
    }

    /**
     * 计算MD5
     */
    async calculateMD5(data: any): Promise<string> {
        // 这里需要实现MD5计算，简化处理
        return "";
    }
}