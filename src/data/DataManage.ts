import {Context} from "hono";
import * as d1_fun from './DataServer'
import {D1Filter} from "./DataServer";
import {DBSelect, DBResult} from "./DataObject";

export class DataManage {
    public kv: KVNamespace
    public d1: D1Database
    public c: Context

    constructor(c: Context) {
        this.c = c
        this.kv = c.env.KV_DATA
        if (c.env.ENABLE_D1)
            this.d1 = c.env.D1_DATA;
    }

    // KV数据库生成Keys ==========================================
    async kv_keys(data: DBSelect): Promise<string> {
        let data_keys: string = `@${data.main}`
        if (!data.keys || data.keys.length < 1) return data_keys;
        for (const obj of data.keys) {
            // 每个对象只有一对键值，Object.entries(obj)[0] 拿出来
            const [[key, val]] = Object.entries(obj);
            data_keys += `/${key}=${val}`;
        }
        return data_keys;
    }

    // KV数据库操作索引 ==========================================
    async kv_maps(data: DBSelect, acts: boolean): Promise<void> {
        let item_keys: string = await this.kv_keys(data)
        let main_keys: string = `@${data.main}/@maps`
        let save_maps: any[] = await this.kv_find(data)
        if (!save_maps) save_maps = [];
        console.log("kv_maps", save_maps, item_keys)
        // act-false:写入 act-true:删除
        if (!acts) save_maps.push(item_keys);
        else save_maps = save_maps.filter(
            item => item !== item_keys);
        // console.log(save_maps)
        this.kv.put(main_keys, save_maps)
    }

    // KV数据库操作索引 ==========================================
    async kv_find(data: DBSelect): Promise<any[]> {
        let main_keys: string = `@${data.main}/@maps`
        return JSON.parse(await this.kv.get(main_keys, "1"))
    }

    // D1数据库生成Keys ==========================================
    async d1_keys(data: DBSelect): Promise<d1_fun.D1Filter> {
        let data_keys: d1_fun.D1Filter = {}
        if (!data.keys || data.keys.length < 1) return data_keys;
        for (const obj of data.keys) {
            const [[key, val]] = Object.entries(obj);
            data_keys[key] = {
                value: val
            }
        }
        return data_keys
    }

    // 数据库写入操作 ============================================
    async save(data: DBSelect): Promise<DBResult> {
        if (!this.c.env.ENABLE_D1) {
            const save_keys: string = await this.kv_keys(data);
            console.log("db_save", save_keys, JSON.stringify(data.data))
            this.kv.put(save_keys, JSON.stringify(data.data))
            await this.kv_maps(data, false)
            return {
                flag: true,
                text: "OK"
            }
        }
        let now_result: DBResult = await this.find(data);
        if (now_result.data.length > 0) await this.kill(data);
        return await d1_fun.insertDB(this.d1, data.main, data.data);
    }

    // 数据库读取操作 ============================================
    async find(data: DBSelect): Promise<DBResult> {
        if (!this.c.env.ENABLE_D1) {
            const find_keys: string = await this.kv_keys(data)
            let find_list: string[] = [find_keys];
            console.log("db_find", find_list)
            if (data.find) {
                const find_maps: any[] = await this.kv_find(data)
                find_list = find_maps.filter(
                    str => find_keys.includes(str));
            }
            let save_data: DBResult = {
                flag: true,
                text: "OK",
                data: []
            };
            for (const item_keys of find_list) {
                const find_data: string = await this.kv.get(item_keys)
                console.log("db_outs", item_keys, find_data)
                save_data.data.push(JSON.parse(find_data));
            }
            return save_data;

        }
        const find_keys: D1Filter = await this.d1_keys(data);
        return await d1_fun.selectDB(this.d1, data.main, find_keys);
    }

    // 数据库删除操作 ============================================
    async kill(data: DBSelect): Promise<DBResult> {
        if (!this.c.env.ENABLE_D1) {
            const save_keys: string = await this.kv_keys(data);
            this.kv.delete(save_keys)
            await this.kv_maps(data, true)
            return {flag: true, text: "OK"}
        }
        const find_keys: D1Filter = await this.d1_keys(data);
        // console.log("db_kill", this.d1, data.main, find_keys)
        return await d1_fun.deleteDB(this.d1, data.main, find_keys);
    }
}