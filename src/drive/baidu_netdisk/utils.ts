// Public imports
import {Context} from "hono";
import {DriveResult} from "../DriveObject";
import {BasicClouds} from "../BasicClouds";
import * as con from "./const";
// Specific imports
import type * as meta from "./metas";
import {HttpRequest} from "../../types/HttpRequest";

export class HostClouds extends BasicClouds {
    // Private members
    private vipType: number = con.VIP_TYPE_NORMAL
    private uploadThread: number = 3
    private accessToken: string = ""
    
    // Constructor
    constructor(
        c: Context, 
        router: string,
        public config: meta.BaiduNetdiskConfig,
        public saving: meta.BaiduNetdiskSaving
    ) {
        super(c, router, config, saving);
    }

    // Refresh access token
    async refreshToken(): Promise<DriveResult> {
        try {
            // Try online API first if enabled
            if (this.config.use_online_api && this.config.api_url_address) {
                const response = await HttpRequest(
                    "GET",
                    this.config.api_url_address,
                    undefined,
                    {
                        "User-Agent": "Mozilla/5.0 (Macintosh; Apple macOS 15_5) AppleWebKit/537.36 (KHTML, like Gecko) Safari/537.36 Chrome/138.0.0.0 Openlist/425.6.30"
                    },
                    {
                        finder: "json",
                        search: {
                            refresh_ui: this.config.refresh_token,
                            server_use: "true",
                            driver_txt: "baiduyun_go"
                        }
                    }
                ) as meta.OnlineAPIResponse;

                if (!response?.refresh_token || !response?.access_token) {
                    if (response?.text) {
                        return {flag: false, text: `Failed to refresh token: ${response.text}`};
                    }
                    return {flag: false, text: "Empty token returned from online API"};
                }

                this.accessToken = response.access_token;
                this.config.refresh_token = response.refresh_token;
                this.saving.access_token = response.access_token;
                this.saving.refresh_token = response.refresh_token;
                this.change = true;
                
                return {flag: true, text: "Token refreshed via online API"};
            }

            // Use local client credentials
            if (!this.config.client_id || !this.config.client_secret) {
                return {flag: false, text: "Empty ClientID or ClientSecret"};
            }

            const response = await HttpRequest(
                "GET",
                `${con.OPENAPI_URL}/oauth/2.0/token`,
                undefined,
                undefined,
                {
                    finder: "json",
                    search: {
                        grant_type: "refresh_token",
                        refresh_token: this.config.refresh_token,
                        client_id: this.config.client_id,
                        client_secret: this.config.client_secret
                    }
                }
            ) as meta.TokenResponse | meta.TokenErrorResponse;

            if ("error" in response) {
                return {
                    flag: false, 
                    text: `${response.error}: ${response.error_description}`
                };
            }

            if (!response.refresh_token) {
                return {flag: false, text: "Empty token returned"};
            }

            this.accessToken = response.access_token;
            this.config.refresh_token = response.refresh_token;
            this.saving.access_token = response.access_token;
            this.saving.refresh_token = response.refresh_token;
            this.change = true;

            return {flag: true, text: "Token refreshed via local client"};
        } catch (error) {
            return {
                flag: false, 
                text: `Failed to refresh token: ${error instanceof Error ? error.message : String(error)}`
            };
        }
    }

    // Generic request method with retry logic
    async request(
        url: string,
        method: string,
        params?: Record<string, string>,
        body?: any,
        headers?: Record<string, string>
    ): Promise<any> {
        const maxRetries = 3;
        let lastError: Error | null = null;

        for (let attempt = 0; attempt < maxRetries; attempt++) {
            try {
                // Add access token to params
                const searchParams: Record<string, string> = {
                    ...params,
                    access_token: this.accessToken
                };

                const response = await HttpRequest(
                    method,
                    url,
                    method === "POST" ? body : undefined,
                    headers,
                    {
                        finder: "json",
                        search: method === "GET" ? searchParams : undefined
                    }
                );

                // Check for errors
                if (response?.errno !== undefined && response.errno !== 0) {
                    // Token expired or auth failed
                    if ([con.ERRNO_TOKEN_EXPIRED, con.ERRNO_AUTH_FAILED].includes(response.errno)) {
                        console.log("Token expired, refreshing...");
                        const refreshResult = await this.refreshToken();
                        if (!refreshResult.flag) {
                            throw new Error(refreshResult.text);
                        }
                        continue; // Retry with new token
                    }

                    throw new Error(`Request failed with errno: ${response.errno}`);
                }

                return response;
            } catch (error) {
                lastError = error instanceof Error ? error : new Error(String(error));
                if (attempt < maxRetries - 1) {
                    await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
                }
            }
        }

        throw lastError || new Error("Request failed after retries");
    }

