import {Context} from "hono";
import {DBResult} from "../saves/SavesObject";
import {SavesManage} from "../saves/SavesManage";
import {UsersConfig, UsersResult} from "./UsersObject";
import {GroupManage} from "../group/GroupManage";
import {GroupConfig} from "../group/GroupObject";
import * as bcrypt from 'bcryptjs';
import {BindsManage} from "../binds/BindsManage";
import {BindsData} from "../binds/BindsObject";

const reg = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// ============================================================
// JWT 工具（使用 Web Crypto API，兼容 Cloudflare Workers）
// ============================================================

/** 获取 JWT 密钥（从环境变量或默认值） */
function getJwtSecret(c: Context): string {
    try {
        const env = (c.env as any);
        return env?.JWT_SECRET || env?.KV_DATA?.JWT_SECRET || 'openlist-default-secret-change-in-production';
    } catch {
        return 'openlist-default-secret-change-in-production';
    }
}

/** 生成 JWT Token（HS256） */
async function generateJwt(payload: Record<string, any>, secret: string): Promise<string> {
    const header = { alg: 'HS256', typ: 'JWT' };
    const headerB64 = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    const payloadB64 = btoa(JSON.stringify(payload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    const data = `${headerB64}.${payloadB64}`;

    const key = await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(secret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
    );
    const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data));
    const sigB64 = btoa(String.fromCharCode(...new Uint8Array(sig)))
        .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    return `${data}.${sigB64}`;
}

