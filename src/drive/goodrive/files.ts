/** =========== Google Drive 文件操作驱动器 ================
 * 本文件实现了Google Drive云存储服务的文件操作功能，包括：
 * - 文件和文件夹列表、创建、删除、移动、复制、上传、下载
 * - Google Drive API 的认证和初始化\路径解析和 UUID 查找
 * - 该驱动器继承自 BasicDriver，实现标准统一的云存储接口
 * =========================================================
 * @author "Pikachu Ren"
 * @version 25.09.26
 * =======================================================*/

// 公用导入 ================================================
import {Context} from "hono";
import {HostClouds} from "./utils"
import {BasicDriver} from "../BasicDriver";
import {DriveResult} from "../DriveObject";
import * as fso from "../../files/FilesObject";
// 专用导入 ================================================
import {google} from 'googleapis';
import {Readable} from "node:stream";
import {drive_v3} from "googleapis/build/src/apis/drive/v3";
import {OAuth2Client} from 'google-auth-library';

/**
 * Google Drive 文件操作驱动器类
 * 
 * 继承自 BasicDriver，实现了 Google Drive 云存储的完整文件操作功能。
 * 通过 Google Drive API v3 提供文件的增删改查、上传下载等操作。
 */
export class HostDriver extends BasicDriver {
    /**
     * Google Drive API 驱动实例
     * 用于执行所有的 Google Drive API 操作
     */
    public driver: drive_v3.Drive | undefined
    
    /**
     * OAuth2 认证客户端
     * 用于处理 Google Drive API 的身份验证
     */
    public client: OAuth2Client | undefined

    /**
     * 构造函数
     * 
     * @param c - Hono 上下文对象
     * @param router - 路由器标识
     * @param config - 配置信息
     * @param saving - 保存的认证信息
     */
    constructor(
        c: Context, router: string,
        config: Record<string, any>,
        saving: Record<string, any>,
    ) {
        super(c, router, config, saving);
        this.clouds = new HostClouds(c, router, config, saving);
    }

    /**
     * 初始化驱动器配置
     * 
     * 初始化 Google Drive 驱动器的基本配置信息，
     * 包括认证配置和基础设置的准备工作。
     * 
     * @returns Promise<DriveResult> 初始化结果，包含成功标志和相关信息
     */
    async initSelf(): Promise<DriveResult> {
        const result: DriveResult = await this.clouds.initConfig();
        this.saving = this.clouds.saving;
        this.change = true;
        return result;
    }

    /**
     * 加载驱动器实例
     * 
     * 加载 Google Drive API 客户端实例，建立与 Google Drive 服务的连接。
     * 如果驱动器已经加载，则直接返回成功状态。
     * 
     * @returns Promise<DriveResult> 加载结果，包含成功标志和状态信息
     */
    async loadSelf(): Promise<DriveResult> {
        if (this.driver) return {flag: true, text: "already loaded"};
        this.client = await this.clouds.loadSaving();
        this.driver = google.drive({version: 'v3', auth: this.client});
        this.change = this.clouds.change;
        this.saving = this.clouds.saving;
        return {
            flag: true,
            text: "loadSelf"
        };
    }

    /** =======================列出目录内容========================
     * 获取指定目录下的所有文件和子目录信息。
     * 如果提供路径，会先解析为 UUID；如果提供 UUID，则直接使用。
     * @param   file - 文件查找参数，可包含路径或 UUID
     * @returns Promise<fso.PathInfo> 目录信息，包含文件列表统计信息
     * ===========================================================*/
    async listFile(file?: fso.FileFind): Promise<fso.PathInfo> {
        if (file?.path) file.uuid = await this.findUUID(file.path);
        if (!file?.uuid) return {fileList: [], pageSize: 0};
        const result: fso.FileInfo[] = await this.findPath(file?.uuid)
        return {
            pageSize: result.length,
            filePath: file?.path,
            fileList: result,
        };
    }

    /**
     * 获取文件下载链接
     * 
     * 生成指定文件的直接下载链接，包含必要的认证头信息。
     * 支持通过路径或 UUID 定位文件。
     * 
     * @param file - 文件查找参数，可包含路径或 UUID
     * @returns Promise<fso.FileLink[] | null> 文件下载链接数组，包含 URL 和认证头
     */
    async downFile(file?: fso.FileFind):
        Promise<fso.FileLink[] | null> {
        if (file?.path) file.uuid = await this.findUUID(file.path);
        if (!file?.uuid) return [{status: false, result: "No UUID"}];
        let url: string = "https://www.googleapis.com/drive/v3/files/"
        let key: string = this.clouds.saving.credentials.access_token;
        url += file?.uuid + "?includeItemsFromAllDrives=true"
        url += "&supportsAllDrives=true&alt=media&acknowledgeAbuse=true"
        let file_link: fso.FileLink = {
            direct: url, header: {"Authorization": "Bearer " + key}
        }
        return [file_link]
    }

