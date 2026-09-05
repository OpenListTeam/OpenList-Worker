/**
 * 密码哈希模块 (Password Hashing)
 * 添加日期: 2026-09-05
 * 
 * 使用 bcrypt 替代 SHA256，提供更强的密码保护
 * 支持从 SHA256 平滑迁移到 bcrypt
 */

import bcrypt from "bcryptjs"
import sha256 from "sha256"

// bcrypt 配置
const BCRYPT_ROUNDS = 12 // 2^12 次迭代，安全性和性能的平衡

/**
 * 使用 bcrypt 哈希密码
 * @param password 明文密码
 * @returns bcrypt 哈希值（包含 salt）
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS)
}

/**
 * 验证密码（支持 bcrypt 和 SHA256）
 * @param password 用户输入的明文密码
 * @param hash 存储的哈希值
 * @returns 是否匹配
 */
export async function verifyPassword(
  password: string,
  hash: string,
): Promise<boolean> {
  try {
    // 检测哈希类型
    if (isBcryptHash(hash)) {
      // bcrypt 验证
      return bcrypt.compare(password, hash)
    } else {
      // SHA256 验证（兼容旧数据）
      const sha256Hash = sha256(password)
      return sha256Hash === hash
    }
  } catch (err) {
    console.error("[Password] Verification error:", err)
    return false
  }
}

/**
 * 检测是否为 bcrypt 哈希
 * bcrypt 哈希格式: $2a$10$... 或 $2b$10$...
 */
export function isBcryptHash(hash: string): boolean {
  return /^\$2[aby]\$\d{2}\$/.test(hash)
}

/**
 * 检测是否为 SHA256 哈希
 * SHA256 哈希长度固定为 64 字符（十六进制）
 */
export function isSHA256Hash(hash: string): boolean {
  return /^[a-f0-9]{64}$/i.test(hash)
}

/**
 * 检查密码是否需要重新哈希
 * 当用户使用 SHA256 登录时，返回 true 表示需要升级到 bcrypt
 */
export function needsRehash(hash: string): boolean {
  return !isBcryptHash(hash)
}

/**
 * 生成随机密码（用于临时密码、重置密码等）
 * @param length 密码长度（默认 16）
 * @returns 随机密码（包含大小写字母、数字、特殊字符）
 */
export function generateRandomPassword(length: number = 16): string {
  const charset = {
    lowercase: "abcdefghijklmnopqrstuvwxyz",
    uppercase: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
    numbers: "0123456789",
    symbols: "!@#$%^&*()-_=+[]{}|;:,.<>?",
  }

  const allChars =
    charset.lowercase + charset.uppercase + charset.numbers + charset.symbols

  let password = ""

  // 确保包含每种类型的字符
  password += charset.lowercase[Math.floor(Math.random() * charset.lowercase.length)]
  password += charset.uppercase[Math.floor(Math.random() * charset.uppercase.length)]
  password += charset.numbers[Math.floor(Math.random() * charset.numbers.length)]
  password += charset.symbols[Math.floor(Math.random() * charset.symbols.length)]

  // 填充剩余长度
  for (let i = password.length; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)]
  }

  // 打乱顺序
  return password
    .split("")
    .sort(() => Math.random() - 0.5)
    .join("")
}

/**
 * 验证密码强度
 * @param password 密码
 * @returns { score, feedback }
 */
export function checkPasswordStrength(password: string): {
  score: number // 0-4 分
  feedback: string[]
  isStrong: boolean
} {
  const feedback: string[] = []
  let score = 0

  // 长度检查
  if (password.length >= 8) score++
  if (password.length >= 12) score++
  if (password.length < 8) {
    feedback.push("Password should be at least 8 characters")
  }

  // 复杂度检查
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) {
    score++
  } else {
    feedback.push("Include both lowercase and uppercase letters")
  }

  if (/[0-9]/.test(password)) {
    score++
  } else {
    feedback.push("Include at least one number")
  }

  if (/[!@#$%^&*()_+\-=[\]{}|;:,.<>?]/.test(password)) {
    score++
  } else {
    feedback.push("Include at least one special character")
  }

  // 常见弱密码检查
  const weakPatterns = [
    /^password/i,
    /^123456/,
    /^qwerty/i,
    /^admin/i,
    /^letmein/i,
  ]

  for (const pattern of weakPatterns) {
    if (pattern.test(password)) {
      score = Math.max(0, score - 2)
      feedback.push("Avoid common passwords")
      break
    }
  }

  return {
    score: Math.min(4, score),
    feedback,
    isStrong: score >= 3,
  }
}

/**
 * 密码迁移辅助函数
 * 在用户登录时自动从 SHA256 升级到 bcrypt
 * 
 * 使用示例：
 * ```typescript
 * const user = await getUserByUsername(username)
 * const isValid = await verifyPassword(password, user.password)
 * 
 * if (isValid && needsRehash(user.password)) {
 *   const newHash = await hashPassword(password)
 *   await updateUserPassword(user.id, newHash)
 * }
 * ```
 */

/**
 * 批量密码迁移（用于后台任务）
 * 注意：此函数需要明文密码，通常无法批量迁移
 * 只能在用户登录时逐步迁移
 */
export async function migratePasswordHash(
  oldHash: string,
  plainPassword: string,
): Promise<string | null> {
  // 验证旧密码
  const isValid = await verifyPassword(plainPassword, oldHash)
  if (!isValid) return null

  // 生成新哈希
  return hashPassword(plainPassword)
}
