/**
 * Crypto utilities for OpenList.
 * Uses Web Crypto API (crypto.subtle + crypto.getRandomValues) —
 * compatible with Cloudflare Workers and Node.js 18+.
 * All functions are async.
 *
 * 例外：`chacha20-poly1305` 与 `des/3des` 这两类**WebCrypto 不提供**的算法，
 * 分别由 `./chacha20`（自带 RFC 8439 实现）与 `./legacy-ciphers`（crypto-js）
 * 提供，详见文件末尾的 DB_CIPHER 说明。
 */
import { chacha20Poly1305Open, chacha20Poly1305Seal } from "./chacha20"
import { desCbcDecrypt, desCbcEncrypt } from "./legacy-ciphers"

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

// 仅提示一次的 legacy 弱 KDF 告警标记（M-4）
let legacyKdfWarned = false

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
    if (!legacyKdfWarned) {
      legacyKdfWarned = true
      console.warn(
        "[Crypto] Decrypting legacy weak-KDF format. It will be re-encrypted " +
          "with the current config format on the next save.",
      )
    }
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

// ─── Low-CPU config encryption helpers ──────────────────────────────────────

/**
 * Derive the AES key used by the versioned config-encryption envelope.
 *
 * Config encryption is keyed by JWT_SECRET or by a randomly generated secret
 * persisted during setup. Running a password-strengthening KDF separately for
 * every encrypted field made a single config load exceed the CPU allowance of
 * Cloudflare Workers. HKDF keeps this key independent from other JWT_SECRET
 * uses while allowing all fields in one load or save to reuse one CryptoKey.
 *
 * The legacy PBKDF2 envelope remains supported by decrypt() above. Callers can
 * therefore migrate existing values when they next persist the config.
 */
export async function deriveConfigEncryptionKey(
  secret: string,
): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey(
    "raw",
    toBytes(secret),
    "HKDF",
    false,
    ["deriveKey"],
  )
  return crypto.subtle.deriveKey(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt: toBytes("openlist-config-encryption-v2"),
      info: toBytes("AES-256-GCM"),
    },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  )
}

/** Encrypt one config field with an already-derived AES key. */
export async function encryptConfigValue(
  data: string,
  key: CryptoKey,
): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const cipherBuf = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    toBytes(data),
  )
  return `${hexEncode(iv.buffer)}:${hexEncode(cipherBuf)}`
}

/** Decrypt one config field encrypted by encryptConfigValue(). */
export async function decryptConfigValue(
  encryptedData: string,
  key: CryptoKey,
): Promise<string> {
  const parts = encryptedData.split(":")
  if (parts.length !== 2) {
    throw new Error("Invalid config encrypted data format")
  }
  const iv = fromHex(parts[0])
  const cipherBuf = fromHex(parts[1])
  const plainBuf = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: iv as any },
    key,
    cipherBuf as any,
  )
  return new TextDecoder().decode(plainBuf)
}

/** Generate a random hex string of given length */
export function randomString(length: number): string {
  const bytes = crypto.getRandomValues(new Uint8Array(Math.ceil(length / 2)))
  return hexEncode(bytes.buffer).slice(0, length)
}

/**
 * AES-CBC + PKCS7 encrypt, returns base64.
 * Used by chaoxing login (key = "u2oh6Vu^HWe4_AES", IV = key).
 * Web Crypto supports AES-CBC with 128/192/256-bit keys.
 *
 * NOTE: the standard WebCrypto (Cloudflare Workers, browsers) does NOT apply
 * PKCS#7 padding automatically — non-block-aligned input throws. Node's
 * `crypto.subtle` (undici/webcrypto) DOES auto-pad. To behave identically in
 * both runtimes, we pad manually only outside Node.
 */
export async function aesCbcEncryptBase64(
  plaintext: string,
  key: string,
  iv?: string,
): Promise<string> {
  const keyBytes = toBytes(key)
  const ivBytes = iv ? toBytes(iv) : keyBytes
  const keyMat = await crypto.subtle.importKey(
    "raw",
    keyBytes,
    { name: "AES-CBC" },
    false,
    ["encrypt"],
  )
  const pt = toBytes(plaintext) as Uint8Array
  const isNode =
    typeof process !== "undefined" && process?.release?.name === "node"
  const data = isNode ? pt : pkcs7Pad(pt)
  const cipherBuf = await crypto.subtle.encrypt(
    { name: "AES-CBC", iv: ivBytes as any },
    keyMat,
    data as any,
  )
  const bytes = new Uint8Array(cipherBuf)
  let binary = ""
  for (const b of bytes) binary += String.fromCharCode(b)
  return btoa(binary)
}

