/**
 * 系统初始化路由 — /@setup
 * 获取系统运行状态和信息
 */
import type { Hono, Context } from 'hono';
import { SystemManage } from '../setup/SystemManage';
import type { SystemResult } from '../setup/SystemObject';
import { UsersManage } from '../users/UsersManage';

export function setupRoutes(app: Hono<any>) {
    app.use('/@setup/:action/:method', async (c: Context): Promise<any> => {
        const action: string = c.req.param('action');
        const method: string = c.req.param('method');

        // 权限检查
        const authResult = await UsersManage.checkAuth(c);
        if (!authResult.flag) return c.json(authResult, 401);

        const system: SystemManage = new SystemManage(c);

        switch (action) {
            case "info": {
                const result: SystemResult = await system.getSystemInfo();
                return c.json(result, result.flag ? 200 : 400);
            }
            default: return c.json({ flag: false, text: 'Invalid Action' }, 400);
        }
    });
}
