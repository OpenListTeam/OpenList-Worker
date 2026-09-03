/**
 * 文件上传与直接下载路由
 * 与 GO 后端 server/handles/fsup.go、server/handles/down.go 对齐
 *
 * 端点：
 *   PUT  /api/fs/put   — 流式上传（请求头携带文件路径）
 *   PUT  /api/fs/form  — 表单上传（multipart/form-data）
 *   GET  /d/*path      — 直接下载（签名验证）
 *   HEAD /d/*path      — 文件头信息
 *   GET  /p/*path      — 代理下载
 *   HEAD /p/*path      — 代理文件头信息
 */
import type { Hono, Context } from 'hono';
import { MountManage } from '../mount/MountManage';
import { UsersManage } from '../users/UsersManage';
import { successResp, errorResp } from '../types/HttpResponse';
import { fetchUpstream } from '../utils/requestSecurity';

// ============================================================
// 工具函数
// ============================================================

/** 从请求头或 query 获取文件路径 */
function getFilePath(c: Context): string {
    return decodeURIComponent(
        c.req.header('File-Path') ||
        c.req.header('file-path') ||
        c.req.query('path') ||
        ''
    );
}

/** 校验下载签名：base64url(sha256(path + ":" + secret + ":" + expiry)) + ":" + expiry */
async function verifySign(path: string, sign: string, secret: string): Promise<boolean> {
    if (!sign || !secret) return false;
    try {
        const separator = sign.lastIndexOf(':');
        if (separator <= 0) return false;
        const encoded = sign.slice(0, separator);
        const expiryText = sign.slice(separator + 1);
        const expiry = Number(expiryText);
        const now = Math.floor(Date.now() / 1000);
        if (!Number.isSafeInteger(expiry) || expiry <= now || expiry - now > 7 * 24 * 60 * 60) return false;
        const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
        const digest = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${path}:${secret}:${expiry}`)));
        const expected = btoa(String.fromCharCode(...digest)).replace(/=+$/g, '').replace(/\+/g, '-').replace(/\//g, '_');
        return expected === encoded;
    } catch {
        return false;
    }
}

// ============================================================
// 路由注册
// ============================================================
export function fsUploadDownloadRoutes(app: Hono<any>) {

    // ------------------------------------------------------------------
    // PUT /api/fs/put — 流式上传
    // Headers: File-Path (必须), Password?, As-Task?
    // Body: 文件二进制流
    // ------------------------------------------------------------------
    app.put('/api/fs/put', async (c: Context): Promise<any> => {
        const user = c.get('user');
        if (!user) return errorResp(c, 'common.not_logged_in', 401);

        const filePath = getFilePath(c);
        if (!filePath) return errorResp(c, 'fs.file_path_required', 400);

        const asTask = c.req.header('As-Task') === 'true';
        const overwrite = c.req.header('Overwrite') !== 'false';

        // 找到目标目录的挂载点
        const dirPath = filePath.replace(/\/[^/]+$/, '') || '/';
        const fileName = filePath.split('/').pop() || '';

        const mountManage = new MountManage(c);
        const driveLoad = await mountManage.loader(dirPath, false, false);
        if (!driveLoad || !driveLoad[0]) return errorResp(c, 'fs.target_dir_not_found', 404);

        await driveLoad[0].loadSelf();
        const relativeDirPath = dirPath.replace(driveLoad[0].router, '') || '/';

        try {
            // 获取请求体作为文件数据
            const body = c.req.raw.body;
            if (!body) return errorResp(c, 'fs.body_empty', 400);

            const contentLength = parseInt(c.req.header('Content-Length') || '0');
            const contentType = c.req.header('Content-Type') || 'application/octet-stream';

            // 构造文件对象传给驱动
            const fileObj = {
                name: fileName,
                size: contentLength,
                type: contentType,
                stream: () => body,
                arrayBuffer: async () => {
                    const reader = body.getReader();
                    const chunks: Uint8Array[] = [];
                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) break;
                        if (value) chunks.push(value);
                    }
                    const total = chunks.reduce((s, c) => s + c.length, 0);
                    const merged = new Uint8Array(total);
                    let offset = 0;
                    for (const chunk of chunks) { merged.set(chunk, offset); offset += chunk.length; }
                    return merged.buffer;
                },
            };

            const result = await driveLoad[0].pushFile(
                { path: relativeDirPath },
                fileName,
                1, // FileType.F_ALL
                fileObj
            );

            if (asTask) {
                return successResp(c, { task: { id: `upload_${Date.now()}`, name: `上传 ${fileName}`, status: 'running' } });
            }
            return successResp(c);
        } catch (e: any) {
            return errorResp(c, e.message || 'fs.upload_failed', 500);
        }
    });

    // ------------------------------------------------------------------
    // PUT /api/fs/form — 表单上传
    // Body: multipart/form-data，字段名 "file"
    // Query: path (目标路径)
    // ------------------------------------------------------------------
    app.put('/api/fs/form', async (c: Context): Promise<any> => {
        const user = c.get('user');
        if (!user) return errorResp(c, 'common.not_logged_in', 401);

        const targetPath = c.req.query('path') || c.req.header('File-Path') || '';
        if (!targetPath) return errorResp(c, 'fs.target_path_required', 400);

        let formData: FormData;
        try {
            formData = await c.req.formData();
        } catch {
            return errorResp(c, 'fs.form_parse_failed', 400);
        }

        const file = formData.get('file') as File | null;
        if (!file) return errorResp(c, 'common.file_field_required', 400);

        const dirPath = targetPath.replace(/\/[^/]+$/, '') || '/';
        const fileName = file.name || targetPath.split('/').pop() || 'upload';

        const mountManage = new MountManage(c);
        const driveLoad = await mountManage.loader(dirPath, false, false);
        if (!driveLoad || !driveLoad[0]) return errorResp(c, 'fs.target_dir_not_found', 404);

        await driveLoad[0].loadSelf();
        const relativeDirPath = dirPath.replace(driveLoad[0].router, '') || '/';

        try {
            await driveLoad[0].pushFile(
                { path: relativeDirPath },
                fileName,
                1,
                file
            );
            return successResp(c);
        } catch (e: any) {
            return errorResp(c, e.message || 'fs.upload_failed', 500);
        }
    });

    // ------------------------------------------------------------------
    // GET /d/*path — 直接下载（重定向到真实 URL）
    // Query: sign (签名), type?
    // ------------------------------------------------------------------
    app.get('/d/*', async (c: Context): Promise<any> => {
        const rawPath = '/' + c.req.param('*');
        const path = decodeURIComponent(rawPath);
        const sign = c.req.query('sign') || '';
        const signSecret = String(c.env.SIGN_SECRET || c.env.JWT_SECRET || '');
        if (!await verifySign(path, sign, signSecret)) {
            return c.text('common.unauthorized', 401);
        }

        // 获取挂载点
        const mountManage = new MountManage(c);
        const driveLoad = await mountManage.loader(path, false, false);
        if (!driveLoad || !driveLoad[0]) {
            return c.text('fs.file_not_found', 404);
        }

        await driveLoad[0].loadSelf();
        const relativePath = path.replace(driveLoad[0].router, '') || '/';

        try {
            const links = await driveLoad[0].downFile({ path: relativePath });
            if (!links || links.length === 0) return c.text('common.cannot_get_link', 500);

            const link = links[0];

            // 如果有流式下载
            if (link.stream) {
                const streamResult = await link.stream(c);
                if (streamResult instanceof ReadableStream) {
                    const headers: Record<string, string> = {
                        'Content-Type': 'application/octet-stream',
                        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(path.split('/').pop() || 'file')}`,
                    };
                    if (link.header) {
                        Object.entries(link.header).forEach(([k, v]) => { headers[k] = v as string; });
                    }
                    return new Response(streamResult, { status: 200, headers });
                }
            }

            // 直接重定向到真实 URL
            if (link.direct || link.url) {
                return c.redirect(link.direct || link.url, 302);
            }

            return c.text('common.cannot_get_link', 500);
        } catch (e: any) {
            return c.text(e.message || 'common.download_failed', 500);
        }
    });

    // HEAD /d/*path
    app.on('HEAD', '/d/*', async (c: Context): Promise<any> => {
        const rawPath = '/' + c.req.param('*');
        const path = decodeURIComponent(rawPath);
        const sign = c.req.query('sign') || '';
        const signSecret = String(c.env.SIGN_SECRET || c.env.JWT_SECRET || '');
        if (!await verifySign(path, sign, signSecret)) return c.text('', 401);

        const mountManage = new MountManage(c);
        const driveLoad = await mountManage.loader(path, false, false);
        if (!driveLoad || !driveLoad[0]) return c.text('', 404);

        await driveLoad[0].loadSelf();
        const relativePath = path.replace(driveLoad[0].router, '') || '/';

        try {
            const links = await driveLoad[0].downFile({ path: relativePath });
            if (!links || links.length === 0) return c.text('', 404);
            return new Response(null, {
                status: 200,
                headers: {
                    'Content-Type': 'application/octet-stream',
                    'Accept-Ranges': 'bytes',
                },
            });
        } catch {
            return c.text('', 500);
        }
    });

    // ------------------------------------------------------------------
    // GET /p/*path — 代理下载（通过 Worker 转发）
    // ------------------------------------------------------------------
    app.get('/p/*', async (c: Context): Promise<any> => {
        const rawPath = '/' + c.req.param('*');
        const path = decodeURIComponent(rawPath);
        const user = c.get('user');
        if (!user) return c.text('common.unauthorized', 401);

        const mountManage = new MountManage(c);
        const driveLoad = await mountManage.loader(path, false, false);
        if (!driveLoad || !driveLoad[0]) return c.text('fs.file_not_found', 404);

        await driveLoad[0].loadSelf();
        const relativePath = path.replace(driveLoad[0].router, '') || '/';

        try {
            const links = await driveLoad[0].downFile({ path: relativePath });
            if (!links || links.length === 0) return c.text('common.cannot_get_link', 500);

            const link = links[0];

            // 流式代理
            if (link.stream) {
                const streamResult = await link.stream(c);
                if (streamResult instanceof ReadableStream) {
                    const headers: Record<string, string> = {
                        'Content-Type': 'application/octet-stream',
                        'Content-Disposition': `inline; filename*=UTF-8''${encodeURIComponent(path.split('/').pop() || 'file')}`,
                    };
                    if (link.header) {
                        Object.entries(link.header).forEach(([k, v]) => { headers[k] = v as string; });
                    }
                    return new Response(streamResult, { status: 200, headers });
                }
            }

            // 通过 fetch 代理
            if (link.direct || link.url) {
                const rangeHeader = c.req.header('Range');
                const fetchHeaders: Record<string, string> = { ...(link.header || {}) };
                if (rangeHeader) fetchHeaders['Range'] = rangeHeader;

                const upstream = await fetchUpstream(link.direct || link.url, { headers: fetchHeaders });
                const responseHeaders: Record<string, string> = {
                    'Content-Type': upstream.headers.get('Content-Type') || 'application/octet-stream',
                    'Content-Disposition': `inline; filename*=UTF-8''${encodeURIComponent(path.split('/').pop() || 'file')}`,
                };
                const contentLength = upstream.headers.get('Content-Length');
                if (contentLength) responseHeaders['Content-Length'] = contentLength;
                const contentRange = upstream.headers.get('Content-Range');
                if (contentRange) responseHeaders['Content-Range'] = contentRange;
                responseHeaders['Accept-Ranges'] = 'bytes';

                return new Response(upstream.body, {
                    status: upstream.status,
                    headers: responseHeaders,
                });
            }

            return c.text('common.cannot_proxy', 500);
        } catch (e: any) {
            return c.text(e.message || 'common.proxy_download_failed', 500);
        }
    });

    // HEAD /p/*path
    app.on('HEAD', '/p/*', async (c: Context): Promise<any> => {
        const rawPath = '/' + c.req.param('*');
        const path = decodeURIComponent(rawPath);
        const user = c.get('user');
        if (!user) return c.text('', 401);

        const mountManage = new MountManage(c);
        const driveLoad = await mountManage.loader(path, false, false);
        if (!driveLoad || !driveLoad[0]) return c.text('', 404);

        await driveLoad[0].loadSelf();
        const relativePath = path.replace(driveLoad[0].router, '') || '/';

        try {
            const links = await driveLoad[0].downFile({ path: relativePath });
            if (!links || links.length === 0) return c.text('', 404);
            return new Response(null, {
                status: 200,
                headers: { 'Content-Type': 'application/octet-stream', 'Accept-Ranges': 'bytes' },
            });
        } catch {
            return c.text('', 500);
        }
    });
}
