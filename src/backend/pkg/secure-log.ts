/**
 * 安全日志工具 - 自动脱敏敏感信息
 * 
 * 使用方法：
 * import { secureLog, secureWarn, secureError } from './secure-log'
 * secureLog('User data:', userData)  // 自动脱敏 password、token 等字段
 * 
 * 2026-09-08 创建
 */

/** 需要脱敏的敏感字段名（不区分大小写） */
const SENSITIVE_KEYS = new Set([
  "password",
  "pwd",
  "passwd",
  "token",
  "secret",
  "key",
  "authorization",
  "auth",
  "api_key",
  "apikey",
  "access_token",
  "refresh_token",
  "session",
  "cookie",
  "csrf",
  "otp",
  "private",
  "credential",
  "salt",
  "hash",
])

/** 需要部分脱敏的字段（显示前几位） */
const PARTIAL_MASK_KEYS = new Set([
  "email",
  "phone",
  "mobile",
  "telephone",
  "username",
  "userid",
  "user_id",
])

/**
 * 检查字段名是否为敏感字段
 */
function isSensitiveKey(key: string): boolean {
  const lower = key.toLowerCase()
  return (
    SENSITIVE_KEYS.has(lower) ||
    Array.from(SENSITIVE_KEYS).some((k) => lower.includes(k))
  )
}

/**
 * 检查字段名是否需要部分脱敏
 */
function isPartialMaskKey(key: string): boolean {
  const lower = key.toLowerCase()
  return PARTIAL_MASK_KEYS.has(lower)
}

/**
 * 部分脱敏（保留前3位，其余用*代替）
 */
function partialMask(value: string): string {
  if (value.length <= 3) return "***"
  return value.slice(0, 3) + "*".repeat(Math.min(value.length - 3, 10))
}

/**
 * 递归脱敏对象/数组中的敏感信息
 */
function sanitize(obj: any, depth = 0): any {
  // 防止循环引用导致的无限递归
  if (depth > 10) return "[Max Depth]"

  // null/undefined 直接返回
  if (obj === null || obj === undefined) return obj

  // 字符串检查（避免在日志中输出长 token）
  if (typeof obj === "string") {
    if (obj.length > 200) {
      return obj.slice(0, 200) + "... [truncated]"
    }
    // 检测类似 JWT 的字符串（格式：xxxxx.xxxxx.xxxxx）
    if (/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(obj)) {
      return "[JWT_TOKEN]"
    }
    // 检测类似 API key 的长随机字符串
    if (/^[A-Za-z0-9_-]{32,}$/.test(obj)) {
      return "[API_KEY]"
    }
    return obj
  }

  // 数字/布尔值直接返回
  if (typeof obj === "number" || typeof obj === "boolean") return obj

  // 函数不输出
  if (typeof obj === "function") return "[Function]"

  // 数组递归处理
  if (Array.isArray(obj)) {
    return obj.map((item) => sanitize(item, depth + 1))
  }

  // 对象递归处理
  if (typeof obj === "object") {
    const copy: any = {}
    for (const key of Object.keys(obj)) {
      if (isSensitiveKey(key)) {
        copy[key] = "[REDACTED]"
      } else if (isPartialMaskKey(key) && typeof obj[key] === "string") {
        copy[key] = partialMask(obj[key])
      } else {
        copy[key] = sanitize(obj[key], depth + 1)
      }
    }
    return copy
  }

  return obj
}

/**
 * 脱敏后输出日志（info 级别）
 */
export function secureLog(...args: any[]): void {
  console.log(...args.map((arg) => sanitize(arg)))
}

/**
 * 脱敏后输出警告日志
 */
export function secureWarn(...args: any[]): void {
  console.warn(...args.map((arg) => sanitize(arg)))
}

/**
 * 脱敏后输出错误日志
 */
export function secureError(...args: any[]): void {
  console.error(...args.map((arg) => sanitize(arg)))
}

/**
 * 直接对数据进行脱敏（不输出日志）
 */
export function sanitizeData<T = any>(data: T): T {
  return sanitize(data) as T
}
