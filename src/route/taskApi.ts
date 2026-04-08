/**
 * 任务管理 API 路由 — /api/task/:type/*
 * 与 GO 后端 server/handles/task.go 对齐
 *
 * 支持的任务类型：
 *   upload / copy / move / offline_download / offline_download_transfer
 *   decompress / decompress_upload
 *
 * 端点（每种类型均支持）：
 *   GET  /api/task/:type/undone         — 未完成任务列表
 *   GET  /api/task/:type/done           — 已完成任务列表
 *   POST /api/task/:type/info           — 获取任务详情（Query: tid）
 *   POST /api/task/:type/cancel         — 取消任务（Query: tid）
 *   POST /api/task/:type/delete         — 删除任务（Query: tid）
 *   POST /api/task/:type/retry          — 重试任务（Query: tid）
 *   POST /api/task/:type/cancel_some    — 批量取消（Body: string[]）
 *   POST /api/task/:type/delete_some    — 批量删除（Body: string[]）
 *   POST /api/task/:type/retry_some     — 批量重试（Body: string[]）
 *   POST /api/task/:type/clear_done     — 清除已完成任务
 *   POST /api/task/:type/clear_succeeded — 清除成功任务
 *   POST /api/task/:type/retry_failed   — 重试所有失败任务
 */
import type { Hono, Context } from 'hono';
import { TasksManage } from '../tasks/TasksManage';
import { UsersManage } from '../users/UsersManage';
import { successResp, errorResp } from '../types/HttpResponse';

// ============================================================
// 支持的任务类型
// ============================================================
const VALID_TASK_TYPES = new Set([
    'upload', 'copy', 'move',
    'offline_download', 'offline_download_transfer',
    'decompress', 'decompress_upload',
]);

// ============================================================
// 任务状态枚举（与 GO 后端 tache.State 对齐）
// ============================================================
const TaskState = {
    Pending: 'pending',
    Running: 'running',
    Canceling: 'canceling',
    Canceled: 'canceled',
    Errored: 'errored',
    Failing: 'failing',
    Failed: 'failed',
    WaitingRetry: 'waiting_retry',
    BeforeRetry: 'before_retry',
    Succeeded: 'succeeded',
} as const;

const UNDONE_STATES = new Set([
    TaskState.Pending, TaskState.Running, TaskState.Canceling,
    TaskState.Errored, TaskState.Failing, TaskState.WaitingRetry, TaskState.BeforeRetry,
]);

const DONE_STATES = new Set([
    TaskState.Canceled, TaskState.Failed, TaskState.Succeeded,
]);

// ============================================================
// 工具函数
// ============================================================

async function parseBody(c: Context): Promise<any> {
    const ct = c.req.header('Content-Type') || '';
    try {
        if (ct.includes('application/json')) return await c.req.json();
        return await c.req.json();
    } catch {
        return null;
    }
}

/** 将 TasksManage 的任务对象转换为 GO 后端 TaskInfo 格式 */
function toTaskInfo(task: any): any {
    return {
        id: task.tasks_uuid || task.id,
        name: task.tasks_name || task.name || '',
        creator: task.tasks_user || task.creator || '',
        creator_role: 0,
        state: task.tasks_stat || task.state || TaskState.Pending,
        status: task.tasks_text || task.status || '',
        progress: task.tasks_prog || task.progress || 0,
        start_time: task.start_time || null,
        end_time: task.end_time || null,
        total_bytes: task.total_bytes || 0,
        error: task.tasks_erro || task.error || '',
    };
}

