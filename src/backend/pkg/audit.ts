/**
 * 审计日志模块 (Audit Log)
 * 添加日期: 2026-09-05
 * 
 * 记录所有敏感操作，用于安全审计和合规性
 * 支持：
 * - 用户认证事件（登录、登出、失败）
 * - 权限变更
 * - 文件操作（上传、删除、分享）
 * - 配置变更
 */

import type { Context } from "hono"

/**
 * 审计日志级别
 */
export enum AuditLevel {
  INFO = "info",      // 一般信息（查看文件、下载）
  WARN = "warn",      // 警告（登录失败、权限不足）
  ERROR = "error",    // 错误（系统异常）
  CRITICAL = "critical", // 严重（数据删除、权限变更）
}

/**
 * 审计日志类别
 */
export enum AuditCategory {
  AUTH = "auth",           // 认证相关
  USER = "user",           // 用户管理
  FILE = "file",           // 文件操作
  SHARE = "share",         // 分享操作
  CONFIG = "config",       // 配置变更
  PERMISSION = "permission", // 权限变更
  SYSTEM = "system",       // 系统操作
}

/**
 * 审计日志条目
 */
export interface AuditLogEntry {
  id: string
  timestamp: string // ISO 8601
  level: AuditLevel
  category: AuditCategory
  action: string // 具体操作（如 "login", "delete_file", "update_permission"）
  
  // 用户信息
  user_id?: string
  username?: string
  ip_address?: string
  user_agent?: string
  
  // 操作目标
  resource_type?: string // 如 "file", "user", "config"
  resource_id?: string
  resource_name?: string
  
  // 详细信息
  message: string
  details?: Record<string, any> // 附加数据
  
  // 结果
  success: boolean
  error_message?: string
}

/**
 * 审计日志存储接口
 */
export interface AuditLogStorage {
  write(entry: AuditLogEntry): Promise<void>
  query(filters: AuditLogQueryFilters): Promise<AuditLogEntry[]>
  count(filters: AuditLogQueryFilters): Promise<number>
}

/**
 * 审计日志查询过滤器
 */
export interface AuditLogQueryFilters {
  start_time?: string // ISO 8601
  end_time?: string
  level?: AuditLevel
  category?: AuditCategory
  user_id?: string
  username?: string
  action?: string
  resource_type?: string
  resource_id?: string
  success?: boolean
  limit?: number
  offset?: number
}

/**
 * 生成唯一 ID
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`
}

/**
 * 从 Context 提取用户信息
 */
function extractUserInfo(c: Context): {
  user_id?: string
  username?: string
  ip_address?: string
  user_agent?: string
} {
  const user = (c as any).get?.("user") // JWT payload
  const ip = c.req.header("cf-connecting-ip") || 
             c.req.header("x-forwarded-for") || 
             c.req.header("x-real-ip") || 
             "unknown"
  const userAgent = c.req.header("user-agent") || "unknown"

  return {
    user_id: user?.id,
    username: user?.username,
    ip_address: ip,
    user_agent: userAgent,
  }
}

/**
 * 审计日志记录器
 */
export class AuditLogger {
  private storage: AuditLogStorage

  constructor(storage: AuditLogStorage) {
    this.storage = storage
  }

  /**
   * 记录审计日志
   */
  async log(
    c: Context,
    level: AuditLevel,
    category: AuditCategory,
    action: string,
    message: string,
    options: {
      success?: boolean
      resource_type?: string
      resource_id?: string
      resource_name?: string
      details?: Record<string, any>
      error_message?: string
    } = {},
  ): Promise<void> {
    const userInfo = extractUserInfo(c)

    const entry: AuditLogEntry = {
      id: generateId(),
      timestamp: new Date().toISOString(),
      level,
      category,
      action,
      message,
      success: options.success ?? true,
      ...userInfo,
      resource_type: options.resource_type,
      resource_id: options.resource_id,
      resource_name: options.resource_name,
      details: options.details,
      error_message: options.error_message,
    }

    try {
      await this.storage.write(entry)
    } catch (err) {
      console.error("[AuditLog] Failed to write log:", err)
      // 不抛出异常，避免影响主业务
    }
  }

  /**
   * 记录登录成功
   */
  async logLoginSuccess(c: Context, username: string): Promise<void> {
    await this.log(
      c,
      AuditLevel.INFO,
      AuditCategory.AUTH,
      "login",
      `User ${username} logged in successfully`,
      { success: true },
    )
  }

  /**
   * 记录登录失败
   */
  async logLoginFailure(
    c: Context,
    username: string,
    reason: string,
  ): Promise<void> {
    await this.log(
      c,
      AuditLevel.WARN,
      AuditCategory.AUTH,
      "login_failed",
      `Failed login attempt for user ${username}`,
      { success: false, error_message: reason },
    )
  }

  /**
   * 记录登出
   */
  async logLogout(c: Context): Promise<void> {
    await this.log(
      c,
      AuditLevel.INFO,
      AuditCategory.AUTH,
      "logout",
      "User logged out",
      { success: true },
    )
  }

  /**
   * 记录文件上传
   */
  async logFileUpload(
    c: Context,
    filePath: string,
    fileSize: number,
  ): Promise<void> {
    await this.log(
      c,
      AuditLevel.INFO,
      AuditCategory.FILE,
      "upload",
      `Uploaded file: ${filePath}`,
      {
        success: true,
        resource_type: "file",
        resource_name: filePath,
        details: { file_size: fileSize },
      },
    )
  }

