/** =========== 115云盘 常量定义 ================
 * 本文件定义了115云盘存储服务的常量配置，包括：
 * - API端点配置
 * - 上传和下载相关常量
 * =========================================================
 * @author "OpenList Team"
 * @version 25.11.21
 * =======================================================*/

//====== 115云盘API端点 ======
// 根据115-sdk-go实现，Open API使用proapi.115.com/open/前缀
export const API_BASE_URL = "https://proapi.115.com/open";
export const PRO_API_BASE_URL = "https://proapi.115.com";
export const PASSPORT_BASE_URL = "https://passportapi.115.com";
export const UPLOAD_BASE_URL = "https://uplb.115.com";

//====== API路径 (Open API) ======
// 115 Open API使用统一的proapi.115.com/open/前缀
export const API_PATHS = {
	// 认证相关
	USER_INFO: "/user/info", // proapi open用户信息
	
	// 文件操作 (proapi.115.com/open) - 修复：添加/open前缀
	FILES_LIST: "/open/ufile/files", // 115 Open API文件列表
	FILE_INFO: "/open/ufile/file",
	FOLDER_INFO: "/open/ufile/getid",
	
	// 文件管理 (proapi.115.com/open) - 修复：添加/open前缀
	MKDIR: "/open/ufile/add",
	MOVE: "/open/ufile/move",
	COPY: "/open/ufile/copy",
	DELETE: "/open/ufile/delete",
	RENAME: "/open/ufile/edit",
	
	// 下载 (proapi.115.com)
	DOWNLOAD: "/app/chrome/downurl",
	
	// 上传
	UPLOAD_INIT: "/3.0/upload/init",
	UPLOAD_TOKEN: "/files/upload_token",
};

//====== PRO API路径 (传统API) ======
export const PRO_API_PATHS = {
	UPLOADINFO: "/app/uploadinfo", // 传统API获取用户信息（user_id和userkey）
	DOWNLOAD: "/app/chrome/downurl",
};

//====== 默认分块大小（20MB）======
export const DEFAULT_CHUNK_SIZE = 20;

//====== 小文件上传阈值（20MB）======
export const SMALL_FILE_THRESHOLD = 20 * 1024 * 1024;

//====== 预哈希大小（128KB）======
export const PRE_HASH_SIZE = 128 * 1024;

//====== 排序选项 ======
export const ORDER_BY_OPTIONS = {
	FILE_NAME: "file_name",
	FILE_SIZE: "file_size",
	USER_UTIME: "user_utime",
	FILE_TYPE: "file_type",
};

//====== 排序方向 ======
export const ORDER_DIRECTION = {
	ASC: "asc",
	DESC: "desc",
};
