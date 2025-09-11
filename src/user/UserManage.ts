import {Context} from "hono";
import {DataManage} from "../data/DataManage";

class UserManage {
    private readonly c: Context
    private db: DataManage

    constructor(c: Context) {
        this.c = c
        this.db = new DataManage(c);
    }

    create(config: UserConfig) {
        const result =  await this.db.save(this.c, config)
    }
}