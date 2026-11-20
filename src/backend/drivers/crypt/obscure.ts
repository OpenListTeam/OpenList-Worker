// rclone "obscure" password obfuscation (fs/config/obscure, rclone v1.75.2).
// output = base64.RawURLEncoding(iv(16 random bytes) || AES-256-CTR(cryptKey, iv, pt))
// This is NOT encryption - it only hides passwords from casual inspection.
// rclone is MIT licensed, Copyright (C) 2012 Nick Craig-Wood - keep this notice.
import { base64url } from "rfc4648"
import { aesCtrCrypt } from "./vendor/rclone-core"

// fixed key shared by all rclone versions (obscure.go cryptKey)
const CRYPT_KEY = new Uint8Array([
  0x9c, 0x93, 0x5b, 0x48, 0x73, 0x0a, 0x55, 0x4d, 0x6b, 0xfd, 0x7c, 0x63, 0xc8,
  0x86, 0xa9, 0x2b, 0xd3, 0x90, 0x19, 0x8e, 0xb8, 0x12, 0x8a, 0xfb, 0xf4, 0xde,
  0x16, 0x2b, 0x8b, 0x95, 0xf6, 0x38,
])

export const OBFUSCATED_PREFIX = "___Obfuscated___"

const encoder = new TextEncoder()
const decoder = new TextDecoder()

/**
 * Obscure a password. `ivOverride` (16 bytes) is only for reproducible tests;
 * production leaves it undefined (uses crypto.getRandomValues).
 */
export function obscure(password: string, ivOverride?: Uint8Array): string {
  const iv = ivOverride
    ? Uint8Array.from(ivOverride)
    : crypto.getRandomValues(new Uint8Array(16))
  const ct = aesCtrCrypt(CRYPT_KEY, iv, encoder.encode(password))
  const out = new Uint8Array(iv.length + ct.length)
  out.set(iv)
  out.set(ct, iv.length)
  return base64url.stringify(out, { pad: false })
}

export function reveal(obscured: string): string {
  // loose: matches Go's non-strict base64.RawURLEncoding (lenient trailing bits)
  const raw = base64url.parse(obscured, { loose: true })
  if (raw.length < 16) {
    throw new Error("input too short when revealing password - is it obscured?")
  }
  const pt = aesCtrCrypt(CRYPT_KEY, raw.slice(0, 16), raw.slice(16))
  return decoder.decode(pt)
}

// rclone crypt.go updateObfusParm: storage records may store the password with
// the ___Obfuscated___ prefix; strip the prefix and reveal the rest.
export function deobfuscatePassword(stored: string): string {
  if (stored.startsWith(OBFUSCATED_PREFIX)) {
    return reveal(stored.slice(OBFUSCATED_PREFIX.length))
  }
  return stored
}
