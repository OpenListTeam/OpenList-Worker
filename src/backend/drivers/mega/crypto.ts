/**
 * MEGA 客户端所需的最小密码学实现。
 *
 * MEGA 全程使用 AES-128：账号密码派生、用户句柄、节点密钥与属性都是
 * AES-128-ECB / AES-128-CBC（无 padding）。Workers 的 WebCrypto 只提供
 * AES-CBC（ECB 需要用零 IV 按块模拟），而且 prepareKey 需要 65536 轮
 * 16 字节 ECB 加密，逐轮 await 的调度开销远大于计算本身，因此这里实现
 * 一个同步的 AES-128 分组加解密，供派生与解密使用；PBKDF2-SHA512（v2
 * 账号）仍然交给原生 WebCrypto。
 */

const SBOX = new Uint8Array([
  0x63, 0x7c, 0x77, 0x7b, 0xf2, 0x6b, 0x6f, 0xc5, 0x30, 0x01, 0x67, 0x2b, 0xfe,
  0xd7, 0xab, 0x76, 0xca, 0x82, 0xc9, 0x7d, 0xfa, 0x59, 0x47, 0xf0, 0xad, 0xd4,
  0xa2, 0xaf, 0x9c, 0xa4, 0x72, 0xc0, 0xb7, 0xfd, 0x93, 0x26, 0x36, 0x3f, 0xf7,
  0xcc, 0x34, 0xa5, 0xe5, 0xf1, 0x71, 0xd8, 0x31, 0x15, 0x04, 0xc7, 0x23, 0xc3,
  0x18, 0x96, 0x05, 0x9a, 0x07, 0x12, 0x80, 0xe2, 0xeb, 0x27, 0xb2, 0x75, 0x09,
  0x83, 0x2c, 0x1a, 0x1b, 0x6e, 0x5a, 0xa0, 0x52, 0x3b, 0xd6, 0xb3, 0x29, 0xe3,
  0x2f, 0x84, 0x53, 0xd1, 0x00, 0xed, 0x20, 0xfc, 0xb1, 0x5b, 0x6a, 0xcb, 0xbe,
  0x39, 0x4a, 0x4c, 0x58, 0xcf, 0xd0, 0xef, 0xaa, 0xfb, 0x43, 0x4d, 0x33, 0x85,
  0x45, 0xf9, 0x02, 0x7f, 0x50, 0x3c, 0x9f, 0xa8, 0x51, 0xa3, 0x40, 0x8f, 0x92,
  0x9d, 0x38, 0xf5, 0xbc, 0xb6, 0xda, 0x21, 0x10, 0xff, 0xf3, 0xd2, 0xcd, 0x0c,
  0x13, 0xec, 0x5f, 0x97, 0x44, 0x17, 0xc4, 0xa7, 0x7e, 0x3d, 0x64, 0x5d, 0x19,
  0x73, 0x60, 0x81, 0x4f, 0xdc, 0x22, 0x2a, 0x90, 0x88, 0x46, 0xee, 0xb8, 0x14,
  0xde, 0x5e, 0x0b, 0xdb, 0xe0, 0x32, 0x3a, 0x0a, 0x49, 0x06, 0x24, 0x5c, 0xc2,
  0xd3, 0xac, 0x62, 0x91, 0x95, 0xe4, 0x79, 0xe7, 0xc8, 0x37, 0x6d, 0x8d, 0xd5,
  0x4e, 0xa9, 0x6c, 0x56, 0xf4, 0xea, 0x65, 0x7a, 0xae, 0x08, 0xba, 0x78, 0x25,
  0x2e, 0x1c, 0xa6, 0xb4, 0xc6, 0xe8, 0xdd, 0x74, 0x1f, 0x4b, 0xbd, 0x8b, 0x8a,
  0x70, 0x3e, 0xb5, 0x66, 0x48, 0x03, 0xf6, 0x0e, 0x61, 0x35, 0x57, 0xb9, 0x86,
  0xc1, 0x1d, 0x9e, 0xe1, 0xf8, 0x98, 0x11, 0x69, 0xd9, 0x8e, 0x94, 0x9b, 0x1e,
  0x87, 0xe9, 0xce, 0x55, 0x28, 0xdf, 0x8c, 0xa1, 0x89, 0x0d, 0xbf, 0xe6, 0x42,
  0x68, 0x41, 0x99, 0x2d, 0x0f, 0xb0, 0x54, 0xbb, 0x16,
])

