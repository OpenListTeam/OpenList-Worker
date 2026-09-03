/** =========== 广雅云盘 常量定义 ================
 * 本文件定义了广雅云盘（GuangYaPan）存储服务的常量配置，包括：
 * - API端点地址（账号服务 + 业务API）
 * - QPS限制配置
 * - 默认参数
 * =========================================================
 * @author "OpenList Team"
 * @version 25.08.04
 * =======================================================*/

//====== API基础地址 ======
export const ACCOUNT_BASE_URL = "https://account.guangyapan.com";
export const API_BASE_URL = "https://api.guangyapan.com";

//====== API路径定义 ======
export const ACCOUNT_PATHS = {
	// 认证相关（账号服务）
	USER_ME: "/v1/user/me",
	REFRESH_TOKEN: "/v1/auth/token",
	VERIFICATION: "/v1/auth/verification",        // 发送验证码
	VERIFY_CODE: "/v1/auth/verification/verify",   // 验证验证码
	SIGNIN: "/v1/auth/signin",                     // 短信登录
	CAPTCHA_INIT: "/v1/shield/captcha/init",       // 初始化验证码令牌
};

export const API_PATHS = {
	// 文件操作
	FILE_LIST: "/nd.bizuserres.s/v1/file/get_file_list",
	DOWNLOAD: "/nd.bizuserres.s/v1/get_res_download_url",
	MKDIR: "/nd.bizuserres.s/v1/file/create_dir",
	RENAME: "/nd.bizuserres.s/v1/file/rename",
	DELETE: "/nd.bizuserres.s/v1/file/delete_file",
	MOVE: "/nd.bizuserres.s/v1/file/move_file",
	COPY: "/nd.bizuserres.s/v1/file/copy_file",

	// 任务状态
	TASK_STATUS: "/nd.bizuserres.s/v1/get_task_status",

	// 上传
	UPLOAD_TOKEN: "/nd.bizuserres.s/v1/get_res_center_token",
	UPLOAD_TASK_INFO: "/nd.bizuserres.s/v1/file/get_info_by_task_id",

	// 存储详情
	ASSETS: "/nd.bizassets.s/v1/get_assets",
};

//====== QPS限制配置（每个端点每秒最大请求数） ======
export const QPS_LIMITS: Record<string, number> = {
	FILE_LIST: 2,
	DOWNLOAD: 3,
	MKDIR: 2,
	RENAME: 3,
	DELETE: 2,
	MOVE: 2,
	COPY: 2,
	TASK_STATUS: 5,
	ASSETS: 1,
};

//====== 默认参数 ======
export const DEFAULT_PAGE_SIZE = 100;
export const DEFAULT_ORDER_BY = 3;   // 排序字段
export const DEFAULT_SORT_TYPE = 1;  // 排序方向：1=降序

//====== 设备信息 ======
export const DEVICE_MODEL = "chrome%2F147.0.0.0";
export const DEVICE_NAME = "PC-Chrome";
export const OS_VERSION = "MacIntel";
export const SDK_VERSION = "9.0.2";
export const PROTOCOL_VERSION = "301";

//====== 文件类型 ======
export const RES_TYPE = {
	FILE: 1,    // 文件
	FOLDER: 2,  // 文件夹
};

//====== 任务状态 ======
export const TASK_STATUS = {
	SUCCESS: 2,    // 成功
	FAILED: -1,    // 失败
	ERROR: 3,      // 错误
};

//====== API 速率限制间隔 ======
export const API_RATE_INTERVAL = 500; // ms