    /**
     * 复制文件或文件夹
     * 
     * 将指定的文件或文件夹复制到目标目录。
     * 支持通过路径或 UUID 定位源文件和目标目录。
     * 
     * @param file - 源文件查找参数，可包含路径或 UUID
     * @param dest - 目标目录查找参数，可包含路径或 UUID
     * @returns Promise<fso.FileTask> 文件任务状态，包含任务类型和执行状态
     * @throws 当 API 调用失败时抛出异常
     */
    async copyFile(file?: fso.FileFind,
                   dest?: fso.FileFind):
        Promise<fso.FileTask> {

        if (!this.driver || !this.driver.files)
            return {taskFlag: fso.FSStatus.FILESYSTEM_ERR};
        if (!dest?.uuid) return {taskFlag: fso.FSStatus.FILESYSTEM_ERR};
        if (!file?.uuid) return {taskFlag: fso.FSStatus.FILESYSTEM_ERR};
        if (file?.path) file.uuid = await this.findUUID(file.path);
        if (dest?.path) dest.uuid = await this.findUUID(dest.path);
        try {
            const result: any = this.driver.files.copy({// @ts-ignore
                fileId: file.uuid, requestBody: {parents: [dest.uuid]}
            });
            return {
                taskType: fso.FSAction.COPYTO,
                taskFlag: fso.FSStatus.PROCESSING_NOW
            };
        } catch (err) {
            throw err;
        }
    }

    /**
     * 移动文件或文件夹
     * 
     * 将指定的文件或文件夹移动到目标目录。
     * 实现方式是先复制到目标位置，然后删除原文件。
     * 
     * @param file - 源文件查找参数，可包含路径或 UUID
     * @param dest - 目标目录查找参数，可包含路径或 UUID
     * @returns Promise<fso.FileTask> 文件任务状态，包含任务类型和执行状态
     */
    async moveFile(file?: fso.FileFind, dest?: fso.FileFind):
        Promise<fso.FileTask> {
        if (file?.path) file.uuid = await this.findUUID(file.path);
        if (dest?.path) dest.uuid = await this.findUUID(dest.path);
        await this.copyFile({uuid: file?.uuid}, {uuid: dest?.uuid});
        await this.killFile({uuid: file?.uuid});
        return {
            taskType: fso.FSAction.MOVETO,
            taskFlag: fso.FSStatus.PROCESSING_NOW
        };
    }

    /**
     * 删除文件或文件夹
     * 
     * 永久删除指定的文件或文件夹。
     * 支持通过路径或 UUID 定位要删除的文件。
     * 
     * @param file - 文件查找参数，可包含路径或 UUID
     * @returns Promise<fso.FileTask> 文件任务状态，包含任务类型和执行状态
     */
    async killFile(file?: fso.FileFind):
        Promise<fso.FileTask> {
        if (file?.path) file.uuid = await this.findUUID(file.path);
        if (!file?.uuid || !this.driver) return {
            taskType: fso.FSAction.MOVETO,
            taskFlag: fso.FSStatus.FILESYSTEM_ERR
        };
        console.log("@killFile", file?.uuid);
        const result: any = await this.driver.files.delete({
            fileId: file?.uuid,
        });
        return {
            taskType: fso.FSAction.MOVETO,
            taskFlag: fso.FSStatus.PROCESSING_NOW
        };
    }

