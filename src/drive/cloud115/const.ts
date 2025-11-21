/** =========== 115云盘 常量定义 ================
 * 本文件定义了115云盘存储服务的常量配置，包括：
 * - API端点配置
 * - 上传和下载相关常量
 * =========================================================
 * @author "OpenList Team"
 * @version 25.11.21
 * =======================================================*/

//====== 115云盘API端点 ======
export const API_BASE_URL = "https://webapi.115.com";
export const PASSPORT_BASE_URL = "https://passportapi.115.com";
export const UPLOAD_BASE_URL = "https://uplb.115.com";

//====== API路径 ======
export const API_PATHS = {
	// 认证相关
	USER_INFO: "/user/info",
	
	// 文件操作
	FILES_LIST: "/files",
	FILE_INFO: "/files/file",
	FOLDER_INFO: "/files/getid",
	
	// 文件管理
	MKDIR: "/files/add",
	MOVE: "/files/move",
	COPY: "/files/copy",
	DELETE: "/rb/delete",
	RENAME: "/files/edit",
	
	// 下载
	DOWNLOAD: "/files/download",
	
	// 上传
	UPLOAD_INIT: "/files/upload",
	UPLOAD_TOKEN: "/files/upload_token",
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
