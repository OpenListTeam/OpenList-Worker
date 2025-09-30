import {Context} from "hono";
import {AdminConfig, AdminResult} from "./AdminObject";
import {DBResult, SavesManage} from "../saves/SavesManage";

export class AdminManage {
    public c: Context
    public d: SavesManage

    constructor(c: Context) {
        this.c = c
        this.d = new SavesManage(c)
    }

    async set(config: AdminConfig): Promise<AdminResult> {
        const result: DBResult = await this.d.save({
            main: "admin",
            keys: {keys: config.keys},
            data: config
        })
        return result as AdminResult
    }

    async get(select: string): Promise<AdminConfig> {
        return {
            keys: null,
            data: null
        }
    }

}