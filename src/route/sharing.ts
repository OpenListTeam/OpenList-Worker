/**
 * 分享功能 API 路由 — /api/share/*、/sd/*
 * 与 GO 后端 server/handles/sharing.go 对齐
 *
 * 端点：
 *   GET  /api/share/list    — 分享列表
 *   GET  /api/share/get     — 获取分享详情
 *   POST /api/share/create  — 创建分享
 *   POST /api/share/update  — 更新分享
 *   POST /api/share/delete  — 删除分享
 *   POST /api/share/enable  — 启用分享
 *   POST /api/share/disable — 禁用分享
 *   GET  /sd/:sid           — 分享根目录下载
 *   GET  /sd/:sid/*path     — 分享文件下载
 *   HEAD /sd/:sid/*path     — 分享文件头信息
 */
import type { Hono, Context } from 'hono';
import { ShareManage } from '../share/ShareManage';
import { MountManage } from '../mount/MountManage';
import { UsersManage } from '../users/UsersManage';
import { successResp, errorResp } from '../types/HttpResponse';
import { joinPathWithinRoot } from '../utils/pathSecurity';
import { fetchUpstream } from '../utils/requestSecurity';

// ============================================================
// 工具函数
// ============================================================

function parseExpires(value: unknown): number | null {
    if (value === undefined || value === null || value === '') return 0;
    if (typeof value !== 'string') return null;
    const timestamp = Date.parse(value);
    return Number.isFinite(timestamp) ? timestamp : null;
}

async function parseBody(c: Context): Promise<Record<string, any>> {
    const ct = c.req.header('Content-Type') || '';
    try {
        if (ct.includes('application/json')) return await c.req.json();
        if (ct.includes('application/x-www-form-urlencoded') || ct.includes('multipart/form-data')) {
            const form = await c.req.formData();
            const obj: Record<string, any> = {};
            form.forEach((v, k) => { obj[k] = v; });
            return obj;
        }
        return await c.req.json();
    } catch {
        return {};
    }
}

/** 将 ShareConfig（TSWorker 格式）转换为 GO 后端 SharingResp 格式 */
function toSharingResp(share: any): any {
    return {
        id: share.share_uuid,
        files: Array.isArray(share.share_path) ? share.share_path : [share.share_path],
        expires: share.share_ends ? new Date(share.share_ends).toISOString() : null,
        has_password: Boolean(share.share_pass),
        accessed: share.accessed || 0,
        max_accessed: share.max_accessed || 0,
        disabled: share.is_enabled === 0,
        remark: share.remark || '',
        readme: share.readme || '',
        header: share.header || '',
        creator: share.share_user || '',
        creator_role: 0,
    };
}

