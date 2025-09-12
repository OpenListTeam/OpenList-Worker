import {HostClouds} from "./utils"
import {google} from 'googleapis';
import {Context} from "hono";
import {JSONClient} from "google-auth-library/build/src/auth/googleauth";
import * as fso from "../DriveObject";


// export class HostDriver extends BasicDriver {
export class HostDriver {
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
        // super(c, router);
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
        return await this.driverUtil.getStart();
    }

    // 载入驱动 =========================================================
    async loadSelf(): Promise<boolean> {
        // return await this.driverUtil.getSaves();
        return true;
    }

    // 列出文件 =========================================================
    async listFile(filePath: string): Promise<any> {
        const client: JSONClient | any = await this.driverUtil.getAuthy()
        console.log("listFile client", client);
        const driver: any = google.drive({version: 'v3', auth: client});
        const result: Record<string, any> = await driver.files.list({
            // pageSize: 10,
            // fields: 'files(id,name,mimeType,size,modifiedTime,' +
            //     'createdTime,thumbnailLink,shortcutDetails,md5Checksum,' +
            //     'sha1Checksum,sha256Checksum),nextPageToken',
        });
        const files: any[] = result.data.files;
        if (!files || files.length === 0) {
            console.log('No files found.');
            return;
        }

        console.log('Files:');
        files.map((file: any): void => {
            console.log(file)
            console.log(` ${file.id} ${file.size} ${file.name}  ${file.thumbnailLink}`);
        });
    }

    // 删除文件 =========================================================
    async killFile(filePath: string): Promise<fso.FileTask | null> {
        const client: JSONClient | any = await this.driverUtil.getAuthy()
        const driver: any = google.drive({version: 'v3', auth: client});
        const result = await driver.files.update({
            fileId: '',
            requestBody: {'trashed': true},
        });
        console.log(result);
        return null;
    }

    // 创建文件 =========================================================
    async makePath(filePath: string): Promise<fso.FileTask | null> {
        const client: JSONClient | any = await this.driverUtil.getAuthy()
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
        const client: JSONClient | any = await this.driverUtil.getAuthy()
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
        const client: JSONClient | any = await this.driverUtil.getAuthy()
        const driver: any = google.drive({version: 'v3', auth: client});
        try {
            const file = await driver.files.move({
            });
            return null
        } catch (err) {
            throw err;
        }
    }

    // 移动文件 =========================================================
    async copyFile(filePath: string): Promise<fso.FileTask | null> {
        const client: JSONClient | any = await this.driverUtil.getAuthy()
        const driver: any = google.drive({version: 'v3', auth: client});
        try {
            const file = await driver.files.copy({

            });
            return null
        } catch (err) {
            throw err;
        }
    }

    // 下载文件 =========================================================
    async downFile(destPath: string): Promise<fso.FileLink[] | null> {
        let google_file_id: string = ""
        const client: JSONClient | any = await this.driverUtil.getAuthy()
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
        const client: JSONClient | any = await this.driverUtil.getAuthy()
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


