/**
 * 输入验证模块 (Input Validation)
 * 添加日期: 2026-09-05
 * 
 * 使用 Zod 进行类型安全的输入验证，防止注入攻击和数据污染
 */

import { z } from "zod"

// ============ 通用验证器 ============

/**
 * 用户名验证（3-32 字符，仅字母数字下划线）
 */
export const usernameSchema = z
  .string()
  .min(3, "Username must be at least 3 characters")
  .max(32, "Username must be at most 32 characters")
  .regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores")

/**
 * 密码验证（8-128 字符，至少包含字母和数字）
 */
export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password must be at most 128 characters")
  .regex(/[a-zA-Z]/, "Password must contain at least one letter")
  .regex(/[0-9]/, "Password must contain at least one number")

/**
 * 邮箱验证
 */
export const emailSchema = z
  .string()
  .email("Invalid email address")
  .max(255, "Email must be at most 255 characters")

/**
 * 路径验证（防止路径遍历攻击）
 */
export const pathSchema = z
  .string()
  .max(4096, "Path too long")
  .refine((path) => !path.includes(".."), "Path traversal detected")
  .refine((path) => !path.includes("\0"), "Null byte detected")

/**
 * TOTP 令牌验证（6 位数字）
 */
export const totpTokenSchema = z
  .string()
  .length(6, "TOTP token must be 6 digits")
  .regex(/^\d{6}$/, "TOTP token must be numeric")

/**
 * 分页参数验证
 */
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  per_page: z.coerce.number().int().min(1).max(1000).default(50),
})

// ============ API 请求验证 ============

/**
 * 登录请求验证
 */
export const loginRequestSchema = z.object({
  username: usernameSchema,
  password: z.string().min(1, "Password is required"),
  totp_token: z.string().optional(), // 双因素认证令牌（可选）
  remember: z.boolean().optional().default(false),
})

/**
 * 用户创建请求验证
 */
export const createUserRequestSchema = z.object({
  username: usernameSchema,
  password: passwordSchema,
  role: z.number().int().min(0).max(3).default(1), // 0=超级管理员, 1=管理员, 2=普通用户, 3=访客
  permission: z.number().int().min(0).default(0),
  disabled: z.boolean().optional().default(false),
  base_path: pathSchema.optional(),
})

/**
 * 用户更新请求验证
 */
export const updateUserRequestSchema = z.object({
  password: passwordSchema.optional(),
  role: z.number().int().min(0).max(3).optional(),
  permission: z.number().int().min(0).optional(),
  disabled: z.boolean().optional(),
  base_path: pathSchema.optional(),
})

/**
 * 2FA 启用请求验证
 */
export const enable2FARequestSchema = z.object({
  token: totpTokenSchema, // 验证用户已正确配置 TOTP
})

/**
 * 文件操作请求验证
 */
export const fileOperationRequestSchema = z.object({
  path: pathSchema,
  name: z.string().min(1).max(255).optional(),
  target: pathSchema.optional(),
})

/**
 * 设置更新请求验证
 */
export const settingsUpdateRequestSchema = z.object({
  site_title: z.string().max(100).optional(),
  logo_url: z.string().url().max(500).optional(),
  allow_signup: z.boolean().optional(),
  default_role: z.number().int().min(0).max(3).optional(),
  session_timeout: z.number().int().min(300).max(86400).optional(), // 5 分钟 ~ 24 小时
})

// ============ 验证辅助函数 ============

/**
 * 验证输入并返回解析结果
 * @param schema Zod schema
 * @param data 待验证数据
 * @returns { success, data?, error? }
 */
export function validate<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
): { success: true; data: T } | { success: false; error: string } {
  try {
    const parsed = schema.parse(data)
    return { success: true, data: parsed }
  } catch (err) {
    if (err instanceof z.ZodError) {
      const firstError = err.errors[0]
      const message = firstError ? `${firstError.path.join(".")}: ${firstError.message}` : "Validation failed"
      return { success: false, error: message }
    }
    return { success: false, error: "Unknown validation error" }
  }
}

/**
 * 验证输入并抛出异常（用于 async 路由）
 * @param schema Zod schema
 * @param data 待验证数据
 * @returns 解析后的数据
 * @throws 验证失败时抛出错误
 */
export function validateOrThrow<T>(schema: z.ZodSchema<T>, data: unknown): T {
  return schema.parse(data)
}

/**
 * 安全验证（不抛出异常，返回默认值）
 * @param schema Zod schema
 * @param data 待验证数据
 * @param defaultValue 验证失败时的默认值
 * @returns 解析后的数据或默认值
 */
export function validateSafe<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
  defaultValue: T,
): T {
  try {
    return schema.parse(data)
  } catch {
    return defaultValue
  }
}

// ============ SQL 注入防护 ============

/**
 * 清理 SQL 查询参数（虽然应该使用参数化查询，但作为额外防护）
 */
export function sanitizeSQLInput(input: string): string {
  return input.replace(/['";\\]/g, "")
}

/**
 * 验证排序字段（防止 SQL 注入）
 */
export const sortFieldSchema = z.enum([
  "id",
  "name",
  "size",
  "modified",
  "created",
  "username",
  "role",
])

/**
 * 验证排序方向
 */
export const sortOrderSchema = z.enum(["asc", "desc", "ASC", "DESC"])

// ============ XSS 防护 ============

/**
 * 转义 HTML 特殊字符（防止 XSS）
 */
export function escapeHTML(input: string): string {
  const map: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#x27;",
    "/": "&#x2F;",
  }
  return input.replace(/[&<>"'/]/g, (char) => map[char] || char)
}

/**
 * 清理用户输入的显示文本（移除危险字符）
 */
export function sanitizeDisplayText(input: string): string {
  return input.replace(/[<>]/g, "").trim()
}

// ============ 导出所有验证器 ============

export const validators = {
  username: usernameSchema,
  password: passwordSchema,
  email: emailSchema,
  path: pathSchema,
  totpToken: totpTokenSchema,
  pagination: paginationSchema,
  loginRequest: loginRequestSchema,
  createUserRequest: createUserRequestSchema,
  updateUserRequest: updateUserRequestSchema,
  enable2FARequest: enable2FARequestSchema,
  fileOperation: fileOperationRequestSchema,
  settingsUpdate: settingsUpdateRequestSchema,
  sortField: sortFieldSchema,
  sortOrder: sortOrderSchema,
}
