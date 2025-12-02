/** =========== 阿里云盘 工具类 ================
 * 本文件实现了阿里云盘云存储服务的认证和工具功能，包括：
 * - Token刷新（支持在线API和本地客户端两种方式）
 * - API请求封装和错误处理
 * - 配置加载和保存
 * - 限流控制
 * =========================================================
 * @author "OpenList Team"
 * @version 25.11.21
 * =======================================================*/

//====== 公用导入 ======
import { Context } from "hono";
import { DriveResult } from "../DriveObject";
import { BasicClouds } from "../BasicClouds";
import * as con from "./const";
import { 
	CONFIG_INFO, 
	SAVING_INFO, 
	ErrorResponse, 
	TokenResponse, 
	OnlineApiResponse,
	DriveInfoResponse 
} from "./metas";

//====== 限流器类 ======
class RateLimiter {
	private tokens: number;
	private lastRefill: number;
	private readonly rate: number;
	private readonly capacity: number;

	constructor(rate: number) {
		this.rate = rate;
		this.capacity = 1;
		this.tokens = this.capacity;
		this.lastRefill = Date.now();
	}

	/**
	 * 等待获取令牌
	 */
	async wait(): Promise<void> {
		while (true) {
			const now = Date.now();
			const timePassed = (now - this.lastRefill) / 1000;
			this.tokens = Math.min(this.capacity, this.tokens + timePassed * this.rate);
			this.lastRefill = now;

			if (this.tokens >= 1) {
				this.tokens -= 1;
				return;
			}

			const waitTime = ((1 - this.tokens) / this.rate) * 1000;
			await new Promise(resolve => setTimeout(resolve, waitTime));
		}
	}
}

//====== 全局限流器管理 ======
class LimiterManager {
	private limiters: Map<string, {
		list: RateLimiter;
		link: RateLimiter;
		other: RateLimiter;
		usedBy: number;
	}> = new Map();

	/**
	 * 获取用户的限流器
	 */
	getLimiterForUser(userId: string): {
		list: RateLimiter;
		link: RateLimiter;
		other: RateLimiter;
		free: () => void;
	} {
		let limiter = this.limiters.get(userId);
		
		if (!limiter) {
			limiter = {
				list: new RateLimiter(con.RATE_LIMITS.LIST),
				link: new RateLimiter(con.RATE_LIMITS.LINK),
				other: new RateLimiter(con.RATE_LIMITS.OTHER),
				usedBy: 0,
			};
			this.limiters.set(userId, limiter);
		}

		limiter.usedBy++;

		return {
			list: limiter.list,
			link: limiter.link,
			other: limiter.other,
			free: () => {
				if (limiter) {
					limiter.usedBy--;
					// 清理不再使用的限流器
					if (limiter.usedBy <= 0 && userId !== "") {
						this.limiters.delete(userId);
					}
				}
			},
		};
	}
}

const limiterManager = new LimiterManager();

//====== 阿里云盘工具类 ======
export class HostClouds extends BasicClouds {
	declare public config: CONFIG_INFO;
	declare public saving: SAVING_INFO;
	
	private limiter: ReturnType<typeof limiterManager.getLimiterForUser> | null = null;

	/**
	 * 构造函数
	 * 初始化阿里云盘工具类实例
	 */
	constructor(
		c: Context,
		router: string,
		config: Record<string, any> | any,
		saving: Record<string, any> | any
	) {
		super(c, router, config, saving);
		
		// 设置默认值
		if (!this.config.drive_type) {
			this.config.drive_type = con.DEFAULTS.DRIVE_TYPE;
		}
		if (!this.config.livp_download_format) {
			this.config.livp_download_format = con.DEFAULTS.LIVP_FORMAT;
		}
		if (!this.config.root_folder_id) {
			this.config.root_folder_id = con.DEFAULTS.ROOT_FOLDER_ID;
		}
		if (!this.config.remove_way) {
			this.config.remove_way = con.DEFAULTS.REMOVE_WAY;
		}
	}

