// 纯 JavaScript 的 MD5 / SHA-1 / SHA-256 流式哈希实现。
//
// 背景：此前种子逻辑使用 hash-wasm 库，该库在运行时通过
// `WebAssembly.compile()` 编译内置的 WASM 二进制。Cloudflare Workers、
// Vercel Edge、EdgeOne 等边缘运行环境可能禁止 Wasm 代码生成，导致：
//   "WebAssembly.compile(): Wasm code generation disallowed by embedder"
//
// 这里提供与 hash-wasm 的 IHasher 接口兼容的纯 JS 实现，与 Go 版
// (crypto/md5、crypto/sha1、crypto/sha256) 输出完全一致，且不依赖 WASM。
// 接口兼容旧调用方式：`init()`、`update(data)`、`digest("hex")`。

export interface IHasher {
  init(): IHasher
  update(data: Uint8Array): IHasher
  digest(outputType?: "hex" | "binary"): string | Uint8Array
}

function rol(x: number, n: number): number {
  return ((x << n) | (x >>> (32 - n))) | 0
}

function rotr(x: number, n: number): number {
  return ((x >>> n) | (x << (32 - n))) | 0
}

function readUint32BE(data: Uint8Array, offset: number): number {
  return (
    (data[offset] << 24) |
    (data[offset + 1] << 16) |
    (data[offset + 2] << 8) |
    data[offset + 3]
  ) >>> 0
}

function readUint32LE(data: Uint8Array, offset: number): number {
  return (
    data[offset] |
    (data[offset + 1] << 8) |
    (data[offset + 2] << 16) |
    (data[offset + 3] << 24)
  ) >>> 0
}

function writeUint32BE(out: Uint8Array, offset: number, value: number): void {
  out[offset] = (value >>> 24) & 0xff
  out[offset + 1] = (value >>> 16) & 0xff
  out[offset + 2] = (value >>> 8) & 0xff
  out[offset + 3] = value & 0xff
}

function writeUint32LE(out: Uint8Array, offset: number, value: number): void {
  out[offset] = value & 0xff
  out[offset + 1] = (value >>> 8) & 0xff
  out[offset + 2] = (value >>> 16) & 0xff
  out[offset + 3] = (value >>> 24) & 0xff
}

function bytesToHex(bytes: Uint8Array): string {
  let hex = ""
  for (let i = 0; i < bytes.length; i++) hex += bytes[i].toString(16).padStart(2, "0")
  return hex
}

function toBytes(data: Uint8Array | string): Uint8Array {
  return typeof data === "string" ? new TextEncoder().encode(data) : data
}

// 计算 64 位比特长度（big-endian 写入），兼容超过 4GB 的输入。
function writeBitLengthBE(out: Uint8Array, offset: number, byteLength: number): void {
  const bitLength = byteLength * 8
  writeUint32BE(out, offset, Math.floor(bitLength / 0x100000000))
  writeUint32BE(out, offset + 4, bitLength >>> 0)
}

// 计算 64 位比特长度（little-endian 写入，MD5 专用）。
function writeBitLengthLE(out: Uint8Array, offset: number, byteLength: number): void {
  const bitLength = byteLength * 8
  writeUint32LE(out, offset, bitLength >>> 0)
  writeUint32LE(out, offset + 4, Math.floor(bitLength / 0x100000000))
}

const MD5_S = [
  7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22,
  5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20,
  4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23,
  6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21,
]

const MD5_K: number[] = []
for (let i = 0; i < 64; i++) {
  MD5_K.push(Math.floor(Math.abs(Math.sin(i + 1)) * 0x100000000))
}

