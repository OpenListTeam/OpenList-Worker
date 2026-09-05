/**
 * TOTP (Time-based One-Time Password) 双因素认证模块
 * 添加日期: 2026-09-05
 * 
 * 基于 RFC 6238 标准实现，支持 Google Authenticator、Microsoft Authenticator 等 TOTP 应用
 */

import { authenticator } from "otplib"
import QRCode from "qrcode"

/**
 * 生成 TOTP 密钥和 QR 码
 * @param username 用户名
 * @param issuer 发行者名称（应用名称）
 * @returns { secret, qrcode } 密钥和 QR 码数据 URL
 */
export async function generateTOTPSecret(
  username: string,
  issuer: string = "OpenList",
): Promise<{ secret: string; qrcode: string; otpauth_url: string }> {
  // 生成 32 字符的 Base32 密钥
  const secret = authenticator.generateSecret()

  // 生成 otpauth URL（标准格式）
  const otpauth_url = authenticator.keyuri(username, issuer, secret)

  // 生成 QR 码（Data URL 格式，可直接在前端显示）
  const qrcode = await QRCode.toDataURL(otpauth_url)

  return {
    secret,
    qrcode,
    otpauth_url,
  }
}

/**
 * 验证 TOTP 令牌
 * @param token 用户输入的 6 位数字令牌
 * @param secret 用户的 TOTP 密钥
 * @returns 是否验证成功
 */
export function verifyTOTPToken(token: string, secret: string): boolean {
  try {
    // 配置容错窗口（允许前后 1 个时间窗口，即 ±30 秒）
    authenticator.options = {
      window: 1, // 允许时间偏移
    }

    return authenticator.verify({ token, secret })
  } catch (err) {
    console.error("[TOTP] Verification error:", err)
    return false
  }
}

/**
 * 生成当前 TOTP 令牌（用于测试）
 * @param secret TOTP 密钥
 * @returns 6 位数字令牌
 */
export function generateTOTPToken(secret: string): string {
  return authenticator.generate(secret)
}

/**
 * 验证 TOTP 密钥格式
 * @param secret TOTP 密钥
 * @returns 是否有效
 */
export function isValidTOTPSecret(secret: string): boolean {
  try {
    // Base32 密钥应该只包含 A-Z 和 2-7
    const base32Regex = /^[A-Z2-7]+=*$/
    return base32Regex.test(secret) && secret.length >= 16
  } catch {
    return false
  }
}

/**
 * 批量验证备用码（用于紧急登录）
 * 备用码应该由调用方生成并加密存储
 */
export function generateBackupCodes(count: number = 10): string[] {
  const codes: string[] = []
  for (let i = 0; i < count; i++) {
    // 生成 8 位随机码（格式：XXXX-XXXX）
    const part1 = Math.random().toString(36).substring(2, 6).toUpperCase()
    const part2 = Math.random().toString(36).substring(2, 6).toUpperCase()
    codes.push(`${part1}-${part2}`)
  }
  return codes
}

/**
 * 验证备用码（调用方需要实现存储和标记已使用）
 * @param inputCode 用户输入的备用码
 * @param storedCodes 存储的备用码列表
 * @returns 是否匹配（调用方需要在匹配后标记为已使用）
 */
export function verifyBackupCode(
  inputCode: string,
  storedCodes: string[],
): boolean {
  const normalized = inputCode.trim().toUpperCase().replace(/\s/g, "")
  return storedCodes.some(
    (code) => code.toUpperCase().replace(/\s/g, "") === normalized,
  )
}

// ============ 兼容旧代码的函数别名 ============

/**
 * 生成 TOTP 密钥（兼容旧代码）
 * @returns Base32 密钥字符串
 */
export function generateTotpSecret(): string {
  return authenticator.generateSecret()
}

/**
 * 生成当前 TOTP 令牌（兼容旧代码）
 * @param secret TOTP 密钥
 * @returns 6 位数字令牌
 */
export function generateTotpCode(secret: string): string {
  return authenticator.generate(secret)
}

/**
 * 验证 TOTP 令牌（兼容旧代码）
 * @param secret TOTP 密钥
 * @param code 用户输入的令牌
 * @returns 是否验证成功
 */
export async function verifyTotpCode(secret: string, code: string): Promise<boolean> {
  return verifyTOTPToken(code, secret)
}

/**
 * 构建 otpauth URL（兼容旧代码）
 * @param secret TOTP 密钥
 * @param username 用户名
 * @param issuer 发行者名称
 * @returns otpauth:// URL
 */
export function buildOtpauthUrl(
  secret: string,
  username: string,
  issuer: string = "OpenList",
): string {
  return authenticator.keyuri(username, issuer, secret)
}

/**
 * 构建 QR 码图片 URL（兼容旧代码）
 * @param otpauthUrl otpauth:// URL
 * @returns Data URL 格式的 QR 码
 */
export async function buildQrImageUrl(otpauthUrl: string): Promise<string> {
  return QRCode.toDataURL(otpauthUrl)
}
