/**
 * Crypto utilities for OpenListNext.
 * Uses Web Crypto API (crypto.subtle + crypto.getRandomValues) —
 * compatible with Cloudflare Workers and Node.js 18+.
 * All functions are async.
 */

// ─── Helpers ──────────────────────────────────────────────────────────────────

function hexEncode(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
}

function toBytes(data: string | Uint8Array): any {
  if (typeof data === "string") return new TextEncoder().encode(data)
  return data
}

function fromHex(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16)
  }
  return bytes
}

// ─── MD5 (pure-JS, SubtleCrypto does not support MD5) ───────────────────────

function md5Sync(input: string | Uint8Array): string {
  // RFC 1321 pure-JS MD5 — minimal implementation
  const msg =
    typeof input === "string" ? new TextEncoder().encode(input) : input
  const msgLen = msg.length
  const bitLen = msgLen * 8

  // Pre-processing: padding
  const padLen = (56 - ((msgLen + 1) % 64) + 64) % 64
  const padded = new Uint8Array(msgLen + 1 + padLen + 8)
  padded.set(msg)
  padded[msgLen] = 0x80
  const dv = new DataView(padded.buffer)
  dv.setUint32(padded.length - 8, bitLen >>> 0, true)
  dv.setUint32(padded.length - 4, Math.floor(bitLen / 0x100000000), true)

  const T = new Int32Array(64)
  for (let i = 0; i < 64; i++)
    T[i] = (Math.abs(Math.sin(i + 1)) * 0x100000000) | 0

  const r = [
    7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 5, 9, 14, 20, 5,
    9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11,
    16, 23, 4, 11, 16, 23, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10,
    15, 21,
  ]

  let a0 = 0x67452301,
    b0 = 0xefcdab89,
    c0 = 0x98badcfe,
    d0 = 0x10325476

  for (let i = 0; i < padded.length; i += 64) {
    const chunk = new DataView(padded.buffer, i, 64)
    const M = Array.from({ length: 16 }, (_, j) => chunk.getInt32(j * 4, true))
    let [A, B, C, D] = [a0, b0, c0, d0]

    for (let j = 0; j < 64; j++) {
      let F: number, g: number
      if (j < 16) {
        F = (B & C) | (~B & D)
        g = j
      } else if (j < 32) {
        F = (D & B) | (~D & C)
        g = (5 * j + 1) % 16
      } else if (j < 48) {
        F = B ^ C ^ D
        g = (3 * j + 5) % 16
      } else {
        F = C ^ (B | ~D)
        g = (7 * j) % 16
      }
      const tmp = D
      D = C
      C = B
      const sum = (A + F + T[j] + M[g]) | 0
      B = (B + ((sum << r[j]) | (sum >>> (32 - r[j])))) | 0
      A = tmp
    }
    a0 = (a0 + A) | 0
    b0 = (b0 + B) | 0
    c0 = (c0 + C) | 0
    d0 = (d0 + D) | 0
  }

  const result = new DataView(new ArrayBuffer(16))
  result.setInt32(0, a0, true)
  result.setInt32(4, b0, true)
  result.setInt32(8, c0, true)
  result.setInt32(12, d0, true)
  return hexEncode(result.buffer)
}

export function md5(data: string | Uint8Array): string {
  return md5Sync(data)
}

// ─── SHA-1 / SHA-256 / HMAC-SHA-256 ─────────────────────────────────────────

export async function sha1(data: string | Uint8Array): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-1", toBytes(data))
  return hexEncode(buf)
}

export async function sha256(data: string | Uint8Array): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", toBytes(data))
  return hexEncode(buf)
}

export async function hmacSha256(
  data: string | Uint8Array,
  key: string,
): Promise<string> {
  const keyMat = await crypto.subtle.importKey(
    "raw",
    toBytes(key),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  )
  const sig = await crypto.subtle.sign("HMAC", keyMat, toBytes(data))
  return hexEncode(sig)
}

/** HMAC-SHA1（base64 输出，阿里云 OSS V1 签名使用） */
export async function hmacSha1Base64(
  data: string,
  key: string,
): Promise<string> {
  const keyMat = await crypto.subtle.importKey(
    "raw",
    toBytes(key),
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"],
  )
  const sig = await crypto.subtle.sign("HMAC", keyMat, toBytes(data))
  const bytes = new Uint8Array(sig)
  let binary = ""
  for (const b of bytes) binary += String.fromCharCode(b)
  return btoa(binary)
}

// ─── AES-256-GCM helpers ─────────────────────────────────────────────────────

const PBKDF2_ITERATIONS = 100000

async function deriveKey(
  password: string,
  salt: Uint8Array | string = "salt",
  iterations = PBKDF2_ITERATIONS,
): Promise<CryptoKey> {
  const enc = toBytes(password)
  const saltBytes = toBytes(salt)
  const keyMat = await crypto.subtle.importKey("raw", enc, "PBKDF2", false, [
    "deriveKey",
  ])
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: saltBytes, iterations, hash: "SHA-256" },
    keyMat,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  )
}

/**
 * Encrypt data with AES-256-GCM.
 * Returns "<saltHex>:<ivHex>:<ciphertextHex>" (authTag is appended by SubtleCrypto).
 */
export async function encrypt(data: string, key: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const ck = await deriveKey(key, salt, PBKDF2_ITERATIONS)
  const cipherBuf = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    ck,
    toBytes(data),
  )
  return `${hexEncode(salt.buffer)}:${hexEncode(iv.buffer)}:${hexEncode(cipherBuf)}`
}

/**
 * Decrypt data encrypted by `encrypt()`.
 * Supports both new format (<saltHex>:<ivHex>:<cipherHex>) and legacy format (<ivHex>:<cipherHex>).
 */
export async function decrypt(
  encryptedData: string,
  key: string,
): Promise<string> {
  const parts = encryptedData.split(":")
  let salt: Uint8Array | string = "salt"
  let ivHex = ""
  let cipherHex = ""
  let iterations = 1

  if (parts.length === 3) {
    // New secure format: salt:iv:ciphertext
    salt = fromHex(parts[0])
    ivHex = parts[1]
    cipherHex = parts[2]
    iterations = PBKDF2_ITERATIONS
  } else if (parts.length === 2) {
    // Legacy format compatibility: iv:ciphertext (1 iteration, static "salt")
    ivHex = parts[0]
    cipherHex = parts[1]
    iterations = 1
  } else {
    throw new Error("Invalid encrypted data format")
  }

  const iv = fromHex(ivHex)
  const cipherBuf = fromHex(cipherHex)
  const ck = await deriveKey(key, salt, iterations)
  const plainBuf = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: iv as any },
    ck,
    cipherBuf as any,
  )
  return new TextDecoder().decode(plainBuf)
}

/** Generate a random hex string of given length */
export function randomString(length: number): string {
  const bytes = crypto.getRandomValues(new Uint8Array(Math.ceil(length / 2)))
  return hexEncode(bytes.buffer).slice(0, length)
}
