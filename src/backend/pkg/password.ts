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
 * 使用 CSPRNG 生成 [0, maxExclusive) 的均匀随机整数。
 * 通过 rejection sampling 消除朴素 `byte % maxExclusive` 带来的 modulo bias。
 */
function secureRandomInt(maxExclusive: number): number {
  if (maxExclusive <= 0) throw new Error("maxExclusive must be > 0")
  if (maxExclusive === 1) return 0
  const limit = 256 - (256 % maxExclusive)
  const buf = new Uint8Array(1)
  let r = 0
  do {
    crypto.getRandomValues(buf)
    r = buf[0]
  } while (r >= limit)
  return r % maxExclusive
}

/**
 * 生成随机密码（用于临时密码、重置密码等）
 * @param length 密码长度（默认 16）
 * @returns 随机密码（包含大小写字母、数字、特殊字符）
 */
export function generateRandomPassword(length: number = 16): string {
  if (!Number.isInteger(length) || length < 4) {
    throw new Error("Password length must be an integer of at least 4")
  }
  const lowercase = "abcdefghijklmnopqrstuvwxyz"
  const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
  const numbers = "0123456789"
  const symbols = "!@#$%^&*()-_=+[]{}|;:,.<>?"
  const all = lowercase + uppercase + numbers + symbols

  // 使用 CSPRNG 取代 Math.random，避免可预测性与 sort() 洗牌偏置
  const bytes = new Uint8Array(length)
  crypto.getRandomValues(bytes)

  const chars: string[] = []
  // 保证四类字符各至少一个
  chars.push(lowercase[bytes[0] % lowercase.length])
  chars.push(uppercase[bytes[1] % uppercase.length])
  chars.push(numbers[bytes[2] % numbers.length])
  chars.push(symbols[bytes[3] % symbols.length])
  for (let i = 4; i < length; i++) {
    chars.push(all[bytes[i] % all.length])
  }

  // Fisher-Yates 洗牌（CSPRNG + rejection sampling 消除 modulo bias）
  for (let i = chars.length - 1; i > 0; i--) {
    const j = secureRandomInt(i + 1)
    const tmp = chars[i]
    chars[i] = chars[j]
    chars[j] = tmp
  }
  return chars.join("")
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

/* =====================================================================
 * Go (OpenList/AList) 兼容双层密码哈希 —— 推荐存储方案
 * 对齐 OpenList/internal/model/user.go：
 *   StaticHash(pwd)          = sha256(`${pwd}-${STATIC_HASH_SALT}`) —— 前端 /login/hash 提交值
 *   saltedHash(static, salt) = sha256(`${static}-${salt}`)          —— per-user 盐二次哈希
 *   PwdHash = saltedHash(StaticHash(pwd), salt)                     —— 数据库存储值
 *
 * 存储字段：user.password（64位 hex）+ user.salt（16位随机）。
 * 历史格式兼容（读兼容，登录成功后自动迁移到本格式）：
 *   - 单层 sha256（无 salt 字段，早期 TSWorker）：password 直接等于 StaticHash(pwd)
 *   - bcrypt（曾误用于本仓库初始化）：仅明文 /login 可逃生，成功后自动迁移
 * ===================================================================== */

export const STATIC_HASH_SALT = "https://github.com/alist-org/alist"

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(input),
  )
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
}

/** 明文 -> 传输用静态哈希（对应 Go StaticHash） */
export async function staticHash(plain: string): Promise<string> {
  return sha256Hex(`${plain}-${STATIC_HASH_SALT}`)
}

/** 静态哈希 + 用户盐 -> 最终存储值（对应 Go HashPwd） */
export async function saltedHash(
  staticHex: string,
  salt: string,
): Promise<string> {
  return sha256Hex(`${staticHex}-${salt}`)
}

/** 明文 + 用户盐 -> 最终存储值（对应 Go TwoHashPwd / SetPassword） */
export async function twoStepHash(
  plain: string,
  salt: string,
): Promise<string> {
  return saltedHash(await staticHash(plain), salt)
}

/** 生成用户盐（16 位 [A-Za-z0-9]，对应 Go random.String(16)） */
export function generateSalt(length: number = 16): string {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
  const bytes = new Uint8Array(length)
  crypto.getRandomValues(bytes)
  let out = ""
  for (let i = 0; i < length; i++) out += chars[bytes[i] % chars.length]
  return out
}

/** 是否为 64 位 hex（双层/单层 SHA256 存储值均符合） */
export function isHex64(value: string): boolean {
  return /^[0-9a-f]{64}$/i.test(String(value || ""))
}

/**
 * 统一写入口令（对应 Go User.SetPassword）：
 * 生成新盐并写入双层哈希。调用方负责 saveDb 持久化。
 */
export async function setUserPassword(
  user: any,
  plain: string,
): Promise<void> {
  user.salt = generateSalt()
  user.password = await twoStepHash(plain, user.salt)
  user.pwd_update_at = new Date().toISOString()
}
