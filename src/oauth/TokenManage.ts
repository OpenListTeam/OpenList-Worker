import { Context } from "hono";
import { sign, verify } from 'hono/jwt';
import { SavesManage } from "../saves/SavesManage";
import { DBResult } from "../saves/SavesObject";
import { OauthManage } from "./OauthManage";
import { OauthConfig } from "./OauthObject";
import { UsersManage } from "../users/UsersManage";
import { BindsManage } from "../binds/BindsManage";
import { BindsData } from "../binds/BindsObject";

export interface OauthTokenData {
    oauth_name: string;
    user_id?: string;
    access_token: string;
    refresh_token?: string;
    expires_at: number;
    scope?: string;
    token_type: string;
    created_at: number;
}

export interface OauthTokenResult {
    flag: boolean;
    text: string;
    data?: OauthTokenData[];
    token?: string;
}

export interface OauthAuthRequest {
    oauth_name: string;
    code: string;
    state?: string;
    redirect_uri?: string;
}

export interface OauthUserInfo {
    oauth_name: string;
    oauth_user_id: string;
    email?: string;
    name?: string;
    avatar?: string;
    raw_data: string;
}

export class TokenManage {
    private c: Context;
    private d: SavesManage;
    private JWT_SECRET: string;

    constructor(c: Context) {
        this.c = c;
        this.d = new SavesManage(c);
        this.JWT_SECRET = process.env.JWT_SECRET || 'oauth_default_secret_key_change_in_production';
    }

