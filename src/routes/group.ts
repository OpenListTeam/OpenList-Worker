/**
 * 分组管理路由 — /@group
 */
import type { Hono, Context } from 'hono';
import { GroupManage } from '../group/GroupManage';
import type { GroupResult, GroupConfig } from '../group/GroupObject';
import { UsersManage } from '../users/UsersManage';
import { getConfig } from '../types/HonoParsers';

export function groupRoutes(app: Hono<any>) {
    app.use('/@group/:action/:method/*', async (c: Context): Promise<any> => {
        const action: string = c.req.param('action');
        const method: string = c.req.param('method');
        const source: string = "/" + (c.req.param('source') || "");
        const config: Record<string, any> = await getConfig(c, 'config');

        const authResult = await UsersManage.checkAuth(c);
        if (!authResult.flag) return c.json(authResult, 401);

        let group: GroupManage = new GroupManage(c);

        switch (method) {
            case "name": {
                const result: GroupResult = await group.select(source);
                if (!result.data || result.data.length === 0)
                    return c.json({ flag: false, text: 'No Group Matched' }, 400);
                break;
            }
            case "none": break;
            default: return c.json({ flag: false, text: 'Invalid Method' }, 400);
        }

        switch (action) {
            case "select": { const r: GroupResult = await group.select(); return c.json(r, r.flag ? 200 : 400); }
            case "create": {
                if (!config.group_name) return c.json({ flag: false, text: 'Invalid Group Name' }, 400);
                const groupData: GroupConfig = {
                    group_name: config.group_name,
                    group_mask: config.group_mask || 755,
                    is_enabled: config.is_enabled !== undefined ? config.is_enabled : true
                };
                const r: GroupResult = await group.create(groupData);
                return c.json(r, r.flag ? 200 : 400);
            }
            case "remove": {
                if (!config.group_name) return c.json({ flag: false, text: 'Invalid Group Name' }, 400);
                const r: GroupResult = await group.remove(config.group_name);
                return c.json(r, r.flag ? 200 : 400);
            }
            case "config": { const r: GroupResult = await group.config(config as GroupConfig); return c.json(r, r.flag ? 200 : 400); }
            case "toggle": {
                if (!config.group_name) return c.json({ flag: false, text: 'Invalid Group Name' }, 400);
                const r: GroupResult = await group.toggleStatus(config.group_name);
                return c.json(r, r.flag ? 200 : 400);
            }
            case "mask": {
                if (!config.group_name || config.group_mask === undefined)
                    return c.json({ flag: false, text: 'Invalid Param Request' }, 400);
                const r: GroupResult = await group.updateMask(config.group_name, config.group_mask);
                return c.json(r, r.flag ? 200 : 400);
            }
            case "enabled": { const r: GroupResult = await group.getEnabled(); return c.json(r, r.flag ? 200 : 400); }
            default: return c.json({ flag: false, text: 'Invalid Action' }, 400);
        }
    });
}
