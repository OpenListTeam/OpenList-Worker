/**
 * 文件系统 API 路由（写操作）— /api/fs/*
 * 与 GO 后端 server/handles/fsmanage.go 对齐
 *
 * 端点：
 *   POST /api/fs/mkdir                  — 创建目录
 *   POST /api/fs/rename                 — 重命名
 *   POST /api/fs/move                   — 批量移动
 *   POST /api/fs/copy                   — 批量复制
 *   POST /api/fs/remove                 — 批量删除
 *   POST /api/fs/remove_empty_directory — 递归删除空目录
 *   POST /api/fs/link                   — 获取真实下载链接（管理员）
 *   POST /api/fs/add_offline_download   — 添加离线下载任务
 *   POST /api/fs/batch_rename           — 批量重命名
 */
import type { Hono, Context } from 'hono';
import { MountManage } from '../mount/MountManage';
import { UsersManage } from '../users/UsersManage';
import { successResp, errorResp } from '../types/HttpResponse';

// ============================================================
// 工具函数
// ============================================================

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

function requireAuth(c: Context): any | null {
    return c.get('user') || null;
}

function requireAdmin(c: Context): boolean {
    const user = c.get('user');
    return user ? UsersManage.isAdmin(user) : false;
}

/**
 * SSRF 防护：检查 URL 是否指向内网/本地地址（RFC 1918 / RFC 3927 / loopback）
 * 安全修复 SEC-03: 防止离线下载、分享代理被用于攻击内网
 */
function isPrivateUrl(url: string): boolean {
    try {
        const parsed = new URL(url);
        const host = parsed.hostname;
        // 拒绝非 http/https 协议
        if (!['http:', 'https:'].includes(parsed.protocol)) return true;
        // 拒绝 localhost
        if (host === 'localhost' || host === '127.0.0.1' || host === '::1') return true;
        // 拒绝内网 IPv4（RFC 1918）
        const ipv4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
        if (ipv4) {
            const [, a, b] = ipv4.map(Number);
            if (a === 10) return true;                          // 10.0.0.0/8
            if (a === 172 && b >= 16 && b <= 31) return true;  // 172.16.0.0/12
            if (a === 192 && b === 168) return true;            // 192.168.0.0/16
            if (a === 169 && b === 254) return true;            // 169.254.0.0/16 (链路本地)
            if (a === 0) return true;                           // 0.0.0.0/8
            if (a === 127) return true;                         // 127.0.0.0/8 (loopback)
        }
        return false;
    } catch {
        return true; // 解析失败视为不安全
    }
}