// ─── 静态加密算法选择（DB_CIPHER）───────────────────────────────────────────
//
// 设计要点：
//
// 1. **算法由环境变量选择，历史密文由前缀识别**。写入时按所选算法加版本前缀
//    （`enc:v1:` ~ `enc:v6:`），读取时只看前缀、完全不依赖当前配置，
//    因此「换算法」「关掉加密」都不会让既有密文变成乱码 —— 旧密文会在本次读取时
//    按旧算法解开，并在下一次写入时按新算法（或明文）重新落盘。
//
// 2. `none` 是默认值：不加密直接落盘。
//
// 3. 所有算法都基于同一把密钥（JWT_SECRET / 持久化的共享密钥）：
//
//    | 前缀      | DB_CIPHER               | 实现                                     |
//    |-----------|-------------------------|------------------------------------------|
//    | enc:v1:   | aes-256-gcm-pbkdf2      | PBKDF2-SHA256(10 万次) 逐字段派生（历史） |
//    | enc:v2:   | aes-256-gcm             | HKDF-SHA256 派生一把 AES key（#69，推荐）|
//    | enc:v3:   | aes-256-cbc-hmac        | AES-256-CBC + HMAC-SHA256（EtM）          |
//    | enc:v4:   | chacha20-poly1305       | ChaCha20-Poly1305（RFC 8439，纯 JS）      |
//    | enc:v5:   | des-cbc-hmac            | 单 DES-CBC + HMAC-SHA256（仅兼容，不安全）|
//    | enc:v6:   | 3des-cbc-hmac           | 3DES-CBC + HMAC-SHA256（仅兼容，已弃用）  |
//
//    说明：WebCrypto（CF Workers / 浏览器 / Node）**没有** ChaCha20 与 DES/3DES，
//    且本仓库边缘构建会把 `node:crypto` 换成抛错 shim（`scripts/node-shim.mjs`），
//    因此 v4 为自带纯 JS 实现，v5/v6 复用已有依赖 crypto-js（详见 chacha20.ts /
//    legacy-ciphers.ts 中的安全说明）。
//
// 4. v3 采用「长度前缀」包裹明文：WebCrypto 的 AES-CBC 在部分运行时（Node 的
//    OpenSSL 后端）会自动做/去 PKCS#7 padding，而 CF Workers/浏览器不会。
//    把真实长度写进密文头部（4 字节大端），解密后只取该长度即可，从而在任何
//    运行时都得到一致结果（多余 padding 与额外整块 padding 都会被忽略）。
//
// 5. **密钥派生结果在进程内缓存**（见 cachedDerive）：同一 (算法, 密钥) 只派生
//    一次，后续读/写直接复用 —— #69 的「每次操作派生一次」在此进一步降为
//    「每个 isolate 派生一次」。这是纯 memoization，不改变任何密文内容。

export type DbCipher =
  | "none"
  | "aes-256-gcm"
  | "aes-256-gcm-pbkdf2"
  | "aes-256-cbc-hmac"
  | "chacha20-poly1305"
  | "des-cbc-hmac"
  | "3des-cbc-hmac"

/** DB_CIPHER 的默认值：不加密（向后兼容「明文落盘」的既有部署） */
export const DEFAULT_DB_CIPHER: DbCipher = "none"

/** 可选算法（文档与错误提示用，顺序即推荐顺序） */
export const DB_CIPHER_VALUES: DbCipher[] = [
  "none",
  "aes-256-gcm",
  "aes-256-gcm-pbkdf2",
  "aes-256-cbc-hmac",
  "chacha20-poly1305",
  "des-cbc-hmac",
  "3des-cbc-hmac",
]

/**
 * 不推荐用于真实数据的算法（仅兼容/测试用途）。
 *
 * 选用它们时会打印**一次性告警**：DES 有效密钥只有 56-bit（可暴力破解）、
 * 3DES 已被 NIST SP 800-131A 弃用（64-bit 分组 + Sweet32）。实现完整性保护
 * （Encrypt-then-MAC）不代表密钥强度足够。
 */
export const WEAK_DB_CIPHERS: DbCipher[] = ["des-cbc-hmac", "3des-cbc-hmac"]

