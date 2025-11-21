/** =========== 阿里云盘 常量配置 ================
 * 本文件定义了阿里云盘API的常量配置，包括：
 * - API地址和端点
 * - 限流配置
 * - 驱动类型和默认值
 * =========================================================
 * @author "OpenList Team"
 * @version 25.11.21
 * =======================================================*/

//====== API地址 ======
export const API_URL = "https://openapi.alipan.com";

//====== API端点 ======
export const API_ENDPOINTS = {
	// 用户信息
	GET_DRIVE_INFO: "/adrive/v1.0/user/getDriveInfo",
	GET_SPACE_INFO: "/adrive/v1.0/user/getSpaceInfo",
	
	// 文件操作
	FILE_LIST: "/adrive/v1.0/openFile/list",
	FILE_CREATE: "/adrive/v1.0/openFile/create",
	FILE_UPDATE: "/adrive/v1.0/openFile/update",
	FILE_DELETE: "/adrive/v1.0/openFile/delete",
	FILE_TRASH: "/adrive/v1.0/openFile/recyclebin/trash",
	FILE_MOVE: "/adrive/v1.0/openFile/move",
	FILE_COPY: "/adrive/v1.0/openFile/copy",
	FILE_GET_DOWNLOAD_URL: "/adrive/v1.0/openFile/getDownloadUrl",
	FILE_GET_UPLOAD_URL: "/adrive/v1.0/openFile/getUploadUrl",
	FILE_COMPLETE: "/adrive/v1.0/openFile/complete",
	FILE_VIDEO_PREVIEW: "/adrive/v1.0/openFile/getVideoPreviewPlayInfo",
	
	// OAuth
	OAUTH_TOKEN: "/oauth/access_token",
};

//====== 限流配置 ======
// 根据阿里云盘官方文档：https://www.yuque.com/aliyundrive/zpfszx/mqocg38hlxzc5vcd
export const RATE_LIMITS = {
	LIST: 3.9,    // 列表接口：4次/秒，使用3.9保险
	LINK: 0.9,    // 下载链接：1次/秒，使用0.9保险
	OTHER: 14.9,  // 其他接口：15次/秒，使用14.9保险
};

//====== 限流类型 ======
export enum LimiterType {
	LIST = "list",
	LINK = "link",
	OTHER = "other",
}

//====== 驱动类型 ======
export const DRIVE_TYPES = {
	DEFAULT: "default",
	RESOURCE: "resource",
	BACKUP: "backup",
};

//====== 删除方式 ======
export const REMOVE_WAYS = {
	TRASH: "trash",    // 移到回收站
	DELETE: "delete",  // 直接删除
};

//====== LIVP下载格式 ======
export const LIVP_FORMATS = {
	JPEG: "jpeg",
	MOV: "mov",
};

//====== 默认值 ======
export const DEFAULTS = {
	DRIVE_TYPE: DRIVE_TYPES.RESOURCE,
	ROOT_FOLDER_ID: "root",
	REMOVE_WAY: REMOVE_WAYS.TRASH,
	LIVP_FORMAT: LIVP_FORMATS.JPEG,
	ORDER_BY: "name",
	ORDER_DIRECTION: "ASC",
	CHUNK_SIZE: 20 * 1024 * 1024, // 20MB
	MAX_CHUNK_SIZE: 5 * 1024 * 1024 * 1024, // 5GB
	MAX_PARTS: 10000, // 最大分片数
};

//====== 文件类型 ======
export const FILE_TYPES = {
	FOLDER: "folder",
	FILE: "file",
};

//====== 检查名称模式 ======
export const CHECK_NAME_MODES = {
	IGNORE: "ignore",        // 忽略同名文件
	AUTO_RENAME: "auto_rename", // 自动重命名
	REFUSE: "refuse",        // 拒绝
};

//====== 错误代码 ======
export const ERROR_CODES = {
	ACCESS_TOKEN_INVALID: "AccessTokenInvalid",
	ACCESS_TOKEN_EXPIRED: "AccessTokenExpired",
	PRE_HASH_MATCHED: "PreHashMatched",
	I400JD: "I400JD",
};