const INV_SBOX = new Uint8Array(256)
for (let i = 0; i < 256; i++) INV_SBOX[SBOX[i]] = i

const RCON = [0x01, 0x02, 0x04, 0x08, 0x10, 0x20, 0x40, 0x80, 0x1b, 0x36]
const BLOCK = 16

const xtime = (x: number): number => ((x << 1) ^ (x & 0x80 ? 0x1b : 0)) & 0xff

function gmul(a: number, b: number): number {
  let product = 0
  for (let i = 0; i < 8; i++) {
    if (b & 1) product ^= a
    const hi = a & 0x80
    a = (a << 1) & 0xff
    if (hi) a ^= 0x1b
    b >>= 1
  }
  return product
}

const MUL9 = new Uint8Array(256)
const MUL11 = new Uint8Array(256)
const MUL13 = new Uint8Array(256)
const MUL14 = new Uint8Array(256)
for (let i = 0; i < 256; i++) {
  MUL9[i] = gmul(i, 9)
  MUL11[i] = gmul(i, 11)
  MUL13[i] = gmul(i, 13)
  MUL14[i] = gmul(i, 14)
}

/** AES-128 密钥扩展：16 字节密钥 → 11 组轮密钥（176 字节）。 */
function expandKey(key: Uint8Array): Uint8Array {
  if (key.length !== BLOCK) {
    throw new Error("MEGA AES keys must be 128-bit")
  }
  const w = new Uint8Array(176)
  w.set(key)
  let rcon = 0
  for (let i = 16; i < 176; i += 4) {
    let t0 = w[i - 4]
    let t1 = w[i - 3]
    let t2 = w[i - 2]
    let t3 = w[i - 1]
    if (i % 16 === 0) {
      const tmp = t0
      t0 = SBOX[t1] ^ RCON[rcon++]
      t1 = SBOX[t2]
      t2 = SBOX[t3]
      t3 = SBOX[tmp]
    }
    w[i] = w[i - 16] ^ t0
    w[i + 1] = w[i - 15] ^ t1
    w[i + 2] = w[i - 14] ^ t2
    w[i + 3] = w[i - 13] ^ t3
  }
  return w
}

function addRoundKey(s: Uint8Array, roundKeys: Uint8Array, offset: number) {
  for (let i = 0; i < BLOCK; i++) s[i] ^= roundKeys[offset + i]
}

function shiftRows(s: Uint8Array) {
  let t = s[1]
  s[1] = s[5]
  s[5] = s[9]
  s[9] = s[13]
  s[13] = t
  t = s[2]
  s[2] = s[10]
  s[10] = t
  t = s[6]
  s[6] = s[14]
  s[14] = t
  t = s[15]
  s[15] = s[11]
  s[11] = s[7]
  s[7] = s[3]
  s[3] = t
}

function invShiftRows(s: Uint8Array) {
  let t = s[13]
  s[13] = s[9]
  s[9] = s[5]
  s[5] = s[1]
  s[1] = t
  t = s[2]
  s[2] = s[10]
  s[10] = t
  t = s[6]
  s[6] = s[14]
  s[14] = t
  t = s[3]
  s[3] = s[7]
  s[7] = s[11]
  s[11] = s[15]
  s[15] = t
}

function mixColumns(s: Uint8Array) {
  for (let c = 0; c < BLOCK; c += 4) {
    const a0 = s[c]
    const a1 = s[c + 1]
    const a2 = s[c + 2]
    const a3 = s[c + 3]
    s[c] = xtime(a0) ^ (xtime(a1) ^ a1) ^ a2 ^ a3
    s[c + 1] = a0 ^ xtime(a1) ^ (xtime(a2) ^ a2) ^ a3
    s[c + 2] = a0 ^ a1 ^ xtime(a2) ^ (xtime(a3) ^ a3)
    s[c + 3] = xtime(a0) ^ a0 ^ a1 ^ a2 ^ xtime(a3)
  }
}

