/** =========== 123云盘 工具类 ================
 * 本文件实现了123云盘存储服务的认证和工具功能，包括：
 * - Token刷新和管理
 * - API请求封装和错误处理
 * - 配置加载和保存
 * - QPS限流控制
 * =========================================================
 * @author "OpenList Team"
 * @version 25.11.21
 * =======================================================*/

// 公用导入 =====================================================
import { Context } from "hono";
import { DriveResult } from "../DriveObject";
import { BasicClouds } from "../BasicClouds";
import * as con from "./const";
import {
	CONFIG_INFO,
	SAVING_INFO,
	BaseResponse,
	AccessTokenResponse,
	RefreshTokenResponse,
	UserInfoResponse,
} from "./metas";

//====== QPS限流器类 ======
class QPSLimiter {
	private qps: number;
	private tokens: number;
	private lastRefillTime: number;

	constructor(qps: number) {
		this.qps = qps;
		this.tokens = qps;
		this.lastRefillTime = Date.now();
	}

	/**
	 * 等待获取令牌
	 * 实现令牌桶算法进行QPS限流
	 */
	async acquire(): Promise<void> {
		if (this.qps <= 0) return;

		// 补充令牌
		const now = Date.now();
		const elapsed = (now - this.lastRefillTime) / 1000;
		this.tokens = Math.min(this.qps, this.tokens + elapsed * this.qps);
		this.lastRefillTime = now;

		// 如果没有令牌，等待
		if (this.tokens < 1) {
			const waitTime = ((1 - this.tokens) / this.qps) * 1000;
			await new Promise((resolve) => setTimeout(resolve, waitTime));
			this.tokens = 0;
		} else {
			this.tokens -= 1;
		}
	}
}

//====== 123云盘工具类 ======
export class HostClouds extends BasicClouds {
	// 公共数据 ================================================
	declare public config: CONFIG_INFO;
	declare public saving: SAVING_INFO;
	private qpsLimiters: Map<string, QPSLimiter> = new Map();
	private uid: number = 0;

	/**
	 * 构造函数
	 * 初始化123云盘工具类实例
	 */
	constructor(
		c: Context,
		router: string,
		config: Record<string, any> | any,
		saving: Record<string, any> | any
	) {
		super(c, router, config, saving);
		this.initQPSLimiters();
	}

	//====== 初始化QPS限流器 ======
	/**
	 * 初始化QPS限流器
	 * 为每个API端点创建对应的限流器
	 */
	private initQPSLimiters(): void {
		for (const [key, qps] of Object.entries(con.QPS_LIMITS)) {
			this.qpsLimiters.set(key, new QPSLimiter(qps));
		}
	}

	//====== 初始化配置 ======
	/**
	 * 初始化配置
	 * 验证Token并获取用户信息
	 */
	async initConfig(): Promise<DriveResult> {
		console.log("[123云盘] 开始初始化配置");
		console.log("[123云盘] 配置信息:", {
			has_client_id: !!this.config.client_id,
			has_client_secret: !!this.config.client_secret,
			has_refresh_token: !!this.config.refresh_token,
			has_access_token: !!this.config.access_token,
		});

		try {
			// 刷新AccessToken
			console.log("[123云盘] 开始刷新AccessToken");
			await this.flushAccessToken();
			console.log("[123云盘] AccessToken刷新成功");

			// 验证Token
			console.log("[123云盘] 开始获取用户信息");
			const userInfo = await this.getUserInfo();
			console.log("[123云盘] 用户信息获取成功:", {
				has_data: !!userInfo?.data,
				uid: userInfo?.data?.uid,
			});
			if (!userInfo || !userInfo.data) {
				return {
					flag: false,
					text: "Failed to get user info",
				};
			}

			// 保存用户信息
			this.saving.uid = userInfo.data.uid;
			this.uid = userInfo.data.uid;
			this.change = true;

			console.log("[123云盘] 初始化成功");
			return {
				flag: true,
				text: "Initialized successfully",
			};
		} catch (error: any) {
			console.error("[123云盘] 初始化失败:", {
				message: error.message,
				stack: error.stack,
				error: error,
			});
			return {
				flag: false,
				text: error.message || "Failed to initialize config",
			};
		}
	}

