import {Context, Hono, Next} from 'hono'
import {MountManage} from "./mount/MountManage";
import {D1Database, KVNamespace} from "@cloudflare/workers-types";
import {getConfig} from "./types/HonoParsers";
import {UsersManage} from "./users/UsersManage";
import {UsersResult, UsersConfig} from "./users/UsersObject";
import {FilesManage} from "./files/FilesManage";
import {FetchManage} from "./fetch/FetchManage";
import {FetchResult, FetchConfig} from "./fetch/FetchObject";
import {GroupManage} from "./group/GroupManage";
import {GroupResult, GroupConfig} from "./group/GroupObject";
import {MatesManage} from "./mates/MatesManage";
import {MatesResult, MatesConfig} from "./mates/MatesObject";
import {CryptManage} from "./crypt/CryptManage";
import {CryptInfo} from "./crypt/CryptObject";
import {ShareManage} from "./share/ShareManage";
import {ShareConfig} from "./share/ShareObject";
import {OauthManage} from "./oauth/OauthManage";
import {OauthConfig} from "./oauth/OauthObject";
import {TokenManage} from "./oauth/TokenManage";
import {TasksManage} from "./tasks/TasksManage";
import {TasksResult, TasksConfig} from "./tasks/TasksObject";
import {TokenManage} from "./token/TokenManage";
import {TokenResult, TokenConfig} from "./token/TokenObject";
import {SystemManage} from "./setup/SystemManage";
import {SystemResult, SystemConfig} from "./setup/SystemObject";



// 绑定数据 ###############################################################################
export type Bindings = {
    KV_DATA: KVNamespace, D1_DATA: D1Database, ENABLE_D1: boolean, REMOTE_D1: string
}
export const app = new Hono<{ Bindings: Bindings }>()

// 跨域处理 ##############################################################################
app.use('*', async (c: any, next: Next): Promise<any> => {
    // 设置 CORS 头 =============================================================
    c.header('Access-Control-Allow-Origin', '*')
    c.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    c.header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    c.header('Access-Control-Allow-Credentials', 'true')
    // 处理预检请求 =============================================================
    if (c.req.method === 'OPTIONS') return c.text('', 200)
    await next()
})

// 挂载管理 ##############################################################################
app.use('/@mount/:action/:method/*', async (c: Context): Promise<any> => {
    const action: string = c.req.param('action');
    const method: string = c.req.param('method');
    const config: Record<string, any> = await getConfig(c, 'config');

    // 权限检查 - 除了select和driver操作外都需要登录 =======================================
    if (action !== 'select' && action !== 'driver') {
        const authResult = await UsersManage.checkAuth(c);
        if (!authResult.flag) {
            return c.json(authResult, 401);
        }
    }
    console.log("@mount", action, method, config)
    // 创建对象 ==========================================================================
    let mounts: MountManage = new MountManage(c);
    // 检查方法 ==========================================================================
    switch (method) {
        case "path": { // 筛选路径 =======================================================
            config.mount_path = "/" + c.req.path.split('/').slice(4).join('/');
            break;
        }
        case "uuid": { // 筛选编号 =======================================================
            const result: MountResult = await mounts.select();
            if (!result.data) return c.json({
                flag: false, text: 'No UUID Matched'
            }, 400)
            break;
        }
        case "none": { // 不筛选 =========================================================
            break;
        }
        default: { // 默认应输出错误 =====================================================
            return c.json({flag: false, text: 'Invalid Method'}, 400)
        }
    }
    // 检查参数 ==========================================================================
    if (!config.mount_path && action != "select" && action != "driver")
        return c.json({flag: false, text: 'Invalid Path'}, 400)
    // 执行操作 ==========================================================================
    switch (action) {
        case "select": { // 查找挂载 =====================================================
            const result: MountResult = await mounts.select();
            return c.json(result, result.flag ? 200 : 400)
        }
        case "create": { // 创建挂载 =====================================================
            console.log("@mount", action, method, config)
            if (!config.mount_path || !config.mount_type || !config.drive_conf)
                return c.json({flag: false, text: 'Invalid Param Request'}, 400)
            let result: MountResult = await mounts.create(config as MountConfig);
            return c.json(result, result.flag ? 200 : 400)
        }
        case "remove": { // 删除挂载 =====================================================
            let result: MountResult = await mounts.remove(config.mount_path);
            return c.json(result, result.flag ? 200 : 400)
        }
        case "config": { // 配置挂载 =====================================================
            let result: MountResult = await mounts.config(config as MountConfig);
            return c.json(result, result.flag ? 200 : 400)
        }
        case "driver": { // 获取驱动列表和配置 =====================================================
            let result: MountResult = await mounts.driver();
            return c.json(result, result.flag ? 200 : 400)
        }
        case "reload": { // 载入挂载 =====================================================
            let result: MountResult = await mounts.reload(config.mount_path);
            return c.json(result, result.flag ? 200 : 400)
        }
        default: { // 默认应输出错误 =====================================================
            return c.json({flag: false, text: 'Invalid Action'}, 400)
        }
    }
})

