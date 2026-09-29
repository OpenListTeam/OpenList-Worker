/**
 * ChaCha20-Poly1305（RFC 8439）纯 JS 实现。
 *
 * 为什么需要自带实现：
 *   - WebCrypto（CF Workers / 浏览器 / Node 的 `crypto.subtle`）**不提供 ChaCha20**；
 *   - 本仓库的边缘构建（`scripts/node-shim.mjs`）会把 `node:crypto` 替换成抛错 shim，
 *     因此也不能依赖 Node 的原生 `chacha20-poly1305`。
 *
 * 实现要点：
 *   - ChaCha20：20 轮（10 次 double-round），32 位字运算；AEAD 中 nonce 为 12 字节，
 *     counter 从 0 开始（block 0 用于派生 Poly1305 一次性密钥，密文从 counter=1 开始）。
 *   - Poly1305：使用 BigInt 做 130 位模运算（字段很短，几十~几百字节，
 *     BigInt 的实现简洁且足够快；密码学正确性优先于极限性能）。
 *   - 认证标签按 RFC 8439 §2.8 计算：aad ‖ pad16 ‖ ciphertext ‖ pad16 ‖ len(aad) ‖ len(ct)。
 *   - 校验标签使用**定长比较**，避免早退泄露信息。
 *
 * 正确性验证：`cipher_algorithms.test.ts` 使用 RFC 8439 官方测试向量，
 * 并与 Node 原生 `chacha20-poly1305` 交叉比对。
 */

const CHACHA_BLOCK = 64
const TAG_LEN = 16
/** RFC 8439 的模数：2^130 - 5 */
const POLY_P = (1n << 130n) - 5n
/** r 的 clamp 掩码（RFC 8439 §2.5） */
const POLY_R_MASK = 0x0ffffffc0ffffffc0ffffffc0fffffffn

function rotl(v: number, c: number): number {
  return ((v << c) | (v >>> (32 - c))) >>> 0
}

function quarterRound(
  s: Uint32Array,
  a: number,
  b: number,
  c: number,
  d: number,
): void {
  s[a] = (s[a] + s[b]) >>> 0
  s[d] = rotl(s[d] ^ s[a], 16)
  s[c] = (s[c] + s[d]) >>> 0
  s[b] = rotl(s[b] ^ s[c], 12)
  s[a] = (s[a] + s[b]) >>> 0
  s[d] = rotl(s[d] ^ s[a], 8)
  s[c] = (s[c] + s[d]) >>> 0
  s[b] = rotl(s[b] ^ s[c], 7)
}

function readU32LE(bytes: Uint8Array, offset: number): number {
  return (
    (bytes[offset] |
      (bytes[offset + 1] << 8) |
      (bytes[offset + 2] << 16) |
      (bytes[offset + 3] << 24)) >>>
    0
  )
}

/** 生成一个 64 字节 ChaCha20 密钥流块（写入 out） */
function chacha20Block(
  key: Uint32Array,
  counter: number,
  nonce: Uint32Array,
  out: Uint8Array,
): void {
  const st = new Uint32Array(16)
  st[0] = 0x61707865
  st[1] = 0x3320646e
  st[2] = 0x79622d32
  st[3] = 0x6b206574
  st[4] = key[0]
  st[5] = key[1]
  st[6] = key[2]
  st[7] = key[3]
  st[8] = key[4]
  st[9] = key[5]
  st[10] = key[6]
  st[11] = key[7]
  st[12] = counter >>> 0
  st[13] = nonce[0]
  st[14] = nonce[1]
  st[15] = nonce[2]

  const w = st.slice()
  for (let i = 0; i < 10; i++) {
    quarterRound(w, 0, 4, 8, 12)
    quarterRound(w, 1, 5, 9, 13)
    quarterRound(w, 2, 6, 10, 14)
    quarterRound(w, 3, 7, 11, 15)
    quarterRound(w, 0, 5, 10, 15)
    quarterRound(w, 1, 6, 11, 12)
    quarterRound(w, 2, 7, 8, 13)
    quarterRound(w, 3, 4, 9, 14)
  }
  for (let i = 0; i < 16; i++) {
    const v = (w[i] + st[i]) >>> 0
    out[i * 4] = v & 0xff
    out[i * 4 + 1] = (v >>> 8) & 0xff
    out[i * 4 + 2] = (v >>> 16) & 0xff
    out[i * 4 + 3] = (v >>> 24) & 0xff
  }
}

function keyToWords(key: Uint8Array): Uint32Array {
  if (key.length !== 32) throw new Error("ChaCha20 key must be 32 bytes")
  const words = new Uint32Array(8)
  for (let i = 0; i < 8; i++) words[i] = readU32LE(key, i * 4)
  return words
}

function nonceToWords(nonce: Uint8Array): Uint32Array {
  if (nonce.length !== 12) throw new Error("ChaCha20 nonce must be 12 bytes")
  return new Uint32Array([
    readU32LE(nonce, 0),
    readU32LE(nonce, 4),
    readU32LE(nonce, 8),
  ])
}

