/** =========== 广雅云盘 配置信息接口 ================
 * 本文件定义了广雅云盘存储服务的配置信息接口和数据结构
 * =========================================================
 * @author "OpenList Team"
 * @version 25.08.04
 * =======================================================*/

//====== 广雅云盘配置信息接口 ======
export interface CONFIG_INFO {
	// 认证配置
	client_id: string;               // 客户端ID（必填）
	access_token?: string;           // 访问令牌
	refresh_token?: string;          // 刷新令牌

	// SMS登录配置
	phone_number?: string;           // 手机号（+86格式）
	captcha_token?: string;          // 验证码令牌
	send_code?: boolean;             // 是否发送验证码
	verify_code?: string;            // 短信验证码
	verification_id?: string;        // 验证ID（自动生成）

	// 设备配置
	device_id?: string;              // 设备ID（32位hex，自动生成）
	device_sign?: string;            // 设备签名

	// 基础配置
	root_path?: string;              // 根目录路径
	page_size?: number;              // 每页数量
	order_by?: number;               // 排序字段：0-4
	sort_type?: number;              // 排序方向：0升序/1降序
}

//====== 广雅云盘保存信息接口 ======
export interface SAVING_INFO {
	access_token?: string;           // 访问令牌
	refresh_token?: string;          // 刷新令牌
	device_id?: string;              // 设备ID
	verification_id?: string;        // 验证ID
	sub?: string;                    // 用户唯一标识
}

//====== Token 响应 ======
export interface TokenResponse {
	access_token: string;
	refresh_token: string;
	token_type: string;
	expires_in: number;
	sub: string;
	error?: string;
	error_code?: number;
	error_description?: string;
}

//====== 验证码请求响应 ======
export interface VerificationResponse {
	verification_id: string;
	error?: string;
	error_code?: number;
	error_description?: string;
}

//====== 验证码校验响应 ======
export interface VerifyResponse {
	verification_token: string;
	error?: string;
	error_code?: number;
	error_description?: string;
}

//====== 用户信息响应 ======
export interface UserMeResponse {
	sub: string;
}

//====== 验证码初始化响应 ======
export interface CaptchaInitResponse {
	captcha_token: string;
	expires_in: number;
	error?: string;
	error_code?: number;
	error_description?: string;
}

//====== 文件项 ======
export interface FileItem {
	fileId: string;
	parentId: string;
	fileName: string;
	fileSize: number;
	resType: number;  // 1=文件, 2=文件夹
	ctime: number;    // 创建时间戳(秒)
	utime: number;    // 修改时间戳(秒)
}

//====== 文件列表响应 ======
export interface FileListResponse {
	code: number;
	msg: string;
	data: {
		total: number;
		list: FileItem[];
	};
}

//====== 下载链接响应 ======
export interface DownloadResponse {
	code: number;
	msg: string;
	data: {
		signedURL?: string;
		downloadUrl?: string;
	};
}

//====== 创建目录响应 ======
export interface CreateDirResponse {
	code: number;
	msg: string;
	data: {
		fileId: string;
		fileName: string;
		resType: number;
		ctime: number;
		utime: number;
	};
}

//====== 通用响应 ======
export interface CommonResponse {
	code: number;
	msg: string;
}

//====== 任务响应（用于异步操作：删除、移动、复制） ======
export interface TaskResponse {
	code: number;
	msg: string;
	data: {
		taskId: string;
	};
}

//====== 任务状态响应 ======
export interface TaskStatusResponse {
	code: number;
	msg: string;
	data: {
		status: number;  // 2=成功, -1/3=失败
	};
}

//====== 上传令牌响应 ======
export interface UploadTokenResponse {
	code: number;
	msg: string;
	data: UploadTokenData;
}

export interface UploadTokenData {
	taskId: string;
	objectPath: string;
	bucketName: string;
	endPoint: string;
	fullEndPoint: string;
	accessKeyID: string;
	secretAccessKey: string;
	sessionToken: string;
	region: string;
	AlreadyDone?: boolean;
	creds?: {
		accessKeyID: string;
		secretAccessKey: string;
		sessionToken: string;
	};
}

//====== 上传任务信息响应 ======
export interface UploadTaskInfoResponse {
	code: number;
	msg: string;
	data: {
		fileId: string;
	};
}

//====== 存储详情响应 ======
export interface AssetsInfoResponse {
	code: number;
	msg: string;
	data: {
		totalSpaceSize: number;
		usedSpaceSize: number;
	};
}

//====== 工具类型 ======
export function isSuccessMsg(msg: string): boolean {
	const trimmed = msg.trim();
	return trimmed === "" || trimmed.toLowerCase() === "success";
}
