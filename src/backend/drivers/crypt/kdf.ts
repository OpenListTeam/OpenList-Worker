// rclone crypt key derivation (backend/crypt cipher.go Key(), rclone v1.75.2).
// scrypt(password, salt || DEFAULT_SALT, N=16384, r=8, p=1, dkLen=80)
//   -> dataKey(32) || nameKey(32) || nameTweak(16)
// Empty password yields all-zero keys (rclone behavior, used by its tests).
import { scrypt } from "@noble/hashes/scrypt.js"

export const DEFAULT_SALT = new Uint8Array([
  0xa8, 0x0d, 0xf4, 0x3a, 0x8f, 0xbd, 0x03, 0x08, 0xa7, 0xca, 0xb8, 0x3e, 0x58,
  0x1f, 0x86, 0xb1,
])

export interface CryptKeys {
  dataKey: Uint8Array
  nameKey: Uint8Array
  nameTweak: Uint8Array
}

export function deriveKeys(password: string, salt: string): CryptKeys {
  if (password === "") {
    return {
      dataKey: new Uint8Array(32),
      nameKey: new Uint8Array(32),
      nameTweak: new Uint8Array(16),
    }
  }
  const enc = new TextEncoder()
  const saltBytes = salt === "" ? DEFAULT_SALT : enc.encode(salt)
  const key = scrypt(enc.encode(password), saltBytes, {
    N: 16384,
    r: 8,
    p: 1,
    dkLen: 80,
  })
  return {
    dataKey: key.slice(0, 32),
    nameKey: key.slice(32, 64),
    nameTweak: key.slice(64, 80),
  }
}
