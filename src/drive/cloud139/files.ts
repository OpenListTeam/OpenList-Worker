/** =========== 移动云盘 文件操作驱动器 ================
 * 本文件实现了移动云盘(139云)存储服务的文件操作功能，包括：
 * - 文件和文件夹列表、创建、删除、移动、复制、上传、下载
 * - 移动云盘API 的认证和初始化、路径解析和 UUID 查找
 * - 该驱动器继承自 BasicDriver，实现标准统一的云存储接口
 * =========================================================
 * @author "OpenList Team"
 * @version 25.11.13
 * =======================================================*/

// 公用导入 ================================================
import {Context} from "hono";
import {HostClouds} from "./utils"
import {BasicDriver} from "../BasicDriver";
import {DriveResult} from "../DriveObject";
import * as fso from "../../files/FilesObject";
// 专用导入 ================================================
import * as con from "./const";

// ==================== 文件操作驱动器类 ====================
/**
 * 移动云盘文件操作驱动器类
 * 继承自 BasicDriver，实现了移动云盘的完整文件操作功能
 */
export class HostDriver extends BasicDriver {
    // 专用成员 ============================================
    declare public clouds: HostClouds;
    private rootFolderId: string = "/";

    /** ================== 构造函数 ========================
     * @param c - Hono 上下文对象
     * @param router - 路由器标识
     * @param config - 配置信息
     * @param saving - 保存的认证信息
     * ===================================================*/
    constructor(
        c: Context, router: string,
        config: Record<string, any>,
        saving: Record<string, any>,
    ) {
        super(c, router, config, saving);
        this.clouds = new HostClouds(c, router, config, saving);
    }

    // ==================== 初始化驱动器配置 ====================
    /**
     * 初始化驱动器，刷新token并设置根目录
     */
    async initSelf(): Promise<DriveResult> {
        try {
            const result = await this.clouds.initConfig();
            if (!result.flag) {
                return result;
            }

            // 设置根文件夹ID
            if (this.config.root_folder_id) {
                this.rootFolderId = this.config.root_folder_id;
            } else {
                // 根据类型设置默认根目录
                switch (this.config.type) {
                    case con.META_PERSONAL_NEW:
                        this.rootFolderId = "/";
                        break;
                    case con.META_PERSONAL:
                        this.rootFolderId = "root";
                        break;
                    case con.META_GROUP:
                        this.rootFolderId = this.config.cloud_id || "";
                        break;
                    case con.META_FAMILY:
                        this.rootFolderId = this.config.cloud_id || "";
                        break;
                }
            }

            this.saving = this.clouds.saving;
            this.change = true;
            return {flag: true, text: "初始化成功"};
        } catch (error: any) {
            return {flag: false, text: `初始化失败: ${error.message}`};
        }
    }

    // ==================== 加载驱动器的实例 ====================
    /**
     * 加载已保存的驱动器实例
     */
    async loadSelf(): Promise<DriveResult> {
        try {
            await this.clouds.loadSaving();
            this.change = this.clouds.change;
            this.saving = this.clouds.saving;

            // 恢复根文件夹ID
            if (this.config.root_folder_id) {
                this.rootFolderId = this.config.root_folder_id;
            }

            return {flag: true, text: "加载成功"};
        } catch (error: any) {
            return {flag: false, text: `加载失败: ${error.message}`};
        }
    }

    /** =======================列出目录内容========================
     * 获取指定目录下的所有文件和子目录信息。
     * 如果提供路径，会先解析为 UUID；如果提供 UUID，则直接使用。
     * @param   file - 文件查找参数，可包含路径或 UUID
     * @returns Promise<fso.PathInfo> 目录信息，包含文件列表统计信息
     * ===========================================================*/
    async listFile(file?: fso.FileFind): Promise<fso.PathInfo> {
        try {
            // 解析UUID
            if (file?.path && !file?.uuid) {
                const uuid = await this.findUUID(file.path);
                if (uuid) {
                    file.uuid = uuid;
                }
            }
            if (!file?.uuid) {
                file = {uuid: this.rootFolderId};
            }

            let fileList: fso.FileInfo[] = [];

            // 根据云盘类型调用不同的API
            if (this.config.type === con.META_PERSONAL_NEW) {
                fileList = await this.personalNewGetFiles(file.uuid!);
            } else if (this.config.type === con.META_PERSONAL) {
                fileList = await this.personalGetFiles(file.uuid!);
            } else if (this.config.type === con.META_FAMILY) {
                fileList = await this.familyGetFiles(file.uuid!);
            } else if (this.config.type === con.META_GROUP) {
                fileList = await this.groupGetFiles(file.uuid!);
            }
            console.log("列出文件成功:", fileList);
            return {
                pageSize: fileList.length,
                filePath: file?.path,
                fileList: fileList,
            };
        } catch (error: any) {
            console.error("列出文件失败:", error);
            return {
                pageSize: 0,
                filePath: file?.path,
                fileList: [],
            };
        }
    }

