/**
 * Crypto utilities for OpenList.
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

function toBytes(data: string | Uint8Array): Uint8Array {
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

// ─── AES-256-GCM helpers ─────────────────────────────────────────────────────

async function deriveKey(password: string): Promise<CryptoKey> {
  const enc = toBytes(password)
  const keyMat = await crypto.subtle.importKey("raw", enc, "PBKDF2", false, [
    "deriveKey",
  ])
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: toBytes("salt"), iterations: 1, hash: "SHA-256" },
    keyMat,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  )
}

/**
 * Encrypt data with AES-256-GCM.
 * Returns "<ivHex>:<ciphertextHex>" (authTag is appended by SubtleCrypto).
 */
export async function encrypt(data: string, key: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const ck = await deriveKey(key)
  const cipherBuf = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    ck,
    toBytes(data),
  )
  return `${hexEncode(iv.buffer)}:${hexEncode(cipherBuf)}`
}

/**
 * Decrypt data encrypted by `encrypt()`.
 */
export async function decrypt(
  encryptedData: string,
  key: string,
): Promise<string> {
  const colonIdx = encryptedData.indexOf(":")
  const ivHex = encryptedData.slice(0, colonIdx)
  const cipherHex = encryptedData.slice(colonIdx + 1)
  const iv = fromHex(ivHex)
  const cipherBuf = fromHex(cipherHex)
  const ck = await deriveKey(key)
  const plainBuf = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    ck,
    cipherBuf,
  )
  return new TextDecoder().decode(plainBuf)
}

/** Generate a random hex string of given length */
export function randomString(length: number): string {
  const bytes = crypto.getRandomValues(new Uint8Array(Math.ceil(length / 2)))
  return hexEncode(bytes.buffer).slice(0, length)
}