function invMixColumns(s: Uint8Array) {
  for (let c = 0; c < BLOCK; c += 4) {
    const a0 = s[c]
    const a1 = s[c + 1]
    const a2 = s[c + 2]
    const a3 = s[c + 3]
    s[c] = MUL14[a0] ^ MUL11[a1] ^ MUL13[a2] ^ MUL9[a3]
    s[c + 1] = MUL9[a0] ^ MUL14[a1] ^ MUL11[a2] ^ MUL13[a3]
    s[c + 2] = MUL13[a0] ^ MUL9[a1] ^ MUL14[a2] ^ MUL11[a3]
    s[c + 3] = MUL11[a0] ^ MUL13[a1] ^ MUL9[a2] ^ MUL14[a3]
  }
}

function encryptBlock(
  roundKeys: Uint8Array,
  input: Uint8Array,
  inOffset: number,
  output: Uint8Array,
  outOffset: number,
) {
  const s = new Uint8Array(BLOCK)
  for (let i = 0; i < BLOCK; i++) s[i] = input[inOffset + i]
  addRoundKey(s, roundKeys, 0)
  for (let round = 1; round < 10; round++) {
    for (let i = 0; i < BLOCK; i++) s[i] = SBOX[s[i]]
    shiftRows(s)
    mixColumns(s)
    addRoundKey(s, roundKeys, round * BLOCK)
  }
  for (let i = 0; i < BLOCK; i++) s[i] = SBOX[s[i]]
  shiftRows(s)
  addRoundKey(s, roundKeys, 160)
  for (let i = 0; i < BLOCK; i++) output[outOffset + i] = s[i]
}

function decryptBlock(
  roundKeys: Uint8Array,
  input: Uint8Array,
  inOffset: number,
  output: Uint8Array,
  outOffset: number,
) {
  const s = new Uint8Array(BLOCK)
  for (let i = 0; i < BLOCK; i++) s[i] = input[inOffset + i]
  addRoundKey(s, roundKeys, 160)
  for (let round = 9; round > 0; round--) {
    invShiftRows(s)
    for (let i = 0; i < BLOCK; i++) s[i] = INV_SBOX[s[i]]
    addRoundKey(s, roundKeys, round * BLOCK)
    invMixColumns(s)
  }
  invShiftRows(s)
  for (let i = 0; i < BLOCK; i++) s[i] = INV_SBOX[s[i]]
  addRoundKey(s, roundKeys, 0)
  for (let i = 0; i < BLOCK; i++) output[outOffset + i] = s[i]
}

export function aesEcbEncrypt(key: Uint8Array, data: Uint8Array): Uint8Array {
  if (data.length % BLOCK !== 0) {
    throw new Error("MEGA AES-ECB input must be block aligned")
  }
  const roundKeys = expandKey(key)
  const out = new Uint8Array(data.length)
  for (let i = 0; i < data.length; i += BLOCK) {
    encryptBlock(roundKeys, data, i, out, i)
  }
  return out
}

export function aesEcbDecrypt(key: Uint8Array, data: Uint8Array): Uint8Array {
  if (data.length % BLOCK !== 0) {
    throw new Error("MEGA AES-ECB input must be block aligned")
  }
  const roundKeys = expandKey(key)
  const out = new Uint8Array(data.length)
  for (let i = 0; i < data.length; i += BLOCK) {
    decryptBlock(roundKeys, data, i, out, i)
  }
  return out
}

export function aesCbcDecrypt(
  key: Uint8Array,
  iv: Uint8Array,
  data: Uint8Array,
): Uint8Array {
  if (iv.length !== BLOCK) throw new Error("MEGA AES-CBC IV must be 16 bytes")
  if (data.length % BLOCK !== 0) {
    throw new Error("MEGA AES-CBC input must be block aligned")
  }
  const roundKeys = expandKey(key)
  const out = new Uint8Array(data.length)
  const previous = new Uint8Array(iv)
  const block = new Uint8Array(BLOCK)
  for (let i = 0; i < data.length; i += BLOCK) {
    decryptBlock(roundKeys, data, i, block, 0)
    for (let j = 0; j < BLOCK; j++) out[i + j] = block[j] ^ previous[j]
    previous.set(data.subarray(i, i + BLOCK))
  }
  return out
}