/**
 * 别名映射（全部小写、去空白后匹配）。
 *
 * 允许别名是为了让 `DB_CIPHER=AES-256-GCM`、`chacha20`、`v4` 这类习惯写法都能工作，
 * 避免用户因为大小写或短名不同而静默退回 `none`（那会让「以为开了加密」的部署
 * 实际明文落盘）。
 */
const DB_CIPHER_ALIASES: Record<string, DbCipher> = {
  none: "none",
  off: "none",
  no: "none",
  plain: "none",
  plaintext: "none",
  "aes-256-gcm": "aes-256-gcm",
  "aes-gcm": "aes-256-gcm",
  aesgcm: "aes-256-gcm",
  "aes-256-gcm-hkdf": "aes-256-gcm",
  "gcm-hkdf": "aes-256-gcm",
  hkdf: "aes-256-gcm",
  gcm: "aes-256-gcm",
  v2: "aes-256-gcm",
  "aes-256-gcm-pbkdf2": "aes-256-gcm-pbkdf2",
  "aes-gcm-pbkdf2": "aes-256-gcm-pbkdf2",
  pbkdf2: "aes-256-gcm-pbkdf2",
  legacy: "aes-256-gcm-pbkdf2",
  v1: "aes-256-gcm-pbkdf2",
  "aes-256-cbc-hmac": "aes-256-cbc-hmac",
  "aes-cbc-hmac": "aes-256-cbc-hmac",
  "cbc-hmac": "aes-256-cbc-hmac",
  "aes-256-cbc": "aes-256-cbc-hmac",
  cbc: "aes-256-cbc-hmac",
  v3: "aes-256-cbc-hmac",
  "chacha20-poly1305": "chacha20-poly1305",
  chacha20: "chacha20-poly1305",
  chacha: "chacha20-poly1305",
  "chacha20-ietf-poly1305": "chacha20-poly1305",
  "aead-chacha20": "chacha20-poly1305",
  v4: "chacha20-poly1305",
  "des-cbc-hmac": "des-cbc-hmac",
  "des-cbc": "des-cbc-hmac",
  des: "des-cbc-hmac",
  v5: "des-cbc-hmac",
  "3des-cbc-hmac": "3des-cbc-hmac",
  "3des-cbc": "3des-cbc-hmac",
  "3des": "3des-cbc-hmac",
  des3: "3des-cbc-hmac",
  tripledes: "3des-cbc-hmac",
  "triple-des": "3des-cbc-hmac",
  v6: "3des-cbc-hmac",
}

/**
 * 解析 DB_CIPHER 取值。
 *
 * @returns `known=false` 表示取值无法识别（调用方应告警，但仍拿到安全默认值 `none`，
 *          绝不因为拼错变量而悄悄启用一把谁也不知道的算法）
 */
export function resolveDbCipher(raw: unknown): {
  cipher: DbCipher
  known: boolean
} {
  const key = String(raw ?? "")
    .trim()
    .toLowerCase()
  if (!key) return { cipher: DEFAULT_DB_CIPHER, known: true }
  const hit = DB_CIPHER_ALIASES[key]
  if (hit) return { cipher: hit, known: true }
  return { cipher: DEFAULT_DB_CIPHER, known: false }
}

/** 算法 → 密文版本号（前缀中的数字） */
const CIPHER_VERSION: Record<Exclude<DbCipher, "none">, number> = {
  "aes-256-gcm-pbkdf2": 1,
  "aes-256-gcm": 2,
  "aes-256-cbc-hmac": 3,
  "chacha20-poly1305": 4,
  "des-cbc-hmac": 5,
  "3des-cbc-hmac": 6,
}

/** 密文版本号 → 算法 */
const VERSION_CIPHER: Record<number, Exclude<DbCipher, "none">> = {
  1: "aes-256-gcm-pbkdf2",
  2: "aes-256-gcm",
  3: "aes-256-cbc-hmac",
  4: "chacha20-poly1305",
  5: "des-cbc-hmac",
  6: "3des-cbc-hmac",
}

/** 密文前缀正则：`enc:v<数字>:` */
const CIPHER_PREFIX_RE = /^enc:v(\d+):/

/** 算法对应的密文前缀（`none` 无前缀） */
export function cipherPrefix(cipher: DbCipher): string {
  if (cipher === "none") return ""
  return `enc:v${CIPHER_VERSION[cipher]}:`
}

