import {Context} from "hono";
import {SavesServer} from './SavesServer'
import {PrismaTools} from './PrismaTools'
import {D1Filter} from "./SavesObject";
import {DBSelect, DBResult} from "./SavesObject";
import {KVNamespace, D1Database} from "@cloudflare/workers-types";

// 数据库导入 ================================================================
import {PrismaMariaDb} from '@prisma/adapter-mariadb';
import {PrismaPg} from '@prisma/adapter-pg'
import {PrismaMssql} from '@prisma/adapter-mssql';
import {PrismaClient} from './client';
import * as mariadb from 'mariadb';
import pg, {PoolConfig} from 'pg';
import sql from 'mssql';


/**
 * 数据管理类，封装了对KV和D1数据库的操作
 */
export class SavesManage {
    public kv!: KVNamespace          // KV 命名空间（可能未绑定）
    public db!: D1Database | PrismaClient
    public cc!: PrismaTools | SavesServer
    public c: Context
    private kvAvailable: boolean = false  // KV 是否可用

    /**
     * 构造函数，初始化KV和D1数据库
     * @param c 上下文对象，包含环境变量
     */
    constructor(c: Context) {
        this.c = c

        // 安全初始化 KV（未绑定时标记不可用，避免运行时崩溃）
        if (c.env.KV_DATA) {
            this.kv = c.env.KV_DATA
            this.kvAvailable = true
        }

        if (c.env.ENABLE_D1) {
            const remote = c.env.REMOTE_D1 || ''
            if (remote === 'local://' || remote === '') {
                // 使用 Cloudflare D1 本地绑定
                if (c.env.D1_DATA) {
                    this.db = c.env.D1_DATA
                    this.cc = new SavesServer()
                } else {
                    console.warn('[SavesManage] ENABLE_D1=true 但 D1_DATA 未绑定，回退到 KV 模式')
                    // 回退：若 KV 也不可用则保持 db 未定义，后续操作会返回错误
                }
            } else {
                this.cc = new PrismaTools()
                if (remote.startsWith('mysql://') || remote.startsWith('maria://')) {
                    const pool = mariadb.createPool(remote)
                    this.db = new PrismaClient({adapter: new PrismaMariaDb(pool as any)})
                } else if (remote.startsWith('pgsql://') || remote.startsWith('postgres://')) {
                    const connectionString = remote.replace('pgsql://', 'postgres://')
                    const pool = new pg.Pool({connectionString})
                    this.db = new PrismaClient({adapter: new PrismaPg(pool as any)})
                } else if (remote.startsWith('sqlserver://')) {
                    this.db = new PrismaClient({adapter: new PrismaMssql(remote)})
                } else {
                    console.error(`[SavesManage] 无法识别的 REMOTE_D1 协议: ${remote}，回退到 D1_DATA`)
                    if (c.env.D1_DATA) {
                        this.db = c.env.D1_DATA
                        this.cc = new SavesServer()
                    }
                }
            }
        }
        // ENABLE_D1=false 时纯 KV 模式，kv 已在上方初始化
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
        if (!this.kvAvailable) return
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
        if (!this.kvAvailable) return []
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
    async d1_keys(data: DBSelect): Promise<D1Filter> {
        let data_keys: D1Filter = {}
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
            if (!this.kvAvailable) return {flag: false, text: 'KV_DATA 未绑定，无法执行写入操作'}
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
        if (!this.db) return {flag: false, text: "D1 is undefined"}
        let now_result: DBResult = await this.find(data);
        if (now_result.data && now_result.data.length > 0) {
            const find_keys: D1Filter = await this.d1_keys(data);
            if (this.cc instanceof PrismaTools) {
                return await this.cc.updateDB(this.db as PrismaClient, data.main,
                    data.data, find_keys);
            } else {
                return await this.cc.updateDB(this.db as D1Database, data.main,
                    data.data, find_keys);
            }
        }
        if (this.cc instanceof PrismaTools) {
            return await this.cc.insertDB(this.db as PrismaClient, data.main, data.data);
        } else {
            return await this.cc.insertDB(this.db as D1Database, data.main, data.data);
        }
    }

    /**
     * 从数据库查询数据
     * @param data 数据库查询对象
     * @returns 查询结果
     */
    async find(data: DBSelect): Promise<DBResult> {
        if (!this.c.env.ENABLE_D1) {
            if (!this.kvAvailable) return {flag: false, text: 'KV_DATA 未绑定，无法执行查询操作', data: []}
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
        if (!this.db) return {flag: false, text: "D1 is undefined"}
        const find_keys: D1Filter = await this.d1_keys(data);
        if (this.cc instanceof PrismaTools) {
            return await this.cc.selectDB(this.db as PrismaClient, data.main, find_keys);
        } else {
            return await this.cc.selectDB(this.db as D1Database, data.main, find_keys);
        }
    }

    /**
     * 从数据库删除数据
     * @param data 数据库查询对象
     * @returns 操作结果
     */
    async kill(data: DBSelect): Promise<DBResult> {
        if (!this.c.env.ENABLE_D1) {
            if (!this.kvAvailable) return {flag: false, text: 'KV_DATA 未绑定，无法执行删除操作'}
            const save_keys: string = await this.kv_keys(data);
            await this.kv.delete(save_keys)
            await this.kv_maps(data, true)
            return {flag: true, text: "OK"}
        }
        if (!this.db) return {flag: false, text: "D1 is undefined"}
        const find_keys: D1Filter = await this.d1_keys(data);
        if (this.cc instanceof PrismaTools) {
            return await this.cc.deleteDB(this.db as PrismaClient, data.main, find_keys);
        } else {
            return await this.cc.deleteDB(this.db as D1Database, data.main, find_keys);
        }
    }
}

export {DBSelect, DBResult};
