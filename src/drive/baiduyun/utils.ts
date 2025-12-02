/** =========== 百度网盘 工具类 ================
 * 本文件实现了百度网盘云存储服务的认证和工具功能，包括：
 * - Token刷新（支持在线API和本地客户端两种方式）
 * - API请求封装和错误处理
 * - 配置加载和保存
 * - MD5加密解密工具
 * =========================================================
 * @author "OpenList Team"
 * @version 25.11.21
 * =======================================================*/

// 公用导入 =====================================================
import {Context} from "hono";
import {DriveResult} from "../DriveObject";
import {BasicClouds} from "../BasicClouds";
import * as con from "./const";
import {CONFIG_INFO, SAVING_INFO} from "./metas";

//====== 百度网盘响应接口 ======
interface TokenErrorResponse {
    error: string;
    error_description: string;
}

interface TokenResponse {
    access_token: string;
    refresh_token: string;
}

interface OnlineAPIResponse {
    refresh_token: string;
    access_token: string;
    text?: string;
}

interface BaiduAPIResponse {
    errno: number;
    request_id?: number;

    [key: string]: any;
}

//====== 百度网盘文件信息接口 ======
export interface BaiduFile {
    fs_id: number;
    path: string;
    server_filename: string;
    size: number;
    isdir: number;
    category: number;
    md5?: string;
    server_ctime: number;
    server_mtime: number;
    local_ctime?: number;
    local_mtime?: number;
    thumbs?: {
        url3?: string;
    };
}

export interface BaiduFileListResponse extends BaiduAPIResponse {
    list: BaiduFile[];
}

//====== 百度网盘工具类 ======
export class HostClouds extends BasicClouds {
    // 公共数据 ================================================
    declare public config: CONFIG_INFO;
    declare public saving: SAVING_INFO;

    /**
     * 构造函数
     * 初始化百度网盘工具类实例
     */
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
        console.log("[BaiduYun] 开始初始化配置");
        console.log("[BaiduYun] 配置信息:", {
            use_online_api: this.config.use_online_api,
            has_api_address: !!this.config.api_address,
            api_address: this.config.api_address,
            has_refresh_token: !!this.config.refresh_token,
            has_client_id: !!this.config.client_id,
            has_client_secret: !!this.config.client_secret
        });

