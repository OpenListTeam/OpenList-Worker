/**
 * 系统管理路由 — /@admin
 * 处理全局系统配置
 */
import type { Hono, Context } from 'hono';
import { AdminManage } from '../admin/AdminManage';
import { UsersManage } from '../users/UsersManage';
import { getConfig } from '../types/HonoParsers';

export function adminRoutes(app: Hono<any>) {
    app.use('/@admin/:action/:method/*', async (c: Context): Promise<any> => {
        const action: string = c.req.param('action');
        const method: string = c.req.param('method');
        const source: string = "/" + (c.req.param('source') || "");
        const config: Record<string, any> = await getConfig(c, 'config');

        // 权限检查 — 系统管理需要管理员权限
        const authResult = await UsersManage.checkAuth(c);
        if (!authResult.flag) return c.json(authResult, 401);

        let admin: AdminManage = new AdminManage(c);

        switch (method) {
            case "none": break;
            default: return c.json({ flag: false, text: 'Invalid Method' }, 400);
        }

        switch (action) {
            case "select": { const r = await admin.select(); return c.json(r, r.flag ? 200 : 400); }
            case "config": {
                if (!config.admin_keys || config.admin_data === undefined)
                    return c.json({ flag: false, text: 'Invalid Param Request' }, 400);
                const r = await admin.config(config.admin_keys, config.admin_data);
                return c.json(r, r.flag ? 200 : 400);
            }
            case "batch": {
                if (!config.items || !Array.isArray(config.items))
                    return c.json({ flag: false, text: 'Invalid Batch Items' }, 400);
                const r = await admin.batchConfig(config.items);
                return c.json(r, r.flag ? 200 : 400);
            }
            case "reset": { const r = await admin.resetAll(); return c.json(r, r.flag ? 200 : 400); }
            default: return c.json({ flag: false, text: 'Invalid Action' }, 400);
        }
    });
}