// ============================================================
// 路由注册
// ============================================================
export function fsWriteRoutes(app: Hono<any>) {

    // ------------------------------------------------------------------
    // POST /api/fs/mkdir — 创建目录
    // Body: { path }
    // ------------------------------------------------------------------
    app.post('/api/fs/mkdir', async (c: Context): Promise<any> => {
        const user = requireAuth(c);
        if (!user) return errorResp(c, 'common.not_logged_in', 401);

        const body = await parseBody(c);
        const path: string = body.path;
        if (!path) return errorResp(c, 'common.path_required', 400);

        // 找到父目录的挂载点
        const parentPath = path.replace(/\/[^/]+\/?$/, '') || '/';
        const dirName = path.split('/').filter(Boolean).pop() || '';

        const mountManage = new MountManage(c);
        const driveLoad = await mountManage.loader(parentPath, false, false);
        if (!driveLoad || !driveLoad[0]) return errorResp(c, 'common.not_found_parent_dir', 404);

        await driveLoad[0].loadSelf();
        const relativeParent = parentPath.replace(driveLoad[0].router, '') || '/';

        try {
            const result = await driveLoad[0].makeFile(
                { path: relativeParent },
                dirName,
                0 // FileType.F_DIR
            );
            if (result && result.flag === false) return errorResp(c, result.text || 'fs.mkdir_failed', 500);
            return successResp(c);
        } catch (e: any) {
            return errorResp(c, e.message || 'fs.mkdir_failed', 500);
        }
    });

    // ------------------------------------------------------------------
    // POST /api/fs/rename — 重命名
    // Body: { path, name, overwrite? }
    // ------------------------------------------------------------------
    app.post('/api/fs/rename', async (c: Context): Promise<any> => {
        const user = requireAuth(c);
        if (!user) return errorResp(c, 'common.not_logged_in', 401);

        const body = await parseBody(c);
        const path: string = body.path;
        const name: string = body.name;
        if (!path || !name) return errorResp(c, 'common.path_name_required', 400);
        if (name.includes('/') || name.includes('\\') || name === '.' || name === '..') {
            return errorResp(c, 'fs.name_invalid', 400);
        }

        const mountManage = new MountManage(c);
        const driveLoad = await mountManage.loader(path, false, false);
        if (!driveLoad || !driveLoad[0]) return errorResp(c, 'fs.file_not_found', 404);

        await driveLoad[0].loadSelf();
        const relativePath = path.replace(driveLoad[0].router, '') || '/';
        const parentDir = relativePath.replace(/\/[^/]+$/, '') || '/';
        const destPath = parentDir === '/' ? `/${name}` : `${parentDir}/${name}`;

        try {
            await driveLoad[0].moveFile({ path: relativePath }, { path: destPath });
            return successResp(c);
        } catch (e: any) {
            return errorResp(c, e.message || 'fs.rename_failed', 500);
        }
    });

    // ------------------------------------------------------------------
    // POST /api/fs/move — 批量移动
    // Body: { src_dir, dst_dir, names[], overwrite?, skip_existing? }
    // ------------------------------------------------------------------
    app.post('/api/fs/move', async (c: Context): Promise<any> => {
        const user = requireAuth(c);
        if (!user) return errorResp(c, 'common.not_logged_in', 401);

        const body = await parseBody(c);
        const srcDir: string = body.src_dir;
        const dstDir: string = body.dst_dir;
        const names: string[] = body.names || [];
        if (!srcDir || !dstDir) return errorResp(c, 'fs.src_dst_required', 400);
        if (!names.length) return errorResp(c, 'common.names_required', 400);

        const mountManage = new MountManage(c);
        const tasks: any[] = [];

        for (const name of names) {
            const srcPath = `${srcDir}/${name}`.replace(/\/+/g, '/');
            const dstPath = `${dstDir}/${name}`.replace(/\/+/g, '/');

            const driveLoad = await mountManage.loader(srcPath, false, false);
            if (!driveLoad || !driveLoad[0]) continue;

            await driveLoad[0].loadSelf();
            const relSrc = srcPath.replace(driveLoad[0].router, '') || '/';
            const relDst = dstPath.replace(driveLoad[0].router, '') || '/';

            try {
                const result = await driveLoad[0].moveFile({ path: relSrc }, { path: relDst });
                tasks.push({ name, result });
            } catch (e: any) {
                return errorResp(c, `移动 ${name} 失败: ${e.message}`, 500);
            }
        }

        return successResp(c, { tasks });
    });

    // ------------------------------------------------------------------
    // POST /api/fs/copy — 批量复制
    // Body: { src_dir, dst_dir, names[], overwrite? }
    // ------------------------------------------------------------------
    app.post('/api/fs/copy', async (c: Context): Promise<any> => {
        const user = requireAuth(c);
        if (!user) return errorResp(c, 'common.not_logged_in', 401);

        const body = await parseBody(c);
        const srcDir: string = body.src_dir;
        const dstDir: string = body.dst_dir;
        const names: string[] = body.names || [];
        if (!srcDir || !dstDir) return errorResp(c, 'fs.src_dst_required', 400);
        if (!names.length) return errorResp(c, 'common.names_required', 400);

        const mountManage = new MountManage(c);
        const tasks: any[] = [];

        for (const name of names) {
            const srcPath = `${srcDir}/${name}`.replace(/\/+/g, '/');
            const dstPath = `${dstDir}/${name}`.replace(/\/+/g, '/');

            const driveLoad = await mountManage.loader(srcPath, false, false);
            if (!driveLoad || !driveLoad[0]) continue;

            await driveLoad[0].loadSelf();
            const relSrc = srcPath.replace(driveLoad[0].router, '') || '/';
            const relDst = dstPath.replace(driveLoad[0].router, '') || '/';

            try {
                const result = await driveLoad[0].copyFile({ path: relSrc }, { path: relDst });
                tasks.push({ name, result });
            } catch (e: any) {
                return errorResp(c, `复制 ${name} 失败: ${e.message}`, 500);
            }
        }

        return successResp(c, { tasks });
    });

    // ------------------------------------------------------------------
    // POST /api/fs/remove — 批量删除
    // Body: { dir, names[] }
    // ------------------------------------------------------------------
    app.post('/api/fs/remove', async (c: Context): Promise<any> => {
        const user = requireAuth(c);
        if (!user) return errorResp(c, 'common.not_logged_in', 401);

        const body = await parseBody(c);
        const dir: string = body.dir;
        const names: string[] = body.names || [];
        if (!dir) return errorResp(c, 'common.dir_required', 400);
        if (!names.length) return errorResp(c, 'common.names_required', 400);

        const mountManage = new MountManage(c);

        for (const name of names) {
            // 防止路径穿越
            if (name.includes('..') || name.startsWith('/')) {
                console.warn(`FsRemove: 跳过可疑路径: ${name}`);
                continue;
            }
            const fullPath = `${dir}/${name}`.replace(/\/+/g, '/');

            const driveLoad = await mountManage.loader(fullPath, false, false);
            if (!driveLoad || !driveLoad[0]) continue;

            await driveLoad[0].loadSelf();
            const relativePath = fullPath.replace(driveLoad[0].router, '') || '/';

            try {
                await driveLoad[0].killFile({ path: relativePath });
            } catch (e: any) {
                return errorResp(c, 'fs.move_failed', 500, { name, error: e.message });
            }
        }

        return successResp(c);
    });

    // ------------------------------------------------------------------
    // POST /api/fs/remove_empty_directory — 递归删除空目录
    // Body: { src_dir }
    // ------------------------------------------------------------------
    app.post('/api/fs/remove_empty_directory', async (c: Context): Promise<any> => {
        const user = requireAuth(c);
        if (!user) return errorResp(c, 'common.not_logged_in', 401);

        const body = await parseBody(c);
        const srcDir: string = body.src_dir;
        if (!srcDir) return errorResp(c, 'common.src_dir_required', 400);

        const mountManage = new MountManage(c);

        async function removeEmptyDirs(path: string): Promise<void> {
            const driveLoad = await mountManage.loader(path, true, true);
            if (!driveLoad || !driveLoad[0]) return;

            await driveLoad[0].loadSelf();
            const relativePath = path.replace(driveLoad[0].router, '') || '/';
            const pathInfo = await driveLoad[0].listFile({ path: relativePath });
            const fileList = pathInfo?.fileList || [];

            // 递归处理子目录
            for (const file of fileList) {
                if (file.fileType === 0 || file.is_dir) {
                    const subPath = `${path}/${file.fileName || file.name}`.replace(/\/+/g, '/');
                    await removeEmptyDirs(subPath);
                }
            }

            // 重新检查当前目录是否为空
            const refreshInfo = await driveLoad[0].listFile({ path: relativePath });
            const refreshList = refreshInfo?.fileList || [];
            if (refreshList.length === 0) {
                await driveLoad[0].killFile({ path: relativePath });
            }
        }

        try {
            await removeEmptyDirs(srcDir);
            return successResp(c);
        } catch (e: any) {
            return errorResp(c, e.message || 'common.remove_empty_dir_failed', 500);
        }
    });

    // ------------------------------------------------------------------
    // POST /api/fs/link — 获取真实下载链接（仅管理员）
    // Body: { path }
    // ------------------------------------------------------------------
    app.post('/api/fs/link', async (c: Context): Promise<any> => {
        if (!requireAdmin(c)) return errorResp(c, 'common.admin_required', 403);

        const body = await parseBody(c);
        const path: string = body.path;
        if (!path) return errorResp(c, 'common.path_required', 400);

        const mountManage = new MountManage(c);
        const driveLoad = await mountManage.loader(path, false, false);
        if (!driveLoad || !driveLoad[0]) return errorResp(c, 'fs.file_not_found', 404);

        await driveLoad[0].loadSelf();
        const relativePath = path.replace(driveLoad[0].router, '') || '/';

        try {
            const links = await driveLoad[0].downFile({ path: relativePath });
            if (!links || links.length === 0) return errorResp(c, 'common.cannot_get_link', 500);
            return successResp(c, { url: links[0].direct || links[0].url || '', header: links[0].header || {} });
        } catch (e: any) {
            return errorResp(c, e.message || 'common.get_link_failed', 500);
        }
    });

    // ------------------------------------------------------------------
    // POST /api/fs/add_offline_download — 添加离线下载任务
    // Body: { path, urls[], tool? }
    // ------------------------------------------------------------------
    app.post('/api/fs/add_offline_download', async (c: Context): Promise<any> => {
        const user = requireAuth(c);
        if (!user) return errorResp(c, 'common.not_logged_in', 401);

        const body = await parseBody(c);
        const path: string = body.path;
        const urls: string[] = body.urls || (body.url ? [body.url] : []);
        if (!path) return errorResp(c, 'common.path_required', 400);
        if (!urls.length) return errorResp(c, 'common.urls_required', 400);

        // SSRF 防护 SEC-03: 拒绝内网/本地地址
        for (const url of urls) {
            if (isPrivateUrl(url)) {
                return errorResp(c, 'common.private_url_forbidden', 400);
            }
        }

        const tasks = urls.map((url, i) => ({
            id: `offline_${Date.now()}_${i}`,
            url,
            path,
            status: 'pending',
        }));

        return successResp(c, { tasks });
    });

    // ------------------------------------------------------------------
    // POST /api/fs/batch_rename — 批量重命名
    // Body: { src_dir, rename_pairs: [{src_name, dst_name}] }
    //       或 { src_dir, rename_objects: [{src_name, new_name}] }（前端兼容）
    app.post('/api/fs/batch_rename', async (c: Context): Promise<any> => {
        const body = await parseBody(c);
        const srcDir: string = body.src_dir;
        // 兼容两种字段命名：后端 rename_pairs(dst_name) / 前端 rename_objects(new_name)
        const pairs: Array<{ src_name: string; dst_name: string }> =
            Array.isArray(body.rename_pairs)
                ? body.rename_pairs
                : (Array.isArray(body.rename_objects)
                    ? body.rename_objects.map((o: any) => ({
                        src_name: o.src_name,
                        dst_name: o.new_name ?? o.dst_name ?? o.src_name,
                    }))
                    : []);
        if (!srcDir) return errorResp(c, 'common.src_dir_required', 400);
        if (!pairs.length) return errorResp(c, 'common.rename_pairs_required', 400);

        const results: any[] = [];
        for (const pair of pairs) {
            const srcPath = srcDir.replace(/\/$/, '') + '/' + pair.src_name;
            try {
                const mountManage = new MountManage(c);
                const driveLoad = await mountManage.loader(srcPath, false, false);
                if (!driveLoad || !driveLoad[0]) {
                    results.push({ src: pair.src_name, dst: pair.dst_name, success: false, msg: 'common.not_found_file' });
                    continue;
                }
                await driveLoad[0].loadSelf();
                const relativePath = srcPath.replace(driveLoad[0].router, '') || '/';
                const parentDir = relativePath.replace(/\/[^\/]+$/, '') || '/';
                const destPath = parentDir === '/' ? `/${pair.dst_name}` : `${parentDir}/${pair.dst_name}`;
                await driveLoad[0].moveFile({ path: relativePath }, { path: destPath });
                results.push({ src: pair.src_name, dst: pair.dst_name, success: true, msg: '' });
            } catch (e: any) {
                results.push({ src: pair.src_name, dst: pair.dst_name, success: false, msg: e.message });
            }
        }
        return successResp(c, { results });
    });
}
