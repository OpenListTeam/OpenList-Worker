/**
 * 加密配置路由 — /@crypt
 * 处理加密组的增删改查
 */
import type { Hono, Context } from 'hono';
import { CryptManage } from '../crypt/CryptManage';
import type { CryptInfo } from '../crypt/CryptObject';
import { UsersManage } from '../users/UsersManage';
import { getConfig } from '../types/HonoParsers';

export function cryptRoutes(app: Hono<any>) {
    app.use('/@crypt/:action/:method/*', async (c: Context): Promise<any> => {
        const action: string = c.req.param('action');
        const method: string = c.req.param('method');
        const source: string = "/" + (c.req.param('source') || "");
        const config: Record<string, any> = await getConfig(c, 'config');

        const authResult = await UsersManage.checkAuth(c);
        if (!authResult.flag) return c.json(authResult, 401);

        let crypt: CryptManage = new CryptManage(c);

        switch (method) {
            case "name": {
                const result = await crypt.select(source);
                if (!result.data || result.data.length === 0)
                    return c.json({ flag: false, text: 'No Crypt Config Matched' }, 400);
                break;
            }
            case "none": break;
            default: return c.json({ flag: false, text: 'Invalid Method' }, 400);
        }

        switch (action) {
            case "select": { const r = await crypt.select(); return c.json(r, r.flag ? 200 : 400); }
            case "create": {
                if (!config.crypt_name) return c.json({ flag: false, text: 'Invalid Crypt Name' }, 400);
                const cryptData: CryptInfo = {
                    crypt_name: config.crypt_name,
                    crypt_user: config.crypt_user || "",
                    crypt_pass: config.crypt_pass || "",
                    crypt_type: config.crypt_type || 1,
                    crypt_mode: config.crypt_mode || 0x03,
                    is_enabled: config.is_enabled !== undefined ? config.is_enabled : true,
                    crypt_self: config.crypt_self || false,
                    rands_pass: config.rands_pass || false,
                    write_name: config.write_name || "",
                    oauth_data: config.oauth_data || {}
                };
                const r = await crypt.create(cryptData);
                return c.json(r, r.flag ? 200 : 400);
            }
            case "remove": {
                if (!config.crypt_name) return c.json({ flag: false, text: 'Invalid Crypt Name' }, 400);
                const r = await crypt.remove(config.crypt_name);
                return c.json(r, r.flag ? 200 : 400);
            }
            case "config": { const r = await crypt.config(config as CryptInfo); return c.json(r, r.flag ? 200 : 400); }
            case "status": {
                if (!config.crypt_name || config.is_enabled === undefined)
                    return c.json({ flag: false, text: 'Invalid Param Request' }, 400);
                const r = await crypt.toggleStatus(config.crypt_name, config.is_enabled);
                return c.json(r, r.flag ? 200 : 400);
            }
            case "enabled": { const r = await crypt.getEnabledCrypts(); return c.json(r, r.flag ? 200 : 400); }
            case "user": {
                if (!config.crypt_user) return c.json({ flag: false, text: 'Invalid User' }, 400);
                const r = await crypt.getUserCrypts(config.crypt_user);
                return c.json(r, r.flag ? 200 : 400);
            }
            default: return c.json({ flag: false, text: 'Invalid Action' }, 400);
        }
    });
}