// ============================================================
// 路由注册
// ============================================================
export function taskRoutes(app: Hono<any>) {

    // 类型校验中间件
    app.use('/api/task/:type/*', async (c, next) => {
        const type = c.req.param('type');
        if (!VALID_TASK_TYPES.has(type)) {
            return errorResp(c, `不支持的任务类型: ${type}`, 400);
        }
        await next();
    });

    // ------------------------------------------------------------------
    // GET /api/task/:type/undone — 未完成任务列表
    // ------------------------------------------------------------------
    app.get('/api/task/:type/undone', async (c: Context): Promise<any> => {
        const user = c.get('user');
        if (!user) return errorResp(c, '未登录', 401);

        const type = c.req.param('type');
        const isAdmin = UsersManage.isAdmin(user);

        const tasksManage = new TasksManage(c);
        const result = await tasksManage.select();
        if (!result.flag) return errorResp(c, result.text || '查询失败', 500);

        const tasks = (result.data || [])
            .filter((t: any) => {
                const taskType = t.tasks_type || t.type || '';
                const state = t.tasks_stat || t.state || '';
                const creator = t.tasks_user || t.creator || '';
                return taskType === type &&
                    UNDONE_STATES.has(state) &&
                    (isAdmin || creator === user.users_name);
            })
            .map(toTaskInfo);

        return successResp(c, tasks);
    });

    // ------------------------------------------------------------------
    // GET /api/task/:type/done — 已完成任务列表
    // ------------------------------------------------------------------
    app.get('/api/task/:type/done', async (c: Context): Promise<any> => {
        const user = c.get('user');
        if (!user) return errorResp(c, '未登录', 401);

        const type = c.req.param('type');
        const isAdmin = UsersManage.isAdmin(user);

        const tasksManage = new TasksManage(c);
        const result = await tasksManage.select();
        if (!result.flag) return errorResp(c, result.text || '查询失败', 500);

        const tasks = (result.data || [])
            .filter((t: any) => {
                const taskType = t.tasks_type || t.type || '';
                const state = t.tasks_stat || t.state || '';
                const creator = t.tasks_user || t.creator || '';
                return taskType === type &&
                    DONE_STATES.has(state) &&
                    (isAdmin || creator === user.users_name);
            })
            .map(toTaskInfo);

        return successResp(c, tasks);
    });

    // ------------------------------------------------------------------
    // POST /api/task/:type/info — 获取任务详情
    // Query: tid
    // ------------------------------------------------------------------
    app.post('/api/task/:type/info', async (c: Context): Promise<any> => {
        const user = c.get('user');
        if (!user) return errorResp(c, '未登录', 401);

        const tid = c.req.query('tid');
        if (!tid) return errorResp(c, 'tid 不能为空', 400);

        const tasksManage = new TasksManage(c);
        const result = await tasksManage.select(tid);
        if (!result.flag || !result.data || result.data.length === 0) {
            return errorResp(c, '任务不存在', 404);
        }

        const task = result.data[0];
        const isAdmin = UsersManage.isAdmin(user);
        const creator = (task as any).tasks_user || (task as any).creator || '';
        if (!isAdmin && creator !== user.users_name) {
            return errorResp(c, '任务不存在', 404);
        }

        return successResp(c, toTaskInfo(task));
    });

    // ------------------------------------------------------------------
    // POST /api/task/:type/cancel — 取消任务
    // Query: tid
    // ------------------------------------------------------------------
    app.post('/api/task/:type/cancel', async (c: Context): Promise<any> => {
        const user = c.get('user');
        if (!user) return errorResp(c, '未登录', 401);

        const tid = c.req.query('tid');
        if (!tid) return errorResp(c, 'tid 不能为空', 400);

        const tasksManage = new TasksManage(c);
        const result = await tasksManage.select(tid);
        if (!result.flag || !result.data || result.data.length === 0) {
            return errorResp(c, '任务不存在', 404);
        }

        const task = result.data[0] as any;
        const isAdmin = UsersManage.isAdmin(user);
        if (!isAdmin && (task.tasks_user || task.creator) !== user.users_name) {
            return errorResp(c, '任务不存在', 404);
        }

        // 更新任务状态为已取消
        await tasksManage.config({ tasks_uuid: tid, tasks_stat: TaskState.Canceled } as any);
        return successResp(c);
    });

    // ------------------------------------------------------------------
    // POST /api/task/:type/delete — 删除任务
    // Query: tid
    // ------------------------------------------------------------------
    app.post('/api/task/:type/delete', async (c: Context): Promise<any> => {
        const user = c.get('user');
        if (!user) return errorResp(c, '未登录', 401);

        const tid = c.req.query('tid');
        if (!tid) return errorResp(c, 'tid 不能为空', 400);

        const tasksManage = new TasksManage(c);
        const result = await tasksManage.select(tid);
        if (!result.flag || !result.data || result.data.length === 0) {
            return errorResp(c, '任务不存在', 404);
        }

        const task = result.data[0] as any;
        const isAdmin = UsersManage.isAdmin(user);
        if (!isAdmin && (task.tasks_user || task.creator) !== user.users_name) {
            return errorResp(c, '任务不存在', 404);
        }

        await tasksManage.remove(tid);
        return successResp(c);
    });

    // ------------------------------------------------------------------
    // POST /api/task/:type/retry — 重试任务
    // Query: tid
    // ------------------------------------------------------------------
    app.post('/api/task/:type/retry', async (c: Context): Promise<any> => {
        const user = c.get('user');
        if (!user) return errorResp(c, '未登录', 401);

        const tid = c.req.query('tid');
        if (!tid) return errorResp(c, 'tid 不能为空', 400);

        const tasksManage = new TasksManage(c);
        const result = await tasksManage.select(tid);
        if (!result.flag || !result.data || result.data.length === 0) {
            return errorResp(c, '任务不存在', 404);
        }

        const task = result.data[0] as any;
        const isAdmin = UsersManage.isAdmin(user);
        if (!isAdmin && (task.tasks_user || task.creator) !== user.users_name) {
            return errorResp(c, '任务不存在', 404);
        }

        // 重置任务状态为 pending
        await tasksManage.config({ tasks_uuid: tid, tasks_stat: TaskState.Pending, tasks_erro: '' } as any);
        return successResp(c);
    });

    // ------------------------------------------------------------------
    // POST /api/task/:type/cancel_some — 批量取消
    // Body: string[] (tid 列表)
    // ------------------------------------------------------------------
    app.post('/api/task/:type/cancel_some', async (c: Context): Promise<any> => {
        const user = c.get('user');
        if (!user) return errorResp(c, '未登录', 401);

        const tids: string[] = await parseBody(c) || [];
        if (!Array.isArray(tids)) return errorResp(c, '请求体应为 tid 数组', 400);

        const tasksManage = new TasksManage(c);
        const isAdmin = UsersManage.isAdmin(user);
        const errors: Record<string, string> = {};

        for (const tid of tids) {
            const result = await tasksManage.select(tid);
            if (!result.flag || !result.data || result.data.length === 0) {
                errors[tid] = '任务不存在';
                continue;
            }
            const task = result.data[0] as any;
            if (!isAdmin && (task.tasks_user || task.creator) !== user.users_name) {
                errors[tid] = '任务不存在';
                continue;
            }
            await tasksManage.config({ tasks_uuid: tid, tasks_stat: TaskState.Canceled } as any);
        }

        return successResp(c, errors);
    });

    // ------------------------------------------------------------------
    // POST /api/task/:type/delete_some — 批量删除
    // ------------------------------------------------------------------
    app.post('/api/task/:type/delete_some', async (c: Context): Promise<any> => {
        const user = c.get('user');
        if (!user) return errorResp(c, '未登录', 401);

        const tids: string[] = await parseBody(c) || [];
        if (!Array.isArray(tids)) return errorResp(c, '请求体应为 tid 数组', 400);

        const tasksManage = new TasksManage(c);
        const isAdmin = UsersManage.isAdmin(user);
        const errors: Record<string, string> = {};

        for (const tid of tids) {
            const result = await tasksManage.select(tid);
            if (!result.flag || !result.data || result.data.length === 0) {
                errors[tid] = '任务不存在';
                continue;
            }
            const task = result.data[0] as any;
            if (!isAdmin && (task.tasks_user || task.creator) !== user.users_name) {
                errors[tid] = '任务不存在';
                continue;
            }
            await tasksManage.remove(tid);
        }

        return successResp(c, errors);
    });

    // ------------------------------------------------------------------
    // POST /api/task/:type/retry_some — 批量重试
    // ------------------------------------------------------------------
    app.post('/api/task/:type/retry_some', async (c: Context): Promise<any> => {
        const user = c.get('user');
        if (!user) return errorResp(c, '未登录', 401);

        const tids: string[] = await parseBody(c) || [];
        if (!Array.isArray(tids)) return errorResp(c, '请求体应为 tid 数组', 400);

        const tasksManage = new TasksManage(c);
        const isAdmin = UsersManage.isAdmin(user);
        const errors: Record<string, string> = {};

        for (const tid of tids) {
            const result = await tasksManage.select(tid);
            if (!result.flag || !result.data || result.data.length === 0) {
                errors[tid] = '任务不存在';
                continue;
            }
            const task = result.data[0] as any;
            if (!isAdmin && (task.tasks_user || task.creator) !== user.users_name) {
                errors[tid] = '任务不存在';
                continue;
            }
            await tasksManage.config({ tasks_uuid: tid, tasks_stat: TaskState.Pending, tasks_erro: '' } as any);
        }

        return successResp(c, errors);
    });

    // ------------------------------------------------------------------
    // POST /api/task/:type/clear_done — 清除已完成任务
    // ------------------------------------------------------------------
    app.post('/api/task/:type/clear_done', async (c: Context): Promise<any> => {
        const user = c.get('user');
        if (!user) return errorResp(c, '未登录', 401);

        const type = c.req.param('type');
        const isAdmin = UsersManage.isAdmin(user);

        const tasksManage = new TasksManage(c);
        const result = await tasksManage.select();
        if (!result.flag) return errorResp(c, result.text || '查询失败', 500);

        for (const task of (result.data || [])) {
            const t = task as any;
            const taskType = t.tasks_type || t.type || '';
            const state = t.tasks_stat || t.state || '';
            const creator = t.tasks_user || t.creator || '';
            if (taskType === type && DONE_STATES.has(state) && (isAdmin || creator === user.users_name)) {
                await tasksManage.remove(t.tasks_uuid || t.id);
            }
        }

        return successResp(c);
    });

    // ------------------------------------------------------------------
    // POST /api/task/:type/clear_succeeded — 清除成功任务
    // ------------------------------------------------------------------
    app.post('/api/task/:type/clear_succeeded', async (c: Context): Promise<any> => {
        const user = c.get('user');
        if (!user) return errorResp(c, '未登录', 401);

        const type = c.req.param('type');
        const isAdmin = UsersManage.isAdmin(user);

        const tasksManage = new TasksManage(c);
        const result = await tasksManage.select();
        if (!result.flag) return errorResp(c, result.text || '查询失败', 500);

        for (const task of (result.data || [])) {
            const t = task as any;
            const taskType = t.tasks_type || t.type || '';
            const state = t.tasks_stat || t.state || '';
            const creator = t.tasks_user || t.creator || '';
            if (taskType === type && state === TaskState.Succeeded && (isAdmin || creator === user.users_name)) {
                await tasksManage.remove(t.tasks_uuid || t.id);
            }
        }

        return successResp(c);
    });

    // ------------------------------------------------------------------
    // POST /api/task/:type/retry_failed — 重试所有失败任务
    // ------------------------------------------------------------------
    app.post('/api/task/:type/retry_failed', async (c: Context): Promise<any> => {
        const user = c.get('user');
        if (!user) return errorResp(c, '未登录', 401);

        const type = c.req.param('type');
        const isAdmin = UsersManage.isAdmin(user);

        const tasksManage = new TasksManage(c);
        const result = await tasksManage.select();
        if (!result.flag) return errorResp(c, result.text || '查询失败', 500);

        for (const task of (result.data || [])) {
            const t = task as any;
            const taskType = t.tasks_type || t.type || '';
            const state = t.tasks_stat || t.state || '';
            const creator = t.tasks_user || t.creator || '';
            if (taskType === type && state === TaskState.Failed && (isAdmin || creator === user.users_name)) {
                await tasksManage.config({ tasks_uuid: t.tasks_uuid || t.id, tasks_stat: TaskState.Pending, tasks_erro: '' } as any);
            }
        }

        return successResp(c);
    });
}
