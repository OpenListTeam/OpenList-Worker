/** =========== 广雅云盘 工具类 ================
 * 本文件实现了广雅云盘（GuangYaPan）存储服务的认证和工具功能，包括：
 * - OAuth2 Token 刷新和管理
 * - 两阶段 SMS 登录（发送验证码 + 验证登录）
 * - API 请求封装和 401 自动重试
 * - 设备ID生成和管理
 * =========================================================
 * @author "OpenList Team"
 * @version 25.08.04
 * =======================================================*/

import { Context } from "hono";
import { DriveResult } from "../DriveObject";
import { BasicClouds } from "../BasicClouds";
import * as con from "./const";
import {
	CONFIG_INFO,
	SAVING_INFO,
	TokenResponse,
	VerificationResponse,
	VerifyResponse,
	UserMeResponse,
	CaptchaInitResponse,
	CommonResponse,
	isSuccessMsg,
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

	async acquire(): Promise<void> {
		if (this.qps <= 0) return;
		const now = Date.now();
		const elapsed = (now - this.lastRefillTime) / 1000;
		this.tokens = Math.min(this.qps, this.tokens + elapsed * this.qps);
		this.lastRefillTime = now;
		if (this.tokens < 1) {
			const waitTime = ((1 - this.tokens) / this.qps) * 1000;
			await new Promise((resolve) => setTimeout(resolve, waitTime));
			this.tokens = 0;
		} else {
			this.tokens -= 1;
		}
	}
}

//====== 广雅云盘工具类 ======
export class HostClouds extends BasicClouds {
	declare public config: CONFIG_INFO;
	declare public saving: SAVING_INFO;

	private accountHeaders: Record<string, string> = {};
	private apiHeaders: Record<string, string> = {};
	private qpsLimiters: Map<string, QPSLimiter> = new Map();
	private lastRequestTime: number = 0;

	constructor(
		c: Context,
		router: string,
		config: Record<string, any> | any,
		saving: Record<string, any> | any
	) {
		super(c, router, config, saving);
		this.ensureDeviceID();
		this.initHeaders();
		this.initQPSLimiters();
	}

	//====== 设备ID管理 ======
	private ensureDeviceID(): void {
		if (!this.saving.device_id) {
			this.saving.device_id = this.generateDeviceID();
		}
		if (!this.config.device_id) {
			this.config.device_id = this.saving.device_id;
		}
	}

	private generateDeviceID(): string {
		const bytes = new Uint8Array(16);
		crypto.getRandomValues(bytes);
		return Array.from(bytes).map(b => b.toString(16).padStart(2, "0")).join("");
	}

	private getDeviceSign(): string {
		return this.config.device_sign || `wdi10.${this.config.device_id || this.saving.device_id}`;
	}

	//====== Headers 初始化 ======
	private initHeaders(): void {
		const deviceID = this.config.device_id || this.saving.device_id || "";
		const deviceSign = this.getDeviceSign();

		this.accountHeaders = {
			"Accept": "application/json, text/plain, */*",
			"Content-Type": "application/json",
			"X-Device-Model": con.DEVICE_MODEL,
			"X-Device-Name": con.DEVICE_NAME,
			"X-Device-Sign": deviceSign,
			"X-Net-Work-Type": "NONE",
			"X-OS-Version": con.OS_VERSION,
			"X-Platform-Version": "1",
			"X-Protocol-Version": con.PROTOCOL_VERSION,
			"X-Provider-Name": "NONE",
			"X-SDK-Version": con.SDK_VERSION,
			"X-Client-Id": this.config.client_id || "",
			"X-Client-Version": "0.0.1",
			"X-Device-Id": deviceID,
		};

		this.apiHeaders = {
			"Accept": "application/json, text/plain, */*",
			"Content-Type": "application/json",
			"Did": deviceID,
			"Dt": "4",
		};
	}

	//====== QPS限流 ======
	private initQPSLimiters(): void {
		for (const [key, qps] of Object.entries(con.QPS_LIMITS)) {
			this.qpsLimiters.set(key, new QPSLimiter(qps));
		}
	}

	private async rateLimit(apiKey: string): Promise<void> {
		const limiter = this.qpsLimiters.get(apiKey);
		if (limiter) await limiter.acquire();
	}