/** 验证并解析 JWT Token */
async function verifyJwt(token: string, secret: string): Promise<Record<string, any> | null> {
    try {
        const parts = token.split('.');
        if (parts.length !== 3) return null;
        const [headerB64, payloadB64, sigB64] = parts;
        const data = `${headerB64}.${payloadB64}`;

        const key = await crypto.subtle.importKey(
            'raw',
            new TextEncoder().encode(secret),
            { name: 'HMAC', hash: 'SHA-256' },
            false,
            ['verify']
        );
        const sig = Uint8Array.from(atob(sigB64.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
        const valid = await crypto.subtle.verify('HMAC', key, sig, new TextEncoder().encode(data));
        if (!valid) return null;

        const payload = JSON.parse(atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/')));
        // 检查过期时间
        if (payload.exp && Date.now() / 1000 > payload.exp) return null;
        return payload;
    } catch {
        return null;
    }
}

/** SHA256 哈希（与 GO 后端 model.StaticHash 对应） */
async function sha256Hash(input: string): Promise<string> {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// ============================================================
// 登录失败次数限制（内存缓存，Worker 重启后重置）
// ============================================================
const loginFailCache = new Map<string, { count: number; lockUntil: number }>();
const MAX_LOGIN_RETRIES = 5;
const LOCK_DURATION_MS = 5 * 60 * 1000; // 5 分钟

function checkLoginLimit(ip: string): { allowed: boolean; message?: string } {
    const now = Date.now();
    const entry = loginFailCache.get(ip);
    if (entry && entry.lockUntil > now) {
        return { allowed: false, message: 'Too many login attempts, please try again later' };
    }
    return { allowed: true };
}

function recordLoginFail(ip: string): void {
    const now = Date.now();
    const entry = loginFailCache.get(ip) || { count: 0, lockUntil: 0 };
    entry.count += 1;
    if (entry.count >= MAX_LOGIN_RETRIES) {
        entry.lockUntil = now + LOCK_DURATION_MS;
    }
    loginFailCache.set(ip, entry);
}

function clearLoginFail(ip: string): void {
    loginFailCache.delete(ip);
}

/**
 * 用户管理类，用于处理用户的创建、删除、配置和查询操作。
 */
export class UsersManage {
    public c: Context
    public d: SavesManage

    constructor(c: Context) {
        this.c = c
        this.d = new SavesManage(c)
    }

    // ============================================================
    // 创建用户
    // ============================================================
    async create(userData: UsersConfig): Promise<UsersResult> {
        try {
            if (!userData.users_name || userData.users_name.length < 5) return {flag: false, text: "用户至少5个字符"};
            if (!userData.users_pass) userData.users_pass = "admin";
            if (userData.users_pass.length < 6) return {flag: false, text: "登录至少6个字符"};
            if (userData.users_mail) if (!reg.test(userData.users_mail)) return {flag: false, text: "邮箱格式不正确"};
            const find_user: DBResult = await this.d.find({main: "users", keys: {"users_name": userData.users_name}});
            if (find_user.data.length > 0) return {flag: false, text: "用户已存在"};
            const userConfig: UsersConfig = {
                users_name: userData.users_name,
                users_mail: userData.users_mail || "",
                users_pass: await bcrypt.hash(userData.users_pass, 10),
                users_mask: userData.users_mask || "",
                is_enabled: userData.is_enabled ?? true,
                total_size: userData.total_size ?? 1024 * 1024 * 1024,
                total_used: userData.total_used ?? 0,
                oauth_data: userData.oauth_data ?? "",
                mount_data: userData.mount_data ?? ""
            };
            return await this.config(userConfig);
        } catch (error) {
            console.error("创建用户过程中发生错误:", error);
            return { flag: false, text: "创建用户失败，请稍后重试" };
        }
    }

    // ============================================================
    // 删除用户
    // ============================================================
    async remove(username: string): Promise<UsersResult> {
        const db = new SavesManage(this.c);
        const result: DBResult = await db.kill({
            main: "users",
            keys: {"users_name": username},
        });
        return { flag: result.flag, text: result.text };
    }

    // ============================================================
    // 配置用户
    // ============================================================
    async config(user: UsersConfig): Promise<UsersResult> {
        const db = new SavesManage(this.c);
        if (user.users_pass &&
            !user.users_pass.startsWith('$2a$') &&
            !user.users_pass.startsWith('$2b$') &&
            !user.users_pass.startsWith('$2y$')) {
            user.users_pass = await bcrypt.hash(user.users_pass, 10);
        }
        const result: DBResult = await db.save({
            main: "users",
            keys: {"users_name": user.users_name},
            data: user,
        });
        return { flag: result.flag, text: result.text };
    }

    // ============================================================
    // 查询用户
    // ============================================================
    async select(users_name?: string): Promise<UsersResult> {
        const db = new SavesManage(this.c);
        const result: DBResult = await db.find({
            main: "users",
            keys: users_name ? {users_name: users_name} : {},
        });
        let result_data: UsersConfig[] = [];
        if (result.data.length > 0) {
            for (const item of result.data) {
                const userData = item as UsersConfig;
                if (userData.group_name) {
                    result_data.push(await this.inheritGroupPermissions(userData));
                } else {
                    result_data.push(userData);
                }
            }
        }
        return { flag: result.flag, text: result.text, data: result_data };
    }

    // ============================================================
    // 继承用户组权限
    // ============================================================
    async inheritGroupPermissions(userData: UsersConfig): Promise<UsersConfig> {
        try {
            if (!userData.group_name) return userData;
            const groupManage = new GroupManage(this.c);
            const groupResult = await groupManage.select(userData.group_name);
            if (!groupResult.flag || !groupResult.data || groupResult.data.length === 0) return userData;
            const groupData = groupResult.data[0] as GroupConfig;
            const inheritedData = {...userData};
            if (!inheritedData.users_mask && groupData.group_mask) {
                inheritedData.users_mask = groupData.group_mask.toString();
            }
            if (inheritedData.is_enabled === undefined && groupData.is_enabled !== undefined) {
                inheritedData.is_enabled = groupData.is_enabled === 1;
            }
            return inheritedData;
        } catch (error) {
            console.error("继承用户组权限时发生错误:", error);
            return userData;
        }
    }

    // ============================================================
    // 登录（明文密码，内部 SHA256 哈希后再 bcrypt 比对）
    // 对应 GO 后端 Login 接口
    // ============================================================
    async log_in(loginData: UsersConfig): Promise<UsersResult> {
        return this._loginInternal(loginData.users_name || '', loginData.users_pass || '', false);
    }

    // ============================================================
    // 登录（已哈希密码）
    // 对应 GO 后端 LoginHash 接口
    // ============================================================
    async log_in_hash(username: string, hashedPassword: string): Promise<UsersResult> {
        return this._loginInternal(username, hashedPassword, true);
    }

    // ============================================================
    // 内部登录逻辑
    // ============================================================
    private async _loginInternal(username: string, password: string, isHashed: boolean): Promise<UsersResult> {
        try {
            if (!username) return { flag: false, text: "用户名不能为空" };
            if (!password) return { flag: false, text: "密码不能为空" };

            // 获取客户端 IP（用于限流）
            const ip = this.c.req.header('CF-Connecting-IP') ||
                       this.c.req.header('X-Forwarded-For') ||
                       this.c.req.header('X-Real-IP') || 'unknown';

            // 检查登录限制
            const limitCheck = checkLoginLimit(ip);
            if (!limitCheck.allowed) {
                return { flag: false, text: limitCheck.message || 'Too many login attempts', code: 429 };
            }

            const db = new SavesManage(this.c);
            const userResult: DBResult = await db.find({
                main: "users",
                keys: {"users_name": username},
            });

            if (!userResult.flag || !userResult.data || userResult.data.length === 0) {
                recordLoginFail(ip);
                return { flag: false, text: "用户名或密码错误" };
            }

            const userData = userResult.data[0] as any;

            if (!userData.is_enabled) {
                return { flag: false, text: "账户已被禁用" };
            }

            // 密码验证
            let isPasswordValid = false;
            if (!userData.users_pass || userData.users_pass === "") {
                isPasswordValid = password === "admin";
            } else {
                // GO 后端：明文密码先 SHA256，再与 bcrypt 比对
                const pwdToCheck = isHashed ? password : await sha256Hash(password);
                isPasswordValid = await bcrypt.compare(pwdToCheck, userData.users_pass);
                // 兼容旧版直接 bcrypt 存储
                if (!isPasswordValid && !isHashed) {
                    isPasswordValid = await bcrypt.compare(password, userData.users_pass);
                }
            }

            if (!isPasswordValid) {
                recordLoginFail(ip);
                return { flag: false, text: "用户名或密码错误" };
            }

            clearLoginFail(ip);

            // 生成 JWT Token
            const secret = getJwtSecret(this.c);
            const now = Math.floor(Date.now() / 1000);
            const token = await generateJwt({
                sub: userData.users_name,
                name: userData.users_name,
                mask: userData.users_mask || '',
                iat: now,
                exp: now + 48 * 3600, // 48 小时有效期
            }, secret);

            const userInfo: UsersConfig = {
                users_name: userData.users_name,
                users_mail: userData.users_mail,
                users_mask: userData.users_mask,
                is_enabled: userData.is_enabled,
                total_size: userData.total_size,
                total_used: userData.total_used,
            };

            return { flag: true, text: "登录成功", token, data: [userInfo] };
        } catch (error) {
            console.error("登录过程中发生错误:", error);
            return { flag: false, text: "登录失败，请稍后重试" };
        }
    }

    // ============================================================
    // 登出（JWT 无状态，客户端丢弃 token 即可；此处预留黑名单扩展）
    // ============================================================
    async logout(token?: string): Promise<UsersResult> {
        // TODO: 可将 token 加入 KV 黑名单实现真正失效
        return { flag: true, text: "登出成功" };
    }

    // ============================================================
    // 验证 JWT Token 并返回用户信息
    // ============================================================
    async verifyToken(token: string): Promise<UsersConfig | null> {
        try {
            const secret = getJwtSecret(this.c);
            const payload = await verifyJwt(token, secret);
            if (!payload || !payload.sub) return null;

            const db = new SavesManage(this.c);
            const userResult: DBResult = await db.find({
                main: "users",
                keys: {"users_name": payload.sub},
            });
            if (!userResult.flag || userResult.data.length === 0) return null;
            const userData = userResult.data[0] as any;
            if (!userData.is_enabled) return null;

            return {
                users_name: userData.users_name,
                users_mail: userData.users_mail,
                users_mask: userData.users_mask,
                is_enabled: userData.is_enabled,
                total_size: userData.total_size,
                total_used: userData.total_used,
            };
        } catch (error) {
            console.error("Token验证失败:", error);
            return null;
        }
    }

    // ============================================================
    // OAuth 登录
    // ============================================================
    async oauthLogin(oauthUserInfo: {
        oauth_name: string;
        oauth_user_id: string;
        email?: string;
        name?: string;
        avatar?: string;
        raw_data: string;
    }): Promise<UsersResult> {
        try {
            const db = new SavesManage(this.c);
            const bindsManage = new BindsManage(this.c);
            const bindResult = await bindsManage.findByOAuthUserId(oauthUserInfo.oauth_name, oauthUserInfo.oauth_user_id);

            let existingUser = null;
            if (bindResult.flag && bindResult.data && bindResult.data.length > 0) {
                const bind = bindResult.data[0];
                if (bind.is_enabled !== 1) return { flag: false, text: "OAuth绑定已被禁用" };
                const userResult: DBResult = await db.find({ main: "users", keys: {"users_name": bind.binds_user} });
                if (userResult.flag && userResult.data.length > 0) existingUser = userResult.data[0];
            }

            if (existingUser) {
                if (!existingUser.is_enabled) return { flag: false, text: "账户已被禁用" };
                const secret = getJwtSecret(this.c);
                const now = Math.floor(Date.now() / 1000);
                const token = await generateJwt({
                    sub: existingUser.users_name,
                    name: existingUser.users_name,
                    mask: existingUser.users_mask || '',
                    iat: now, exp: now + 48 * 3600,
                }, secret);
                return { flag: true, text: "OAuth登录成功", token, data: [existingUser] };
            }

            // 创建新用户
            const username = `oauth_${oauthUserInfo.oauth_name}_${oauthUserInfo.oauth_user_id}`;
            const email = oauthUserInfo.email || `${username}@oauth.local`;
            const newUserConfig: UsersConfig = {
                users_name: username,
                users_mail: email,
                users_pass: await bcrypt.hash(Math.random().toString(36), 10),
                users_mask: "",
                is_enabled: true,
                total_size: 1024 * 1024 * 1024,
                total_used: 0,
                mount_data: ""
            };
            const createResult = await this.config(newUserConfig);
            if (!createResult.flag) return createResult;

            const bindsData: BindsData = {
                oauth_user_id: oauthUserInfo.oauth_user_id,
                email: oauthUserInfo.email,
                name: oauthUserInfo.name,
                avatar: oauthUserInfo.avatar,
                raw_data: oauthUserInfo.raw_data,
                created_at: Date.now()
            };
            await bindsManage.create({
                oauth_name: oauthUserInfo.oauth_name,
                binds_user: username,
                binds_data: JSON.stringify(bindsData),
                is_enabled: 1
            });

            const secret = getJwtSecret(this.c);
            const now = Math.floor(Date.now() / 1000);
            const token = await generateJwt({
                sub: username, name: username, mask: '',
                iat: now, exp: now + 48 * 3600,
            }, secret);
            return { flag: true, text: "OAuth注册并登录成功", token, data: [newUserConfig] };
        } catch (error) {
            console.error("OAuth登录过程中发生错误:", error);
            return { flag: false, text: "OAuth登录失败，请稍后重试" };
        }
    }

    // ============================================================
    // 绑定 OAuth 账户
    // ============================================================
    async bindOAuth(username: string, oauthUserInfo: {
        oauth_name: string;
        oauth_user_id: string;
        email?: string;
        name?: string;
        avatar?: string;
        raw_data: string;
    }): Promise<UsersResult> {
        try {
            const db = new SavesManage(this.c);
            const bindsManage = new BindsManage(this.c);
            const userResult: DBResult = await db.find({ main: "users", keys: {"users_name": username} });
            if (userResult.data.length === 0) return { flag: false, text: "用户不存在" };

            const existingBindResult = await bindsManage.findByOAuthUserId(oauthUserInfo.oauth_name, oauthUserInfo.oauth_user_id);
            if (existingBindResult.flag && existingBindResult.data && existingBindResult.data.length > 0) {
                return { flag: false, text: "此OAuth账户已被其他用户绑定" };
            }
            const userBindResult = await bindsManage.select(oauthUserInfo.oauth_name, username);
            if (userBindResult.flag && userBindResult.data && userBindResult.data.length > 0) {
                return { flag: false, text: "您已绑定此OAuth提供商的账户" };
            }

            const bindsData: BindsData = {
                oauth_user_id: oauthUserInfo.oauth_user_id,
                email: oauthUserInfo.email,
                name: oauthUserInfo.name,
                avatar: oauthUserInfo.avatar,
                raw_data: oauthUserInfo.raw_data,
                created_at: Date.now()
            };
            return await bindsManage.create({
                oauth_name: oauthUserInfo.oauth_name,
                binds_user: username,
                binds_data: JSON.stringify(bindsData),
                is_enabled: 1
            });
        } catch (error) {
            console.error("绑定OAuth账户过程中发生错误:", error);
            return { flag: false, text: "绑定OAuth账户失败，请稍后重试" };
        }
    }

    // ============================================================
    // 解绑 OAuth 账户
    // ============================================================
    async unbindOAuth(username: string, oauthName: string, oauthUserId: string): Promise<UsersResult> {
        try {
            const db = new SavesManage(this.c);
            const bindsManage = new BindsManage(this.c);
            const userResult: DBResult = await db.find({ main: "users", keys: {"users_name": username} });
            if (userResult.data.length === 0) return { flag: false, text: "用户不存在" };

            const bindResult = await bindsManage.findByOAuthUserId(oauthName, oauthUserId);
            if (!bindResult.flag || !bindResult.data || bindResult.data.length === 0) {
                return { flag: false, text: "未找到要解绑的OAuth账户" };
            }
            const bind = bindResult.data[0];
            if (bind.binds_user !== username) return { flag: false, text: "无权解绑此OAuth账户" };

            return await bindsManage.remove(oauthName, username);
        } catch (error) {
            console.error("解绑OAuth账户过程中发生错误:", error);
            return { flag: false, text: "解绑OAuth账户失败，请稍后重试" };
        }
    }

    // ============================================================
    // 静态方法：检查认证（供中间件调用）
    // ============================================================
    static async checkAuth(c: Context): Promise<UsersResult> {
        try {
            const authHeader = c.req.header('Authorization');
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                return { flag: false, text: "用户未登录" };
            }
            const token = authHeader.replace('Bearer ', '').trim();
            const users = new UsersManage(c);
            const userInfo = await users.verifyToken(token);
            if (!userInfo) return { flag: false, text: "用户未登录" };
            return { flag: true, text: "权限验证成功", data: [userInfo] };
        } catch (error) {
            console.error("权限检查失败:", error);
            return { flag: false, text: "用户未登录" };
        }
    }

    // ============================================================
    // 判断用户是否为管理员
    // ============================================================
    static isAdmin(user: UsersConfig): boolean {
        if (!user) return false;
        return user.users_name === 'admin' ||
            user.users_mask === 'admin' ||
            (typeof user.users_mask === 'string' && user.users_mask.includes('admin'));
    }
}