    /** =======================获取文件下载链接====================
     * 生成指定文件的直接下载链接，包含必要的认证头信息。
     * 支持通过路径或 UUID 定位文件。
     * @param   file - 文件查找参数，可包含路径或 UUID
     * @returns Promise<fso.FileLink[]> 文件下载链接数组
     * ===========================================================*/
    async downFile(file?: fso.FileFind): Promise<fso.FileLink[] | null> {
        try {
            if (file?.path && !file?.uuid) {
                const uuid = await this.findUUID(file.path);
                if (uuid) {
                    file.uuid = uuid;
                }
            }
            if (!file?.uuid) {
                return [{status: false, result: "文件UUID不存在"}];
            }

            let url: string = "";

            // 根据云盘类型获取下载链接
            if (this.config.type === con.META_PERSONAL_NEW) {
                url = await this.personalNewGetLink(file.uuid);
            } else if (this.config.type === con.META_PERSONAL) {
                url = await this.personalGetLink(file.uuid);
            } else if (this.config.type === con.META_FAMILY) {
                url = await this.familyGetLink(file.uuid, file.path || "");
            } else if (this.config.type === con.META_GROUP) {
                url = await this.groupGetLink(file.uuid, file.path || "");
            }

            if (!url) {
                return [{status: false, result: "获取下载链接失败"}];
            }

            return [{direct: url}];
        } catch (error: any) {
            console.error("获取下载链接失败:", error);
            return [{status: false, result: error.message}];
        }
    }

    /** =======================复制文件或文件夹====================
     * 将指定的文件或文件夹复制到目标目录。
     * 支持通过路径或 UUID 定位源文件和目标目录。
     * @param   file - 源文件查找参数，可包含路径或 UUID
     * @param   dest - 目标目录查找参数，可包含路径或 UUID
     * @returns Promise<fso.FileTask> 文件任务状态
     * ===========================================================*/
    async copyFile(file?: fso.FileFind, dest?: fso.FileFind): Promise<fso.FileTask> {
        try {
            if (file?.path && !file?.uuid) {
                const uuid = await this.findUUID(file.path);
                if (uuid) {
                    file.uuid = uuid;
                }
            }
            if (dest?.path && !dest?.uuid) {
                const uuid = await this.findUUID(dest.path);
                if (uuid) {
                    dest.uuid = uuid;
                }
            }
            if (!file?.uuid || !dest?.uuid) {
                return {taskType: fso.FSAction.COPYTO, taskFlag: fso.FSStatus.FILESYSTEM_ERR};
            }

            // 目前仅personal_new和personal支持复制
            if (this.config.type === con.META_PERSONAL_NEW) {
                const data = {
                    fileIds: [file.uuid],
                    toParentFileId: dest.uuid
                };
                await this.personalRequest("/file/batchCopy", data);
            } else if (this.config.type === con.META_PERSONAL) {
                const data = {
                    createBatchOprTaskReq: {
                        taskType: 3,
                        actionType: 309,
                        taskInfo: {
                            contentInfoList: [file.uuid],
                            catalogInfoList: [],
                            newCatalogID: dest.uuid
                        },
                        commonAccountInfo: {
                            account: this.clouds.account,
                            accountType: 1
                        }
                    }
                };
                await this.clouds.request(con.API_BASE_URL + "/orchestration/personalCloud/batchOprTask/v1.0/createBatchOprTask", "POST", data);
            } else {
                return {taskType: fso.FSAction.COPYTO, taskFlag: fso.FSStatus.FILESYSTEM_ERR};
            }

            return {taskType: fso.FSAction.COPYTO, taskFlag: fso.FSStatus.PROCESSING_NOW};
        } catch (error: any) {
            console.error("复制文件失败:", error);
            return {taskType: fso.FSAction.COPYTO, taskFlag: fso.FSStatus.FILESYSTEM_ERR};
        }
    }