	//====== API 请求 ======
	/**
	 * 向账号服务发送请求
	 */
	private async accountRequest(
		path: string,
		method: string = "POST",
		body?: any,
		extraHeaders?: Record<string, string>
	): Promise<any> {
		const headers = { ...this.accountHeaders, ...extraHeaders };
		if (this.saving.access_token) {
			headers["Authorization"] = `Bearer ${this.saving.access_token}`;
		}

		const options: RequestInit = {
			method,
			headers,
		};
		if (body && method !== "GET") {
			options.body = JSON.stringify(body);
		}

		const url = `${con.ACCOUNT_BASE_URL}${path}`;
		const response = await fetch(url, options);
		const data = await response.json();

		if (!response.ok) {
			throw new Error(`Account request failed: status=${response.status}`);
		}
		return data;
	}

	/**
	 * 向业务API发送请求
	 * 自动处理 401/403 的 Token 刷新重试
	 */
	async apiRequest(
		apiPath: string,
		body?: any,
		retryToken: boolean = true
	): Promise<any> {
		// 确保有 access_token
		if (!this.saving.access_token && retryToken) {
			await this.ensureAccessToken();
		}

		// QPS限流
		const apiKey = Object.keys(con.API_PATHS).find(
			(key) => (con.API_PATHS as any)[key] === apiPath
		);
		if (apiKey) {
			await this.rateLimit(apiKey);
		}

		// 全局速率限制
		const now = Date.now();
		const elapsed = now - this.lastRequestTime;
		if (elapsed < con.API_RATE_INTERVAL) {
			await new Promise(r => setTimeout(r, con.API_RATE_INTERVAL - elapsed));
		}
		this.lastRequestTime = Date.now();

		const headers = { ...this.apiHeaders };
		if (this.saving.access_token) {
			headers["Authorization"] = `Bearer ${this.saving.access_token}`;
		}

		let response = await fetch(`${con.API_BASE_URL}${apiPath}`, {
			method: "POST",
			headers,
			body: body !== undefined ? JSON.stringify(body) : undefined,
		});

		// 401/403 自动刷新Token并重试
		if ((response.status === 401 || response.status === 403) && retryToken) {
			if (this.saving.refresh_token) {
				await this.refreshToken();
				headers["Authorization"] = `Bearer ${this.saving.access_token}`;
				response = await fetch(`${con.API_BASE_URL}${apiPath}`, {
					method: "POST",
					headers,
					body: body !== undefined ? JSON.stringify(body) : undefined,
				});
			}
		}

		if (!response.ok) {
			const text = await response.text();
			throw new Error(`API request failed: status=${response.status} body=${text}`);
		}

		return response.json();
	}

	//====== 初始化配置 ======
	async initConfig(): Promise<DriveResult> {
		try {
			// 初始化配置默认值
			if (!this.config.client_id) {
				return { flag: false, text: "client_id is required" };
			}
			if (!this.config.page_size || this.config.page_size <= 0) {
				this.config.page_size = con.DEFAULT_PAGE_SIZE;
			}
			if (this.config.order_by === undefined || this.config.order_by < 0) {
				this.config.order_by = con.DEFAULT_ORDER_BY;
			}
			if (this.config.sort_type !== 0 && this.config.sort_type !== 1) {
				this.config.sort_type = con.DEFAULT_SORT_TYPE;
			}
			this.config.root_path = (this.config.root_path || "").trim();

			// 确保 headers 使用最新配置
			this.initHeaders();

			// 优先级: access_token → refresh_token → SMS登录
			if (this.saving.access_token) {
				try {
					if (await this.validateToken()) {
						return { flag: true, text: "Token is valid" };
					}
				} catch (e) { /* fallback */ }
				this.saving.access_token = undefined;
			}

			if (this.saving.refresh_token || this.config.refresh_token) {
				try {
					if (this.config.refresh_token && !this.saving.refresh_token) {
						this.saving.refresh_token = this.config.refresh_token;
					}
					await this.refreshToken();
					if (await this.validateToken()) {
						return { flag: true, text: "Token refreshed" };
					}
				} catch (e) { /* fallback */ }
			}

			// SMS登录
			if (this.config.phone_number) {
				if (this.canSMSLogin()) {
					await this.loginBySMSCode();
					if (await this.validateToken()) {
						return { flag: true, text: "SMS login success" };
					}
				}
				if (this.config.send_code) {
					try {
						await this.prepareSMSCode();
						return { flag: true, text: "SMS code sent. Fill verify_code and save to complete login." };
					} catch (e: any) {
						return { flag: false, text: `SMS send failed: ${e.message}` };
					}
				}
			}

			return { flag: false, text: "Login failed: provide access_token, refresh_token, or phone_number + verify_code" };
		} catch (error: any) {
			console.error("[广雅云盘] initConfig error:", error);
			return { flag: false, text: error.message || "Failed to initialize" };
		}
	}

