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
        if (!user) return errorResp(c, '未登录', 401);

        const body = await parseBody(c);
        const path: string = body.path;
        if (!path) return errorResp(c, 'path 不能为空', 400);

        // 找到父目录的挂载点
        const parentPath = path.replace(/\/[^/]+\/?$/, '') || '/';
        const dirName = path.split('/').filter(Boolean).pop() || '';

        const mountManage = new MountManage(c);
        const driveLoad = await mountManage.loader(parentPath, false, false);
        if (!driveLoad || !driveLoad[0]) return errorResp(c, '父目录不存在', 404);

        await driveLoad[0].loadSelf();
        const relativeParent = parentPath.replace(driveLoad[0].router, '') || '/';

        try {
            const result = await driveLoad[0].makeFile(
                { path: relativeParent },
                dirName,
                0 // FileType.F_DIR
            );
            if (result && result.flag === false) return errorResp(c, result.text || '创建目录失败', 500);
            return successResp(c);
        } catch (e: any) {
            return errorResp(c, e.message || '创建目录失败', 500);
        }
    });

    // ------------------------------------------------------------------
    // POST /api/fs/rename — 重命名
    // Body: { path, name, overwrite? }
    // ------------------------------------------------------------------
    app.post('/api/fs/rename', async (c: Context): Promise<any> => {
        const user = requireAuth(c);
        if (!user) return errorResp(c, '未登录', 401);

        const body = await parseBody(c);
        const path: string = body.path;
        const name: string = body.name;
        if (!path || !name) return errorResp(c, 'path 和 name 不能为空', 400);
        if (name.includes('/') || name.includes('\\') || name === '.' || name === '..') {
            return errorResp(c, '文件名不能包含路径分隔符', 400);
        }

        const mountManage = new MountManage(c);
        const driveLoad = await mountManage.loader(path, false, false);
        if (!driveLoad || !driveLoad[0]) return errorResp(c, '文件不存在', 404);

        await driveLoad[0].loadSelf();
        const relativePath = path.replace(driveLoad[0].router, '') || '/';
        const parentDir = relativePath.replace(/\/[^/]+$/, '') || '/';
        const destPath = parentDir === '/' ? `/${name}` : `${parentDir}/${name}`;

        try {
            await driveLoad[0].moveFile({ path: relativePath }, { path: destPath });
            return successResp(c);
        } catch (e: any) {
            return errorResp(c, e.message || '重命名失败', 500);
        }
    });

    // ------------------------------------------------------------------
    // POST /api/fs/move — 批量移动
    // Body: { src_dir, dst_dir, names[], overwrite?, skip_existing? }
    // ------------------------------------------------------------------
    app.post('/api/fs/move', async (c: Context): Promise<any> => {
        const user = requireAuth(c);
        if (!user) return errorResp(c, '未登录', 401);

        const body = await parseBody(c);
        const srcDir: string = body.src_dir;
        const dstDir: string = body.dst_dir;
        const names: string[] = body.names || [];
        if (!srcDir || !dstDir) return errorResp(c, 'src_dir 和 dst_dir 不能为空', 400);
        if (!names.length) return errorResp(c, 'names 不能为空', 400);

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
        if (!user) return errorResp(c, '未登录', 401);

        const body = await parseBody(c);
        const srcDir: string = body.src_dir;
        const dstDir: string = body.dst_dir;
        const names: string[] = body.names || [];
        if (!srcDir || !dstDir) return errorResp(c, 'src_dir 和 dst_dir 不能为空', 400);
        if (!names.length) return errorResp(c, 'names 不能为空', 400);

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
        if (!user) return errorResp(c, '未登录', 401);

        const body = await parseBody(c);
        const dir: string = body.dir;
        const names: string[] = body.names || [];
        if (!dir) return errorResp(c, 'dir 不能为空', 400);
        if (!names.length) return errorResp(c, 'names 不能为空', 400);

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
                return errorResp(c, `删除 ${name} 失败: ${e.message}`, 500);
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
        if (!user) return errorResp(c, '未登录', 401);

        const body = await parseBody(c);
        const srcDir: string = body.src_dir;
        if (!srcDir) return errorResp(c, 'src_dir 不能为空', 400);

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
            return errorResp(c, e.message || '删除空目录失败', 500);
        }
    });

    // ------------------------------------------------------------------
    // POST /api/fs/link — 获取真实下载链接（仅管理员）
    // Body: { path }
    // ------------------------------------------------------------------
    app.post('/api/fs/link', async (c: Context): Promise<any> => {
        if (!requireAdmin(c)) return errorResp(c, '需要管理员权限', 403);

        const body = await parseBody(c);
        const path: string = body.path;
        if (!path) return errorResp(c, 'path 不能为空', 400);

        const mountManage = new MountManage(c);
        const driveLoad = await mountManage.loader(path, false, false);
        if (!driveLoad || !driveLoad[0]) return errorResp(c, '文件不存在', 404);

        await driveLoad[0].loadSelf();
        const relativePath = path.replace(driveLoad[0].router, '') || '/';

        try {
            const links = await driveLoad[0].downFile({ path: relativePath });
            if (!links || links.length === 0) return errorResp(c, '无法获取下载链接', 500);
            return successResp(c, { url: links[0].direct || links[0].url || '', header: links[0].header || {} });
        } catch (e: any) {
            return errorResp(c, e.message || '获取链接失败', 500);
        }
    });

    // ------------------------------------------------------------------
    // POST /api/fs/add_offline_download — 添加离线下载任务
    // Body: { path, urls[], tool? }
    // ------------------------------------------------------------------
    app.post('/api/fs/add_offline_download', async (c: Context): Promise<any> => {
        const user = requireAuth(c);
        if (!user) return errorResp(c, '未登录', 401);

        const body = await parseBody(c);
        const path: string = body.path;
        const urls: string[] = body.urls || (body.url ? [body.url] : []);
        if (!path) return errorResp(c, 'path 不能为空', 400);
        if (!urls.length) return errorResp(c, 'urls 不能为空', 400);

        // 简单实现：记录离线下载任务（实际需要后台任务队列）
        // 此处返回任务 ID 列表
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
    // ------------------------------------------------------------------
    app.post('/api/fs/batch_rename', async (c: Context): Promise<any> => {
        const user = requireAuth(c);
        if (!user) return errorResp(c, '未登录', 401);

        const body = await parseBody(c);
        const srcDir: string = body.src_dir;
        const renamePairs: Array<{ src_name: string; dst_name: string }> = body.rename_pairs || [];
        if (!srcDir) return errorResp(c, 'src_dir 不能为空', 400);
        if (!renamePairs.length) return errorResp(c, 'rename_pairs 不能为空', 400);

        const mountManage = new MountManage(c);

        for (const pair of renamePairs) {
            const srcPath = `${srcDir}/${pair.src_name}`.replace(/\/+/g, '/');
            const dstPath = `${srcDir}/${pair.dst_name}`.replace(/\/+/g, '/');

            const driveLoad = await mountManage.loader(srcPath, false, false);
            if (!driveLoad || !driveLoad[0]) continue;

            await driveLoad[0].loadSelf();
            const relSrc = srcPath.replace(driveLoad[0].router, '') || '/';
            const relDst = dstPath.replace(driveLoad[0].router, '') || '/';

            try {
                await driveLoad[0].moveFile({ path: relSrc }, { path: relDst });
            } catch (e: any) {
                return errorResp(c, `重命名 ${pair.src_name} 失败: ${e.message}`, 500);
            }
        }

        return successResp(c);
    });
}
