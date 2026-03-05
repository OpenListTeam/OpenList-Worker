/**
 * OAuth Token管理路由 — /@oauth-token
 */
import type { Hono, Context } from 'hono';
import { TokenManage } from '../oauth/TokenManage';
import { getConfig } from '../types/HonoParsers';

export function oauthTokenRoutes(app: Hono<any>) {
    app.use('/@oauth-token/:action/:method/*', async (c: Context): Promise<any> => {
        const action: string = c.req.param('action');
        const method: string = c.req.param('method');
        const source: string = "/" + (c.req.param('source') || "");
        const config: Record<string, any> = await getConfig(c, 'config');

        let oauthToken: TokenManage = new TokenManage(c);

        switch (method) {
            case "name": {
                const oauth_name = source.substring(1);
                if (!oauth_name) return c.json({ flag: false, text: 'Invalid OAuth Name' }, 400);

                switch (action) {
                    case "authurl": {
                        if (!config.redirect_uri) return c.json({ flag: false, text: 'Missing redirect_uri' }, 400);
                        const r = await oauthToken.generateAuthUrl(oauth_name, config.redirect_uri, config.state);
                        return c.json(r, r.flag ? 200 : 400);
                    }
                    case "callback": {
                        if (!config.code) return c.json({ flag: false, text: 'Missing authorization code' }, 400);
                        const r = await oauthToken.handleCallback({
                            oauth_name, code: config.code, state: config.state, redirect_uri: config.redirect_uri
                        });
                        return c.json(r, r.flag ? 200 : 400);
                    }
                    case "tokens": {
                        const r = await oauthToken.getUserTokens(config.user_id, oauth_name);
                        return c.json(r, r.flag ? 200 : 400);
                    }
                    case "refresh": {
                        if (!config.refresh_token) return c.json({ flag: false, text: 'Missing refresh_token' }, 400);
                        const r = await oauthToken.refreshToken(oauth_name, config.refresh_token);
                        return c.json(r, r.flag ? 200 : 400);
                    }
                    case "validate": {
                        if (!config.access_token) return c.json({ flag: false, text: 'Missing access_token' }, 400);
                        const r = await oauthToken.validateToken(oauth_name, config.access_token);
                        return c.json(r, r.flag ? 200 : 400);
                    }
                    case "revoke": {
                        if (!config.access_token) return c.json({ flag: false, text: 'Missing access_token' }, 400);
                        const r = await oauthToken.revokeToken(oauth_name, config.access_token);
                        return c.json(r, r.flag ? 200 : 400);
                    }
                    case "bind": {
                        if (!config.code) return c.json({ flag: false, text: 'Missing authorization code' }, 400);
                        const r = await oauthToken.bindAccount({
                            oauth_name, code: config.code, state: config.state, redirect_uri: config.redirect_uri
                        });
                        return c.json(r, r.flag ? 200 : 400);
                    }
                    default: return c.json({ flag: false, text: 'Invalid Action' }, 400);
                }
            }
            case "none": {
                switch (action) {
                    case "tokens": {
                        const r = await oauthToken.getUserTokens(config.user_id);
                        return c.json(r, r.flag ? 200 : 400);
                    }
                    default: return c.json({ flag: false, text: 'Invalid Action' }, 400);
                }
            }
            default: return c.json({ flag: false, text: 'Invalid Method' }, 400);
        }
    });
}
