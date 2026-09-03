/**
 * 媒体库 API 路由
 *
 * 公开接口（无需认证）：
 *   GET  /api/public/media/list          — 分页列出媒体条目
 *   GET  /api/public/media/item/:id      — 获取条目详情
 *   GET  /api/public/media/albums        — 专辑列表（音乐）
 *   GET  /api/public/media/scan_paths    — 扫描路径列表
 *   GET  /api/public/media/stats         — 各类型数量统计
 *
 * 管理接口（需登录且为管理员）：
 *   GET  /api/admin/media/scan_paths           — 扫描路径列表（管理端）
 *   POST /api/admin/media/scan_paths/add       — 添加扫描路径
 *   POST /api/admin/media/scan_paths/remove    — 删除扫描路径
 *   POST /api/admin/media/scan/start           — 启动扫描
 *   GET  /api/admin/media/scan/progress        — 查询扫描进度
 *   POST /api/admin/media/scrape/start         — 批量刮削
 *   GET  /api/admin/media/items                — 管理员视角条目列表
 *   POST /api/admin/media/items/update         — 手动更新条目元数据
 *   POST /api/admin/media/items/delete         — 删除条目
 *   POST /api/admin/media/clear                — 清空指定类型数据
 */
import type { Hono, Context } from 'hono';
import { MediaManage } from '../media/MediaManage';
import { UsersManage } from '../users/UsersManage';
import { successResp, errorResp } from '../types/HttpResponse';
import type { MediaType } from '../media/MediaObject';

// ────────────────────────────────────────────────────────────
// 工具函数
// ────────────────────────────────────────────────────────────

function requireAdmin(c: Context): boolean {
    const user = c.get('user');
    return user ? UsersManage.isAdmin(user) : false;
}

function intParam(val: string | null | undefined, def: number): number {
    const n = parseInt(val ?? '', 10);
    return isNaN(n) ? def : n;
}

// ────────────────────────────────────────────────────────────
// 路由注册
// ────────────────────────────────────────────────────────────

