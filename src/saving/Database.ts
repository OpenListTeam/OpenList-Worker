import {Context} from "hono";
import * as d1_fun from './D1Server'
import {D1Filter} from "./D1Server";

export interface DataSave {
    main: string;   // 所属表
    keys?: Record<string, string>[]; // 数据主键
    data?: Record<string, any> | any;
}


export class DataBase {
    public kv: KVNamespace
    public d1: D1Database

    constructor(c: Context) {
        this.kv = c.env.KV_DATA
        if (c.env.ENABLE_D1)
            this.d1 = c.env.D1_DATA;
    }

    async kv_keys(data: DataSave): Promise<string> {
        let data_keys: string = `@${data.main}`
        if(!data.keys || data.keys.length < 1) return data_keys;
        for (let {key, text} of data.keys)
            data_keys += `/${key}=${text}`
        return data_keys;
    }

    async d1_keys(data: DataSave): Promise<d1_fun.D1Filter> {
        let data_keys: d1_fun.D1Filter = {}
        if(!data.keys || data.keys.length < 1) return data_keys;
        for (let {key, text} of data.keys) {
            data_keys[key] = {
                value: text
            }
        }
        return data_keys
    }

    async save(c: Context, data: DataSave): Promise<boolean> {
        if (!c.env.ENABLE_D1) {
            const save_keys: string = await this.kv_keys(data);
            this.kv.put(save_keys, JSON.stringify(data.data))
            return true;
        }
        await this.kill(c, data);
        return await d1_fun.insertDB(this.d1, data.main, data.data);
    }

    async find(c: Context, data: DataSave): Promise<DataSave[]> {
        if (!c.env.ENABLE_D1) {
            const find_keys: string = await this.kv_keys(data);
            return [];
        }
        const find_keys: D1Filter = await this.d1_keys(data);
        return await d1_fun.selectDB(this.d1, data.main, find_keys);
    }

    async kill(c: Context, data: DataSave): Promise<boolean> {
        if (!c.env.ENABLE_D1) {
            const save_keys: string = await this.kv_keys(data);
            this.kv.del(save_keys)
            return true;
        }
        const find_keys: D1Filter = await this.d1_keys(data);
        return await d1_fun.deleteDB(this.d1, data.main, find_keys);
    }
}