	//====== 初始化配置 ======
	/**
	 * 初始化配置
	 * 执行Token刷新并获取驱动器信息
	 */
	async initConfig(): Promise<DriveResult> {
		console.log("[AliCloud] 开始初始化配置");
		
		try {
			// 先创建全局限流器，确保后续操作可以使用
			if (!this.limiter) {
				this.limiter = limiterManager.getLimiterForUser("");
			}
			
			// 刷新Token
			await this.refreshToken();
			
			// 获取驱动器信息
			const driveInfo = await this.getDriveInfo();
			
			// 保存驱动器ID和用户ID
			this.saving.drive_id = driveInfo.drive_id;
			this.saving.user_id = driveInfo.user_id;
			
			// 释放全局限流器，创建用户专属限流器
			if (this.limiter) {
				this.limiter.free();
			}
			this.limiter = limiterManager.getLimiterForUser(driveInfo.user_id);
			
			this.change = true;
			console.log("[AliCloud] 初始化成功");
			
			return {
				flag: true,
				text: "初始化成功",
			};
		} catch (error: any) {
			console.error("[AliCloud] 初始化失败:", error.message);
			
			// 释放限流器
			if (this.limiter) {
				this.limiter.free();
				this.limiter = null;
			}
			
			return {
				flag: false,
				text: error.message || "初始化失败",
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

	//====== 加载保存的认证信息 ======
	/**
	 * 加载保存的认证信息
	 * 检查Token是否过期，如果过期则刷新
	 */
	async loadSaving(): Promise<SAVING_INFO> {
		if (!this.saving || !this.saving.access_token) {
			await this.initConfig();
		} else if (this.isTokenExpired()) {
			// 确保限流器已初始化
			if (!this.limiter) {
				this.limiter = limiterManager.getLimiterForUser(this.saving.user_id || "");
			}
			// await this.refreshToken();
		} else if (this.saving.user_id && !this.limiter) {
			// 创建用户专属限流器
			this.limiter = limiterManager.getLimiterForUser(this.saving.user_id);
		}
		
		return this.saving;
	}

	//====== Token刷新 ======
	/**
	 * 刷新访问令牌
	 * 支持在线API和本地客户端两种方式
	 */
	async refreshToken(): Promise<void> {
		let lastError: Error | null = null;
		
		// 重试3次
		for (let i = 0; i < 3; i++) {
			try {
				await this._refreshToken();
				console.log("[AliCloud] Token刷新成功");
				return;
			} catch (error: any) {
				console.error(`[AliCloud] Token刷新失败 (尝试 ${i + 1}/3):`, error.message);
				lastError = error;
				
				// 等待后重试
				if (i < 2) {
					await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
				}
			}
		}
		
		throw lastError || new Error("Token刷新失败，已重试3次");
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
		
		// 标记配置已更改，需要保存
		this.change = true;
	}

	/**
	 * 使用在线API刷新Token
	 */
	private async _refreshTokenOnline(): Promise<void> {
		const url = this.config.api_address;
		
		console.log("[AliCloud] 使用在线API刷新Token");
		console.log("[AliCloud] 请求URL:", url);

		// 根据阿里云盘类型选择driver_txt
		const driverTxt = this.config.alipan_type === "alipanTV" ? "alicloud_tv" : "alicloud_qr";

		// 确保限流器已初始化
		if (!this.limiter) {
			this.limiter = limiterManager.getLimiterForUser("");
		}

		// 等待限流
		await this.wait(con.LimiterType.OTHER);

		// 构建查询参数
		const params = new URLSearchParams({
			refresh_ui: this.config.refresh_token,
			server_use: "true",
			driver_txt: driverTxt,
		});

		const fullUrl = `${url}?${params.toString()}`;
		const apiResponse = await fetch(fullUrl, {
			method: "GET",
			headers: {
				"User-Agent": "Mozilla/5.0 (Macintosh; Apple macOS 15_5) AppleWebKit/537.36 (KHTML, like Gecko) Safari/537.36 Chrome/138.0.0.0 Openlist/425.6.30",
			},
		});

		if (!apiResponse.ok) {
			throw new Error(`HTTP error! status: ${apiResponse.status}`);
		}

		const data: OnlineApiResponse = await apiResponse.json();

		if (!data.refresh_token || !data.access_token) {
			if (data.text) {
				throw new Error(`Token刷新失败: ${data.text}`);
			}
			throw new Error("在线API返回空Token");
		}

		this.saving.access_token = data.access_token;
		this.config.refresh_token = data.refresh_token;
		this.saving.refresh_token = data.refresh_token;
		
		// 保存到数据库
		await this.putSaves();
	}

	/**
	 * 使用本地客户端刷新Token
	 */
	private async _refreshTokenLocal(): Promise<void> {
		if (!this.config.client_id || !this.config.client_secret) {
			throw new Error("缺少ClientID或ClientSecret");
		}

		const url = `${con.API_URL}${con.API_ENDPOINTS.OAUTH_TOKEN}`;
		
		console.log("[AliCloud] 使用本地客户端刷新Token");
		console.log("[AliCloud] 请求URL:", url);

		// 确保限流器已初始化
		if (!this.limiter) {
			this.limiter = limiterManager.getLimiterForUser("");
		}

		// 等待限流
		await this.wait(con.LimiterType.OTHER);

		const response = await fetch(url, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				client_id: this.config.client_id,
				client_secret: this.config.client_secret,
				grant_type: "refresh_token",
				refresh_token: this.config.refresh_token,
			}),
		});

		const responseText = await response.text();
		console.log("[AliCloud] 响应内容:", responseText.substring(0, 500));

		let data: any;
		try {
			data = JSON.parse(responseText);
		} catch (error: any) {
			throw new Error(`JSON解析失败: ${error.message}`);
		}

		if (data.code) {
			throw new Error(`Token刷新失败: ${data.message}`);
		}

		const refreshToken = data.refresh_token;
		const accessToken = data.access_token;

		if (!refreshToken) {
			throw new Error(`Token刷新失败: refresh_token为空`);
		}

		// 验证sub是否匹配
		const curSub = this.getSub(this.config.refresh_token);
		const newSub = this.getSub(refreshToken);
		
		if (curSub !== newSub) {
			throw new Error("Token刷新失败: sub不匹配");
		}

		this.saving.access_token = accessToken;
		this.config.refresh_token = refreshToken;
		this.saving.refresh_token = refreshToken;
		
		// 保存到数据库
		await this.putSaves();
	}