    /** =======================移动文件或文件夹====================
     * 将指定的文件或文件夹移动到目标目录。
     * 实现方式是先复制到目标位置，然后删除原文件。
     * @param   file - 源文件查找参数，可包含路径或 UUID
     * @param   dest - 目标目录查找参数，可包含路径或 UUID
     * @returns Promise<fso.FileTask> 文件任务状态
     * ===========================================================*/
    async moveFile(file?: fso.FileFind, dest?: fso.FileFind): Promise<fso.FileTask> {
        try {
            if (file?.path && !file?.uuid) {
                const uuid = await this.findUUID(file.path);
                if (uuid) {
                    file.uuid = uuid;
                }
            }
            if (dest?.path && !dest?.uuid) {
                const uuid = await this.findUUID(dest.path);
                if (uuid) {
                    dest.uuid = uuid;
                }
            }
            if (!file?.uuid || !dest?.uuid) {
                return {taskType: fso.FSAction.MOVETO, taskFlag: fso.FSStatus.FILESYSTEM_ERR};
            }

            // 根据云盘类型调用不同的移动API
            if (this.config.type === con.META_PERSONAL_NEW) {
                const data = {
                    fileIds: [file.uuid],
                    toParentFileId: dest.uuid
                };
                await this.personalRequest("/file/batchMove", data);
            } else if (this.config.type === con.META_PERSONAL) {
                const data = {
                    createBatchOprTaskReq: {
                        taskType: 3,
                        actionType: "304",
                        taskInfo: {
                            contentInfoList: [file.uuid],
                            catalogInfoList: [],
                            newCatalogID: dest.uuid
                        },
                        commonAccountInfo: {
                            account: this.clouds.account,
                            accountType: 1
                        }
                    }
                };
                await this.clouds.request(con.API_BASE_URL + "/orchestration/personalCloud/batchOprTask/v1.0/createBatchOprTask", "POST", data);
            } else {
                return {taskType: fso.FSAction.MOVETO, taskFlag: fso.FSStatus.FILESYSTEM_ERR};
            }

            return {taskType: fso.FSAction.MOVETO, taskFlag: fso.FSStatus.PROCESSING_NOW};
        } catch (error: any) {
            console.error("移动文件失败:", error);
            return {taskType: fso.FSAction.MOVETO, taskFlag: fso.FSStatus.FILESYSTEM_ERR};
        }
    }

    /** =======================删除文件或文件夹====================
     * 永久删除指定的文件或文件夹。
     * 支持通过路径或 UUID 定位要删除的文件。
     * @param   file - 文件查找参数，可包含路径或 UUID
     * @returns Promise<fso.FileTask> 文件任务状态
     * ===========================================================*/
    async killFile(file?: fso.FileFind): Promise<fso.FileTask> {
        try {
            if (file?.path && !file?.uuid) {
                const uuid = await this.findUUID(file.path);
                if (uuid) {
                    file.uuid = uuid;
                }
            }
            if (!file?.uuid) {
                return {taskType: fso.FSAction.DELETE, taskFlag: fso.FSStatus.FILESYSTEM_ERR};
            }

            // 根据云盘类型调用不同的删除API
            if (this.config.type === con.META_PERSONAL_NEW) {
                const data = {fileIds: [file.uuid]};
                await this.personalRequest("/recyclebin/batchTrash", data);
            } else if (this.config.type === con.META_PERSONAL || this.config.type === con.META_FAMILY) {
                const data = {
                    createBatchOprTaskReq: {
                        taskType: 2,
                        actionType: 201,
                        taskInfo: {
                            newCatalogID: "",
                            contentInfoList: [file.uuid],
                            catalogInfoList: []
                        },
                        commonAccountInfo: {
                            account: this.clouds.account,
                            accountType: 1
                        }
                    }
                };
                await this.clouds.request(con.API_BASE_URL + "/orchestration/personalCloud/batchOprTask/v1.0/createBatchOprTask", "POST", data);
            } else {
                return {taskType: fso.FSAction.DELETE, taskFlag: fso.FSStatus.FILESYSTEM_ERR};
            }

            return {taskType: fso.FSAction.DELETE, taskFlag: fso.FSStatus.PROCESSING_NOW};
        } catch (error: any) {
            console.error("删除文件失败:", error);
            return {taskType: fso.FSAction.DELETE, taskFlag: fso.FSStatus.FILESYSTEM_ERR};
        }
    }

