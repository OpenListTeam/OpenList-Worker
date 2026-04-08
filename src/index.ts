/**
 * OpenList-TSWorker 应用入口
 *
 * 架构分层：
 *   用户层(认证/路由) → 系统层(业务逻辑/Manage模块) → 存储层(网盘驱动)
 *
 * 遵循 docs/系统代码架构 的三层设计
 */
import { Hono } from 'hono';
import type { Context, Next } from 'hono';

// ========================================================================
// 中间件
// ========================================================================
import {
    authMiddleware,
    corsMiddleware,
    loggerMiddleware,
    errorMiddleware,
} from './route';

// ========================================================================
// 旧版路由模块（/@* 风格）— 已停用，注释保留以备回滚
// ========================================================================
// import { mountRoutes } from './routes/mount';
// import { usersRoutes } from './routes/users';
// import { filesRoutes } from './routes/files';
// import { shareRoutes } from './routes/share';
// import { groupRoutes } from './routes/group';
// import { matesRoutes } from './routes/mates';
// import { cryptRoutes } from './routes/crypt';
// import { tasksRoutes } from './routes/tasks';
// import { tokenRoutes } from './routes/token';
// import { fetchRoutes } from './routes/fetch';
// import { oauthRoutes } from './routes/oauth';
// import { oauthTokenRoutes } from './routes/oauthToken';
// import { adminRoutes } from './routes/admin';
// import { mediaRoutes } from './routes/media';

// ========================================================================
// 新版路由模块（/api/* 风格，与 GO 后端对齐）
// ========================================================================
import { authRoutes } from './route/auth';
import { fsReadRoutes } from './route/fsRead';
import { fsWriteRoutes } from './route/fsWrite';
import { fsUploadDownloadRoutes } from './route/fsUpload';
import { sharingRoutes } from './route/sharing';
import { taskRoutes } from './route/taskApi';
import { adminApiRoutes } from './route/adminApi';
import { setupRoutes } from './route/setup';

// ========================================================================
// WebDAV
// ========================================================================
import { webdavRoutes } from './route/webdav';

// ========================================================================
// 类型定义
// ========================================================================
export type Bindings = {
    KV_DATA: any;
    D1_DATA: any;
    ENABLE_D1: boolean;
    REMOTE_D1: string;
    ASSETS: any;
};

// ========================================================================
// 创建应用实例
// ========================================================================
export const app = new Hono<{ Bindings: Bindings }>();

// ========================================================================
// 全局中间件注册（按顺序执行）
// ========================================================================

// 1. 错误处理 — 捕获所有未处理异常
app.use('*', errorMiddleware);

// 2. CORS处理 — 跨域请求支持
app.use('*', corsMiddleware);

// 3. 请求日志 — 开发环境下记录请求信息
app.use('*', loggerMiddleware);

// 4. 认证中间件 — /api/* 路由（公开路由在中间件内部豁免）
app.use('/api/*', authMiddleware);

// 旧版 /@* 认证中间件已停用
// app.use('/@*', authMiddleware);

// ========================================================================
// 新版路由（/api/* 风格，与 GO 后端对齐）
// ========================================================================

// --- 认证 ---
authRoutes(app);           // POST /api/auth/login, /api/auth/login/hash, GET /api/auth/logout
                           // POST /api/auth/2fa/generate, /api/auth/2fa/verify
                           // GET /api/me, POST /api/me/update

// --- 文件系统（读） ---
fsReadRoutes(app);         // POST /api/fs/list, /api/fs/get, /api/fs/search, /api/fs/other
                           // GET  /api/fs/dirs

// --- 文件系统（写） ---
fsWriteRoutes(app);        // POST /api/fs/mkdir, /api/fs/rename, /api/fs/move, /api/fs/copy
                           // POST /api/fs/remove, /api/fs/remove_empty_directory
                           // POST /api/fs/link, /api/fs/add_offline_download, /api/fs/batch_rename

// --- 文件上传与直接下载 ---
fsUploadDownloadRoutes(app); // PUT /api/fs/put, /api/fs/form
                              // GET /d/*, /p/*（直接下载/代理下载）

// --- 分享 ---
sharingRoutes(app);        // GET/POST /api/share/list|get|create|update|delete|enable|disable
                           // GET /sd/:sid/*（分享文件下载）

// --- 任务管理 ---
taskRoutes(app);           // GET/POST /api/task/:type/undone|done|cancel|delete|retry|...

// --- 管理员 & 公开设置 ---
adminApiRoutes(app);       // GET /api/public/settings, GET /ping
                           // /api/admin/user/*, /api/admin/storage/*, /api/admin/driver/*
                           // /api/admin/setting/*, /api/admin/meta/*

// --- 系统初始化 ---
setupRoutes(app);          // GET /@setup/status/none, POST /@setup/init/none（公开）
                           // GET /@setup/info/none（需认证）

// ========================================================================
// 旧版路由（/@* 风格）— 已停用，注释保留以备回滚
// ========================================================================
// mountRoutes(app);       // /@mount
// usersRoutes(app);       // /@users
// groupRoutes(app);       // /@group
// filesRoutes(app);       // /@files
// mediaRoutes(app);       // /@media
// cryptRoutes(app);       // /@crypt
// matesRoutes(app);       // /@mates
// shareRoutes(app);       // /@share
// tasksRoutes(app);       // /@tasks
// fetchRoutes(app);       // /@fetch
// tokenRoutes(app);       // /@token
// oauthRoutes(app);       // /@oauth
// oauthTokenRoutes(app);  // /@oauth-token
// adminRoutes(app);       // /@admin

// ========================================================================
// WebDAV（Basic Auth 认证，不走 JWT 中间件）
// ========================================================================
webdavRoutes(app);         // /dav/*

// ========================================================================
// 静态资源 & SPA 回退（必须放在所有 API 路由之后）
//
// 部署到 Cloudflare Workers + Assets 时的处理逻辑：
//   1. 请求路径命中 public/ 目录中的真实文件 → 直接由 ASSETS 服务返回
//   2. 请求路径未命中（前端 SPA 路由，如 /files、/login 等）→ 返回 index.html
//      让 React Router 在客户端接管路由
//
// 注意：/api/*、/dav/*、/d/*、/p/*、/@setup/* 等后端路由已在上方注册，
//       不会落入此处的通配符处理器。
// ========================================================================
app.get('*', async (c: Context) => {
    // 仅在 Cloudflare Workers 环境（存在 ASSETS 绑定）时启用静态资源服务
    if (!c.env?.ASSETS) {
        return c.text('Not Found', 404);
    }

    const url = new URL(c.req.url);

    // 1. 先尝试获取与请求路径完全匹配的静态文件
    try {
        const assetResp = await c.env.ASSETS.fetch(c.req.raw);
        if (assetResp.status !== 404) {
            return assetResp;
        }
    } catch {
        // ASSETS.fetch 抛出异常时继续走 SPA 回退
    }

    // 2. 静态文件不存在 → 返回 index.html，交由前端 React Router 处理
    //    将请求路径重写为根路径以获取 index.html
    try {
        const indexUrl = new URL('/', url.origin);
        const indexResp = await c.env.ASSETS.fetch(new Request(indexUrl.toString(), c.req.raw));
        // 克隆响应并强制设置正确的 Content-Type
        return new Response(indexResp.body, {
            status: 200,
            headers: {
                'Content-Type': 'text/html; charset=utf-8',
                'Cache-Control': 'no-cache, no-store, must-revalidate',
            },
        });
    } catch {
        return c.text('Service Unavailable', 503);
    }
});

// ========================================================================
// 默认导出
// ========================================================================
export default app;