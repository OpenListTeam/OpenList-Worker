/**
 * 全文搜索服务（SearchService）
 * 
 * 对齐 Go 后端 internal/search 体系。
 * Workers 环境下使用 D1 FTS5 作为默认后端（db_full_text 模式），
 * 同时支持 SQL LIKE 降级模式（db_non_full_text）。
 */
import type { Context } from 'hono';
import { TaskManager, type TaskRecord } from '../tasks/TaskManager';

export interface SearchParams {
    parent: string;
    keywords: string;
    scope?: number;       // 0=当前目录, 1=递归
    page?: number;
    per_page?: number;
}

export interface SearchResult {
    content: SearchEntry[];
    total: number;
}

export interface SearchEntry {
    parent: string;
    name: string;
    is_dir: boolean;
    size: number;
    mtime: string;
    storage_id?: string;
    type?: number;
}

export class SearchService {
    private c: Context;
    private d1: any;

    constructor(c: Context) {
        this.c = c;
        this.d1 = c.env?.D1_DATA;
    }

    /** 执行搜索 */
    async search(params: SearchParams): Promise<{ flag: boolean; data?: SearchResult; text?: string }> {
        if (!this.d1) return { flag: false, text: '数据库不可用' };

        const { parent, keywords, scope = 0, page = 1, per_page = 50 } = params;
        const offset = (page - 1) * per_page;

        try {
            let sql: string;
            let countSql: string;
            const sqlParams: any[] = [`%${keywords}%`];

            if (scope === 1) {
                // 递归搜索
                sql = `SELECT * FROM search_node WHERE name LIKE ? ORDER BY is_dir DESC, name ASC LIMIT ? OFFSET ?`;
                countSql = `SELECT COUNT(*) as cnt FROM search_node WHERE name LIKE ?`;
            } else {
                // 当前目录搜索
                sql = `SELECT * FROM search_node WHERE parent = ? AND name LIKE ? ORDER BY is_dir DESC, name ASC LIMIT ? OFFSET ?`;
                countSql = `SELECT COUNT(*) as cnt FROM search_node WHERE parent = ? AND name LIKE ?`;
                sqlParams.unshift(parent);
            }

            const countResult = await this.d1.prepare(countSql).bind(...(scope === 1 ? [`%${keywords}%`] : [parent, `%${keywords}%`])).first();
            const rows = await this.d1.prepare(sql).bind(...sqlParams, per_page, offset).all();

            const content: SearchEntry[] = (rows.results || []).map((r: any) => ({
                parent: r.parent,
                name: r.name,
                is_dir: r.is_dir === 1 || r.is_dir === true,
                size: r.size || 0,
                mtime: r.mtime,
                storage_id: r.storage_id,
                type: r.is_dir ? 1 : 0,
            }));

            return { flag: true, data: { content, total: countResult?.cnt || 0 } };
        } catch (e: any) {
            return { flag: false, text: e?.message || '搜索失败' };
        }
    }

    /** 构建索引（异步任务） */
    async buildIndex(paths: string[], mode: 'full_text' | 'filename_only' = 'filename_only'): Promise<{ taskId?: string }> {
        const tm = new TaskManager(this.c);
        const result = await tm.submit('index_build', `索引构建: ${paths.join(', ')}`, { paths, mode });
        return { taskId: result.data?.id };
    }

    /** 更新索引 */
    async updateIndex(paths: string[]): Promise<{ taskId?: string }> {
        const tm = new TaskManager(this.c);
        const result = await tm.submit('index_update', `索引更新: ${paths.join(', ')}`, { paths });
        return { taskId: result.data?.id };
    }

    /** 清空索引 */
    async clearIndex(): Promise<{ flag: boolean }> {
        try {
            if (!this.d1) return { flag: false };
            await this.d1.prepare('DELETE FROM search_node').run();
            return { flag: true };
        } catch { return { flag: false }; }
    }
}
