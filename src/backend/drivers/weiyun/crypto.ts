// Pure TypeScript cryptographic helpers for Tencent Weiyun
// 100% compatible with Cloudflare Workers (V8 Isolates), EdgeOne, and Node.js.

export function getHash33(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash += (hash << 5) + str.charCodeAt(i)
  }
  return String(0x7fffffff & hash)
}

export function randomT(): string {
  return Math.random().toFixed(16)
}

function rotl(n: number, s: number): number {
  return (n << s) | (n >>> (32 - s))
}

export class IncrementalSha1 {
  private h0 = 0x67452301
  private h1 = 0xefcdab89
  private h2 = 0x98badcfe
  private h3 = 0x10325476
  private h4 = 0xc3d2e1f0

  private block = new Uint8Array(64)
  private blockLen = 0
  private totalBytes = 0
  private w = new Int32Array(80)

  update(data: Uint8Array | Buffer): this {
    const len = data.length
    this.totalBytes += len

    let offset = 0
    while (offset < len) {
      const needed = 64 - this.blockLen
      const toCopy = Math.min(needed, len - offset)
      this.block.set(data.subarray(offset, offset + toCopy), this.blockLen)
      this.blockLen += toCopy
      offset += toCopy

      if (this.blockLen === 64) {
        this.processBlock(this.block)
        this.blockLen = 0
      }
    }
    return this
  }

  private processBlock(block: Uint8Array): void {
    const w = this.w
    for (let i = 0; i < 16; i++) {
      const idx = i * 4
      w[i] =
        (block[idx] << 24) |
        (block[idx + 1] << 16) |
        (block[idx + 2] << 8) |
        block[idx + 3]
    }
    for (let i = 16; i < 80; i++) {
      w[i] = rotl(w[i - 3] ^ w[i - 8] ^ w[i - 14] ^ w[i - 16], 1)
    }

    let a = this.h0
    let b = this.h1
    let c = this.h2
    let d = this.h3
    let e = this.h4

    for (let i = 0; i < 80; i++) {
      let f = 0
      let k = 0
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

      const temp = (rotl(a, 5) + f + e + k + w[i]) | 0
      e = d
      d = c
      c = rotl(b, 30)
      b = a
      a = temp
    }

    this.h0 = (this.h0 + a) | 0
    this.h1 = (this.h1 + b) | 0
    this.h2 = (this.h2 + c) | 0
    this.h3 = (this.h3 + d) | 0
    this.h4 = (this.h4 + e) | 0
  }

  /**
   * Returns current internal state as hex string.
   * Matches Go GetSha1State byte swapping (little-endian per 32-bit word).
   */
  getStateHex(): string {
    const words = [this.h0, this.h1, this.h2, this.h3, this.h4]
    let hex = ""
    for (const w of words) {
      const b0 = (w & 0xff).toString(16).padStart(2, "0")
      const b1 = ((w >>> 8) & 0xff).toString(16).padStart(2, "0")
      const b2 = ((w >>> 16) & 0xff).toString(16).padStart(2, "0")
      const b3 = ((w >>> 24) & 0xff).toString(16).padStart(2, "0")
      hex += b0 + b1 + b2 + b3
    }
    return hex.toLowerCase()
  }

  /**
   * Finalize and calculate standard SHA-1 hex digest without corrupting the state
   * (works on a cloned state).
   */
  digestHex(): string {
    const clone = new IncrementalSha1()
    clone.h0 = this.h0
    clone.h1 = this.h1
    clone.h2 = this.h2
    clone.h3 = this.h3
    clone.h4 = this.h4
    clone.block.set(this.block)
    clone.blockLen = this.blockLen
    clone.totalBytes = this.totalBytes

    // Pad
    const padLen =
      clone.blockLen < 56 ? 56 - clone.blockLen : 120 - clone.blockLen
    const pad = new Uint8Array(padLen + 8)
    pad[0] = 0x80

    const totalBits = clone.totalBytes * 8
    const hiBits = Math.floor(clone.totalBytes / 0x20000000)
    const loBits = (totalBits & 0xffffffff) >>> 0

    const view = new DataView(pad.buffer, pad.byteOffset + padLen, 8)
    view.setUint32(0, hiBits, false)
    view.setUint32(4, loBits, false)

    clone.update(pad)

    const h = [clone.h0, clone.h1, clone.h2, clone.h3, clone.h4]
    return h
      .map((val) => (val >>> 0).toString(16).padStart(8, "0"))
      .join("")
      .toLowerCase()
  }
}

export function sha1Hex(data: Uint8Array | Buffer | string): string {
  const buf =
    typeof data === "string"
      ? new TextEncoder().encode(data)
      : data instanceof Uint8Array
        ? data
        : new Uint8Array(data)
  return new IncrementalSha1().update(buf).digestHex()
}

export function uint8ArrayToBase64(bytes: Uint8Array): string {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(bytes).toString("base64")
  }
  let binary = ""
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}
