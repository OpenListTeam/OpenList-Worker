import {Context} from "hono";
import * as d1_fun from './SavesServer'
import {D1Filter} from "./SavesServer";
import {DBSelect, DBResult} from "./SavesObject";
import {KVNamespace, D1Database} from "@cloudflare/workers-types";

/**
 * 数据管理类，封装了对KV和D1数据库的操作
 */
export class SavesManage {
    public kv: KVNamespace
    public d1: D1Database | undefined
    public c: Context

    /**
     * 构造函数，初始化KV和D1数据库
     * @param c 上下文对象，包含环境变量
     */
    constructor(c: Context) {
        this.c = c
        this.kv = c.env.KV_DATA
        if (c.env.ENABLE_D1)
            this.d1 = c.env.D1_DATA;
    }

    /**
     * 生成KV数据库的键
     * @param data 数据库查询对象
     * @returns 生成的键字符串
     */
    async kv_keys(data: DBSelect): Promise<string> {
        let data_keys: string = `@${data.main}`
        if (!data.keys || Object.keys(data.keys).length < 1) return data_keys;
        for (const [key, val] of Object.entries(data.keys)) {
            data_keys += `/${key}=${val}`;
        }
        return data_keys;
    }

    /**
     * 更新或删除KV数据库的索引
     * @param data 数据库查询对象
     * @param acts 操作类型：false为写入，true为删除
     */
    async kv_maps(data: DBSelect, acts: boolean): Promise<void> {
        let item_keys: string = await this.kv_keys(data)
        let main_keys: string = `@${data.main}/@maps`
        let save_maps: any[] = await this.kv_find(data)
        if (!save_maps) save_maps = [];
        if (!acts) save_maps.push(item_keys);
        else save_maps = save_maps.filter(
            item => item !== item_keys);
        await this.kv.put(main_keys, JSON.stringify(save_maps))
    }

    /**
     * 查找KV数据库的索引
     * @param data 数据库查询对象
     * @returns 索引数组
     */
    async kv_find(data: DBSelect): Promise<any[]> {
        let main_keys: string = `@${data.main}/@maps`
        let find_maps: string | null = await this.kv.get(main_keys)
        if (!find_maps) return [];
        return JSON.parse(find_maps)
    }

    /**
     * 生成D1数据库的查询条件
     * @param data 数据库查询对象
     * @returns D1查询条件对象
     */
    async d1_keys(data: DBSelect): Promise<d1_fun.D1Filter> {
        let data_keys: d1_fun.D1Filter = {}
        if (!data.keys || Object.keys(data.keys).length < 1) return data_keys;
        for (const [key, val] of Object.entries(data.keys)) {
            data_keys[key] = {
                value: val
            }
        }
        return data_keys
    }

    /**
     * 保存数据到数据库
     * @param data 数据库查询对象
     * @returns 操作结果
     */
    async save(data: DBSelect): Promise<DBResult> {
        if (!this.c.env.ENABLE_D1) {
            const save_keys: string = await this.kv_keys(data);
            let save_data: Record<string, string> = {}
            let load_data: string|null = await this.kv.get(save_keys)
            if(load_data) save_data = JSON.parse(load_data)
            for (const [key, val] of Object.entries(data.data)) {
                if (typeof val === "string") {
                    save_data[key] = val
                }
            }
            await this.kv.put(save_keys, JSON.stringify(save_data))
            await this.kv_maps(data, false)
            return {
                flag: true,
                text: "OK"
            }
        }
        if (!this.d1) return {flag: false, text: "D1 is undefined"}
        let now_result: DBResult = await this.find(data);
        if (now_result.data.length > 0) {
            const find_keys: D1Filter = await this.d1_keys(data);
            return await d1_fun.updateDB(this.d1, data.main,
                data.data, find_keys);
        }
        return await d1_fun.insertDB(this.d1, data.main, data.data);
    }

    /**
     * 从数据库查询数据
     * @param data 数据库查询对象
     * @returns 查询结果
     */
    async find(data: DBSelect): Promise<DBResult> {
        if (!this.c.env.ENABLE_D1) {
            const find_keys: string = await this.kv_keys(data)
            let find_list: string[] = [find_keys];
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
                const find_data: string | null = await this.kv.get(item_keys)
                if (!find_data) continue;
                save_data.data.push(JSON.parse(find_data));
            }
            return save_data;
        }
        if (!this.d1) return {flag: false, text: "D1 is undefined"}
        const find_keys: D1Filter = await this.d1_keys(data);
        return await d1_fun.selectDB(this.d1, data.main, find_keys);
    }

    /**
     * 从数据库删除数据
     * @param data 数据库查询对象
     * @returns 操作结果
     */
    async kill(data: DBSelect): Promise<DBResult> {
        if (!this.c.env.ENABLE_D1) {
            const save_keys: string = await this.kv_keys(data);
            await this.kv.delete(save_keys)
            await this.kv_maps(data, true)
            return {flag: true, text: "OK"}
        }
        if (!this.d1) return {flag: false, text: "D1 is undefined"}
        const find_keys: D1Filter = await this.d1_keys(data);
        return await d1_fun.deleteDB(this.d1, data.main, find_keys);
    }
}