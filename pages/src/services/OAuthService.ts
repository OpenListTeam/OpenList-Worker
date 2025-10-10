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
     * 获取OAuth授权URL
     */
    async getAuthUrl(provider: string, redirectUri: string): Promise<OAuthAuthUrlResponse> {
        const response = await apiService.post(`/@oauth-token/authurl/name/${provider}`, {
            redirect_uri: redirectUri
        });
        return {
            flag: response.flag,
            text: response.text,
            data: response.data?.[0] ? {
                auth_url: response.data[0].access_token, // 后端将URL存储在access_token字段
                state: response.data[0].oauth_name
            } : undefined
        };
    }

    /**
     * 处理OAuth回调
     */
    async handleCallback(code: string, state: string, provider: string): Promise<OAuthCallbackResponse> {
        const response = await apiService.post(`/@oauth-token/callback/name/${provider}`, {
            code,
            state
        });
        return response;
    }

    /**
     * 获取用户的OAuth令牌
     */
    async getUserTokens(provider?: string): Promise<OAuthTokenResponse> {
        const url = provider ? `/@oauth-token/tokens/name/${provider}` : '/@oauth-token/tokens/none/';
        const response = await apiService.post(url, {});
        return response;
    }

    /**
     * 刷新OAuth令牌
     */
    async refreshToken(provider: string, refreshToken: string): Promise<boolean> {
        const response = await apiService.post(`/@oauth-token/refresh/name/${provider}`, { 
            refresh_token: refreshToken 
        });
        return response.flag;
    }

    /**
     * 验证OAuth令牌
     */
    async validateToken(provider: string, accessToken: string): Promise<boolean> {
        const response = await apiService.post(`/@oauth-token/validate/name/${provider}`, { 
            access_token: accessToken 
        });
        return response.flag;
    }

    /**
     * 撤销OAuth令牌
     */
    async revokeToken(provider: string, accessToken: string): Promise<boolean> {
        const response = await apiService.post(`/@oauth-token/revoke/name/${provider}`, { 
            access_token: accessToken 
        });
        return response.flag;
    }

    /**
     * 获取可用的OAuth提供商
     */
    async getAvailableProviders(): Promise<{ flag: boolean; text: string; data?: any[] }> {
        const response = await apiService.post('/@oauth/select/none/', {});
        return response;
    }

    /**
     * 绑定OAuth账户
     */
    async bindAccount(code: string, state: string, provider: string): Promise<OAuthCallbackResponse> {
        const response = await apiService.post(`/@oauth-token/bind/name/${provider}`, {
            code,
            state
        });
        return response;
    }
}

export const oauthService = new OAuthService();
export default oauthService;