    /**
     * 生成OAuth授权URL
     * @param oauth_name - OAuth配置名称
     * @param redirect_uri - 回调地址
     * @param state - 状态参数
     * @returns 返回授权URL
     */
    async generateAuthUrl(oauth_name: string, redirect_uri: string, state?: string): Promise<OauthTokenResult> {
        try {
            const oauthManage = new OauthManage(this.c);
            const configResult = await oauthManage.select(oauth_name);
            
            if (!configResult.flag || !configResult.data || configResult.data.length === 0) {
                return { flag: false, text: "OAuth配置不存在" };
            }

            const config = configResult.data[0];
            if (config.is_enabled !== 1) {
                return { flag: false, text: "OAuth配置已禁用" };
            }

            let oauthData;
            try {
                oauthData = JSON.parse(config.oauth_data);
            } catch (error) {
                return { flag: false, text: "OAuth配置数据格式错误" };
            }

            if (!oauthData.client_id) {
                return { flag: false, text: "OAuth配置缺少client_id" };
            }

            // 根据不同的OAuth类型生成授权URL
            let authUrl = '';
            const params = new URLSearchParams({
                client_id: oauthData.client_id,
                redirect_uri: redirect_uri,
                response_type: 'code',
                state: state || crypto.randomUUID()
            });

            switch (config.oauth_type.toLowerCase()) {
                case 'google':
                    params.append('scope', oauthData.scope || 'openid email profile');
                    authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
                    break;
                case 'github':
                    params.append('scope', oauthData.scope || 'user:email');
                    authUrl = `https://github.com/login/oauth/authorize?${params.toString()}`;
                    break;
                case 'microsoft':
                    params.append('scope', oauthData.scope || 'openid email profile');
                    authUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params.toString()}`;
                    break;
                default:
                    return { flag: false, text: `不支持的OAuth类型: ${config.oauth_type}` };
            }

            return {
                flag: true,
                text: "授权URL生成成功",
                data: [{
                    oauth_name: oauth_name,
                    access_token: authUrl,
                    token_type: 'auth_url',
                    expires_at: Date.now() + 600000, // 10分钟有效期
                    created_at: Date.now()
                }]
            };

        } catch (error) {
            console.error("生成OAuth授权URL错误:", error);
            return { flag: false, text: "生成授权URL失败" };
        }
    }

    /**
     * 处理OAuth回调，交换access token
     * @param authRequest - 授权请求数据
     * @returns 返回token信息和用户登录token
     */
    async handleCallback(authRequest: OauthAuthRequest): Promise<OauthTokenResult> {
        try {
            const oauthManage = new OauthManage(this.c);
            const configResult = await oauthManage.select(authRequest.oauth_name);
            
            if (!configResult.flag || !configResult.data || configResult.data.length === 0) {
                return { flag: false, text: "OAuth配置不存在" };
            }

            const config = configResult.data[0];
            if (config.is_enabled !== 1) {
                return { flag: false, text: "OAuth配置已禁用" };
            }

            let oauthData;
            try {
                oauthData = JSON.parse(config.oauth_data);
            } catch (error) {
                return { flag: false, text: "OAuth配置数据格式错误" };
            }

            // 交换access token
            const tokenResult = await this.exchangeCodeForToken(config, oauthData, authRequest);
            if (!tokenResult.flag) {
                return tokenResult;
            }

            const tokenData = tokenResult.data![0];

            // 获取用户信息
            const userInfoResult = await this.getUserInfo(config, tokenData.access_token);
            if (!userInfoResult.flag) {
                return { flag: false, text: userInfoResult.text };
            }

            const userInfo = userInfoResult.data![0];

            // 使用用户管理进行OAuth登录
            const usersManage = new UsersManage(this.c);
            const loginResult = await usersManage.oauthLogin({
                oauth_name: config.oauth_name,
                oauth_user_id: userInfo.oauth_user_id,
                email: userInfo.email,
                name: userInfo.name,
                avatar: userInfo.avatar,
                raw_data: userInfo.raw_data
            });

            if (!loginResult.flag) {
                return { flag: false, text: loginResult.text };
            }

            // 保存token到数据库（关联用户）
            tokenData.user_id = loginResult.data![0].users_name;
            const saveResult = await this.saveToken(tokenData);
            if (!saveResult.flag) {
                return saveResult;
            }

            // 返回用户登录token
            return {
                flag: true,
                text: loginResult.text,
                token: loginResult.token,
                data: loginResult.data
            };

        } catch (error) {
            console.error("处理OAuth回调错误:", error);
            return { flag: false, text: "处理OAuth回调失败" };
        }
    }

    /**
     * 交换授权码为访问令牌
     */
    private async exchangeCodeForToken(config: OauthConfig, oauthData: any, authRequest: OauthAuthRequest): Promise<OauthTokenResult> {
        try {
            let tokenUrl = '';
            let requestBody: any = {
                client_id: oauthData.client_id,
                client_secret: oauthData.client_secret,
                code: authRequest.code,
                grant_type: 'authorization_code'
            };

            if (authRequest.redirect_uri) {
                requestBody.redirect_uri = authRequest.redirect_uri;
            }

            switch (config.oauth_type.toLowerCase()) {
                case 'google':
                    tokenUrl = 'https://oauth2.googleapis.com/token';
                    break;
                case 'github':
                    tokenUrl = 'https://github.com/login/oauth/access_token';
                    break;
                case 'microsoft':
                    tokenUrl = 'https://login.microsoftonline.com/common/oauth2/v2.0/token';
                    break;
                default:
                    return { flag: false, text: `不支持的OAuth类型: ${config.oauth_type}` };
            }

            const response = await fetch(tokenUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Accept': 'application/json'
                },
                body: new URLSearchParams(requestBody).toString()
            });

            if (!response.ok) {
                return { flag: false, text: `获取访问令牌失败: ${response.statusText}` };
            }

            const tokenData = await response.json();
            
            if (tokenData.error) {
                return { flag: false, text: `OAuth错误: ${tokenData.error_description || tokenData.error}` };
            }

            const tokenInfo: OauthTokenData = {
                oauth_name: config.oauth_name,
                access_token: tokenData.access_token,
                refresh_token: tokenData.refresh_token,
                expires_at: Date.now() + (tokenData.expires_in * 1000),
                scope: tokenData.scope,
                token_type: tokenData.token_type || 'Bearer',
                created_at: Date.now()
            };

            return {
                flag: true,
                text: "获取访问令牌成功",
                data: [tokenInfo]
            };

        } catch (error) {
            console.error("交换访问令牌错误:", error);
            return { flag: false, text: "交换访问令牌失败" };
        }
    }

    /**
     * 保存token到数据库
     */
    private async saveToken(tokenData: OauthTokenData): Promise<OauthTokenResult> {
        try {
            const result: DBResult = await this.d.save({
                main: "oauth_tokens",
                data: tokenData
            });

            return {
                flag: result.flag,
                text: result.text,
                data: result.flag ? [tokenData] : undefined
            };

        } catch (error) {
            console.error("保存OAuth token错误:", error);
            return { flag: false, text: "保存token失败" };
        }
    }

    /**
     * 获取用户的OAuth token
     */
    async getUserTokens(user_id?: string, oauth_name?: string): Promise<OauthTokenResult> {
        try {
            let keys: any = {};
            if (user_id) keys.user_id = user_id;
            if (oauth_name) keys.oauth_name = oauth_name;

            const result: DBResult = await this.d.find({
                main: "oauth_tokens",
                keys: keys
            });

            const tokens: OauthTokenData[] = result.data.map(item => item as OauthTokenData);

            return {
                flag: result.flag,
                text: result.text,
                data: tokens
            };

        } catch (error) {
            console.error("获取OAuth tokens错误:", error);
            return { flag: false, text: "获取tokens失败" };
        }
    }

    /**
     * 刷新访问令牌
     */
    async refreshToken(oauth_name: string, refresh_token: string): Promise<OauthTokenResult> {
        try {
            const oauthManage = new OauthManage(this.c);
            const configResult = await oauthManage.select(oauth_name);
            
            if (!configResult.flag || !configResult.data || configResult.data.length === 0) {
                return { flag: false, text: "OAuth配置不存在" };
            }

            const config = configResult.data[0];
            let oauthData;
            try {
                oauthData = JSON.parse(config.oauth_data);
            } catch (error) {
                return { flag: false, text: "OAuth配置数据格式错误" };
            }

            let tokenUrl = '';
            let requestBody: any = {
                client_id: oauthData.client_id,
                client_secret: oauthData.client_secret,
                refresh_token: refresh_token,
                grant_type: 'refresh_token'
            };

            switch (config.oauth_type.toLowerCase()) {
                case 'google':
                    tokenUrl = 'https://oauth2.googleapis.com/token';
                    break;
                case 'github':
                    // GitHub不支持refresh token
                    return { flag: false, text: "GitHub不支持刷新令牌" };
                case 'microsoft':
                    tokenUrl = 'https://login.microsoftonline.com/common/oauth2/v2.0/token';
                    break;
                default:
                    return { flag: false, text: `不支持的OAuth类型: ${config.oauth_type}` };
            }

            const response = await fetch(tokenUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Accept': 'application/json'
                },
                body: new URLSearchParams(requestBody).toString()
            });

            if (!response.ok) {
                return { flag: false, text: `刷新访问令牌失败: ${response.statusText}` };
            }

            const tokenData = await response.json();
            
            if (tokenData.error) {
                return { flag: false, text: `OAuth错误: ${tokenData.error_description || tokenData.error}` };
            }

            const newTokenInfo: OauthTokenData = {
                oauth_name: oauth_name,
                access_token: tokenData.access_token,
                refresh_token: tokenData.refresh_token || refresh_token,
                expires_at: Date.now() + (tokenData.expires_in * 1000),
                scope: tokenData.scope,
                token_type: tokenData.token_type || 'Bearer',
                created_at: Date.now()
            };

            // 更新数据库中的token
            await this.saveToken(newTokenInfo);

            return {
                flag: true,
                text: "刷新访问令牌成功",
                data: [newTokenInfo]
            };

        } catch (error) {
            console.error("刷新OAuth token错误:", error);
            return { flag: false, text: "刷新token失败" };
        }
    }

    /**
     * 验证访问令牌
     */
    async validateToken(oauth_name: string, access_token: string): Promise<OauthTokenResult> {
        try {
            // 从数据库查找token
            const result: DBResult = await this.d.find({
                main: "oauth_tokens",
                keys: { oauth_name: oauth_name, access_token: access_token }
            });

            if (result.data.length === 0) {
                return { flag: false, text: "访问令牌不存在" };
            }

            const tokenData = result.data[0] as OauthTokenData;

            // 检查token是否过期
            if (tokenData.expires_at < Date.now()) {
                return { flag: false, text: "访问令牌已过期" };
            }

            return {
                flag: true,
                text: "访问令牌有效",
                data: [tokenData]
            };

        } catch (error) {
            console.error("验证OAuth token错误:", error);
            return { flag: false, text: "验证token失败" };
        }
    }

    /**
     * 撤销访问令牌
     */
    async revokeToken(oauth_name: string, access_token: string): Promise<OauthTokenResult> {
        try {
            const result: DBResult = await this.d.kill({
                main: "oauth_tokens",
                keys: { oauth_name: oauth_name, access_token: access_token }
            });

            return {
                flag: result.flag,
                text: result.flag ? "访问令牌已撤销" : "撤销访问令牌失败"
            };

        } catch (error) {
            console.error("撤销OAuth token错误:", error);
            return { flag: false, text: "撤销token失败" };
        }
    }

    /**
     * 获取OAuth用户信息
     */
    async getUserInfo(config: OauthConfig, accessToken: string): Promise<{ flag: boolean; text: string; data?: OauthUserInfo[] }> {
        try {
            let userInfoUrl = '';
            let headers: any = {
                'Authorization': `Bearer ${accessToken}`,
                'Accept': 'application/json'
            };

            switch (config.oauth_type.toLowerCase()) {
                case 'google':
                    userInfoUrl = 'https://www.googleapis.com/oauth2/v2/userinfo';
                    break;
                case 'github':
                    userInfoUrl = 'https://api.github.com/user';
                    break;
                case 'microsoft':
                    userInfoUrl = 'https://graph.microsoft.com/v1.0/me';
                    break;
                default:
                    return { flag: false, text: `不支持的OAuth类型: ${config.oauth_type}` };
            }

            const response = await fetch(userInfoUrl, {
                method: 'GET',
                headers: headers
            });

            if (!response.ok) {
                return { flag: false, text: `获取用户信息失败: ${response.statusText}` };
            }

            const userData = await response.json();

            // 根据不同的OAuth提供商解析用户信息
            let userInfo: OauthUserInfo;
            switch (config.oauth_type.toLowerCase()) {
                case 'google':
                    userInfo = {
                        oauth_name: config.oauth_name,
                        oauth_user_id: userData.id,
                        email: userData.email,
                        name: userData.name,
                        avatar: userData.picture,
                        raw_data: JSON.stringify(userData)
                    };
                    break;
                case 'github':
                    // GitHub需要额外获取邮箱信息
                    let email = userData.email;
                    if (!email) {
                        try {
                            const emailResponse = await fetch('https://api.github.com/user/emails', {
                                headers: headers
                            });
                            if (emailResponse.ok) {
                                const emails = await emailResponse.json();
                                const primaryEmail = emails.find((e: any) => e.primary);
                                email = primaryEmail ? primaryEmail.email : emails[0]?.email;
                            }
                        } catch (e) {
                            // 忽略邮箱获取错误
                        }
                    }
                    
                    userInfo = {
                        oauth_name: config.oauth_name,
                        oauth_user_id: userData.id.toString(),
                        email: email,
                        name: userData.name || userData.login,
                        avatar: userData.avatar_url,
                        raw_data: JSON.stringify(userData)
                    };
                    break;
                case 'microsoft':
                    userInfo = {
                        oauth_name: config.oauth_name,
                        oauth_user_id: userData.id,
                        email: userData.mail || userData.userPrincipalName,
                        name: userData.displayName,
                        avatar: undefined, // Microsoft Graph需要额外请求获取头像
                        raw_data: JSON.stringify(userData)
                    };
                    break;
                default:
                    return { flag: false, text: `不支持的OAuth类型: ${config.oauth_type}` };
            }

            return {
                flag: true,
                text: "获取用户信息成功",
                data: [userInfo]
            };

        } catch (error) {
            console.error("获取OAuth用户信息错误:", error);
            return { flag: false, text: "获取用户信息失败" };
        }
    }

    /**
     * 生成JWT token用于内部认证
     */
    async generateJWT(payload: any, expiresIn: number = 3600): Promise<string> {
        try {
            const exp = Math.floor(Date.now() / 1000) + expiresIn;
            const jwtPayload = {
                ...payload,
                exp: exp,
                iat: Math.floor(Date.now() / 1000)
            };

            return await sign(jwtPayload, this.JWT_SECRET);
        } catch (error) {
            console.error("生成JWT错误:", error);
            throw new Error("生成JWT失败");
        }
    }

    /**
     * 验证JWT token
     */
    async verifyJWT(token: string): Promise<any> {
        try {
            return await verify(token, this.JWT_SECRET);
        } catch (error) {
            console.error("验证JWT错误:", error);
            return null;
        }
    }

    /**
     * 绑定OAuth账户到现有用户
     * @param authRequest - 授权请求数据
     * @returns 返回绑定结果
     */
    async bindAccount(authRequest: OauthAuthRequest): Promise<OauthTokenResult> {
        try {
            // 验证用户是否已登录
            const authHeader = this.c.req.header('Authorization');
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                return { flag: false, text: "用户未登录" };
            }

            const token = authHeader.substring(7);
            const payload = await this.verifyJWT(token);
            if (!payload || !payload.users_name) {
                return { flag: false, text: "无效的登录token" };
            }

            const currentUser = payload.users_name;

            const oauthManage = new OauthManage(this.c);
            const configResult = await oauthManage.select(authRequest.oauth_name);
            
            if (!configResult.flag || !configResult.data || configResult.data.length === 0) {
                return { flag: false, text: "OAuth配置不存在" };
            }

            const config = configResult.data[0];
            if (config.is_enabled !== 1) {
                return { flag: false, text: "OAuth配置已禁用" };
            }

            let oauthData;
            try {
                oauthData = JSON.parse(config.oauth_data);
            } catch (error) {
                return { flag: false, text: "OAuth配置数据格式错误" };
            }

            // 交换access token
            const tokenResult = await this.exchangeCodeForToken(config, oauthData, authRequest);
            if (!tokenResult.flag) {
                return tokenResult;
            }

            const tokenData = tokenResult.data![0];

            // 获取用户信息
            const userInfoResult = await this.getUserInfo(config, tokenData.access_token);
            if (!userInfoResult.flag) {
                return { flag: false, text: userInfoResult.text };
            }

            const userInfo = userInfoResult.data![0];

            // 使用BindsManage创建OAuth绑定记录
            const bindsManage = new BindsManage(this.c);
            
            // 检查是否已存在绑定
            const existingBindResult = await bindsManage.findByOAuthUserId(config.oauth_name, userInfo.oauth_user_id);
            if (existingBindResult.flag && existingBindResult.data && existingBindResult.data.length > 0) {
                return { flag: false, text: "此OAuth账户已被其他用户绑定" };
            }

            // 准备绑定数据
            const bindsData: BindsData = {
                oauth_user_id: userInfo.oauth_user_id,
                email: userInfo.email,
                name: userInfo.name,
                avatar: userInfo.avatar,
                raw_data: userInfo.raw_data,
                created_at: Date.now()
            };

            // 创建绑定记录
            const bindResult = await bindsManage.create({
                oauth_name: config.oauth_name,
                binds_user: currentUser,
                binds_data: JSON.stringify(bindsData),
                is_enabled: 1
            });

            if (!bindResult.flag) {
                return { flag: false, text: bindResult.text };
            }

            // 保存token到数据库（关联当前用户）
            tokenData.user_id = currentUser;
            const saveResult = await this.saveToken(tokenData);
            if (!saveResult.flag) {
                return saveResult;
            }

            return {
                flag: true,
                text: "OAuth账户绑定成功",
                data: [{
                    oauth_name: config.oauth_name,
                    access_token: userInfo.oauth_user_id,
                    token_type: 'bind_success',
                    expires_at: Date.now() + 86400000, // 24小时
                    created_at: Date.now()
                }]
            };

        } catch (error) {
            console.error("绑定OAuth账户错误:", error);
            return { flag: false, text: "绑定OAuth账户失败" };
        }
    }
}