export function mediaApiRoutes(app: Hono<any>) {

    // ══════════════════════════════════════════════════════
    // 公开接口
    // ══════════════════════════════════════════════════════

    // GET /api/public/media/stats
    app.get('/api/public/media/stats', async (c: Context): Promise<any> => {
        const media = new MediaManage(c);
        const result = await media.stats();
        if (!result.flag) return errorResp(c, result.text, 500);
        return successResp(c, result.data);
    });

    // GET /api/public/media/scan_paths?media_type=video
    app.get('/api/public/media/scan_paths', async (c: Context): Promise<any> => {
        const mediaType = c.req.query('media_type') as MediaType | undefined;
        const media = new MediaManage(c);
        const result = await media.listScanPaths(mediaType);
        if (!result.flag) return errorResp(c, result.text, 500);
        return successResp(c, result.data);
    });

    // GET /api/public/media/list?media_type=video&page=1&page_size=48&keyword=&scan_path_id=
    app.get('/api/public/media/list', async (c: Context): Promise<any> => {
        const query = (key: string): string | undefined => c.req.query(key);
        const media = new MediaManage(c);
        const result = await media.listItems({
            media_type:   query('media_type') as MediaType | undefined,
            scan_path_id: intParam(query('scan_path_id'), 0) || undefined,
            keyword:      query('keyword') ?? '',
            page:         intParam(query('page'), 1),
            page_size:    Math.min(intParam(query('page_size'), 48), 200),
        });
        if (!result.flag) return errorResp(c, result.text, 500);
        return successResp(c, result.data);
    });

    // GET /api/public/media/item/:id
    app.get('/api/public/media/item/:id', async (c: Context): Promise<any> => {
        const id = intParam(c.req.param('id'), 0);
        if (!id) return errorResp(c, 'id 无效', 400);
        const media = new MediaManage(c);
        const result = await media.getItem(id);
        if (!result.flag) return errorResp(c, result.text, 404);
        return successResp(c, result.data);
    });

    // GET /api/public/media/albums?scan_path_id=
    app.get('/api/public/media/albums', async (c: Context): Promise<any> => {
        const pathId = intParam(c.req.query('scan_path_id'), 0) || undefined;
        const media = new MediaManage(c);
        const result = await media.listAlbums(pathId);
        if (!result.flag) return errorResp(c, result.text, 500);
        return successResp(c, result.data);
    });

    // ══════════════════════════════════════════════════════
    // 管理员接口
    // ══════════════════════════════════════════════════════

    // GET /api/admin/media/scan_paths
    app.get('/api/admin/media/scan_paths', async (c: Context): Promise<any> => {
        if (!requireAdmin(c)) return errorResp(c, '需要管理员权限', 403);
        const mediaType = c.req.query('media_type') as MediaType | undefined;
        const media = new MediaManage(c);
        const result = await media.listScanPaths(mediaType);
        if (!result.flag) return errorResp(c, result.text, 500);
        return successResp(c, result.data);
    });

    // POST /api/admin/media/scan_paths/add
    // Body: { media_type, scan_path, scan_depth? }
    app.post('/api/admin/media/scan_paths/add', async (c: Context): Promise<any> => {
        if (!requireAdmin(c)) return errorResp(c, '需要管理员权限', 403);
        let body: any = {};
        try { body = await c.req.json(); } catch { return errorResp(c, '请求体格式错误', 400); }
        if (!body.media_type || !body.scan_path) return errorResp(c, 'media_type 和 scan_path 不能为空', 400);
        const media = new MediaManage(c);
        const result = await media.addScanPath({
            media_type: body.media_type,
            scan_path:  body.scan_path,
            is_enabled: 1,
            scan_depth: body.scan_depth ?? 5,
        });
        if (!result.flag) return errorResp(c, result.text, 500);
        return successResp(c, result.data);
    });

    // POST /api/admin/media/scan_paths/remove
    // Body: { id }
    app.post('/api/admin/media/scan_paths/remove', async (c: Context): Promise<any> => {
        if (!requireAdmin(c)) return errorResp(c, '需要管理员权限', 403);
        let body: any = {};
        try { body = await c.req.json(); } catch { return errorResp(c, '请求体格式错误', 400); }
        if (!body.id) return errorResp(c, 'id 不能为空', 400);
        const media = new MediaManage(c);
        const result = await media.removeScanPath(Number(body.id));
        if (!result.flag) return errorResp(c, result.text, 500);
        return successResp(c);
    });

    // POST /api/admin/media/scan/start
    // Body: { scan_path_id }
    app.post('/api/admin/media/scan/start', async (c: Context): Promise<any> => {
        if (!requireAdmin(c)) return errorResp(c, '需要管理员权限', 403);
        let body: any = {};
        try { body = await c.req.json(); } catch { return errorResp(c, '请求体格式错误', 400); }
        if (!body.scan_path_id) return errorResp(c, 'scan_path_id 不能为空', 400);
        const media = new MediaManage(c);
        // 使用 ctx.waitUntil 在后台异步扫描（不阻塞响应）
        const execCtx = (c.executionCtx as any);
        const scanPromise = media.scanPath(Number(body.scan_path_id));
        if (execCtx?.waitUntil) {
            execCtx.waitUntil(scanPromise);
            return successResp(c, { message: '扫描已在后台启动，可通过 /scan/progress 查询进度' });
        } else {
            // 本地开发模式：同步执行
            const result = await scanPromise;
            if (!result.flag) return errorResp(c, result.text, 500);
            return successResp(c, result.data);
        }
    });

    // GET /api/admin/media/scan/progress
    app.get('/api/admin/media/scan/progress', async (c: Context): Promise<any> => {
        if (!requireAdmin(c)) return errorResp(c, '需要管理员权限', 403);
        const media = new MediaManage(c);
        const progress = await media.getScanProgress();
        return successResp(c, progress);
    });

    // POST /api/admin/media/scrape/start
    // Body: { scan_path_id?, batch_size? }
    app.post('/api/admin/media/scrape/start', async (c: Context): Promise<any> => {
        if (!requireAdmin(c)) return errorResp(c, '需要管理员权限', 403);
        let body: any = {};
        try { body = await c.req.json(); } catch { /* 允许空 body */ }
        const media = new MediaManage(c);
        const batchSize = Math.min(Number(body.batch_size ?? 10), 50);
        const result = await media.scrapeBatch(
            body.scan_path_id ? Number(body.scan_path_id) : undefined,
            batchSize,
        );
        if (!result.flag) return errorResp(c, result.text, 500);
        return successResp(c, result.data);
    });

    // GET /api/admin/media/items — 管理员视角（含未刮削条目）
    app.get('/api/admin/media/items', async (c: Context): Promise<any> => {
        if (!requireAdmin(c)) return errorResp(c, '需要管理员权限', 403);
        const query = (key: string): string | undefined => c.req.query(key);
        const media = new MediaManage(c);
        const result = await media.listItems({
            media_type:   query('media_type') as MediaType | undefined,
            scan_path_id: intParam(query('scan_path_id'), 0) || undefined,
            keyword:      query('keyword') ?? '',
            page:         intParam(query('page'), 1),
            page_size:    Math.min(intParam(query('page_size'), 50), 200),
        });
        if (!result.flag) return errorResp(c, result.text, 500);
        return successResp(c, result.data);
    });

    // POST /api/admin/media/items/update
    // Body: { id, scraped_name?, cover?, description?, rating?, genre?, ... }
    app.post('/api/admin/media/items/update', async (c: Context): Promise<any> => {
        if (!requireAdmin(c)) return errorResp(c, '需要管理员权限', 403);
        let body: any = {};
        try { body = await c.req.json(); } catch { return errorResp(c, '请求体格式错误', 400); }
        if (!body.id) return errorResp(c, 'id 不能为空', 400);

        // 仅允许更新元数据字段（不允许修改 file_path 等核心字段）
        const allowed = [
            'scraped_name', 'cover', 'description', 'release_date',
            'rating', 'genre', 'album_name', 'album_artist', 'track_number',
            'duration', 'lyrics', 'video_type', 'season', 'episode',
        ];
        const sets: string[] = [];
        const vals: any[] = [];
        for (const key of allowed) {
            if (body[key] !== undefined) {
                sets.push(`${key} = ?`);
                vals.push(body[key]);
            }
        }
        if (!sets.length) return errorResp(c, '没有可更新的字段', 400);
        sets.push(`is_scraped = 1, updated_at = ?`);
        vals.push(new Date().toISOString(), Number(body.id));

        try {
            const db = (c.env as any)?.D1_DATA;
            if (!db) return errorResp(c, 'D1 数据库未绑定', 500);
            await db.prepare(`UPDATE media_items SET ${sets.join(', ')} WHERE id = ?`)
                    .bind(...vals).run();
            return successResp(c);
        } catch (e: any) {
            return errorResp(c, e.message, 500);
        }
    });

    // POST /api/admin/media/items/delete
    // Body: { id } or { ids: number[] }
    app.post('/api/admin/media/items/delete', async (c: Context): Promise<any> => {
        if (!requireAdmin(c)) return errorResp(c, '需要管理员权限', 403);
        let body: any = {};
        try { body = await c.req.json(); } catch { return errorResp(c, '请求体格式错误', 400); }

        const ids: number[] = body.ids ? body.ids.map(Number) : (body.id ? [Number(body.id)] : []);
        if (!ids.length) return errorResp(c, 'id 不能为空', 400);

        try {
            const db = (c.env as any)?.D1_DATA;
            const placeholders = ids.map(() => '?').join(',');
            await db.prepare(`DELETE FROM media_items WHERE id IN (${placeholders})`).bind(...ids).run();
            return successResp(c);
        } catch (e: any) {
            return errorResp(c, e.message, 500);
        }
    });

    // POST /api/admin/media/clear
    // Body: { media_type?, scan_path_id? }
    app.post('/api/admin/media/clear', async (c: Context): Promise<any> => {
        if (!requireAdmin(c)) return errorResp(c, '需要管理员权限', 403);
        let body: any = {};
        try { body = await c.req.json(); } catch { /* 允许空 body */ }
        const media = new MediaManage(c);
        const result = await media.clearItems(
            body.media_type as MediaType | undefined,
            body.scan_path_id ? Number(body.scan_path_id) : undefined,
        );
        if (!result.flag) return errorResp(c, result.text, 500);
        return successResp(c);
    });
}