    /** =======================创建文件或文件夹====================
     * 在指定目录下创建新的文件或文件夹。
     * 支持创建空文件夹和上传文件内容。
     * @param   file - 目标目录查找参数，可包含路径或 UUID
     * @param   name - 要创建的文件或文件夹名称
     * @param   type - 文件类型（文件或文件夹）
     * @param   data - 文件数据（创建文件夹时为 null）
     * @returns Promise<DriveResult> 创建结果，包含新文件ID
     * ===========================================================*/
    async makeFile(file?: fso.FileFind, name?: string | null, type?: fso.FileType, data?: any | null): Promise<DriveResult | null> {
        try {
            if (file?.path && !file?.uuid) {
                const uuid = await this.findUUID(file.path);
                if (uuid) {
                    file.uuid = uuid;
                }
            }
            if (!file?.uuid || !name) {
                return {flag: false, text: "参数错误"};
            }

            // 创建文件夹
            if (type === fso.FileType.F_DIR) {
                if (this.config.type === con.META_PERSONAL_NEW) {
                    const reqData = {
                        parentFileId: file.uuid,
                        name: name.replace(/\/$/, ''),
                        description: "",
                        type: "folder",
                        fileRenameMode: "force_rename"
                    };
                    const result = await this.personalRequest("/file/create", reqData);
                    return {flag: true, text: result.data?.fileId || "success"};
                } else if (this.config.type === con.META_PERSONAL) {
                    const reqData = {
                        createCatalogExtReq: {
                            parentCatalogID: file.uuid,
                            newCatalogName: name.replace(/\/$/, ''),
                            commonAccountInfo: {
                                account: this.clouds.account,
                                accountType: 1
                            }
                        }
                    };
                    await this.clouds.request(con.API_BASE_URL + "/orchestration/personalCloud/catalog/v1.0/createCatalogExt", "POST", reqData);
                    return {flag: true, text: "success"};
                }
            }
            // 上传文件
            else {
                return await this.uploadFile(file.uuid, name, data);
            }

            return {flag: false, text: "不支持的操作"};
        } catch (error: any) {
            console.error("创建文件失败:", error);
            return {flag: false, text: error.message};
        }
    }


    /** =======================上传文件==========================
     * 上传文件到指定目录，是 makeFile 方法的别名。
     * 提供更直观的文件上传接口。
     * @param   file - 目标目录查找参数，可包含路径或 UUID
     * @param   name - 上传文件名称
     * @param   type - 文件类型
     * @param   data - 文件数据
     * @returns Promise<DriveResult> 上传结果，包含新文件ID
     * ===========================================================*/
    async pushFile(file?: fso.FileFind, name?: string | null, type?: fso.FileType, data?: string | any | null): Promise<DriveResult | null> {
        return this.makeFile(file, name, type, data);
    }

    // ==================== 辅助方法 ====================

    /**
     * 根据路径查找文件UUID
     */
    async findUUID(path: string): Promise<string | null> {
        const parts = path.split('/').filter(part => part.trim() !== '');
        if (parts.length === 0 || path === '/') return this.rootFolderId;

        let currentUUID = this.rootFolderId;
        for (const part of parts) {
            const files = await this.listFile({uuid: currentUUID});
            if (!files.fileList) return null;
            const foundFile: fso.FileInfo | undefined = files.fileList.find(f => f.fileName === part.replace(/\/$/, ''));
            if (!foundFile || !foundFile.fileUUID) return null;
            currentUUID = foundFile.fileUUID;
        }
        return currentUUID;
    }

