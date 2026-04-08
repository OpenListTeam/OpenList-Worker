/**
 * 挂载管理路由 — /@mount
 * 处理存储挂载的增删改查和驱动管理
 */
import type { Hono, Context } from 'hono';
import { MountManage } from '../mount/MountManage';
import { UsersManage } from '../users/UsersManage';
import { getConfig } from '../types/HonoParsers';

export function mountRoutes(app: Hono<any>) {
    app.use('/@mount/:action/:method/*', async (c: Context): Promise<any> => {
        const action: string = c.req.param('action');
        const method: string = c.req.param('method');
        const config: Record<string, any> = await getConfig(c, 'config');

        // 权限检查 — select和driver操作不需要登录
        if (action !== 'select' && action !== 'driver') {
            const authResult = await UsersManage.checkAuth(c);
            if (!authResult.flag) return c.json(authResult, 401);
        }

        // 创建管理实例
        let mounts: MountManage = new MountManage(c);

        // 方法路由
        switch (method) {
            case "path": {
                config.mount_path = "/" + c.req.path.split('/').slice(4).join('/');
                break;
            }
            case "uuid": {
                const result = await mounts.select();
                if (!result.data) return c.json({ flag: false, text: 'No UUID Matched' }, 400);
                break;
            }
            case "none": break;
            default: return c.json({ flag: false, text: 'Invalid Method' }, 400);
        }

        // 参数校验
        if (!config.mount_path && action != "select" && action != "driver")
            return c.json({ flag: false, text: 'Invalid Path' }, 400);

        // 操作路由
        switch (action) {
            case "select": {
                const result = await mounts.select();
                return c.json(result, result.flag ? 200 : 400);
            }
            case "create": {
                if (!config.mount_path || !config.mount_type || !config.drive_conf)
                    return c.json({ flag: false, text: 'Invalid Param Request' }, 400);
                const result = await mounts.create(config as any);
                return c.json(result, result.flag ? 200 : 400);
            }
            case "remove": {
                const result = await mounts.remove(config.mount_path);
                return c.json(result, result.flag ? 200 : 400);
            }
            case "config": {
                const result = await mounts.config(config as any);
                return c.json(result, result.flag ? 200 : 400);
            }
            case "driver": {
                const result = await mounts.driver();
                return c.json(result, result.flag ? 200 : 400);
            }
            case "reload": {
                const result = await mounts.reload(config.mount_path);
                return c.json(result, result.flag ? 200 : 400);
            }
            default: return c.json({ flag: false, text: 'Invalid Action' }, 400);
        }
    });
}