// 任务管理 ##############################################################################
app.use('/@tasks/:action/:method/*', async (c: Context): Promise<any> => {
    const action: string = c.req.param('action');
    const method: string = c.req.param('method');
    const source: string = "/" + (c.req.param('source') || "");
    const config: Record<string, any> = await getConfig(c, 'config');
    
    // 权限检查 - 所有任务管理操作都需要登录 =======================================
    const authResult = await UsersManage.checkAuth(c);
    if (!authResult.flag) {
        return c.json(authResult, 401);
    }
    
    // 创建对象 ==========================================================================
    let tasks: TasksManage = new TasksManage(c);
    
    // 检查方法 ==========================================================================
    switch (method) {
        case "uuid": { // 筛选UUID =======================================================
            const result: TasksResult = await tasks.select(source);
            if (!result.data || result.data.length === 0) return c.json({
                flag: false, text: 'No UUID Matched'
            }, 400)
            break;
        }
        case "none": { // 不筛选 =========================================================
            break;
        }
        default: { // 默认应输出错误 =====================================================
            return c.json({flag: false, text: 'Invalid Method'}, 400)
        }
    }
    
    console.log("@tasks", action, method, config)
    
    // 执行操作 ==========================================================================
    switch (action) {
        case "select": { // 查找任务 ===================================
            const result: TasksResult = await tasks.select();
            return c.json(result, result.flag ? 200 : 400)
        }
        case "create": { // 创建任务 ===================================
            if (!config.tasks_type || !config.tasks_user || !config.tasks_info) {
                return c.json({flag: false, text: 'Invalid Param Request'}, 400)
            }
            const tasksData: TasksConfig = {
                tasks_uuid: config.tasks_uuid || "",
                tasks_type: config.tasks_type,
                tasks_user: config.tasks_user,
                tasks_info: config.tasks_info,
                tasks_flag: config.tasks_flag || 0
            };
            let result: TasksResult = await tasks.create(tasksData);
            return c.json(result, result.flag ? 200 : 400)
        }
        case "remove": { // 删除任务 ===================================
            if (!config.tasks_uuid) {
                return c.json({flag: false, text: 'Invalid UUID'}, 400)
            }
            let result: TasksResult = await tasks.remove(config.tasks_uuid);
            return c.json(result, result.flag ? 200 : 400)
        }
        case "config": { // 配置任务 ===================================
            let result: TasksResult = await tasks.config(config as TasksConfig);
            return c.json(result, result.flag ? 200 : 400)
        }
        case "status": { // 更新任务状态 ===================================
            if (!config.tasks_uuid || config.tasks_flag === undefined) {
                return c.json({flag: false, text: 'Invalid Param Request'}, 400)
            }
            let result: TasksResult = await tasks.updateStatus(config.tasks_uuid, config.tasks_flag);
            return c.json(result, result.flag ? 200 : 400)
        }
        case "user": { // 根据用户获取任务 ===================================
            if (!config.tasks_user) {
                return c.json({flag: false, text: 'Invalid User'}, 400)
            }
            let result: TasksResult = await tasks.getByUser(config.tasks_user);
            return c.json(result, result.flag ? 200 : 400)
        }
        case "byStatus": { // 根据状态获取任务 ===================================
            if (config.tasks_flag === undefined) {
                return c.json({flag: false, text: 'Invalid Status'}, 400)
            }
            let result: TasksResult = await tasks.getByStatus(config.tasks_flag);
            return c.json(result, result.flag ? 200 : 400)
        }
        default: { // 默认应输出错误 ===================================
            return c.json({flag: false, text: 'Invalid Action'}, 400)
        }
    }
})

// 连接令牌管理 ##############################################################################
app.use('/@token/:action/:method/*', async (c: Context): Promise<any> => {
    const action: string = c.req.param('action');
    const method: string = c.req.param('method');
    const source: string = "/" + (c.req.param('source') || "");
    const config: Record<string, any> = await getConfig(c, 'config');
    
    // 权限检查 - 所有令牌管理操作都需要登录 =======================================
    const authResult = await UsersManage.checkAuth(c);
    if (!authResult.flag) {
        return c.json(authResult, 401);
    }
    
    // 创建对象 ==========================================================================
    let tokens: TokenManage = new TokenManage(c);
    
    // 检查方法 ==========================================================================
    switch (method) {
        case "uuid": { // 筛选UUID =======================================================
            const result: TokenResult = await tokens.select(source);
            if (!result.data || result.data.length === 0) return c.json({
                flag: false, text: 'No UUID Matched'
            }, 400)
            break;
        }
        case "none": { // 不筛选 =========================================================
            break;
        }
        default: { // 默认应输出错误 =====================================================
            return c.json({flag: false, text: 'Invalid Method'}, 400)
        }
    }
    
    console.log("@token", action, method, config)
    
    // 执行操作 ==========================================================================
    switch (action) {
        case "select": { // 查找令牌 ===================================
            const result: TokenResult = await tokens.select();
            return c.json(result, result.flag ? 200 : 400)
        }
        case "create": { // 创建令牌 ===================================
            if (!config.token_name || !config.token_user) {
                return c.json({flag: false, text: 'Invalid Param Request'}, 400)
            }
            const tokenData: TokenConfig = {
                token_uuid: config.token_uuid || "",
                token_name: config.token_name,
                token_data: config.token_data,
                token_user: config.token_user,
                token_ends: config.token_ends,
                is_enabled: config.is_enabled ?? 1
            };
            let result: TokenResult = await tokens.create(tokenData);
            return c.json(result, result.flag ? 200 : 400)
        }
        case "remove": { // 删除令牌 ===================================
            if (!config.token_uuid) {
                return c.json({flag: false, text: 'Invalid UUID'}, 400)
            }
            let result: TokenResult = await tokens.remove(config.token_uuid);
            return c.json(result, result.flag ? 200 : 400)
        }
        case "config": { // 配置令牌 ===================================
            let result: TokenResult = await tokens.config(config as TokenConfig);
            return c.json(result, result.flag ? 200 : 400)
        }
        case "status": { // 切换令牌状态 ===================================
            if (!config.token_uuid || config.is_enabled === undefined) {
                return c.json({flag: false, text: 'Invalid Param Request'}, 400)
            }
            let result: TokenResult = await tokens.toggleStatus(config.token_uuid, config.is_enabled);
            return c.json(result, result.flag ? 200 : 400)
        }
        case "user": { // 根据用户获取令牌 ===================================
            if (!config.token_user) {
                return c.json({flag: false, text: 'Invalid User'}, 400)
            }
            let result: TokenResult = await tokens.getByUser(config.token_user);
            return c.json(result, result.flag ? 200 : 400)
        }
        case "enabled": { // 获取启用的令牌 ===================================
            let result: TokenResult = await tokens.getEnabledTokens();
            return c.json(result, result.flag ? 200 : 400)
        }
        default: { // 默认应输出错误 ===================================
            return c.json({flag: false, text: 'Invalid Action'}, 400)
        }
    }
})