/**
 * 识别密文前缀。**只看前缀，不看当前配置** —— 这是「换算法/关加密不丢数据」的关键。
 *
 * @returns 命中的算法与前缀（调用方用 `prefix.length` 切出密文主体）；明文返回 null
 */
export function detectCipherPrefix(
  value: unknown,
): { cipher: Exclude<DbCipher, "none">; prefix: string } | null {
  if (typeof value !== "string") return null
  const m = CIPHER_PREFIX_RE.exec(value)
  if (!m) return null
  const cipher = VERSION_CIPHER[Number(m[1])]
  if (!cipher) return null
  return { cipher, prefix: m[0] }
}

/** 该值是否为本模块产生的密文（任意版本） */
export function isSealedCiphertext(value: unknown): boolean {
  return detectCipherPrefix(value) !== null
}

// ── v3：AES-256-CBC + HMAC-SHA256（Encrypt-then-MAC）────────────────────────

const V3_ENC_INFO = "openlist-db-cipher-v3-enc"
const V3_MAC_INFO = "openlist-db-cipher-v3-mac"

function bytesToHex(bytes: Uint8Array): string {
  let out = ""
  for (const b of bytes) out += b.toString(16).padStart(2, "0")
  return out
}

function concatBytes(a: Uint8Array, b: Uint8Array): Uint8Array {
  const out = new Uint8Array(a.length + b.length)
  out.set(a, 0)
  out.set(b, a.length)
  return out
}

/** 定长（时间无关）比较：用于校验 HMAC，避免比较短路泄露信息。 */
function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i]
  return diff === 0
}

function utf8Bytes(text: string): Uint8Array {
  return new TextEncoder().encode(text)
}

// ── 密钥派生缓存（性能：每次读/写不再重复派生）────────────────────────────
//
// #69 已经把「逐字段派生」降为「每次 save/load 派生一次」；这里再进一步：
// 同一 (算法, 密钥) 在**进程/isolate 内只派生一次**，后续所有读写直接复用。
//
// 为什么安全：`cachedDerive` 是纯 memoization —— 输入相同则输出必然相同，
// 不改变任何密文/明文，也不改变密钥来源与优先级；缓存键包含密钥本身，
// 因此密钥轮换（或 env 变更）会自动 miss 并生成新条目。
//
// 容量：只保留最近 KEY_CACHE_LIMIT 条（正常情况下 1~2 条），密钥轮换时
// 旧的派生结果被淘汰，内存不会无限增长。

const KEY_CACHE_LIMIT = 8
const keyDerivationCache = new Map<string, unknown>()

async function cachedDerive<T>(
  id: string,
  secret: string,
  factory: () => Promise<T>,
): Promise<T> {
  const cacheId = `${id}\u0000${secret}`
  if (keyDerivationCache.has(cacheId)) {
    return keyDerivationCache.get(cacheId) as T
  }
  // 先 await 再入缓存：派生失败（如 WebCrypto 异常）不会被缓存，
  // 避免一次瞬时故障被固化成「该密钥永久不可用」。
  const value = await factory()
  if (keyDerivationCache.size >= KEY_CACHE_LIMIT) {
    const oldest = keyDerivationCache.keys().next().value
    if (oldest !== undefined) keyDerivationCache.delete(oldest)
  }
  keyDerivationCache.set(cacheId, value)
  return value
}

/** 仅供测试：清空密钥派生缓存（与 db.ts 的 __resetDbCacheForTest 联动）。 */
export function __resetCipherKeyCacheForTest(): void {
  keyDerivationCache.clear()
  weakCipherWarned = false
}

/** 单次告警：选用了弱算法（DES/3DES） */
let weakCipherWarned = false

/** SHA-256 摘要（字节） */
async function sha256Bytes(input: string | Uint8Array): Promise<Uint8Array> {
  const buf = await crypto.subtle.digest("SHA-256", toBytes(input))
  return new Uint8Array(buf)
}

/**
 * 由共享密钥派生 `length` 字节的密钥材料（SHA-256）。
 *
 * 前提：共享密钥本身足够随机（`openssl rand -hex 32` 或 setup 生成的 64 位 hex）。
 * 因此这里不做 KDF 拉伸（PBKDF2 的 10 万次迭代代价太高，见 v1 的历史包袱）；
 * 若密钥是低熵口令，请使用 `aes-256-gcm-pbkdf2`。
 */
