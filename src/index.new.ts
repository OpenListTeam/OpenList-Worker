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
} from './middleware';

// ========================================================================
// 路由模块 (用户层 — API路由)
// ========================================================================
import { mountRoutes } from './routes/mount';
import { usersRoutes } from './routes/users';
import { filesRoutes } from './routes/files';
import { shareRoutes } from './routes/share';
import { groupRoutes } from './routes/group';
import { matesRoutes } from './routes/mates';
import { cryptRoutes } from './routes/crypt';
import { tasksRoutes } from './routes/tasks';
import { tokenRoutes } from './routes/token';
import { fetchRoutes } from './routes/fetch';
import { oauthRoutes } from './routes/oauth';
import { oauthTokenRoutes } from './routes/oauthToken';
import { adminRoutes } from './routes/admin';
import { setupRoutes } from './routes/setup';

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

// 4. 认证中间件 — 仅对/@开头的API路由进行JWT验证
app.use('/@*', authMiddleware);

// ========================================================================
// 注册路由模块 (按 docs/系统结构设置 的菜单分组)
// ========================================================================

// --- 存储管理 ---
mountRoutes(app);      // /@mount — 挂载管理

// --- 用户管理 ---
usersRoutes(app);      // /@users — 用户管理
groupRoutes(app);      // /@group — 分组权限

// --- 文件操作 ---
filesRoutes(app);      // /@files — 文件操作

// --- 安全管理 ---
cryptRoutes(app);      // /@crypt — 加密配置
matesRoutes(app);      // /@mates — 路径配置(元数据/权限)

// --- 分享管理 ---
shareRoutes(app);      // /@share — 分享管理

// --- 任务管理 ---
tasksRoutes(app);      // /@tasks — 任务管理
fetchRoutes(app);      // /@fetch — 离线下载

// --- 连接管理 ---
tokenRoutes(app);      // /@token — 连接令牌

// --- 认证管理 ---
oauthRoutes(app);      // /@oauth — OAuth认证
oauthTokenRoutes(app); // /@oauth-token — OAuth令牌

// --- 系统管理 ---
adminRoutes(app);      // /@admin — 系统管理
setupRoutes(app);      // /@setup — 系统初始化

// ========================================================================
// 默认导出
// ========================================================================
export default app;