// 用户管理 ##############################################################################
app.use('/@users/:action/:method/*', async (c: Context): Promise<any> => {
    const action: string = c.req.param('action');
    const method: string = c.req.param('method');
    const source: string = "/" + (c.req.param('source') || "");
    const config: Record<string, any> = await getConfig(c, 'config');
    // 权限检查 - 除了create、login操作外都需要登录 =======================================
    if (action !== 'create' && action !== 'login') {
        const authResult = await UsersManage.checkAuth(c);
        if (!authResult.flag) {
            return c.json(authResult, 401);
        }
    }
    // console.log("@mount", action, method, config)
    // 创建对象 ==========================================================================
    let users: UsersManage = new UsersManage(c);
    // 检查方法 ==========================================================================
    switch (method) {
        case "name": { // 筛选编号 =======================================================
            const result: UsersResult = await users.select(source);
            if (!result.data) return c.json({
                flag: false, text: 'No UUID Matched'
            }, 400)
            break;
        }
        case "none": { // 不筛选 =========================================================
            break;
        }
        default: { // 默认应输出错误 =====================================================
            return c.json({flag: false, text: 'Invalid Method'}, 400)
        }
    }
    console.log("@mount", action, method, config)
    // 检查参数 ==========================================================================
    if (!config.users_name && action != "select")
        return c.json({flag: false, text: 'Invalid Name'}, 400)
    // 执行操作 ==========================================================================
    switch (action) {
        case "select": { // 查找用户 ===================================
            const result: UsersResult = await users.select();
            return c.json(result, result.flag ? 200 : 400)
        }
        case "create": { // 创建用户 ===================================
            const userData: UsersConfig = {
                users_name: config.users_name,
                users_mail: config.users_mail,
                users_pass: config.users_pass
            };
            let result: UsersResult = await users.create(userData);
            console.log(result)
            return c.json(result, result.flag ? 200 : 400)
        }
        case "remove": { // 删除用户 ===================================
            let result: UsersResult = await users.remove(config.users_name);
            return c.json(result, result.flag ? 200 : 400)
        }
        case "config": { // 配置用户 ===================================
            let result: UsersResult = await users.config(config as UsersConfig);
            return c.json(result, result.flag ? 200 : 400)
        }
        case "login": { // 登录用户 ====================================
            const loginData: UsersConfig = {
                users_name: config.users_name,
                users_pass: config.users_pass
            };
            let result: UsersResult = await users.log_in(loginData);
            return c.json(result, result.flag ? 200 : 400)
        }
        case "logout": {// 登出用户 ====================================
            const token = c.req.header('Authorization')?.replace('Bearer ', '');
            let result: UsersResult = await users.logout(token);
            return c.json(result, result.flag ? 200 : 400)
        }
        case "oauth-unbind": { // OAuth解绑 ====================================
            if (!config.users_name || !config.oauth_name || !config.oauth_user_id) {
                return c.json({flag: false, text: 'Invalid Parameters'}, 400)
            }
            let result: UsersResult = await users.unbindOAuth(config.users_name, config.oauth_name, config.oauth_user_id);
            return c.json(result, result.flag ? 200 : 400)
        }
        default: { // 默认应输出错误 ===================================
            return c.json({flag: false, text: 'Invalid Action'}, 400)
        }
    }
})

