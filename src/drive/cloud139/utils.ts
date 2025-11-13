// 公用导入 =====================================================
import {Context} from "hono";
import {DriveResult} from "../DriveObject";
import {BasicClouds} from "../BasicClouds";
import * as con from "./const";
// 专用导入 =====================================================
import * as crypto from "crypto";

/**
 * 移动云盘工具类
 * 负责认证、配置管理和API请求签名
 */
export class HostClouds extends BasicClouds {
    // 专用成员 ============================================
    public account: string = "";
    public token: string = "";
    public personalCloudHost: string = "";
    declare public config: CONFIG_INFO | any;
    declare public saving: any;

    // 构造函数 ================================================
    constructor(c: Context, router: string,
                config: Record<string, any> | any,
                saving: Record<string, any> | any) {
        super(c, router, config, saving);
    }

    // ==================== 初始化配置 ====================
    /**
     * 初始化云盘配置，刷新token并获取路由策略
     */
    async initConfig(): Promise<DriveResult> {
        try {
            // 刷新token
            const refreshResult = await this.refreshToken();
            if (!refreshResult.flag) {
                return refreshResult;
            }

            // 查询路由策略
            const routeResult = await this.queryRoutePolicy();
            if (!routeResult.flag) {
                return routeResult;
            }

            this.change = true;
            return {flag: true, text: "初始化成功"};
        } catch (error: any) {
            return {flag: false, text: `初始化失败: ${error.message}`};
        }
    }

    // ==================== 载入配置 ====================
    /**
     * 从配置中载入授权信息
     */
    async loadConfig(): Promise<DriveResult> {
        try {
            if (!this.config.authorization) {
                return {flag: false, text: "缺少授权信息"};
            }
            return {flag: true, text: "配置载入成功"};
        } catch (error: any) {
            return {flag: false, text: `配置载入失败: ${error.message}`};
        }
    }

    // ==================== 载入存储 ====================
    /**
     * 载入保存的认证信息
     */
    async loadSaving(): Promise<DriveResult> {
        try {
            if (this.saving && this.saving.token) {
                this.token = this.saving.token;
                this.account = this.saving.account;
                this.personalCloudHost = this.saving.personalCloudHost || "";
            }
            return {flag: true, text: "存储载入成功"};
        } catch (error: any) {
            return {flag: false, text: `存储载入失败: ${error.message}`};
        }
    }

    // ==================== 刷新Token ====================
    /**
     * 刷新访问令牌
     */
    async refreshToken(): Promise<DriveResult> {
        try {
            // 解码授权信息
            const decoded = Buffer.from(this.config.authorization, 'base64').toString('utf-8');
            const splits = decoded.split(':');
            if (splits.length < 3) {
                return {flag: false, text: "授权信息格式错误"};
            }

            this.account = splits[1];
            const tokenParts = splits[2].split('|');
            if (tokenParts.length < 4) {
                return {flag: false, text: "Token格式错误"};
            }

            // 检查token是否过期
            const expiration = parseInt(tokenParts[3]);
            const now = Date.now();
            if (expiration - now > 15 * 24 * 60 * 60 * 1000) {
                // Token有效期大于15天，无需刷新
                this.token = splits[2];
                this.saving = {token: this.token, account: this.account, personalCloudHost: this.personalCloudHost};
                return {flag: true, text: "Token仍然有效"};
            }

            // 刷新token
            const url = "https://aas.caiyun.feixin.10086.cn:443/tellin/authTokenRefresh.do";
            const reqBody = `<root><token>${splits[2]}</token><account>${splits[1]}</account><clienttype>656</clienttype></root>`;
            
            const response = await fetch(url, {
                method: 'POST',
                headers: {'Content-Type': 'application/xml'},
                body: reqBody
            });

            const text = await response.text();
            const tokenMatch = text.match(/<token>(.*?)<\/token>/);
            const returnMatch = text.match(/<return>(.*?)<\/return>/);

            if (returnMatch && returnMatch[1] !== '0') {
                return {flag: false, text: "Token刷新失败"};
            }

            if (tokenMatch) {
                this.token = tokenMatch[1];
                const newAuth = Buffer.from(`${splits[0]}:${splits[1]}:${this.token}`).toString('base64');
                this.config.authorization = newAuth;
                this.saving = {token: this.token, account: this.account, personalCloudHost: this.personalCloudHost};
                this.change = true;
                return {flag: true, text: "Token刷新成功"};
            }

            return {flag: false, text: "Token解析失败"};
        } catch (error: any) {
            return {flag: false, text: `Token刷新失败: ${error.message}`};
        }
    }