async function deriveKeyBytes(
  secret: string,
  info: string,
  length: number,
): Promise<Uint8Array> {
  const digest = await sha256Bytes(`${info}|${secret}`)
  return digest.slice(0, length)
}

/** 导入 HMAC-SHA256 签名密钥 */
async function importHmacKey(bytes: Uint8Array): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    bytes as any,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  )
}

/** HMAC-SHA256 签名（返回 32 字节） */
async function hmacSha256Sign(
  key: CryptoKey,
  data: Uint8Array,
): Promise<Uint8Array> {
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, data as any))
}

/** 明文包裹：4 字节大端长度 + 原文（用于解密后精确切出原文，见上方说明 4） */
function wrapWithLength(bytes: Uint8Array): Uint8Array {
  const head = new Uint8Array(4)
  new DataView(head.buffer).setUint32(0, bytes.length, false)
  return concatBytes(head, bytes)
}

function unwrapWithLength(bytes: Uint8Array): Uint8Array {
  if (bytes.length < 4) throw new Error("Invalid encrypted data format")
  const len = new DataView(bytes.buffer, bytes.byteOffset, 4).getUint32(0, false)
  if (len > bytes.length - 4) throw new Error("Invalid encrypted data length")
  return bytes.slice(4, 4 + len)
}

/** SHA-256 派生一把 AES-CBC 密钥（v3 用；与 encrypt/decrypt 的 PBKDF2 无关） */
async function deriveSha256AesCbcKey(secret: string, info: string) {
  const digest = await crypto.subtle.digest("SHA-256", toBytes(`${info}|${secret}`))
  return crypto.subtle.importKey("raw", digest, { name: "AES-CBC" }, false, [
    "encrypt",
    "decrypt",
  ])
}

async function hmacSha256RawKey(secret: string, info: string): Promise<CryptoKey> {
  const digest = await crypto.subtle.digest("SHA-256", toBytes(`${info}|${secret}`))
  return crypto.subtle.importKey(
    "raw",
    digest,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  )
}

interface V3Keys {
  enc: CryptoKey
  mac: CryptoKey
}

async function aesCbcHmacEncrypt(
  data: string,
  keys: V3Keys,
): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(16))
  const padded = pkcs7Pad(wrapWithLength(utf8Bytes(data)))
  const cipherBuf = await crypto.subtle.encrypt(
    { name: "AES-CBC", iv },
    keys.enc,
    padded as any,
  )
  const cipherBytes = new Uint8Array(cipherBuf)
  const mac = await hmacSha256Sign(keys.mac, concatBytes(iv, cipherBytes))
  return `${bytesToHex(iv)}:${bytesToHex(cipherBytes)}:${bytesToHex(mac)}`
}

async function aesCbcHmacDecrypt(body: string, keys: V3Keys): Promise<string> {
  const parts = body.split(":")
  if (parts.length !== 3) throw new Error("Invalid encrypted data format")
  const iv = fromHex(parts[0])
  const cipherBytes = fromHex(parts[1])
  const mac = fromHex(parts[2])

  // Encrypt-then-MAC：先验签再解密，避免把未经认证的数据送进解密器。
  const expect = await hmacSha256Sign(keys.mac, concatBytes(iv, cipherBytes))
  if (!timingSafeEqual(expect, mac)) {
    throw new Error("Encrypted data failed integrity check (wrong key?)")
  }

  const plain = await crypto.subtle.decrypt(
    { name: "AES-CBC", iv: iv as any },
    keys.enc,
    cipherBytes as any,
  )
  return new TextDecoder().decode(unwrapWithLength(new Uint8Array(plain)))
}

// ── v4：ChaCha20-Poly1305（RFC 8439，纯 JS）─────────────────────────────────
//
// WebCrypto 不提供 ChaCha20，故使用自带的 `chacha20.ts`。布局：
//   `<nonceHex(12B)>:<cipherHex>:<tagHex(16B)>`
// 其中 key = 32 字节派生材料。AEAD 自带完整性校验（Poly1305），无需额外 HMAC。

const V4_INFO = "openlist-db-cipher-v4-chacha20"

async function chachaEncrypt(data: string, key: Uint8Array): Promise<string> {
  const nonce = crypto.getRandomValues(new Uint8Array(12))
  const { ciphertext, tag } = chacha20Poly1305Seal(key, nonce, utf8Bytes(data))
  return `${bytesToHex(nonce)}:${bytesToHex(ciphertext)}:${bytesToHex(tag)}`
}

