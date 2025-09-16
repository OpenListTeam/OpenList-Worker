import {Context} from "hono";
import {SavesManage} from "../saves/SavesManage";
import {CONFIG_INFO, SAVING_INFO} from "./BasicDriver";
import {DBSelect, DBResult} from "../saves/SavesManage";

export class BasicClouds {
    public config: any | Record<string, any> | undefined
    public saving: any | Record<string, any> | undefined
    public change: boolean = false
    public router: string
    public c: Context

    // 构造函数 ================================================
    constructor(c: Context, router: string,
                public config: Record<string, any> | any,
                public saving: Record<string, any> | any) {
        this.c = c
        this.router = router
        this.config = config;
        this.saving = saving || {};
    }

    async initConfig(): Promise<any> {

    }

    // 存储信息 ================================================
    async getSaves(): Promise<CONFIG_INFO | DBResult | any> {
        let db_api: SavesManage = new SavesManage(this.c)
        let result: DBResult = await db_api.find({
                main: "mount",
                keys: {"mount_path": this.router},
            }
        )
        if (!result.flag) return this.config;
        let saving: DBSelect[] = result.data
        if (saving.length > 0) {
            const select: DBSelect = saving[0];
            const info: SAVING_INFO | undefined = select.data
            if (!info) return null
            this.config = info.config;
            this.saving = info.saving;
        }
        console.log(this.config, this.saving);
        return this.config
    }

    // 存储信息 ================================================
    async putSaves(): Promise<DBResult> {
        let db_api: SavesManage = new SavesManage(this.c)
        return await db_api.save({
                main: "mount",
                keys: {"mount_path": this.router},
                data: {
                    config: this.config,
                    saving: this.saving
                }
            }
        )
    }
}