	//====== 加载配置 ======
	/**
	 * 加载配置
	 * 从数据库加载配置信息
	 */
	async loadConfig(): Promise<CONFIG_INFO> {
		await this.getSaves();
		return this.config;
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

	//====== Token管理 ======
	/**
	 * 刷新AccessToken
	 * 根据配置使用不同的方式获取AccessToken
	 */
	async flushAccessToken(): Promise<void> {
		// 如果有ClientID和RefreshToken，使用RefreshToken刷新
		if (this.config.client_id && this.config.refresh_token) {
			try {
				const limiter = this.qpsLimiters.get("REFRESH_TOKEN");
				if (limiter) await limiter.acquire();

				const url = `${con.API_BASE_URL}${con.API_PATHS.REFRESH_TOKEN}`;
				const params = new URLSearchParams({
					client_id: this.config.client_id,
					grant_type: "refresh_token",
					refresh_token: this.config.refresh_token,
				});

				if (this.config.client_secret) {
					params.append("client_secret", this.config.client_secret);
				}

				console.log("[123云盘] 使用RefreshToken刷新AccessToken", {
					url,
					has_client_secret: !!this.config.client_secret,
				});
				const response = await fetch(`${url}?${params.toString()}`, {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						platform: "open_platform",
					},
				});

				if (!response.ok) {
					const errorText = await response.text();
					console.error("[123云盘] RefreshToken请求失败:", {
						status: response.status,
						statusText: response.statusText,
						responseBody: errorText,
					});
					
					// 如果是401错误且有ClientSecret，尝试使用ClientSecret获取新Token
					if (response.status === 401 && this.config.client_secret) {
						console.log("[123云盘] RefreshToken已失效，尝试使用ClientSecret获取新Token");
						// 清除无效的refresh_token
						this.saving.refresh_token = undefined;
						this.change = true;
						// fallback到ClientSecret方式
						return await this.getAccessTokenByClientSecret();
					}
					
					throw new Error(`HTTP error! status: ${response.status}`);
				}

				const data: RefreshTokenResponse = await response.json();
				this.saving.access_token = data.access_token;
				this.saving.refresh_token = data.refresh_token;
				this.change = true;
				return;
			} catch (error) {
				// 如果RefreshToken方式失败且有ClientSecret，尝试使用ClientSecret
				if (this.config.client_secret) {
					console.log("[123云盘] RefreshToken刷新异常，尝试使用ClientSecret获取新Token");
					this.saving.refresh_token = undefined;
					this.change = true;
					return await this.getAccessTokenByClientSecret();
				}
				throw error;
			}
		}
		// 如果有ClientID和ClientSecret，使用ClientSecret获取AccessToken
		else if (this.config.client_id && this.config.client_secret) {
			return await this.getAccessTokenByClientSecret();
		}
		// 如果直接提供了AccessToken
		else if (this.config.access_token) {
			this.saving.access_token = this.config.access_token;
		}
	}

