/**
 * 认证 API 路由 — /api/auth/*、/api/me
 * 与 GO 后端 server/handles/auth.go 对齐
 *
 * 端点：
 *   POST /api/auth/login          — 明文密码登录（内部 SHA256 哈希）
 *   POST /api/auth/login/hash     — 已哈希密码登录
 *   GET  /api/auth/logout         — 登出
 *   POST /api/auth/2fa/generate   — 生成 TOTP 二维码
 *   POST /api/auth/2fa/verify     — 验证并绑定 2FA
 *   GET  /api/me                  — 获取当前用户信息
 *   POST /api/me/update           — 更新当前用户信息
 */
import type { Hono, Context } from 'hono';
import { UsersManage } from '../users/UsersManage';
import type { UsersConfig } from '../users/UsersObject';
import { successResp, errorResp } from '../types/HttpResponse';

const textEncoder = new TextEncoder();

function toArrayBuffer(data: Uint8Array): ArrayBuffer {
    return data.slice().buffer as ArrayBuffer;
}

function base64UrlEncode(data: Uint8Array): string {
    let binary = '';
    for (const byte of data) binary += String.fromCharCode(byte);
    return btoa(binary).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function base64UrlDecode(value: string): Uint8Array {
    const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
    const binary = atob(normalized + '='.repeat((4 - normalized.length % 4) % 4));
    return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function encodeBase32(data: Uint8Array): string {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let value = 0;
    let bits = 0;
    let output = '';
    for (const byte of data) {
        value = (value << 8) | byte;
        bits += 8;
        while (bits >= 5) {
            output += alphabet[(value >>> (bits - 5)) & 31];
            bits -= 5;
        }
    }
    if (bits > 0) output += alphabet[(value << (5 - bits)) & 31];
    return output;
}

function enrollmentSecret(c: Context): string {
    const secret = String(c.env.JWT_SECRET || '');
    if (secret.length < 16) throw new Error('JWT_SECRET_NOT_CONFIGURED');
    return secret;
}

async function signEnrollment(c: Context, username: string, secret: string): Promise<string> {
    const payload = base64UrlEncode(textEncoder.encode(JSON.stringify({
        sub: username,
        secret,
        exp: Math.floor(Date.now() / 1000) + 600,
    })));
    const key = await crypto.subtle.importKey(
        'raw', toArrayBuffer(textEncoder.encode(enrollmentSecret(c))), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
    );
    const signature = new Uint8Array(await crypto.subtle.sign('HMAC', key, textEncoder.encode(payload)));
    return `${payload}.${base64UrlEncode(signature)}`;
}

async function verifyEnrollment(c: Context, token: string, username: string): Promise<string | null> {
    try {
        const [payload, encodedSignature, extra] = token.split('.');
        if (!payload || !encodedSignature || extra) return null;
        const key = await crypto.subtle.importKey(
            'raw', toArrayBuffer(textEncoder.encode(enrollmentSecret(c))), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']
        );
        const valid = await crypto.subtle.verify(
            'HMAC', key, toArrayBuffer(base64UrlDecode(encodedSignature)), toArrayBuffer(textEncoder.encode(payload))
        );
        if (!valid) return null;
        const data = JSON.parse(new TextDecoder().decode(base64UrlDecode(payload)));
        if (data.sub !== username || typeof data.secret !== 'string' || data.exp < Math.floor(Date.now() / 1000)) {
            return null;
        }
        return data.secret;
    } catch {
        return null;
    }
}

const TOTP_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function decodeBase32(value: string): Uint8Array {
    const normalized = value.toUpperCase().replace(/[^A-Z2-7]/g, '');
    let buffer = 0;
    let bits = 0;
    const bytes: number[] = [];
    for (const char of normalized) {
        const index = TOTP_ALPHABET.indexOf(char);
        if (index < 0) continue;
        buffer = (buffer << 5) | index;
        bits += 5;
        if (bits >= 8) {
            bits -= 8;
            bytes.push((buffer >> bits) & 0xff);
        }
    }
    return new Uint8Array(bytes);
}

async function verifyTOTP(code: string, secret: string): Promise<boolean> {
    const keyBytes = decodeBase32(secret);
    if (!keyBytes.length) return false;
    const counter = Math.floor(Date.now() / 1000 / 30);
    const expected = code.replace(/\s/g, '');
    for (let offset = -1; offset <= 1; offset++) {
        const value = new ArrayBuffer(8);
        const view = new DataView(value);
        view.setUint32(0, Math.floor((counter + offset) / 0x100000000));
        view.setUint32(4, (counter + offset) >>> 0);
        const key = await crypto.subtle.importKey(
            'raw', toArrayBuffer(keyBytes), { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']
        );
        const digest = new Uint8Array(await crypto.subtle.sign('HMAC', key, value));
        const index = digest[digest.length - 1] & 0x0f;
        const binary = ((digest[index] & 0x7f) << 24) | (digest[index + 1] << 16) | (digest[index + 2] << 8) | digest[index + 3];
        if (String(binary % 1_000_000).padStart(6, '0') === expected) return true;
    }
    return false;
}

export function authRoutes(app: Hono<any>) {

    // ------------------------------------------------------------------
    // POST /api/auth/login — 明文密码登录
    // Body: { username: string, password: string, otp_code?: string }
    // ------------------------------------------------------------------
    app.post('/api/auth/login', async (c: Context): Promise<any> => {
        let body: any = {};
        try { body = await c.req.json(); } catch { return errorResp(c, 'common.invalid_json', 400); }

        const { username, password, otp_code } = body;
        if (!username || !password) return errorResp(c, 'auth.username_password_required', 400);

        const users = new UsersManage(c);
        const result = await users.log_in({ users_name: username, users_pass: password, otp_code } as UsersConfig);

        if (!result.flag) {
            // 402 需要 2FA，429 限流，其余 401 未授权
            const status = result.code === 402 ? 402 : (result.code === 429 ? 429 : 401);
            return errorResp(c, result.text || 'auth.login_failed', status);
        }
        return successResp(c, { token: result.token });
    });

    // ------------------------------------------------------------------
    // POST /api/auth/register — 用户注册（公开接口）
    // Body: { username: string, password: string, email?: string }
    // 安全修复 SEC-11: 注册前检查系统 allow_registration 开关
    // ------------------------------------------------------------------
    app.post('/api/auth/register', async (c: Context): Promise<any> => {
        let body: any = {};
        try { body = await c.req.json(); } catch { return errorResp(c, 'common.invalid_json', 400); }

        // 检查系统注册开关
        try {
            const { AdminManage } = await import('../admin/AdminManage');
            const adminManage = new AdminManage(c);
            const setting = await adminManage.select('allow_registration');
            const allowed = setting.data?.[0]?.admin_data;
            // 只有明确启用时允许注册，配置读取失败或缺失时安全拒绝。
            if (allowed !== 'true' && allowed !== '1') {
                return errorResp(c, 'auth.registration_closed', 403);
            }
        } catch { return errorResp(c, 'auth.registration_unavailable', 503); }

        const { username, password, email } = body;
        if (!username || !password) return errorResp(c, 'auth.username_password_required', 400);

        const users = new UsersManage(c);
        const result = await users.create({
            users_name: username,
            users_pass: password,
            users_mail: email || '',
        });

        if (!result.flag) return errorResp(c, result.text || 'auth.register_failed', 400);
        return successResp(c);
    });

    // ------------------------------------------------------------------
    // POST /api/auth/login/hash — 已哈希密码登录
    // Body: { username: string, password: string, otp_code?: string }
    // ------------------------------------------------------------------
    app.post('/api/auth/login/hash', async (c: Context): Promise<any> => {
        let body: any = {};
        try { body = await c.req.json(); } catch { return errorResp(c, 'common.invalid_json', 400); }

        const { username, password, otp_code } = body;
        if (!username || !password) return errorResp(c, 'auth.username_password_required', 400);

        const users = new UsersManage(c);
        const result = await users.log_in_hash(username, password, otp_code);

        if (!result.flag) {
            // 402 需要 2FA，429 限流，其余 401 未授权
            const status = result.code === 402 ? 402 : (result.code === 429 ? 429 : 401);
            return errorResp(c, result.text || 'auth.login_failed', status);
        }
        return successResp(c, { token: result.token });
    });

    // ------------------------------------------------------------------
    // GET /api/auth/logout — 登出
    // ------------------------------------------------------------------
    app.get('/api/auth/logout', async (c: Context): Promise<any> => {
        const authHeader = c.req.header('Authorization');
        const token = authHeader?.replace('Bearer ', '').trim();
        const users = new UsersManage(c);
        await users.logout(token);
        return successResp(c);
    });

    // ------------------------------------------------------------------
    // POST /api/auth/2fa/generate — 生成 TOTP 二维码
    // 需要登录
    // ------------------------------------------------------------------
    app.post('/api/auth/2fa/generate', async (c: Context): Promise<any> => {
        const user = c.get('user');
        if (!user) return errorResp(c, 'common.not_logged_in', 401);

        const secretBytes = new Uint8Array(20);
        crypto.getRandomValues(secretBytes);
        const secret = encodeBase32(secretBytes);
        const issuer = 'OpenList';
        const account = encodeURIComponent(user.users_name);
        const otpauthUri = `otpauth://totp/${issuer}:${account}?secret=${secret}&issuer=${issuer}&algorithm=SHA1&digits=6&period=30`;
        const enrollmentToken = await signEnrollment(c, user.users_name, secret);

        return successResp(c, {
            otpauth_uri: otpauthUri,
            secret,
            enrollment_token: enrollmentToken,
            expires_in: 600,
        });
    });

    // ------------------------------------------------------------------
    // POST /api/auth/2fa/verify — 验证并绑定 2FA
    // Body: { code: string, secret: string }
    // ------------------------------------------------------------------
    app.post('/api/auth/2fa/verify', async (c: Context): Promise<any> => {
        const user = c.get('user');
        if (!user) return errorResp(c, 'common.not_logged_in', 401);

        let body: any = {};
        try { body = await c.req.json(); } catch { return errorResp(c, 'common.invalid_json', 400); }

        const { code, enrollment_token: enrollmentToken } = body;
        if (!/^\d{6}$/.test(String(code || '')) || typeof enrollmentToken !== 'string') {
            return errorResp(c, 'auth.code_secret_required', 400);
        }

        const secret = await verifyEnrollment(c, enrollmentToken, user.users_name);
        if (!secret) return errorResp(c, 'auth.enrollment_expired', 400);

        const isValid = await verifyTOTP(String(code), secret);
        if (!isValid) return errorResp(c, 'auth.verify_code_error', 400);

        const users = new UsersManage(c);
        const updateResult = await users.config({
            users_name: user.users_name,
            otp_secret: secret,
        });

        if (!updateResult.flag) return errorResp(c, updateResult.text || 'common.save_failed', 500);
        return successResp(c);
    });

    // ------------------------------------------------------------------
    // POST /api/auth/2fa/disable — 停用 TOTP
    // 需要登录
    // ------------------------------------------------------------------
    app.post('/api/auth/2fa/disable', async (c: Context): Promise<any> => {
        const user = c.get('user');
        if (!user) return errorResp(c, 'common.not_logged_in', 401);

        const users = new UsersManage(c);
        const updateResult = await users.config({
            users_name: user.users_name,
            otp_secret: '' as any,
        });

        if (!updateResult.flag) {
            return errorResp(c, updateResult.text || 'auth.totp_disable_failed', 500);
        }

        return successResp(c, { message: '2FA disabled successfully' });
    });

    // ------------------------------------------------------------------
    // GET /api/me — 获取当前用户信息
    // ------------------------------------------------------------------
    app.get('/api/me', async (c: Context): Promise<any> => {
        const user = c.get('user');
        if (!user) return errorResp(c, 'common.not_logged_in', 401);

        // 不返回密码字段
        const { users_pass, ...safeUser } = user as any;
        return successResp(c, safeUser);
    });

    // ------------------------------------------------------------------
    // POST /api/me/update — 更新当前用户信息
    // Body: { email?: string, password?: string }
    // 注意：不允许修改用户名（防止权限提升攻击，SEC-02）
    // ------------------------------------------------------------------
    app.post('/api/me/update', async (c: Context): Promise<any> => {
        const user = c.get('user');
        if (!user) return errorResp(c, 'common.not_logged_in', 401);

        let body: any = {};
        try { body = await c.req.json(); } catch { return errorResp(c, 'common.invalid_json', 400); }

        // 安全限制：不允许修改用户名
        if (body.username && body.username !== user.users_name) {
            return errorResp(c, 'auth.username_immutable', 403);
        }

        const updateData: any = { users_name: user.users_name };
        // 仅允许修改邮箱和密码
        if (body.email !== undefined) updateData.users_mail = body.email;
        if (body.password) updateData.users_pass = body.password;

        const users = new UsersManage(c);
        const result = await users.config(updateData);
        if (!result.flag) return errorResp(c, result.text || 'common.update_failed', 500);
        return successResp(c);
    });

    // ------------------------------------------------------------------
    // GET /api/me/sshkey/list — 获取当前用户的 SSH 公钥列表
    // ------------------------------------------------------------------
    app.get('/api/me/sshkey/list', async (c: Context): Promise<any> => {
        const user = c.get('user');
        if (!user) return errorResp(c, 'common.not_logged_in', 401);

        return errorResp(c, 'auth.ssh_key_storage_not_configured', 501);
    });

    // ------------------------------------------------------------------
    // POST /api/me/sshkey/add — 添加 SSH 公钥
    // Body: { title: string, key: string }
    // ------------------------------------------------------------------
    app.post('/api/me/sshkey/add', async (c: Context): Promise<any> => {
        const user = c.get('user');
        if (!user) return errorResp(c, 'common.not_logged_in', 401);

        let body: any = {};
        try { body = await c.req.json(); } catch { return errorResp(c, 'common.invalid_json', 400); }

        const { title, key } = body;
        if (!key) return errorResp(c, 'auth.ssh_key_required', 400);

        // 简单校验：公钥格式
        const parts = key.trim().split(/\s+/);
        if (parts.length < 2) return errorResp(c, 'auth.ssh_key_invalid', 400);

        void title;
        return errorResp(c, 'auth.ssh_key_storage_not_configured', 501);
    });

    // ------------------------------------------------------------------
    // POST /api/me/sshkey/delete — 删除 SSH 公钥
    // Body: { id: number }
    // ------------------------------------------------------------------
    app.post('/api/me/sshkey/delete', async (c: Context): Promise<any> => {
        const user = c.get('user');
        if (!user) return errorResp(c, 'common.not_logged_in', 401);

        let body: any = {};
        try { body = await c.req.json(); } catch { return errorResp(c, 'common.invalid_json', 400); }

        const { id } = body;
        if (!id) return errorResp(c, 'common.id_required', 400);

        return errorResp(c, 'auth.ssh_key_storage_not_configured', 501);
    });
}