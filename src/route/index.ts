/**
 * 全局中间件
 * 认证、CORS、日志、错误处理、限流、权限、国际化
 */
import type { Context, Next } from 'hono';
import { UsersManage } from '../users/UsersManage';
import { errorResp, unauthorized, forbidden, sanitizePath } from '../types/HttpResponse';
import { i18nMiddleware } from '../i18n';

// 重新导出 i18nMiddleware 供 index.ts 使用
export { i18nMiddleware };

// ============================================================
// 用户权限掩码常量（与 Go 后端 model.User 对齐）
// ============================================================
export const Permission = {
    /** 游客：仅可读，不可写 */
    GUEST: 0,
    /** 基础读取权限 */
    READ: 1 << 0,
    /** WebDAV 读取 */
    WEBDAV_READ: 1 << 1,
    /** WebDAV 写入 */
    WEBDAV_WRITE: 1 << 2,
    /** 可修改他人文件 */
    WRITE_OTHERS: 1 << 3,
    /** 管理员 */
    ADMIN: 1 << 4,
} as const;

/** 字符串 mask 到权限位的映射 */
const MASK_TO_PERMISSION: Record<string, number> = {
    'guest': Permission.GUEST,
    'read': Permission.READ,
    'webdav_read': Permission.WEBDAV_READ,
    'webdav_write': Permission.WEBDAV_WRITE,
    'write_others': Permission.WRITE_OTHERS,
    'admin': Permission.ADMIN,
};

/**
 * 从用户对象的 users_mask 字段解析权限位图
 * 支持位掩码数字、字符串、逗号分隔字符串
 */
function resolvePermission(user: any): number {
    if (!user) return Permission.GUEST;
    const mask = user.users_mask;
    if (mask === undefined || mask === null) return Permission.READ;
    // 数字类型直接作为位掩码
    if (typeof mask === 'number') return mask;
    if (typeof mask === 'string') {
        // "admin" → ADMIN
        if (MASK_TO_PERMISSION[mask] !== undefined) {
            return MASK_TO_PERMISSION[mask];
        }
        // "admin,webdav_read" → 复合
        const parts = mask.split(',').map(s => s.trim().toLowerCase());
        let perm: number = Permission.GUEST;
        for (const p of parts) {
            if (MASK_TO_PERMISSION[p] !== undefined) {
                perm |= MASK_TO_PERMISSION[p];
            }
        }
        // 至少给 READ 权限（非 guest）
        if (perm === Permission.GUEST && mask !== 'guest') {
            perm = Permission.READ;
        }
        return perm;
    }
    return Permission.READ;
}

/**
 * 检查用户是否拥有指定权限位
 */
export function hasPermission(user: any, requiredBit: number): boolean {
    const perm = resolvePermission(user);
    // admin 拥有所有权限
    if (perm & Permission.ADMIN) return true;
    return (perm & requiredBit) === requiredBit;
}

/**
 * 检查用户是否为管理员
 */
export function isAdmin(user: any): boolean {
    return hasPermission(user, Permission.ADMIN);
}

/**
 * 检查用户是否为游客
 */
export function isGuest(user: any): boolean {
    return resolvePermission(user) === Permission.GUEST;
}

// ============================================================
// 公开路由（无需认证）
// ============================================================
const PUBLIC_ROUTE_PREFIXES: string[] = [
    // 旧版路由（向后兼容）
    '/@users/login/',
    '/@users/create/',
    '/@setup/status/',
    '/@setup/init/',
    '/@oauth-token/authurl/',
    '/@oauth-token/callback/',
    '/@oauth-token/bind/',
    '/@oauth/enabled/',
    // 新版 GO 风格路由
    '/api/auth/login',
    '/api/auth/register',
    '/api/auth/sso',
    '/api/auth/sso_callback',
    '/api/auth/get_sso_id',
    '/api/auth/sso_get_token',
    '/api/authn/webauthn_begin_login',
    '/api/authn/webauthn_finish_login',
    '/api/public/',
    '/ping',
    '/api/system/health',
    '/favicon.ico',
    '/robots.txt',
    // 分享下载（无需登录）
    '/sd/',
    '/d/',
    '/sad/',
];

/**
 * 软认证路由（有 token 则解析用户，无 token 也放行）
 */
const SOFT_AUTH_ROUTE_PREFIXES: string[] = [
    '/@files/list/',
    '/@files/link/',
    '/@media/list/',
    '/@media/stats',
    '/@media/categories',
    '/api/fs/list',
    '/api/fs/get',
    '/api/fs/dirs',
    '/api/fs/other',
    '/api/fs/search',
    '/api/fs/archive/',
    '/dav/',
];

