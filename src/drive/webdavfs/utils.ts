/** =========== WebDAV 工具类 ================
 * 本文件实现了WebDAV云存储服务的认证和工具功能，包括：
 * - 客户端初始化和认证
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

//====== WebDAV响应错误接口 ======
interface WebDAVError {
	status: number;
	statusText: string;
	message?: string;
}

//====== WebDAV客户端类 ======
export class HostClouds extends BasicClouds {
	// 公共数据 ================================================
	declare public config: CONFIG_INFO;
	declare public saving: SAVING_INFO;
	private baseUrl: string = "";

	/**
	 * 构造函数
	 * 初始化WebDAV工具类实例
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
	 * 执行客户端初始化和认证
	 */
	async initConfig(): Promise<DriveResult> {
		console.log("[WebDAV] 开始初始化配置");
		console.log("[WebDAV] 配置信息:", {
			vendor: this.config.vendor,
			address: this.config.address,
			username: this.config.username,
			has_password: !!this.config.password,
		});

		try {
			// 设置基础URL
			this.baseUrl = this.config.address.replace(/\/$/, "");
			
			// 如果是SharePoint，需要获取Cookie
			if (this.isSharepoint()) {
				await this.getSharePointCookie();
			}
			
			// 测试连接
			await this.testConnection();
			
			this.change = true;
			console.log("[WebDAV] 初始化成功");
			return {
				flag: true,
				text: "WebDAV initialized successfully",
			};
		} catch (error: any) {
			console.error("[WebDAV] 初始化失败:", error.message);
			console.error("[WebDAV] 错误堆栈:", error.stack);
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

	//====== 加载保存的认证信息 ======
	/**
	 * 加载保存的认证信息
	 * 检查认证是否过期，如果过期则重新认证
	 */
	async loadSaving(): Promise<SAVING_INFO> {
		if (!this.saving || !this.saving.last_login) {
			await this.initConfig();
		} else {
			// 设置基础URL
			this.baseUrl = this.config.address.replace(/\/$/, "");
		}
		return this.saving;
	}

	//====== SharePoint认证 ======
	/**
	 * 获取SharePoint认证Cookie
	 * 注意：这是一个简化实现，实际SharePoint认证较复杂
	 */
	private async getSharePointCookie(): Promise<void> {
		console.log("[WebDAV] SharePoint模式，需要获取Cookie");
		// 这里简化处理，实际需要实现完整的SharePoint OAuth流程
		// 暂时使用基础认证
		this.saving.cookie = "";
		this.saving.last_login = Date.now();
	}

	//====== 测试连接 ======
	/**
	 * 测试WebDAV连接
	 * 通过PROPFIND请求测试连接是否正常
	 */
	private async testConnection(): Promise<void> {
		const path = this.config.root_path || "/";
		const url = this.getFullUrl(path);
		
		await this.request(url, "PROPFIND", null, {
			"Depth": "0",
		});
	}

	//====== API请求 ======
	/**
	 * 发送WebDAV请求
	 * 自动处理认证和错误重试
	 */
	async request(
		url: string,
		method: string = "GET",
		body?: any,
		headers?: Record<string, string>
	): Promise<any> {
		const requestHeaders: Record<string, string> = {
			...this.getAuthHeaders(),
			...headers,
		};

		const options: RequestInit = {
			method,
			headers: requestHeaders,
		};

		if (body) {
			if (body instanceof ArrayBuffer || body instanceof Blob) {
				options.body = body;
			} else if (typeof body === "string") {
				options.body = body;
			} else {
				options.body = JSON.stringify(body);
			}
		}

		const response = await fetch(url, options);
		
		// 处理错误响应
		if (!response.ok) {
			const errorText = await response.text().catch(() => "");
			throw new Error(`WebDAV error: ${response.status} ${response.statusText} - ${errorText}`);
		}

		// 返回响应数据
		const contentType = response.headers.get("content-type");
		if (contentType && contentType.includes("application/json")) {
			return await response.json();
		} else if (contentType && contentType.includes("text/xml")) {
			return await response.text();
		}
		
		return await response.text();
	}

	//====== 工具方法 ======
	/**
	 * 检查是否为SharePoint
	 */
	isSharepoint(): boolean {
		return this.config.vendor === con.WebDAVVendor.SHAREPOINT;
	}

	/**
	 * 获取认证头
	 */
	private getAuthHeaders(): Record<string, string> {
		const headers: Record<string, string> = {};
		
		if (this.isSharepoint() && this.saving.cookie) {
			// SharePoint使用Cookie认证
			headers["Cookie"] = this.saving.cookie;
		} else {
			// 其他WebDAV服务使用Basic认证
			const auth = btoa(`${this.config.username}:${this.config.password}`);
			headers["Authorization"] = `Basic ${auth}`;
		}
		
		return headers;
	}

	/**
	 * 获取完整URL
	 * 拼接基础URL和路径
	 */
	getFullUrl(path: string): string {
		// 确保路径以/开头
		if (!path.startsWith("/")) {
			path = "/" + path;
		}
		
		// 拼接URL
		return `${this.baseUrl}${path}`;
	}

	/**
	 * 编码路径
	 * 对路径进行URL编码，保留斜杠
	 */
	encodePath(path: string): string {
		return path
			.split("/")
			.map((segment) => encodeURIComponent(segment))
			.join("/");
	}

	/**
	 * 解析WebDAV PROPFIND响应
	 * 从XML响应中提取文件信息
	 */
	parsePropfindResponse(xml: string): any[] {
		// 简化的XML解析，实际应使用专业的XML解析库
		const files: any[] = [];
		
		// 使用正则表达式提取基本信息
		const responseRegex = /<d:response>([\s\S]*?)<\/d:response>/g;
		let match;
		
		while ((match = responseRegex.exec(xml)) !== null) {
			const responseContent = match[1];
			
			// 提取href
			const hrefMatch = /<d:href>(.*?)<\/d:href>/.exec(responseContent);
			const href = hrefMatch ? hrefMatch[1] : "";
			
			// 提取displayname
			const nameMatch = /<d:displayname>(.*?)<\/d:displayname>/.exec(responseContent);
			const name = nameMatch ? nameMatch[1] : "";
			
			// 提取contentlength
			const sizeMatch = /<d:getcontentlength>(.*?)<\/d:getcontentlength>/.exec(responseContent);
			const size = sizeMatch ? parseInt(sizeMatch[1]) : 0;
			
			// 提取lastmodified
			const modifiedMatch = /<d:getlastmodified>(.*?)<\/d:getlastmodified>/.exec(responseContent);
			const modified = modifiedMatch ? modifiedMatch[1] : "";
			
			// 检查是否为目录
			const isDir = responseContent.includes("<d:collection/>") || 
			              responseContent.includes("<d:resourcetype><d:collection/></d:resourcetype>");
			
			if (name) {
				files.push({
					href: decodeURIComponent(href),
					name: decodeURIComponent(name),
					size: size,
					modified: modified,
					isDir: isDir,
				});
			}
		}
		
		return files;
	}
}
