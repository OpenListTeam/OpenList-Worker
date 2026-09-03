/**
 * TOTP (RFC 6238) utilities built on Web Crypto only —
 * compatible with Cloudflare Workers / Vercel / Node.js.
 *
 * - base32 (RFC 4648) encode/decode
 * - HMAC-SHA1 dynamic truncation, 6 digits, 30s period
 * - otpauth:// URL generation for authenticator apps
 */

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567"

export function base32Decode(input: string): Uint8Array<ArrayBuffer> {
  const clean = String(input).toUpperCase().replace(/[\s=]/g, "")
  if (!clean) throw new Error("Empty base32 secret")
  const bytes: number[] = []
  let buffer = 0
  let bitsLeft = 0
  for (const ch of clean) {
    const idx = BASE32_ALPHABET.indexOf(ch)
    if (idx === -1) throw new Error(`Invalid base32 character: ${ch}`)
    buffer = (buffer << 5) | idx
    bitsLeft += 5
    if (bitsLeft >= 8) {
      bytes.push((buffer >> (bitsLeft - 8)) & 0xff)
      bitsLeft -= 8
    }
  }
  return new Uint8Array(bytes)
}

export function base32Encode(data: Uint8Array<ArrayBuffer>): string {
  let value = 0
  let bits = 0
  let out = ""
  for (let i = 0; i < data.length; i++) {
    value = (value << 8) | data[i]
    bits += 8
    while (bits >= 5) {
      out += BASE32_ALPHABET[(value >> (bits - 5)) & 31]
      bits -= 5
    }
  }
  if (bits > 0) {
    out += BASE32_ALPHABET[(value << (5 - bits)) & 31]
  }
  return out
}

/** Generate a random base32 secret (default 20 bytes → 32 chars). */
export function generateTotpSecret(bytes = 20): string {
  const buf = new Uint8Array(bytes)
  crypto.getRandomValues(buf)
  return base32Encode(buf)
}

async function hmacSha1(
  key: Uint8Array<ArrayBuffer>,
  msg: Uint8Array<ArrayBuffer>,
): Promise<Uint8Array<ArrayBuffer>> {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    key,
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"],
  )
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, msg)
  return new Uint8Array(sig)
}

/** Generate a TOTP code for the given secret and time. */
export async function generateTotpCode(
  secret: string,
  timestamp: number = Date.now(),
  period = 30,
  digits = 6,
): Promise<string> {
  const counter = Math.floor(timestamp / 1000 / period)
  // 8-byte big-endian counter
  const counterBytes = new Uint8Array(8)
  let c = counter
  for (let i = 7; i >= 0; i--) {
    counterBytes[i] = c & 0xff
    c = Math.floor(c / 256)
  }
  const hmac = await hmacSha1(base32Decode(secret), counterBytes)
  const offset = hmac[hmac.length - 1] & 0x0f
  const binCode =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff)
  const code = binCode % Math.pow(10, digits)
  return String(code).padStart(digits, "0")
}

/**
 * Verify a 6-digit TOTP token against a secret, allowing `window`
 * time-steps of skew in either direction (default ±1 × 30s).
 */
export async function verifyTotpCode(
  secret: string,
  token: string,
  window = 1,
  timestamp: number = Date.now(),
): Promise<boolean> {
  if (!secret || !token) return false
  const trimmed = String(token).trim()
  if (!/^\d{6}$/.test(trimmed)) return false
  for (let i = -window; i <= window; i++) {
    const code = await generateTotpCode(secret, timestamp + i * 30000)
    if (code === trimmed) return true
  }
  return false
}

/** Build a standard otpauth:// URI for authenticator apps. */
export function buildOtpauthUrl(
  secret: string,
  username: string,
  issuer = "OpenList",
): string {
  const label = encodeURIComponent(`${issuer}:${username}`)
  const params = new URLSearchParams({
    secret,
    issuer,
    algorithm: "SHA1",
    digits: "6",
    period: "30",
  })
  return `otpauth://totp/${label}?${params.toString()}`
}

/**
 * Render the otpauth URI as a QR code image via a public QR service.
 * Users can also enter the secret manually, so a failing QR service
 * does not block enrollment.
 */
export function buildQrImageUrl(otpauthUrl: string): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(
    otpauthUrl,
  )}`
}
