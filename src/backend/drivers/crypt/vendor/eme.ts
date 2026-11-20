// EME (ECB-Mix-ECB) wide-block cipher, Halevi & Rogaway 2003.
// Ported from rclone v1.75.2 backend/crypt/eme.go (itself from rfjakob/eme).
// rclone is MIT licensed, Copyright (C) 2012 Nick Craig-Wood - keep this notice.
//
// Deterministic wide-block encryption over AES-256, block size 16..2048 bytes,
// used for rclone crypt "standard" filename encryption.
import { unsafe } from "@noble/ciphers/aes.js"

export class AESCipherBlock {
  private readonly encKey: Uint32Array
  private readonly decKey: Uint32Array

  constructor(key: Uint8Array) {
    // noble's stream-style ecb() forbids reuse; EME needs many single-block
    // operations, so use its unsafe block primitives (same ones aeskw/cmAC use).
    this.encKey = unsafe.expandKeyLE(key)
    this.decKey = unsafe.expandKeyDecLE(key)
  }

  encrypt(block: Uint8Array): Uint8Array {
    // unsafe.encryptBlock mutates in place and needs an aligned view
    const b = Uint8Array.from(block)
    unsafe.encryptBlock(this.encKey, b)
    return b
  }

  decrypt(block: Uint8Array): Uint8Array {
    const b = Uint8Array.from(block)
    unsafe.decryptBlock(this.decKey, b)
    return b
  }
}

// GF(2^128) multiplication by x ("multByTwo", EME-32 draft figure 4.1).
function multByTwo(out: Uint8Array, input: Uint8Array): void {
  if (input.length !== 16) throw new Error("len must be 16")
  const tmp = new Uint8Array(16)
  tmp[0] = ((2 * input[0]) & 0xff) ^ (135 & (-(input[15]! >> 7) & 0xff))
  for (let j = 1; j < 16; j++) {
    tmp[j] = (2 * input[j]! + (input[j - 1]! >> 7)) & 0xff
  }
  out.set(tmp)
}

function xorInto(out: Uint8Array, a: Uint8Array, b: Uint8Array): void {
  for (let i = 0; i < out.length; i++) out[i] = a[i]! ^ b[i]!
}

function tabulateL(bc: AESCipherBlock, m: number): Uint8Array[] {
  // L0 = 2*AESenc(K; 0)
  const li = bc.encrypt(new Uint8Array(16))
  const table: Uint8Array[] = []
  for (let i = 0; i < m; i++) {
    multByTwo(li, li)
    table.push(li.slice())
  }
  return table
}

export type EmeDirection = "encrypt" | "decrypt"

// EME-encrypt or EME-decrypt `data` (multiple of 16 bytes, 1..128 blocks)
// with the 16-byte `tweak`. Same tweak+input gives same output.
export function emeTransform(
  bc: AESCipherBlock,
  tweak: Uint8Array,
  data: Uint8Array,
  direction: EmeDirection,
): Uint8Array {
  if (tweak.length !== 16) {
    throw new Error(`Tweak must be 16 bytes long, is ${tweak.length}`)
  }
  if (data.length % 16 !== 0) {
    throw new Error(`Data P must be a multiple of 16 long, is ${data.length}`)
  }
  const m = data.length / 16
  if (m === 0 || m > 128) {
    throw new Error(
      `EME operates on 1 to 128 block-cipher blocks, you passed ${m}`,
    )
  }
  const xf = (block: Uint8Array) =>
    direction === "encrypt" ? bc.encrypt(block) : bc.decrypt(block)

  const lTable = tabulateL(bc, m)
  const C = new Uint8Array(data.length)
  const ppj = new Uint8Array(16)
  for (let j = 0; j < m; j++) {
    // PPj = 2**(j-1)*L xor Pj ; PPPj = AESenc(K; PPj)
    xorInto(ppj, data.subarray(j * 16, (j + 1) * 16), lTable[j]!)
    C.set(xf(ppj), j * 16)
  }

  // MP = (xorSum PPPj) xor T
  const mp = new Uint8Array(16)
  mp.set(C.subarray(0, 16))
  for (let j = 1; j < m; j++) {
    xorInto(mp, mp, C.subarray(j * 16, (j + 1) * 16))
  }
  xorInto(mp, mp, tweak)

  // MC = AESenc(K; MP) ; M = MP xor MC
  const mc = xf(mp)
  const M = new Uint8Array(16)
  xorInto(M, mp, mc)

  const cccj = new Uint8Array(16)
  for (let j = 1; j < m; j++) {
    multByTwo(M, M)
    xorInto(cccj, C.subarray(j * 16, (j + 1) * 16), M)
    C.set(cccj, j * 16)
  }

  // CCC1 = (xorSum CCCj) xor T xor MC
  const ccc1 = new Uint8Array(16)
  ccc1.set(mc)
  xorInto(ccc1, ccc1, tweak)
  for (let j = 1; j < m; j++) {
    xorInto(ccc1, ccc1, C.subarray(j * 16, (j + 1) * 16))
  }
  C.set(ccc1, 0)

  for (let j = 0; j < m; j++) {
    // CCj = AESenc(K; CCCj) ; Cj = 2**(j-1)*L xor CCj
    const ccj = xf(C.subarray(j * 16, (j + 1) * 16))
    const cj = new Uint8Array(16)
    xorInto(cj, ccj, lTable[j]!)
    C.set(cj, j * 16)
  }
  return C
}

export class EMECipher {
  constructor(private readonly bc: AESCipherBlock) {}

  encrypt(tweak: Uint8Array, data: Uint8Array): Uint8Array {
    return emeTransform(this.bc, tweak, data, "encrypt")
  }

  decrypt(tweak: Uint8Array, data: Uint8Array): Uint8Array {
    return emeTransform(this.bc, tweak, data, "decrypt")
  }
}
