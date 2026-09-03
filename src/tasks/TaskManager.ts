/**
 * 统一任务管理器（TaskManager）
 * 
 * 对齐 Go 后端 internal/task 体系，提供：
 *   - 任务持久化到 D1（支持复制/移动/上传/解压/离线下载/索引构建等类型）
 *   - submit / query / cancel / retry / list API
 *   - scheduled tick 恢复 in-progress 任务
 *   - 离线下载工具的适配层接口
 */
import type { Context } from 'hono';

// ============================================================
// 类型定义（对齐 Go 端 model/task.go）
// ============================================================

/** 任务类型 */
export type TaskType =
    | 'copy'
    | 'move'
    | 'upload'
    | 'decompress'
    | 'offline_download'
    | 'aria2'
    | 'qbit'
    | 'transmission'
    | 'index_build'
    | 'index_update'
    | 'scan';

/** 任务状态 */
export type TaskState =
    | 'pending'       // 等待执行
    | 'running'       // 执行中
    | 'retrying'      // 重试中
    | 'done'          // 已完成
    | 'failed'        // 失败
    | 'cancelled';    // 已取消

export interface TaskRecord {
    id: string;
    type: TaskType;
    state: TaskState;
    name: string;
    progress: number;         // 0-100
    error?: string;
    status_text?: string;     // 可读的状态文字
    payload: Record<string, any>;  // 任务参数
    result?: Record<string, any>;  // 任务结果
    created_at: string;
    updated_at: string;
    retry_count: number;
    max_retries: number;
}

export interface TaskListResult {
    content: TaskRecord[];
    total: number;
}

// ============================================================
// TaskManager
// ============================================================

export class TaskManager {
    private c: Context;
    private d1: any;

    constructor(c: Context) {
        this.c = c;
        this.d1 = c.env?.D1_DATA;
    }