    /**
     * 个人云盘新版 - 获取文件列表
     */
    async personalNewGetFiles(fileId: string): Promise<fso.FileInfo[]> {
        const files: fso.FileInfo[] = [];
        let nextPageCursor = "";

        do {
            const data = {
                imageThumbnailStyleList: ["Small", "Large"],
                orderBy: "updated_at",
                orderDirection: "DESC",
                pageInfo: {pageCursor: nextPageCursor, pageSize: 100},
                parentFileId: fileId
            };
            const result = await this.personalRequest("/file/list", data);
            nextPageCursor = result.data?.nextPageCursor || "";

            for (const item of result.data?.items || []) {
                const isFolder = item.type === "folder";
                files.push({
                    filePath: "",
                    fileUUID: item.fileId,
                    fileName: item.name,
                    fileSize: item.size || 0,
                    fileType: isFolder ? fso.FileType.F_DIR : fso.FileType.F_ALL,
                    timeModify: new Date(item.updatedAt),
                    timeCreate: new Date(item.createdAt),
                    thumbnails: item.thumbnailUrls?.[0]?.url || ""
                });
            }
        } while (nextPageCursor);

        return files;
    }

    /**
     * 个人云盘旧版 - 获取文件列表
     */
    async personalGetFiles(catalogID: string): Promise<fso.FileInfo[]> {
        const files: fso.FileInfo[] = [];
        let start = 0;
        const limit = 100;

        while (true) {
            const data = {
                catalogID,
                sortDirection: 1,
                startNumber: start + 1,
                endNumber: start + limit,
                filterType: 0,
                catalogSortType: 0,
                contentSortType: 0,
                commonAccountInfo: {account: this.clouds.account, accountType: 1}
            };
            const result = await this.clouds.request(con.API_BASE_URL + "/orchestration/personalCloud/catalog/v1.0/getDisk", "POST", data);

            for (const catalog of result.data?.getDiskResult?.catalogList || []) {
                files.push({
                    filePath: "",
                    fileUUID: catalog.catalogID,
                    fileName: catalog.catalogName,
                    fileSize: 0,
                    fileType: fso.FileType.F_DIR,
                    timeModify: this.parseTime(catalog.updateTime),
                    timeCreate: this.parseTime(catalog.createTime)
                });
            }

            for (const content of result.data?.getDiskResult?.contentList || []) {
                files.push({
                    filePath: "",
                    fileUUID: content.contentID,
                    fileName: content.contentName,
                    fileSize: content.contentSize,
                    fileType: fso.FileType.F_ALL,
                    timeModify: this.parseTime(content.updateTime),
                    timeCreate: this.parseTime(content.createTime),
                    thumbnails: content.thumbnailURL
                });
            }

            if (start + limit >= (result.data?.getDiskResult?.nodeCount || 0)) break;
            start += limit;
        }

        return files;
    }

    /**
     * 家庭云 - 获取文件列表
     */
    async familyGetFiles(catalogID: string): Promise<fso.FileInfo[]> {
        console.log("[familyGetFiles] 开始获取家庭云文件列表, catalogID:", catalogID);
        console.log("[familyGetFiles] 配置信息 - cloud_id:", this.config.cloud_id, "account:", this.clouds.account);
        console.log("[familyGetFiles] rootFolderId:", this.rootFolderId);
        console.log("[familyGetFiles] config.type:", this.config.type);
        console.log("[familyGetFiles] config.root_folder_id:", this.config.root_folder_id);
        
        const files: fso.FileInfo[] = [];
        let pageNum = 1;

        while (true) {
            // 对于家庭云，如果catalogID是"/"或等于cloud_id，需要特殊处理
            let actualCatalogID = catalogID;
            if (catalogID === "/" || catalogID === this.config.cloud_id) {
                // 家庭云根目录可能需要使用空字符串或特定值
                actualCatalogID = "";
                console.log("[familyGetFiles] 检测到根目录访问，将catalogID从", catalogID, "改为空字符串");
            }
            
            const data = {
                catalogID: actualCatalogID,
                contentSortType: 0,
                pageInfo: {pageNum, pageSize: 100},
                sortDirection: 1,
                catalogType: 3,
                cloudID: this.config.cloud_id,
                cloudType: 1,
                commonAccountInfo: {account: this.clouds.account, accountType: 1}
            };
            console.log(`[familyGetFiles] 第${pageNum}页请求参数:`, JSON.stringify(data, null, 2));
            
            const result = await this.clouds.request(con.API_BASE_URL + "/orchestration/familyCloud-rebuild/content/v1.2/queryContentList", "POST", data);
            console.log(`[familyGetFiles] 第${pageNum}页响应结果:`, JSON.stringify(result, null, 2));
            console.log(`[familyGetFiles] 第${pageNum}页 - cloudCatalogList长度:`, result.data?.cloudCatalogList?.length || 0);
            console.log(`[familyGetFiles] 第${pageNum}页 - cloudContentList长度:`, result.data?.cloudContentList?.length || 0);
            console.log(`[familyGetFiles] 第${pageNum}页 - totalCount:`, result.data?.totalCount || 0);

            for (const catalog of result.data?.cloudCatalogList || []) {
                console.log("[familyGetFiles] 添加目录:", catalog.catalogName, "ID:", catalog.catalogID);
                files.push({
                    filePath: "",
                    fileUUID: catalog.catalogID,
                    fileName: catalog.catalogName,
                    fileSize: 0,
                    fileType: fso.FileType.F_DIR,
                    timeModify: this.parseTime(catalog.lastUpdateTime),
                    timeCreate: this.parseTime(catalog.createTime)
                });
            }

            for (const content of result.data?.cloudContentList || []) {
                console.log("[familyGetFiles] 添加文件:", content.contentName, "ID:", content.contentID, "大小:", content.contentSize);
                files.push({
                    filePath: "",
                    fileUUID: content.contentID,
                    fileName: content.contentName,
                    fileSize: content.contentSize,
                    fileType: fso.FileType.F_ALL,
                    timeModify: this.parseTime(content.lastUpdateTime),
                    timeCreate: this.parseTime(content.createTime),
                    thumbnails: content.thumbnailURL
                });
            }

            const totalCount = result.data?.totalCount || 0;
            console.log(`[familyGetFiles] 第${pageNum}页处理完成, 当前文件总数:`, files.length, "totalCount:", totalCount);
            
            if (totalCount === 0) {
                console.log("[familyGetFiles] totalCount为0，退出循环");
                break;
            }
            pageNum++;
        }

        console.log("[familyGetFiles] 最终返回文件数量:", files.length);
        return files;
    }

