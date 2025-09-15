import {HostClouds} from "./utils"
import {BasicDriver} from "../BasicDriver";
import {google} from 'googleapis';
import {Context} from "hono";
import {JSONClient} from "google-auth-library/build/src/auth/googleauth";
import * as fso from "../files/FilesObject";


export class HostDriver extends BasicDriver {
    public configData: Record<string, any>
    public serverData: Record<string, any>
    public driverUtil: HostClouds
    public router: string
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
        const result: boolean = await this.driverUtil.loadSaving();
        this.change = this.driverUtil.change;
        this.serverData = this.driverUtil.saving;
        return result;
    }

    // 列出文件 =========================================================
    async listFile(filePath: string): Promise<any | FileInfo[]> {
        const client: JSONClient | any = await this.driverUtil.loadSaving()
        const driver: any = google.drive({version: 'v3', auth: client});
        try {
            let file_all: fso.FileInfo[] = [];
            const result: Record<string, any> = await driver.files.list({
                // pageSize: 10,
                fields: 'files(id,name,mimeType,size,modifiedTime,' +
                    'createdTime,thumbnailLink,shortcutDetails,md5Checksum,' +
                    'sha1Checksum,sha256Checksum),nextPageToken',
                q: "'root' in parents and trashed = false"
            });
            for (const now_file of result.data.files) {
                console.log(` ${now_file.id} \t${now_file.size} \t${now_file.mimeType}
                 \t${now_file.md5Checksum} \t${now_file.name}`);
                file_all.push({
                    fileUUID: now_file.id,
                    fileName: now_file.name,
                    fileSize: now_file.size || 0,
                    fileType: now_file.mimeType == "application/vnd.google-apps.folder" ? 0 : 1,
                    fileUUID: now_file.id,
                    fileHash: {
                        md5Checksum: now_file.md5Checksum,
                        sha1Checksum: now_file.sha1Checksum,
                        sha256Checksum: now_file.sha256Checksum,
                    },
                    thumbnails: now_file.thumbnailLink,
                    timeModify: new Date(now_file.modifiedTime),
                    timeCreate: new Date(now_file.createdTime),
                });
            }
            return file_all;
        } catch (err) {
            console.error(err);
            return [];
        }

    }

    // 删除文件 =========================================================
    async killFile(filePath: string): Promise<fso.FileTask | null> {
        const client: JSONClient | any = await this.driverUtil.loadSaving()
        const driver: any = google.drive({version: 'v3', auth: client});
        const result = await driver.files.update({
            fileId: "",
            requestBody: {'trashed': true},
        });
        console.log(result);
        return null;
    }

    // 创建文件 =========================================================
    async makePath(filePath: string): Promise<fso.FileTask | null> {
        const client: JSONClient | any = await this.driverUtil.loadSaving()
        const driver: any = google.drive({version: 'v3', auth: client});
        try {
            const file = await driver.files.create({
                requestBody: {
                    name: 'Invoices',
                    mimeType: 'application/vnd.google-apps.folder',
                },
                fields: 'id',
            });
            console.log('Folder Id:', file.data.id);
            // return tasks.data.id;
            return null
        } catch (err) {
            // TODO(developer) - Handle error
            throw err;
        }
    }

    // 创建文件 =========================================================
    async makeFile(filePath: string): Promise<fso.FileTask | null> {
        const client: JSONClient | any = await this.driverUtil.loadSaving()
        const driver: any = google.drive({version: 'v3', auth: client});
        try {
            const file = await driver.files.create({
                requestBody: {
                    name: 'photo.jpg',
                    parents: [''],
                },
                media: {
                    mimeType: 'text/plain',
                    body: "",
                },
                fields: 'id',
            });
            console.log('File Id:', file.data.id);
            // return tasks.data.id;
            return null
        } catch (err) {
            // TODO(developer) - Handle error
            throw err;
        }
    }

    // 移动文件 =========================================================
    async moveFile(filePath: string): Promise<fso.FileTask | null> {
        const client: JSONClient | any = await this.driverUtil.loadSaving()
        const driver: any = google.drive({version: 'v3', auth: client});
        try {
            const file = await driver.files.move({});
            return null
        } catch (err) {
            throw err;
        }
    }

    // 移动文件 =========================================================
    async copyFile(filePath: string): Promise<fso.FileTask | null> {
        const client: JSONClient | any = await this.driverUtil.loadSaving()
        const driver: any = google.drive({version: 'v3', auth: client});
        try {
            const file = await driver.files.copy({});
            return null
        } catch (err) {
            throw err;
        }
    }

    // 下载文件 =========================================================
    async downFile(destPath: string): Promise<fso.FileLink[] | null> {
        let google_file_id: string = ""
        const client: JSONClient | any = await this.driverUtil.loadSaving()
        await client.refreshAccessToken()
        console.log(client);
        let url: string = "https://www.googleapis.com/drive/v3/files/"
        url += google_file_id + "?includeItemsFromAllDrives=true"
        url += "&supportsAllDrives=true&alt=media&acknowledgeAbuse=true"
        let bearer: string = "Bearer " + this.driverUtil.saving.access
        let file_link: fso.FileLink = {
            direct: url,
            header: {"Authorization": bearer}
        }
        return [file_link]
    }

    // 上传文件 =========================================================
    async pushFile(filePath: string): Promise<fso.FileTask | null> {
        const client: JSONClient | any = await this.driverUtil.loadSaving()
        const driver: any = google.drive({version: 'v3', auth: client});
        const requestBody = {
            name: 'photo.jpg',
            fields: 'id',
        };
        const media = {
            mimeType: 'image/jpeg',
            body: "TODO",
        };
        try {
            const file = await driver.files.create({
                requestBody,
                media: media,
            });
            console.log('File Id:', file.data.id);
            return file.data.id;
        } catch (err) {
            // TODO(developer) - Handle error
            throw err;
        }
    }

}


