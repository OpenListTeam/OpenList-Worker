/** =========== OneDrive 常量定义 ================
 * 本文件定义了OneDrive云存储服务的常量配置，包括：
 * - 不同区域的OAuth和API端点配置
 * - 支持全球、中国、美国、德国等区域
 * =========================================================
 * @author "OpenList Team"
 * @version 25.11.21
 * =======================================================*/

//====== 区域配置接口 ======
export interface HostConfig {
	oauth: string;  // OAuth认证端点
	api: string;    // API服务端点
}

//====== OneDrive区域配置映射 ======
export const ONEDRIVE_HOST_MAP: Record<string, HostConfig> = {
	// 全球版
	global: {
		oauth: "https://login.microsoftonline.com",
		api: "https://graph.microsoft.com",
	},
	// 中国版（世纪互联）
	cn: {
		oauth: "https://login.chinacloudapi.cn",
		api: "https://microsoftgraph.chinacloudapi.cn",
	},
	// 美国政府版
	us: {
		oauth: "https://login.microsoftonline.us",
		api: "https://graph.microsoft.us",
	},
	// 德国版
	de: {
		oauth: "https://login.microsoftonline.de",
		api: "https://graph.microsoft.de",
	},
};

//====== 默认分块大小（MB）======
export const DEFAULT_CHUNK_SIZE = 5;

//====== 小文件上传阈值（4MB）======
export const SMALL_FILE_THRESHOLD = 4 * 1024 * 1024;