// 分享管理 ##############################################################################
app.use('/@share/:action/:method/*', async (c: Context): Promise<any> => {
    const action: string = c.req.param('action');
    const method: string = c.req.param('method');
    const source: string = "/" + (c.req.param('source') || "");
    const config: Record<string, any> = await getConfig(c, 'config');
    
    // 权限检查 - 所有分享管理操作都需要登录 =======================================
    const authResult = await UsersManage.checkAuth(c);
    if (!authResult.flag) {
        return c.json(authResult, 401);
    }
    
    // 创建对象 ==========================================================================
    let share: ShareManage = new ShareManage(c);
    
    // 检查方法 ==========================================================================
    switch (method) {
        case "uuid": { // 筛选分享UUID =====================================================
            const result = await share.select(source);
            if (!result.data || result.data.length === 0) return c.json({
                flag: false, text: 'No Share Config Matched'
            }, 400)
            break;
        }
        case "none": { // 不筛选 =========================================================
            break;
        }
        default: { // 默认应输出错误 =====================================================
            return c.json({flag: false, text: 'Invalid Method'}, 400)
        }
    }
    
    console.log("@share", action, method, config)
    
    // 执行操作 ==========================================================================
    switch (action) {
        case "select": { // 查找分享配置 ===================================
            const result = await share.select();
            return c.json(result, result.flag ? 200 : 400)
        }
        case "create": { // 创建分享配置 ===================================
            if (!config.share_path || !config.share_user) {
                return c.json({flag: false, text: 'Invalid Share Path or User'}, 400)
            }
            const shareData: ShareConfig = {
                share_uuid: config.share_uuid || "",
                share_path: config.share_path,
                share_pass: config.share_pass || "",
                share_user: config.share_user,
                share_date: config.share_date || new Date().toISOString(),
                share_ends: config.share_ends || "",
                is_enabled: config.is_enabled !== undefined ? config.is_enabled : 1
            };
            let result = await share.create(shareData);
            return c.json(result, result.flag ? 200 : 400)
        }
        case "remove": { // 删除分享配置 ===================================
            if (!config.share_uuid) {
                return c.json({flag: false, text: 'Invalid Share UUID'}, 400)
            }
            let result = await share.remove(config.share_uuid);
            return c.json(result, result.flag ? 200 : 400)
        }
        case "config": { // 配置分享 ===================================
            let result = await share.config(config as ShareConfig);
            return c.json(result, result.flag ? 200 : 400)
        }
        case "status": { // 更新启用状态 ===================================
            if (!config.share_uuid || config.is_enabled === undefined) {
                return c.json({flag: false, text: 'Invalid Param Request'}, 400)
            }
            let result = await share.toggleStatus(config.share_uuid, config.is_enabled);
            return c.json(result, result.flag ? 200 : 400)
        }
        case "enabled": { // 获取启用的分享配置 ===================================
            let result = await share.getEnabledShares();
            return c.json(result, result.flag ? 200 : 400)
        }
        case "user": { // 获取用户的分享配置 ===================================
            if (!config.share_user) {
                return c.json({flag: false, text: 'Invalid User'}, 400)
            }
            let result = await share.getByUser(config.share_user);
            return c.json(result, result.flag ? 200 : 400)
        }
        case "validate": { // 验证分享访问权限 ===================================
            if (!config.share_uuid) {
                return c.json({flag: false, text: 'Invalid Share UUID'}, 400)
            }
            let result = await share.validateAccess(config.share_uuid, config.share_pass);
            return c.json(result, result.flag ? 200 : 400)
        }
        case "password": { // 更新分享密码 ===================================
            if (!config.share_uuid) {
                return c.json({flag: false, text: 'Invalid Share UUID'}, 400)
            }
            let result = await share.updatePassword(config.share_uuid, config.share_pass || "");
            return c.json(result, result.flag ? 200 : 400)
        }
        case "endtime": { // 更新分享结束时间 ===================================
            if (!config.share_uuid) {
                return c.json({flag: false, text: 'Invalid Share UUID'}, 400)
            }
            let result = await share.updateEndTime(config.share_uuid, config.share_ends || "");
            return c.json(result, result.flag ? 200 : 400)
        }
        case "expiring": { // 获取即将过期的分享 ===================================
            const days = config.days || 7;
            let result = await share.getExpiringShares(days);
            return c.json(result, result.flag ? 200 : 400)
        }
        case "cleanup": { // 清理过期分享 ===================================
            let result = await share.cleanExpiredShares();
            return c.json(result, result.flag ? 200 : 400)
        }
        default: { // 默认应输出错误 ===================================
            return c.json({flag: false, text: 'Invalid Action'}, 400)
        }
    }
})

// OAuth认证管理 ##############################################################################
app.use('/@oauth/:action/:method/*', async (c: Context): Promise<any> => {
    const action: string = c.req.param('action');
    const method: string = c.req.param('method');
    const source: string = "/" + (c.req.param('source') || "");
    const config: Record<string, any> = await getConfig(c, 'config');
    
    // 权限检查 - 所有OAuth管理操作都需要登录 =======================================
    const authResult = await UsersManage.checkAuth(c);
    if (!authResult.flag) {
        return c.json(authResult, 401);
    }
    
    // 创建对象 ==========================================================================
    let oauth: OauthManage = new OauthManage(c);
    
    // 检查方法 ==========================================================================
    switch (method) {
        case "name": { // 筛选OAuth名称 =====================================================
            const result = await oauth.select(source);
            if (!result.data || result.data.length === 0) return c.json({
                flag: false, text: 'No OAuth Config Matched'
            }, 400)
            break;
        }
        case "none": { // 不筛选 =========================================================
            break;
        }
        default: { // 默认应输出错误 =====================================================
            return c.json({flag: false, text: 'Invalid Method'}, 400)
        }
    }
    
    console.log("@oauth", action, method, config)
    
    // 执行操作 ==========================================================================
    switch (action) {
        case "select": { // 查找OAuth配置 ===================================
            const result = await oauth.select();
            return c.json(result, result.flag ? 200 : 400)
        }
        case "create": { // 创建OAuth配置 ===================================
            if (!config.oauth_name || !config.oauth_type || !config.oauth_data) {
                return c.json({flag: false, text: 'Invalid OAuth Name, Type or Data'}, 400)
            }
            const oauthData: OauthConfig = {
                oauth_name: config.oauth_name,
                oauth_type: config.oauth_type,
                oauth_data: config.oauth_data,
                is_enabled: config.is_enabled !== undefined ? config.is_enabled : 1
            };
            let result = await oauth.create(oauthData);
            return c.json(result, result.flag ? 200 : 400)
        }
        case "remove": { // 删除OAuth配置 ===================================
            if (!config.oauth_name) {
                return c.json({flag: false, text: 'Invalid OAuth Name'}, 400)
            }
            let result = await oauth.remove(config.oauth_name);
            return c.json(result, result.flag ? 200 : 400)
        }
        case "config": { // 配置OAuth ===================================
            let result = await oauth.config(config as OauthConfig);
            return c.json(result, result.flag ? 200 : 400)
        }
        case "status": { // 更新启用状态 ===================================
            if (!config.oauth_name || config.is_enabled === undefined) {
                return c.json({flag: false, text: 'Invalid Param Request'}, 400)
            }
            let result = await oauth.toggleStatus(config.oauth_name, config.is_enabled);
            return c.json(result, result.flag ? 200 : 400)
        }
        case "enabled": { // 获取启用的OAuth配置 ===================================
            let result = await oauth.getEnabledOauth();
            return c.json(result, result.flag ? 200 : 400)
        }
        case "type": { // 根据类型获取OAuth配置 ===================================
            if (!config.oauth_type) {
                return c.json({flag: false, text: 'Invalid OAuth Type'}, 400)
            }
            let result = await oauth.getByType(config.oauth_type);
            return c.json(result, result.flag ? 200 : 400)
        }
        case "validate": { // 验证OAuth配置 ===================================
            if (!config.oauth_name) {
                return c.json({flag: false, text: 'Invalid OAuth Name'}, 400)
            }
            let result = await oauth.validateConfig(config.oauth_name);
            return c.json(result, result.flag ? 200 : 400)
        }
        case "updatedata": { // 更新OAuth数据 ===================================
            if (!config.oauth_name || !config.oauth_data) {
                return c.json({flag: false, text: 'Invalid OAuth Name or Data'}, 400)
            }
            let result = await oauth.updateData(config.oauth_name, config.oauth_data);
            return c.json(result, result.flag ? 200 : 400)
        }
        case "updatetype": { // 更新OAuth类型 ===================================
            if (!config.oauth_name || !config.oauth_type) {
                return c.json({flag: false, text: 'Invalid OAuth Name or Type'}, 400)
            }
            let result = await oauth.updateType(config.oauth_name, config.oauth_type);
            return c.json(result, result.flag ? 200 : 400)
        }
        default: { // 默认应输出错误 ===================================
            return c.json({flag: false, text: 'Invalid Action'}, 400)
        }
    }
})

