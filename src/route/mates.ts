/**
 * 路径配置路由 — /@mates
 * 处理目录元数据、权限掩码、加密关联、压缩配置
 */
import type { Hono, Context } from 'hono';
import { MatesManage } from '../mates/MatesManage';
import type { MatesResult, MatesConfig } from '../mates/MatesObject';
import { UsersManage } from '../users/UsersManage';
import { getConfig } from '../types/HonoParsers';

export function matesRoutes(app: Hono<any>) {
    app.use('/@mates/:action/:method/*', async (c: Context): Promise<any> => {
        const action: string = c.req.param('action');
        const method: string = c.req.param('method');
        const source: string = "/" + (c.req.param('source') || "");
        const config: Record<string, any> = await getConfig(c, 'config');

        const authResult = await UsersManage.checkAuth(c);
        if (!authResult.flag) return c.json(authResult, 401);

        let mates: MatesManage = new MatesManage(c);

        switch (method) {
            case "name": {
                const result: MatesResult = await mates.select(source);
                if (!result.data || result.data.length === 0)
                    return c.json({ flag: false, text: 'No Path Matched' }, 400);
                break;
            }
            case "none": break;
            default: return c.json({ flag: false, text: 'Invalid Method' }, 400);
        }

        switch (action) {
            case "select": { const r: MatesResult = await mates.select(); return c.json(r, r.flag ? 200 : 400); }
            case "create": {
                if (!config.mates_name) return c.json({ flag: false, text: 'Invalid Path Name' }, 400);
                const matesData: MatesConfig = {
                    mates_name: config.mates_name,
                    mates_mask: config.mates_mask || 0,
                    mates_user: config.mates_user || 0,
                    is_enabled: config.is_enabled !== undefined ? config.is_enabled : 1,
                    dir_hidden: config.dir_hidden,
                    dir_shared: config.dir_shared,
                    set_zipped: config.set_zipped,
                    set_parted: config.set_parted,
                    crypt_name: config.crypt_name,
                    cache_time: config.cache_time
                };
                const r: MatesResult = await mates.create(matesData);
                return c.json(r, r.flag ? 200 : 400);
            }
            case "remove": {
                if (!config.mates_name) return c.json({ flag: false, text: 'Invalid Path Name' }, 400);
                const r: MatesResult = await mates.remove(config.mates_name);
                return c.json(r, r.flag ? 200 : 400);
            }
            case "config": { const r: MatesResult = await mates.config(config as MatesConfig); return c.json(r, r.flag ? 200 : 400); }
            case "status": {
                if (!config.mates_name || config.is_enabled === undefined)
                    return c.json({ flag: false, text: 'Invalid Param Request' }, 400);
                const r: MatesResult = await mates.toggleStatus(config.mates_name, config.is_enabled);
                return c.json(r, r.flag ? 200 : 400);
            }
            case "enabled": { const r: MatesResult = await mates.getEnabledMates(); return c.json(r, r.flag ? 200 : 400); }
            default: return c.json({ flag: false, text: 'Invalid Action' }, 400);
        }
    });
}