    /**
     * 创建文件或文件夹
     * 
     * 在指定目录下创建新的文件或文件夹。
     * 支持创建空文件夹和上传文件内容。
     * 
     * @param file - 目标目录查找参数，可包含路径或 UUID
     * @param name - 要创建的文件或文件夹名称
     * @param type - 文件类型（文件或文件夹）
     * @param data - 文件数据（创建文件夹时为 null）
     * @returns Promise<DriveResult | null> 创建结果，包含新文件的 ID
     * @throws 当 API 调用失败时抛出异常
     */
    async makeFile(file?: fso.FileFind,  // 上传文件(夹)路径
                   name?: string | null, // 上传文件(夹)名称
                   type?: fso.FileType,  // 上传文件所属类型
                   data?: any | null): Promise<DriveResult | null> {
        if (file?.path) file.uuid = await this.findUUID(file.path);
        if (!file?.uuid || !name || !this.driver) return null;
        let mime: string = data?.type || 'application/octet-stream'
        if (type === fso.FileType.F_DIR) {
            mime = 'application/vnd.google-apps.folder'
            name = name.replace(/\/$/, '')
        }
        try {
            if (type === fso.FileType.F_DIR) {
                const result: any = await this.driver.files.create({
                    requestBody: {
                        name: name,
                        mimeType: mime,
                        parents: [file?.uuid],
                    },
                    media: type === fso.FileType.F_DIR ? undefined : {
                        mimeType: mime,
                        body: data ? Readable.from(await data.arrayBuffer()) : ""
                    },
                    fields: 'id',
                });
                return ({flag: true, text: result.data.id});
            } else {
                const buffer: any = await data?.arrayBuffer()
                const boundary: string = 'foo_bar_baz'
                const meta: string = JSON.stringify({
                    name: data?.name,
                    parents: [file?.uuid],
                    mimeType: data?.type || 'application/octet-stream'
                })
                const body = new Blob([
                    `--${boundary}\r\n` +
                    `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
                    `${meta}\r\n` +
                    `--${boundary}\r\n` +
                    `Content-Type: ${data?.type || 'application/octet-stream'}\r\n\r\n`,
                    new Uint8Array(buffer),   // ← 二进制
                    `\r\n--${boundary}--`
                ], {type: `multipart/related; boundary=${boundary}`})
                const result = await fetch(
                    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id',
                    {
                        method: 'POST',
                        headers: {Authorization: `Bearer ${this.clouds.saving.credentials.access_token}`},
                        body
                    }
                )
                return ({flag: true, text: (await result.json()).id});
            }
        } catch (err) {
            throw err;
        }
    }


    /**
     * 上传文件
     * 
     * 上传文件到指定目录，是 makeFile 方法的别名。
     * 提供更直观的文件上传接口。
     * 
     * @param file - 目标目录查找参数，可包含路径或 UUID
     * @param name - 上传文件名称
     * @param type - 文件类型
     * @param data - 文件数据
     * @returns Promise<DriveResult | null> 上传结果，包含新文件的 ID
     */
    async pushFile(file?: fso.FileFind,
                   name?: string | null,
                   type?: fso.FileType,
                   data?: string | any | null):
        Promise<DriveResult | null> {
        return this.makeFile(file, name, type, data);
    }


    /**
     * 根据路径查找文件 UUID
     * 
     * 将文件系统路径转换为 Google Drive 的文件 UUID。
     * 通过逐级遍历路径中的每个目录来定位最终文件。
     * 
     * @param path - 文件或目录的完整路径
     * @returns Promise<string | null> 对应的 UUID，如果路径不存在则返回 null
     */
    async findUUID(path: string): Promise<string | null> {
        const parts: string[] = path.split('/').filter(part => part.trim() !== '');
        console.log("DirFind", path, parts);
        if (parts.length === 0) return 'root';
        let currentUUID: string = 'root';
        console.log("NowUUID", currentUUID);
        for (const part of parts) {
            const files: fso.FileInfo[] = await this.findPath(currentUUID);
            const foundFile: fso.FileInfo | undefined = files.find(
                file => file.fileName === part.replace(/\/$/, ''));
            if (!foundFile || !foundFile.fileUUID) return null;
            currentUUID = foundFile.fileUUID;
            console.log("Now UUID:", currentUUID);
        }
        return currentUUID;
    }

    /**
     * 根据 UUID 获取目录内容
     * 
     * 获取指定 UUID 目录下的所有文件和子目录信息。
     * 包含文件的详细元数据，如大小、修改时间、哈希值等。
     * 
     * @param uuid - 目录的 UUID，默认为 "root"（根目录）
     * @returns Promise<fso.FileInfo[]> 文件信息数组，包含目录下所有项目的详细信息
     */
    async findPath(uuid: string = "root"): Promise<fso.FileInfo[]> {
        try {
            let file_all: fso.FileInfo[] = [];
            if (!this.driver) return [];
            const result: Record<string, any> = await this.driver.files.list({
                // pageSize: 10,
                fields: 'files(id,name,mimeType,size,modifiedTime,' +
                    'createdTime,thumbnailLink,shortcutDetails,md5Checksum,' +
                    'sha1Checksum,sha256Checksum),nextPageToken',
                q: `'${uuid}' in parents and trashed = false`
            });
            for (const now_file of result.data.files) {
                console.log(` ${now_file.id} \t${now_file.name} \t${now_file.size}`);
                file_all.push({
                    filePath: "",
                    fileUUID: now_file.id,
                    fileName: now_file.name,
                    fileSize: now_file.size || 0,
                    fileType: now_file.mimeType == "application/vnd.google-apps.folder" ? 0 : 1,
                    fileHash: {
                        md5: now_file.md5Checksum,
                        sha1: now_file.sha1Checksum,
                        sha256: now_file.sha256Checksum,
                    },
                    thumbnails: now_file.thumbnailLink,
                    timeModify: new Date(now_file.modifiedTime),
                    timeCreate: new Date(now_file.createdTime)
                });
            }
            return file_all;
        } catch (err) {
            console.error(err);
            return [];
        }
    }

}