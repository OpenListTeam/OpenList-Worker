/**
 * 文件系统 API 路由（读操作）— /api/fs/*
 * 与 GO 后端 server/handles/fsread.go 对齐
 *
 * 端点：
 *   POST /api/fs/list   — 列出目录文件
 *   POST /api/fs/get    — 获取文件详情
 *   GET  /api/fs/dirs   — 获取目录列表
 *   POST /api/fs/other  — 其他文件操作
 *   POST /api/fs/search — 搜索文件
 */
import type { Hono, Context } from 'hono';
import { MountManage } from '../mount/MountManage';
import { ShareManage } from '../share/ShareManage';
import { successResp, errorResp, pageResp } from '../types/HttpResponse';
import { UsersManage } from '../users/UsersManage';

// ============================================================
// 工具函数
// ============================================================

/** 解析请求体（支持 JSON 和 form） */
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
        // 尝试 JSON
        return await c.req.json();
    } catch {
        return {};
    }
}

/** 将驱动文件对象转换为 GO 后端格式的 ObjResp */
function toObjResp(file: any, parentPath: string): any {
    const name = file.fileName || file.name || '';
    const isDir = file.fileType === 0 || file.is_dir === true || name.endsWith('/');
    const size = file.fileSize ?? file.size ?? 0;
    const modified = file.timeModify || file.modified || new Date().toISOString();
    const created = file.timeCreate || file.created || modified;

    return {
        name,
        size,
        is_dir: isDir,
        modified,
        created,
        sign: '',
        thumb: file.thumb || '',
        type: isDir ? 1 : getFileType(name),
        hashinfo: file.fileHash ? JSON.stringify(file.fileHash) : 'null',
        hash_info: file.fileHash || null,
    };
}

/** 根据文件名推断文件类型（与 GO 后端 utils.GetObjType 对齐） */
function getFileType(name: string): number {
    const ext = name.split('.').pop()?.toLowerCase() || '';
    const videoExts = ['mp4', 'mkv', 'avi', 'mov', 'wmv', 'flv', 'webm', 'm4v', 'ts', 'rmvb'];
    const audioExts = ['mp3', 'flac', 'wav', 'aac', 'ogg', 'm4a', 'wma', 'ape'];
    const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg', 'ico', 'tiff', 'heic'];
    const textExts = ['txt', 'md', 'log', 'csv', 'json', 'xml', 'yaml', 'yml', 'toml', 'ini', 'conf'];
    const archiveExts = ['zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'xz', 'zst'];
    const docExts = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'odt', 'ods', 'odp'];
    const codeExts = ['js', 'ts', 'py', 'go', 'java', 'c', 'cpp', 'h', 'rs', 'php', 'rb', 'sh', 'bat', 'ps1', 'html', 'css'];

    if (videoExts.includes(ext)) return 2;
    if (audioExts.includes(ext)) return 3;
    if (imageExts.includes(ext)) return 5;
    if (textExts.includes(ext)) return 4;
    if (archiveExts.includes(ext)) return 6;
    if (docExts.includes(ext)) return 7;
    if (codeExts.includes(ext)) return 4;
    return 0; // unknown
}

