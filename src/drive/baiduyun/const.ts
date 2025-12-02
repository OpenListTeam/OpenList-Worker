/** =========== 百度网盘 常量定义 ================
 * 本文件定义了百度网盘云存储服务的常量配置，包括：
 * - API端点配置
 * - 上传分块大小配置
 * - 会员类型配置
 * =========================================================
 * @author "OpenList Team"
 * @version 25.11.21
 * =======================================================*/

//====== 百度网盘API端点 ======
export const BAIDU_API_BASE = "https://pan.baidu.com/rest/2.0/";
export const BAIDU_PCS_BASE = "https://d.pcs.baidu.com";
export const BAIDU_OAUTH_URL = "https://openapi.baidu.com/oauth/2.0/token";

//====== 下载API类型 ======
export enum DownloadAPIType {
	OFFICIAL = "official",      // 官方API
	CRACK = "crack",           // 破解API
	CRACK_VIDEO = "crack_video" // 视频破解API
}

//====== 会员类型 ======
export enum VipType {
	NORMAL = 0,      // 普通用户 (4G/4M)
	VIP = 1,         // 普通会员 (10G/16M)
	SVIP = 2         // 超级会员 (20G/32M)
}

//====== 上传分块大小配置 ======
export const DEFAULT_SLICE_SIZE = 4 * 1024 * 1024;      // 4MB - 普通用户
export const VIP_SLICE_SIZE = 16 * 1024 * 1024;         // 16MB - 普通会员
export const SVIP_SLICE_SIZE = 32 * 1024 * 1024;        // 32MB - 超级会员
export const MAX_SLICE_NUM = 2048;                       // 最大分片数量
export const SLICE_STEP = 1 * 1024 * 1024;              // 分片步进 1MB
export const SLICE_MD5_SIZE = 256 * 1024;               // 前256KB用于计算slice-md5

//====== 默认配置 ======
export const DEFAULT_UPLOAD_THREAD = 3;                  // 默认上传线程数
export const MIN_UPLOAD_THREAD = 1;                      // 最小上传线程数
export const MAX_UPLOAD_THREAD = 32;                     // 最大上传线程数

//====== 排序选项 ======
export enum OrderBy {
	NAME = "name",
	TIME = "time",
	SIZE = "size"
}

//====== 排序方向 ======
export enum OrderDirection {
	ASC = "asc",
	DESC = "desc"
}