	async loadSaving(): Promise<SAVING_INFO> {
		await this.getSaves();
		this.change = true;
		return this.saving;
	}

	//====== Token 管理 ======
	async ensureAccessToken(): Promise<void> {
		if (this.saving.access_token?.trim()) return;
		if (!this.saving.refresh_token?.trim()) {
			throw new Error("Not logged in, please re-init storage");
		}
		await this.refreshToken();
	}

	async validateToken(): Promise<boolean> {
		const data: UserMeResponse = await this.accountRequest(
			con.ACCOUNT_PATHS.USER_ME,
			"GET"
		);
		if (!data.sub?.trim()) {
			return false;
		}
		this.saving.sub = data.sub;
		this.change = true;
		return true;
	}

	async refreshToken(): Promise<void> {
		const refreshToken = this.saving.refresh_token?.trim();
		if (!refreshToken) {
			throw new Error("refresh_token is empty");
		}

		const data: TokenResponse = await this.accountRequest(
			con.ACCOUNT_PATHS.REFRESH_TOKEN,
			"POST",
			{
				client_id: this.config.client_id,
				grant_type: "refresh_token",
				refresh_token: refreshToken,
			}
		);

		if (data.error || !data.access_token?.trim()) {
			const errMsg = data.error_description || data.error || "Unknown error";
			throw new Error(`Refresh token failed: ${errMsg}`);
		}

		this.saving.access_token = data.access_token.trim();
		if (data.refresh_token?.trim()) {
			this.saving.refresh_token = data.refresh_token.trim();
		}
		this.change = true;
		await this.putSaves();
	}

	//====== SMS 登录 ======
	private canSMSLogin(): boolean {
		return !!(this.config.phone_number?.trim() && this.config.verify_code?.trim());
	}

	private async loginBySMSCode(): Promise<void> {
		// 如果没有 verification_id，先请求
		let verificationID = this.saving.verification_id?.trim() || this.config.verification_id?.trim() || "";
		if (!verificationID) {
			verificationID = await this.requestVerificationID();
		}

		// Step 2: 验证验证码
		const verifyResp: VerifyResponse = await this.accountRequest(
			con.ACCOUNT_PATHS.VERIFY_CODE,
			"POST",
			{
				verification_id: verificationID,
				verification_code: this.config.verify_code,
				client_id: this.config.client_id,
			}
		);

		if (verifyResp.error || !verifyResp.verification_token?.trim()) {
			throw new Error(`Verify code failed: ${verifyResp.error_description || verifyResp.error || "Unknown error"}`);
		}

		// Step 3: 登录
		const tokenResp: TokenResponse = await this.accountRequest(
			con.ACCOUNT_PATHS.SIGNIN,
			"POST",
			{
				verification_code: this.config.verify_code,
				verification_token: verifyResp.verification_token,
				username: this.normalizePhoneE164(this.config.phone_number || ""),
				client_id: this.config.client_id,
			}
		);

		if (tokenResp.error || !tokenResp.access_token?.trim()) {
			throw new Error(`Signin failed: ${tokenResp.error_description || tokenResp.error || "Unknown error"}`);
		}

		this.saving.access_token = tokenResp.access_token.trim();
		this.saving.refresh_token = tokenResp.refresh_token?.trim() || "";
		this.saving.verification_id = "";
		this.config.verify_code = "";
		this.change = true;
		await this.putSaves();
	}

