/**
 * 管理员 API 路由 — /api/admin/*、/api/public/*
 * 与 GO 后端 server/router.go admin() 函数对齐
 *
 * 端点：
 *   /api/admin/user/*     — 用户管理
 *   /api/admin/storage/*  — 存储管理
 *   /api/admin/driver/*   — 驱动信息
 *   /api/admin/setting/*  — 系统设置
 *   /api/admin/meta/*     — 路径元数据
 *   /api/public/settings  — 公开设置（无需认证）
 */
import type { Hono, Context } from 'hono';
import { UsersManage } from '../users/UsersManage';
import { MountManage } from '../mount/MountManage';
import { AdminManage } from '../admin/AdminManage';
import { MatesManage } from '../mates/MatesManage';
import { CryptManage } from '../crypt/CryptManage';
import { TokenManage } from '../token/TokenManage';
import { MediaManage } from '../media/MediaManage';
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

function requireAdmin(c: Context): boolean {
    const user = c.get('user');
    return user ? UsersManage.isAdmin(user) : false;
}

// ============================================================
// 路由注册
// ============================================================
export function adminApiRoutes(app: Hono<any>) {

    // ============================================================
    // 管理员权限中间件（必须在所有 /api/admin/* 路由之前注册）
    // ============================================================
    app.use('/api/admin/*', async (c, next) => {
        const user = c.get('user');
        if (!user) return errorResp(c, '未登录', 401);
        if (!UsersManage.isAdmin(user)) return errorResp(c, '需要管理员权限', 403);
        await next();
    });

    // ============================================================
    // 公开设置（无需认证）
    // ============================================================

    // GET /api/public/settings — 公开系统设置
    app.get('/api/public/settings', async (c: Context): Promise<any> => {
        const adminManage = new AdminManage(c);
        const result = await adminManage.select();

        // 过滤出公开设置项
        const publicKeys = new Set([
            'site_name', 'site_logo', 'site_favicon', 'site_description',
            'allow_registration', 'default_page_size', 'version',
            'announcement', 'theme', 'custom_css', 'custom_js',
            'ocr_api', 'video_autoplay', 'audio_autoplay',
        ]);

        const settings: Record<string, any> = {};
        if (result.flag && result.data) {
            for (const item of result.data as any[]) {
                if (publicKeys.has(item.admin_keys)) {
                    settings[item.admin_keys] = item.admin_data;
                }
            }
        }

        // 默认值
        return successResp(c, {
            site_name: settings.site_name || 'OpenList',
            site_logo: settings.site_logo || '',
            site_favicon: settings.site_favicon || '',
            site_description: settings.site_description || '',
            allow_registration: settings.allow_registration !== 'false',
            version: settings.version || '1.0.0',
            announcement: settings.announcement || '',
            ...settings,
        });
    });

    // GET /ping — 健康检查
    app.get('/ping', (c: Context) => c.text('pong'));

    // ============================================================
    // 用户管理 /api/admin/user/*
    // 字段映射（Go后端 → TSWorker内部）：
    //   id(number)       → users_name(string) 作为唯一标识
    //   username         → users_name
    //   password         → users_pass
    //   role(0/1/2)      → users_mask('general'/'guest'/'admin')
    //   disabled(bool)   → is_enabled(!disabled)
    //   permission(int32)→ users_mask 位掩码扩展字段
    //   base_path        → mount_data
    // ============================================================

    /** 将 TSWorker 内部用户对象转换为 Go 后端风格响应 */
    function toGoUser(u: any, idx: number): any {
        const roleMap: Record<string, number> = { 'admin': 2, 'guest': 1 };
        const role = roleMap[u.users_mask] ?? 0;
        return {
            id: u.users_id ?? (idx + 1),
            username: u.users_name,
            base_path: u.mount_data || '/',
            role,
            disabled: u.is_enabled === false,
            permission: u.users_perm ?? 0,
            sso_id: u.sso_id || '',
            otp: !!(u.otp_secret),
        };
    }

    // GET /api/admin/user/list
    app.get('/api/admin/user/list', async (c: Context): Promise<any> => {
        const page = parseInt(c.req.query('page') || '1');
        const perPage = parseInt(c.req.query('per_page') || '30');

        const usersManage = new UsersManage(c);
        const result = await usersManage.select();
        if (!result.flag) return errorResp(c, result.text || '查询失败', 500);

        const all = result.data || [];
        const total = all.length;
        const start = (page - 1) * perPage;
        const content = all.slice(start, start + perPage).map((u: any, i: number) => toGoUser(u, start + i));

        return successResp(c, { content, total });
    });

    // GET /api/admin/user/get?id=xxx
    app.get('/api/admin/user/get', async (c: Context): Promise<any> => {
        // Go后端用 id(number) 查询，TSWorker 用 username 兼容两种方式
        const idOrName = c.req.query('id') || c.req.query('username') || '';
        if (!idOrName) return errorResp(c, 'id 不能为空', 400);

        const usersManage = new UsersManage(c);
        // 先尝试按用户名查询
        const result = await usersManage.select(idOrName);
        if (!result.flag || !result.data || result.data.length === 0) {
            return errorResp(c, '用户不存在', 404);
        }

        return successResp(c, toGoUser(result.data[0], 0));
    });

    // POST /api/admin/user/create
    // Body: { username, password, base_path?, role?, disabled?, permission? }
    app.post('/api/admin/user/create', async (c: Context): Promise<any> => {
        const body = await parseBody(c);
        const roleToMask: Record<number, string> = { 2: 'admin', 1: 'guest', 0: '' };
        const usersManage = new UsersManage(c);
        const result = await usersManage.create({
            users_name: body.username,
            users_pass: body.password,
            users_mail: body.email || '',
            users_mask: body.role !== undefined ? (roleToMask[body.role] ?? '') : '',
            is_enabled: body.disabled ? false : true,
            mount_data: body.base_path || '',
            total_size: body.total_size ?? 1024 * 1024 * 1024,
        });
        if (!result.flag) return errorResp(c, result.text || '创建失败', 500);
        return successResp(c);
    });

    // POST /api/admin/user/update
    // Body: { id, username, password?, base_path?, disabled?, permission? }
    app.post('/api/admin/user/update', async (c: Context): Promise<any> => {
        const body = await parseBody(c);
        const username = body.username;
        if (!username) return errorResp(c, 'username 不能为空', 400);

        const usersManage = new UsersManage(c);
        // 先查询确认用户存在
        const findResult = await usersManage.select(username);
        if (!findResult.flag || !findResult.data || findResult.data.length === 0) {
            return errorResp(c, '用户不存在', 404);
        }
        const existing = findResult.data[0] as any;

        const updateData: any = { users_name: username };
        if (body.password) updateData.users_pass = body.password;
        if (body.base_path !== undefined) updateData.mount_data = body.base_path;
        if (body.disabled !== undefined) updateData.is_enabled = !body.disabled;
        // role 不允许修改（与Go后端一致）

        const result = await usersManage.config({ ...existing, ...updateData });
        if (!result.flag) return errorResp(c, result.text || '更新失败', 500);
        return successResp(c);
    });

    // POST /api/admin/user/delete?id=xxx
    app.post('/api/admin/user/delete', async (c: Context): Promise<any> => {
        const body = await parseBody(c);
        const username = body.username || c.req.query('username') || c.req.query('id') || '';
        if (!username) return errorResp(c, 'id 不能为空', 400);

        const usersManage = new UsersManage(c);
        const result = await usersManage.remove(username);
        if (!result.flag) return errorResp(c, result.text || '删除失败', 500);
        return successResp(c);
    });

    // POST /api/admin/user/cancel_2fa?id=xxx
    app.post('/api/admin/user/cancel_2fa', async (c: Context): Promise<any> => {
        const body = await parseBody(c);
        const username = body.username || c.req.query('username') || c.req.query('id') || '';
        if (!username) return errorResp(c, 'id 不能为空', 400);

        const usersManage = new UsersManage(c);
        const findResult = await usersManage.select(username);
        if (!findResult.flag || !findResult.data || findResult.data.length === 0) {
            return errorResp(c, '用户不存在', 404);
        }
        const existing = findResult.data[0] as any;
        const result = await usersManage.config({ ...existing, otp_secret: '' });
        if (!result.flag) return errorResp(c, result.text || '操作失败', 500);
        return successResp(c);
    });

    // POST /api/admin/user/del_cache?username=xxx
    app.post('/api/admin/user/del_cache', async (c: Context): Promise<any> => {
        // TSWorker 无内存缓存，直接返回成功
        return successResp(c);
    });

    // ============================================================
    // 存储管理 /api/admin/storage/*
    // 字段映射（Go后端 → TSWorker内部）：
    //   id(number)           → 按列表顺序生成（mount_path 作为唯一标识）
    //   mount_path           → mount_path
    //   driver               → mount_type
    //   addition(string)     → drive_conf
    //   cache_expiration     → cache_time
    //   disabled(bool)       → is_enabled(!disabled)
    //   order                → order（暂无，默认0）
    //   remark               → remark（暂无，默认''）
    //   status               → is_enabled ? 'work' : 'disabled'
    // ============================================================

    /** 将 TSWorker 内部存储对象转换为 Go 后端风格响应 */
    function toGoStorage(m: any, id: number): any {
        return {
            id,
            mount_path: m.mount_path,
            driver: m.mount_type || '',
            order: m.order ?? 0,
            remark: m.remark || '',
            cache_expiration: m.cache_time ?? 30,
            status: m.is_enabled ? 'work' : 'disabled',
            addition: m.drive_conf || '{}',
            disabled: !m.is_enabled,
            web_proxy: m.proxy_mode === 1,
            webdav_policy: m.proxy_data || 'native_proxy',
            down_proxy_url: '',
            enable_sign: false,
            disable_index: false,
        };
    }

    /** 根据 id 或 mount_path 查找存储，返回 [存储对象, id] */
    async function findStorageByIdOrPath(mountManage: MountManage, idOrPath: string): Promise<[any, number] | null> {
        const all = await mountManage.select();
        if (!all.flag || !all.data) return null;
        const idNum = parseInt(idOrPath);
        if (!isNaN(idNum) && idNum > 0) {
            const item = all.data[idNum - 1] as any;
            return item ? [item, idNum] : null;
        }
        // 按 mount_path 查找
        const idx = (all.data as any[]).findIndex((m: any) => m.mount_path === idOrPath);
        return idx >= 0 ? [all.data[idx], idx + 1] : null;
    }

    // GET /api/admin/storage/list
    app.get('/api/admin/storage/list', async (c: Context): Promise<any> => {
        const page = parseInt(c.req.query('page') || '1');
        const perPage = parseInt(c.req.query('per_page') || '30');

        const mountManage = new MountManage(c);
        const result = await mountManage.select();
        if (!result.flag) return errorResp(c, result.text || '查询失败', 500);

        const all = result.data || [];
        const total = all.length;
        const start = (page - 1) * perPage;
        const content = all.slice(start, start + perPage).map((m: any, idx: number) =>
            toGoStorage(m, start + idx + 1)
        );

        return successResp(c, { content, total });
    });

    // GET /api/admin/storage/get?id=xxx
    app.get('/api/admin/storage/get', async (c: Context): Promise<any> => {
        const idOrPath = c.req.query('id') || c.req.query('mount_path') || '';
        if (!idOrPath) return errorResp(c, 'id 不能为空', 400);

        const mountManage = new MountManage(c);
        const found = await findStorageByIdOrPath(mountManage, idOrPath);
        if (!found) return errorResp(c, '存储不存在', 404);

        return successResp(c, toGoStorage(found[0], found[1]));
    });

    // POST /api/admin/storage/create
    // Body: { mount_path, driver, addition?, cache_expiration?, disabled?, web_proxy?, order?, remark? }
    app.post('/api/admin/storage/create', async (c: Context): Promise<any> => {
        const body = await parseBody(c);
        if (!body.mount_path || !body.driver) return errorResp(c, 'mount_path 和 driver 不能为空', 400);

        const mountManage = new MountManage(c);
        const result = await mountManage.create({
            mount_path: body.mount_path,
            mount_type: body.driver,
            is_enabled: body.disabled ? false : true,
            drive_conf: typeof body.addition === 'string' ? body.addition : JSON.stringify(body.addition || {}),
            drive_save: '{}',
            drive_logs: '',
            cache_time: body.cache_expiration ?? 30,
            proxy_mode: body.web_proxy ? 1 : 0,
        });

        if (!result.flag) return errorResp(c, result.text || '创建失败', 500);
        // 返回新存储的 id（列表末尾）
        const all = await mountManage.select();
        const newId = (all.data || []).length;
        return successResp(c, { id: newId });
    });

    // POST /api/admin/storage/update
    // Body: { id, mount_path, driver?, addition?, cache_expiration?, disabled?, web_proxy? }
    app.post('/api/admin/storage/update', async (c: Context): Promise<any> => {
        const body = await parseBody(c);
        const idOrPath = body.id !== undefined ? String(body.id) : (body.mount_path || '');
        if (!idOrPath) return errorResp(c, 'id 不能为空', 400);

        const mountManage = new MountManage(c);
        const found = await findStorageByIdOrPath(mountManage, idOrPath);
        if (!found) return errorResp(c, '存储不存在', 404);

        const existing = found[0] as any;
        const updateData: any = { mount_path: existing.mount_path };
        if (body.driver !== undefined) updateData.mount_type = body.driver;
        if (body.addition !== undefined) {
            updateData.drive_conf = typeof body.addition === 'string' ? body.addition : JSON.stringify(body.addition);
        }
        if (body.disabled !== undefined) updateData.is_enabled = !body.disabled;
        if (body.cache_expiration !== undefined) updateData.cache_time = body.cache_expiration;
        if (body.web_proxy !== undefined) updateData.proxy_mode = body.web_proxy ? 1 : 0;
        if (body.order !== undefined) updateData.order = body.order;
        if (body.remark !== undefined) updateData.remark = body.remark;

        const result = await mountManage.config({ ...existing, ...updateData });
        if (!result.flag) return errorResp(c, result.text || '更新失败', 500);
        return successResp(c);
    });

    // POST /api/admin/storage/delete?id=xxx
    app.post('/api/admin/storage/delete', async (c: Context): Promise<any> => {
        const body = await parseBody(c);
        const idOrPath = body.id !== undefined ? String(body.id) : (body.mount_path || c.req.query('id') || '');
        if (!idOrPath) return errorResp(c, 'id 不能为空', 400);

        const mountManage = new MountManage(c);
        const found = await findStorageByIdOrPath(mountManage, idOrPath);
        if (!found) return errorResp(c, '存储不存在', 404);

        const result = await mountManage.remove(found[0].mount_path);
        if (!result.flag) return errorResp(c, result.text || '删除失败', 500);
        return successResp(c);
    });

    // POST /api/admin/storage/enable?id=xxx
    app.post('/api/admin/storage/enable', async (c: Context): Promise<any> => {
        const body = await parseBody(c);
        const idOrPath = body.id !== undefined ? String(body.id) : (body.mount_path || c.req.query('id') || '');
        if (!idOrPath) return errorResp(c, 'id 不能为空', 400);

        const mountManage = new MountManage(c);
        const found = await findStorageByIdOrPath(mountManage, idOrPath);
        if (!found) return errorResp(c, '存储不存在', 404);

        const configResult = await mountManage.config({ ...found[0], is_enabled: true });
        if (!configResult.flag) return errorResp(c, configResult.text || '操作失败', 500);
        // 启用后重新初始化驱动
        await mountManage.reload(found[0].mount_path);
        return successResp(c);
    });

    // POST /api/admin/storage/disable?id=xxx
    app.post('/api/admin/storage/disable', async (c: Context): Promise<any> => {
        const body = await parseBody(c);
        const idOrPath = body.id !== undefined ? String(body.id) : (body.mount_path || c.req.query('id') || '');
        if (!idOrPath) return errorResp(c, 'id 不能为空', 400);

        const mountManage = new MountManage(c);
        const found = await findStorageByIdOrPath(mountManage, idOrPath);
        if (!found) return errorResp(c, '存储不存在', 404);

        const result = await mountManage.config({ ...found[0], is_enabled: false });
        if (!result.flag) return errorResp(c, result.text || '操作失败', 500);
        return successResp(c);
    });

    // POST /api/admin/storage/load_all — 重新加载所有存储
    app.post('/api/admin/storage/load_all', async (c: Context): Promise<any> => {
        const mountManage = new MountManage(c);
        const result = await mountManage.select();
        if (!result.flag) return errorResp(c, result.text || '查询失败', 500);

        for (const mount of (result.data || []) as any[]) {
            if (mount.is_enabled) {
                try { await mountManage.reload(mount.mount_path); }
                catch (e) { console.error(`重新加载 ${mount.mount_path} 失败:`, e); }
            }
        }
        return successResp(c);
    });

    // ============================================================
    // 驱动信息 /api/admin/driver/*
    // ============================================================

    // GET /api/admin/driver/list
    app.get('/api/admin/driver/list', async (c: Context): Promise<any> => {
        const mountManage = new MountManage(c);
        const result = await mountManage.driver();
        if (!result.flag) return errorResp(c, result.text || '查询失败', 500);
        return successResp(c, result.data || []);
    });

    // GET /api/admin/driver/names
    app.get('/api/admin/driver/names', async (c: Context): Promise<any> => {
        const mountManage = new MountManage(c);
        const result = await mountManage.driver();
        if (!result.flag) return errorResp(c, result.text || '查询失败', 500);
        const names = (result.data || []).map((d: any) => d.name || d.mount_type || d);
        return successResp(c, names);
    });

    // GET /api/admin/driver/info?driver=xxx
    app.get('/api/admin/driver/info', async (c: Context): Promise<any> => {
        const driverName = c.req.query('driver') || '';
        if (!driverName) return errorResp(c, 'driver 不能为空', 400);

        const mountManage = new MountManage(c);
        const result = await mountManage.driver();
        if (!result.flag) return errorResp(c, result.text || '查询失败', 500);

        const driver = (result.data || []).find((d: any) => (d.name || d.mount_type || d) === driverName);
        if (!driver) return errorResp(c, '驱动不存在', 404);
        return successResp(c, driver);
    });

    // ============================================================
    // 系统设置 /api/admin/setting/*
    // ============================================================

    // GET /api/admin/setting/list
    app.get('/api/admin/setting/list', async (c: Context): Promise<any> => {
        const group = c.req.query('group');
        const adminManage = new AdminManage(c);
        const result = await adminManage.select();
        if (!result.flag) return errorResp(c, result.text || '查询失败', 500);

        let settings = (result.data || []) as any[];
        if (group) {
            settings = settings.filter((s: any) => s.admin_group === group || s.group === group);
        }

        return successResp(c, settings.map((s: any) => ({
            key: s.admin_keys,
            value: s.admin_data,
            type: s.admin_type || 'string',
            group: s.admin_group || 'general',
            flag: s.admin_flag || 0,
        })));
    });

    // GET /api/admin/setting/get?key=xxx
    app.get('/api/admin/setting/get', async (c: Context): Promise<any> => {
        const key = c.req.query('key') || '';
        if (!key) return errorResp(c, 'key 不能为空', 400);

        const adminManage = new AdminManage(c);
        const result = await adminManage.select();
        if (!result.flag) return errorResp(c, result.text || '查询失败', 500);

        const setting = (result.data || []).find((s: any) => s.admin_keys === key);
        if (!setting) return errorResp(c, '设置项不存在', 404);

        return successResp(c, {
            key: (setting as any).admin_keys,
            value: (setting as any).admin_data,
            type: (setting as any).admin_type || 'string',
        });
    });

    // POST /api/admin/setting/save — 批量保存设置
    app.post('/api/admin/setting/save', async (c: Context): Promise<any> => {
        const body = await parseBody(c);
        const settings: Array<{ key: string; value: any }> = body.settings || body;

        if (!Array.isArray(settings)) return errorResp(c, '请求体应为设置数组', 400);

        const adminManage = new AdminManage(c);
        const items = settings.map((s: any) => ({
            admin_keys: s.key || s.admin_keys,
            admin_data: s.value !== undefined ? s.value : s.admin_data,
        }));

        const result = await adminManage.batchConfig(items);
        if (!result.flag) return errorResp(c, result.text || '保存失败', 500);
        return successResp(c);
    });

    // POST /api/admin/setting/delete?key=xxx
    app.post('/api/admin/setting/delete', async (c: Context): Promise<any> => {
        const body = await parseBody(c);
        const key = body.key || c.req.query('key') || '';
        if (!key) return errorResp(c, 'key 不能为空', 400);

        const adminManage = new AdminManage(c);
        await adminManage.remove(key);
        return successResp(c);
    });

    // POST /api/admin/setting/default — 恢复默认设置（对齐Go后端）
    app.post('/api/admin/setting/default', async (c: Context): Promise<any> => {
        const adminManage = new AdminManage(c);
        const result = await adminManage.resetAll();
        if (!result.flag) return errorResp(c, result.text || '恢复默认失败', 500);
        return successResp(c);
    });

    // POST /api/admin/setting/reset_token — 重置 token
    app.post('/api/admin/setting/reset_token', async (c: Context): Promise<any> => {
        // 生成新的 JWT 密钥
        const newSecret = Array.from(crypto.getRandomValues(new Uint8Array(32)))
            .map(b => b.toString(16).padStart(2, '0')).join('');

        const adminManage = new AdminManage(c);
        await adminManage.config('jwt_secret', newSecret);
        return successResp(c, { token: newSecret });
    });

    // ============================================================
    // 路径元数据 /api/admin/meta/*
    // 字段映射（Go后端 → TSWorker内部）：
    //   id(number)     → 按列表顺序生成（mates_name/path 作为唯一标识）
    //   path           → mates_name
    //   password       → mates_pass
    //   write(bool)    → dir_shared(0/1)
    //   hide(string)   → dir_hidden(0/1)（Go后端hide为正则字符串，TSWorker简化为bool）
    //   p_sub          → p_sub
    //   w_sub          → w_sub
    //   h_sub          → h_sub
    //   readme         → readme
    //   r_sub          → readme_sub
    //   header         → header
    //   header_sub     → header_sub
    // ============================================================

    /** 将 TSWorker 内部 meta 对象转换为 Go 后端风格响应 */
    function toGoMeta(m: any, id: number): any {
        return {
            id,
            path: m.mates_name,
            password: m.mates_pass || '',
            p_sub: m.p_sub ?? false,
            write: !!(m.dir_shared),
            w_sub: m.w_sub ?? false,
            hide: m.dir_hidden ? m.hide_pattern || '' : '',
            h_sub: m.h_sub ?? false,
            readme: m.readme || '',
            r_sub: m.readme_sub ?? false,
            header: m.header || '',
            header_sub: m.header_sub ?? false,
        };
    }

    /** 根据 id(number) 或 path(string) 查找 meta，返回 [meta对象, id] */
    async function findMetaByIdOrPath(matesManage: MatesManage, idOrPath: string): Promise<[any, number] | null> {
        const idNum = parseInt(idOrPath);
        if (!isNaN(idNum) && idNum > 0) {
            // 按顺序 id 查找
            const all = await matesManage.select();
            if (!all.flag || !all.data) return null;
            const item = all.data[idNum - 1] as any;
            return item ? [item, idNum] : null;
        }
        // 按 path 查找
        const result = await matesManage.select(idOrPath);
        if (!result.flag || !result.data || result.data.length === 0) return null;
        // 获取全列表以确定 id
        const all = await matesManage.select();
        const idx = (all.data as any[]).findIndex((m: any) => m.mates_name === idOrPath);
        return idx >= 0 ? [result.data[0], idx + 1] : [result.data[0], 1];
    }

    // GET /api/admin/meta/list
    app.get('/api/admin/meta/list', async (c: Context): Promise<any> => {
        const page = parseInt(c.req.query('page') || '1');
        const perPage = parseInt(c.req.query('per_page') || '30');

        const matesManage = new MatesManage(c);
        const result = await matesManage.select();
        if (!result.flag) return errorResp(c, result.text || '查询失败', 500);

        const all = result.data || [];
        const total = all.length;
        const start = (page - 1) * perPage;
        const content = all.slice(start, start + perPage).map((m: any, idx: number) =>
            toGoMeta(m, start + idx + 1)
        );

        return successResp(c, { content, total });
    });

    // GET /api/admin/meta/get?id=xxx
    app.get('/api/admin/meta/get', async (c: Context): Promise<any> => {
        const idOrPath = c.req.query('id') || c.req.query('path') || '';
        if (!idOrPath) return errorResp(c, 'id 不能为空', 400);

        const matesManage = new MatesManage(c);
        const found = await findMetaByIdOrPath(matesManage, idOrPath);
        if (!found) return errorResp(c, '元数据不存在', 404);

        return successResp(c, toGoMeta(found[0], found[1]));
    });

    // POST /api/admin/meta/create
    // Body: { path, password?, write?, w_sub?, p_sub?, hide?, h_sub?, readme?, r_sub?, header?, header_sub? }
    app.post('/api/admin/meta/create', async (c: Context): Promise<any> => {
        const body = await parseBody(c);
        if (!body.path) return errorResp(c, 'path 不能为空', 400);

        const matesManage = new MatesManage(c);
        const result = await matesManage.create({
            mates_name: body.path,
            mates_mask: body.write ? 1 : 0,
            mates_user: 0,
            is_enabled: 1,
            dir_hidden: body.hide ? 1 : 0,
            dir_shared: body.write ? 1 : 0,
            mates_pass: body.password || '',
            p_sub: body.p_sub ?? false,
            w_sub: body.w_sub ?? false,
            h_sub: body.h_sub ?? false,
            hide_pattern: typeof body.hide === 'string' ? body.hide : '',
            readme: body.readme || '',
            readme_sub: body.r_sub ?? false,
            header: body.header || '',
            header_sub: body.header_sub ?? false,
        } as any);

        if (!result.flag) return errorResp(c, result.text || '创建失败', 500);
        return successResp(c);
    });

    // POST /api/admin/meta/update
    // Body: { id, path?, password?, write?, w_sub?, p_sub?, hide?, h_sub?, readme?, r_sub?, header?, header_sub? }
    app.post('/api/admin/meta/update', async (c: Context): Promise<any> => {
        const body = await parseBody(c);
        const idOrPath = body.id !== undefined ? String(body.id) : (body.path || '');
        if (!idOrPath) return errorResp(c, 'id 不能为空', 400);

        const matesManage = new MatesManage(c);
        const found = await findMetaByIdOrPath(matesManage, idOrPath);
        if (!found) return errorResp(c, '元数据不存在', 404);

        const existing = found[0] as any;
        const updateData: any = { mates_name: existing.mates_name };
        if (body.password !== undefined) updateData.mates_pass = body.password;
        if (body.write !== undefined) updateData.dir_shared = body.write ? 1 : 0;
        if (body.w_sub !== undefined) updateData.w_sub = body.w_sub;
        if (body.p_sub !== undefined) updateData.p_sub = body.p_sub;
        if (body.hide !== undefined) {
            updateData.dir_hidden = body.hide ? 1 : 0;
            if (typeof body.hide === 'string') updateData.hide_pattern = body.hide;
        }
        if (body.h_sub !== undefined) updateData.h_sub = body.h_sub;
        if (body.readme !== undefined) updateData.readme = body.readme;
        if (body.r_sub !== undefined) updateData.readme_sub = body.r_sub;
        if (body.header !== undefined) updateData.header = body.header;
        if (body.header_sub !== undefined) updateData.header_sub = body.header_sub;

        const result = await matesManage.config({ ...existing, ...updateData });
        if (!result.flag) return errorResp(c, result.text || '更新失败', 500);
        return successResp(c);
    });

    // POST /api/admin/meta/delete?id=xxx
    app.post('/api/admin/meta/delete', async (c: Context): Promise<any> => {
        const body = await parseBody(c);
        const idOrPath = body.id !== undefined ? String(body.id) : (body.path || c.req.query('id') || '');
        if (!idOrPath) return errorResp(c, 'id 不能为空', 400);

        const matesManage = new MatesManage(c);
        const found = await findMetaByIdOrPath(matesManage, idOrPath);
        if (!found) return errorResp(c, '元数据不存在', 404);

        const result = await matesManage.remove(found[0].mates_name);
        if (!result.flag) return errorResp(c, result.text || '删除失败', 500);
        return successResp(c);
    });

    // ============================================================
    // 加密配置管理 /api/admin/crypt/*
    // ============================================================

    // GET /api/admin/crypt/list — 查询所有加密配置
    app.get('/api/admin/crypt/list', async (c: Context): Promise<any> => {
        const cryptManage = new CryptManage(c);
        const result = await cryptManage.select();
        return successResp(c, result.data || []);
    });

    // POST /api/admin/crypt/create — 创建加密配置
    app.post('/api/admin/crypt/create', async (c: Context): Promise<any> => {
        const body = await parseBody(c);
        const cryptManage = new CryptManage(c);
        const result = await cryptManage.create(body);
        if (!result.flag) return errorResp(c, result.text, 400);
        return successResp(c);
    });

    // POST /api/admin/crypt/update — 更新加密配置
    app.post('/api/admin/crypt/update', async (c: Context): Promise<any> => {
        const body = await parseBody(c);
        const cryptManage = new CryptManage(c);
        const result = await cryptManage.config(body);
        if (!result.flag) return errorResp(c, result.text, 400);
        return successResp(c);
    });

    // POST /api/admin/crypt/delete — 删除加密配置
    app.post('/api/admin/crypt/delete', async (c: Context): Promise<any> => {
        const body = await parseBody(c);
        const { crypt_name } = body;
        if (!crypt_name) return errorResp(c, 'crypt_name 不能为空', 400);
        const cryptManage = new CryptManage(c);
        const result = await cryptManage.remove(crypt_name);
        if (!result.flag) return errorResp(c, result.text, 400);
        return successResp(c);
    });

    // POST /api/admin/crypt/status — 切换加密配置状态
    app.post('/api/admin/crypt/status', async (c: Context): Promise<any> => {
        const body = await parseBody(c);
        const { crypt_name, is_enabled } = body;
        if (!crypt_name) return errorResp(c, 'crypt_name 不能为空', 400);
        const cryptManage = new CryptManage(c);
        const result = await cryptManage.toggleStatus(crypt_name, is_enabled);
        if (!result.flag) return errorResp(c, result.text, 400);
        return successResp(c);
    });

    // ============================================================
    // 连接令牌管理 /api/admin/token/*
    // ============================================================

    // GET /api/admin/token/list — 查询所有令牌
    app.get('/api/admin/token/list', async (c: Context): Promise<any> => {
        const tokenManage = new TokenManage(c);
        const result = await tokenManage.select();
        return successResp(c, result.data || []);
    });

    // POST /api/admin/token/user — 按用户查询令牌
    app.post('/api/admin/token/user', async (c: Context): Promise<any> => {
        const body = await parseBody(c);
        const { token_user } = body;
        if (!token_user) return errorResp(c, 'token_user 不能为空', 400);
        const tokenManage = new TokenManage(c);
        const result = await tokenManage.getByUser(token_user);
        if (!result.flag) return errorResp(c, result.text, 400);
        return successResp(c, result.data || []);
    });

    // POST /api/admin/token/create — 创建令牌
    app.post('/api/admin/token/create', async (c: Context): Promise<any> => {
        const body = await parseBody(c);
        const tokenManage = new TokenManage(c);
        const result = await tokenManage.create(body);
        if (!result.flag) return errorResp(c, result.text, 400);
        return successResp(c);
    });

    // POST /api/admin/token/config — 更新令牌
    app.post('/api/admin/token/config', async (c: Context): Promise<any> => {
        const body = await parseBody(c);
        const tokenManage = new TokenManage(c);
        const result = await tokenManage.config(body);
        if (!result.flag) return errorResp(c, result.text, 400);
        return successResp(c);
    });

    // POST /api/admin/token/remove — 删除令牌
    app.post('/api/admin/token/remove', async (c: Context): Promise<any> => {
        const body = await parseBody(c);
        const { token_uuid } = body;
        if (!token_uuid) return errorResp(c, 'token_uuid 不能为空', 400);
        const tokenManage = new TokenManage(c);
        const result = await tokenManage.remove(token_uuid);
        if (!result.flag) return errorResp(c, result.text, 400);
        return successResp(c);
    });

    // ============================================================
    // 媒体库 /api/admin/media/*
    // ============================================================

    // GET /api/admin/media/list/:type — 获取媒体文件列表
    app.get('/api/admin/media/list/:type', async (c: Context): Promise<any> => {
        const mediaType = c.req.param('type') as any;
        const page = parseInt(c.req.query('page') || '1');
        const pageSize = parseInt(c.req.query('pageSize') || '50');
        const keyword = c.req.query('keyword') || '';
        const mediaManage = new MediaManage(c);
        const result = await mediaManage.list(mediaType, page, pageSize, keyword || undefined);
        if (!result.flag) return errorResp(c, result.text, 400);
        return successResp(c, result.data);
    });

    // GET /api/admin/media/stats — 获取媒体库统计
    app.get('/api/admin/media/stats', async (c: Context): Promise<any> => {
        const mediaManage = new MediaManage(c);
        const result = await mediaManage.stats();
        if (!result.flag) return errorResp(c, result.text, 400);
        return successResp(c, result.data);
    });
}
