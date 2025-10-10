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
    public driver: drive_v3.Drive | undefined
    public client: OAuth2Client | undefined

    constructor(
        c: Context, router: string,
        config: Record<string, any>,
        saving: Record<string, any>,
    ) {
        super(c, router, config, saving);
        this.clouds = new HostClouds(c, router, config, saving);
    }


    async initSelf(): Promise<DriveResult> {
        const result: DriveResult = await this.clouds.initConfig();
        this.saving = this.clouds.saving;
        this.change = true;
        return result;
    }

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

    async copyFile(file?: fso.FileFind,
                   dest?: fso.FileFind):
        Promise<fso.FileTask> {

        if (!this.driver || !this.driver.files)
            return {taskFlag: fso.FSStatus.FILESYSTEM_ERR};
        if (file?.path) file.uuid = await this.findUUID(file.path);
        if (dest?.path) dest.uuid = await this.findUUID(dest.path);
        if (!dest?.uuid) return {taskFlag: fso.FSStatus.FILESYSTEM_ERR};
        if (!file?.uuid) return {taskFlag: fso.FSStatus.FILESYSTEM_ERR};
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

    async makeFile(file?: fso.FileFind,  // 上传文件(夹)路径
                   name?: string | null, // 上传文件(夹)名称
                   type?: fso.FileType,  // 上传文件所属类型
                   data?: any | null): Promise<DriveResult | null> {
        console.log("@FSMake", file, name, type, data);
        if (file?.path) {
            // file.path 就是我们要在其中创建文件的目录路径
            console.log("@FSMake Target Directory:", file.path);
            file.uuid = await this.findUUID(file.path);
            console.log("@FSMake Target Directory UUID:", file.uuid);
        }
        if (!file?.uuid || !name || !this.driver) return null;
        let mime: string = data?.type || 'application/octet-stream'
        if (type === fso.FileType.F_DIR) {
            mime = 'application/vnd.google-apps.folder'
            name = name.replace(/\/$/, '')
        }
        try {
            if (type === fso.FileType.F_DIR) {
                console.log("Upload Files:", name)
                const result: any = await this.driver.files.create({
                    requestBody: {
                        name: name,
                        mimeType: mime,
                        parents: [file?.uuid],
                    },
                    fields: 'id',
                });
                return ({flag: true, text: result.data.id});
            } else {

                const buffer: any = await data?.arrayBuffer()
                const boundary: string = 'foo_bar_baz'
                const meta: string = JSON.stringify({
                    name: name ? name : data?.name || 'NoName',
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
                // console.log("Upload result:", await result.text())
                return ({flag: true, text: (await result.json()).id});
            }
        } catch (err) {
            throw err;
        }
    }

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
        if (parts.length === 0 || path === '/') return 'root';
        let currentUUID: string = 'root';
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