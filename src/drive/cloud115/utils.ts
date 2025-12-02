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
	data?: any;
}

//====== 115云盘工具类 ======
export class HostClouds extends BasicClouds {
	// 公共数据 ================================================
	declare public config: CONFIG_INFO;
	declare public saving: SAVING_INFO;
	private lastRequestTime: number = 0;
	private consecutiveErrors: number = 0; // 连续错误计数
	private lastErrorTime: number = 0; // 上次错误时间

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
			has_access_token: !!this.config.access_token,
			access_token_length: this.config.access_token?.length || 0,
			has_refresh_token: !!this.config.refresh_token,
			refresh_token_length: this.config.refresh_token?.length || 0,
			root_folder_id: this.config.root_folder_id,
			order_by: this.config.order_by,
			order_direction: this.config.order_direction,
			limit_rate: this.config.limit_rate,
		});

		try {
			// 验证AccessToken
			if (!this.config.access_token) {
				console.error("[115云盘] AccessToken为空，初始化失败");
				return {
					flag: false,
					text: "AccessToken is required. Please configure access_token and refresh_token from 115 Open API.",
				};
			}

			if (!this.config.refresh_token) {
				console.error("[115云盘] RefreshToken为空，初始化失败");
				return {
					flag: false,
					text: "RefreshToken is required. Please configure access_token and refresh_token from 115 Open API.",
				};
			}

			// 验证Token并获取用户信息
			console.log("[115云盘] 正在验证Token并获取用户信息...");
			const userInfo = await this.getUserInfo();
			console.log("[115云盘] 用户信息响应:", {
				state: userInfo?.state,
				has_data: !!userInfo?.data,
				user_id: userInfo?.data?.user_id,
				user_name: userInfo?.data?.user_name,
			});

			if (!userInfo || !userInfo.state) {
				console.error("[115云盘] 获取用户信息失败，Token可能无效");
				console.error("[115云盘] 完整响应:", JSON.stringify(userInfo, null, 2));
				return {
					flag: false,
					text: "Failed to get user info, please check your access_token and refresh_token",
				};
			}

			// 保存用户信息和Token
			this.saving.access_token = this.config.access_token;
			this.saving.refresh_token = this.config.refresh_token;
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
		if (!this.saving || !this.saving.access_token) {
			await this.initConfig();
		}
		return this.saving;
	}

	//====== 限流控制 ======
	/**
	 * 等待限流
	 * 根据配置的限流速率控制请求频率
/**
	 * 智能限流控制
	 * 包含基础限流和错误退避策略
	 */
	private async waitLimit(): Promise<void> {
		// 基础限流控制
		if (this.config.limit_rate && this.config.limit_rate > 0) {
			const now = Date.now();
			const minInterval = 1000 / this.config.limit_rate; // 毫秒
			const elapsed = now - this.lastRequestTime;

			if (elapsed < minInterval) {
				const waitTime = minInterval - elapsed;
				await new Promise(resolve => setTimeout(resolve, waitTime));
			}

			this.lastRequestTime = Date.now();
		}

		// 错误退避策略
		if (this.consecutiveErrors > 0) {
			const now = Date.now();
			const timeSinceLastError = now - this.lastErrorTime;
			
			// 指数退避：错误次数越多，等待时间越长
			const backoffTime = Math.min(1000 * Math.pow(2, this.consecutiveErrors - 1), 30000); // 最大30秒
			
			if (timeSinceLastError < backoffTime) {
				const waitTime = backoffTime - timeSinceLastError;
				console.log(`[115云盘] 错误退避等待: ${waitTime}ms (连续错误: ${this.consecutiveErrors})`);
				await new Promise(resolve => setTimeout(resolve, waitTime));
			}
		}
	}

	/**
	 * 记录API错误，用于退避策略
	 */
	private recordError(): void {
		this.consecutiveErrors++;
		this.lastErrorTime = Date.now();
		console.log(`[115云盘] 记录API错误，连续错误次数: ${this.consecutiveErrors}`);
	}

	/**
	 * 记录API成功，重置错误计数
	 */
	private recordSuccess(): void {
		if (this.consecutiveErrors > 0) {
			console.log(`[115云盘] API调用成功，重置错误计数 (之前: ${this.consecutiveErrors})`);
			this.consecutiveErrors = 0;
		}
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

const accessToken = this.config.access_token || this.saving.access_token || "";
		const refreshToken = this.config.refresh_token || this.saving.refresh_token || "";
		
		const requestHeaders: Record<string, string> = {
			"User-Agent": "Mozilla/5.0 115disk/42.0.0.2",
			"Accept": "application/json",
			...headers,
		};

		// 115 Open API使用Bearer Token认证
		if (accessToken) {
			requestHeaders["Authorization"] = `Bearer ${accessToken}`;
		}
		
		// 对于传统API接口，使用Cookie认证
		if (url.includes("/app/") && accessToken) {
			const cookies = [];
			cookies.push(`115_token=${accessToken}`);
			if (refreshToken) {
				cookies.push(`115_refresh=${refreshToken}`);
			}
			requestHeaders["Cookie"] = cookies.join("; ");
		}

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
			has_authorization: !!requestHeaders.Authorization,
			authorization_length: requestHeaders.Authorization?.length || 0,
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
				has_data: !!data.data,
				// 打印完整的响应数据以便调试
				full_response: data,
			});
			
			// 检查业务错误
			if (data.state === false) {
				// 记录错误
				this.recordError();
				
				let errorMessage = "Request failed";
				
				// 根据errno提供更具体的错误信息
				if (data.errno) {
					switch (data.errno) {
						case 99:
							errorMessage = "请重新登录 - Token已失效或无效";
							break;
						case 1001:
							errorMessage = "参数错误 - 请求参数不正确";
							break;
						case 1002:
							errorMessage = "权限不足 - 没有访问权限";
							break;
						case 1003:
							errorMessage = "接口不存在 - API路径错误";
							break;
						case 1004:
							errorMessage = "请求过于频繁 - 请稍后重试";
							break;
						case 406:
							errorMessage = "已达到当前访问上限，请购买更高级别VIP或稍后重试";
							break;
						default:
							errorMessage = data.error || `API错误(errno: ${data.errno})`;
					}
				} else if (data.error) {
					errorMessage = data.error;
				} else if (data.errtype) {
					errorMessage = data.errtype;
				}
				
				console.error("[115云盘] 业务错误:", {
					error: data.error,
					errno: data.errno,
					errtype: data.errtype,
					message: errorMessage,
				});
				throw new Error(errorMessage);
			}

			// 记录成功
			this.recordSuccess();
			return data;
		}

		// 处理非JSON响应
		const textResponse = await response.text();
		console.log("[115云盘] 非JSON响应内容:", {
			contentType: contentType,
			responseLength: textResponse.length,
			responsePreview: textResponse.substring(0, 200),
		});

		// 如果返回HTML，可能是认证失败或接口错误
		if (contentType && contentType.includes("text/html")) {
			if (textResponse.includes("登录") || textResponse.includes("login") || textResponse.includes("未授权")) {
				console.error("[115云盘] HTML响应显示需要登录");
				throw new Error("认证失败 - 需要重新登录");
			}
			if (textResponse.includes("404") || textResponse.includes("Not Found")) {
				console.error("[115云盘] HTML响应显示接口不存在");
				throw new Error("接口路径错误 - 404 Not Found");
			}
		}

