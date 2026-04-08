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
import { successResp, errorResp } from '../types/HttpResponse';

export function authRoutes(app: Hono<any>) {

    // ------------------------------------------------------------------
    // POST /api/auth/login — 明文密码登录
    // Body: { username: string, password: string, otp_code?: string }
    // ------------------------------------------------------------------
    app.post('/api/auth/login', async (c: Context): Promise<any> => {
        let body: any = {};
        try { body = await c.req.json(); } catch { return errorResp(c, '请求体格式错误', 400); }

        const { username, password } = body;
        if (!username || !password) return errorResp(c, '用户名和密码不能为空', 400);

        const users = new UsersManage(c);
        const result = await users.log_in({ users_name: username, users_pass: password });

        if (!result.flag) {
            const status = result.code === 429 ? 429 : 401;
            return errorResp(c, result.text || '用户名或密码错误', status);
        }
        return successResp(c, { token: result.token });
    });

    // ------------------------------------------------------------------
    // POST /api/auth/register — 用户注册（公开接口）
    // Body: { username: string, password: string, email?: string }
    // ------------------------------------------------------------------
    app.post('/api/auth/register', async (c: Context): Promise<any> => {
        let body: any = {};
        try { body = await c.req.json(); } catch { return errorResp(c, '请求体格式错误', 400); }

        const { username, password, email } = body;
        if (!username || !password) return errorResp(c, '用户名和密码不能为空', 400);

        const users = new UsersManage(c);
        const result = await users.create({
            users_name: username,
            users_pass: password,
            users_mail: email || '',
        });

        if (!result.flag) return errorResp(c, result.text || '注册失败', 400);
        return successResp(c);
    });

    // ------------------------------------------------------------------
    // POST /api/auth/login/hash — 已哈希密码登录
    // Body: { username: string, password: string, otp_code?: string }
    // ------------------------------------------------------------------
    app.post('/api/auth/login/hash', async (c: Context): Promise<any> => {
        let body: any = {};
        try { body = await c.req.json(); } catch { return errorResp(c, '请求体格式错误', 400); }

        const { username, password } = body;
        if (!username || !password) return errorResp(c, '用户名和密码不能为空', 400);

        const users = new UsersManage(c);
        const result = await users.log_in_hash(username, password);

        if (!result.flag) {
            const status = result.code === 429 ? 429 : 401;
            return errorResp(c, result.text || '用户名或密码错误', status);
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
        if (!user) return errorResp(c, '未登录', 401);

        // 生成 TOTP 密钥（32 字节 base32）
        const secretBytes = new Uint8Array(20);
        crypto.getRandomValues(secretBytes);
        const base32Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
        let secret = '';
        for (let i = 0; i < secretBytes.length; i++) {
            secret += base32Chars[secretBytes[i] % 32];
        }

        // 生成 otpauth URI
        const issuer = 'OpenList';
        const account = encodeURIComponent(user.users_name);
        const otpauthUri = `otpauth://totp/${issuer}:${account}?secret=${secret}&issuer=${issuer}&algorithm=SHA1&digits=6&period=30`;

        // 生成二维码 URL（使用 Google Charts API）
        const qrUrl = `https://chart.googleapis.com/chart?chs=200x200&chld=M|0&cht=qr&chl=${encodeURIComponent(otpauthUri)}`;

        return successResp(c, { qr: qrUrl, secret });
    });

    // ------------------------------------------------------------------
    // POST /api/auth/2fa/verify — 验证并绑定 2FA
    // Body: { code: string, secret: string }
    // ------------------------------------------------------------------
    app.post('/api/auth/2fa/verify', async (c: Context): Promise<any> => {
        const user = c.get('user');
        if (!user) return errorResp(c, '未登录', 401);

        let body: any = {};
        try { body = await c.req.json(); } catch { return errorResp(c, '请求体格式错误', 400); }

        const { code, secret } = body;
        if (!code || !secret) return errorResp(c, 'code 和 secret 不能为空', 400);

        // 验证 TOTP 代码
        const isValid = await verifyTOTP(code, secret);
        if (!isValid) return errorResp(c, '验证码错误', 400);

        // 将 secret 保存到用户记录
        const users = new UsersManage(c);
        const updateResult = await users.config({
            users_name: user.users_name,
            otp_secret: secret,
        } as any);

        if (!updateResult.flag) return errorResp(c, updateResult.text || '保存失败', 500);
        return successResp(c);
    });

    // ------------------------------------------------------------------
    // GET /api/me — 获取当前用户信息
    // ------------------------------------------------------------------
    app.get('/api/me', async (c: Context): Promise<any> => {
        const user = c.get('user');
        if (!user) return errorResp(c, '未登录', 401);

        // 不返回密码字段
        const { users_pass, ...safeUser } = user as any;
        return successResp(c, safeUser);
    });

    // ------------------------------------------------------------------
    // POST /api/me/update — 更新当前用户信息
    // Body: { username?: string, password?: string, sso_id?: string }
    // ------------------------------------------------------------------
    app.post('/api/me/update', async (c: Context): Promise<any> => {
        const user = c.get('user');
        if (!user) return errorResp(c, '未登录', 401);

        let body: any = {};
        try { body = await c.req.json(); } catch { return errorResp(c, '请求体格式错误', 400); }

        const updateData: any = { users_name: user.users_name };
        if (body.username) updateData.users_name = body.username;
        if (body.password) updateData.users_pass = body.password;

        const users = new UsersManage(c);
        const result = await users.config(updateData);
        if (!result.flag) return errorResp(c, result.text || '更新失败', 500);
        return successResp(c);
    });
}

// ============================================================
// TOTP 验证（RFC 6238）
// ============================================================
async function verifyTOTP(code: string, secret: string): Promise<boolean> {
    try {
        const now = Math.floor(Date.now() / 1000);
        // 检查当前时间窗口及前后各一个窗口（容忍时钟偏差）
        for (const offset of [-1, 0, 1]) {
            const counter = Math.floor(now / 30) + offset;
            const expected = await generateTOTP(secret, counter);
            if (expected === code) return true;
        }
        return false;
    } catch {
        return false;
    }
}

async function generateTOTP(secret: string, counter: number): Promise<string> {
    // Base32 解码
    const base32Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    const cleanSecret = secret.toUpperCase().replace(/=+$/, '');
    let bits = 0, value = 0;
    const bytes: number[] = [];
    for (const char of cleanSecret) {
        const idx = base32Chars.indexOf(char);
        if (idx === -1) continue;
        value = (value << 5) | idx;
        bits += 5;
        if (bits >= 8) {
            bytes.push((value >>> (bits - 8)) & 0xff);
            bits -= 8;
        }
    }

    // HMAC-SHA1
    const keyBytes = new Uint8Array(bytes);
    const counterBytes = new Uint8Array(8);
    const view = new DataView(counterBytes.buffer);
    view.setUint32(4, counter & 0xffffffff);

    const key = await crypto.subtle.importKey('raw', keyBytes, { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']);
    const sig = await crypto.subtle.sign('HMAC', key, counterBytes);
    const sigBytes = new Uint8Array(sig);

    // Dynamic truncation
    const offset = sigBytes[19] & 0xf;
    const code = ((sigBytes[offset] & 0x7f) << 24) |
                 ((sigBytes[offset + 1] & 0xff) << 16) |
                 ((sigBytes[offset + 2] & 0xff) << 8) |
                 (sigBytes[offset + 3] & 0xff);

    return (code % 1000000).toString().padStart(6, '0');
}
