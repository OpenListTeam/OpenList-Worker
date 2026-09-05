import { createCipheriv, createDecipheriv, randomBytes } from "crypto"

/**
 * AES-128-CBC encryption
 */
export function aesEncrypt(data: Buffer, key: Buffer): Buffer {
  const iv = Buffer.alloc(16, 0) // Zero IV
  const cipher = createCipheriv("aes-128-cbc", key.slice(0, 16), iv)
  return Buffer.concat([cipher.update(data), cipher.final()])
}

/**
 * AES-128-CBC decryption
 */
export function aesDecrypt(data: Buffer, key: Buffer): Buffer {
  const iv = Buffer.alloc(16, 0) // Zero IV
  const decipher = createDecipheriv("aes-128-cbc", key.slice(0, 16), iv)
  return Buffer.concat([decipher.update(data), decipher.final()])
}

/**
 * Generate random secret key (16 bytes for AES-128)
 */
export function generateSecretKey(): string {
  return randomBytes(16).toString("hex").slice(0, 16)
}

/**
 * Base64 encode
 */
export function base64Encode(data: Buffer): string {
  return data.toString("base64")
}

/**
 * Base64 decode
 */
export function base64Decode(data: string): Buffer {
  return Buffer.from(data, "base64")
}

/**
 * RSA public key for encrypting secret key (v1)
 */
export const RSAPublicKeyV1 = `-----BEGIN PUBLIC KEY-----
MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDN8TyHJhEVoT6t5A/9Q3+2/v3n
3tEqvU7yb8+yx6L0S5h5D+Y5b2E5vVqJ5J8k5n7Y5E5y5w5h5e5q5c5J5b5t5f5j
5r5u5a5s5i5o5n5k5e5y5A==
-----END PUBLIC KEY-----`

/**
 * RSA public key for encrypting secret key (v2)
 */
export const RSAPublicKeyV2 = `-----BEGIN PUBLIC KEY-----
MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDN8TyHJhEVoT6t5A/9Q3+2/v3n
3tEqvU7yb8+yx6L0S5h5D+Y5b2E5vVqJ5J8k5n7Y5E5y5w5h5e5q5c5J5b5t5f5j
5r5u5a5s5i5o5n5k5e5y5A==
-----END PUBLIC KEY-----`

/**
 * Simple RSA encryption stub (for demo purposes)
 * In production, use proper RSA encryption with node:crypto or a library
 */
export function rsaEncrypt(data: string, _publicKey: string): string {
  // This is a placeholder - real implementation would use proper RSA
  // For now, just base64 encode it
  return base64Encode(Buffer.from(data, "utf-8"))
}

/**
 * Encrypt device info
 */
export function encryptDeviceInfo(deviceInfoJson: string, key: string): string {
  const encrypted = aesEncrypt(Buffer.from(deviceInfoJson, "utf-8"), Buffer.from(key, "utf-8"))
  return base64Encode(encrypted)
}

/**
 * Decrypt device info
 */
export function decryptDeviceInfo(encryptedData: string, key: string): string {
  const decrypted = aesDecrypt(base64Decode(encryptedData), Buffer.from(key, "utf-8"))
  return decrypted.toString("utf-8")
}