return textResponse;
	}

	/**
	 * 使用完整URL进行API请求（不通过getApiUrl拼接）
	 */
	async requestFullUrl(
		fullUrl: string,
		method: string = "GET",
		body?: any,
		headers?: Record<string, string>,
		isFormData: boolean = false
	): Promise<any> {
		// 限流控制
		await this.waitLimit();

		const accessToken = this.config.access_token || this.saving.access_token || "";
		const refreshToken = this.config.refresh_token || this.saving.refresh_token || "";
		
		const requestHeaders: Record<string, string> = {
			"User-Agent": "Mozilla/5.0 115disk/42.0.0.2",
			"Accept": "application/json",
			...headers,
		};

		// 115 Open API使用Bearer Token认证
		if (accessToken) {
			requestHeaders["Authorization"] = `Bearer ${accessToken}`;
		}
		
		// 对于传统API接口，使用Cookie认证
		if (fullUrl.includes("/app/") && accessToken) {
			const cookies = [];
			cookies.push(`115_token=${accessToken}`);
			if (refreshToken) {
				cookies.push(`115_refresh=${refreshToken}`);
			}
			requestHeaders["Cookie"] = cookies.join("; ");
		}

		const options: RequestInit = {
			method,
			headers: requestHeaders,
		};

		let finalUrl = fullUrl;

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
					const separator = fullUrl.includes("?") ? "&" : "?";
					finalUrl = `${fullUrl}${separator}${params.toString()}`;
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

		console.log("[115云盘] 完整URL API请求:", {
			method,
			url: finalUrl,
			has_authorization: !!requestHeaders.Authorization,
			authorization_length: requestHeaders.Authorization?.length || 0,
		});

		let response: Response;
		try {
			response = await fetch(finalUrl, options);
			console.log("[115云盘] 完整URL API响应:", {
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
			console.log("[115云盘] 完整URL API响应数据:", {
				state: data.state,
				has_error: !!data.error,
				error: data.error,
				errno: data.errno,
				errtype: data.errtype,
				has_data: !!data.data,
			});
			
			// 检查业务错误
			if (data.state === false) {
				// 记录错误
				this.recordError();
				
				let errorMessage = "Request failed";
				
				if (data.errno) {
					switch (data.errno) {
						case 99:
							errorMessage = "请重新登录 - Token已失效或无效";
							break;
						case 1001:
							errorMessage = "参数错误 - 请求参数不正确";
							break;
						case 1002:
							errorMessage = "权限不足 - 没有访问权限";
							break;
						case 1003:
							errorMessage = "接口不存在 - API路径错误";
							break;
						case 1004:
							errorMessage = "请求过于频繁 - 请稍后重试";
							break;
						case 406:
							errorMessage = "已达到当前访问上限，请购买更高级别VIP或稍后重试";
							break;
						default:
							errorMessage = data.error || `API错误(errno: ${data.errno})`;
					}
				} else if (data.error) {
					errorMessage = data.error;
				} else if (data.errtype) {
					errorMessage = data.errtype;
				}
				
				console.error("[115云盘] 完整URL业务错误:", {
					error: data.error,
					errno: data.errno,
					errtype: data.errtype,
					message: errorMessage,
				});
				throw new Error(errorMessage);
			}

			// 记录成功
			this.recordSuccess();
			return data;
		} else {
			// 处理非JSON响应
			const textResponse = await response.text();
			console.log("[115云盘] 完整URL非JSON响应内容:", {
				contentType,
				responseLength: textResponse.length,
				responsePreview: textResponse.substring(0, 200),
			});

			// 检查是否是HTML错误页面
			if (contentType && contentType.includes("text/html")) {
				if (textResponse.includes("登录") || textResponse.includes("login")) {
					console.error("[115云盘] 完整URL HTML响应显示需要登录");
					throw new Error("认证失败 - 需要重新登录");
				}
				if (textResponse.includes("404") || textResponse.includes("Not Found")) {
					console.error("[115云盘] 完整URL HTML响应显示接口不存在");
					throw new Error("接口路径错误 - 404 Not Found");
				}
			}

			return textResponse;
		}
	}

//====== 用户信息 ======
/**
	 * 调试方法：测试API调用并返回完整响应
	 */
	private async debugApiCall(url: string, method: string = "GET", params?: Record<string, string>): Promise<any> {
		console.log(`[115云盘调试] 测试API调用: ${method} ${url}`);
		
		const accessToken = this.config.access_token || this.saving.access_token || "";
		const refreshToken = this.config.refresh_token || this.saving.refresh_token || "";
		
		console.log(`[115云盘调试] Token信息:`, {
			has_access_token: !!accessToken,
			access_token_length: accessToken.length,
			access_token_preview: accessToken.substring(0, 20) + "...",
			has_refresh_token: !!refreshToken,
			refresh_token_length: refreshToken.length,
			refresh_token_preview: refreshToken.substring(0, 20) + "...",
		});
		
// 测试多种认证方式 - 基于Alist项目的成功配置
		const authMethods = [
			{
				name: "115 App Bearer Token (Alist配置)",
				headers: {
					"User-Agent": "115disk/27.0.5.7",
					"Accept": "application/json",
					"Authorization": `Bearer ${accessToken}`,
				}
			},
			{
				name: "115 App Cookie Auth",
				headers: {
					"User-Agent": "115disk/27.0.5.7",
					"Accept": "application/json",
					"Cookie": `access_token=${accessToken}`,
				}
			},
			{
				name: "115 App Query Token",
				headers: {
					"User-Agent": "115disk/27.0.5.7",
					"Accept": "application/json",
				},
				addToQuery: `access_token=${accessToken}`
			},
{
				name: "Original Bearer Token",
				headers: {
					"User-Agent": "Mozilla/5.0 115disk/42.0.0.2",
					"Accept": "application/json",
					"Authorization": `Bearer ${accessToken}`,
				}
			},
			{
				name: "URL Encoded Bearer Token",
				headers: {
					"User-Agent": "115disk/27.0.5.7",
					"Accept": "application/json",
					"Authorization": `Bearer ${encodeURIComponent(accessToken)}`,
				}
			},
		];

		let finalUrl = url;
		if (params && method === "GET") {
			const queryString = new URLSearchParams(params).toString();
			finalUrl += `?${queryString}`;
		}

// 逐一测试每种认证方式
		for (const authMethod of authMethods) {
			console.log(`\n[115云盘调试] ========== 测试 ${authMethod.name} ==========`);
console.log(`[115云盘调试] 请求头:`, {
				has_authorization: !!authMethod.headers["Authorization"],
				auth_length: authMethod.headers["Authorization"]?.length || 0,
				has_cookie: !!authMethod.headers["Cookie"],
				cookie_length: authMethod.headers["Cookie"]?.length || 0,
				user_agent: authMethod.headers["User-Agent"],
				accept: authMethod.headers["Accept"],
				addToQuery: authMethod.addToQuery || "无",
			});

			// 构建最终的URL（可能需要添加查询参数）
			let testUrl = finalUrl;
			if (authMethod.addToQuery) {
				const separator = testUrl.includes('?') ? '&' : '?';
				testUrl += `${separator}${authMethod.addToQuery}`;
			}

try {
				const response = await fetch(testUrl, {
					method,
					headers: authMethod.headers as Record<string, string>,
				});

				console.log(`[115云盘调试] 响应状态:`, {
					status: response.status,
					statusText: response.statusText,
					ok: response.ok,
					contentType: response.headers.get("content-type"),
				});

				const contentType = response.headers.get("content-type") || "";
				if (contentType.includes("application/json")) {
					const data = await response.json();
					console.log(`[115云盘调试] ${authMethod.name} JSON响应:`, JSON.stringify(data, null, 2));
					
					// 如果返回成功，直接返回结果
					if (data.state !== false) {
						console.log(`[115云盘调试] ${authMethod.name} 认证成功！`);
						return data;
					}
				} else {
					const text = await response.text();
					console.log(`[115云盘调试] ${authMethod.name} 非JSON响应:`, text.substring(0, 500));
				}
			} catch (error: any) {
				console.error(`[115云盘调试] ${authMethod.name} 请求失败:`, error.message);
			}
		}

		// 如果所有认证方式都失败，抛出错误
		throw new Error("所有认证方式都失败");
	}

	/**
	 * 获取用户信息
	 * 基于Go SDK的验证逻辑，使用115 Open API
	 */
	async getUserInfo(): Promise<Cloud115UserInfoResponse> {
		try {
			// 首先调试UserInfo接口
			const userInfoUrl = `${con.API_BASE_URL}${con.API_PATHS.USER_INFO}`;
			console.log("[115云盘] ========== 调试UserInfo接口 ==========");
			
			try {
				const userInfoResult = await this.debugApiCall(userInfoUrl, "GET");
				
				// 检查UserInfo接口响应
				if (userInfoResult && userInfoResult.state !== false) {
					console.log("[115云盘] UserInfo接口调用成功");
					
					// 如果返回了用户数据
					if (userInfoResult.data) {
						return {
							state: true,
							data: {
								user_id: userInfoResult.data.user_id?.toString() || "verified",
								user_name: userInfoResult.data.user_name || userInfoResult.data.name || "115用户",
							},
						};
					}
					
					// 如果state为true但没有data，至少说明token有效
					return {
						state: true,
						data: {
							user_id: "verified",
							user_name: "115用户",
						},
					};
				}
				
				console.log("[115云盘] UserInfo接口返回state=false");
			} catch (userInfoError: any) {
				console.log("[115云盘] UserInfo接口失败:", userInfoError.message);
			}
			
			// 调试文件列表接口
			console.log("[115云盘] ========== 调试文件列表接口 ==========");
			const filesUrl = `${con.API_BASE_URL}${con.API_PATHS.FILES_LIST}`;
			
			try {
				const filesResult = await this.debugApiCall(filesUrl, "GET", {
					cid: "0",
					limit: "1",
					offset: "0",
					asc: "true",
					o: "file_name",
					show_dir: "true",
				});
				
				// 如果文件列表接口成功，说明token有效
				if (filesResult && filesResult.state !== false) {
					console.log("[115云盘] 文件列表接口验证成功");
					return {
						state: true,
						data: {
							user_id: "verified",
							user_name: "115用户",
						},
					};
				}
			} catch (filesError: any) {
				console.log("[115云盘] 文件列表接口失败:", filesError.message);
			}
			
			// 所有验证方式都失败
			console.error("[115云盘] Token验证失败 - 所有API端点均返回错误");
			throw new Error("Token验证失败 - 请检查access_token和refresh_token是否正确且未过期");
			
		} catch (error) {
			console.error("[115云盘] getUserInfo执行失败:", error);
			throw error;
		}
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
