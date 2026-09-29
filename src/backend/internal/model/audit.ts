/**
 * 审计日志系统 (Audit Log System)
 * 添加日期: 2026-09-05
 * 
 * 记录所有敏感操作，用于安全审计、合规要求和故障排查。
 * 采用内存 + KV 持久化的混合策略，适配 Cloudflare Workers 环境。
 */

export interface AuditLog {
  id?: string
  timestamp: string
  user_id?: number
  username: string
  ip: string
  action: string
  resource: string
  method: string
  status: "success" | "failure"
  status_code: number
  details?: string
  user_agent?: string
  duration_ms?: number
}

// 内存缓存（进程内，最多保留 1000 条）
let auditLogs: AuditLog[] = []
const MAX_MEMORY_LOGS = 1000
const AUDIT_LOG_KV_KEY = "openlist_audit_logs"

/**
 * 记录审计日志
 */
export async function logAudit(
  entry: Omit<AuditLog, "id" | "timestamp">,
  env?: any,
): Promise<void> {
  const log: AuditLog = {
    id: generateLogId(),
    timestamp: new Date().toISOString(),
    ...entry,
  }

  // 添加到内存缓存
  auditLogs.push(log)

  // 防止内存溢出，保留最近 N 条
  if (auditLogs.length > MAX_MEMORY_LOGS) {
    auditLogs = auditLogs.slice(-MAX_MEMORY_LOGS)
  }

  // 异步持久化到 KV（不阻塞主流程）
  if (env) {
    persistAuditLogToKV(log, env).catch((err) => {
      console.warn("[Audit] Failed to persist log to KV:", err)
    })
  }

  // 控制台输出（开发环境）
  if (isDevelopment(env)) {
    console.log(
      `[AUDIT] ${log.username} ${log.method} ${log.resource} - ${log.status} (${log.status_code})`,
    )
  }
}

/**
 * 查询审计日志（内存缓存）
 */
export function queryAuditLogs(filters?: {
  username?: string
  action?: string
  method?: string
  status?: "success" | "failure"
  startDate?: string
  endDate?: string
  limit?: number
}): AuditLog[] {
  let results = [...auditLogs]

  if (filters?.username) {
    results = results.filter((log) => log.username === filters.username)
  }

  if (filters?.action) {
    results = results.filter((log) => log.action.includes(filters.action!))
  }

  if (filters?.method) {
    results = results.filter(
      (log) => log.method.toUpperCase() === filters.method!.toUpperCase(),
    )
  }

  if (filters?.status) {
    results = results.filter((log) => log.status === filters.status)
  }

  if (filters?.startDate) {
    results = results.filter((log) => log.timestamp >= filters.startDate!)
  }

  if (filters?.endDate) {
    results = results.filter((log) => log.timestamp <= filters.endDate!)
  }

  const limit = filters?.limit || 100
  return results.slice(-limit).reverse() // 最新的在前
}

/**
 * 从 KV 加载历史日志
 */
export async function loadAuditLogsFromKV(env: any): Promise<AuditLog[]> {
  try {
    const { getKvBinding } = await import("./db")
    const kvInfo = await getKvBinding(env)
    if (kvInfo.mode === "none" || !kvInfo.binding) return []

    const { binding, mode } = kvInfo
    let val: any = null

    if (mode === "blob") {
      val = await binding.get(AUDIT_LOG_KV_KEY)
    } else {
      try {
        val = await binding.get(AUDIT_LOG_KV_KEY, "text")
      } catch {
        val = await binding.get(AUDIT_LOG_KV_KEY)
      }
    }

    if (val && typeof val.text === "function") {
      val = await val.text()
    }

    if (!val) return []

    const logs: AuditLog[] = JSON.parse(String(val))
    return Array.isArray(logs) ? logs : []
  } catch (err) {
    console.warn("[Audit] Failed to load logs from KV:", err)
    return []
  }
}

/**
 * 持久化单条日志到 KV（追加模式）
 */
async function persistAuditLogToKV(log: AuditLog, env: any): Promise<void> {
  try {
    const { getKvBinding } = await import("./db")
    const kvInfo = await getKvBinding(env)
    if (kvInfo.mode === "none" || !kvInfo.binding) return

    const { binding, mode } = kvInfo

    // 读取现有日志
    let existingLogs: AuditLog[] = []
    try {
      let val: any = null
      if (mode === "blob") {
        val = await binding.get(AUDIT_LOG_KV_KEY)
      } else {
        val = await binding.get(AUDIT_LOG_KV_KEY, "text")
      }
      if (val && typeof val.text === "function") val = await val.text()
      if (val) existingLogs = JSON.parse(String(val))
    } catch {
      // 首次写入或解析失败
    }

    if (!Array.isArray(existingLogs)) existingLogs = []

    // 追加新日志
    existingLogs.push(log)

    // 保留最近 10000 条（防止无限增长）
    if (existingLogs.length > 10000) {
      existingLogs = existingLogs.slice(-10000)
    }

    // 写回 KV
    const payload = JSON.stringify(existingLogs)
    if (mode === "blob") {
      if (typeof binding.set === "function") {
        await binding.set(AUDIT_LOG_KV_KEY, payload)
      } else if (typeof binding.put === "function") {
        await binding.put(AUDIT_LOG_KV_KEY, payload)
      }
    } else {
      if (typeof binding.put === "function") {
        await binding.put(AUDIT_LOG_KV_KEY, payload)
      } else if (typeof binding.set === "function") {
        await binding.set(AUDIT_LOG_KV_KEY, payload)
      }
    }
  } catch (err) {
    // 持久化失败不影响业务流程
    console.warn("[Audit] Persist to KV failed:", err)
  }
}

/**
 * 生成日志 ID
 */
function generateLogId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID()
  }
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).substring(2, 9)
  return `${timestamp}-${random}`
}

/**
 * 检测是否为开发环境
 */
function isDevelopment(env?: any): boolean {
  const e = env || (typeof process !== "undefined" ? process.env : {})
  return e?.ENVIRONMENT === "development" || e?.NODE_ENV === "development"
}

/**
 * 清理过期日志（保留最近 30 天）
 */
export function cleanupExpiredLogs(retentionDays: number = 30): void {
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays)
  const cutoffISO = cutoffDate.toISOString()

  auditLogs = auditLogs.filter((log) => log.timestamp >= cutoffISO)
}

/**
 * 获取审计日志统计
 */
export function getAuditStats(): {
  total: number
  success: number
  failure: number
  uniqueUsers: number
  recentActions: Array<{ action: string; count: number }>
} {
  const total = auditLogs.length
  const success = auditLogs.filter((log) => log.status === "success").length
  const failure = auditLogs.filter((log) => log.status === "failure").length

  const uniqueUsers = new Set(auditLogs.map((log) => log.username)).size

  // 统计最常见的操作
  const actionCounts = new Map<string, number>()
  auditLogs.forEach((log) => {
    const count = actionCounts.get(log.action) || 0
    actionCounts.set(log.action, count + 1)
  })

  const recentActions = Array.from(actionCounts.entries())
    .map(([action, count]) => ({ action, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  return {
    total,
    success,
    failure,
    uniqueUsers,
    recentActions,
  }
}
