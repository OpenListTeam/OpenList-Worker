// 百度网盘 工具类
// 实现认证、API请求封装、文件操作、MD5工具等功能

import {Context} from "hono";
import {DriveResult} from "../DriveObject";
import {BasicClouds} from "../BasicClouds";
import * as con from "./const";
import type * as meta from "./metas";

export class HostClouds extends BasicClouds {
    // 公共数据
    declare public config: meta.BaiduNetdiskConfig;
    declare public saving: meta.BaiduNetdiskSaving;

    constructor(
        c: Context,
        router: string,
        config: Record<string, any> | any,
        saving: Record<string, any> | any
    ) {
        super(c, router, config, saving);
    }

    //====== 初始化和配置 ======

    /**
     * 初始化配置
     * 执行Token刷新并获取用户信息
     */
    async initConfig(): Promise<DriveResult> {
        try {
            if (!this.config.refresh_token) {
                return {flag: false, text: "Refresh token is required"};
            }

            // 刷新Token
            await this.refreshToken();

            // 获取用户信息（会员类型）
            const userInfo = await this.get("/xpan/nas", {method: "uinfo"}) as meta.UserInfoResponse;
            this.saving.vip_type = userInfo.vip_type || 0;
            this.change = true;

            return {
                flag: !!this.saving.access_token,
                text: "Token refreshed successfully",
            };
        } catch (error: any) {
            return {
                flag: false,
                text: error.message || "Failed to initialize config",
            };
        }
    }

    /**
     * 加载保存的认证信息
     */
    async loadSaving(): Promise<meta.BaiduNetdiskSaving> {
        if (!this.saving || !this.saving.access_token) {
            await this.initConfig();
        }
        return this.saving;
    }

    //====== Token刷新 ======

    /**
     * 刷新访问令牌
     * 支持在线API和本地客户端两种方式
     */
    async refreshToken(): Promise<void> {
        if (this.config.use_online_api && this.config.api_address) {
            await this._refreshTokenOnline();
        } else {
            await this._refreshTokenLocal();
        }
        await this.putSaves();
    }