function md5Process(state: Int32Array, block: Uint8Array): void {
  const w = new Array<number>(16)
  for (let i = 0; i < 16; i++) w[i] = readUint32LE(block, i * 4)
  let a = state[0]
  let b = state[1]
  let c = state[2]
  let d = state[3]
  for (let i = 0; i < 64; i++) {
    let f: number
    let g: number
    if (i < 16) {
      f = (b & c) | (~b & d)
      g = i
    } else if (i < 32) {
      f = (d & b) | (~d & c)
      g = (5 * i + 1) % 16
    } else if (i < 48) {
      f = b ^ c ^ d
      g = (3 * i + 5) % 16
    } else {
      f = c ^ (b | ~d)
      g = (7 * i) % 16
    }
    const tmp = (a + f + w[g] + MD5_K[i]) | 0
    a = d
    d = c
    c = b
    b = (b + rol(tmp, MD5_S[i])) | 0
  }
  state[0] = (state[0] + a) | 0
  state[1] = (state[1] + b) | 0
  state[2] = (state[2] + c) | 0
  state[3] = (state[3] + d) | 0
}

class MD5Hasher implements IHasher {
  private readonly state = new Int32Array(4)
  private readonly buffer = new Uint8Array(64)
  private bufferLen = 0
  private totalLen = 0

  constructor() {
    this.init()
  }

  init(): IHasher {
    this.state[0] = 0x67452301
    this.state[1] = 0xefcdab89
    this.state[2] = 0x98badcfe
    this.state[3] = 0x10325476
    this.bufferLen = 0
    this.totalLen = 0
    return this
  }

  update(data: Uint8Array): IHasher {
    this.totalLen += data.length
    let offset = 0
    if (this.bufferLen > 0) {
      const need = 64 - this.bufferLen
      const take = Math.min(need, data.length)
      this.buffer.set(data.subarray(0, take), this.bufferLen)
      this.bufferLen += take
      offset = take
      if (this.bufferLen === 64) {
        md5Process(this.state, this.buffer)
        this.bufferLen = 0
      }
    }
    while (offset + 64 <= data.length) {
      md5Process(this.state, data.subarray(offset, offset + 64))
      offset += 64
    }
    if (offset < data.length) {
      const rest = data.length - offset
      this.buffer.set(data.subarray(offset), 0)
      this.bufferLen = rest
    }
    return this
  }

  private digestBytes(): Uint8Array {
    const buffered = this.bufferLen
    const padLen = buffered + 1 <= 56 ? 56 - buffered - 1 : 56 + 64 - buffered - 1
    const fullLen = buffered + 1 + padLen + 8
    const padded = new Uint8Array(fullLen)
    padded.set(this.buffer.subarray(0, buffered), 0)
    padded[buffered] = 0x80
    writeBitLengthLE(padded, fullLen - 8, this.totalLen)
    const state = new Int32Array(this.state)
    for (let offset = 0; offset < fullLen; offset += 64) {
      md5Process(state, padded.subarray(offset, offset + 64))
    }
    const out = new Uint8Array(16)
    writeUint32LE(out, 0, state[0])
    writeUint32LE(out, 4, state[1])
    writeUint32LE(out, 8, state[2])
    writeUint32LE(out, 12, state[3])
    return out
  }

  digest(outputType: "hex" | "binary" = "hex"): string | Uint8Array {
    const bytes = this.digestBytes()
    return outputType === "binary" ? bytes : bytesToHex(bytes)
  }
}

function sha1Process(state: Int32Array, block: Uint8Array): void {
  const w = new Array<number>(80)
  for (let i = 0; i < 16; i++) w[i] = readUint32BE(block, i * 4)
  for (let i = 16; i < 80; i++) w[i] = rol(w[i - 3] ^ w[i - 8] ^ w[i - 14] ^ w[i - 16], 1)
  let a = state[0]
  let b = state[1]
  let c = state[2]
  let d = state[3]
  let e = state[4]
  for (let i = 0; i < 80; i++) {
    let f: number
    let k: number
    if (i < 20) {
      f = (b & c) | (~b & d)
      k = 0x5a827999
    } else if (i < 40) {
      f = b ^ c ^ d
      k = 0x6ed9eba1
    } else if (i < 60) {
      f = (b & c) | (b & d) | (c & d)
      k = 0x8f1bbcdc
    } else {
      f = b ^ c ^ d
      k = 0xca62c1d6
    }
    const temp = (rol(a, 5) + f + e + k + w[i]) | 0
    e = d
    d = c
    c = rol(b, 30)
    b = a
    a = temp
  }
  state[0] = (state[0] + a) | 0
  state[1] = (state[1] + b) | 0
  state[2] = (state[2] + c) | 0
  state[3] = (state[3] + d) | 0
  state[4] = (state[4] + e) | 0
}

