/**
 * 任务管理路由 — /@tasks
 */
import type { Hono, Context } from 'hono';
import { TasksManage } from '../tasks/TasksManage';
import type { TasksResult, TasksConfig } from '../tasks/TasksObject';
import { UsersManage } from '../users/UsersManage';
import { getConfig } from '../types/HonoParsers';

export function tasksRoutes(app: Hono<any>) {
    app.use('/@tasks/:action/:method/*', async (c: Context): Promise<any> => {
        const action: string = c.req.param('action');
        const method: string = c.req.param('method');
        const source: string = "/" + (c.req.param('source') || "");
        const config: Record<string, any> = await getConfig(c, 'config');

        const authResult = await UsersManage.checkAuth(c);
        if (!authResult.flag) return c.json(authResult, 401);

        let tasks: TasksManage = new TasksManage(c);

        switch (method) {
            case "uuid": {
                const result: TasksResult = await tasks.select(source);
                if (!result.data || result.data.length === 0)
                    return c.json({ flag: false, text: 'No UUID Matched' }, 400);
                break;
            }
            case "none": break;
            default: return c.json({ flag: false, text: 'Invalid Method' }, 400);
        }

        switch (action) {
            case "select": { const r: TasksResult = await tasks.select(); return c.json(r, r.flag ? 200 : 400); }
            case "create": {
                if (!config.tasks_type || !config.tasks_user || !config.tasks_info)
                    return c.json({ flag: false, text: 'Invalid Param Request' }, 400);
                const tasksData: TasksConfig = {
                    tasks_uuid: config.tasks_uuid || "",
                    tasks_type: config.tasks_type,
                    tasks_user: config.tasks_user,
                    tasks_info: config.tasks_info,
                    tasks_flag: config.tasks_flag || 0
                };
                const r: TasksResult = await tasks.create(tasksData);
                return c.json(r, r.flag ? 200 : 400);
            }
            case "remove": {
                if (!config.tasks_uuid) return c.json({ flag: false, text: 'Invalid UUID' }, 400);
                const r: TasksResult = await tasks.remove(config.tasks_uuid);
                return c.json(r, r.flag ? 200 : 400);
            }
            case "config": { const r: TasksResult = await tasks.config(config as TasksConfig); return c.json(r, r.flag ? 200 : 400); }
            case "status": {
                if (!config.tasks_uuid || config.tasks_flag === undefined)
                    return c.json({ flag: false, text: 'Invalid Param Request' }, 400);
                const r: TasksResult = await tasks.updateStatus(config.tasks_uuid, config.tasks_flag);
                return c.json(r, r.flag ? 200 : 400);
            }
            case "user": {
                if (!config.tasks_user) return c.json({ flag: false, text: 'Invalid User' }, 400);
                const r: TasksResult = await tasks.getByUser(config.tasks_user);
                return c.json(r, r.flag ? 200 : 400);
            }
            case "byStatus": {
                if (config.tasks_flag === undefined) return c.json({ flag: false, text: 'Invalid Status' }, 400);
                const r: TasksResult = await tasks.getByStatus(config.tasks_flag);
                return c.json(r, r.flag ? 200 : 400);
            }
            default: return c.json({ flag: false, text: 'Invalid Action' }, 400);
        }
    });
}