// ============================================================
// 路由注册
// ============================================================
export function sharingRoutes(app: Hono<any>) {

    // ------------------------------------------------------------------
    // GET /api/share/list — 分享列表
    // Query: page?, per_page?
    // ------------------------------------------------------------------
    app.get('/api/share/list', async (c: Context): Promise<any> => {
        const user = c.get('user');
        if (!user) return errorResp(c, 'common.not_logged_in', 401);

        const page = parseInt(c.req.query('page') || '1');
        const perPage = parseInt(c.req.query('per_page') || '30');

        const shareManage = new ShareManage(c);
        let result;

        if (UsersManage.isAdmin(user)) {
            result = await shareManage.select();
        } else {
            result = await shareManage.getByUser(user.users_name);
        }

        if (!result.flag) return errorResp(c, result.text || 'common.query_failed', 500);

        const all = result.data || [];
        const total = all.length;
        const start = (page - 1) * perPage;
        const content = all.slice(start, start + perPage).map(toSharingResp);

        return successResp(c, { content, total });
    });

    // ------------------------------------------------------------------
    // GET /api/share/get — 获取分享详情
    // Query: id
    // ------------------------------------------------------------------
    app.get('/api/share/get', async (c: Context): Promise<any> => {
        const user = c.get('user');
        if (!user) return errorResp(c, 'common.not_logged_in', 401);

        const id = c.req.query('id');
        if (!id) return errorResp(c, 'common.id_required', 400);

        const shareManage = new ShareManage(c);
        const result = await shareManage.select(id);

        if (!result.flag || !result.data || result.data.length === 0) {
            return errorResp(c, 'common.share_not_found', 404);
        }

        const share = result.data[0];
        // 非管理员只能查看自己的分享
        if (!UsersManage.isAdmin(user) && share.share_user !== user.users_name) {
            return errorResp(c, 'common.share_not_found', 404);
        }

        return successResp(c, toSharingResp(share));
    });

    // ------------------------------------------------------------------
    // POST /api/share/create — 创建分享
    // Body: { files[], expires?, pwd?, max_accessed?, disabled?, remark?, readme?, header? }
    // ------------------------------------------------------------------
    app.post('/api/share/create', async (c: Context): Promise<any> => {
        const user = c.get('user');
        if (!user) return errorResp(c, 'common.not_logged_in', 401);

        const body = await parseBody(c);
        const files: string[] = body.files || [];
        if (!files.length || (files.length === 1 && files[0] === '')) {
            return errorResp(c, 'common.at_least_one_path', 400);
        }

        const expires = parseExpires(body.expires);
        if (expires === null) return errorResp(c, 'common.invalid_expiration', 400);

        const shareManage = new ShareManage(c);
        const result = await shareManage.create({
            share_uuid: body.id || '',
            share_path: files[0], // 主路径（兼容现有数据模型）
            share_pass: body.pwd || '',
            share_user: user.users_name,
            share_date: Date.now(),
            share_ends: expires,
            is_enabled: body.disabled ? 0 : 1,
            // 扩展字段
            ...(body.remark && { remark: body.remark }),
            ...(body.readme && { readme: body.readme }),
            ...(body.header && { header: body.header }),
            ...(body.max_accessed && { max_accessed: body.max_accessed }),
        } as any);

        if (!result.flag) return errorResp(c, result.text || 'common.create_failed', 500);

        // 查询刚创建的分享
        const created = await shareManage.select();
        const latest = created.data?.find((s: any) => s.share_user === user.users_name);
        return successResp(c, latest ? toSharingResp(latest) : {});
    });

    // ------------------------------------------------------------------
    // POST /api/share/update — 更新分享
    // Body: { id, files[]?, expires?, pwd?, max_accessed?, disabled?, remark?, readme?, header? }
    // ------------------------------------------------------------------
    app.post('/api/share/update', async (c: Context): Promise<any> => {
        const user = c.get('user');
        if (!user) return errorResp(c, 'common.not_logged_in', 401);

        const body = await parseBody(c);
        const id: string = body.id;
        if (!id) return errorResp(c, 'common.id_required', 400);

        const shareManage = new ShareManage(c);
        const existing = await shareManage.select(id);
        if (!existing.flag || !existing.data || existing.data.length === 0) {
            return errorResp(c, 'common.share_not_found', 404);
        }

        const share = existing.data[0];
        if (!UsersManage.isAdmin(user) && share.share_user !== user.users_name) {
            return errorResp(c, 'common.share_not_found', 404);
        }

        const files: string[] = body.files || [];
        const expires = parseExpires(body.expires);
        if (expires === null) return errorResp(c, 'common.invalid_expiration', 400);

        const updateData: any = {
            ...share,
            share_uuid: id,
            ...(files.length > 0 && { share_path: files[0] }),
            ...(body.pwd !== undefined && { share_pass: body.pwd }),
            ...(body.expires !== undefined && { share_ends: expires }),
            ...(body.disabled !== undefined && { is_enabled: body.disabled ? 0 : 1 }),
            ...(body.remark !== undefined && { remark: body.remark }),
            ...(body.readme !== undefined && { readme: body.readme }),
            ...(body.header !== undefined && { header: body.header }),
            ...(body.max_accessed !== undefined && { max_accessed: body.max_accessed }),
        };

        const result = await shareManage.config(updateData);
        if (!result.flag) return errorResp(c, result.text || 'common.update_failed', 500);

        const updated = await shareManage.select(id);
        return successResp(c, updated.data?.[0] ? toSharingResp(updated.data[0]) : {});
    });

    // ------------------------------------------------------------------
    // POST /api/share/delete — 删除分享
    // Query: id
    // ------------------------------------------------------------------
    app.post('/api/share/delete', async (c: Context): Promise<any> => {
        const user = c.get('user');
        if (!user) return errorResp(c, 'common.not_logged_in', 401);

        const body = await parseBody(c);
        const id: string = body.id || c.req.query('id') || '';
        if (!id) return errorResp(c, 'common.id_required', 400);

        const shareManage = new ShareManage(c);
        const existing = await shareManage.select(id);
        if (!existing.flag || !existing.data || existing.data.length === 0) {
            return errorResp(c, 'common.share_not_found', 404);
        }

        const share = existing.data[0];
        if (!UsersManage.isAdmin(user) && share.share_user !== user.users_name) {
            return errorResp(c, 'common.share_not_found', 404);
        }

        const result = await shareManage.remove(id);
        if (!result.flag) return errorResp(c, result.text || 'common.delete_failed', 500);
        return successResp(c);
    });

    // ------------------------------------------------------------------
    // POST /api/share/enable — 启用分享
    // Query: id
    // ------------------------------------------------------------------
    app.post('/api/share/enable', async (c: Context): Promise<any> => {
        const user = c.get('user');
        if (!user) return errorResp(c, 'common.not_logged_in', 401);

        const body = await parseBody(c);
        const id: string = body.id || c.req.query('id') || '';
        if (!id) return errorResp(c, 'common.id_required', 400);

        const shareManage = new ShareManage(c);
        const existing = await shareManage.select(id);
        if (!existing.flag || !existing.data || existing.data.length === 0) {
            return errorResp(c, 'common.share_not_found', 404);
        }

        const share = existing.data[0];
        if (!UsersManage.isAdmin(user) && share.share_user !== user.users_name) {
            return errorResp(c, 'common.share_not_found', 404);
        }

        const result = await shareManage.toggleStatus(id, 1);
        if (!result.flag) return errorResp(c, result.text || 'common.operation_failed', 500);
        return successResp(c);
    });

    // ------------------------------------------------------------------
    // POST /api/share/disable — 禁用分享
    // Query: id
    // ------------------------------------------------------------------
    app.post('/api/share/disable', async (c: Context): Promise<any> => {
        const user = c.get('user');
        if (!user) return errorResp(c, 'common.not_logged_in', 401);

        const body = await parseBody(c);
        const id: string = body.id || c.req.query('id') || '';
        if (!id) return errorResp(c, 'common.id_required', 400);

        const shareManage = new ShareManage(c);
        const existing = await shareManage.select(id);
        if (!existing.flag || !existing.data || existing.data.length === 0) {
            return errorResp(c, 'common.share_not_found', 404);
        }

        const share = existing.data[0];
        if (!UsersManage.isAdmin(user) && share.share_user !== user.users_name) {
            return errorResp(c, 'common.share_not_found', 404);
        }

        const result = await shareManage.toggleStatus(id, 0);
        if (!result.flag) return errorResp(c, result.text || 'common.operation_failed', 500);
        return successResp(c);
    });

    // ------------------------------------------------------------------
    // GET /sd/:sid — 分享根目录下载（无子路径）
    // GET /sd/:sid/*path — 分享文件下载
    // HEAD /sd/:sid/*path — 分享文件头信息
    // Query: pwd (分享密码)
    // ------------------------------------------------------------------
    async function handleSharingDown(c: Context, sid: string, subPath: string): Promise<any> {
        const pwd = c.req.query('pwd') || '';

        const shareManage = new ShareManage(c);
        const validateResult = await shareManage.validateAccess(sid, pwd);
        if (!validateResult.flag) {
            return c.text(validateResult.text || 'common.share_invalid', 500);
        }

        const shareData = validateResult.data![0];
        const sharePath = Array.isArray(shareData.share_path) ? shareData.share_path[0] : shareData.share_path;

        const fullPath = joinPathWithinRoot(sharePath, subPath);
        if (!fullPath) return c.text('common.invalid_path', 400);

        const mountManage = new MountManage(c);
        const driveLoad = await mountManage.loader(fullPath, false, false);
        if (!driveLoad || !driveLoad[0]) return c.text('fs.file_not_found', 404);

        await driveLoad[0].loadSelf();
        const relativePath = fullPath.replace(driveLoad[0].router, '') || '/';

        try {
            const links = await driveLoad[0].downFile({ path: relativePath });
            if (!links || links.length === 0) return c.text('common.cannot_get_link', 500);

            const link = links[0];

            // 流式下载
            if (link.stream) {
                const streamResult = await link.stream(c);
                if (streamResult instanceof ReadableStream) {
                    const fileName = fullPath.split('/').pop() || 'file';
                    return new Response(streamResult, {
                        status: 200,
                        headers: {
                            'Content-Type': 'application/octet-stream',
                            'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
                            ...(link.header || {}),
                        },
                    });
                }
            }

            if (link.direct || link.url) {
                const targetUrl = link.direct || link.url;
                const rangeHeader = c.req.header('Range');
                const fetchHeaders: Record<string, string> = { ...(link.header || {}) };
                if (rangeHeader) fetchHeaders['Range'] = rangeHeader;

                const upstream = await fetchUpstream(targetUrl, { headers: fetchHeaders });
                const fileName = fullPath.split('/').pop() || 'file';
                const responseHeaders: Record<string, string> = {
                    'Content-Type': upstream.headers.get('Content-Type') || 'application/octet-stream',
                    'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
                    'Accept-Ranges': 'bytes',
                };
                const cl = upstream.headers.get('Content-Length');
                if (cl) responseHeaders['Content-Length'] = cl;
                const cr = upstream.headers.get('Content-Range');
                if (cr) responseHeaders['Content-Range'] = cr;

                return new Response(upstream.body, { status: upstream.status, headers: responseHeaders });
            }

            return c.text('common.unsupported_download_method', 500);
        } catch (e) {
            return c.text('common.download_failed', 500);
        }
    }

    // 路由注册：单层路径和多层路径
    app.get('/sd/:sid', async (c: Context) => handleSharingDown(c, c.req.param('sid') ?? '', '/'));
    app.get('/sd/:sid/*', async (c: Context) => handleSharingDown(c, c.req.param('sid') ?? '', '/' + (c.req.param('*') ?? '')));
}
