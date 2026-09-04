// 网易云音乐 API 加密（weapi / linuxapi）
// 参考 Go drivers/netease_music/crypto.go

const PRESET_KEY = "0CoJUm6Qyw8W8jud"
const LINUXAPI_KEY = "rFgB&h#%2?^eDg:Q"
const IV = "0102030405060708"
const STD_CHARS =
  "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"

// 网易 weapi RSA 公钥（modulus 128 字节，exponent 65537）
const N_HEX =
  "e0b509f6259df8642dbc35662901477df22677ec152b5ff68ace615bb7b725152b3ab17a876aea8a5aa76d2e417629ec4ee341f56135fccf695280104e0312ecbda92557c93870114af6c9d05c4f7f0c3685b7a46bee255932575cce10b424d813cfe4875d3e82047b97ddef52741d546b8e289dc6935b3ece0462db0a22b8e7"
const RSA_E = 65537n

const isNode =
  typeof process !== "undefined" && process?.release?.name === "node"

function textEncoder(s: string): Uint8Array {
  return new TextEncoder().encode(s)
}

function pkcs7Pad(src: Uint8Array, blockSize = 16): Uint8Array {
  const padLen = blockSize - (src.length % blockSize)
  const padded = new Uint8Array(src.length + padLen)
  padded.set(src)
  padded.fill(padLen, src.length)
  return padded
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = ""
  for (const b of bytes) binary += String.fromCharCode(b)
  return btoa(binary)
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
}

/** AES-CBC 加密（PKCS7 padding），返回字节 */
async function aesCbcEncrypt(
  src: Uint8Array,
  key: Uint8Array,
  iv: Uint8Array,
): Promise<Uint8Array> {
  if (isNode) {
    const { createCipheriv } = await import("node:crypto")
    const cipher = createCipheriv(
      "aes-128-cbc",
      Buffer.from(key),
      Buffer.from(iv),
    )
    return new Uint8Array(
      Buffer.concat([cipher.update(Buffer.from(src)), cipher.final()]),
    )
  }
  const keyMat = await crypto.subtle.importKey(
    "raw",
    key as any,
    { name: "AES-CBC" },
    false,
    ["encrypt"],
  )
  const padded = pkcs7Pad(src)
  const cipherBuf = await crypto.subtle.encrypt(
    { name: "AES-CBC", iv: iv as any },
    keyMat,
    padded as any,
  )
  return new Uint8Array(cipherBuf)
}

/** AES-ECB 加密（PKCS7 padding），返回字节 */
async function aesEcbEncrypt(
  src: Uint8Array,
  key: Uint8Array,
): Promise<Uint8Array> {
  if (isNode) {
    const { createCipheriv } = await import("node:crypto")
    const cipher = createCipheriv("aes-128-ecb", Buffer.from(key), null)
    return new Uint8Array(
      Buffer.concat([cipher.update(Buffer.from(src)), cipher.final()]),
    )
  }
  // Workers: Web Crypto 无 ECB，逐 block 用 AES-CBC + zero IV 模拟
  const keyMat = await crypto.subtle.importKey(
    "raw",
    key as any,
    { name: "AES-CBC" },
    false,
    ["encrypt"],
  )
  const padded = pkcs7Pad(src)
  const out = new Uint8Array(padded.length)
  const zeroIv = new Uint8Array(16)
  for (let i = 0; i < padded.length; i += 16) {
    const block = padded.subarray(i, i + 16)
    const enc = await crypto.subtle.encrypt(
      { name: "AES-CBC", iv: zeroIv as any },
      keyMat,
      block as any,
    )
    out.set(new Uint8Array(enc), i)
  }
  return out
}

function bytesToBigInt(bytes: Uint8Array): bigint {
  let hex = ""
  for (const b of bytes) hex += b.toString(16).padStart(2, "0")
  return hex ? BigInt("0x" + hex) : 0n
}

function bigIntToBytes(n: bigint, length: number): Uint8Array {
  let hex = n.toString(16)
  if (hex.length % 2) hex = "0" + hex
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16)
  }
  if (bytes.length < length) {
    const padded = new Uint8Array(length)
    padded.set(bytes, length - bytes.length)
    return padded
  }
  return bytes
}

function modPow(base: bigint, exp: bigint, mod: bigint): bigint {
  let result = 1n
  base = base % mod
  while (exp > 0n) {
    if (exp & 1n) result = (result * base) % mod
    base = (base * base) % mod
    exp >>= 1n
  }
  return result
}

/** 网易 raw RSA 加密（无 padding），返回 128 字节 */
export function rsaRawEncrypt(secretKey: Uint8Array): Uint8Array {
  const full = new Uint8Array(128)
  full.set(secretKey, 112)
  const m = bytesToBigInt(full)
  const n = BigInt("0x" + N_HEX)
  const c = modPow(m, RSA_E, n)
  return bigIntToBytes(c, 128)
}

function getSecretKey(): { key: Uint8Array; reversed: Uint8Array } {
  const key = new Uint8Array(16)
  const reversed = new Uint8Array(16)
  for (let i = 0; i < 16; i++) {
    const idx = Math.floor(Math.random() * STD_CHARS.length)
    const code = STD_CHARS.charCodeAt(idx)
    key[i] = code
    reversed[15 - i] = code
  }
  return { key, reversed }
}

/** weapi 加密：AES-CBC 两层 + raw RSA */
export async function weapi(
  data: Record<string, string>,
): Promise<Record<string, string>> {
  const text = textEncoder(JSON.stringify(data))
  const { key: secretKey, reversed } = getSecretKey()

  const first = await aesCbcEncrypt(
    text,
    textEncoder(PRESET_KEY),
    textEncoder(IV),
  )
  const second = await aesCbcEncrypt(first, reversed, textEncoder(IV))

  return {
    params: bytesToBase64(second),
    encSecKey: bytesToHex(rsaRawEncrypt(secretKey)),
  }
}

/** linuxapi 加密：AES-ECB，输出大写 hex */
export async function linuxapi(
  data: Record<string, unknown>,
): Promise<Record<string, string>> {
  const text = textEncoder(JSON.stringify(data))
  const enc = await aesEcbEncrypt(text, textEncoder(LINUXAPI_KEY))
  return { eparams: bytesToHex(enc).toUpperCase() }
}

// 导出供测试使用
export const __internal = {
  aesCbcEncrypt,
  aesEcbEncrypt,
  rsaRawEncrypt,
  N_HEX,
}