/** Guest 不可调用的修改型端点前缀（即使认证通过也拦截） */
const GUEST_FORBIDDEN_PREFIXES: string[] = [
    '/api/fs/mkdir',
    '/api/fs/rename',
    '/api/fs/move',
    '/api/fs/copy',
    '/api/fs/remove',
    '/api/fs/remove_empty_directory',
    '/api/fs/batch_rename',
    '/api/fs/regex_rename',
    '/api/fs/recursive_move',
    '/api/fs/link',
    '/api/fs/add_offline_download',
    '/api/fs/archive/decompress',
    '/api/fs/put',
    '/api/fs/form',
    '/api/fs/torrent/',
    '/api/share/create',
    '/api/share/update',
    '/api/share/delete',
];

function isPublicRoute(path: string): boolean {
    return PUBLIC_ROUTE_PREFIXES.some(prefix => path.startsWith(prefix));
}

function isSoftAuthRoute(path: string): boolean {
    return SOFT_AUTH_ROUTE_PREFIXES.some(prefix => path.startsWith(prefix));
}

function isGuestForbidden(path: string): boolean {
    return GUEST_FORBIDDEN_PREFIXES.some(prefix => path.startsWith(prefix));
}

// ============================================================
// 认证中间件
// ============================================================
export async function authMiddleware(c: Context, next: Next): Promise<any> {
    const path = c.req.path;
    const method = c.req.method;

    // OPTIONS 预检请求直接放行
    if (method === 'OPTIONS') {
        await next();
        return;
    }

    // 公开路由直接放行
    if (isPublicRoute(path)) {
        await next();
        return;
    }

    // 非 /@ 和 /api 路由（静态资源等）直接放行
    if (!path.startsWith('/@') && !path.startsWith('/api/') && !path.startsWith('/dav/')) {
        await next();
        return;
    }

    // 软认证路由：有 token 则解析，无 token 也放行
    if (isSoftAuthRoute(path)) {
        const authResult = await UsersManage.checkAuth(c);
        if (authResult.flag && authResult.data && authResult.data.length > 0) {
            c.set('user', authResult.data[0]);
        }
        await next();
        return;
    }

    // 强认证：验证 JWT Token
    const authResult = await UsersManage.checkAuth(c);
    if (!authResult.flag) {
        return unauthorized(c, authResult.text || 'common.unauthorized');
    }

    if (authResult.data && authResult.data.length > 0) {
        const user = authResult.data[0];
        // Guest 用户拦截写入操作
        if (isGuest(user) && isGuestForbidden(path)) {
            return forbidden(c, 'common.guest_no_write');
        }
        c.set('user', user);
    }
    await next();
}

// ============================================================
// 管理员权限中间件
// ============================================================
export async function adminMiddleware(c: Context, next: Next): Promise<any> {
    const user = c.get('user');
    if (!user) {
        return unauthorized(c);
    }
    if (!isAdmin(user)) {
        return forbidden(c, 'common.admin_required');
    }
    await next();
}

// ============================================================
// 高阶权限中间件工厂
// ============================================================

/**
 * 生成检查特定权限位的高阶中间件
 * 用法: app.use('/api/fs/write', permissionRequired(Permission.WRITE_OTHERS))
 */
export function permissionRequired(requiredBit: number) {
    return async function (c: Context, next: Next): Promise<any> {
        const user = c.get('user');
        if (!user) {
            return unauthorized(c);
        }
        if (!hasPermission(user, requiredBit)) {
            return forbidden(c, 'common.no_permission');
        }
        await next();
    };
}

/**
 * 非 Guest 中间件：禁止游客调用
 */
export function notGuestRequired() {
    return async function (c: Context, next: Next): Promise<any> {
        const user = c.get('user');
        if (!user) {
            return unauthorized(c);
        }
        if (isGuest(user)) {
            return forbidden(c, 'common.guest_forbidden');
        }
        await next();
    };
}

// ============================================================
// 限流中间件（基于内存 + KV 可选）
// ============================================================

interface RateLimitEntry {
    count: number;
    resetAt: number;
}

/** 内存限流存储（免费 Workers 下无需 KV） */
const memoryRateLimit = new Map<string, RateLimitEntry>();

/**
 * 基于 IP 的简单限流中间件
 * @param windowMs 时间窗口（毫秒）
 * @param maxRequests 最大请求数
 * @param keyPrefix KV/内存键前缀
 */