export function aesCbcEncrypt(
  key: Uint8Array,
  iv: Uint8Array,
  data: Uint8Array,
): Uint8Array {
  if (iv.length !== BLOCK) throw new Error("MEGA AES-CBC IV must be 16 bytes")
  if (data.length % BLOCK !== 0) {
    throw new Error("MEGA AES-CBC input must be block aligned")
  }
  const roundKeys = expandKey(key)
  const out = new Uint8Array(data.length)
  const previous = new Uint8Array(iv)
  const block = new Uint8Array(BLOCK)
  for (let i = 0; i < data.length; i += BLOCK) {
    for (let j = 0; j < BLOCK; j++) block[j] = data[i + j] ^ previous[j]
    encryptBlock(roundKeys, block, 0, out, i)
    previous.set(out.subarray(i, i + BLOCK))
  }
  return out
}

export function utf8ToBytes(text: string): Uint8Array {
  return new TextEncoder().encode(text)
}

export function bytesToB64Url(bytes: Uint8Array): string {
  let binary = ""
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}

export function b64ToBytes(text: string): Uint8Array {
  let b64 = text.replace(/-/g, "+").replace(/_/g, "/")
  while (b64.length % 4 !== 0) b64 += "="
  const binary = atob(b64)
  const out = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i)
  return out
}

/** MEGA 账号主密钥常量，prepareKey 以此作为 65536 轮 ECB 的初始状态。 */
const PW_KEY = new Uint8Array([
  0x93, 0xc4, 0x67, 0xe3, 0x7d, 0xb0, 0xc7, 0xa4, 0xd1, 0xbe, 0x3f, 0x81, 0x01,
  0x52, 0xcb, 0x56,
])

/**
 * v1 账号的用户密钥：把密码按 16 字节切块作为 AES 密钥，对固定常量做
 * 65536 轮 AES-128-ECB 加密。这就是 MEGA 客户端 prepare_key 的完整实现，
 * 不能用「返回常量」的简化版代替，否则派生的 uh 永远匹配不上账号。
 *
 * 性能：65536 轮都落在同一把密钥上，因此只做一次密钥扩展并原地加密，
 * 避免每轮重复 expandKey。本地 V8 实测约 45ms。WebCrypto 的 65536 次
 * subtle.encrypt 反而要 ~1.1s（逐次 Promise 与参数校验的开销远大于
 * 16 字节 AES 本身），所以这里保持同步纯 JS 实现。
 */
export function prepareKey(password: string): Uint8Array {
  const pw = utf8ToBytes(password)
  const rounds: Uint8Array[] = []
  for (let j = 0; j < pw.length; j += BLOCK) {
    const key = new Uint8Array(BLOCK)
    key.set(pw.subarray(j, Math.min(j + BLOCK, pw.length)))
    rounds.push(expandKey(key))
  }

  const pkey = PW_KEY.slice()
  for (let round = 0; round < 65536; round++) {
    for (const roundKeys of rounds) {
      encryptBlock(roundKeys, pkey, 0, pkey, 0)
    }
  }
  return pkey
}

/**
 * MEGA 的 stringhash：把字符串折叠成 4 个 32 位大端字，再用用户密钥做
 * 16384 轮 AES-128-ECB，结果 16 字节就是 v1 账号的 uh（base64url 后）。
 */
export function stringhash(value: string, key: Uint8Array): Uint8Array {
  const input = utf8ToBytes(value)
  const words = [0, 0, 0, 0]
  for (let i = 0; i < input.length; i += 4) {
    if (input.length - i < 4) {
      const rest = input.length - i
      let partial = 0
      for (let j = 0; j < rest; j++) partial = (partial << 8) | input[i + j]
      words[(i >> 2) & 3] ^= partial << ((4 - rest) * 8)
    } else {
      words[(i >> 2) & 3] ^=
        (input[i] << 24) |
        (input[i + 1] << 16) |
        (input[i + 2] << 8) |
        input[i + 3]
    }
  }

  let hash: Uint8Array = new Uint8Array(BLOCK)
  for (let i = 0; i < 4; i++) {
    hash[i * 4] = (words[i] >>> 24) & 0xff
    hash[i * 4 + 1] = (words[i] >>> 16) & 0xff
    hash[i * 4 + 2] = (words[i] >>> 8) & 0xff
    hash[i * 4 + 3] = words[i] & 0xff
  }
  for (let i = 0; i < 16384; i++) hash = aesEcbEncrypt(key, hash)
  return hash
}

