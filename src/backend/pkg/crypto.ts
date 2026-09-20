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
//    （`enc:v1:` / `enc:v2:` / `enc:v3:`），读取时只看前缀、完全不依赖当前配置，
//    因此「换算法」「关掉加密」都不会让既有密文变成乱码 —— 旧密文会在本次读取时
//    按旧算法解开，并在下一次写入时按新算法（或明文）重新落盘。
//
// 2. `none` 是默认值：不加密直接落盘。
//
// 3. 三种算法都基于同一把密钥（JWT_SECRET / 持久化的共享密钥）：
//    - v1 aes-256-gcm-pbkdf2  PBKDF2-SHA256(10 万次) 逐字段派生（历史 envelope）
//    - v2 aes-256-gcm         HKDF-SHA256 派生一把 AES key，每次读写只派生一次
//                             （#69 引入的低 CPU 方案；既有部署默认写这种）
//    - v3 aes-256-cbc-hmac    AES-256-CBC + HMAC-SHA256（Encrypt-then-MAC，非 GCM 族）
//
// 4. v3 采用「长度前缀」包裹明文：WebCrypto 的 AES-CBC 在部分运行时（Node 的
//    OpenSSL 后端）会自动做/去 PKCS#7 padding，而 CF Workers/浏览器不会。
//    把真实长度写进密文头部（4 字节大端），解密后只取该长度即可，从而在任何
//    运行时都得到一致结果（多余 padding 与额外整块 padding 都会被忽略）。

export type DbCipher =
  | "none"
  | "aes-256-gcm"
  | "aes-256-gcm-pbkdf2"
  | "aes-256-cbc-hmac"

/** DB_CIPHER 的默认值：不加密（向后兼容「明文落盘」的既有部署） */
export const DEFAULT_DB_CIPHER: DbCipher = "none"

/** 可选算法（文档与错误提示用，顺序即推荐顺序） */
export const DB_CIPHER_VALUES: DbCipher[] = [
  "none",
  "aes-256-gcm",
  "aes-256-gcm-pbkdf2",
  "aes-256-cbc-hmac",
]

/**
 * 别名映射（全部小写、去空白后匹配）。
 *
 * 允许别名是为了让 `DB_CIPHER=AES-256-GCM`、`gcm`、`v2` 这类习惯写法都能工作，
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
}

/** 密文版本号 → 算法 */
const VERSION_CIPHER: Record<number, Exclude<DbCipher, "none">> = {
  1: "aes-256-gcm-pbkdf2",
  2: "aes-256-gcm",
  3: "aes-256-cbc-hmac",
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

async function aesCbcHmacEncrypt(
  data: string,
  secret: string,
): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(16))
  const padded = pkcs7Pad(wrapWithLength(toBytes(data) as Uint8Array))
  const encKey = await deriveSha256AesCbcKey(secret, V3_ENC_INFO)
  const cipherBuf = await crypto.subtle.encrypt(
    { name: "AES-CBC", iv },
    encKey,
    padded as any,
  )
  const cipherBytes = new Uint8Array(cipherBuf)
  const macKey = await hmacSha256RawKey(secret, V3_MAC_INFO)
  const mac = new Uint8Array(
    await crypto.subtle.sign("HMAC", macKey, concatBytes(iv, cipherBytes) as any),
  )
  return `${bytesToHex(iv)}:${bytesToHex(cipherBytes)}:${bytesToHex(mac)}`
}

async function aesCbcHmacDecrypt(
  body: string,
  secret: string,
): Promise<string> {
  const parts = body.split(":")
  if (parts.length !== 3) throw new Error("Invalid encrypted data format")
  const iv = fromHex(parts[0])
  const cipherBytes = fromHex(parts[1])
  const mac = fromHex(parts[2])

  // Encrypt-then-MAC：先验签再解密，避免把未经认证的数据送进解密器。
  const macKey = await hmacSha256RawKey(secret, V3_MAC_INFO)
  const expect = new Uint8Array(
    await crypto.subtle.sign("HMAC", macKey, concatBytes(iv, cipherBytes) as any),
  )
  if (!timingSafeEqual(expect, mac)) {
    throw new Error("Encrypted data failed integrity check (wrong key?)")
  }

  const encKey = await deriveSha256AesCbcKey(secret, V3_ENC_INFO)
  const plain = await crypto.subtle.decrypt(
    { name: "AES-CBC", iv: iv as any },
    encKey,
    cipherBytes as any,
  )
  return new TextDecoder().decode(unwrapWithLength(new Uint8Array(plain)))
}

/**
 * 字段加解密器：把「写入算法」和「共享密钥」绑定成一个对象，供 db.ts 在
 * 一次 save / load 内复用（避免逐字段重复派生密钥）。
 *
 * 关键约定：`encrypt()` 用**写入算法**，`decrypt()` 用**密文前缀**识别算法。
 * 因此历史 v1 密文、#69 写入的 v2 密文、本实现新增的 v3 密文都能读；
 * 而「关掉加密 / 换算法」只影响新写入的内容。
 */
export interface FieldCipher {
  /** 写入时使用的算法（`none` 不会构造本对象） */
  cipher: DbCipher
  /** 按写入算法加密，返回**不含前缀**的密文主体 */
  encrypt(value: string): Promise<string>
  /** 解密（入参是**含前缀**的完整密文），按前缀自动选择算法 */
  decrypt(sealed: string): Promise<string>
}

export async function createFieldCipher(
  cipher: DbCipher,
  secret: string,
): Promise<FieldCipher> {
  // v2 的密钥派生结果在本次读写中共享；纯 v1/v3 数据不会触发这次派生。
  let v2Key: Promise<CryptoKey> | null = null
  const getV2Key = () => (v2Key ||= deriveConfigEncryptionKey(secret))

  return {
    cipher,
    async encrypt(value: string): Promise<string> {
      switch (cipher) {
        case "none":
          return value
        case "aes-256-gcm":
          return await encryptConfigValue(value, await getV2Key())
        case "aes-256-gcm-pbkdf2":
          return await encrypt(value, secret)
        case "aes-256-cbc-hmac":
          return await aesCbcHmacEncrypt(value, secret)
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
          return await aesCbcHmacDecrypt(body, secret)
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
