// 189PC encryption utilities
import { createCipheriv, randomBytes, publicEncrypt } from "crypto"

export function encryptPassword(password: string, publicKey: string): string {
  // RSA encrypt password
  const pemKey = `-----BEGIN PUBLIC KEY-----\n${publicKey}\n-----END PUBLIC KEY-----`
  const encrypted = publicEncrypt(
    {
      key: pemKey,
      padding: 1, // RSA_PKCS1_PADDING
    },
    Buffer.from(password)
  )
  return encrypted.toString("hex")
}

export function generateDeviceId(): string {
  return randomBytes(16).toString("hex").toUpperCase()
}

export function encryptAES(data: string, key: string): string {
  const iv = randomBytes(16)
  const cipher = createCipheriv("aes-128-cbc", Buffer.from(key, "utf8").slice(0, 16), iv)
  let encrypted = cipher.update(data, "utf8", "hex")
  encrypted += cipher.final("hex")
  return iv.toString("hex") + encrypted
}