    /**
     * 提交新任务
     */
    async submit(
        type: TaskType,
        name: string,
        payload: Record<string, any>,
        maxRetries: number = 3,
    ): Promise<{ flag: boolean; text?: string; data?: TaskRecord }> {
        const id = `task_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
        const now = new Date().toISOString();

        const task: TaskRecord = {
            id,
            type,
            state: 'pending',
            name,
            progress: 0,
            payload,
            created_at: now,
            updated_at: now,
            retry_count: 0,
            max_retries: maxRetries,
        };

        try {
            if (this.d1) {
                await this.d1.prepare(
                    `INSERT INTO tasks (id, type, state, name, progress, payload, created_at, updated_at, retry_count, max_retries)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
                ).bind(id, type, task.state, name, 0, JSON.stringify(payload), now, now, 0, maxRetries).run();
            }
            return { flag: true, data: task };
        } catch (e: any) {
            return { flag: false, text: e?.message || '创建任务失败' };
        }
    }

    /**
     * 查询单个任务
     */
    async query(id: string): Promise<{ flag: boolean; data?: TaskRecord }> {
        try {
            if (!this.d1) return { flag: false };
            const row = await this.d1.prepare('SELECT * FROM tasks WHERE id = ?').bind(id).first();
            if (!row) return { flag: false };
            return { flag: true, data: this.mapRow(row) };
        } catch {
            return { flag: false };
        }
    }

    /**
     * 查询任务列表
     */
    async list(
        type?: TaskType,
        state?: TaskState,
        limit: number = 20,
        offset: number = 0,
    ): Promise<{ flag: boolean; data?: TaskListResult }> {
        try {
            if (!this.d1) return { flag: true, data: { content: [], total: 0 } };

            let sql = 'SELECT * FROM tasks WHERE 1=1';
            const params: any[] = [];

            if (type) { sql += ' AND type = ?'; params.push(type); }
            if (state) { sql += ' AND state = ?'; params.push(state); }

            const countResult = await this.d1.prepare(sql.replace('SELECT *', 'SELECT COUNT(*) as cnt')).bind(...params).first();

            sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
            params.push(limit, offset);

            const rows = await this.d1.prepare(sql).bind(...params).all();
            const results = (rows.results || []).map((r: any) => this.mapRow(r));

            return { flag: true, data: { content: results, total: countResult?.cnt || 0 } };
        } catch {
            return { flag: true, data: { content: [], total: 0 } };
        }
    }

    /**
     * 取消任务
     */
    async cancel(id: string): Promise<{ flag: boolean; text?: string }> {
        try {
            if (!this.d1) return { flag: false, text: '数据库不可用' };
            const now = new Date().toISOString();
            await this.d1.prepare('UPDATE tasks SET state = ?, updated_at = ? WHERE id = ? AND state IN (?, ?)')
                .bind('cancelled', now, id, 'pending', 'running').run();
            return { flag: true };
        } catch (e: any) {
            return { flag: false, text: e?.message };
        }
    }

    /**
     * 重试失败任务
     */
    async retry(id: string): Promise<{ flag: boolean; text?: string }> {
        try {
            if (!this.d1) return { flag: false, text: '数据库不可用' };
            const now = new Date().toISOString();
            await this.d1.prepare('UPDATE tasks SET state = ?, updated_at = ?, retry_count = retry_count + 1 WHERE id = ? AND state = ?')
                .bind('retrying', now, id, 'failed').run();
            return { flag: true };
        } catch (e: any) {
            return { flag: false, text: e?.message };
        }
    }

    /**
     * 删除任务
     */
    async delete(id: string): Promise<{ flag: boolean }> {
        try {
            if (!this.d1) return { flag: false };
            await this.d1.prepare('DELETE FROM tasks WHERE id = ?').bind(id).run();
            return { flag: true };
        } catch {
            return { flag: false };
        }
    }

    /**
     * 更新任务状态
     */
    async update(id: string, update: Partial<Pick<TaskRecord, 'state' | 'progress' | 'error' | 'status_text' | 'result'>>): Promise<void> {
        if (!this.d1) return;
        const now = new Date().toISOString();
        const sets: string[] = ['updated_at = ?'];
        const params: any[] = [now];

        if (update.state !== undefined) { sets.push('state = ?'); params.push(update.state); }
        if (update.progress !== undefined) { sets.push('progress = ?'); params.push(update.progress); }
        if (update.error !== undefined) { sets.push('error = ?'); params.push(update.error); }
        if (update.result !== undefined) { sets.push('result = ?'); params.push(JSON.stringify(update.result)); }

        params.push(id);
        await this.d1.prepare(`UPDATE tasks SET ${sets.join(', ')} WHERE id = ?`).bind(...params).run();
    }

    /**
     * 恢复 in-progress 任务（冷启动后调度）
     */
    async recoverStale(): Promise<TaskRecord[]> {
        if (!this.d1) return [];
        try {
            const rows = await this.d1.prepare("SELECT * FROM tasks WHERE state IN ('running', 'retrying')").bind().all();
            const tasks = (rows.results || []).map((r: any) => this.mapRow(r));
            // 将所有 running/retrying 任务重置为 pending 以重新调度
            for (const task of tasks) {
                await this.d1.prepare("UPDATE tasks SET state = 'pending', updated_at = ? WHERE id = ?")
                    .bind(new Date().toISOString(), task.id).run();
            }
            return tasks;
        } catch {
            return [];
        }
    }

    private mapRow(row: any): TaskRecord {
        return {
            id: row.id,
            type: row.type as TaskType,
            state: row.state as TaskState,
            name: row.name,
            progress: row.progress || 0,
            error: row.error,
            status_text: row.status_text,
            payload: typeof row.payload === 'string' ? JSON.parse(row.payload) : (row.payload || {}),
            result: typeof row.result === 'string' ? JSON.parse(row.result) : (row.result || undefined),
            created_at: row.created_at,
            updated_at: row.updated_at,
            retry_count: row.retry_count || 0,
            max_retries: row.max_retries || 3,
        };
    }
}

// ============================================================
// IDownloadTool 离线下载工具接口（对齐 Go 端）
// ============================================================

export interface IDownloadTool {
    /** 工具标识（与 add_offline_download 的 tool 参数一致） */
    readonly toolKey: string;
    /** 可读的工具名称 */
    readonly displayName: string;
    /** 是否启用（基于管理员配置） */
    isEnabled(): Promise<boolean>;
    /** 提交下载任务 */
    addURLs(urls: string[], destPath: string, ctx: Context): Promise<{ taskId: string; ok: boolean; error?: string }>;
    /** 查询任务进度 */
    getProgress(taskId: string, ctx: Context): Promise<{ state: string; progress: number; error?: string }>;
    /** 取消任务 */
    cancel(taskId: string, ctx: Context): Promise<boolean>;
}

/** 离线下载工具注册表 */
export const downloadToolRegistry: Map<string, IDownloadTool> = new Map();

export function registerDownloadTool(tool: IDownloadTool): void {
    downloadToolRegistry.set(tool.toolKey, tool);
}