    // GET request helper
    async get(pathname: string, params: Record<string, string> = {}): Promise<any> {
        return this.request(
            `${con.API_BASE_URL}/rest/2.0${pathname}`,
            "GET",
            params
        );
    }

    // POST form request helper
    async postForm(
        pathname: string, 
        params: Record<string, string> = {},
        formData: Record<string, string> = {}
    ): Promise<any> {
        return this.request(
            `${con.API_BASE_URL}/rest/2.0${pathname}`,
            "POST",
            params,
            formData,
            {"Content-Type": "application/x-www-form-urlencoded"}
        );
    }

    // Initialize configuration
    async initConfig(): Promise<DriveResult> {
        try {
            // Validate required fields
            if (!this.config.refresh_token) {
                return {flag: false, text: "Refresh token is required"};
            }

            // Set default values
            this.uploadThread = parseInt(this.config.upload_thread || con.DEFAULT_UPLOAD_THREAD);
            if (this.uploadThread < 1 || this.uploadThread > 32) {
                this.uploadThread = 3;
            }

            if (!this.config.upload_api) {
                this.config.upload_api = con.DEFAULT_UPLOAD_API;
            }

            // Refresh token
            const refreshResult = await this.refreshToken();
            if (!refreshResult.flag) {
                return refreshResult;
            }

            // Get user info to check VIP type
            const userInfo = await this.get("/xpan/nas", {method: "uinfo"}) as meta.UserInfoResponse;
            this.vipType = userInfo.vip_type || con.VIP_TYPE_NORMAL;
            this.saving.vip_type = this.vipType;
            this.change = true;

            return {flag: true, text: "Initialized successfully"};
        } catch (error) {
            return {
                flag: false,
                text: `Initialization failed: ${error instanceof Error ? error.message : String(error)}`
            };
        }
    }

    // Load saved configuration
    async loadConfig(): Promise<DriveResult> {
        try {
            // Load saved access token
            if (this.saving.access_token) {
                this.accessToken = this.saving.access_token;
            }

            // Load VIP type
            if (this.saving.vip_type !== undefined) {
                this.vipType = this.saving.vip_type;
            }

            // Set upload thread
            this.uploadThread = parseInt(this.config.upload_thread || con.DEFAULT_UPLOAD_THREAD);
            if (this.uploadThread < 1 || this.uploadThread > 32) {
                this.uploadThread = 3;
            }

            // Validate token by making a test request
            try {
                const userInfo = await this.get("/xpan/nas", {method: "uinfo"}) as meta.UserInfoResponse;
                this.vipType = userInfo.vip_type || con.VIP_TYPE_NORMAL;
                this.saving.vip_type = this.vipType;
                this.change = true;
            } catch (error) {
                // Token might be expired, try to refresh
                console.log("Token validation failed, refreshing...");
                const refreshResult = await this.refreshToken();
                if (!refreshResult.flag) {
                    return refreshResult;
                }
                
                // Retry user info
                const userInfo = await this.get("/xpan/nas", {method: "uinfo"}) as meta.UserInfoResponse;
                this.vipType = userInfo.vip_type || con.VIP_TYPE_NORMAL;
                this.saving.vip_type = this.vipType;
                this.change = true;
            }

            return {flag: true, text: "Loaded successfully"};
        } catch (error) {
            return {
                flag: false,
                text: `Load failed: ${error instanceof Error ? error.message : String(error)}`
            };
        }
    }

    // Get VIP type
    getVipType(): number {
        return this.vipType;
    }

    // Get upload thread count
    getUploadThread(): number {
        return this.uploadThread;
    }

    // Get access token
    getAccessToken(): string {
        return this.accessToken;
    }
}
