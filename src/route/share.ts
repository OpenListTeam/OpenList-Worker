/**
 * 分享管理路由 — /@share
 */
import type { Hono, Context } from 'hono';
import { ShareManage } from '../share/ShareManage';
import type { ShareConfig } from '../share/ShareObject';
import { UsersManage } from '../users/UsersManage';
import { getConfig } from '../types/HonoParsers';

export function shareRoutes(app: Hono<any>) {
    app.use('/@share/:action/:method/*', async (c: Context): Promise<any> => {
        const action: string = c.req.param('action');
        const method: string = c.req.param('method');
        const source: string = "/" + (c.req.param('source') || "");
        const config: Record<string, any> = await getConfig(c, 'config');

        const authResult = await UsersManage.checkAuth(c);
        if (!authResult.flag) return c.json(authResult, 401);

        let share: ShareManage = new ShareManage(c);

        switch (method) {
            case "uuid": {
                const result = await share.select(source);
                if (!result.data || result.data.length === 0)
                    return c.json({ flag: false, text: 'No Share Config Matched' }, 400);
                break;
            }
            case "none": break;
            default: return c.json({ flag: false, text: 'Invalid Method' }, 400);
        }

        switch (action) {
            case "select": { const r = await share.select(); return c.json(r, r.flag ? 200 : 400); }
            case "create": {
                if (!config.share_path || !config.share_user)
                    return c.json({ flag: false, text: 'Invalid Share Path or User' }, 400);
                const shareData: ShareConfig = {
                    share_uuid: config.share_uuid || "",
                    share_path: config.share_path,
                    share_pass: config.share_pass || "",
                    share_user: config.share_user,
                    share_date: config.share_date || new Date().toISOString(),
                    share_ends: config.share_ends || "",
                    is_enabled: config.is_enabled !== undefined ? config.is_enabled : 1
                };
                const r = await share.create(shareData);
                return c.json(r, r.flag ? 200 : 400);
            }
            case "remove": {
                if (!config.share_uuid) return c.json({ flag: false, text: 'Invalid Share UUID' }, 400);
                const r = await share.remove(config.share_uuid);
                return c.json(r, r.flag ? 200 : 400);
            }
            case "config": { const r = await share.config(config as ShareConfig); return c.json(r, r.flag ? 200 : 400); }
            case "status": {
                if (!config.share_uuid || config.is_enabled === undefined)
                    return c.json({ flag: false, text: 'Invalid Param Request' }, 400);
                const r = await share.toggleStatus(config.share_uuid, config.is_enabled);
                return c.json(r, r.flag ? 200 : 400);
            }
            case "enabled": { const r = await share.getEnabledShares(); return c.json(r, r.flag ? 200 : 400); }
            case "user": {
                if (!config.share_user) return c.json({ flag: false, text: 'Invalid User' }, 400);
                const r = await share.getByUser(config.share_user);
                return c.json(r, r.flag ? 200 : 400);
            }
            case "validate": {
                if (!config.share_uuid) return c.json({ flag: false, text: 'Invalid Share UUID' }, 400);
                const r = await share.validateAccess(config.share_uuid, config.share_pass);
                return c.json(r, r.flag ? 200 : 400);
            }
            case "password": {
                if (!config.share_uuid) return c.json({ flag: false, text: 'Invalid Share UUID' }, 400);
                const r = await share.updatePassword(config.share_uuid, config.share_pass || "");
                return c.json(r, r.flag ? 200 : 400);
            }
            case "endtime": {
                if (!config.share_uuid) return c.json({ flag: false, text: 'Invalid Share UUID' }, 400);
                const r = await share.updateEndTime(config.share_uuid, config.share_ends || "");
                return c.json(r, r.flag ? 200 : 400);
            }
            case "expiring": {
                const days = config.days || 7;
                const r = await share.getExpiringShares(days);
                return c.json(r, r.flag ? 200 : 400);
            }
            case "cleanup": { const r = await share.cleanExpiredShares(); return c.json(r, r.flag ? 200 : 400); }
            default: return c.json({ flag: false, text: 'Invalid Action' }, 400);
        }
    });
}
