/**
 * WebDAV 路由 — /dav/*
 *
 * 提供标准 WebDAV 协议访问，支持 HTTP Basic Auth 认证。
 * 客户端可通过 Windows 资源管理器、macOS Finder、Cyberduck 等工具连接。
 *
 * 连接地址：http(s)://<host>/dav/
 */
import type { Hono, Context } from 'hono';
import { WebDAVHandler } from '../davfs/WebDAVHandler';
import { UsersManage } from '../users/UsersManage';

// ============================================================
// HTTP Basic Auth 认证
// WebDAV 客户端通常使用 Basic Auth 而非 JWT
// 密码处理与 GO 后端一致：明文密码先 SHA256 哈希再验证
// ============================================================
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

        // 使用 log_in（明文密码，内部 SHA256 哈希）与 GO 后端对齐
        const users = new UsersManage(c);
        const result = await users.log_in({
            users_name: username,
            users_pass: password,
        });

        if (result.flag && result.data && result.data.length > 0) {
            c.set('user', result.data[0]);
            return true;
        }
        return false;
    } catch (error) {
        console.error('WebDAV Basic Auth error:', error);
        return false;
    }
}

function unauthorizedResponse(): Response {
    return new Response('Unauthorized', {
        status: 401,
        headers: {
            'WWW-Authenticate': 'Basic realm="OpenList WebDAV"',
            'Content-Type': 'text/plain',
        },
    });
}

// ============================================================
// 路由注册
// ============================================================
export function webdavRoutes(app: Hono<any>) {

    // 根路径 /dav 重定向到 /dav/
    app.all('/dav', async (c: Context): Promise<any> => {
        const url = new URL(c.req.url);
        return Response.redirect(`${url.origin}/dav/`, 301);
    });

    // WebDAV 路由 — 处理所有 /dav/* 请求
    app.all('/dav/*', async (c: Context): Promise<any> => {
        const method = c.req.method.toUpperCase();

        // OPTIONS 不需要认证（用于客户端探测）
        if (method === 'OPTIONS') {
            return new Response(null, {
                status: 200,
                headers: {
                    'Allow': 'OPTIONS, GET, HEAD, PUT, DELETE, PROPFIND, MKCOL, MOVE, COPY, LOCK, UNLOCK',
                    'DAV': '1, 2',
                    'MS-Author-Via': 'DAV',
                    'Content-Length': '0',
                },
            });
        }

        // 其他方法需要 Basic Auth 认证
        const authenticated = await basicAuth(c);
        if (!authenticated) {
            return unauthorizedResponse();
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
            case 'LOCK':
                // 简单 LOCK 响应（部分客户端需要）
                return new Response(
                    `<?xml version="1.0" encoding="utf-8"?>
<D:prop xmlns:D="DAV:">
  <D:lockdiscovery>
    <D:activelock>
      <D:locktype><D:write/></D:locktype>
      <D:lockscope><D:exclusive/></D:lockscope>
      <D:depth>0</D:depth>
      <D:timeout>Second-3600</D:timeout>
      <D:locktoken><D:href>opaquelocktoken:openlist-lock</D:href></D:locktoken>
    </D:activelock>
  </D:lockdiscovery>
</D:prop>`,
                    {
                        status: 200,
                        headers: {
                            'Content-Type': 'application/xml; charset=utf-8',
                            'Lock-Token': '<opaquelocktoken:openlist-lock>',
                        },
                    }
                );
            case 'UNLOCK':
                return new Response(null, { status: 204 });
            default:
                return new Response('Method Not Allowed', {
                    status: 405,
                    headers: {
                        'Allow': 'OPTIONS, GET, HEAD, PUT, DELETE, PROPFIND, MKCOL, MOVE, COPY, LOCK, UNLOCK',
                    },
                });
        }
    });
}