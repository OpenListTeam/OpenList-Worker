/**
 * 系统初始化路由 — /@setup
 * 与 GO 后端系统初始化逻辑对齐
 *
 * 端点：
 *   GET  /@setup/status/none  — 检查系统是否已初始化（公开，无需认证）
 *   POST /@setup/init/none    — 执行首次初始化（创建管理员账户）
 *   GET  /@setup/info/none    — 获取系统信息（需要认证）
 */
import type { Hono, Context } from 'hono';
import { SystemManage } from '../setup/SystemManage';
import { UsersManage } from '../users/UsersManage';
import { SavesManage } from '../saves/SavesManage';
import { successResp, errorResp } from '../types/HttpResponse';

export function setupRoutes(app: Hono<any>) {

    // ------------------------------------------------------------------
    // GET /@setup/status/none — 检查系统是否已初始化
    // 公开接口，无需认证
    // ------------------------------------------------------------------
    app.get('/@setup/status/none', async (c: Context): Promise<any> => {
        try {
            const db = new SavesManage(c);
            const result = await db.find({ main: 'users', keys: {} });
            const initialized = result.flag && result.data && result.data.length > 0;
            return successResp(c, { initialized });
        } catch {
            return successResp(c, { initialized: false });
        }
    });

    // ------------------------------------------------------------------
    // POST /@setup/init/none — 首次初始化（创建管理员账户）
    // 公开接口，无需认证；若已初始化则拒绝
    // ------------------------------------------------------------------
    app.post('/@setup/init/none', async (c: Context): Promise<any> => {
        try {
            const db = new SavesManage(c);
            const existResult = await db.find({ main: 'users', keys: {} });
            if (existResult.flag && existResult.data && existResult.data.length > 0) {
                return errorResp(c, '系统已初始化，无法重复执行', 400);
            }

            let body: any = {};
            try { body = await c.req.json(); } catch { /* 使用默认值 */ }

            const adminName = body.username || 'admin';
            const adminPass = body.password || 'admin123';
            const adminMail = body.email || '';

            if (adminPass.length < 6) {
                return errorResp(c, '管理员密码至少6个字符', 400);
            }

            const usersManage = new UsersManage(c);
            const createResult = await usersManage.create({
                users_name: adminName,
                users_pass: adminPass,
                users_mail: adminMail,
                users_mask: 'admin',
                is_enabled: true,
                total_size: 1024 * 1024 * 1024 * 100, // 100GB
                total_used: 0,
            });

            if (!createResult.flag) {
                return errorResp(c, createResult.text || '初始化失败', 500);
            }

            return successResp(c, { message: '系统初始化成功', username: adminName });
        } catch (error: any) {
            return errorResp(c, error.message || '初始化失败', 500);
        }
    });

    // ------------------------------------------------------------------
    // GET /@setup/info/none — 获取系统信息（需要认证）
    // ------------------------------------------------------------------
    app.get('/@setup/info/none', async (c: Context): Promise<any> => {
        const authResult = await UsersManage.checkAuth(c);
        if (!authResult.flag) return errorResp(c, authResult.text || '未登录', 401);

        const system = new SystemManage(c);
        const result = await system.getSystemInfo();
        if (!result.flag) return errorResp(c, result.text || '获取系统信息失败', 500);
        return successResp(c, result.data);
    });

    // ------------------------------------------------------------------
    // 旧版兼容路由（保留原有格式）
    // ------------------------------------------------------------------
    app.use('/@setup/:action/:method', async (c: Context): Promise<any> => {
        const action: string = c.req.param('action');
        const method: string = c.req.param('method');

        if (action === 'status') {
            try {
                const db = new SavesManage(c);
                const result = await db.find({ main: 'users', keys: {} });
                const initialized = result.flag && result.data && result.data.length > 0;
                return c.json({ flag: true, text: 'OK', data: { initialized } });
            } catch {
                return c.json({ flag: true, text: 'OK', data: { initialized: false } });
            }
        }

        if (action === 'init') {
            try {
                const db = new SavesManage(c);
                const existResult = await db.find({ main: 'users', keys: {} });
                if (existResult.flag && existResult.data && existResult.data.length > 0) {
                    return c.json({ flag: false, text: '系统已初始化' }, 400);
                }
                let body: any = {};
                try { body = await c.req.json(); } catch { /* 使用默认值 */ }
                const usersManage = new UsersManage(c);
                const createResult = await usersManage.create({
                    users_name: body.username || 'admin',
                    users_pass: body.password || 'admin123',
                    users_mail: body.email || '',
                    users_mask: 'admin',
                    is_enabled: true,
                    total_size: 1024 * 1024 * 1024 * 100,
                    total_used: 0,
                });
                return c.json(createResult, createResult.flag ? 200 : 400);
            } catch (error: any) {
                return c.json({ flag: false, text: error.message || '初始化失败' }, 500);
            }
        }

        // 需要认证的操作
        const authResult = await UsersManage.checkAuth(c);
        if (!authResult.flag) return c.json(authResult, 401);

        if (action === 'info') {
            const system = new SystemManage(c);
            const result = await system.getSystemInfo();
            return c.json(result, result.flag ? 200 : 400);
        }

        return c.json({ flag: false, text: 'Invalid Action' }, 400);
    });
}