	/**
	 * 从JWT Token中提取sub
	 */
	private getSub(token: string): string {
		const segments = token.split(".");
		if (segments.length !== 3) {
			throw new Error("不是有效的JWT Token");
		}
		
		try {
			const payload = atob(segments[1].replace(/-/g, "+").replace(/_/g, "/"));
			const data = JSON.parse(payload);
			return data.sub || "";
		} catch (error) {
			throw new Error("JWT Token解析失败");
		}
	}

	//====== 获取驱动器信息 ======
	/**
	 * 获取驱动器信息
	 */
	private async getDriveInfo(): Promise<{ drive_id: string; user_id: string }> {
		const response = await this.request(
			con.API_ENDPOINTS.GET_DRIVE_INFO,
			"POST",
			{},
			con.LimiterType.OTHER
		);

		const driveIdKey = `${this.config.drive_type}_drive_id`;
		const driveId = response[driveIdKey];
		const userId = response.user_id;

		if (!driveId || !userId) {
			throw new Error("获取驱动器信息失败");
		}

		return { drive_id: driveId, user_id: userId };
	}

	//====== API请求 ======
	/**
	 * 发送API请求
	 * 自动处理认证、限流和错误重试
	 */
	async request(
		endpoint: string,
		method: string = "POST",
		body?: any,
		limiterType: con.LimiterType = con.LimiterType.OTHER,
		retry: boolean = false
	): Promise<any> {
		// 等待限流
		await this.wait(limiterType);

		const url = `${con.API_URL}${endpoint}`;
		const headers: Record<string, string> = {
			Authorization: `Bearer ${this.saving.access_token || ""}`,
		};

		if (method === "POST") {
			headers["Content-Type"] = "application/json";
		}

		const options: RequestInit = {
			method,
			headers,
		};

		if (body && method === "POST") {
			options.body = JSON.stringify(body);
		}

		const response = await fetch(url, options);
		const responseText = await response.text();

		let data: any;
		try {
			data = JSON.parse(responseText);
		} catch (error) {
			throw new Error(`API响应解析失败: ${responseText.substring(0, 200)}`);
		}

		// 处理错误
		if (data.code) {
			const errorCode = data.code;
			
			// Token过期或无效，刷新后重试
			if (
				!retry &&
				(errorCode === con.ERROR_CODES.ACCESS_TOKEN_INVALID ||
				 errorCode === con.ERROR_CODES.ACCESS_TOKEN_EXPIRED ||
				 errorCode === con.ERROR_CODES.I400JD ||
				 !this.saving.access_token)
			) {
				await this.refreshToken();
				return this.request(endpoint, method, body, limiterType, true);
			}
			
			throw new Error(`${errorCode}: ${data.message}`);
		}

		return data;
	}

	//====== 限流控制 ======
	/**
	 * 等待限流器
	 */
	async wait(limiterType: con.LimiterType): Promise<void> {
		if (!this.limiter) {
			throw new Error("驱动未初始化");
		}

		switch (limiterType) {
			case con.LimiterType.LIST:
				await this.limiter.list.wait();
				break;
			case con.LimiterType.LINK:
				await this.limiter.link.wait();
				break;
			case con.LimiterType.OTHER:
				await this.limiter.other.wait();
				break;
		}
	}

	//====== 工具方法 ======
	/**
	 * 检查Token是否过期
	 */
	private isTokenExpired(): boolean {
		if (!this.saving.expires_at) {
			return true;
		}
		// 提前5分钟刷新
		return Date.now() >= this.saving.expires_at - 5 * 60 * 1000;
	}

	/**
	 * 释放限流器
	 */
	free(): void {
		if (this.limiter) {
			this.limiter.free();
			this.limiter = null;
		}
	}
}
