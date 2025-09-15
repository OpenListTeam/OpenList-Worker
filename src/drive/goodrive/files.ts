import {HostClouds} from "./utils"
import {BasicDriver} from "../BasicDriver";
import {google} from 'googleapis';
import {Context} from "hono";
import * as fso from "../../files/FilesObject";
import {FileInfo, FileType, PathInfo} from "../../files/FilesObject";
import {drive_v3} from "googleapis/build/src/apis/drive/v3";
import {Readable} from "node:stream";


export class HostDriver extends BasicDriver {
    public configData: Record<string, any>
    public serverData: Record<string, any>
    public driverUtil: HostClouds
    public router: string
    public driver: drive_v3.Drive | undefined
    public client: OAuth2Client | undefined
    public c: Context

    constructor(
        c: Context, router: string,
        public in_configData: Record<string, any>,
        public in_serverData: Record<string, any>,
    ) {
        super(c, router);
        this.c = c;
        this.router = router;
        this.configData = in_configData;
        this.serverData = in_serverData;
        this.driverUtil = new HostClouds(
            this.c, this.router,
            this.configData,
            this.serverData
        )
    }

    // 初始驱动 =========================================================
    async initSelf(): Promise<boolean> {
        const result: boolean = await this.driverUtil.initConfig();
        this.serverData = this.driverUtil.saving;
        this.change = true;
        return result;
    }

    // 载入驱动 =========================================================
    async loadSelf(): Promise<boolean> {
        if (this.driver) return false;
        this.client = await this.driverUtil.loadSaving();
        this.driver = google.drive({version: 'v3', auth: this.client});
        this.change = this.driverUtil.change;
        this.serverData = this.driverUtil.saving;
        return true;
    }

    // 列出目录 =========================================================
    async listFile(filePath?: string, fileUUID?: string | null): Promise<PathInfo> {
        if (filePath) fileUUID = await this.findUUID(filePath);
        if (!fileUUID) return {fileList: [], pageSize: 0};
        // console.log("findFile: ", fileUUID);
        const result: FileInfo[] = await this.findPath(fileUUID)
        return {
            pageSize: result.length,
            filePath: filePath,
            fileList: result,
        };
    }

    // 下载文件 =========================================================
    async downFile(filePath?: string | null, fileUUID?: string | null):
        Promise<fso.FileLink[] | null> {
        if (filePath) fileUUID = await this.findUUID(filePath);
        let url: string = "https://www.googleapis.com/drive/v3/files/"
        url += fileUUID + "?includeItemsFromAllDrives=true"
        url += "&supportsAllDrives=true&alt=media&acknowledgeAbuse=true"
        let bearer: string = "Bearer " + this.driverUtil.saving.credentials.access_token
        let file_link: fso.FileLink = {
            direct: url,
            header: {"Authorization": bearer}
        }
        return [file_link]
    }

    // 移动文件 =========================================================
    async copyFile(filePath?: string | null, destPath?: string | null,
                   fileUUID?: string | null, destUUID?: string | null):
        Promise<fso.FileTask | null> {
        if (filePath) fileUUID = await this.findUUID(filePath);
        if (destPath) destUUID = await this.findUUID(destPath);
        if (!fileUUID || !destUUID || !this.driver) return null;
        console.log("@copyFile", fileUUID, destUUID);
        try {
            const file: any = await this.driver.files.copy({
                fileId: fileUUID,
                requestBody: {
                    parents: [destUUID]
                }
            });
            return null;
        } catch (err) {
            throw err;
        }
    }

    // 移动文件 =========================================================
    async moveFile(filePath?: string | null, destPath?: string | null,
                   fileUUID?: string | null, destUUID?: string | null):
        Promise<fso.FileTask | null> {
        if (filePath) fileUUID = await this.findUUID(filePath);
        if (destPath) destUUID = await this.findUUID(destPath);
        console.log("@moveFile", fileUUID, destUUID);
        await this.copyFile(null, null, fileUUID, destUUID);
        await this.killFile(null, fileUUID);
        return null;
    }


