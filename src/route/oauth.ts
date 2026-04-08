/**
 * OAuth认证管理路由 — /@oauth
 */
import type { Hono, Context } from 'hono';
import { OauthManage } from '../oauth/OauthManage';
import type { OauthConfig } from '../oauth/OauthObject';
import { UsersManage } from '../users/UsersManage';
import { getConfig } from '../types/HonoParsers';

export function oauthRoutes(app: Hono<any>) {
    app.use('/@oauth/:action/:method/*', async (c: Context): Promise<any> => {
        const action: string = c.req.param('action');
        const method: string = c.req.param('method');
        const source: string = "/" + (c.req.param('source') || "");
        const config: Record<string, any> = await getConfig(c, 'config');

        let oauth: OauthManage = new OauthManage(c);

        // enabled action 不需要认证（登录页需要显示可用的OAuth选项）
        if (action === 'enabled') {
            const r = await oauth.getEnabledOauth();
            // 对未登录用户隐藏敏感的 oauth_data 字段
            if (r.flag && r.data) {
                r.data = r.data.map(item => ({
                    oauth_name: item.oauth_name,
                    oauth_type: item.oauth_type,
                    oauth_data: '', // 不暴露client_secret等敏感信息
                    is_enabled: item.is_enabled,
                }));
            }
            return c.json(r, r.flag ? 200 : 400);
        }

        // 其他action需要管理员认证
        const authResult = await UsersManage.checkAuth(c);
        if (!authResult.flag) return c.json(authResult, 401);

        switch (method) {
            case "name": {
                const result = await oauth.select(source);
                if (!result.data || result.data.length === 0)
                    return c.json({ flag: false, text: 'No OAuth Config Matched' }, 400);
                break;
            }
            case "none": break;
            default: return c.json({ flag: false, text: 'Invalid Method' }, 400);
        }

        switch (action) {
            case "select": { const r = await oauth.select(); return c.json(r, r.flag ? 200 : 400); }
            case "create": {
                if (!config.oauth_name || !config.oauth_type || !config.oauth_data)
                    return c.json({ flag: false, text: 'Invalid OAuth Name, Type or Data' }, 400);
                const oauthData: OauthConfig = {
                    oauth_name: config.oauth_name,
                    oauth_type: config.oauth_type,
                    oauth_data: config.oauth_data,
                    is_enabled: config.is_enabled !== undefined ? config.is_enabled : 1
                };
                const r = await oauth.create(oauthData);
                return c.json(r, r.flag ? 200 : 400);
            }
            case "remove": {
                if (!config.oauth_name) return c.json({ flag: false, text: 'Invalid OAuth Name' }, 400);
                const r = await oauth.remove(config.oauth_name);
                return c.json(r, r.flag ? 200 : 400);
            }
            case "config": { const r = await oauth.config(config as OauthConfig); return c.json(r, r.flag ? 200 : 400); }
            case "status": {
                if (!config.oauth_name || config.is_enabled === undefined)
                    return c.json({ flag: false, text: 'Invalid Param Request' }, 400);
                const r = await oauth.toggleStatus(config.oauth_name, config.is_enabled);
                return c.json(r, r.flag ? 200 : 400);
            }
            case "type": {
                if (!config.oauth_type) return c.json({ flag: false, text: 'Invalid OAuth Type' }, 400);
                const r = await oauth.getByType(config.oauth_type);
                return c.json(r, r.flag ? 200 : 400);
            }
            case "validate": {
                if (!config.oauth_name) return c.json({ flag: false, text: 'Invalid OAuth Name' }, 400);
                const r = await oauth.validateConfig(config.oauth_name);
                return c.json(r, r.flag ? 200 : 400);
            }
            case "updatedata": {
                if (!config.oauth_name || !config.oauth_data)
                    return c.json({ flag: false, text: 'Invalid OAuth Name or Data' }, 400);
                const r = await oauth.updateData(config.oauth_name, config.oauth_data);
                return c.json(r, r.flag ? 200 : 400);
            }
            case "updatetype": {
                if (!config.oauth_name || !config.oauth_type)
                    return c.json({ flag: false, text: 'Invalid OAuth Name or Type' }, 400);
                const r = await oauth.updateType(config.oauth_name, config.oauth_type);
                return c.json(r, r.flag ? 200 : 400);
            }
            default: return c.json({ flag: false, text: 'Invalid Action' }, 400);
        }
    });
}