async function chachaDecrypt(body: string, key: Uint8Array): Promise<string> {
  const parts = body.split(":")
  if (parts.length !== 3) throw new Error("Invalid encrypted data format")
  const nonce = fromHex(parts[0])
  const ciphertext = fromHex(parts[1])
  const tag = fromHex(parts[2])
  return new TextDecoder().decode(
    chacha20Poly1305Open(key, nonce, ciphertext, tag),
  )
}

// ── v5/v6：DES / 3DES-CBC + HMAC-SHA256（Encrypt-then-MAC）──────────────────
//
// WebCrypto 不提供 DES/3DES，故使用 crypto-js（项目已有依赖，见 legacy-ciphers.ts）。
// 布局：`<ivHex(8B)>:<cipherHex>:<macHex(32B)>`，MAC 覆盖 iv‖cipher。
// 注意 DES/3DES 仅作兼容用途，强度不足（见 legacy-ciphers.ts 的安全说明）。

const V5_INFO = "openlist-db-cipher-v5-des"
const V6_INFO = "openlist-db-cipher-v6-3des"
/**
 * DES/3DES 的 MAC 密钥域（与加密密钥分离，且两种算法之间也分离 ——
 * 避免「同一把密钥同时用于加密与认证」以及跨算法复用）。
 */
const V5_MAC_INFO = "openlist-db-cipher-v5-des-mac"
const V6_MAC_INFO = "openlist-db-cipher-v6-3des-mac"

async function desCbcHmacEncrypt(
  data: string,
  keyBytes: Uint8Array,
  macKey: CryptoKey,
): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(8))
  const cipherBytes = desCbcEncrypt(utf8Bytes(data), keyBytes, iv)
  const mac = await hmacSha256Sign(macKey, concatBytes(iv, cipherBytes))
  return `${bytesToHex(iv)}:${bytesToHex(cipherBytes)}:${bytesToHex(mac)}`
}

async function desCbcHmacDecrypt(
  body: string,
  keyBytes: Uint8Array,
  macKey: CryptoKey,
): Promise<string> {
  const parts = body.split(":")
  if (parts.length !== 3) throw new Error("Invalid encrypted data format")
  const iv = fromHex(parts[0])
  const cipherBytes = fromHex(parts[1])
  const mac = fromHex(parts[2])

  const expect = await hmacSha256Sign(macKey, concatBytes(iv, cipherBytes))
  if (!timingSafeEqual(expect, mac)) {
    throw new Error("Encrypted data failed integrity check (wrong key?)")
  }
  return new TextDecoder().decode(desCbcDecrypt(cipherBytes, keyBytes, iv))
}

/**
 * 字段加解密器：把「写入算法」和「共享密钥」绑定成一个对象，供 db.ts 在
 * 一次 save / load 内复用（密钥派生结果进一步在进程内缓存，见 cachedDerive）。
 *
 * 关键约定：`encrypt()` 用**写入算法**，`decrypt()` 用**密文前缀**识别算法。
 * 因此历史 v1 密文、#69 写入的 v2 密文、以及本实现新增的 v3/v4/v5/v6 密文都能读；
 * 而「关掉加密 / 换算法」只影响新写入的内容。
 */
export interface FieldCipher {
  /** 写入时使用的算法（`none` 不会构造本对象） */
  cipher: DbCipher
  /**
   * 「算法 + 密钥」指纹（不含密钥本身，16 位 hex）。
   *
   * 用途：db.ts 的「未变化字段跳过重新加密」缓存靠它判断缓存条目是否仍然有效 ——
   * 只要算法或密钥变了，指纹就变，缓存必然失效，绝不会把旧密钥/旧算法的密文
   * 当成新配置下的结果写回去。
   */
  fingerprint: string
  /** 按写入算法加密，返回**不含前缀**的密文主体 */
  encrypt(value: string): Promise<string>
  /** 解密（入参是**含前缀**的完整密文），按前缀自动选择算法 */
  decrypt(sealed: string): Promise<string>
}

