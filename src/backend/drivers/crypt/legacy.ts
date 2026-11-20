// Legacy (pre-rclone) Crypt content format - READ-ONLY compatibility.
// Format: [16B nonce][16B random reserved][AES-256-CTR(cryptKey, nonce, data)]
// KDF: scrypt(password, raw salt ("" when absent), N=16384, r=8, p=1, dkLen=64)
// This format was written by earlier OpenList-Worker versions; new writes use
// the rclone secretbox format in ./data. Kept so existing data stays readable.
import { scrypt } from "@noble/hashes/scrypt.js"
import { aesCtrCrypt } from "./vendor/rclone-core"

export const LEGACY_HEADER_SIZE = 32
const LEGACY_NONCE_SIZE = 16

function legacyDeriveKey(password: string, salt: string): Uint8Array {
  const enc = new TextEncoder()
  const dk = scrypt(enc.encode(password), enc.encode(salt), {
    N: 16384,
    r: 8,
    p: 1,
    dkLen: 64,
  })
  return dk.slice(0, 32)
}

export function legacyEncryptedSize(plainSize: number): number {
  return plainSize + LEGACY_HEADER_SIZE
}

/** True when the bytes carry the rclone "RCLONE\0\0" magic (32B header). */
export function isRcloneFormat(input: Uint8Array): boolean {
  const magic = [0x52, 0x43, 0x4c, 0x4f, 0x4e, 0x45, 0x00, 0x00]
  if (input.length < magic.length) return false
  for (let i = 0; i < magic.length; i++) {
    if (input[i] !== magic[i]) return false
  }
  return true
}

export function legacyDecrypt(
  password: string,
  salt: string,
  data: Uint8Array,
): Uint8Array {
  if (data.length < LEGACY_HEADER_SIZE) {
    throw new Error("[Crypt] 加密文件过短（缺少文件头）")
  }
  const key = legacyDeriveKey(password, salt)
  const nonce = data.slice(0, LEGACY_NONCE_SIZE)
  return aesCtrCrypt(key, nonce, data.slice(LEGACY_HEADER_SIZE))
}