export function rateLimitMiddleware(windowMs: number, maxRequests: number, keyPrefix: string = 'rl') {
    return async function (c: Context, next: Next): Promise<any> {
        const ip = c.req.header('CF-Connecting-IP') ||
            c.req.header('X-Forwarded-For')?.split(',')[0]?.trim() ||
            'unknown';
        const key = `${keyPrefix}:${ip}`;

        const now = Date.now();
        let entry = memoryRateLimit.get(key);

        if (!entry || now > entry.resetAt) {
            entry = { count: 1, resetAt: now + windowMs };
            memoryRateLimit.set(key, entry);
        } else {
            entry.count++;
        }

        // 设置剩余请求次数 Header
        const remaining = Math.max(0, maxRequests - entry.count);
        c.header('X-RateLimit-Limit', String(maxRequests));
        c.header('X-RateLimit-Remaining', String(remaining));
        c.header('X-RateLimit-Reset', String(Math.ceil(entry.resetAt / 1000)));

        if (entry.count > maxRequests) {
            return c.json({ code: 429, message: 'common.too_many_requests', data: null }, 429);
        }

        await next();
    };
}

/** 登录接口专用限流：60 秒内最多 10 次 */
export function loginRateLimit() {
    return rateLimitMiddleware(60_000, 10, 'rl_login');
}

// ============================================================
// CORS 中间件
// 安全修复 SEC-05: 使用白名单而非反射任意 Origin，防止 CSRF
// ============================================================
export async function corsMiddleware(c: Context, next: Next): Promise<any> {
    const requestOrigin = c.req.header('Origin');

    let allowedOrigin: string | null = null;
    try {
        const { AdminManage } = await import('../admin/AdminManage');
        const adminManage = new AdminManage(c);
        const setting = await adminManage.select('cors_allowed_origins');
        const whitelist = setting.data?.[0]?.admin_data;

        if (whitelist && requestOrigin) {
            const allowed = whitelist.split(',').map((s: string) => s.trim());
            if (allowed.includes(requestOrigin)) {
                allowedOrigin = requestOrigin;
            }
        }
    } catch { /* 配置读取失败时保持拒绝跨域 */ }

    if (requestOrigin && !allowedOrigin) {
        return c.text('CORS origin denied', { status: 403 });
    }
    if (allowedOrigin) c.header('Access-Control-Allow-Origin', allowedOrigin);
    c.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PROPFIND, MKCOL, COPY, MOVE, LOCK, UNLOCK');
    c.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Depth, Destination, Overwrite, X-Token, File-Path, Password, As-Task, Content-Length, Content-Range');
    c.header('Access-Control-Max-Age', '86400');
    c.header('Vary', 'Origin');
    if (allowedOrigin !== '*') {
        c.header('Access-Control-Allow-Credentials', 'true');
    }
    if (c.req.method === 'OPTIONS') {
        if (!requestOrigin || !allowedOrigin) return c.text('CORS origin denied', { status: 403 });
        return c.body(null, 204);
    }
    await next();
}

// ============================================================
// 请求日志中间件（结构化输出）
// ============================================================
let _requestSeq = 0;
export async function loggerMiddleware(c: Context, next: Next): Promise<any> {
    const requestId = `req_${Date.now().toString(36)}_${(++_requestSeq).toString(36)}`;
    const start = Date.now();
    const method = c.req.method;
    const path = c.req.path;

    c.set('requestId', requestId);

    await next();

    const duration = Date.now() - start;
    const status = c.res.status;
    const user = c.get('user');
    const userId = user?.id || user?.username || '-';

    // 结构化日志（兼容 Cloudflare Logpush）
    console.log(JSON.stringify({
        request_id: requestId,
        user: userId,
        method,
        path,
        status,
        duration_ms: duration,
        ts: new Date().toISOString(),
    }));
}

// ============================================================
// 全局错误处理中间件
// ============================================================
export async function errorMiddleware(c: Context, next: Next): Promise<any> {
    try {
        await next();
    } catch (error: any) {
        const requestId = c.get('requestId') || 'unknown';
        const stack = error?.stack || '';
        console.error(JSON.stringify({
            request_id: requestId,
            error: error?.message || 'UnknownError',
            stack: stack.split('\n').slice(0, 5).join(' | '),
            ts: new Date().toISOString(),
        }));
        return c.json({
            code: 500,
            message: 'common.internal_error',
            data: { request_id: requestId },
        }, 500);
    }
}