// OAuth Token管理 ##############################################################################
app.use('/@oauth-token/:action/:method/*', async (c: Context): Promise<any> => {
    const action: string = c.req.param('action');
    const method: string = c.req.param('method');
    const source: string = "/" + (c.req.param('source') || "");
    const config: Record<string, any> = await getConfig(c, 'config');
    
    // 创建对象 ==========================================================================
    let oauthToken: TokenManage = new TokenManage(c);
    
    // 检查方法 ==========================================================================
    switch (method) {
        case "name": { // 根据OAuth名称操作 =======================================================
            const oauth_name = source.substring(1); // 移除开头的 "/"
            if (!oauth_name) {
                return c.json({flag: false, text: 'Invalid OAuth Name'}, 400)
            }
            
            switch (action) {
                case "authurl": { // 生成授权URL ===================================
                    if (!config.redirect_uri) {
                        return c.json({flag: false, text: 'Missing redirect_uri'}, 400)
                    }
                    let result = await oauthToken.generateAuthUrl(oauth_name, config.redirect_uri, config.state);
                    return c.json(result, result.flag ? 200 : 400)
                }
                case "callback": { // 处理OAuth回调 ===================================
                    if (!config.code) {
                        return c.json({flag: false, text: 'Missing authorization code'}, 400)
                    }
                    let result = await oauthToken.handleCallback({
                        oauth_name: oauth_name,
                        code: config.code,
                        state: config.state,
                        redirect_uri: config.redirect_uri
                    });
                    return c.json(result, result.flag ? 200 : 400)
                }
                case "tokens": { // 获取用户tokens ===================================
                    let result = await oauthToken.getUserTokens(config.user_id, oauth_name);
                    return c.json(result, result.flag ? 200 : 400)
                }
                case "refresh": { // 刷新token ===================================
                    if (!config.refresh_token) {
                        return c.json({flag: false, text: 'Missing refresh_token'}, 400)
                    }
                    let result = await oauthToken.refreshToken(oauth_name, config.refresh_token);
                    return c.json(result, result.flag ? 200 : 400)
                }
                case "validate": { // 验证token ===================================
                    if (!config.access_token) {
                        return c.json({flag: false, text: 'Missing access_token'}, 400)
                    }
                    let result = await oauthToken.validateToken(oauth_name, config.access_token);
                    return c.json(result, result.flag ? 200 : 400)
                }
                case "revoke": { // 撤销token ===================================
                    if (!config.access_token) {
                        return c.json({flag: false, text: 'Missing access_token'}, 400)
                    }
                    let result = await oauthToken.revokeToken(oauth_name, config.access_token);
                    return c.json(result, result.flag ? 200 : 400)
                }
                case "bind": { // 绑定OAuth账户 ===================================
                    if (!config.code) {
                        return c.json({flag: false, text: 'Missing authorization code'}, 400)
                    }
                    let result = await oauthToken.bindAccount({
                        oauth_name: oauth_name,
                        code: config.code,
                        state: config.state,
                        redirect_uri: config.redirect_uri
                    });
                    return c.json(result, result.flag ? 200 : 400)
                }
                default: {
                    return c.json({flag: false, text: 'Invalid Action'}, 400)
                }
            }
        }
        case "none": { // 无特定参数操作 =======================================================
            switch (action) {
                case "tokens": { // 获取所有tokens ===================================
                    let result = await oauthToken.getUserTokens(config.user_id);
                    return c.json(result, result.flag ? 200 : 400)
                }
                default: {
                    return c.json({flag: false, text: 'Invalid Action'}, 400)
                }
            }
        }
        default: { // 默认应输出错误 ===================================
            return c.json({flag: false, text: 'Invalid Method'}, 400)
        }
    }
})