// ============================================================
// 路由注册
// ============================================================
export function fsReadRoutes(app: Hono<any>) {

    // ------------------------------------------------------------------
    // POST /api/fs/list — 列出目录文件
    // Body: { path, password?, page?, per_page?, refresh? }
    // 对应 GO 后端 FsListSplit / FsList
    // ------------------------------------------------------------------
    app.post('/api/fs/list', async (c: Context): Promise<any> => {
        const body = await parseBody(c);
        const path: string = body.path || '/';
        const password: string = body.password || '';
        const page: number = parseInt(body.page) || 1;
        const perPage: number = parseInt(body.per_page) || 30;
        const refresh: boolean = body.refresh === true || body.refresh === 'true';

        const user = c.get('user');

        // 处理分享路径（/@s 前缀）
        if (path.startsWith('/@s')) {
            return await handleShareList(c, path.replace('/@s', ''), password, page, perPage);
        }

        // 加载挂载点
        const mountManage = new MountManage(c);
        const driveLoad = await mountManage.loader(path, true, true);
        if (!driveLoad) return errorResp(c, '路径不存在', 404);

        const hasMountMain = driveLoad[0] !== null;
        let fileList: any[] = [];
        let totalCount = 0;

        if (hasMountMain) {
            await driveLoad[0].loadSelf();
            const relativePath = path.replace(driveLoad[0].router, '') || '/';
            const pathInfo = await driveLoad[0].listFile({ path: relativePath });
            if (pathInfo && pathInfo.fileList) {
                fileList = pathInfo.fileList;
                totalCount = pathInfo.pageSize || fileList.length;
            }
        }

        // 添加子挂载点目录
        for (let i = 1; i < driveLoad.length; i++) {
            const sub = driveLoad[i];
            let relativeName: string;
            if (hasMountMain) {
                relativeName = driveLoad[0].router === '/'
                    ? sub.router.substring(1)
                    : sub.router.substring(driveLoad[0].router.length).replace(/^\//, '');
            } else {
                const withoutSlash = sub.router.substring(1);
                const firstSlash = withoutSlash.indexOf('/');
                relativeName = firstSlash > 0 ? withoutSlash.substring(0, firstSlash) : withoutSlash;
            }
            if (relativeName && !fileList.some((f: any) => (f.fileName || f.name) === relativeName)) {
                fileList.push({
                    fileName: relativeName, fileSize: 0, fileType: 0,
                    timeModify: new Date().toISOString(), timeCreate: new Date().toISOString(),
                });
            }
        }

        // 分页
        const total = fileList.length;
        const start = (page - 1) * perPage;
        const paged = fileList.slice(start, start + perPage);
        const content = paged.map((f: any) => toObjResp(f, path));

        // 判断写权限
        const canWrite = user ? UsersManage.isAdmin(user) : false;

        return successResp(c, {
            content,
            total,
            readme: '',
            header: '',
            write: canWrite,
            write_content_bypass: false,
            provider: 'unknown',
        });
    });

    // ------------------------------------------------------------------
    // POST /api/fs/get — 获取文件详情
    // Body: { path, password? }
    // 对应 GO 后端 FsGetSplit / FsGet
    // ------------------------------------------------------------------
    app.post('/api/fs/get', async (c: Context): Promise<any> => {
        const body = await parseBody(c);
        const path: string = body.path || '/';
        const password: string = body.password || '';

        // 处理分享路径
        if (path.startsWith('/@s')) {
            return await handleShareGet(c, path.replace('/@s', ''), password);
        }

        const mountManage = new MountManage(c);
        const driveLoad = await mountManage.loader(path, false, false);
        if (!driveLoad || !driveLoad[0]) return errorResp(c, '文件不存在', 404);

        await driveLoad[0].loadSelf();
        const relativePath = path.replace(driveLoad[0].router, '') || '/';

        // 获取文件信息
        let fileInfo: any = null;
        try {
            const listResult = await driveLoad[0].listFile({ path: relativePath.replace(/\/[^/]+$/, '') || '/' });
            if (listResult && listResult.fileList) {
                const fileName = relativePath.split('/').pop();
                fileInfo = listResult.fileList.find((f: any) => (f.fileName || f.name) === fileName);
            }
        } catch { /* 忽略 */ }

        // 获取下载链接
        let rawUrl = '';
        try {
            const links = await driveLoad[0].downFile({ path: relativePath });
            if (links && links.length > 0) {
                rawUrl = links[0].direct || links[0].url || '';
            }
        } catch { /* 忽略 */ }

        const objResp = fileInfo ? toObjResp(fileInfo, path) : {
            name: path.split('/').pop() || '',
            size: 0, is_dir: false,
            modified: new Date().toISOString(),
            created: new Date().toISOString(),
            sign: '', thumb: '', type: 0, hashinfo: 'null', hash_info: null,
        };

        return successResp(c, {
            ...objResp,
            raw_url: rawUrl,
            readme: '',
            header: '',
            provider: 'unknown',
            related: [],
        });
    });

    // ------------------------------------------------------------------
    // GET /api/fs/dirs — 获取目录列表（仅目录）
    // Query: path, password?, force_root?
    // 对应 GO 后端 FsDirs
    // ------------------------------------------------------------------
    app.get('/api/fs/dirs', async (c: Context): Promise<any> => {
        const path = c.req.query('path') || '/';
        const password = c.req.query('password') || '';

        const mountManage = new MountManage(c);
        const driveLoad = await mountManage.loader(path, true, true);
        if (!driveLoad) return errorResp(c, '路径不存在', 404);

        let dirs: any[] = [];

        if (driveLoad[0] !== null) {
            await driveLoad[0].loadSelf();
            const relativePath = path.replace(driveLoad[0].router, '') || '/';
            const pathInfo = await driveLoad[0].listFile({ path: relativePath });
            if (pathInfo && pathInfo.fileList) {
                dirs = pathInfo.fileList
                    .filter((f: any) => f.fileType === 0 || f.is_dir)
                    .map((f: any) => ({
                        name: f.fileName || f.name,
                        modified: f.timeModify || f.modified || new Date().toISOString(),
                    }));
            }
        }

        // 添加子挂载点目录
        for (let i = 1; i < driveLoad.length; i++) {
            const sub = driveLoad[i];
            const withoutSlash = sub.router.substring(1);
            const firstSlash = withoutSlash.indexOf('/');
            const name = firstSlash > 0 ? withoutSlash.substring(0, firstSlash) : withoutSlash;
            if (name && !dirs.some(d => d.name === name)) {
                dirs.push({ name, modified: new Date().toISOString() });
            }
        }

        return successResp(c, dirs);
    });

    // ------------------------------------------------------------------
    // POST /api/fs/search — 搜索文件
    // Body: { path, keywords, scope?, page?, per_page? }
    // ------------------------------------------------------------------
    app.post('/api/fs/search', async (c: Context): Promise<any> => {
        const body = await parseBody(c);
        const path: string = body.path || '/';
        const keywords: string = body.keywords || '';
        const page: number = parseInt(body.page) || 1;
        const perPage: number = parseInt(body.per_page) || 30;

        if (!keywords) return errorResp(c, 'keywords 不能为空', 400);

        // 简单实现：列出目录后过滤
        const mountManage = new MountManage(c);
        const driveLoad = await mountManage.loader(path, true, true);
        if (!driveLoad || !driveLoad[0]) return successResp(c, { content: [], total: 0 });

        await driveLoad[0].loadSelf();
        const relativePath = path.replace(driveLoad[0].router, '') || '/';
        const pathInfo = await driveLoad[0].listFile({ path: relativePath });
        const fileList = pathInfo?.fileList || [];

        const filtered = fileList.filter((f: any) => {
            const name = (f.fileName || f.name || '').toLowerCase();
            return name.includes(keywords.toLowerCase());
        });

        const total = filtered.length;
        const start = (page - 1) * perPage;
        const paged = filtered.slice(start, start + perPage);
        const content = paged.map((f: any) => ({
            ...toObjResp(f, path),
            parent: path,
        }));

        return successResp(c, { content, total });
    });

    // ------------------------------------------------------------------
    // POST /api/fs/other — 其他文件操作（驱动特定）
    // ------------------------------------------------------------------
    app.post('/api/fs/other', async (c: Context): Promise<any> => {
        const body = await parseBody(c);
        const path: string = body.path || '/';

        const mountManage = new MountManage(c);
        const driveLoad = await mountManage.loader(path, false, false);
        if (!driveLoad || !driveLoad[0]) return errorResp(c, '路径不存在', 404);

        await driveLoad[0].loadSelf();
        const relativePath = path.replace(driveLoad[0].router, '') || '/';

        try {
            const result = await driveLoad[0].otherFile?.({ path: relativePath, ...body });
            return successResp(c, result);
        } catch (e: any) {
            return errorResp(c, e.message || '操作失败', 500);
        }
    });
}

// ============================================================
// 分享路径处理
// ============================================================

async function handleShareList(c: Context, path: string, password: string, page: number, perPage: number): Promise<any> {
    // 解析分享 ID 和子路径
    const trimmed = path.replace(/^\//, '');
    const slashIdx = trimmed.indexOf('/');
    const sid = slashIdx > 0 ? trimmed.substring(0, slashIdx) : trimmed;
    const subPath = slashIdx > 0 ? trimmed.substring(slashIdx) : '/';

    if (!sid) return errorResp(c, '无效的分享 ID', 400);

    const shareManage = new ShareManage(c);
    const validateResult = await shareManage.validateAccess(sid, password);
    if (!validateResult.flag) return errorResp(c, validateResult.text || '分享不存在或已失效', 500);

    const shareData = validateResult.data![0];
    const sharePath = Array.isArray(shareData.share_path) ? shareData.share_path[0] : shareData.share_path;
    const fullPath = subPath === '/' ? sharePath : `${sharePath}${subPath}`;

    const mountManage = new MountManage(c);
    const driveLoad = await mountManage.loader(fullPath, true, true);
    if (!driveLoad || !driveLoad[0]) return errorResp(c, '路径不存在', 404);

    await driveLoad[0].loadSelf();
    const relativePath = fullPath.replace(driveLoad[0].router, '') || '/';
    const pathInfo = await driveLoad[0].listFile({ path: relativePath });
    const fileList = pathInfo?.fileList || [];

    const total = fileList.length;
    const start = (page - 1) * perPage;
    const paged = fileList.slice(start, start + perPage);
    const content = paged.map((f: any) => toObjResp(f, fullPath));

    return successResp(c, {
        content, total,
        readme: (shareData as any).readme || '',
        header: (shareData as any).header || '',
        write: false,
        provider: 'unknown',
    });
}

async function handleShareGet(c: Context, path: string, password: string): Promise<any> {
    const trimmed = path.replace(/^\//, '');
    const slashIdx = trimmed.indexOf('/');
    const sid = slashIdx > 0 ? trimmed.substring(0, slashIdx) : trimmed;
    const subPath = slashIdx > 0 ? trimmed.substring(slashIdx) : '/';

    if (!sid) return errorResp(c, '无效的分享 ID', 400);

    const shareManage = new ShareManage(c);
    const validateResult = await shareManage.validateAccess(sid, password);
    if (!validateResult.flag) return errorResp(c, validateResult.text || '分享不存在或已失效', 500);

    const shareData = validateResult.data![0];
    const sharePath = Array.isArray(shareData.share_path) ? shareData.share_path[0] : shareData.share_path;
    const fullPath = subPath === '/' ? sharePath : `${sharePath}${subPath}`;

    const mountManage = new MountManage(c);
    const driveLoad = await mountManage.loader(fullPath, false, false);
    if (!driveLoad || !driveLoad[0]) return errorResp(c, '文件不存在', 404);

    await driveLoad[0].loadSelf();
    const relativePath = fullPath.replace(driveLoad[0].router, '') || '/';

    let rawUrl = '';
    try {
        const links = await driveLoad[0].downFile({ path: relativePath });
        if (links && links.length > 0) rawUrl = links[0].direct || links[0].url || '';
    } catch { /* 忽略 */ }

    const fileName = fullPath.split('/').pop() || '';
    return successResp(c, {
        name: fileName, size: 0, is_dir: false,
        modified: new Date().toISOString(), created: new Date().toISOString(),
        sign: '', thumb: '', type: 0, hashinfo: 'null', hash_info: null,
        raw_url: rawUrl,
        readme: (shareData as any).readme || '',
        header: (shareData as any).header || '',
        provider: 'unknown',
        related: [],
    });
}
