/**
 * 用户管理路由 — /@users
 * 处理用户注册、登录、登出、信息管理
 */
import type { Hono, Context } from 'hono';
import { UsersManage } from '../users/UsersManage';
import type { UsersResult, UsersConfig } from '../users/UsersObject';
import { getConfig } from '../types/HonoParsers';

export function usersRoutes(app: Hono<any>) {
    app.use('/@users/:action/:method/*', async (c: Context): Promise<any> => {
        const action: string = c.req.param('action');
        const method: string = c.req.param('method');
        const source: string = "/" + (c.req.param('source') || "");
        const config: Record<string, any> = await getConfig(c, 'config');

        // 权限检查 — create和login不需要登录
        if (action !== 'create' && action !== 'login') {
            const authResult = await UsersManage.checkAuth(c);
            if (!authResult.flag) return c.json(authResult, 401);
        }

        let users: UsersManage = new UsersManage(c);

        // 方法路由
        switch (method) {
            case "name": {
                const result: UsersResult = await users.select(source);
                if (!result.data) return c.json({ flag: false, text: 'No UUID Matched' }, 400);
                break;
            }
            case "none": break;
            default: return c.json({ flag: false, text: 'Invalid Method' }, 400);
        }

        if (!config.users_name && action != "select")
            return c.json({ flag: false, text: 'Invalid Name' }, 400);

        // 操作路由
        switch (action) {
            case "select": {
                const result: UsersResult = await users.select();
                return c.json(result, result.flag ? 200 : 400);
            }
            case "create": {
                const userData: UsersConfig = {
                    users_name: config.users_name,
                    users_mail: config.users_mail,
                    users_pass: config.users_pass
                };
                const result: UsersResult = await users.create(userData);
                return c.json(result, result.flag ? 200 : 400);
            }
            case "remove": {
                const result: UsersResult = await users.remove(config.users_name);
                return c.json(result, result.flag ? 200 : 400);
            }
            case "config": {
                const result: UsersResult = await users.config(config as UsersConfig);
                return c.json(result, result.flag ? 200 : 400);
            }
            case "login": {
                const loginData: UsersConfig = {
                    users_name: config.users_name,
                    users_pass: config.users_pass
                };
                const result: UsersResult = await users.log_in(loginData);
                return c.json(result, result.flag ? 200 : 400);
            }
            case "logout": {
                const token = c.req.header('Authorization')?.replace('Bearer ', '');
                const result: UsersResult = await users.logout(token);
                return c.json(result, result.flag ? 200 : 400);
            }
            case "oauth-unbind": {
                if (!config.users_name || !config.oauth_name || !config.oauth_user_id)
                    return c.json({ flag: false, text: 'Invalid Parameters' }, 400);
                const result: UsersResult = await users.unbindOAuth(config.users_name, config.oauth_name, config.oauth_user_id);
                return c.json(result, result.flag ? 200 : 400);
            }
            case "password": {
                // 修改密码：需要验证旧密码
                if (!config.users_name || !config.old_password || !config.new_password)
                    return c.json({ flag: false, text: '请提供用户名、旧密码和新密码' }, 400);
                if (config.new_password.length < 6)
                    return c.json({ flag: false, text: '新密码至少6个字符' }, 400);
                
                // 先验证旧密码
                const loginCheck: UsersResult = await users.log_in({
                    users_name: config.users_name,
                    users_pass: config.old_password,
                });
                if (!loginCheck.flag) {
                    return c.json({ flag: false, text: '当前密码不正确' }, 400);
                }
                
                // 更新密码
                const updateResult: UsersResult = await users.config({
                    users_name: config.users_name,
                    users_pass: config.new_password,
                } as UsersConfig);
                return c.json(updateResult, updateResult.flag ? 200 : 400);
            }
            default: return c.json({ flag: false, text: 'Invalid Action' }, 400);
        }
    });
}
