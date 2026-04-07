/**
 * WebDAV 路由 — /dav/*
 * 
 * 提供标准 WebDAV 协议访问，支持 HTTP Basic Auth 认证。
 * 客户端可通过 Windows 资源管理器、macOS Finder、Cyberduck 等工具连接。
 * 
 * 连接地址：http(s)://<host>/dav/
 */
import type { Hono, Context } from 'hono';
import { WebDAVHandler } from '../webdav/WebDAVHandler';
import { UsersManage } from '../users/UsersManage';

/**
 * HTTP Basic Auth 认证
 * WebDAV 客户端通常使用 Basic Auth 而非 JWT
 */
async function basicAuth(c: Context): Promise<boolean> {
    const authHeader = c.req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Basic ')) {
        return false;
    }

    try {
        const base64 = authHeader.substring(6);
        const decoded = atob(base64);
        const colonIndex = decoded.indexOf(':');
        if (colonIndex < 0) return false;

        const username = decoded.substring(0, colonIndex);
        const password = decoded.substring(colonIndex + 1);

        // 使用系统用户管理验证
        const users = new UsersManage(c);
        const result = await users.log_in({
            users_name: username,
            users_pass: password,
        });

        if (result.flag && result.data) {
            // 将用户信息存入上下文
            c.set('user', result.data);
            return true;
        }
        return false;
    } catch (error) {
        console.error('WebDAV Basic Auth error:', error);
        return false;
    }
}

/**
 * 返回 401 要求认证
 */
function unauthorizedResponse(): Response {
    return new Response('Unauthorized', {
        status: 401,
        headers: {
            'WWW-Authenticate': 'Basic realm="OpenList WebDAV"',
            'Content-Type': 'text/plain',
        },
    });
}

export function webdavRoutes(app: Hono<any>) {
    // WebDAV 路由 — 处理所有 /dav/* 请求
    app.all('/dav/*', async (c: Context): Promise<any> => {
        const method = c.req.method.toUpperCase();

        // OPTIONS 不需要认证（用于客户端探测）
        if (method === 'OPTIONS') {
            const handler = new WebDAVHandler(c);
            return handler.handleOptions();
        }

        // 其他方法需要 Basic Auth 认证
        const authenticated = await basicAuth(c);
        if (!authenticated) {
            return unauthorizedResponse();
        }

        // 检查用户是否有 DAV 权限
        const user = c.get('user');
        if (user && user.users_mask) {
            // 检查用户权限中是否包含 DAV 权限
            // users_mask 格式参考：CURD/DAV/FTP/管理/..
            const mask = typeof user.users_mask === 'string' ? user.users_mask : '';
            // 管理员始终有权限；普通用户需要检查 DAV 权限位
            const isAdmin = mask.includes('admin') || mask === '1' || user.users_name === 'admin';
            if (!isAdmin) {
                // 检查分组权限中是否允许 DAV
                // 简化处理：登录用户默认允许 DAV 访问
                // TODO: 精细化 DAV 权限控制
            }
        }

        const handler = new WebDAVHandler(c);

        switch (method) {
            case 'PROPFIND':
                return handler.handlePropfind();
            case 'GET':
                return handler.handleGet();
            case 'HEAD':
                return handler.handleHead();
            case 'PUT':
                return handler.handlePut();
            case 'DELETE':
                return handler.handleDelete();
            case 'MKCOL':
                return handler.handleMkcol();
            case 'MOVE':
                return handler.handleMove();
            case 'COPY':
                return handler.handleCopy();
            default:
                return new Response('Method Not Allowed', {
                    status: 405,
                    headers: {
                        'Allow': 'OPTIONS, GET, HEAD, PUT, DELETE, PROPFIND, MKCOL, MOVE, COPY',
                    },
                });
        }
    });

    // 根路径 /dav 重定向到 /dav/
    app.all('/dav', async (c: Context): Promise<any> => {
        const url = new URL(c.req.url);
        return Response.redirect(`${url.origin}/dav/`, 301);
    });
}
