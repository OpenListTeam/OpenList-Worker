// ==================== 移动云盘常量定义 ====================

// API 基础地址
export const API_BASE_URL = "https://yun.139.com";
export const USER_API_URL = "https://user-njs.yun.139.com";
export const ROUTE_API_URL = "https://user-njs.yun.139.com/user/route/qryRoutePolicy";

// 云盘类型
export const META_PERSONAL_NEW = "personal_new";
export const META_PERSONAL = "personal";
export const META_FAMILY = "family";
export const META_GROUP = "group";

// 请求头常量
export const MCLOUD_CHANNEL = "1000101";
export const MCLOUD_CLIENT = "10701";
export const MCLOUD_VERSION = "7.14.0";
export const X_DEVICE_INFO = "||9|7.14.0|chrome|120.0.0.0|||windows 10||zh-CN|||";
export const X_HUAWEI_CHANNEL_SRC = "10000034";

// 分片上传大小（100MB）
export const DEFAULT_PART_SIZE = 100 * 1024 * 1024;