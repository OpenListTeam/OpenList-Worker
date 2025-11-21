/** =========== 123云盘 常量定义 ================
 * 本文件定义了123云盘存储服务的常量配置，包括：
 * - API端点地址
 * - QPS限制配置
 * - 上传相关常量
 * =========================================================
 * @author "OpenList Team"
 * @version 25.11.21
 * =======================================================*/

//====== API基础地址 ======
export const API_BASE_URL = "https://open-api.123pan.com";

//====== API路径定义 ======
export const API_PATHS = {
	// 认证相关
	ACCESS_TOKEN: "/api/v1/access_token",
	REFRESH_TOKEN: "/api/v1/oauth2/access_token",
	USER_INFO: "/api/v1/user/info",
	
	// 文件操作
	FILE_LIST: "/api/v2/file/list",
	DOWNLOAD_INFO: "/api/v1/file/download_info",
	DIRECT_LINK: "/api/v1/direct-link/url",
	MOVE: "/api/v1/file/move",
	RENAME: "/api/v1/file/name",
	TRASH: "/api/v1/file/trash",
	
	// 文件夹操作
	MKDIR: "/upload/v1/file/mkdir",
	
	// 上传相关
	UPLOAD_CREATE: "/upload/v2/file/create",
	UPLOAD_SLICE: "/upload/v2/file/slice",
	UPLOAD_COMPLETE: "/upload/v2/file/upload_complete",
};

//====== QPS限制配置 ======
export const QPS_LIMITS: Record<string, number> = {
	ACCESS_TOKEN: 1,
	REFRESH_TOKEN: 1,
	USER_INFO: 1,
	FILE_LIST: 3,
	DOWNLOAD_INFO: 5,
	DIRECT_LINK: 5,
	MKDIR: 2,
	MOVE: 1,
	RENAME: 1,
	TRASH: 2,
	UPLOAD_CREATE: 2,
	UPLOAD_COMPLETE: 0,
};

//====== 上传相关常量 ======
export const DEFAULT_UPLOAD_THREAD = 3;  // 默认上传线程数
export const MIN_UPLOAD_THREAD = 1;      // 最小上传线程数
export const MAX_UPLOAD_THREAD = 32;     // 最大上传线程数

//====== 文件类型 ======
export const FILE_TYPE = {
	FOLDER: 1,  // 文件夹
	FILE: 2,    // 文件
};

//====== 根目录ID ======
export const ROOT_FOLDER_ID = "0";
