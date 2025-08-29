import * as sys from '../driver/manifest'

export class FileDriver {
    public enableFlag: boolean
    public driverName: string
    public cachedTime: number
    public configData: Record<string, any>
    public serverData: Record<string, any>
    public driverConn: any | null

    constructor(
        public in_enableFlag: boolean,
        public in_driverName: string,
        public in_cachedTime: number,
        public in_configData: Record<string, any>,
        public in_serverData: Record<string, any>,
    ) {
        this.enableFlag = in_enableFlag;
        this.driverName = in_driverName;
        this.cachedTime = in_cachedTime;
        this.configData = in_configData;
        this.serverData = in_serverData;

    }

    async InitDriver(): Promise<void> {
        let driver_item: any = sys.driver_list[this.driverName]
        this.driverConn = new driver_item(
            this.configData,
            this.serverData
        )
    }

    async KillDriver(): Promise<void> {}


}