        try {
            // 刷新Token
            await this.refreshToken();

            // 获取用户信息（会员类型）
            const userInfo = await this.getUserInfo();
            this.saving.vip_type = userInfo.vip_type || 0;

            this.change = true;
            console.log("[BaiduYun] 初始化成功，会员类型:", this.saving.vip_type);

            return {
                flag: !!this.saving.access_token,
                text: "Token refreshed successfully",
            };
        } catch (error: any) {
            console.error("[BaiduYun] 初始化失败:", error.message);

            // 根据错误类型提供建议
            let errorMessage = error.message || "Failed to initialize config";
            let suggestions: string[] = [];

            if (errorMessage.includes("在线API服务器错误") || errorMessage.includes("500")) {
                suggestions.push("在线API服务器暂时不可用，请稍后重试");
                suggestions.push("如果问题持续存在，可以尝试使用本地客户端模式");
                suggestions.push("配置 client_id 和 client_secret，并设置 use_online_api: false");
            } else if (errorMessage.includes("缺少刷新令牌")) {
                suggestions.push("请检查 refresh_token 配置是否正确");
                suggestions.push("可能需要重新进行OAuth认证获取新的刷新令牌");
            } else if (errorMessage.includes("Token刷新失败")) {
                suggestions.push("网络连接可能不稳定，请检查网络连接");
                suggestions.push("稍后重试或使用本地客户端模式");
            } else if (errorMessage.includes("Failed to parse") || errorMessage.includes("JSON解析失败")) {
                suggestions.push("服务器返回了非JSON格式的响应，可能是服务暂时不可用");
                suggestions.push("检查网络连接或稍后重试");
                suggestions.push("如果使用在线API，请检查API服务器状态");
            }

            if (suggestions.length > 0) {
                console.log("[BaiduYun] 解决建议:");
                suggestions.forEach((suggestion, index) => {
                    console.log(`[BaiduYun] ${index + 1}. ${suggestion}`);
                });
            }

            return {
                flag: false,
                text: errorMessage,
            };
        }
    }

    /**
     * 加载保存的认证信息
     * 检查Token是否有效
     */
    async loadSaving(): Promise<SAVING_INFO> {
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
        try {
            console.log(`[BaiduYun] 开始刷新Token`);
            await this._refreshToken();
            console.log(`[BaiduYun] Token刷新成功`);
            return;
        } catch (error: any) {
            console.error(`[BaiduYun] Token刷新失败:`, error.message);
            throw error;
        }
    }

    /**
     * 内部Token刷新实现
     */
    private async _refreshToken(): Promise<void> {
        // 使用在线API刷新Token
        if (this.config.use_online_api && this.config.api_address) {
            await this._refreshTokenOnline();
        } else {
            // 使用本地客户端刷新Token
            await this._refreshTokenLocal();
        }

        // 保存更新后的配置
        await this.putSaves();
    }

    /**
     * 使用在线API刷新Token
     */
    private async _refreshTokenOnline(): Promise<void> {
        const url = new URL(this.config.api_address);
        url.searchParams.set("client_uid", "");  // 暂时设为空，如果需要可以从配置中获取
        url.searchParams.set("client_key", "");  // 暂时设为空，如果需要可以从配置中获取
        url.searchParams.set("driver_txt", "baiduyun_go");


        url.searchParams.set("server_use", "true");
        url.searchParams.set("refresh_ui", this.config.refresh_token);
        url.searchParams.set("secret_key", "");  // 暂时设为空，如果需要可以从配置中获取

        console.log("[BaiduYun] 使用在线API刷新Token");
        console.log("[BaiduYun] refresh_token值:", this.config.refresh_token ? `${this.config.refresh_token.substring(0, 10)}... (长度: ${this.config.refresh_token.length})` : "空值");
        console.log("[BaiduYun] 请求URL:", url.toString());

        const response = await fetch(url.toString(), {
            method: "GET",
        });

        console.log("[BaiduYun] 响应状态:", response.status, response.statusText);
        console.log("[BaiduYun] 响应头:", response.headers);

        // 读取响应内容
        const responseText = await response.text();
        console.log("[BaiduYun] 响应内容:", responseText);

        // 尝试解析JSON
        let data: OnlineAPIResponse;
        try {
            data = JSON.parse(responseText);
        } catch (error: any) {
            console.error("[BaiduYun] JSON解析失败:", error.message);
            // 如果响应不是200且无法解析JSON，抛出HTTP错误
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}, response: ${responseText}`);
            }
            throw new Error(`Failed to parse response: ${error.message}`);
        }

        console.log("[BaiduYun] 解析后的数据:", {
            has_refresh_token: !!data.refresh_token,
            has_access_token: !!data.access_token,
            text: data.text
        });

        // 检查响应状态和数据
        if (!response.ok) {
            // 服务器返回错误，但有text字段说明
            if (data.text) {
                throw new Error(`在线API错误 (${response.status}): ${data.text}`);
            }
            // 如果响应内容为空对象或没有有用信息
            if (Object.keys(data).length === 0 || (!data.refresh_token && !data.access_token && !data.text)) {
                throw new Error(`在线API服务器错误 (${response.status}): 服务器返回空响应，可能是服务暂时不可用，请稍后重试`);
            }
            throw new Error(`HTTP error! status: ${response.status}, response: ${responseText}`);
        }

        if (!data.refresh_token || !data.access_token) {
            if (data.text) {
                throw new Error(`Token刷新失败: ${data.text}`);
            }
            throw new Error("在线API返回了空的Token");
        }

        this.saving.access_token = data.access_token;
        this.config.refresh_token = data.refresh_token;
        this.saving.refresh_token = data.refresh_token;
        this.change = true;
        console.log("[BaiduYun] Token更新成功");
    }

    /**
     * 使用本地客户端刷新Token
     */
    private async _refreshTokenLocal(): Promise<void> {
        if (!this.config.client_id || !this.config.client_secret) {
            console.error("[BaiduYun] ClientID或ClientSecret为空");
            throw new Error("Empty ClientID or ClientSecret");
        }

        console.log("[BaiduYun] 使用本地客户端刷新Token");

        const url = new URL(con.BAIDU_OAUTH_URL);
        url.searchParams.set("grant_type", "refresh_token");
        url.searchParams.set("refresh_token", this.config.refresh_token);
        url.searchParams.set("client_id", this.config.client_id);
        url.searchParams.set("client_secret", this.config.client_secret);

        console.log("[BaiduYun] 请求URL:", con.BAIDU_OAUTH_URL);

        const response = await fetch(url.toString(), {
            method: "GET",
        });

        console.log("[BaiduYun] 响应状态:", response.status, response.statusText);

        const data: TokenResponse | TokenErrorResponse = await response.json();

        if ("error" in data) {
            console.error("[BaiduYun] API返回错误:", data.error, data.error_description);
            throw new Error(data.error_description || data.error);
        }

        console.log("[BaiduYun] Token响应:", {
            has_refresh_token: !!data.refresh_token,
            has_access_token: !!data.access_token
        });

        if (!data.refresh_token || !data.access_token) {
            throw new Error("Empty token returned");
        }

        this.saving.access_token = data.access_token;
        this.config.refresh_token = data.refresh_token;
        this.saving.refresh_token = data.refresh_token;
        console.log("[BaiduYun] Token更新成功");
    }

    //====== API请求 ======
    /**
     * 发送API请求
     * 自动处理认证和错误重试
     */
    async request(
        pathname: string,
        method: string = "GET",
        params?: Record<string, string>,
        body?: any,
        headers?: Record<string, string>
    ): Promise<any> {
// 移除pathname开头的斜杠，确保正确拼接基础URL
        const cleanPathname = pathname.startsWith('/') ? pathname.slice(1) : pathname;
        const url = new URL(cleanPathname, con.BAIDU_API_BASE);
        console.log("[BaiduYun] 基础URL:", con.BAIDU_API_BASE);
        console.log("[BaiduYun] 路径:", pathname);
        console.log("[BaiduYun] 完整请求URL:", url.toString());
        // 添加access_token
        url.searchParams.set("access_token", this.saving.access_token || "");

        // 添加其他参数
        if (params) {
            Object.entries(params).forEach(([key, value]) => {
                url.searchParams.set(key, value);
            });
        }

const requestHeaders: Record<string, string> = {
            "User-Agent": "pan.baidu.com",
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

        // 先获取响应文本
        const responseText = await response.text();
        console.log("[BaiduYun] API响应状态:", response.status, response.statusText);

        // 尝试解析JSON
        let result: BaiduAPIResponse;
        try {
            result = JSON.parse(responseText);
        } catch (error: any) {
            console.error("[BaiduYun] API响应JSON解析失败:", error.message);
            console.log("[BaiduYun] 响应内容:", responseText.substring(0, 200));

            // 如果响应不是200且无法解析JSON，抛出HTTP错误
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}, response: ${responseText.substring(0, 100)}`);
            }
            throw new Error(`Failed to parse API response: ${error.message}`);
        }

        // 处理错误
        if (result.errno !== 0) {
            // Token过期，刷新后重试
            if (result.errno === 111 || result.errno === -6) {
                console.log("[BaiduYun] Token过期，刷新后重试");
                await this.refreshToken();
                return this.request(pathname, method, params, body, headers);
            }

            throw new Error(`Baidu API error: errno=${result.errno}, refer to https://pan.baidu.com/union/doc/`);
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

    //====== 用户信息 ======
    /**
     * 获取用户信息
     * 包括会员类型等
     */
    async getUserInfo(): Promise<any> {
        const result = await this.get("/xpan/nas", {method: "uinfo"});
        return result;
    }

    //====== 文件操作 ======
    /**
     * 获取文件列表
     */
    async getFiles(dir: string): Promise<BaiduFile[]> {
        const files: BaiduFile[] = [];
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
            const result: BaiduFileListResponse = await this.get("/xpan/file", params);

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
                console.warn("[BaiduYun] CustomUploadPartSize is not supported for non-vip user");
            }
            if (filesize > con.MAX_SLICE_NUM * con.DEFAULT_SLICE_SIZE) {
                console.warn("[BaiduYun] File size is too large, may cause upload failure");
            }
            return con.DEFAULT_SLICE_SIZE;
        }

        // 自定义分片大小
        if (this.config.custom_upload_part_size !== 0) {
            let customSize = this.config.custom_upload_part_size;

            if (customSize < con.DEFAULT_SLICE_SIZE) {
                console.warn("[BaiduYun] CustomUploadPartSize is less than DefaultSliceSize");
                return con.DEFAULT_SLICE_SIZE;
            }

            if (vipType === 1 && customSize > con.VIP_SLICE_SIZE) {
                console.warn("[BaiduYun] CustomUploadPartSize is greater than VipSliceSize");
                return con.VIP_SLICE_SIZE;
            }

            if (vipType === 2 && customSize > con.SVIP_SLICE_SIZE) {
                console.warn("[BaiduYun] CustomUploadPartSize is greater than SVipSliceSize");
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
            console.warn("[BaiduYun] File size is too large, may cause upload failure");
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
