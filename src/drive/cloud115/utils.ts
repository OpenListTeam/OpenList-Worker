/** =========== 115云盘 工具类 ================
 * 本文件实现了115云盘存储服务的认证和工具功能，包括：
 * - Token刷新和管理
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
import { CONFIG_INFO, SAVING_INFO, Cloud115UserInfoResponse } from "./metas";

//====== 115云盘响应错误接口 ======
interface ResponseError {
	state: boolean;
	error?: string;
	errno?: number;
	errtype?: string;
}

//====== 115云盘工具类 ======
export class HostClouds extends BasicClouds {
	// 公共数据 ================================================
	declare public config: CONFIG_INFO;
	declare public saving: SAVING_INFO;
	private lastRequestTime: number = 0;

	/**
	 * 构造函数
	 * 初始化115云盘工具类实例
	 */
	constructor(
		c: Context,
		router: string,
		config: Record<string, any> | any,
		saving: Record<string, any> | any
	) {
		super(c, router, config, saving);
	}

	//====== 初始化配置 ======
	/**
	 * 初始化配置
	 * 验证Token并获取用户信息
	 */
	async initConfig(): Promise<DriveResult> {
		console.log("[115云盘] ========== 开始初始化配置 ==========");
		console.log("[115云盘] 配置信息:", {
			has_cookie: !!this.config.cookie,
			cookie_length: this.config.cookie?.length || 0,
			cookie_preview: this.config.cookie ? this.config.cookie.substring(0, 50) + "..." : "(empty)",
			root_folder_id: this.config.root_folder_id,
			order_by: this.config.order_by,
			order_direction: this.config.order_direction,
			limit_rate: this.config.limit_rate,
		});

		try {
			// 验证Cookie
			if (!this.config.cookie) {
				console.error("[115云盘] Cookie为空，初始化失败");
				return {
					flag: false,
					text: "Cookie is required",
				};
			}

			// 检查Cookie格式
			const cookieParts = this.config.cookie.split(";").map(p => p.trim());
			const cookieKeys = cookieParts.map(p => p.split("=")[0]);
			console.log("[115云盘] Cookie包含的字段:", cookieKeys);

			// 验证Cookie并获取用户信息
			console.log("[115云盘] 正在验证Cookie并获取用户信息...");
			const userInfo = await this.getUserInfo();
			console.log("[115云盘] 用户信息响应:", {
				state: userInfo?.state,
				has_data: !!userInfo?.data,
				user_id: userInfo?.data?.user_id,
				user_name: userInfo?.data?.user_name,
			});

			if (!userInfo || !userInfo.state) {
				console.error("[115云盘] 获取用户信息失败，Cookie可能无效");
				console.error("[115云盘] 完整响应:", JSON.stringify(userInfo, null, 2));
				return {
					flag: false,
					text: "Failed to get user info, please check your cookie",
				};
			}

			// 保存用户信息
			this.saving.cookie = this.config.cookie;
			this.saving.user_id = userInfo.data?.user_id;
			this.saving.user_name = userInfo.data?.user_name;
			this.change = true;

			console.log("[115云盘] ========== 初始化成功 ==========");
			console.log("[115云盘] 用户名:", this.saving.user_name);
			console.log("[115云盘] 用户ID:", this.saving.user_id);
			return {
				flag: true,
				text: "Initialized successfully",
			};
		} catch (error: any) {
			console.error("[115云盘] ========== 初始化失败 ==========");
			console.error("[115云盘] 错误类型:", error.constructor.name);
			console.error("[115云盘] 错误消息:", error.message);
			console.error("[115云盘] 错误堆栈:", error.stack);
			if (error.cause) {
				console.error("[115云盘] 错误原因:", error.cause);
			}
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
		if (!this.saving || !this.saving.cookie) {
			await this.initConfig();
		}
		return this.saving;
	}

	//====== 限流控制 ======
	/**
	 * 等待限流
	 * 根据配置的限流速率控制请求频率
	 */
	private async waitLimit(): Promise<void> {
		if (!this.config.limit_rate || this.config.limit_rate <= 0) {
			return;
		}

		const now = Date.now();
		const minInterval = 1000 / this.config.limit_rate; // 毫秒
		const elapsed = now - this.lastRequestTime;

		if (elapsed < minInterval) {
			const waitTime = minInterval - elapsed;
			await new Promise(resolve => setTimeout(resolve, waitTime));
		}

		this.lastRequestTime = Date.now();
	}

	//====== API请求 ======
	/**
	 * 发送API请求
	 * 自动处理认证、限流和错误重试
	 */
	async request(
		url: string,
		method: string = "GET",
		body?: any,
		headers?: Record<string, string>,
		isFormData: boolean = false
	): Promise<any> {
		// 限流控制
		await this.waitLimit();

		const requestHeaders: Record<string, string> = {
			"User-Agent": "Mozilla/5.0 115disk/42.0.0.2",
			"Cookie": this.config.cookie || this.saving.cookie || "",
			...headers,
		};

		const options: RequestInit = {
			method,
			headers: requestHeaders,
		};

		let finalUrl = url;

		if (body) {
			if (isFormData || body instanceof FormData || body instanceof ReadableStream) {
				options.body = body;
			} else if (typeof body === "object") {
				// 对于GET请求，将参数添加到URL
				if (method === "GET") {
					const params = new URLSearchParams();
					for (const [key, value] of Object.entries(body)) {
						if (value !== undefined && value !== null) {
							params.append(key, String(value));
						}
					}
					const separator = url.includes("?") ? "&" : "?";
					finalUrl = `${url}${separator}${params.toString()}`;
				} else {
					// POST请求使用表单格式
					const formData = new URLSearchParams();
					for (const [key, value] of Object.entries(body)) {
						if (value !== undefined && value !== null) {
							formData.append(key, String(value));
						}
					}
					options.body = formData.toString();
					requestHeaders["Content-Type"] = "application/x-www-form-urlencoded";
				}
			} else {
				options.body = body;
			}
		}

		console.log("[115云盘] API请求:", {
			method,
			url: finalUrl,
			has_cookie: !!requestHeaders.Cookie,
			cookie_length: requestHeaders.Cookie?.length || 0,
		});

		let response: Response;
		try {
			response = await fetch(finalUrl, options);
			console.log("[115云盘] API响应:", {
				status: response.status,
				statusText: response.statusText,
				ok: response.ok,
				contentType: response.headers.get("content-type"),
			});
		} catch (error: any) {
			console.error("[115云盘] 网络请求失败:", error.message);
			throw new Error(`Network error: ${error.message}`);
		}

		// 处理错误响应
		if (!response.ok) {
			const errorText = await response.text();
			console.error("[115云盘] HTTP错误响应:", {
				status: response.status,
				statusText: response.statusText,
				body: errorText.substring(0, 500),
			});
			throw new Error(`HTTP error! status: ${response.status}`);
		}

		// 返回响应数据
		const contentType = response.headers.get("content-type");
		if (contentType && contentType.includes("application/json")) {
			const data: ResponseError = await response.json();
			console.log("[115云盘] API响应数据:", {
				state: data.state,
				has_error: !!data.error,
				error: data.error,
				errno: data.errno,
				errtype: data.errtype,
			});
			
			// 检查业务错误
			if (data.state === false) {
				console.error("[115云盘] 业务错误:", {
					error: data.error,
					errno: data.errno,
					errtype: data.errtype,
				});
				throw new Error(data.error || data.errtype || "Request failed");
			}
			
			return data;
		}

		return await response.text();
	}

	//====== 用户信息 ======
	/**
	 * 获取用户信息
	 * 用于验证Token和获取空间信息
	 */
	async getUserInfo(): Promise<Cloud115UserInfoResponse> {
		const url = `${con.API_BASE_URL}${con.API_PATHS.USER_INFO}`;
		console.log("[115云盘] 正在获取用户信息，URL:", url);
		const result = await this.request(url, "GET");
		console.log("[115云盘] 用户信息获取完成");
		return result;
	}

	//====== 工具方法 ======
	/**
	 * 构建API URL
	 * 根据路径构建完整的API URL
	 */
	getApiUrl(path: string): string {
		return `${con.API_BASE_URL}${path}`;
	}

	/**
	 * 构建上传API URL
	 * 根据路径构建完整的上传API URL
	 */
	getUploadUrl(path: string): string {
		return `${con.UPLOAD_BASE_URL}${path}`;
	}

	/**
	 * 计算SHA1哈希
	 * 对数据进行SHA1哈希计算
	 */
	async calculateSHA1(data: ArrayBuffer): Promise<string> {
		const hashBuffer = await crypto.subtle.digest("SHA-1", data);
		const hashArray = Array.from(new Uint8Array(hashBuffer));
		const hashHex = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
		return hashHex.toUpperCase();
	}

	/**
	 * 计算分块大小
	 * 根据文件大小计算合适的分块大小
	 */
	calculatePartSize(fileSize: number): number {
		const MB = 1024 * 1024;
		const GB = 1024 * MB;
		const TB = 1024 * GB;

		let partSize = 20 * MB;

		if (fileSize > partSize) {
			if (fileSize > 1 * TB) {
				partSize = 5 * GB;
			} else if (fileSize > 768 * GB) {
				partSize = Math.floor(104.8576 * MB);
			} else if (fileSize > 512 * GB) {
				partSize = Math.floor(78.6432 * MB);
			} else if (fileSize > 384 * GB) {
				partSize = Math.floor(52.4288 * MB);
			} else if (fileSize > 256 * GB) {
				partSize = Math.floor(39.3216 * MB);
			} else if (fileSize > 128 * GB) {
				partSize = Math.floor(26.2144 * MB);
			}
		}

		return partSize;
	}
}