// 离线下载管理 ##############################################################################
app.use('/@fetch/:action/:method/*', async (c: Context): Promise<any> => {
    const action: string = c.req.param('action');
    const method: string = c.req.param('method');
    const source: string = "/" + (c.req.param('source') || "");
    const config: Record<string, any> = await getConfig(c, 'config');
    
    // 权限检查 - 所有离线下载操作都需要登录 =======================================
    const authResult = await UsersManage.checkAuth(c);
    if (!authResult.flag) {
        return c.json(authResult, 401);
    }
    
    // 创建对象 ==========================================================================
    let fetch: FetchManage = new FetchManage(c);
    
    // 检查方法 ==========================================================================
    switch (method) {
        case "uuid": { // 筛选UUID =======================================================
            const result: FetchResult = await fetch.select(source);
            if (!result.data || result.data.length === 0) return c.json({
                flag: false, text: 'No UUID Matched'
            }, 400)
            break;
        }
        case "none": { // 不筛选 =========================================================
            break;
        }
        default: { // 默认应输出错误 =====================================================
            return c.json({flag: false, text: 'Invalid Method'}, 400)
        }
    }
    
    console.log("@fetch", action, method, config)
    
    // 执行操作 ==========================================================================
    switch (action) {
        case "select": { // 查找下载任务 ===================================
            const result: FetchResult = await fetch.select();
            return c.json(result, result.flag ? 200 : 400)
        }
        case "create": { // 创建下载任务 ===================================
            if (!config.fetch_from || !config.fetch_dest || !config.fetch_user) {
                return c.json({flag: false, text: 'Invalid Param Request'}, 400)
            }
            const fetchData: FetchConfig = {
                fetch_from: config.fetch_from,
                fetch_dest: config.fetch_dest,
                fetch_user: config.fetch_user,
                fetch_flag: config.fetch_flag || 0
            };
            let result: FetchResult = await fetch.create(fetchData);
            return c.json(result, result.flag ? 200 : 400)
        }
        case "remove": { // 删除下载任务 ===================================
            if (!config.fetch_uuid) {
                return c.json({flag: false, text: 'Invalid UUID'}, 400)
            }
            let result: FetchResult = await fetch.remove(config.fetch_uuid);
            return c.json(result, result.flag ? 200 : 400)
        }
        case "config": { // 配置下载任务 ===================================
            let result: FetchResult = await fetch.config(config as FetchConfig);
            return c.json(result, result.flag ? 200 : 400)
        }
        case "status": { // 更新任务状态 ===================================
            if (!config.fetch_uuid || config.fetch_flag === undefined) {
                return c.json({flag: false, text: 'Invalid Param Request'}, 400)
            }
            let result: FetchResult = await fetch.updateStatus(config.fetch_uuid, config.fetch_flag);
            return c.json(result, result.flag ? 200 : 400)
        }
        case "user": { // 根据用户获取任务 ===================================
            if (!config.fetch_user) {
                return c.json({flag: false, text: 'Invalid User'}, 400)
            }
            let result: FetchResult = await fetch.getByUser(config.fetch_user);
            return c.json(result, result.flag ? 200 : 400)
        }
        case "download": { // 异步下载接口（由cron调用） ===================================
            let result: FetchResult = await fetch.getByStatus(0); // 获取待下载的任务
            return c.json(result, result.flag ? 200 : 400)
        }
        default: { // 默认应输出错误 ===================================
            return c.json({flag: false, text: 'Invalid Action'}, 400)
        }
    }
})

// 分组管理 ##############################################################################
app.use('/@group/:action/:method/*', async (c: Context): Promise<any> => {
    const action: string = c.req.param('action');
    const method: string = c.req.param('method');
    const source: string = "/" + (c.req.param('source') || "");
    const config: Record<string, any> = await getConfig(c, 'config');
    
    // 权限检查 - 所有分组管理操作都需要登录 =======================================
    const authResult = await UsersManage.checkAuth(c);
    if (!authResult.flag) {
        return c.json(authResult, 401);
    }
    
    // 创建对象 ==========================================================================
    let group: GroupManage = new GroupManage(c);
    
    // 检查方法 ==========================================================================
    switch (method) {
        case "name": { // 筛选组名 =======================================================
            const result: GroupResult = await group.select(source);
            if (!result.data || result.data.length === 0) return c.json({
                flag: false, text: 'No Group Matched'
            }, 400)
            break;
        }
        case "none": { // 不筛选 =========================================================
            break;
        }
        default: { // 默认应输出错误 =====================================================
            return c.json({flag: false, text: 'Invalid Method'}, 400)
        }
    }
    
    console.log("@group", action, method, config)
    
    // 执行操作 ==========================================================================
    switch (action) {
        case "select": { // 查找分组 ===================================
            const result: GroupResult = await group.select();
            return c.json(result, result.flag ? 200 : 400)
        }
        case "create": { // 创建分组 ===================================
            if (!config.group_name) {
                return c.json({flag: false, text: 'Invalid Group Name'}, 400)
            }
            const groupData: GroupConfig = {
                group_name: config.group_name,
                group_mask: config.group_mask || 755, // 默认权限755
                is_enabled: config.is_enabled !== undefined ? config.is_enabled : true
            };
            let result: GroupResult = await group.create(groupData);
            return c.json(result, result.flag ? 200 : 400)
        }
        case "remove": { // 删除分组 ===================================
            if (!config.group_name) {
                return c.json({flag: false, text: 'Invalid Group Name'}, 400)
            }
            let result: GroupResult = await group.remove(config.group_name);
            return c.json(result, result.flag ? 200 : 400)
        }
        case "config": { // 配置分组 ===================================
            let result: GroupResult = await group.config(config as GroupConfig);
            return c.json(result, result.flag ? 200 : 400)
        }
        case "toggle": { // 切换分组状态 ===================================
            if (!config.group_name) {
                return c.json({flag: false, text: 'Invalid Group Name'}, 400)
            }
            let result: GroupResult = await group.toggleStatus(config.group_name);
            return c.json(result, result.flag ? 200 : 400)
        }
        case "mask": { // 更新分组权限 ===================================
            if (!config.group_name || config.group_mask === undefined) {
                return c.json({flag: false, text: 'Invalid Param Request'}, 400)
            }
            let result: GroupResult = await group.updateMask(config.group_name, config.group_mask);
            return c.json(result, result.flag ? 200 : 400)
        }
        case "enabled": { // 获取启用的分组 ===================================
            let result: GroupResult = await group.getEnabled();
            return c.json(result, result.flag ? 200 : 400)
        }
        default: { // 默认应输出错误 ===================================
            return c.json({flag: false, text: 'Invalid Action'}, 400)
        }
    }
})