/** v2 账号：PBKDF2-SHA512(password, salt, 100000) 派生 32 字节。 */
export async function prepareKeyV2(
  password: string,
  salt: Uint8Array,
): Promise<Uint8Array> {
  const subtle = globalThis.crypto?.subtle
  if (!subtle) throw new Error("WebCrypto is unavailable for MEGA login")
  const material = await subtle.importKey(
    "raw",
    utf8ToBytes(password) as BufferSource,
    "PBKDF2",
    false,
    ["deriveBits"],
  )
  const bits = await subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: salt as BufferSource,
      iterations: 100_000,
      hash: "SHA-512",
    },
    material,
    256,
  )
  return new Uint8Array(bits)
}

/**
 * 节点属性解密用的 AES 密钥：MEGA 的节点密钥是 32 字节「密钥 + MAC」，
 * 前 16 字节与后 16 字节异或后才是属性/文件内容真正使用的密钥。
 */
export function nodeCipherKey(nodeKey: Uint8Array): Uint8Array {
  if (nodeKey.length === BLOCK) return nodeKey.slice()
  const key = new Uint8Array(BLOCK)
  for (let i = 0; i < BLOCK; i++) key[i] = nodeKey[i] ^ nodeKey[i + BLOCK]
  return key
}

function bitLength(value: bigint): number {
  let bits = 0
  let v = value
  while (v > 0n) {
    v >>= 1n
    bits++
  }
  return bits
}

function bigIntToBytes(value: bigint): Uint8Array {
  if (value === 0n) return new Uint8Array(0)
  const length = Math.ceil(bitLength(value) / 8)
  const out = new Uint8Array(length)
  let v = value
  for (let i = length - 1; i >= 0; i--) {
    out[i] = Number(v & 0xffn)
    v >>= 8n
  }
  return out
}

/** MEGA 的 MPI 编码：2 字节大端位长 + 大端有效字节。 */
export function encodeMpi(value: bigint): Uint8Array {
  const bytes = bigIntToBytes(value)
  const out = new Uint8Array(2 + bytes.length)
  const bits = bitLength(value)
  out[0] = (bits >>> 8) & 0xff
  out[1] = bits & 0xff
  out.set(bytes, 2)
  return out
}

function readMpi(
  data: Uint8Array,
  offset: number,
): { value: bigint; next: number } {
  if (offset + 2 > data.length) {
    throw new Error("MEGA RSA key is truncated")
  }
  const bits = (data[offset] << 8) | data[offset + 1]
  const length = ((bits + 7) >> 3) + 2
  if (offset + length > data.length) {
    throw new Error("MEGA RSA key is truncated")
  }
  let value = 0n
  for (let i = offset + 2; i < offset + length; i++) {
    value = (value << 8n) | BigInt(data[i])
  }
  return { value, next: offset + length }
}

export interface MegaRsaKey {
  p: bigint
  q: bigint
  d: bigint
  /** p⁻¹ mod q，MEGA 的 privk 第 4 个 MPI。 */
  u: bigint
}

/** 解析解密后的 MEGA privk（p, q, d, u 四个 MPI）。 */
export function decodeMegaPrivateKey(privk: Uint8Array): MegaRsaKey {
  const p = readMpi(privk, 0)
  const q = readMpi(privk, p.next)
  const d = readMpi(privk, q.next)
  const u = readMpi(privk, d.next)
  if (p.value <= 0n || q.value <= 0n || d.value <= 0n) {
    throw new Error("MEGA RSA private key is invalid")
  }
  return { p: p.value, q: q.value, d: d.value, u: u.value }
}

function modPow(base: bigint, exponent: bigint, modulus: bigint): bigint {
  let result = 1n
  let b = base % modulus
  let e = exponent
  while (e > 0n) {
    if (e & 1n) result = (result * b) % modulus
    b = (b * b) % modulus
    e >>= 1n
  }
  return result
}

/**
 * 用 RSA 私钥解密 csid 并取出 sid。csid 是 MPI 编码的密文；明文是
 * 43 字节（其余为 RSA 填充），base64url 后即为会话 sid。
 */
export function decryptSessionId(key: MegaRsaKey, csid: Uint8Array): string {
  const cipher = readMpi(csid, 0).value
  const modulus = key.p * key.q
  const plain = bigIntToBytes(modPow(cipher, key.d, modulus))
  const sid = new Uint8Array(43)
  if (plain.length >= sid.length) {
    sid.set(plain.subarray(0, sid.length))
  } else {
    sid.set(plain, sid.length - plain.length)
  }
  return bytesToB64Url(sid)
}