class SHA1Hasher implements IHasher {
  private readonly state = new Int32Array(5)
  private readonly buffer = new Uint8Array(64)
  private bufferLen = 0
  private totalLen = 0

  constructor() {
    this.init()
  }

  init(): IHasher {
    this.state[0] = 0x67452301
    this.state[1] = 0xefcdab89
    this.state[2] = 0x98badcfe
    this.state[3] = 0x10325476
    this.state[4] = 0xc3d2e1f0
    this.bufferLen = 0
    this.totalLen = 0
    return this
  }

  update(data: Uint8Array): IHasher {
    this.totalLen += data.length
    let offset = 0
    if (this.bufferLen > 0) {
      const need = 64 - this.bufferLen
      const take = Math.min(need, data.length)
      this.buffer.set(data.subarray(0, take), this.bufferLen)
      this.bufferLen += take
      offset = take
      if (this.bufferLen === 64) {
        sha1Process(this.state, this.buffer)
        this.bufferLen = 0
      }
    }
    while (offset + 64 <= data.length) {
      sha1Process(this.state, data.subarray(offset, offset + 64))
      offset += 64
    }
    if (offset < data.length) {
      const rest = data.length - offset
      this.buffer.set(data.subarray(offset), 0)
      this.bufferLen = rest
    }
    return this
  }

  private digestBytes(): Uint8Array {
    const buffered = this.bufferLen
    const padLen = buffered + 1 <= 56 ? 56 - buffered - 1 : 56 + 64 - buffered - 1
    const fullLen = buffered + 1 + padLen + 8
    const padded = new Uint8Array(fullLen)
    padded.set(this.buffer.subarray(0, buffered), 0)
    padded[buffered] = 0x80
    writeBitLengthBE(padded, fullLen - 8, this.totalLen)
    const state = new Int32Array(this.state)
    for (let offset = 0; offset < fullLen; offset += 64) {
      sha1Process(state, padded.subarray(offset, offset + 64))
    }
    const out = new Uint8Array(20)
    writeUint32BE(out, 0, state[0])
    writeUint32BE(out, 4, state[1])
    writeUint32BE(out, 8, state[2])
    writeUint32BE(out, 12, state[3])
    writeUint32BE(out, 16, state[4])
    return out
  }

  digest(outputType: "hex" | "binary" = "hex"): string | Uint8Array {
    const bytes = this.digestBytes()
    return outputType === "binary" ? bytes : bytesToHex(bytes)
  }
}

const SHA256_K = [
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]

function sha256Process(state: Int32Array, block: Uint8Array): void {
  const w = new Array<number>(64)
  for (let i = 0; i < 16; i++) w[i] = readUint32BE(block, i * 4)
  for (let i = 16; i < 64; i++) {
    const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3)
    const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10)
    w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0
  }
  let a = state[0]
  let b = state[1]
  let c = state[2]
  let d = state[3]
  let e = state[4]
  let f = state[5]
  let g = state[6]
  let h = state[7]
  for (let i = 0; i < 64; i++) {
    const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25)
    const ch = (e & f) ^ (~e & g)
    const temp1 = (h + S1 + ch + SHA256_K[i] + w[i]) | 0
    const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22)
    const maj = (a & b) ^ (a & c) ^ (b & c)
    const temp2 = (S0 + maj) | 0
    h = g
    g = f
    f = e
    e = (d + temp1) | 0
    d = c
    c = b
    b = a
    a = (temp1 + temp2) | 0
  }
  state[0] = (state[0] + a) | 0
  state[1] = (state[1] + b) | 0
  state[2] = (state[2] + c) | 0
  state[3] = (state[3] + d) | 0
  state[4] = (state[4] + e) | 0
  state[5] = (state[5] + f) | 0
  state[6] = (state[6] + g) | 0
  state[7] = (state[7] + h) | 0
}