// 路径管理 ##############################################################################
app.use('/@mates/:action/:method/*', async (c: Context): Promise<any> => {
    const action: string = c.req.param('action');
    const method: string = c.req.param('method');
    const source: string = "/" + (c.req.param('source') || "");
    const config: Record<string, any> = await getConfig(c, 'config');
    
    // 权限检查 - 所有路径管理操作都需要登录 =======================================
    const authResult = await UsersManage.checkAuth(c);
    if (!authResult.flag) {
        return c.json(authResult, 401);
    }
    
    // 创建对象 ==========================================================================
    let mates: MatesManage = new MatesManage(c);
    
    // 检查方法 ==========================================================================
    switch (method) {
        case "name": { // 筛选路径名 =====================================================
            const result: MatesResult = await mates.select(source);
            if (!result.data || result.data.length === 0) return c.json({
                flag: false, text: 'No Path Matched'
            }, 400)
            break;
        }
        case "none": { // 不筛选 =========================================================
            break;
        }
        default: { // 默认应输出错误 =====================================================
            return c.json({flag: false, text: 'Invalid Method'}, 400)
        }
    }
    
    console.log("@mates", action, method, config)
    
    // 执行操作 ==========================================================================
    switch (action) {
        case "select": { // 查找路径配置 ===================================
            const result: MatesResult = await mates.select();
            return c.json(result, result.flag ? 200 : 400)
        }
        case "create": { // 创建路径配置 ===================================
            if (!config.mates_name) {
                return c.json({flag: false, text: 'Invalid Path Name'}, 400)
            }
            const matesData: MatesConfig = {
                mates_name: config.mates_name,
                mates_mask: config.mates_mask || 0,
                mates_user: config.mates_user || 0,
                is_enabled: config.is_enabled !== undefined ? config.is_enabled : 1,
                dir_hidden: config.dir_hidden,
                dir_shared: config.dir_shared,
                set_zipped: config.set_zipped,
                set_parted: config.set_parted,
                crypt_name: config.crypt_name,
                cache_time: config.cache_time
            };
            let result: MatesResult = await mates.create(matesData);
            return c.json(result, result.flag ? 200 : 400)
        }
        case "remove": { // 删除路径配置 ===================================
            if (!config.mates_name) {
                return c.json({flag: false, text: 'Invalid Path Name'}, 400)
            }
            let result: MatesResult = await mates.remove(config.mates_name);
            return c.json(result, result.flag ? 200 : 400)
        }
        case "config": { // 配置路径 ===================================
            let result: MatesResult = await mates.config(config as MatesConfig);
            return c.json(result, result.flag ? 200 : 400)
        }
        case "status": { // 更新启用状态 ===================================
            if (!config.mates_name || config.is_enabled === undefined) {
                return c.json({flag: false, text: 'Invalid Param Request'}, 400)
            }
            let result: MatesResult = await mates.toggleStatus(config.mates_name, config.is_enabled);
            return c.json(result, result.flag ? 200 : 400)
        }
        case "enabled": { // 获取启用的路径配置 ===================================
            let result: MatesResult = await mates.getEnabledMates();
            return c.json(result, result.flag ? 200 : 400)
        }
        default: { // 默认应输出错误 ===================================
            return c.json({flag: false, text: 'Invalid Action'}, 400)
        }
    }
})

