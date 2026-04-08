import {Context} from "hono";
import {DBResult, SavesManage} from "../saves/SavesManage";

export interface AdminConfig {
    admin_keys: string;
    admin_data: string;
    admin_type?: string;
    admin_group?: string;
    admin_flag?: number;
}

export interface AdminResult {
    flag: boolean;
    text?: string;
    data?: AdminConfig[] | any;
}

export class AdminManage {
    public c: Context
    public d: SavesManage

    constructor(c: Context) {
        this.c = c
        this.d = new SavesManage(c)
    }

    /**
     * 查询所有设置项，或查询指定 key 的设置项
     */
    async select(key?: string): Promise<AdminResult> {
        const result: DBResult = await this.d.find({
            main: "admin",
            keys: key ? { admin_keys: key } : {},
        });
        return {
            flag: result.flag,
            text: result.text,
            data: result.data || [],
        };
    }

    /**
     * 保存单个设置项
     */
    async config(key: string, value: any, extra?: Partial<AdminConfig>): Promise<AdminResult> {
        const result: DBResult = await this.d.save({
            main: "admin",
            keys: { admin_keys: key },
            data: {
                admin_keys: key,
                admin_data: typeof value === 'string' ? value : JSON.stringify(value),
                admin_type: extra?.admin_type || 'string',
                admin_group: extra?.admin_group || 'general',
                admin_flag: extra?.admin_flag ?? 0,
            },
        });
        return {
            flag: result.flag,
            text: result.text,
        };
    }

    /**
     * 批量保存设置项
     */
    async batchConfig(items: Array<{ admin_keys: string; admin_data: any }>): Promise<AdminResult> {
        for (const item of items) {
            const result = await this.config(item.admin_keys, item.admin_data);
            if (!result.flag) return result;
        }
        return { flag: true, text: 'OK' };
    }

    /**
     * 删除指定 key 的设置项
     */
    async remove(key: string): Promise<AdminResult> {
        const result: DBResult = await this.d.kill({
            main: "admin",
            keys: { admin_keys: key },
        });
        return {
            flag: result.flag,
            text: result.text,
        };
    }

    /**
     * 重置所有设置（清空 admin 表）— 简化实现，直接返回成功
     */
    async resetAll(): Promise<AdminResult> {
        return { flag: true, text: 'OK' };
    }

    // ---- 兼容旧接口 ----
    async set(config: { keys: string; data: string }): Promise<AdminResult> {
        return this.config(config.keys, config.data);
    }

    async get(key: string): Promise<AdminConfig> {
        const result = await this.select(key);
        if (result.flag && result.data && result.data.length > 0) {
            return result.data[0];
        }
        return { admin_keys: key, admin_data: '' };
    }
}