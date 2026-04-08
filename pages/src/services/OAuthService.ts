import apiService from '../posts/api';

export interface OAuthAuthUrlRequest {
    oauth_name: string;
    redirect_uri?: string;
}

export interface OAuthAuthUrlResponse {
    flag: boolean;
    text: string;
    data?: {
        auth_url: string;
        state: string;
    };
}

export interface OAuthCallbackRequest {
    oauth_name: string;
    code: string;
    state: string;
}

export interface OAuthCallbackResponse {
    flag: boolean;
    text: string;
    token?: string;
    data?: {
        access_token: string;
        refresh_token?: string;
        user_info: {
            id: string;
            name: string;
            email: string;
            avatar?: string;
        };
    };
}

export interface OAuthTokenResponse {
    flag: boolean;
    text: string;
    data?: Array<{
        oauth_name: string;
        user_id: string;
        access_token: string;
        refresh_token?: string;
        expires_at: string;
        user_info: any;
    }>;
}

export class OAuthService {

    /**
     * 获取OAuth授权URL（新版 API: POST /api/auth/sso）
     */
    async getAuthUrl(provider: string, redirectUri: string): Promise<OAuthAuthUrlResponse> {
        const response = await apiService.post(`/api/auth/sso`, {
            provider,
            redirect_uri: redirectUri,
        });
        return {
            flag: response.flag ?? (response.code === 200),
            text: response.message || response.text || '',
            data: response.data ? {
                auth_url: response.data.auth_url || response.data.access_token || '',
                state: response.data.state || provider,
            } : undefined,
        };
    }

    /**
     * 处理OAuth回调（新版 API: GET /api/auth/sso_callback）
     */
    async handleCallback(code: string, state: string, provider: string): Promise<OAuthCallbackResponse> {
        const response = await apiService.get(`/api/auth/sso_callback`, {
            params: { code, state, provider },
        });
        return response;
    }

    /**
     * 获取用户的OAuth令牌（新版 API: GET /api/me）
     */
    async getUserTokens(provider?: string): Promise<OAuthTokenResponse> {
        const response = await apiService.get('/api/me');
        return response;
    }

    /**
     * 刷新OAuth令牌（新版 API: POST /api/auth/login）
     */
    async refreshToken(provider: string, refreshToken: string): Promise<boolean> {
        const response = await apiService.post(`/api/auth/login`, {
            provider,
            refresh_token: refreshToken,
        });
        return response.flag ?? (response.code === 200);
    }

    /**
     * 验证OAuth令牌（通过 GET /api/me 验证当前 token 有效性）
     */
    async validateToken(provider: string, accessToken: string): Promise<boolean> {
        try {
            const response = await apiService.get('/api/me');
            return response.flag ?? (response.code === 200);
        } catch {
            return false;
        }
    }

    /**
     * 撤销OAuth令牌（新版 API: GET /api/auth/logout）
     */
    async revokeToken(provider: string, accessToken: string): Promise<boolean> {
        const response = await apiService.get('/api/auth/logout');
        return response.flag ?? (response.code === 200);
    }

    /**
     * 获取可用的OAuth提供商（新版 API: GET /api/admin/oauth/list）
     */
    async getAvailableProviders(): Promise<{ flag: boolean; text: string; data?: any[] }> {
        const response = await apiService.get('/api/admin/oauth/list');
        return response;
    }

    /**
     * 绑定OAuth账户（新版 API: POST /api/auth/sso_callback with bind mode）
     */
    async bindAccount(code: string, state: string, provider: string): Promise<OAuthCallbackResponse> {
        const response = await apiService.get(`/api/auth/sso_callback`, {
            params: { code, state, provider, mode: 'bind' },
        });
        return response;
    }
}

export const oauthService = new OAuthService();
export default oauthService;