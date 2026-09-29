/* =====================================================================
 * 密码哈希模块 (Password Hashing)
 *
 * 存储方案：Go (OpenList/AList) 兼容双层 SHA256
 *   对齐 OpenList/internal/model/user.go：
 *     StaticHash(pwd)          = sha256(`${pwd}-${STATIC_HASH_SALT}`) —— 前端 /login/hash 提交值
 *     saltedHash(static, salt) = sha256(`${static}-${salt}`)          —— per-user 盐二次哈希
 *     PwdHash = saltedHash(StaticHash(pwd), salt)                     —— 数据库存储值
 *
 * 存储字段：user.password（64位 hex）+ user.salt（16位随机）。
 * 历史格式兼容（读兼容，登录成功后自动迁移到本格式）：
 *   - 单层 sha256（无 salt 字段，早期 TSWorker）：password 直接等于 StaticHash(pwd)
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

/**
 * 验证密码（兼容历史单层 sha256，推荐存储为双层）
 * @param plain 明文密码（或经过 staticHash 的前端哈希值）
 * @param user  含 password + salt 字段的用户对象
 */
export async function verifyUserPassword(
  plain: string,
  user: { password: string; salt?: string },
): Promise<boolean> {
  if (!user.password) return false
  if (user.salt) {
    // 双层：先判断 plain 是否已经是 staticHash（前端哈希登录），
    // 再判断是否是明文（直接登录）。
    const staticHex = isHex64(plain) ? plain : await staticHash(plain)
    const expected = await saltedHash(staticHex, user.salt)
    return expected === user.password
  }
  // 历史单层：password == staticHash(plain)
  const staticHex = isHex64(plain) ? plain : await staticHash(plain)
  return staticHex === user.password
}

// ---- 工具函数（与存储无关） ----

/**
 * 使用 CSPRNG 生成 [0, maxExclusive) 的均匀随机整数（rejection sampling 消除 modulo bias）
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
 * @param length 密码长度（默认 16，最小 4）
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

  // Fisher-Yates 洗牌
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
 * @returns { score: 0-4, feedback, isStrong }
 */
export function checkPasswordStrength(password: string): {
  score: number
  feedback: string[]
  isStrong: boolean
} {
  const feedback: string[] = []
  let score = 0

  if (password.length >= 8) score++
  if (password.length >= 12) score++
  if (password.length < 8) feedback.push("Password should be at least 8 characters")

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

  const weakPatterns = [/^password/i, /^123456/, /^qwerty/i, /^admin/i, /^letmein/i]
  for (const pattern of weakPatterns) {
    if (pattern.test(password)) {
      score = Math.max(0, score - 2)
      feedback.push("Avoid common passwords")
      break
    }
  }

  return { score: Math.min(4, score), feedback, isStrong: score >= 3 }
}