	private async prepareSMSCode(): Promise<void> {
		this.saving.verification_id = "";
		this.config.verification_id = "";

		// 确保 captcha_token
		await this.ensureCaptchaToken(false);

		const verificationID = await this.requestVerificationID();
		this.saving.verification_id = verificationID;
		this.config.verification_id = verificationID;
		this.config.send_code = false;
		this.change = true;
		await this.putSaves();
	}

	private async requestVerificationID(): Promise<string> {
		const extraHeaders: Record<string, string> = {};
		if (this.config.captcha_token) {
			extraHeaders["X-Captcha-Token"] = this.config.captcha_token;
		}

		const data: VerificationResponse = await this.accountRequest(
			con.ACCOUNT_PATHS.VERIFICATION,
			"POST",
			{
				phone_number: this.normalizePhoneE164(this.config.phone_number || ""),
				target: "ANY",
				client_id: this.config.client_id,
			},
			extraHeaders
		);

		if (data.error || !data.verification_id?.trim()) {
			// captcha过期时刷新重试一次
			if (data.error?.includes("captcha_invalid") || data.error_description?.includes("captcha_token expired")) {
				await this.ensureCaptchaToken(true);
				return this.requestVerificationID();
			}
			throw new Error(`Request verification failed: ${data.error_description || data.error || "Unknown error"}`);
		}

		return data.verification_id.trim();
	}

	private async ensureCaptchaToken(force: boolean): Promise<void> {
		if (!force && this.config.captcha_token?.trim()) return;

		const extraHeaders: Record<string, string> = {};
		if (this.config.captcha_token) {
			extraHeaders["X-Captcha-Token"] = this.config.captcha_token;
		}

		const normalizedPhone = this.normalizeCaptchaUsername(this.config.phone_number || "");

		const data: CaptchaInitResponse = await this.accountRequest(
			con.ACCOUNT_PATHS.CAPTCHA_INIT,
			"POST",
			{
				client_id: this.config.client_id,
				action: "POST:/v1/auth/verification",
				device_id: this.config.device_id || this.saving.device_id,
				meta: {
					username: normalizedPhone,
					phone_number: normalizedPhone,
					VERIFICATION_PHONE: normalizedPhone,
				},
			},
			extraHeaders
		);

		if (data.error || !data.captcha_token?.trim()) {
			throw new Error(`Init captcha token failed: ${data.error_description || data.error || "Unknown error"}`);
		}

		this.config.captcha_token = data.captcha_token.trim();
		this.change = true;
		await this.putSaves();
	}

	//====== 任务轮询 ======
	async waitTaskDone(taskID: string): Promise<void> {
		const maxTry = 30;
		const interval = 300; // ms

		for (let i = 0; i < maxTry; i++) {
			const out: CommonResponse & { data: { status: number } } = await this.apiRequest(
				con.API_PATHS.TASK_STATUS,
				{ taskId: taskID }
			);

			if (!isSuccessMsg(out.msg)) {
				throw new Error(`Task status check failed: ${out.msg}`);
			}

			switch (out.data.status) {
				case con.TASK_STATUS.SUCCESS:
					return;
				case con.TASK_STATUS.FAILED:
				case con.TASK_STATUS.ERROR:
					throw new Error(`Task ${taskID} failed with status=${out.data.status}`);
			}

			if (i < maxTry - 1) {
				await new Promise(r => setTimeout(r, interval));
			}
		}
		throw new Error(`Task ${taskID} timeout`);
	}

	//====== 手机号规范化 ======
	private normalizePhoneE164(phone: string): string {
		let p = phone.trim();
		if (!p) return "";
		p = p.replace(/\s+/g, "");
		if (p.startsWith("+86") && p.length > 3) {
			const rest = p.slice(3);
			return `+86 ${rest}`;
		}
		return p.startsWith("+") ? p : `+86 ${p}`;
	}

	private normalizeCaptchaUsername(phone: string): string {
		let p = phone.trim().replace(/\s+/g, "").replace(/^\+/, "");
		// 仅保留数字
		p = p.replace(/\D/g, "");
		// 去掉86前缀
		if (p.startsWith("86") && p.length > 11) {
			p = p.slice(2);
		}
		return p;
	}
}
