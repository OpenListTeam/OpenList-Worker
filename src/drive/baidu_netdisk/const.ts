// Baidu Netdisk API constants
export const API_BASE_URL = "https://pan.baidu.com"
export const PCS_BASE_URL = "https://d.pcs.baidu.com"
export const OPENAPI_URL = "https://openapi.baidu.com"

// Default configuration
export const DEFAULT_ROOT_PATH = "/"
export const DEFAULT_UPLOAD_THREAD = "3"
export const DEFAULT_UPLOAD_API = "https://d.pcs.baidu.com"

// Slice size constants (in bytes)
export const KB = 1024
export const MB = 1024 * KB
export const GB = 1024 * MB

export const DEFAULT_SLICE_SIZE = 4 * MB
export const VIP_SLICE_SIZE = 16 * MB
export const SVIP_SLICE_SIZE = 32 * MB
export const MAX_SLICE_NUM = 2048
export const SLICE_STEP = 1 * MB

// User-Agent
export const DEFAULT_UA = "pan.baidu.com"
export const NETDISK_UA = "netdisk"

// VIP Type
export const VIP_TYPE_NORMAL = 0      // Normal user (4G/4M)
export const VIP_TYPE_VIP = 1         // VIP user (10G/16M)
export const VIP_TYPE_SVIP = 2        // Super VIP user (20G/32M)

// Error codes
export const ERRNO_TOKEN_EXPIRED = 111
export const ERRNO_AUTH_FAILED = -6