    // ==================== 查询路由策略 ====================
    /**
     * 查询个人云盘的路由地址
     */
    async queryRoutePolicy(): Promise<DriveResult> {
        try {
            const data = {
                userInfo: {
                    userType: 1,
                    accountType: 1,
                    accountName: this.account
                },
                modAddrType: 1
            };

            const response = await this.request(con.ROUTE_API_URL, 'POST', data);
            if (response.success && response.data?.routePolicyList) {
                for (const policy of response.data.routePolicyList) {
                    if (policy.modName === 'personal') {
                        this.personalCloudHost = policy.httpsUrl;
                        this.saving = {token: this.token, account: this.account, personalCloudHost: this.personalCloudHost};
                        this.change = true;
                        return {flag: true, text: "路由策略获取成功"};
                    }
                }
            }
            return {flag: false, text: "未找到个人云盘路由"};
        } catch (error: any) {
            return {flag: false, text: `路由策略查询失败: ${error.message}`};
        }
    }

    // ==================== 计算签名 ====================
    /**
     * 计算API请求签名
     */
    calSign(body: string, ts: string, randStr: string): string {
        // URL编码
        body = encodeURIComponent(body);
        // 排序
        const chars = body.split('').sort();
        body = chars.join('');
        // Base64编码
        body = Buffer.from(body).toString('base64');
        // MD5计算
        const md5Body = crypto.createHash('md5').update(body).digest('hex');
        const md5Time = crypto.createHash('md5').update(`${ts}:${randStr}`).digest('hex');
        const result = crypto.createHash('md5').update(md5Body + md5Time).digest('hex');
        return result.toUpperCase();
    }

    // ==================== 生成随机字符串 ====================
    /**
     * 生成指定长度的随机字符串
     */
    randomString(length: number): string {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }

    // ==================== 发送请求 ====================
    /**
     * 发送API请求
     */
    async request(url: string, method: string, data?: any): Promise<any> {
        const randStr = this.randomString(16);
        const ts = new Date().toISOString().replace('T', ' ').substring(0, 19);
        const bodyStr = JSON.stringify(data || {});
        const sign = this.calSign(bodyStr, ts, randStr);

        const svcType = this.config.type === 'family' ? '2' : '1';

        const headers: Record<string, string> = {
            'Accept': 'application/json, text/plain, */*',
            'CMS-DEVICE': 'default',
            'Authorization': 'Basic ' + this.config.authorization,
            'mcloud-channel': con.MCLOUD_CHANNEL,
            'mcloud-client': con.MCLOUD_CLIENT,
            'mcloud-sign': `${ts},${randStr},${sign}`,
            'mcloud-version': con.MCLOUD_VERSION,
            'Origin': 'https://yun.139.com',
            'Referer': 'https://yun.139.com/w/',
            'x-DeviceInfo': con.X_DEVICE_INFO,
            'x-huawei-channelSrc': con.X_HUAWEI_CHANNEL_SRC,
            'x-inner-ntwk': '2',
            'x-m4c-caller': 'PC',
            'x-m4c-src': '10002',
            'x-SvcType': svcType,
            'Inner-Hcy-Router-Https': '1',
            'Content-Type': 'application/json'
        };

        const response = await fetch(url, {
            method,
            headers,
            body: method === 'POST' ? bodyStr : undefined
        });

        return await response.json();
    }
}