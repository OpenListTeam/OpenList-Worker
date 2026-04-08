/**
 * 全局中间件
 * 认证、CORS、日志、错误处理
 */
import type { Context, Next } from 'hono';
import { UsersManage } from '../users/UsersManage';
import { errorResp } from '../types/HttpResponse';

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
    '/api/auth/sso',
    '/api/auth/sso_callback',
    '/api/auth/get_sso_id',
    '/api/auth/sso_get_token',
    '/api/authn/webauthn_begin_login',
    '/api/authn/webauthn_finish_login',
    '/api/public/',
    '/ping',
    '/favicon.ico',
    '/robots.txt',
    // 分享下载（无需登录）
    '/sd/',
    '/d/',
    '/p/',
    '/ad/',
    '/ap/',
    '/ae/',
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

function isPublicRoute(path: string): boolean {
    return PUBLIC_ROUTE_PREFIXES.some(prefix => path.startsWith(prefix));
}

function isSoftAuthRoute(path: string): boolean {
    return SOFT_AUTH_ROUTE_PREFIXES.some(prefix => path.startsWith(prefix));
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
        return errorResp(c, authResult.text || '未登录或 Token 已过期', 401);
    }

    if (authResult.data && authResult.data.length > 0) {
        c.set('user', authResult.data[0]);
    }
    await next();
}

// ============================================================
// 管理员权限中间件
// ============================================================
export async function adminMiddleware(c: Context, next: Next): Promise<any> {
    const user = c.get('user');
    if (!user) {
        return errorResp(c, '未登录', 401);
    }
    const isAdmin = user.users_mask === 'admin' ||
        (typeof user.users_mask === 'string' && user.users_mask.includes('admin')) ||
        user.users_name === 'admin';
    if (!isAdmin) {
        return errorResp(c, '需要管理员权限', 403);
    }
    await next();
}

// ============================================================
// CORS 中间件
// ============================================================
export async function corsMiddleware(c: Context, next: Next): Promise<any> {
    const origin = c.req.header('Origin') || '*';

    c.header('Access-Control-Allow-Origin', origin);
    c.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PROPFIND, MKCOL, COPY, MOVE, LOCK, UNLOCK');
    c.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Depth, Destination, Overwrite, X-Token, File-Path, Password, As-Task, Content-Length, Content-Range');
    c.header('Access-Control-Allow-Credentials', 'true');
    c.header('Access-Control-Max-Age', '86400');
    c.header('Vary', 'Origin');

    if (c.req.method === 'OPTIONS') {
        return c.text('');
    }

    await next();
}

// ============================================================
// 请求日志中间件
// ============================================================
export async function loggerMiddleware(c: Context, next: Next): Promise<any> {
    const start = Date.now();
    const method = c.req.method;
    const path = c.req.path;

    await next();

    const duration = Date.now() - start;
    const status = c.res.status;
    if (typeof process !== 'undefined' && process.env?.NODE_ENV !== 'production') {
        console.log(`[${method}] ${path} ${status} — ${duration}ms`);
    }
}

// ============================================================
// 全局错误处理中间件
// ============================================================
export async function errorMiddleware(c: Context, next: Next): Promise<any> {
    try {
        await next();
    } catch (error: any) {
        console.error('[Unhandled Error]', error?.message || error);
        return c.json({ code: 500, message: error?.message || '服务器内部错误' }, 500);
    }
}