    /**
     * 群组云 - 获取文件列表
     */
    async groupGetFiles(catalogID: string): Promise<fso.FileInfo[]> {
        const files: fso.FileInfo[] = [];
        let pageNum = 1;

        while (true) {
            const data = {
                groupID: this.config.cloud_id,
                catalogID,
                contentSortType: 0,
                sortDirection: 1,
                startNumber: pageNum,
                endNumber: pageNum + 99,
                path: this.rootFolderId + "/" + catalogID,
                catalogType: 3,
                cloudID: this.config.cloud_id,
                cloudType: 1,
                commonAccountInfo: {account: this.clouds.account, accountType: 1}
            };
            const result = await this.clouds.request(con.API_BASE_URL + "/orchestration/group-rebuild/content/v1.0/queryGroupContentList", "POST", data);

            for (const catalog of result.data?.getGroupContentResult?.catalogList || []) {
                files.push({
                    filePath: "",
                    fileUUID: catalog.catalogID,
                    fileName: catalog.catalogName,
                    fileSize: 0,
                    fileType: fso.FileType.F_DIR,
                    timeModify: this.parseTime(catalog.updateTime),
                    timeCreate: this.parseTime(catalog.createTime)
                });
            }

            for (const content of result.data?.getGroupContentResult?.contentList || []) {
                files.push({
                    filePath: "",
                    fileUUID: content.contentID,
                    fileName: content.contentName,
                    fileSize: content.contentSize,
                    fileType: fso.FileType.F_ALL,
                    timeModify: this.parseTime(content.updateTime),
                    timeCreate: this.parseTime(content.createTime),
                    thumbnails: content.thumbnailURL
                });
            }

            if (pageNum + 99 > (result.data?.getGroupContentResult?.nodeCount || 0)) break;
            pageNum += 100;
        }

        return files;
    }

    /**
     * 个人云盘新版 - 获取下载链接
     */
    async personalNewGetLink(fileId: string): Promise<string> {
        const data = {fileId};
        const result = await this.personalRequest("/file/getDownloadUrl", data);
        return result.data?.cdnUrl || result.data?.url || "";
    }

    /**
     * 个人云盘旧版 - 获取下载链接
     */
    async personalGetLink(contentId: string): Promise<string> {
        const data = {
            appName: "",
            contentID: contentId,
            commonAccountInfo: {account: this.clouds.account, accountType: 1}
        };
        const result = await this.clouds.request(con.API_BASE_URL + "/orchestration/personalCloud/uploadAndDownload/v1.0/downloadRequest", "POST", data);
        return result.data?.downloadURL || "";
    }