export async function createFieldCipher(
  cipher: DbCipher,
  secret: string,
): Promise<FieldCipher> {
  // 弱算法（DES/3DES）只提示一次：它们是兼容手段，不是安全选择。
  if (cipher !== "none" && WEAK_DB_CIPHERS.includes(cipher) && !weakCipherWarned) {
    weakCipherWarned = true
    console.warn(
      `[Crypto] DB_CIPHER=${cipher} is for compatibility only: single DES ` +
        "(56-bit) is brute-forceable and 3DES is deprecated (NIST SP 800-131A). " +
        "Use aes-256-gcm or chacha20-poly1305 for real data.",
    )
  }

  const fingerprint =
    cipher === "none"
      ? "none"
      : await cachedDerive(`fp:${cipher}`, secret, async () => {
          const digest = await sha256Bytes(
            `openlist-db-cipher-fp|${cipher}|${secret}`,
          )
          return bytesToHex(digest).slice(0, 16)
        })

  // 各算法的密钥材料：**派生结果在进程内缓存**，同一次/后续读写都只派生一次。
  const getV2Key = () =>
    cachedDerive("v2", secret, () => deriveConfigEncryptionKey(secret))
  const getV3Keys = () =>
    cachedDerive(
      "v3",
      secret,
      async (): Promise<V3Keys> => ({
        enc: await deriveSha256AesCbcKey(secret, V3_ENC_INFO),
        mac: await hmacSha256RawKey(secret, V3_MAC_INFO),
      }),
    )
  const getV4Key = () =>
    cachedDerive("v4", secret, () => deriveKeyBytes(secret, V4_INFO, 32))
  const getV5Key = () =>
    cachedDerive("v5", secret, () => deriveKeyBytes(secret, V5_INFO, 8))
  const getV6Key = () =>
    cachedDerive("v6", secret, () => deriveKeyBytes(secret, V6_INFO, 24))
  const getV5MacKey = () =>
    cachedDerive("v5-mac", secret, async () =>
      importHmacKey(await deriveKeyBytes(secret, V5_MAC_INFO, 32)),
    )
  const getV6MacKey = () =>
    cachedDerive("v6-mac", secret, async () =>
      importHmacKey(await deriveKeyBytes(secret, V6_MAC_INFO, 32)),
    )

  return {
    cipher,
    fingerprint,
    async encrypt(value: string): Promise<string> {
      switch (cipher) {
        case "none":
          return value
        case "aes-256-gcm":
          return await encryptConfigValue(value, await getV2Key())
        case "aes-256-gcm-pbkdf2":
          return await encrypt(value, secret)
        case "aes-256-cbc-hmac":
          return await aesCbcHmacEncrypt(value, await getV3Keys())
        case "chacha20-poly1305":
          return await chachaEncrypt(value, await getV4Key())
        case "des-cbc-hmac":
          return await desCbcHmacEncrypt(
            value,
            await getV5Key(),
            await getV5MacKey(),
          )
        case "3des-cbc-hmac":
          return await desCbcHmacEncrypt(
            value,
            await getV6Key(),
            await getV6MacKey(),
          )
        default:
          throw new Error(`Unsupported DB_CIPHER: ${String(cipher)}`)
      }
    },
    async decrypt(sealed: string): Promise<string> {
      const hit = detectCipherPrefix(sealed)
      if (!hit) return sealed
      const body = sealed.slice(hit.prefix.length)
      switch (hit.cipher) {
        case "aes-256-gcm":
          return await decryptConfigValue(body, await getV2Key())
        case "aes-256-gcm-pbkdf2":
          return await decrypt(body, secret)
        case "aes-256-cbc-hmac":
          return await aesCbcHmacDecrypt(body, await getV3Keys())
        case "chacha20-poly1305":
          return await chachaDecrypt(body, await getV4Key())
        case "des-cbc-hmac":
          return await desCbcHmacDecrypt(
            body,
            await getV5Key(),
            await getV5MacKey(),
          )
        case "3des-cbc-hmac":
          return await desCbcHmacDecrypt(
            body,
            await getV6Key(),
            await getV6MacKey(),
          )
        default:
          throw new Error(`Unsupported ciphertext: ${String(hit.cipher)}`)
      }
    },
  }
}

/** PKCS#7 padding for AES-CBC (block size 16). */
function pkcs7Pad(pt: Uint8Array, blockSize = 16): Uint8Array {
  const padLen = blockSize - (pt.length % blockSize)
  const padded = new Uint8Array(pt.length + padLen)
  padded.set(pt)
  padded.fill(padLen, pt.length)
  return padded
}
