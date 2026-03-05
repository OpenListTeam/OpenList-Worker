// 百度网盘 API 常量定义

//====== 百度网盘API端点 ======
export const BAIDU_API_BASE = "https://pan.baidu.com/rest/2.0/";
export const BAIDU_PCS_BASE = "https://d.pcs.baidu.com";
export const BAIDU_OAUTH_URL = "https://openapi.baidu.com/oauth/2.0/token";

//====== 下载API类型 ======
export enum DownloadAPIType {
    OFFICIAL = "official",
    CRACK = "crack",
    CRACK_VIDEO = "crack_video"
}

//====== 会员类型 ======
export enum VipType {
    NORMAL = 0,
    VIP = 1,
    SVIP = 2
}

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

//====== 大小常量 ======
export const KB = 1024;
export const MB = 1024 * KB;
export const GB = 1024 * MB;

//====== 上传分块大小配置 ======
export const DEFAULT_SLICE_SIZE = 4 * MB;
export const VIP_SLICE_SIZE = 16 * MB;
export const SVIP_SLICE_SIZE = 32 * MB;
export const MAX_SLICE_NUM = 2048;
export const SLICE_STEP = 1 * MB;
export const SLICE_MD5_SIZE = 256 * KB;

//====== 默认配置 ======
export const DEFAULT_ROOT_PATH = "/";
export const DEFAULT_UPLOAD_THREAD = 3;
export const MIN_UPLOAD_THREAD = 1;
export const MAX_UPLOAD_THREAD = 32;

//====== User-Agent ======
export const DEFAULT_UA = "pan.baidu.com";
export const NETDISK_UA = "netdisk";

//====== 错误码 ======
export const ERRNO_TOKEN_EXPIRED = 111;
export const ERRNO_AUTH_FAILED = -6;