    /**
     * 家庭云 - 获取下载链接
     */
    async familyGetLink(contentId: string, path: string): Promise<string> {
        const data = {
            contentID: contentId,
            path,
            catalogType: 3,
            cloudID: this.config.cloud_id,
            cloudType: 1,
            commonAccountInfo: {account: this.clouds.account, accountType: 1}
        };
        const result = await this.clouds.request(con.API_BASE_URL + "/orchestration/familyCloud-rebuild/content/v1.0/getFileDownLoadURL", "POST", data);
        return result.data?.downloadURL || "";
    }

    /**
     * 群组云 - 获取下载链接
     */
    async groupGetLink(contentId: string, path: string): Promise<string> {
        const data = {
            contentID: contentId,
            groupID: this.config.cloud_id,
            path,
            catalogType: 3,
            cloudID: this.config.cloud_id,
            cloudType: 1,
            commonAccountInfo: {account: this.clouds.account, accountType: 1}
        };
        const result = await this.clouds.request(con.API_BASE_URL + "/orchestration/group-rebuild/groupManage/v1.0/getGroupFileDownLoadURL", "POST", data);
        return result.data?.downloadURL || "";
    }

    /**
     * 上传文件
     */
    async uploadFile(parentId: string, name: string, data: any): Promise<DriveResult | null> {
        try {
            if (this.config.type === con.META_PERSONAL_NEW) {
                // 简化版上传，不支持秒传和分片
                const buffer = await data?.arrayBuffer();
                const reqData = {
                    parentFileId: parentId,
                    name: name,
                    type: "file",
                    size: buffer.byteLength,
                    fileRenameMode: "auto_rename"
                };
                const result = await this.personalRequest("/file/create", reqData);
                return {flag: true, text: result.data?.fileId || "success"};
            }
            return {flag: false, text: "暂不支持此云盘类型的上传"};
        } catch (error: any) {
            return {flag: false, text: error.message};
        }
    }

    /**
     * 个人云盘新版 - 发送请求
     */
    async personalRequest(pathname: string, data: any): Promise<any> {
        const url = this.clouds.personalCloudHost + pathname;
        const randStr = this.clouds.randomString(16);
        const ts = new Date().toISOString().replace('T', ' ').substring(0, 19);
        const bodyStr = JSON.stringify(data);
        const sign = this.clouds.calSign(bodyStr, ts, randStr);

        const headers: Record<string, string> = {
            'Accept': 'application/json, text/plain, */*',
            'Authorization': 'Basic ' + this.config.authorization,
            'Caller': 'web',
            'Cms-Device': 'default',
            'Mcloud-Channel': con.MCLOUD_CHANNEL,
            'Mcloud-Client': con.MCLOUD_CLIENT,
            'Mcloud-Route': '001',
            'Mcloud-Sign': `${ts},${randStr},${sign}`,
            'Mcloud-Version': con.MCLOUD_VERSION,
            'x-DeviceInfo': con.X_DEVICE_INFO,
            'x-huawei-channelSrc': con.X_HUAWEI_CHANNEL_SRC,
            'x-inner-ntwk': '2',
            'x-m4c-caller': 'PC',
            'x-m4c-src': '10002',
            'x-SvcType': '1',
            'X-Yun-Api-Version': 'v1',
            'X-Yun-App-Channel': '10000034',
            'X-Yun-Channel-Source': '10000034',
            'X-Yun-Module-Type': '100',
            'X-Yun-Svc-Type': '1',
            'Content-Type': 'application/json'
        };

        const response = await fetch(url, {method: 'POST', headers, body: bodyStr});
        return await response.json();
    }

    /**
     * 解析时间字符串
     */
    parseTime(timeStr: string): Date {
        if (!timeStr) return new Date();
        // 格式：20060102150405
        if (timeStr.length === 14) {
            const year = parseInt(timeStr.substring(0, 4));
            const month = parseInt(timeStr.substring(4, 6)) - 1;
            const day = parseInt(timeStr.substring(6, 8));
            const hour = parseInt(timeStr.substring(8, 10));
            const minute = parseInt(timeStr.substring(10, 12));
            const second = parseInt(timeStr.substring(12, 14));
            return new Date(year, month, day, hour, minute, second);
        }
        return new Date(timeStr);
    }
}