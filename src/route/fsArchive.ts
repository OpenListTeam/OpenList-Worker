/**
 * 归档 API 路由 — /api/fs/archive/*
 * 与 GO 后端 server/handles/archive.go 对齐
 *
 * 端点：
 *   POST /api/fs/archive/meta       — 获取归档元信息
 *   POST /api/fs/archive/list       — 列出归档内条目
 *   POST /api/fs/archive/decompress  — 触发解压任务
 *
 * 下载端点：
 *   GET /ad/*path  — 归档文件直下载
 *   GET /ap/*path  — 归档文件代理下载
 *   GET /ae/*path  — 归档内部提取下载
 */
import type { Hono, Context } from 'hono';
import { successResp, errorResp, badRequest, notFound, notImplemented } from '../types/HttpResponse';
import { MountManage } from '../mount/MountManage';
import { ArchiveManager } from '../files/archive';
import { fetchUpstream } from '../utils/requestSecurity';

/** 获取文件的真实下载 URL（与 fsRead.ts 中 /api/fs/get 的获取逻辑一致） */
async function getDownloadUrl(c: Context, path: string): Promise<string> {
    const mountManage = new MountManage(c);
    const driveLoad = await mountManage.loader(path, false, false);
    if (!driveLoad || !driveLoad[0]) throw new Error('文件不存在');
    await driveLoad[0].loadSelf();
    const relativePath = path.replace(driveLoad[0].router, '') || '/';
    const links = await driveLoad[0].downFile({ path: relativePath });
    if (links && links.length > 0) {
        if (links[0].status === false) {
            throw new Error(links[0].result || '文件不存在');
        }
        return links[0].direct || links[0].url || '';
    }
    throw new Error('无法获取文件下载链接');
}

export function fsArchiveRoutes(app: Hono<any>) {

    // ------------------------------------------------------------------
    // POST /api/fs/archive/meta — 获取归档元信息
    // Body: { path: string, password?: string }
    // 响应: { code: 200, data: { total, encrypted, comment, encoding, entries: [...] } }
    // ------------------------------------------------------------------
    app.post('/api/fs/archive/meta', async (c: Context): Promise<any> => {
        let body: any = {};
        try { body = await c.req.json(); } catch { return badRequest(c, '请求体格式错误'); }

        const { path } = body;
        if (!path) return badRequest(c, 'path 参数不能为空');

        try {
            const fileName = path.split('/').pop() || 'unknown';

            // 从原始 URL 获取文件数据
            const rawUrl = await getDownloadUrl(c, path);
            const resp = await fetchUpstream(rawUrl);
            if (!resp.ok) {
                return errorResp(c, `获取归档文件失败: HTTP ${resp.status}`, 502);
            }

            const data = new Uint8Array(await resp.arrayBuffer());
            const meta = await ArchiveManager.getMeta(data, fileName);

            if (!meta.supported) {
                return notImplemented(c, `不支持的归档格式: ${meta.format}。Cloudflare Workers 环境仅支持 ZIP 格式。`);
            }

            return successResp(c, {
                ...meta.meta,
                entries: meta.entries,
            });
        } catch (e: any) {
            return errorResp(c, e?.message || '解析归档失败', 500);
        }
    });

    // ------------------------------------------------------------------
    // POST /api/fs/archive/list — 列出归档内条目
    // Body: { path: string, password?: string, inner_path?: string }
    // ------------------------------------------------------------------
    app.post('/api/fs/archive/list', async (c: Context): Promise<any> => {
        let body: any = {};
        try { body = await c.req.json(); } catch { return badRequest(c, '请求体格式错误'); }

        const { path, inner_path } = body;
        if (!path) return badRequest(c, 'path 参数不能为空');

        const user = c.get('user');

        try {
            const rawUrl = await getDownloadUrl(c, path);
            const resp = await fetchUpstream(rawUrl);
            if (!resp.ok) {
                return errorResp(c, `获取归档文件失败: HTTP ${resp.status}`, 502);
            }

            const data = new Uint8Array(await resp.arrayBuffer());
            const fileName = path.split('/').pop() || 'unknown';

            const result = await ArchiveManager.listEntries(data, fileName, inner_path);
            if (!result.supported) {
                return notImplemented(c, result.error || '不支持的归档格式');
            }

            return successResp(c, {
                content: result.entries || [],
                total: (result.entries || []).length,
            });
        } catch (e: any) {
            return errorResp(c, e?.message || '列出归档内容失败', 500);
        }
    });

    // ------------------------------------------------------------------
    // POST /api/fs/archive/decompress — 触发解压任务
    // Body: { src_dir: string, name: string, password?: string }
    // 响应: { code: 200, data: { task_id: string } }
    // ------------------------------------------------------------------
    app.post('/api/fs/archive/decompress', async (c: Context): Promise<any> => {
        let body: any = {};
        try { body = await c.req.json(); } catch { return badRequest(c, '请求体格式错误'); }

        const { src_dir, name, password } = body;
        if (!src_dir || !name) return badRequest(c, 'src_dir 和 name 参数不能为空');

        const user = c.get('user');
        if (!user) return errorResp(c, '未登录', 401);

        // 解压任务：创建 task payload，等待 TaskManager 执行
        // 当前版本暂不支持异步解压，返回提示
        return notImplemented(c, '异步解压功能将在任务系统（Task Manager）完成后启用');
    });

    // ------------------------------------------------------------------
    // GET /ae/*path — 归档内部文件提取下载
    // 签名由 /d/* 相同的签名逻辑校验
    // ------------------------------------------------------------------
    app.get('/ae/*', async (c: Context): Promise<any> => {
        const rawPath = c.req.path;
        // /ae/path/to/archive.zip?inner=inner/path.txt
        const fullPath = rawPath.replace(/^\/ae\//, '');
        const innerPath = c.req.query('inner') || '';

        if (!fullPath || !innerPath) {
            return badRequest(c, '缺少归档路径或内部文件路径');
        }

        const user = c.get('user');
        if (!user) return errorResp(c, 'common.unauthorized', 401);

        try {
            const rawUrl = await getDownloadUrl(c, `/${fullPath}`);
            const resp = await fetchUpstream(rawUrl);
            if (!resp.ok) {
                return errorResp(c, `获取归档文件失败: HTTP ${resp.status}`, 502);
            }

            const data = new Uint8Array(await resp.arrayBuffer());
            const fileName = fullPath.split('/').pop() || 'unknown';

            const extractResult = await ArchiveManager.extractFile(data, fileName, innerPath);
            if (!extractResult.supported) {
                return notImplemented(c, extractResult.error || '不支持的格式');
            }
            if (extractResult.error) {
                return errorResp(c, extractResult.error, 404);
            }

            const innerFileName = innerPath.split('/').pop() || 'extracted';
            return new Response(extractResult.data!.slice().buffer as ArrayBuffer, {
                headers: {
                    'Content-Type': 'application/octet-stream',
                    'Content-Disposition': `attachment; filename="${encodeURIComponent(innerFileName)}"`,
                    'Content-Length': String(extractResult.data!.length),
                },
            });
        } catch (e: any) {
            return errorResp(c, e?.message || '提取失败', 500);
        }
    });

    // ------------------------------------------------------------------
    // /ad/*path、/ap/*path 委托到 /d/*、/p/* 的现有处理器
    // 这些路由在 src/index.ts 中通过 authMiddleware 已加入公开列表
    // 实际下载由 fsUpload.ts 中的 /d/*、/p/* 处理
    // ------------------------------------------------------------------
}