/**
 * ChaCha20 加/解密（XOR 密钥流，对称操作）。
 *
 * @param counter 起始块计数（AEAD 用 1；原始流从 0 开始）
 */
export function chacha20Xor(
  key: Uint8Array,
  nonce: Uint8Array,
  data: Uint8Array,
  counter = 1,
): Uint8Array {
  const keyWords = keyToWords(key)
  const nonceWords = nonceToWords(nonce)
  const out = new Uint8Array(data.length)
  const block = new Uint8Array(CHACHA_BLOCK)
  for (let off = 0; off < data.length; off += CHACHA_BLOCK) {
    chacha20Block(keyWords, counter++, nonceWords, block)
    const n = Math.min(CHACHA_BLOCK, data.length - off)
    for (let i = 0; i < n; i++) out[off + i] = data[off + i] ^ block[i]
  }
  return out
}

function leToBigInt(bytes: Uint8Array): bigint {
  let acc = 0n
  for (let i = bytes.length - 1; i >= 0; i--) acc = (acc << 8n) | BigInt(bytes[i])
  return acc
}

function bigIntToLe(value: bigint, length: number): Uint8Array {
  const out = new Uint8Array(length)
  let v = value
  for (let i = 0; i < length; i++) {
    out[i] = Number(v & 0xffn)
    v >>= 8n
  }
  return out
}

/** Poly1305 一次性认证（msg 无需自行填充，本函数按 16 字节分块） */
export function poly1305(msg: Uint8Array, oneTimeKey: Uint8Array): Uint8Array {
  if (oneTimeKey.length !== 32) {
    throw new Error("Poly1305 one-time key must be 32 bytes")
  }
  const r = leToBigInt(oneTimeKey.subarray(0, 16)) & POLY_R_MASK
  const s = leToBigInt(oneTimeKey.subarray(16, 32))

  let acc = 0n
  for (let i = 0; i < msg.length; i += 16) {
    const chunk = msg.subarray(i, Math.min(i + 16, msg.length))
    // 每个分块最高位补 1（RFC 8439 §2.5.1）
    const n = leToBigInt(chunk) | (1n << BigInt(chunk.length * 8))
    acc = ((acc + n) * r) % POLY_P
  }
  acc = (acc + s) & ((1n << 128n) - 1n)
  return bigIntToLe(acc, TAG_LEN)
}

/** aad/ciphertext 的 16 字节对齐填充 */
function pad16(bytes: Uint8Array): Uint8Array {
  const rem = bytes.length % 16
  if (rem === 0) return new Uint8Array(0)
  return new Uint8Array(16 - rem)
}

function leU64(value: number): Uint8Array {
  const out = new Uint8Array(8)
  let v = BigInt(value)
  for (let i = 0; i < 8; i++) {
    out[i] = Number(v & 0xffn)
    v >>= 8n
  }
  return out
}

function concat(parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((n, p) => n + p.length, 0)
  const out = new Uint8Array(total)
  let off = 0
  for (const p of parts) {
    out.set(p, off)
    off += p.length
  }
  return out
}

/** RFC 8439 §2.8：构造 Poly1305 的认证输入（AAD 可为空） */
function macData(ciphertext: Uint8Array, aad: Uint8Array): Uint8Array {
  return concat([aad, pad16(aad), ciphertext, pad16(ciphertext), leU64(aad.length), leU64(ciphertext.length)])
}

/** 由 ChaCha20 block 0 的前 32 字节派生 Poly1305 一次性密钥 */
function polyKey(key: Uint8Array, nonce: Uint8Array): Uint8Array {
  const block0 = new Uint8Array(CHACHA_BLOCK)
  chacha20Block(keyToWords(key), 0, nonceToWords(nonce), block0)
  return block0.subarray(0, 32)
}

/** AEAD 加密：返回密文与 16 字节认证标签 */
export function chacha20Poly1305Seal(
  key: Uint8Array,
  nonce: Uint8Array,
  plaintext: Uint8Array,
  aad: Uint8Array = new Uint8Array(0),
): { ciphertext: Uint8Array; tag: Uint8Array } {
  const ciphertext = chacha20Xor(key, nonce, plaintext, 1)
  const tag = poly1305(macData(ciphertext, aad), polyKey(key, nonce))
  return { ciphertext, tag }
}

/** AEAD 解密：标签不匹配时抛错（不返回任何明文） */
export function chacha20Poly1305Open(
  key: Uint8Array,
  nonce: Uint8Array,
  ciphertext: Uint8Array,
  tag: Uint8Array,
  aad: Uint8Array = new Uint8Array(0),
): Uint8Array {
  if (tag.length !== TAG_LEN) throw new Error("Invalid Poly1305 tag length")
  const expect = poly1305(macData(ciphertext, aad), polyKey(key, nonce))
  if (!timingSafeEqual(expect, tag)) {
    throw new Error(
      "ChaCha20-Poly1305 authentication failed (wrong key or tampered data)",
    )
  }
  return chacha20Xor(key, nonce, ciphertext, 1)
}

/** 定长比较（不早退） */
export function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i]
  return diff === 0
}
