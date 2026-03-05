/**
 * 离线下载路由 — /@fetch
 */
import type { Hono, Context } from 'hono';
import { FetchManage } from '../fetch/FetchManage';
import type { FetchResult, FetchConfig } from '../fetch/FetchObject';
import { UsersManage } from '../users/UsersManage';
import { getConfig } from '../types/HonoParsers';

export function fetchRoutes(app: Hono<any>) {
    app.use('/@fetch/:action/:method/*', async (c: Context): Promise<any> => {
        const action: string = c.req.param('action');
        const method: string = c.req.param('method');
        const source: string = "/" + (c.req.param('source') || "");
        const config: Record<string, any> = await getConfig(c, 'config');

        const authResult = await UsersManage.checkAuth(c);
        if (!authResult.flag) return c.json(authResult, 401);

        let fetch: FetchManage = new FetchManage(c);

        switch (method) {
            case "uuid": {
                const result: FetchResult = await fetch.select(source);
                if (!result.data || result.data.length === 0)
                    return c.json({ flag: false, text: 'No UUID Matched' }, 400);
                break;
            }
            case "none": break;
            default: return c.json({ flag: false, text: 'Invalid Method' }, 400);
        }

        switch (action) {
            case "select": { const r: FetchResult = await fetch.select(); return c.json(r, r.flag ? 200 : 400); }
            case "create": {
                if (!config.fetch_from || !config.fetch_dest || !config.fetch_user)
                    return c.json({ flag: false, text: 'Invalid Param Request' }, 400);
                const fetchData: FetchConfig = {
                    fetch_from: config.fetch_from,
                    fetch_dest: config.fetch_dest,
                    fetch_user: config.fetch_user,
                    fetch_flag: config.fetch_flag || 0
                };
                const r: FetchResult = await fetch.create(fetchData);
                return c.json(r, r.flag ? 200 : 400);
            }
            case "remove": {
                if (!config.fetch_uuid) return c.json({ flag: false, text: 'Invalid UUID' }, 400);
                const r: FetchResult = await fetch.remove(config.fetch_uuid);
                return c.json(r, r.flag ? 200 : 400);
            }
            case "config": { const r: FetchResult = await fetch.config(config as FetchConfig); return c.json(r, r.flag ? 200 : 400); }
            case "status": {
                if (!config.fetch_uuid || config.fetch_flag === undefined)
                    return c.json({ flag: false, text: 'Invalid Param Request' }, 400);
                const r: FetchResult = await fetch.updateStatus(config.fetch_uuid, config.fetch_flag);
                return c.json(r, r.flag ? 200 : 400);
            }
            case "user": {
                if (!config.fetch_user) return c.json({ flag: false, text: 'Invalid User' }, 400);
                const r: FetchResult = await fetch.getByUser(config.fetch_user);
                return c.json(r, r.flag ? 200 : 400);
            }
            case "download": {
                const r: FetchResult = await fetch.getByStatus(0);
                return c.json(r, r.flag ? 200 : 400);
            }
            default: return c.json({ flag: false, text: 'Invalid Action' }, 400);
        }
    });
}
