/**
 * 认证中间件 — 统一的JWT验证和权限检查
 * 用于保护需要登录的API路由
 */
import type { Context, Next } from 'hono';
import { UsersManage } from '../users/UsersManage';

/**
 * 公开路由列表 — 不需要认证的路由
 */
const PUBLIC_ROUTES: Array<{ path: string; method?: string }> = [
    { path: '/@users/login/none', method: 'POST' },
    { path: '/@users/create/none', method: 'POST' },
    { path: '/@mount/select/none', method: 'GET' },
    { path: '/@mount/driver/none', method: 'GET' },
    { path: '/@setup/status/none', method: 'GET' },
    { path: '/@setup/init/none', method: 'POST' },
    { path: '/@oauth-token/authurl/', method: 'POST' },
    { path: '/@oauth-token/callback/', method: 'POST' },
    { path: '/@oauth-token/bind/', method: 'POST' },
    { path: '/@oauth/enabled/none', method: 'GET' },
    { path: '/@system/info/none', method: 'GET' },
];

/**
 * 软认证路由列表 — 不强制要求登录，但如果有token则解析用户信息
 * 用于文件管理等公开访问但需要区分权限的路由
 */
const SOFT_AUTH_ROUTES: Array<{ path: string; method?: string }> = [
    { path: '/@files/list/' },
    { path: '/@files/link/' },
    { path: '/@media/list/' },
    { path: '/@media/stats' },
    { path: '/@media/categories' },
];

/**
 * 检查是否为软认证路由
 */
function isSoftAuthRoute(path: string, method: string): boolean {
    return SOFT_AUTH_ROUTES.some(route => {
        const pathMatch = path.startsWith(route.path);
        const methodMatch = !route.method || route.method === method;
        return pathMatch && methodMatch;
    });
}

/**
 * 检查是否为公开路由
 */
function isPublicRoute(path: string, method: string): boolean {
    return PUBLIC_ROUTES.some(route => {
        const pathMatch = path.startsWith(route.path);
        const methodMatch = !route.method || route.method === method;
        return pathMatch && methodMatch;
    });
}

/**
 * 认证中间件 — 验证JWT Token
 * 对于需要登录的路由，检查Authorization header中的Bearer Token
 */
export async function authMiddleware(c: Context, next: Next): Promise<any> {
    const path = c.req.path;
    const method = c.req.method;

    // 公开路由跳过认证
    if (isPublicRoute(path, method)) {
        await next();
        return;
    }

    // OPTIONS请求跳过认证(CORS预检)
    if (method === 'OPTIONS') {
        await next();
        return;
    }

    // 静态资源跳过认证
    if (!path.startsWith('/@')) {
        await next();
        return;
    }

    // 软认证路由：尝试解析token但不强制要求
    if (isSoftAuthRoute(path, method)) {
        const authResult = await UsersManage.checkAuth(c);
        if (authResult.flag) {
            // 有有效token，存储用户信息
            c.set('user', authResult.data);
        }
        // 无论是否登录都继续处理
        await next();
        return;
    }

    // 验证JWT Token
    const authResult = await UsersManage.checkAuth(c);
    if (!authResult.flag) {
        return c.json({
            flag: false,
            text: authResult.text || '未登录或Token已过期',
            code: 401
        }, 401);
    }

    // 将用户信息存储到上下文中供后续使用
    c.set('user', authResult.data);
    await next();
}

/**
 * 管理员权限中间件 — 检查是否为管理员
 * 用于保护系统管理类接口
 */
export async function adminMiddleware(c: Context, next: Next): Promise<any> {
    const user = c.get('user');
    if (!user || !user.users_mask || !user.users_mask.includes('admin')) {
        return c.json({
            flag: false,
            text: '需要管理员权限',
            code: 403
        }, 403);
    }
    await next();
}

/**
 * CORS中间件 — 处理跨域请求
 */
export async function corsMiddleware(c: Context, next: Next): Promise<any> {
    // TODO: 生产环境应从配置中读取允许的域名
    c.header('Access-Control-Allow-Origin', '*');
    c.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    c.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    c.header('Access-Control-Allow-Credentials', 'true');

    if (c.req.method === 'OPTIONS') {
        return c.text('', 200);
    }

    await next();
}

/**
 * 请求日志中间件 — 记录请求信息（仅开发环境）
 */
export async function loggerMiddleware(c: Context, next: Next): Promise<any> {
    const start = Date.now();
    const method = c.req.method;
    const path = c.req.path;

    await next();

    const duration = Date.now() - start;
    // 仅在开发模式下输出日志，避免生产环境敏感信息泄露
    if (process.env.NODE_ENV !== 'production') {
        console.log(`[${method}] ${path} — ${duration}ms`);
    }
}

/**
 * 错误处理中间件 — 全局异常捕获
 */
export async function errorMiddleware(c: Context, next: Next): Promise<any> {
    try {
        await next();
    } catch (error: any) {
        console.error('[Error]', error.message || error);
        return c.json({
            flag: false,
            text: error.message || '服务器内部错误',
            code: 500
        }, 500);
    }
}