    /**
     * 使用在线API刷新Token
     */
    private async _refreshTokenOnline(): Promise<void> {
        const url = new URL(this.config.api_address);
        url.searchParams.set("client_uid", "");
        url.searchParams.set("client_key", "");
        url.searchParams.set("driver_txt", "baiduyun_go");
        url.searchParams.set("server_use", "true");
        url.searchParams.set("refresh_ui", this.config.refresh_token);
        url.searchParams.set("secret_key", "");

        const response = await fetch(url.toString(), {method: "GET"});
        const responseText = await response.text();

        let data: meta.OnlineAPIResponse;
        try {
            data = JSON.parse(responseText);
        } catch (error: any) {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}, response: ${responseText}`);
            }
            throw new Error(`Failed to parse response: ${error.message}`);
        }

        if (!response.ok) {
            if (data.text) {
                throw new Error(`Online API error (${response.status}): ${data.text}`);
            }
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        if (!data.refresh_token || !data.access_token) {
            if (data.text) {
                throw new Error(`Token refresh failed: ${data.text}`);
            }
            throw new Error("Online API returned empty token");
        }

        this.saving.access_token = data.access_token;
        this.config.refresh_token = data.refresh_token;
        this.saving.refresh_token = data.refresh_token;
        this.change = true;
    }

    /**
     * 使用本地客户端刷新Token
     */
    private async _refreshTokenLocal(): Promise<void> {
        if (!this.config.client_id || !this.config.client_secret) {
            throw new Error("Empty ClientID or ClientSecret");
        }

        const url = new URL(con.BAIDU_OAUTH_URL);
        url.searchParams.set("grant_type", "refresh_token");
        url.searchParams.set("refresh_token", this.config.refresh_token);
        url.searchParams.set("client_id", this.config.client_id);
        url.searchParams.set("client_secret", this.config.client_secret);

        const response = await fetch(url.toString(), {method: "GET"});
        const data: meta.TokenResponse | meta.TokenErrorResponse = await response.json();

        if ("error" in data) {
            throw new Error(data.error_description || data.error);
        }

        if (!data.refresh_token || !data.access_token) {
            throw new Error("Empty token returned");
        }

        this.saving.access_token = data.access_token;
        this.config.refresh_token = data.refresh_token;
        this.saving.refresh_token = data.refresh_token;
        this.change = true;
    }

    //====== API请求 ======

    /**
     * 发送API请求
     * 自动处理认证和Token过期重试
     */
    async request(
        pathname: string,
        method: string = "GET",
        params?: Record<string, string>,
        body?: any,
        headers?: Record<string, string>
    ): Promise<any> {
        // 构建URL（支持完整URL和相对路径）
        let url: URL;
        if (pathname.startsWith("http://") || pathname.startsWith("https://")) {
            url = new URL(pathname);
        } else {
            const cleanPathname = pathname.startsWith('/') ? pathname.slice(1) : pathname;
            url = new URL(cleanPathname, con.BAIDU_API_BASE);
        }

        // 添加access_token
        url.searchParams.set("access_token", this.saving.access_token || "");

        // 添加其他参数
        if (params) {
            Object.entries(params).forEach(([key, value]) => {
                url.searchParams.set(key, value);
            });
        }

        const requestHeaders: Record<string, string> = {
            "User-Agent": con.DEFAULT_UA,
            ...headers,
        };

        const options: RequestInit = {
            method,
            headers: requestHeaders,
        };

        // 处理请求体
        if (body) {
            if (body instanceof FormData) {
                options.body = body;
            } else if (typeof body === "object") {
                requestHeaders["Content-Type"] = "application/x-www-form-urlencoded";
                const formData = new URLSearchParams();
                Object.entries(body).forEach(([key, value]) => {
                    formData.append(key, String(value));
                });
                options.body = formData.toString();
            } else {
                options.body = body;
            }
            options.headers = requestHeaders;
        }

        const response = await fetch(url.toString(), options);
        const responseText = await response.text();

        let result: meta.BaiduAPIResponse;
        try {
            result = JSON.parse(responseText);
        } catch (error: any) {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}, response: ${responseText.substring(0, 100)}`);
            }
            throw new Error(`Failed to parse API response: ${error.message}`);
        }

        // Token过期，刷新后重试
        if (result.errno === con.ERRNO_TOKEN_EXPIRED || result.errno === con.ERRNO_AUTH_FAILED) {
            console.log("Token expired, refreshing...");
            await this.refreshToken();
            return this.request(pathname, method, params, body, headers);
        }

        // 其他错误
        if (result.errno !== undefined && result.errno !== 0) {
            throw new Error(`Baidu API error: errno=${result.errno}`);
        }

        return result;
    }

    /**
     * GET请求
     */
    async get(pathname: string, params?: Record<string, string>): Promise<any> {
        return this.request(pathname, "GET", params);
    }

    /**
     * POST表单请求
     */
    async postForm(pathname: string, params?: Record<string, string>, form?: Record<string, string>): Promise<any> {
        return this.request(pathname, "POST", params, form);
    }

    //====== 文件操作 ======

    /**
     * 获取文件列表
     */
    async getFiles(dir: string): Promise<meta.BaiduFile[]> {
        const files: meta.BaiduFile[] = [];
        let start = 0;
        const limit = 200;

        const params: Record<string, string> = {
            method: "list",
            dir: dir,
            web: "web",
            start: String(start),
            limit: String(limit),
        };

        // 添加排序参数
        if (this.config.order_by) {
            params.order = this.config.order_by;
            if (this.config.order_direction === "desc") {
                params.desc = "1";
            }
        }

        while (true) {
            params.start = String(start);
            const result: meta.BaiduFileListResponse = await this.get("/xpan/file", params);

            if (!result.list || result.list.length === 0) {
                break;
            }

            // 过滤文件（如果启用了仅视频文件）
            if (this.config.only_list_video_file) {
                const filtered = result.list.filter(f => f.isdir === 1 || f.category === 1);
                files.push(...filtered);
            } else {
                files.push(...result.list);
            }

            start += limit;
        }

        return files;
    }

    /**
     * 文件管理操作（移动、复制、删除、重命名）
     */
    async manage(opera: string, filelist: any): Promise<any> {
        const params = {
            method: "filemanager",
            opera: opera,
        };

        const form = {
            async: "0",
            filelist: JSON.stringify(filelist),
            ondup: "fail",
        };

        return this.postForm("/xpan/file", params, form);
    }

    /**
     * 创建文件或文件夹
     */
    async create(
        path: string,
        size: number,
        isdir: number,
        uploadid?: string,
        block_list?: string,
        mtime?: number,
        ctime?: number
    ): Promise<any> {
        const params = {
            method: "create",
        };

        const form: Record<string, string> = {
            path: path,
            size: String(size),
            isdir: String(isdir),
            rtype: "3",
        };

        if (mtime && ctime) {
            form.local_mtime = String(mtime);
            form.local_ctime = String(ctime);
        }

        if (uploadid) {
            form.uploadid = uploadid;
        }

        if (block_list) {
            form.block_list = block_list;
        }

        return this.postForm("/xpan/file", params, form);
    }

    //====== 上传相关 ======

    /**
     * 获取分片大小
     * 根据会员类型和文件大小计算合适的分片大小
     */
    getSliceSize(filesize: number): number {
        const vipType = this.saving.vip_type || 0;

        // 非会员固定为4MB
        if (vipType === 0) {
            if (this.config.custom_upload_part_size !== 0) {
                console.warn("CustomUploadPartSize is not supported for non-vip user");
            }
            if (filesize > con.MAX_SLICE_NUM * con.DEFAULT_SLICE_SIZE) {
                console.warn("File size is too large, may cause upload failure");
            }
            return con.DEFAULT_SLICE_SIZE;
        }

        // 自定义分片大小
        if (this.config.custom_upload_part_size !== 0) {
            let customSize = this.config.custom_upload_part_size;

            if (customSize < con.DEFAULT_SLICE_SIZE) {
                console.warn("CustomUploadPartSize is less than DefaultSliceSize");
                return con.DEFAULT_SLICE_SIZE;
            }

            if (vipType === 1 && customSize > con.VIP_SLICE_SIZE) {
                console.warn("CustomUploadPartSize is greater than VipSliceSize");
                return con.VIP_SLICE_SIZE;
            }

            if (vipType === 2 && customSize > con.SVIP_SLICE_SIZE) {
                console.warn("CustomUploadPartSize is greater than SVipSliceSize");
                return con.SVIP_SLICE_SIZE;
            }

            return customSize;
        }

        // 根据会员类型确定最大分片大小
        let maxSliceSize = con.DEFAULT_SLICE_SIZE;
        if (vipType === 1) {
            maxSliceSize = con.VIP_SLICE_SIZE;
        } else if (vipType === 2) {
            maxSliceSize = con.SVIP_SLICE_SIZE;
        }

        // 低带宽模式
        if (this.config.low_bandwith_upload_mode) {
            let size = con.DEFAULT_SLICE_SIZE;
            while (size <= maxSliceSize) {
                if (filesize <= con.MAX_SLICE_NUM * size) {
                    return size;
                }
                size += con.SLICE_STEP;
            }
        }

        if (filesize > con.MAX_SLICE_NUM * maxSliceSize) {
            console.warn("File size is too large, may cause upload failure");
        }

        return maxSliceSize;
    }

    //====== MD5工具 ======

    /**
     * 解密MD5
     * 百度网盘返回的MD5是加密的，需要解密
     */
    static decryptMd5(encryptMd5: string): string {
        // 检查是否已经是标准MD5格式
        if (/^[0-9a-f]{32}$/i.test(encryptMd5)) {
            return encryptMd5.toLowerCase();
        }

        let result = "";
        for (let i = 0; i < encryptMd5.length; i++) {
            let n: number;
            if (i === 9) {
                n = encryptMd5.toLowerCase().charCodeAt(i) - "g".charCodeAt(0);
            } else {
                n = parseInt(encryptMd5[i], 16);
            }
            result += (n ^ (15 & i)).toString(16);
        }

        // 重新排列
        return result.substring(8, 16) + result.substring(0, 8) +
            result.substring(24, 32) + result.substring(16, 24);
    }

    /**
     * 加密MD5
     * 将标准MD5加密为百度网盘格式
     */
    static encryptMd5(originalMd5: string): string {
        // 重新排列
        const reversed = originalMd5.substring(8, 16) + originalMd5.substring(0, 8) +
            originalMd5.substring(24, 32) + originalMd5.substring(16, 24);

        let result = "";
        for (let i = 0; i < reversed.length; i++) {
            let n = parseInt(reversed[i], 16);
            n ^= 15 & i;
            if (i === 9) {
                result += String.fromCharCode(n + "g".charCodeAt(0));
            } else {
                result += n.toString(16);
            }
        }

        return result;
    }
}