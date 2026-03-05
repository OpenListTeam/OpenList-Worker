/**
 * 连接令牌路由 — /@token
 */
import type { Hono, Context } from 'hono';
import { TokenManage } from '../token/TokenManage';
import type { TokenResult, TokenConfig } from '../token/TokenObject';
import { UsersManage } from '../users/UsersManage';
import { getConfig } from '../types/HonoParsers';

export function tokenRoutes(app: Hono<any>) {
    app.use('/@token/:action/:method/*', async (c: Context): Promise<any> => {
        const action: string = c.req.param('action');
        const method: string = c.req.param('method');
        const source: string = "/" + (c.req.param('source') || "");
        const config: Record<string, any> = await getConfig(c, 'config');

        const authResult = await UsersManage.checkAuth(c);
        if (!authResult.flag) return c.json(authResult, 401);

        let tokens: TokenManage = new TokenManage(c);

        switch (method) {
            case "uuid": {
                const result: TokenResult = await tokens.select(source);
                if (!result.data || result.data.length === 0)
                    return c.json({ flag: false, text: 'No UUID Matched' }, 400);
                break;
            }
            case "none": break;
            default: return c.json({ flag: false, text: 'Invalid Method' }, 400);
        }

        switch (action) {
            case "select": { const r: TokenResult = await tokens.select(); return c.json(r, r.flag ? 200 : 400); }
            case "create": {
                if (!config.token_name || !config.token_user)
                    return c.json({ flag: false, text: 'Invalid Param Request' }, 400);
                const tokenData: TokenConfig = {
                    token_uuid: config.token_uuid || "",
                    token_name: config.token_name,
                    token_data: config.token_data,
                    token_user: config.token_user,
                    token_ends: config.token_ends,
                    is_enabled: config.is_enabled ?? 1
                };
                const r: TokenResult = await tokens.create(tokenData);
                return c.json(r, r.flag ? 200 : 400);
            }
            case "remove": {
                if (!config.token_uuid) return c.json({ flag: false, text: 'Invalid UUID' }, 400);
                const r: TokenResult = await tokens.remove(config.token_uuid);
                return c.json(r, r.flag ? 200 : 400);
            }
            case "config": { const r: TokenResult = await tokens.config(config as TokenConfig); return c.json(r, r.flag ? 200 : 400); }
            case "status": {
                if (!config.token_uuid || config.is_enabled === undefined)
                    return c.json({ flag: false, text: 'Invalid Param Request' }, 400);
                const r: TokenResult = await tokens.toggleStatus(config.token_uuid, config.is_enabled);
                return c.json(r, r.flag ? 200 : 400);
            }
            case "user": {
                if (!config.token_user) return c.json({ flag: false, text: 'Invalid User' }, 400);
                const r: TokenResult = await tokens.getByUser(config.token_user);
                return c.json(r, r.flag ? 200 : 400);
            }
            case "enabled": { const r: TokenResult = await tokens.getEnabledTokens(); return c.json(r, r.flag ? 200 : 400); }
            default: return c.json({ flag: false, text: 'Invalid Action' }, 400);
        }
    });
}
