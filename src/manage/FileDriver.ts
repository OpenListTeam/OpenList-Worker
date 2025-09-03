import * as sys from '../driver/manifest'
import {Context} from "hono";

export class FileDriver {
    public enableFlag: boolean
    public driverName: string
    public cachedTime: number
    public configData: Record<string, any>
    public serverData: Record<string, any>
    public driverConn: any | null
    public router: string
    public c: Context

    constructor(
        public in_c: Context,
        public in_router: string,
        public in_enableFlag: boolean,
        public in_driverName: string,
        public in_cachedTime: number,
        public in_configData: Record<string, any>,
        public in_serverData: Record<string, any>,
    ) {
        this.c = in_c;
        this.router = in_router;
        this.enableFlag = in_enableFlag;
        this.driverName = in_driverName;
        this.cachedTime = in_cachedTime;
        this.configData = in_configData;
        this.serverData = in_serverData;
    }

    async InitDriver(): Promise<void> {
        let driver_item: any = sys.driver_list[this.driverName]

        console.log(driver_item, this.driverName, sys.driver_list)
        this.driverConn = new driver_item(
            this.c,
            this.router,
            this.configData,
            this.serverData
        )
    }

    async KillDriver(): Promise<void> {
    }


}