// 加密配置管理 ##########################################################################
app.use('/@crypt/:action/:method/*', async (c: Context): Promise<any> => {
    const action: string = c.req.param('action');
    const method: string = c.req.param('method');
    const source: string = "/" + (c.req.param('source') || "");
    const config: Record<string, any> = await getConfig(c, 'config');
    
    // 权限检查 - 所有加密配置操作都需要登录 =======================================
    const authResult = await UsersManage.checkAuth(c);
    if (!authResult.flag) {
        return c.json(authResult, 401);
    }
    
    // 创建对象 ==========================================================================
    let crypt: CryptManage = new CryptManage(c);
    
    // 检查方法 ==========================================================================
    switch (method) {
        case "name": { // 筛选加密配置名 =====================================================
            const result = await crypt.select(source);
            if (!result.data || result.data.length === 0) return c.json({
                flag: false, text: 'No Crypt Config Matched'
            }, 400)
            break;
        }
        case "none": { // 不筛选 =========================================================
            break;
        }
        default: { // 默认应输出错误 =====================================================
            return c.json({flag: false, text: 'Invalid Method'}, 400)
        }
    }
    
    console.log("@crypt", action, method, config)
    
    // 执行操作 ==========================================================================
    switch (action) {
        case "select": { // 查找加密配置 ===================================
            const result = await crypt.select();
            return c.json(result, result.flag ? 200 : 400)
        }
        case "create": { // 创建加密配置 ===================================
            if (!config.crypt_name) {
                return c.json({flag: false, text: 'Invalid Crypt Name'}, 400)
            }
            const cryptData: CryptInfo = {
                crypt_name: config.crypt_name,
                crypt_user: config.crypt_user || "",
                crypt_pass: config.crypt_pass || "",
                crypt_type: config.crypt_type || 1,
                crypt_mode: config.crypt_mode || 0x03,
                is_enabled: config.is_enabled !== undefined ? config.is_enabled : true,
                crypt_self: config.crypt_self || false,
                rands_pass: config.rands_pass || false,
                write_name: config.write_name || "",
                // write_info: config.write_info || "",
                oauth_data: config.oauth_data || {}
            };
            let result = await crypt.create(cryptData);
            return c.json(result, result.flag ? 200 : 400)
        }
        case "remove": { // 删除加密配置 ===================================
            if (!config.crypt_name) {
                return c.json({flag: false, text: 'Invalid Crypt Name'}, 400)
            }
            let result = await crypt.remove(config.crypt_name);
            return c.json(result, result.flag ? 200 : 400)
        }
        case "config": { // 配置加密 ===================================
            let result = await crypt.config(config as CryptInfo);
            return c.json(result, result.flag ? 200 : 400)
        }
        case "status": { // 更新启用状态 ===================================
            if (!config.crypt_name || config.is_enabled === undefined) {
                return c.json({flag: false, text: 'Invalid Param Request'}, 400)
            }
            let result = await crypt.toggleStatus(config.crypt_name, config.is_enabled);
            return c.json(result, result.flag ? 200 : 400)
        }
        case "enabled": { // 获取启用的加密配置 ===================================
            let result = await crypt.getEnabledCrypts();
            return c.json(result, result.flag ? 200 : 400)
        }
        case "user": { // 获取用户的加密配置 ===================================
            if (!config.crypt_user) {
                return c.json({flag: false, text: 'Invalid User'}, 400)
            }
            let result = await crypt.getUserCrypts(config.crypt_user);
            return c.json(result, result.flag ? 200 : 400)
        }
        default: { // 默认应输出错误 ===================================
            return c.json({flag: false, text: 'Invalid Action'}, 400)
        }
    }
})

// 分享管理 ##############################################################################
app.use('/@types/:action/:method/*', async (c: Context): Promise<any> => {
    // const action: string = c.req.param('action');
    // const method: string = c.req.param('method');
    // const source: string = "/" + (c.req.param('source') || "");
    // const config: Record<string, any> = await getConfig(c, 'config');

    // 创建对象 ==========================================================================
    // let users: UsersManage = new UsersManage(c);
    // 执行操作 ==========================================================================
    // switch (action) {
    //     case "select": { // 查找分享 ===================================
    //
    //     }
    //     case "create": { // 查找分享 ===================================
    //
    //     }
    //     case "remove": { // 查找分享 ===================================
    //
    //     }
    //     case "update": { // 查找分享 ===================================
    //
    //     }
    //     default: { // 默认应输出错误 ===================================
    //         return c.json({flag: false, text: 'Invalid Action'}, 400)
    //     }
    // }
    return c.json({flag: false, text: 'Invalid Action'}, 400)
})

// 系统信息 ##############################################################################
app.use('/@setup/:action/:method', async (c: Context): Promise<any> => {
    const action: string = c.req.param('action');
    const method: string = c.req.param('method');

    // 权限检查 - 系统信息需要登录 ===============================================
    const authResult = await UsersManage.checkAuth(c);
    if (!authResult.flag) {
        return c.json(authResult, 401);
    }

    // 创建对象 ==========================================================================
    const system: SystemManage = new SystemManage(c);

    // 执行操作 ==========================================================================
    switch (action) {
        case "info": { // 获取系统信息 ===================================
            const result: SystemResult = await system.getSystemInfo();
            return c.json(result, result.flag ? 200 : 400);
        }
        default: { // 默认应输出错误 ===================================
            return c.json({flag: false, text: 'Invalid Action'}, 400);
        }
    }
})

// 文件管理 ##############################################################################
app.use('/@files/:action/:method/*', async (c: Context): Promise<any> => {
    const action: string = c.req.param('action');
    const method: string = c.req.param('method');
    console.log("@action", action, method)
    // 权限检查 - 所有文件操作都需要登录 ===============================================
    // const authResult = await UsersManage.checkAuth(c);
    // if (!authResult.flag) return c.json(authResult, 401);
    const upload = await c.req.parseBody();
    // 创建对象 ==========================================================================
    const source: string = "/" + c.req.path.split('/').slice(4).join('/');
    const target: string | undefined = c.req.query('target');
    const driver: string | undefined = c.req.query('driver');
    const config: Record<string, any> = await getConfig(c, 'config');

    // 检查方法 ==========================================================================
    switch (method) {
        case "path": { // 筛选路径 =======================================================
            config.mount_path = target
            break;
        }
        case "uuid": { // 筛选编号 =======================================================
            break; // TODO: 使用UUID查找文件
        }
        case "none": { // 不筛选 =========================================================
            break;
        }
        default: { // 默认应输出错误 =====================================================
            return c.json({flag: false, text: 'Invalid Method'}, 400)
        }
    }
    const files: FilesManage = new FilesManage(c);
    return await files.action(action, source, target, config, driver, upload);
})

// 页面访问 ##############################################################################
app.use('*', async (c: Context): Promise<any>=> {
    // 权限检查 - 所有页面访问都需要登录 ===============================================
    const authResult = await UsersManage.checkAuth(c);
    if (!authResult.flag) {
        return c.json(authResult, 401);
    }

    // TODO:  增加虚拟主机功能，指定域名直接访问进行下载，否则返回页面
    const source: string = "/" + c.req.path.split('/').slice(1).join('/');
    const files: FilesManage = new FilesManage(c);
    return await files.action("list", source, "", {});
})


export default app