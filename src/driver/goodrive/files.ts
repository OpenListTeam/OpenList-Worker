import {BaseDriver} from "../basicFS";
import {HostClouds} from "./utils"
import {google} from 'googleapis';
import {Context} from "hono";
import {JSONClient} from "google-auth-library/build/src/auth/googleauth";

const SCOPES = ['https://www.googleapis.com/auth/drive.metadata.readonly'];

// export class HostDriver extends BaseDriver {
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
        return true;
    }

    // 载入驱动 =========================================================
    async loadSelf(): Promise<boolean> {
        await this.driverUtil.getSaves()
        return true;
    }

    // 列出文件 =========================================================
    async listFile(filePath: string): Promise<any> {
        const client: JSONClient | any = await this.driverUtil.getAuthy()
        const driver: any = google.drive({version: 'v3', auth: client});
        const result: Record<string, any> = await driver.files.list({
            pageSize: 10,
            fields: 'nextPageToken, files(id, name)',
        });
        const files: any[] = result.data.files;
        if (!files || files.length === 0) {
            console.log('No files found.');
            return;
        }

        console.log('Files:');
        files.map((file: any): void => {
            console.log(`${file.name} (${file.id})`);
        });
    }

}


