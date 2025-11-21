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
import { Context } from "hono";
import { DriveResult } from "../DriveObject";
import { BasicClouds } from "../BasicClouds";
import * as con from "./const";
import { CONFIG_INFO, SAVING_INFO } from "./metas";

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
			return {
				flag: false,
				text: error.message || "Failed to initialize config",
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
		let lastError: Error | null = null;
		
		// 重试3次
		for (let i = 0; i < 3; i++) {
			try {
				await this._refreshToken();
				return;
			} catch (error: any) {
				lastError = error;
				// 等待后重试
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
		const url = new URL(this.config.api_address);
		url.searchParams.set("refresh_ui", this.config.refresh_token);
		url.searchParams.set("server_use", "true");
		url.searchParams.set("driver_txt", "baiduyun_go");
		
		console.log("[BaiduYun] 使用在线API刷新Token");

		const response = await fetch(url.toString(), {
			method: "GET",
			headers: {
				"User-Agent": "Mozilla/5.0 (Macintosh; Apple macOS 15_5) AppleWebKit/537.36 (KHTML, like Gecko) Safari/537.36 Chrome/138.0.0.0 Openlist/425.6.30",
			},
		});

		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`);
		}

		const data: OnlineAPIResponse = await response.json();

		if (!data.refresh_token || !data.access_token) {
			if (data.text) {
				throw new Error(`Failed to refresh token: ${data.text}`);
			}
			throw new Error("Empty token returned from online API");
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

		console.log("[BaiduYun] 使用本地客户端刷新Token");

		const url = new URL(con.BAIDU_OAUTH_URL);
		url.searchParams.set("grant_type", "refresh_token");
		url.searchParams.set("refresh_token", this.config.refresh_token);
		url.searchParams.set("client_id", this.config.client_id);
		url.searchParams.set("client_secret", this.config.client_secret);

		const response = await fetch(url.toString(), {
			method: "GET",
		});

		const data: TokenResponse | TokenErrorResponse = await response.json();

		if ("error" in data) {
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
		pathname: string,
		method: string = "GET",
		params?: Record<string, string>,
		body?: any,
		headers?: Record<string, string>
	): Promise<any> {
		const url = new URL(pathname, con.BAIDU_API_BASE);
		
		// 添加access_token
		url.searchParams.set("access_token", this.saving.access_token || "");
		
		// 添加其他参数
		if (params) {
			Object.entries(params).forEach(([key, value]) => {
				url.searchParams.set(key, value);
			});
		}

		const requestHeaders: Record<string, string> = {
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
		const result: BaiduAPIResponse = await response.json();

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
		const result = await this.get("/xpan/nas", { method: "uinfo" });
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