    // 删除文件 =========================================================
    async killFile(filePath?: string | null, fileUUID?: string | null):
        Promise<fso.FileTask | null> {
        if (filePath) fileUUID = await this.findUUID(filePath);
        if (!fileUUID || !this.driver) return null;
        console.log("@killFile", fileUUID);
        const result = await this.driver.files.delete({
            fileId: fileUUID,
            // requestBody: {'trashed': true},
        });
        return null;
    }

    // 创建文件 =========================================================
    async makeFile(filePath?: string | null, destName?: string | null,
                   fileType?: FileType | null, fileUUID?: string | null,
                   content?: any | null): Promise<fso.FileTask | null> {
        if (filePath) fileUUID = await this.findUUID(filePath);
        if (!fileUUID || !destName || !this.driver) return null;
        let mimeType: string = content?.type || 'application/octet-stream'
        if (fileType === FileType.F_DIR) {
            mimeType = 'application/vnd.google-apps.folder'
            destName = destName.replace(/\/$/, '')
        }
        try {
            if (fileType === FileType.F_DIR) {
                const requestBody = {
                    name: destName,
                    mimeType: mimeType,
                    parents: [fileUUID],
                }
                const media = fileType === FileType.F_DIR ? undefined : {
                    mimeType: mimeType,
                    body: content ? Readable.from(array) : ""
                }
                // console.log("@makeFile", requestBody, media);
                const file: any = await this.driver.files.create({
                    requestBody,
                    media,
                    fields: 'id',
                });
                // console.log('File Id:', file.data.id);
                return ({flag: true, text: file.data.id});
            } else {
                const buffer = await content.arrayBuffer()
                const boundary = 'foo_bar_baz'
                const meta = JSON.stringify({
                    name: content.name,
                    parents: [fileUUID],
                    mimeType: content.type || 'application/octet-stream'
                })
                const body = new Blob([
                    `--${boundary}\r\n` +
                    `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
                    `${meta}\r\n` +
                    `--${boundary}\r\n` +
                    `Content-Type: ${content.type || 'application/octet-stream'}\r\n\r\n`,
                    new Uint8Array(buffer),   // ← 二进制
                    `\r\n--${boundary}--`
                ], {type: `multipart/related; boundary=${boundary}`})
                const result = await fetch(
                    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id',
                    {
                        method: 'POST',
                        headers: {Authorization: `Bearer ${this.driverUtil.saving.credentials.access_token}`},
                        body
                    }
                )
                return ({flag: true, text: (await result.json()).id});
            }
        } catch (err) {
            throw err;
        }
    }


    // 上传文件 =========================================================
    async pushFile(filePath?: string | null, destName?: string | null,
                   fileType?: FileType | null, content?: string | any | null):
        Promise<fso.FileTask | null> {
        return this.makeFile(filePath, destName, fileType, null, content);
    }


    // 读取UUID =========================================================
    async findUUID(filePath: string): Promise<string | null> {
        const parts: string[] = filePath.split('/').filter(part => part.trim() !== '');
        console.log("Dir Find: ", filePath, parts);
        if (parts.length === 0) return 'root';
        let currentUUID: string = 'root';
        console.log("Now UUID:", currentUUID);
        for (const part of parts) {
            const files: FileInfo[] = await this.findPath(currentUUID);
            const foundFile: FileInfo | undefined = files.find(
                file => file.fileName === part.replace(/\/$/, ''));
            if (!foundFile || !foundFile.fileUUID) return null;
            currentUUID = foundFile.fileUUID;
            console.log("Now UUID:", currentUUID);
        }
        return currentUUID;
    }

    // 读取目录 =========================================================
    async findPath(fileUUID: string = "root"): Promise<FileInfo[]> {
        try {
            let file_all: fso.FileInfo[] = [];
            // console.log("findPath: ", fileUUID);
            if (!this.driver) return [];
            const result: Record<string, any> = await this.driver.files.list({
                // pageSize: 10,
                fields: 'files(id,name,mimeType,size,modifiedTime,' +
                    'createdTime,thumbnailLink,shortcutDetails,md5Checksum,' +
                    'sha1Checksum,sha256Checksum),nextPageToken',
                q: `'${fileUUID}' in parents and trashed = false`
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