/**
 * 存储配置错误的「可展示化」工具：脱敏 + 截断 + 建议组装。
 *
 * 单独成模块的原因：两处都需要同一套规则，而它们位于不同层次 ——
 *   - server/public.ts：免鉴权诊断接口（env_check / init_status / init/setup）
 *   - index.ts：全局 503 拦截中间件
 * 若各自实现一份，两处给出的粒度（几行、是否带建议）迟早会漂移，用户会在
 * 「同一个问题、两个说法」之间反复排查。
 */

/**
 * 对单行文本做脱敏（供免鉴权接口使用）。
 *
 * 目标：保留「问题类别」的可操作性，同时抹掉可能泄漏实现细节的部分：
 *   - 抹除形如 `scheme://user:pass@host` 的连接串凭据
 *   - 抹除常见的 key=value 形式的令牌
 *   - 截断长度，避免回显大段内部信息
 */
function scrub(s: string): string {
  let out = String(s).trim()
  out = out.replace(/(\w+:\/\/)[^/@\s]+@/g, "$1***@")
  out = out.replace(
    /\b(token|secret|password|passwd|pwd|api[_-]?key)\s*[=:]\s*\S+/gi,
    "$1=***",
  )
  const MAX = 160
  return out.length > MAX ? out.slice(0, MAX) + "…" : out
}

/**
 * 配置类错误的展示行数上限。
 *
 * 这些码对应的是**我们自己**写的多行提示（组合非法 / 驱动不可用 / 无存储 /
 * 代理未配置），后续行才是「怎么改」，必须展示出来；
 * 而运行期错误（HEALTH_ERROR 等）可能含内部主机名，只取首行。
 */
const MULTILINE_ERROR_CODES = new Set([
  "INVALID_COMBINATION",
  "DRIVER_UNAVAILABLE",
  "UNKNOWN_DRIVER",
  "NO_STORAGE",
  "PROXY_CONFIG",
  "DRIVER_ERROR",
])

/**
 * 取出用于展示的最大行数。
 *
 * ⚠️ 使用约束（改文案时务必遵守）：这里只透传前 N 行，因此**我们自己写的多行
 * 提示，前 3 行必须自包含** —— 结论、答案、下一步动作都要落在前 3 行内。
 * 曾经的教训：把「Auto-detection would pick: DB_DRIVER=d1」放在第 7 行，结果被
 * 截掉，用户在界面上只看到一段被砍断的说明，根本不知道该改成什么。
 * 另外每行还会被 scrub() 截到 160 字符，单行不要写太长。
 */
export function reasonLines(code?: string | null): number {
  return code && MULTILINE_ERROR_CODES.has(code) ? 3 : 1
}

/**
 * 给界面用的一行短原因。
 *
 * 只取首行：我们自己的多行提示都按「首行 = 原因，后续行 = 排查与修复方向」
 * 排列，所以首行天然是完整的一句 —— 界面不会出现被截断的半句 + 省略号。
 * 完整说明仍在 message 字段里，供日志与工具使用。
 */
export function storageErrorSummary(raw: any): string | null {
  if (raw === null || raw === undefined) return null
  const first = String(raw)
    .split("\n")
    .map((l) => l.trim())
    .find((l) => l.length > 0)
  return first ? scrub(first) : null
}

/**
 * 对错误文本做脱敏，供免鉴权接口使用。
 *
 * 默认只保留首行（去掉多行堆栈）；`maxLines` 用于我们自己的、多行且
 * 可操作的配置类错误（如「组合非法 + 该驱动支持哪些格式 + 怎么改」）。
 */
export function redact(raw: any, maxLines = 1): string {
  if (raw === null || raw === undefined) return "unknown error"
  const lines = String(raw)
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, Math.max(1, maxLines))
    .map(scrub)
  return lines.length ? lines.join(" ") : "unknown error"
}

/**
 * 把存储配置错误整理成「前端可直接展示」的形状。
 *
 *   - reason：截断后的原因（控制长度，避免把整段排查说明糊到界面上）
 *   - suggestion：一句话修复建议（「改什么」，前端置顶展示）
 */
export function uiStorageError(detail: {
  code: string | null
  message: string | null
  suggestion: string | null
}): { reason: string | null; suggestion: string | null } {
  return {
    reason: detail.message
      ? redact(detail.message, reasonLines(detail.code))
      : null,
    suggestion: detail.suggestion,
  }
}
