/**
 * TOTP (RFC 6238) implementation using Web Crypto API.
 * Compatible with Cloudflare Workers (no Node.js dependencies).
 */

const BASE32_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567"

export function generateSecret(length = 20): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length))
  return base32Encode(bytes)
}

export function base32Encode(bytes: Uint8Array): string {
  let bits = ""
  for (const b of bytes) {
    bits += b.toString(2).padStart(8, "0")
  }
  let result = ""
  for (let i = 0; i < bits.length; i += 5) {
    const chunk = bits.slice(i, i + 5).padEnd(5, "0")
    result += BASE32_CHARS[parseInt(chunk, 2)]
  }
  return result
}

function base32Decode(str: string): Uint8Array {
  const cleaned = str.replace(/[^A-Za-z2-7]/g, "").toUpperCase()
  let bits = ""
  for (const c of cleaned) {
    const idx = BASE32_CHARS.indexOf(c)
    if (idx === -1) continue
    bits += idx.toString(2).padStart(5, "0")
  }
  const bytes = new Uint8Array(Math.floor(bits.length / 8))
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(bits.slice(i * 8, i * 8 + 8), 2)
  }
  return bytes
}

async function hmacSha1(
  key: ArrayBuffer,
  data: ArrayBuffer,
): Promise<ArrayBuffer> {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    key,
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"],
  )
  return crypto.subtle.sign("HMAC", cryptoKey, data)
}

function intToBytes(num: number): Uint8Array {
  const bytes = new Uint8Array(8)
  let tmp = num
  for (let i = 7; i >= 0; i--) {
    bytes[i] = tmp & 0xff
    tmp = Math.floor(tmp / 256)
  }
  return bytes
}

export async function generateTOTP(
  secret: string,
  timeStep = 30,
  digits = 6,
): Promise<string> {
  const epoch = Math.floor(Date.now() / 1000)
  const counter = Math.floor(epoch / timeStep)
  return generateTOTPWithCounter(secret, counter, digits)
}

async function generateTOTPWithCounter(
  secret: string,
  counter: number,
  digits: number,
): Promise<string> {
  const keyBytes = base32Decode(secret)
  const counterBytes = intToBytes(counter)
  const hmac = await hmacSha1(keyBytes.buffer, counterBytes.buffer)
  const hmacArray = new Uint8Array(hmac)

  const offset = hmacArray[hmacArray.length - 1] & 0x0f
  const binary =
    ((hmacArray[offset] & 0x7f) << 24) |
    ((hmacArray[offset + 1] & 0xff) << 16) |
    ((hmacArray[offset + 2] & 0xff) << 8) |
    (hmacArray[offset + 3] & 0xff)

  const otp = binary % Math.pow(10, digits)
  return otp.toString().padStart(digits, "0")
}

export async function verifyTOTP(
  secret: string,
  code: string,
  window = 1,
  timeStep = 30,
  digits = 6,
): Promise<boolean> {
  const epoch = Math.floor(Date.now() / 1000)
  const counter = Math.floor(epoch / timeStep)

  for (let i = -window; i <= window; i++) {
    const expected = await generateTOTPWithCounter(secret, counter + i, digits)
    if (expected === code) return true
  }
  return false
}

export function getTOTPUri(
  secret: string,
  username: string,
  issuer: string = "OpenListNext",
): string {
  const encodedIssuer = encodeURIComponent(issuer)
  const encodedUsername = encodeURIComponent(username)
  return `otpauth://totp/${encodedIssuer}:${encodedUsername}?secret=${secret}&issuer=${encodedIssuer}&algorithm=SHA1&digits=6&period=30`
}
