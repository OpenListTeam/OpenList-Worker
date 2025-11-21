/** =========== OneDrive 工具类 ================
 * 本文件实现了OneDrive云存储服务的认证和工具功能，包括：
 * - Token刷新（支持在线API和本地客户端两种方式）
 * - API请求封装和错误处理
 * - 配置加载和保存
 * =========================================================
 * @author "OpenList Team"
 * @version 25.11.21
 * =======================================================*/

// 公用导入 =====================================================
import { Context } from "hono";
import { DriveResult } from "../DriveObject";
import { BasicClouds } from "../BasicClouds";
import * as con from "./const";
import { CONFIG_INFO, SAVING_INFO } from "./metas";

//====== OneDrive响应错误接口 ======
interface TokenError {
	error: string;
	error_description: string;
}

interface ResponseError {
	error: {
		code: string;
		message: string;
	};
}

//====== OneDrive工具类 ======
export class HostClouds extends BasicClouds {
	// 公共数据 ================================================
	declare public config: CONFIG_INFO;
	declare public saving: SAVING_INFO;

	/**
	 * 构造函数
	 * 初始化OneDrive工具类实例
	 */
	constructor(
		c: Context,
		router: string,
		config: Record<string, any> | any,
		saving: Record<string, any> | any
	) {
		super(c, router, config, saving);
	}

