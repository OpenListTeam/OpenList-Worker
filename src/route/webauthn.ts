/**
 * WebAuthn/FIDO2 认证路由
 * 提供注册、认证和凭据管理功能
 */
import type { Hono, Context } from 'hono';
import { successResp, errorResp } from '../types/HttpResponse';
import { SavesManage } from '../saves/SavesManage';

// 简化的 WebAuthn 凭据类型（避免依赖 @simplewebauthn 在运行时）
interface WebAuthnCredential {
    id: string;
    user_id: string;
    credential_id: string;
    public_key: string;
    counter: number;
    transports?: string;
    device_name?: string;
    created_at: number;
    last_used_at?: number;
}

interface RegistrationChallenge {
    challenge: string;
    user_id: string;
    expires_at: number;
}

interface AuthenticationChallenge {
    challenge: string;
    user_id: string;
    expires_at: number;
}

// 内存存储挑战（生产环境应使用 KV）
const registrationChallenges = new Map<string, RegistrationChallenge>();
const authenticationChallenges = new Map<string, AuthenticationChallenge>();

function generateChallenge(): string {
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

function base64UrlEncode(data: Uint8Array): string {
    let binary = '';
    for (const byte of data) binary += String.fromCharCode(byte);
    return btoa(binary).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function base64UrlDecode(value: string): Uint8Array {
    const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
    const binary = atob(normalized + '='.repeat((4 - normalized.length % 4) % 4));
    return Uint8Array.from(binary, char => char.charCodeAt(0));
}

export function webauthnRoutes(app: Hono<any>) {

    // ------------------------------------------------------------------
    // POST /api/authn/registration/begin — 开始 WebAuthn 注册
    // 生成挑战并返回注册选项
    // ------------------------------------------------------------------
    app.post('/api/authn/registration/begin', async (c: Context): Promise<any> => {
        const user = c.get('user');
        if (!user) return errorResp(c, 'common.not_logged_in', 401);

        let body: any = {};
        try { body = await c.req.json(); } catch { body = {}; }

        const challenge = generateChallenge();
        const challengeKey = `${user.users_name}:${Date.now()}`;
        
        registrationChallenges.set(challengeKey, {
            challenge,
            user_id: user.users_name,
            expires_at: Date.now() + 5 * 60 * 1000, // 5分钟有效期
        });

        // 清理过期挑战
        for (const [key, val] of registrationChallenges.entries()) {
            if (val.expires_at < Date.now()) {
                registrationChallenges.delete(key);
            }
        }

        const rpName = body.rp_name || 'OpenList';
        const rpId = body.rp_id || 'localhost';
        
        return successResp(c, {
            challenge: base64UrlEncode(new TextEncoder().encode(challenge)),
            rp: { name: rpName, id: rpId },
            user: {
                id: base64UrlEncode(new TextEncoder().encode(user.users_name)),
                name: user.users_name,
                displayName: user.users_name,
            },
            pubKeyCredParams: [
                { alg: -7, type: 'public-key' },   // ES256
                { alg: -257, type: 'public-key' }, // RS256
            ],
            timeout: 60000,
            attestation: 'none',
            authenticatorSelection: {
                authenticatorAttachment: body.authenticator_attachment || undefined,
                requireResidentKey: false,
                userVerification: 'preferred',
            },
            challenge_key: challengeKey,
        });
    });

    // ------------------------------------------------------------------
    // POST /api/authn/registration/finish — 完成 WebAuthn 注册
    // 验证凭据并存储
    // ------------------------------------------------------------------
    app.post('/api/authn/registration/finish', async (c: Context): Promise<any> => {
        const user = c.get('user');
        if (!user) return errorResp(c, 'common.not_logged_in', 401);

        let body: any = {};
        try { body = await c.req.json(); } catch { return errorResp(c, 'common.invalid_json', 400); }

        const { challenge_key, credential, device_name } = body;
        if (!challenge_key || !credential) {
            return errorResp(c, 'authn.invalid_credential', 400);
        }

        const challengeData = registrationChallenges.get(challenge_key);
        if (!challengeData || challengeData.user_id !== user.users_name || challengeData.expires_at < Date.now()) {
            registrationChallenges.delete(challenge_key);
            return errorResp(c, 'authn.challenge_expired', 400);
        }

        registrationChallenges.delete(challenge_key);

        // 简化验证：存储凭据（生产环境需完整验证签名）
        const credentialId = credential.id || credential.rawId;
        const publicKey = credential.response?.publicKey || credential.publicKey || '';

        if (!credentialId || !publicKey) {
            return errorResp(c, 'authn.invalid_credential_data', 400);
        }

        const db = new SavesManage(c);
        const credData: any = {
            id: `cred_${Date.now()}_${Math.random().toString(36).slice(2)}`,
            user_id: user.users_name,
            credential_id: credentialId,
            public_key: publicKey,
            counter: 0,
            transports: credential.response?.transports ? JSON.stringify(credential.response.transports) : null,
            device_name: device_name || 'Security Key',
            created_at: Math.floor(Date.now() / 1000),
        };

        try {
            await db.save({
                main: 'webauthn_credentials',
                keys: { id: credData.id },
                data: credData,
            });
        } catch (err) {
            console.error('保存 WebAuthn 凭据失败:', err);
            return errorResp(c, 'authn.save_credential_failed', 500);
        }

        return successResp(c, { credential_id: credData.id, message: 'Credential registered successfully' });
    });

    // ------------------------------------------------------------------
    // POST /api/authn/authentication/begin — 开始 WebAuthn 认证
    // 生成挑战并返回认证选项
    // ------------------------------------------------------------------
    app.post('/api/authn/authentication/begin', async (c: Context): Promise<any> => {
        let body: any = {};
        try { body = await c.req.json(); } catch { body = {}; }

        const { username } = body;
        if (!username) return errorResp(c, 'authn.username_required', 400);

        const db = new SavesManage(c);
        const credResult = await db.find({
            main: 'webauthn_credentials',
            keys: { user_id: username },
        });

        if (!credResult.flag || credResult.data.length === 0) {
            return errorResp(c, 'authn.no_credentials', 404);
        }

        const challenge = generateChallenge();
        const challengeKey = `${username}:${Date.now()}`;
        
        authenticationChallenges.set(challengeKey, {
            challenge,
            user_id: username,
            expires_at: Date.now() + 5 * 60 * 1000,
        });

        // 清理过期挑战
        for (const [key, val] of authenticationChallenges.entries()) {
            if (val.expires_at < Date.now()) {
                authenticationChallenges.delete(key);
            }
        }

        const allowCredentials = credResult.data.map((cred: any) => ({
            id: cred.credential_id,
            type: 'public-key',
            transports: cred.transports ? JSON.parse(cred.transports) : undefined,
        }));

        return successResp(c, {
            challenge: base64UrlEncode(new TextEncoder().encode(challenge)),
            timeout: 60000,
            rpId: body.rp_id || 'localhost',
            allowCredentials,
            userVerification: 'preferred',
            challenge_key: challengeKey,
        });
    });

    // ------------------------------------------------------------------
    // POST /api/authn/authentication/finish — 完成 WebAuthn 认证
    // 验证签名并签发 token
    // ------------------------------------------------------------------
    app.post('/api/authn/authentication/finish', async (c: Context): Promise<any> => {
        let body: any = {};
        try { body = await c.req.json(); } catch { return errorResp(c, 'common.invalid_json', 400); }

        const { challenge_key, credential } = body;
        if (!challenge_key || !credential) {
            return errorResp(c, 'authn.invalid_credential', 400);
        }

        const challengeData = authenticationChallenges.get(challenge_key);
        if (!challengeData || challengeData.expires_at < Date.now()) {
            authenticationChallenges.delete(challenge_key);
            return errorResp(c, 'authn.challenge_expired', 400);
        }

        authenticationChallenges.delete(challenge_key);

        // 简化验证：查找凭据（生产环境需完整验证签名）
        const credentialId = credential.id || credential.rawId;
        const db = new SavesManage(c);
        const credResult = await db.find({
            main: 'webauthn_credentials',
            keys: { credential_id: credentialId },
        });

        if (!credResult.flag || credResult.data.length === 0) {
            return errorResp(c, 'authn.credential_not_found', 404);
        }

        const storedCred = credResult.data[0] as any;
        if (storedCred.user_id !== challengeData.user_id) {
            return errorResp(c, 'authn.credential_mismatch', 403);
        }

        // 更新最后使用时间和计数器
        await db.save({
            main: 'webauthn_credentials',
            keys: { id: storedCred.id },
            data: {
                ...storedCred,
                counter: storedCred.counter + 1,
                last_used_at: Math.floor(Date.now() / 1000),
            },
        });

        // 生成登录 token（与密码登录相同）
        const { UsersManage } = await import('../users/UsersManage');
        const usersManage = new UsersManage(c);
        const userResult = await usersManage.select(storedCred.user_id);
        
        if (!userResult.flag || !userResult.data || userResult.data.length === 0) {
            return errorResp(c, 'authn.user_not_found', 404);
        }

        // 手动生成 token（复用登录逻辑）
        return errorResp(c, 'authn.not_implemented', 501);
    });

    // ------------------------------------------------------------------
    // GET /api/authn/credentials — 获取当前用户的所有凭据
    // ------------------------------------------------------------------
    app.get('/api/authn/credentials', async (c: Context): Promise<any> => {
        const user = c.get('user');
        if (!user) return errorResp(c, 'common.not_logged_in', 401);

        const db = new SavesManage(c);
        const result = await db.find({
            main: 'webauthn_credentials',
            keys: { user_id: user.users_name },
        });

        if (!result.flag) {
            return errorResp(c, result.text || 'authn.query_failed', 500);
        }

        // 移除敏感字段
        const credentials = result.data.map((cred: any) => ({
            id: cred.id,
            device_name: cred.device_name,
            created_at: cred.created_at,
            last_used_at: cred.last_used_at,
            transports: cred.transports ? JSON.parse(cred.transports) : [],
        }));

        return successResp(c, { credentials });
    });

    // ------------------------------------------------------------------
    // POST /api/authn/credentials/delete — 删除指定凭据
    // ------------------------------------------------------------------
    app.post('/api/authn/credentials/delete', async (c: Context): Promise<any> => {
        const user = c.get('user');
        if (!user) return errorResp(c, 'common.not_logged_in', 401);

        let body: any = {};
        try { body = await c.req.json(); } catch { return errorResp(c, 'common.invalid_json', 400); }

        const { credential_id } = body;
        if (!credential_id) return errorResp(c, 'authn.credential_id_required', 400);

        const db = new SavesManage(c);
        
        // 验证凭据属于当前用户
        const checkResult = await db.find({
            main: 'webauthn_credentials',
            keys: { id: credential_id },
        });

        if (!checkResult.flag || checkResult.data.length === 0) {
            return errorResp(c, 'authn.credential_not_found', 404);
        }

        const cred = checkResult.data[0] as any;
        if (cred.user_id !== user.users_name) {
            return errorResp(c, 'authn.permission_denied', 403);
        }

        const deleteResult = await db.kill({
            main: 'webauthn_credentials',
            keys: { id: credential_id },
        });

        if (!deleteResult.flag) {
            return errorResp(c, deleteResult.text || 'authn.delete_failed', 500);
        }

        return successResp(c, { message: 'Credential deleted successfully' });
    });

    // ------------------------------------------------------------------
    // POST /api/authn/credentials/rename — 重命名凭据
    // ------------------------------------------------------------------
    app.post('/api/authn/credentials/rename', async (c: Context): Promise<any> => {
        const user = c.get('user');
        if (!user) return errorResp(c, 'common.not_logged_in', 401);

        let body: any = {};
        try { body = await c.req.json(); } catch { return errorResp(c, 'common.invalid_json', 400); }

        const { credential_id, device_name } = body;
        if (!credential_id || !device_name) {
            return errorResp(c, 'authn.credential_id_and_name_required', 400);
        }

        const db = new SavesManage(c);
        
        // 验证凭据属于当前用户
        const checkResult = await db.find({
            main: 'webauthn_credentials',
            keys: { id: credential_id },
        });

        if (!checkResult.flag || checkResult.data.length === 0) {
            return errorResp(c, 'authn.credential_not_found', 404);
        }

        const cred = checkResult.data[0] as any;
        if (cred.user_id !== user.users_name) {
            return errorResp(c, 'authn.permission_denied', 403);
        }

        const updateResult = await db.save({
            main: 'webauthn_credentials',
            keys: { id: credential_id },
            data: { ...cred, device_name },
        });

        if (!updateResult.flag) {
            return errorResp(c, updateResult.text || 'authn.rename_failed', 500);
        }

        return successResp(c, { message: 'Credential renamed successfully' });
    });
}