	// 使用ClientSecret获取AccessToken的独立方法
	private async getAccessTokenByClientSecret(): Promise<void> {
		if (!this.config.client_id || !this.config.client_secret) {
			throw new Error("Missing client_id or client_secret");
		}
		
		const limiter = this.qpsLimiters.get("ACCESS_TOKEN");
		if (limiter) await limiter.acquire();

		const url = `${con.API_BASE_URL}${con.API_PATHS.ACCESS_TOKEN}`;
		console.log("[123云盘] 使用ClientSecret获取AccessToken", { url });
		const response = await fetch(url, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				platform: "open_platform",
			},
			body: JSON.stringify({
				clientID: this.config.client_id,
				clientSecret: this.config.client_secret,
			}),
		});

		if (!response.ok) {
			const errorText = await response.text();
			console.error("[123云盘] ClientSecret请求失败:", {
				status: response.status,
				statusText: response.statusText,
				responseBody: errorText,
			});
			throw new Error(`HTTP error! status: ${response.status}`);
		}

		const data: AccessTokenResponse = await response.json();
		if (data.code !== 0) {
			throw new Error(data.message || "Failed to get access token");
		}

		this.saving.access_token = data.data.accessToken;
		this.change = true;
	}

	//====== API请求 ======
	/**
	 * 发送API请求
	 * 自动处理认证、限流和错误重试
	 */
	async request(
		apiPath: string,
		method: string = "GET",
		body?: any,
		headers?: Record<string, string>,
		retryToken: boolean = true
	): Promise<any> {
		// QPS限流
		const apiKey = Object.keys(con.API_PATHS).find(
			(key) => con.API_PATHS[key as keyof typeof con.API_PATHS] === apiPath
		);
		if (apiKey) {
			const limiter = this.qpsLimiters.get(apiKey);
			if (limiter) await limiter.acquire();
		}

		// 构建请求头
		const requestHeaders: Record<string, string> = {
			authorization: `Bearer ${this.saving.access_token}`,
			platform: "open_platform",
			"Content-Type": "application/json",
			...headers,
		};

		// 构建请求选项
		const url = `${con.API_BASE_URL}${apiPath}`;
		const options: RequestInit = {
			method,
			headers: requestHeaders,
		};

		// 处理请求体
		if (body) {
			if (method === "GET") {
				// GET请求将参数添加到URL
				const params = new URLSearchParams();
				for (const [key, value] of Object.entries(body)) {
					if (value !== undefined && value !== null) {
						params.append(key, String(value));
					}
				}
				const separator = url.includes("?") ? "&" : "?";
				return this.executeRequest(`${url}${separator}${params.toString()}`, options, retryToken);
			} else {
				// POST/PUT请求使用JSON格式
				options.body = JSON.stringify(body);
			}
		}

		return this.executeRequest(url, options, retryToken);
	}

	/**
	 * 执行API请求
	 * 处理响应和错误重试
	 */
	private async executeRequest(
		url: string,
		options: RequestInit,
		retryToken: boolean
	): Promise<any> {
		const response = await fetch(url, options);

		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`);
		}

		const data: BaseResponse = await response.json();

		// 处理业务错误
		if (data.code === 0) {
			return data;
		} else if (data.code === 401 && retryToken) {
			// Token过期，刷新后重试
			await this.flushAccessToken();
			return this.executeRequest(url, options, false);
		} else if (data.code === 429) {
			// 请求过于频繁，等待后重试
			await new Promise((resolve) => setTimeout(resolve, 500));
			return this.executeRequest(url, options, retryToken);
		} else {
			throw new Error(data.message || `API error: ${data.code}`);
		}
	}

	//====== 用户信息 ======
	/**
	 * 获取用户信息
	 * 用于验证Token和获取空间信息
	 */
	async getUserInfo(): Promise<UserInfoResponse> {
		return await this.request(con.API_PATHS.USER_INFO, "GET");
	}

	/**
	 * 获取用户ID
	 * 缓存用户ID避免重复请求
	 */
	async getUID(): Promise<number> {
		if (this.uid !== 0) {
			return this.uid;
		}
		const userInfo = await this.getUserInfo();
		this.uid = userInfo.data.uid;
		return this.uid;
	}

	//====== 工具方法 ======
	/**
	 * 计算MD5哈希
	 * 对数据进行MD5哈希计算
	 */
	async calculateMD5(data: ArrayBuffer): Promise<string> {
		// 注意：Web Crypto API不支持MD5，需要使用第三方库
		// 这里提供接口，实际实现需要根据环境选择合适的MD5库
		// 例如：crypto-js、spark-md5等
		throw new Error("MD5 calculation not implemented");
	}

	/**
	 * 生成URL签名
	 * 用于直链URL鉴权
	 */
	async signURL(
		originURL: string,
		privateKey: string,
		uid: number,
		validDuration: number
	): Promise<string> {
		// 生成Unix时间戳
		const ts = Math.floor(Date.now() / 1000) + validDuration * 60;

		// 生成随机数（UUID，不包含中划线）
		const rand = crypto.randomUUID().replace(/-/g, "");

		// 解析URL
		const urlObj = new URL(originURL);

		// 待签名字符串：path-timestamp-rand-uid-privateKey
		const unsignedStr = `${urlObj.pathname}-${ts}-${rand}-${uid}-${privateKey}`;

		// 计算MD5哈希
		const encoder = new TextEncoder();
		const data = encoder.encode(unsignedStr);
		const hashBuffer = await crypto.subtle.digest("MD5", data);
		const hashArray = Array.from(new Uint8Array(hashBuffer));
		const md5Hash = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

		// 生成鉴权参数：timestamp-rand-uid-md5hash
		const authKey = `${ts}-${rand}-${uid}-${md5Hash}`;

		// 添加鉴权参数到URL
		urlObj.searchParams.append("auth_key", authKey);

		return urlObj.toString();
	}
}