	/**
	 * 初始化配置
	 * 执行Token刷新并保存访问令牌
	 */
	async initConfig(): Promise<DriveResult> {
		console.log("[OneDrive] 开始初始化配置");
		console.log("[OneDrive] 配置信息:", {
			region: this.config.region,
			use_online_api: this.config.use_online_api,
			is_sharepoint: this.config.is_sharepoint,
			has_refresh_token: !!this.config.refresh_token,
			has_client_id: !!this.config.client_id,
		});

		try {
			await this.refreshToken();
			this.change = true;
			console.log("[OneDrive] Token刷新成功");
			return {
				flag: !!this.saving.access_token,
				text: "Token refreshed successfully",
			};
		} catch (error: any) {
			console.error("[OneDrive] 初始化失败:", error.message);
			console.error("[OneDrive] 错误堆栈:", error.stack);
			return {
				flag: false,
				text: error.message || "Failed to initialize config",
			};
		}
	}

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
	 * 检查Token是否过期，如果过期则刷新
	 */
	async loadSaving(): Promise<SAVING_INFO> {
		if (!this.saving || !this.saving.access_token) {
			await this.initConfig();
		} else if (this.isTokenExpired()) {
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
		let lastError: Error | null = null;
		
		// 重试3次
		for (let i = 0; i < 3; i++) {
			try {
				await this._refreshToken();
				return;
			} catch (error: any) {
				lastError = error;
				// 等待一段时间后重试
				if (i < 2) {
					await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
				}
			}
		}
		
		throw lastError || new Error("Failed to refresh token after 3 attempts");
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
		// 直接使用api_address作为完整URL（已包含完整路径）
		const url = new URL(this.config.api_address);
		url.searchParams.set("refresh_ui", this.config.refresh_token);
		url.searchParams.set("server_use", "true");
		url.searchParams.set("driver_txt", "onedrive_pr");
		
		console.log("[OneDrive] 使用在线API刷新Token");
		console.log("[OneDrive] 请求URL:", url.toString());

		const response = await fetch(url.toString(), {
			method: "GET",
			headers: {
				"User-Agent": "Mozilla/5.0 (Macintosh; Apple macOS 15_5) AppleWebKit/537.36 (KHTML, like Gecko) Safari/537.36 Chrome/138.0.0.0 Openlist/425.6.30",
			},
		});

		console.log("[OneDrive] 响应状态:", response.status, response.statusText);
		console.log("[OneDrive] 响应Content-Type:", response.headers.get("content-type"));

		if (!response.ok) {
			const errorText = await response.text();
			console.error("[OneDrive] 请求失败，响应内容:", errorText.substring(0, 500));
			throw new Error(`HTTP error! status: ${response.status}`);
		}

		const responseText = await response.text();
		console.log("[OneDrive] 响应内容:", responseText.substring(0, 500));

		let data: any;
		try {
			data = JSON.parse(responseText);
		} catch (error: any) {
			console.error("[OneDrive] JSON解析失败");
			console.error("[OneDrive] 响应内容:", responseText);
			throw new Error(`Failed to parse JSON response: ${error.message}`);
		}

if (!data.refresh_token || !data.access_token) {
			if (data.text) {
				throw new Error(`Failed to refresh token: ${data.text}`);
			}
			throw new Error("Empty token returned from official API");
		}

		this.saving.access_token = data.access_token;
		this.config.refresh_token = data.refresh_token;
		this.saving.refresh_token = data.refresh_token;
		this.change = true; // 标记配置已更改，需要保存
	}

	/**
	 * 使用本地客户端刷新Token
	 */
	private async _refreshTokenLocal(): Promise<void> {
		if (!this.config.client_id || !this.config.client_secret) {
			throw new Error("Empty ClientID or ClientSecret");
		}

		const host = con.ONEDRIVE_HOST_MAP[this.config.region] || con.ONEDRIVE_HOST_MAP.global;
		const url = `${host.oauth}/common/oauth2/v2.0/token`;

		console.log("[OneDrive] 使用本地客户端刷新Token");
		console.log("[OneDrive] 请求URL:", url);
		console.log("[OneDrive] 区域:", this.config.region);

		const formData = new URLSearchParams();
		formData.append("grant_type", "refresh_token");
		formData.append("client_id", this.config.client_id);
		formData.append("client_secret", this.config.client_secret);
		formData.append("redirect_uri", this.config.redirect_uri);
		formData.append("refresh_token", this.config.refresh_token);

		const response = await fetch(url, {
			method: "POST",
			headers: {
				"Content-Type": "application/x-www-form-urlencoded",
			},
			body: formData.toString(),
		});

		console.log("[OneDrive] 响应状态:", response.status, response.statusText);
		console.log("[OneDrive] 响应Content-Type:", response.headers.get("content-type"));

		const responseText = await response.text();
		console.log("[OneDrive] 响应内容:", responseText.substring(0, 500));

		let data: any;
		try {
			data = JSON.parse(responseText);
		} catch (error: any) {
			console.error("[OneDrive] JSON解析失败");
			console.error("[OneDrive] 响应内容:", responseText);
			throw new Error(`Failed to parse JSON response: ${error.message}`);
		}

		if (data.error) {
			throw new Error(data.error_description || data.error);
		}

		if (!data.refresh_token || !data.access_token) {
			throw new Error("Empty token returned");
		}

		this.saving.access_token = data.access_token;
		this.config.refresh_token = data.refresh_token;
		this.saving.refresh_token = data.refresh_token;
	}

	//====== API请求 ======
	/**
	 * 发送API请求
	 * 自动处理认证和错误重试
	 */
	async request(
		url: string,
		method: string = "GET",
		body?: any,
		headers?: Record<string, string>
	): Promise<any> {
		const requestHeaders: Record<string, string> = {
			Authorization: `Bearer ${this.saving.access_token}`,
			...headers,
		};

		const options: RequestInit = {
			method,
			headers: requestHeaders,
		};

		if (body) {
			if (body instanceof FormData || body instanceof ReadableStream) {
				options.body = body;
			} else {
				options.headers = {
					...requestHeaders,
					"Content-Type": "application/json",
				};
				options.body = JSON.stringify(body);
			}
		}

		const response = await fetch(url, options);
		
		// 处理错误响应
		if (!response.ok) {
			const errorData: ResponseError = await response.json().catch(() => ({}));
			
			// Token过期，刷新后重试
			if (errorData.error?.code === "InvalidAuthenticationToken") {
				await this.refreshToken();
				return this.request(url, method, body, headers);
			}
			
			throw new Error(errorData.error?.message || `HTTP error! status: ${response.status}`);
		}

		// 返回响应数据
		const contentType = response.headers.get("content-type");
		if (contentType && contentType.includes("application/json")) {
			return await response.json();
		}
		
		return await response.text();
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
	 * 获取元数据URL
	 * 根据路径和配置生成OneDrive API URL
	 */
	getMetaUrl(isAuth: boolean, path: string): string {
		const host = con.ONEDRIVE_HOST_MAP[this.config.region] || con.ONEDRIVE_HOST_MAP.global;
		
		if (isAuth) {
			return host.oauth;
		}

		// 编码路径
		const encodedPath = this.encodePath(path);

		if (this.config.is_sharepoint) {
			if (path === "/" || path === "\\") {
				return `${host.api}/v1.0/sites/${this.config.site_id}/drive/root`;
			} else {
				return `${host.api}/v1.0/sites/${this.config.site_id}/drive/root:${encodedPath}:`;
			}
		} else {
			if (path === "/" || path === "\\") {
				return `${host.api}/v1.0/me/drive/root`;
			} else {
				return `${host.api}/v1.0/me/drive/root:${encodedPath}:`;
			}
		}
	}

	/**
	 * 编码路径
	 * 对路径进行URL编码，保留斜杠
	 */
	private encodePath(path: string): string {
		return path
			.split("/")
			.map((segment) => encodeURIComponent(segment))
			.join("/");
	}
}