class SHA256Hasher implements IHasher {
  private readonly state = new Int32Array(8)
  private readonly buffer = new Uint8Array(64)
  private bufferLen = 0
  private totalLen = 0

  constructor() {
    this.init()
  }

  init(): IHasher {
    this.state[0] = 0x6a09e667
    this.state[1] = 0xbb67ae85
    this.state[2] = 0x3c6ef372
    this.state[3] = 0xa54ff53a
    this.state[4] = 0x510e527f
    this.state[5] = 0x9b05688c
    this.state[6] = 0x1f83d9ab
    this.state[7] = 0x5be0cd19
    this.bufferLen = 0
    this.totalLen = 0
    return this
  }

  update(data: Uint8Array): IHasher {
    this.totalLen += data.length
    let offset = 0
    if (this.bufferLen > 0) {
      const need = 64 - this.bufferLen
      const take = Math.min(need, data.length)
      this.buffer.set(data.subarray(0, take), this.bufferLen)
      this.bufferLen += take
      offset = take
      if (this.bufferLen === 64) {
        sha256Process(this.state, this.buffer)
        this.bufferLen = 0
      }
    }
    while (offset + 64 <= data.length) {
      sha256Process(this.state, data.subarray(offset, offset + 64))
      offset += 64
    }
    if (offset < data.length) {
      const rest = data.length - offset
      this.buffer.set(data.subarray(offset), 0)
      this.bufferLen = rest
    }
    return this
  }

  private digestBytes(): Uint8Array {
    const buffered = this.bufferLen
    const padLen = buffered + 1 <= 56 ? 56 - buffered - 1 : 56 + 64 - buffered - 1
    const fullLen = buffered + 1 + padLen + 8
    const padded = new Uint8Array(fullLen)
    padded.set(this.buffer.subarray(0, buffered), 0)
    padded[buffered] = 0x80
    writeBitLengthBE(padded, fullLen - 8, this.totalLen)
    const state = new Int32Array(this.state)
    for (let offset = 0; offset < fullLen; offset += 64) {
      sha256Process(state, padded.subarray(offset, offset + 64))
    }
    const out = new Uint8Array(32)
    for (let i = 0; i < 8; i++) writeUint32BE(out, i * 4, state[i])
    return out
  }

  digest(outputType: "hex" | "binary" = "hex"): string | Uint8Array {
    const bytes = this.digestBytes()
    return outputType === "binary" ? bytes : bytesToHex(bytes)
  }
}

export function createMD5(): Promise<IHasher> {
  return Promise.resolve(new MD5Hasher())
}

export function createSHA1(): Promise<IHasher> {
  return Promise.resolve(new SHA1Hasher())
}

export function createSHA256(): Promise<IHasher> {
  return Promise.resolve(new SHA256Hasher())
}

export async function md5(data: Uint8Array | string): Promise<string> {
  const hasher = new MD5Hasher()
  hasher.update(toBytes(data))
  return hasher.digest("hex") as string
}

export async function sha1(data: Uint8Array | string): Promise<string> {
  const hasher = new SHA1Hasher()
  hasher.update(toBytes(data))
  return hasher.digest("hex") as string
}

export async function sha256(data: Uint8Array | string): Promise<string> {
  const hasher = new SHA256Hasher()
  hasher.update(toBytes(data))
  return hasher.digest("hex") as string
}