  /**
   * 记录文件删除
   */
  async logFileDelete(
    c: Context,
    filePath: string,
    success: boolean,
  ): Promise<void> {
    await this.log(
      c,
      success ? AuditLevel.CRITICAL : AuditLevel.ERROR,
      AuditCategory.FILE,
      "delete",
      `Deleted file: ${filePath}`,
      {
        success,
        resource_type: "file",
        resource_name: filePath,
      },
    )
  }

  /**
   * 记录权限变更
   */
  async logPermissionChange(
    c: Context,
    targetUsername: string,
    oldRole: number,
    newRole: number,
  ): Promise<void> {
    await this.log(
      c,
      AuditLevel.CRITICAL,
      AuditCategory.PERMISSION,
      "update_permission",
      `Changed permission for user ${targetUsername}`,
      {
        success: true,
        resource_type: "user",
        resource_name: targetUsername,
        details: { old_role: oldRole, new_role: newRole },
      },
    )
  }

  /**
   * 记录用户创建
   */
  async logUserCreate(
    c: Context,
    username: string,
    role: number,
  ): Promise<void> {
    await this.log(
      c,
      AuditLevel.INFO,
      AuditCategory.USER,
      "create",
      `Created user: ${username}`,
      {
        success: true,
        resource_type: "user",
        resource_name: username,
        details: { role },
      },
    )
  }

  /**
   * 记录用户删除
   */
  async logUserDelete(c: Context, username: string): Promise<void> {
    await this.log(
      c,
      AuditLevel.CRITICAL,
      AuditCategory.USER,
      "delete",
      `Deleted user: ${username}`,
      {
        success: true,
        resource_type: "user",
        resource_name: username,
      },
    )
  }

  /**
   * 查询审计日志
   */
  async query(filters: AuditLogQueryFilters): Promise<AuditLogEntry[]> {
    return this.storage.query(filters)
  }

  /**
   * 统计审计日志数量
   */
  async count(filters: AuditLogQueryFilters): Promise<number> {
    return this.storage.count(filters)
  }
}

/**
 * 内存存储（用于开发和测试）
 */
export class InMemoryAuditLogStorage implements AuditLogStorage {
  private logs: AuditLogEntry[] = []
  private maxSize: number

  constructor(maxSize: number = 10000) {
    this.maxSize = maxSize
  }

  async write(entry: AuditLogEntry): Promise<void> {
    this.logs.push(entry)
    // 限制内存大小
    if (this.logs.length > this.maxSize) {
      this.logs.shift()
    }
  }

  async query(filters: AuditLogQueryFilters): Promise<AuditLogEntry[]> {
    let results = this.logs

    // 过滤
    if (filters.start_time) {
      results = results.filter((log) => log.timestamp >= filters.start_time!)
    }
    if (filters.end_time) {
      results = results.filter((log) => log.timestamp <= filters.end_time!)
    }
    if (filters.level) {
      results = results.filter((log) => log.level === filters.level)
    }
    if (filters.category) {
      results = results.filter((log) => log.category === filters.category)
    }
    if (filters.user_id) {
      results = results.filter((log) => log.user_id === filters.user_id)
    }
    if (filters.username) {
      results = results.filter((log) => log.username === filters.username)
    }
    if (filters.action) {
      results = results.filter((log) => log.action === filters.action)
    }
    if (filters.resource_type) {
      results = results.filter(
        (log) => log.resource_type === filters.resource_type,
      )
    }
    if (filters.resource_id) {
      results = results.filter((log) => log.resource_id === filters.resource_id)
    }
    if (filters.success !== undefined) {
      results = results.filter((log) => log.success === filters.success)
    }

    // 排序（最新的在前）
    results = results.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    )

    // 分页
    const offset = filters.offset || 0
    const limit = filters.limit || 100
    return results.slice(offset, offset + limit)
  }

  async count(filters: AuditLogQueryFilters): Promise<number> {
    const results = await this.query({ ...filters, limit: Number.MAX_SAFE_INTEGER })
    return results.length
  }

  // 开发辅助：清空日志
  clear(): void {
    this.logs = []
  }
}

/**
 * 控制台存储（直接输出到日志）
 */
export class ConsoleAuditLogStorage implements AuditLogStorage {
  async write(entry: AuditLogEntry): Promise<void> {
    const level = entry.level.toUpperCase()
    const msg = `[AUDIT][${level}][${entry.category}] ${entry.action}: ${entry.message}`
    
    if (entry.level === AuditLevel.ERROR || entry.level === AuditLevel.CRITICAL) {
      console.error(msg, entry)
    } else if (entry.level === AuditLevel.WARN) {
      console.warn(msg, entry)
    } else {
      console.log(msg, entry)
    }
  }

  async query(filters: AuditLogQueryFilters): Promise<AuditLogEntry[]> {
    console.warn("[AuditLog] ConsoleAuditLogStorage does not support query")
    return []
  }

  async count(filters: AuditLogQueryFilters): Promise<number> {
    console.warn("[AuditLog] ConsoleAuditLogStorage does not support count")
    return 0
  }
}

/**
 * 全局审计日志实例（单例）
 */
let globalAuditLogger: AuditLogger | null = null

/**
 * 获取全局审计日志实例
 */
export function getAuditLogger(): AuditLogger {
  if (!globalAuditLogger) {
    // 默认使用内存存储（生产环境应该替换为持久化存储）
    const storage = new InMemoryAuditLogStorage(10000)
    globalAuditLogger = new AuditLogger(storage)
  }
  return globalAuditLogger
}

/**
 * 设置全局审计日志存储
 */
export function setAuditLogStorage(storage: AuditLogStorage): void {
  globalAuditLogger = new AuditLogger(storage)
}
