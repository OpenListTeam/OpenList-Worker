// rclone crypt content format: "RCLONE\0\0" magic + 24-byte nonce header,
// then NaCl secretbox (XSalsa20-Poly1305) blocks of 64KiB plaintext each,
// tag(16) prepended per block, nonce incremented after every block.
// Ported from rclone v1.75.2 backend/crypt/cipher.go (MIT) via
// github.com/fyears/rclone-crypt. Sizes follow EncryptedSize/DecryptedSize.
import { xsalsa20poly1305 } from "@noble/ciphers/salsa.js"
import {
  errorEncryptedBadBlock,
  errorEncryptedBadMagic,
  errorEncryptedFileBadHeader,
  errorEncryptedFileTooShort,
  nonceAdd,
  nonceIncrement,
} from "./vendor/rclone-core"

const FILE_MAGIC = new Uint8Array([
  0x52, 0x43, 0x4c, 0x4f, 0x4e, 0x45, 0x00, 0x00,
]) // "RCLONE\0\0"
const FILE_NONCE_SIZE = 24
export const FILE_HEADER_SIZE = FILE_MAGIC.length + FILE_NONCE_SIZE // 32
const BLOCK_HEADER_SIZE = 16 // Poly1305 tag
export const BLOCK_DATA_SIZE = 64 * 1024
const BLOCK_SIZE = BLOCK_HEADER_SIZE + BLOCK_DATA_SIZE

export function encryptedSize(plainSize: number): number {
  const blocks = Math.floor(plainSize / BLOCK_DATA_SIZE)
  const residue = plainSize % BLOCK_DATA_SIZE
  let size = FILE_HEADER_SIZE + blocks * BLOCK_SIZE
  if (residue !== 0) size += BLOCK_HEADER_SIZE + residue
  return size
}

export function decryptedSize(encSize: number): number {
  let size = encSize - FILE_HEADER_SIZE
  if (size < 0) throw new Error(errorEncryptedFileTooShort)
  const blocks = Math.floor(size / BLOCK_SIZE)
  let residue = size % BLOCK_SIZE
  let out = blocks * BLOCK_DATA_SIZE
  if (residue !== 0) {
    residue -= BLOCK_HEADER_SIZE
    if (residue <= 0) throw new Error(errorEncryptedFileBadHeader)
  }
  return out + residue
}

function sealBlock(
  key: Uint8Array,
  nonce: Uint8Array,
  data: Uint8Array,
): Uint8Array {
  return xsalsa20poly1305(key, nonce).encrypt(data)
}

function openBlock(
  key: Uint8Array,
  nonce: Uint8Array,
  block: Uint8Array,
): Uint8Array {
  try {
    const pt = xsalsa20poly1305(key, nonce).decrypt(block)
    if (pt == null) throw new Error("null")
    return pt
  } catch {
    throw new Error(errorEncryptedBadBlock)
  }
}

/** Encrypt whole plaintext. `nonceInput` (24B) is only for reproducible output. */
export function encryptData(
  dataKey: Uint8Array,
  plain: Uint8Array,
  nonceInput?: Uint8Array,
): Uint8Array {
  const nonce = nonceInput
    ? Uint8Array.from(nonceInput)
    : crypto.getRandomValues(new Uint8Array(FILE_NONCE_SIZE))
  const res = new Uint8Array(encryptedSize(plain.length))
  res.set(FILE_MAGIC, 0)
  res.set(nonce, FILE_MAGIC.length)
  const counter = Uint8Array.from(nonce)
  for (
    let offset = 0, i = 0;
    offset < plain.length;
    offset += BLOCK_DATA_SIZE, i++
  ) {
    const chunk = plain.subarray(offset, offset + BLOCK_DATA_SIZE)
    const sealed = sealBlock(dataKey, counter, chunk)
    nonceIncrement(counter)
    res.set(sealed, FILE_HEADER_SIZE + offset + i * BLOCK_HEADER_SIZE)
  }
  return res
}

export function decryptData(
  dataKey: Uint8Array,
  input: Uint8Array,
): Uint8Array {
  if (input.length < FILE_HEADER_SIZE)
    throw new Error(errorEncryptedFileTooShort)
  for (let i = 0; i < FILE_MAGIC.length; i++) {
    if (input[i] !== FILE_MAGIC[i]) throw new Error(errorEncryptedBadMagic)
  }
  const counter = input.slice(FILE_MAGIC.length, FILE_HEADER_SIZE)
  const res = new Uint8Array(decryptedSize(input.length))
  for (
    let offIn = FILE_HEADER_SIZE, offOut = 0;
    offIn < input.length;
    offIn += BLOCK_SIZE, offOut += BLOCK_DATA_SIZE
  ) {
    const block = input.subarray(
      offIn,
      Math.min(offIn + BLOCK_SIZE, input.length),
    )
    const pt = openBlock(dataKey, counter, block)
    nonceIncrement(counter)
    res.set(pt, offOut)
  }
  return res
}

// ---------------------------------------------------------------------------
// Range decryption (cipher.go calculateUnderlying + decrypter.RangeSeek):
// convert a plaintext (offset, limit) into the sealed-block region to fetch,
// then decrypt only those blocks with the nonce advanced past skipped blocks.
// ---------------------------------------------------------------------------
const errorBadSeek = "Seek beyond end of file"

export interface UnderlyingRange {
  underlyingOffset: number
  /** -1 = read until EOF */
  underlyingLimit: number
  /** plaintext bytes to discard from the first decrypted block */
  discard: number
  /** number of whole blocks skipped from the start (for nonce advance) */
  blocks: number
}

export function calculateUnderlying(
  offset: number,
  limit: number,
): UnderlyingRange {
  const blocks = Math.floor(offset / BLOCK_DATA_SIZE)
  const discard = offset % BLOCK_DATA_SIZE
  const underlyingOffset =
    FILE_HEADER_SIZE + blocks * (BLOCK_HEADER_SIZE + BLOCK_DATA_SIZE)
  let underlyingLimit = -1
  if (limit >= 0) {
    // bytes to read beyond the first block
    const bytesToRead = limit - (BLOCK_DATA_SIZE - discard)
    let blocksToRead = 1
    if (bytesToRead > 0) {
      let extra = Math.floor(bytesToRead / BLOCK_DATA_SIZE)
      const endBytes = bytesToRead % BLOCK_DATA_SIZE
      if (endBytes !== 0) extra++
      blocksToRead += extra
    }
    underlyingLimit = blocksToRead * (BLOCK_HEADER_SIZE + BLOCK_DATA_SIZE)
  }
  return { underlyingOffset, underlyingLimit, discard, blocks }
}

/**
 * Decrypt `count` plaintext bytes (count < 0 = to the end) from a ciphertext
 * slice that starts at a block boundary `blocks` blocks into the file.
 * `discard` plaintext bytes of the first decrypted block are skipped.
 */
export function decryptBlockSlice(
  dataKey: Uint8Array,
  initialNonce: Uint8Array,
  blocks: number,
  discard: number,
  count: number,
  slice: Uint8Array,
): Uint8Array {
  const counter = Uint8Array.from(initialNonce)
  nonceAdd(blocks, counter)
  const want = count < 0 ? Number.POSITIVE_INFINITY : count
  const parts: Uint8Array[] = []
  let got = 0
  let first = true
  for (let pos = 0; pos < slice.length && got < want; pos += BLOCK_SIZE) {
    const block = slice.subarray(pos, Math.min(pos + BLOCK_SIZE, slice.length))
    const pt = openBlock(dataKey, counter, block)
    nonceIncrement(counter)
    let start = 0
    if (first) {
      if (discard > pt.length) throw new Error(errorBadSeek)
      start = discard
      first = false
    }
    const take = Math.min(pt.length - start, want - got)
    parts.push(pt.subarray(start, start + take))
    got += take
  }
  const out = new Uint8Array(got)
  let p = 0
  for (const part of parts) {
    out.set(part, p)
    p += part.length
  }
  return out
}

export function decryptDataRange(
  dataKey: Uint8Array,
  input: Uint8Array,
  offset: number,
  limit: number,
): Uint8Array {
  if (input.length < FILE_HEADER_SIZE)
    throw new Error(errorEncryptedFileTooShort)
  for (let i = 0; i < FILE_MAGIC.length; i++) {
    if (input[i] !== FILE_MAGIC[i]) throw new Error(errorEncryptedBadMagic)
  }
  const initialNonce = input.slice(FILE_MAGIC.length, FILE_HEADER_SIZE)
  const spec = calculateUnderlying(offset, limit)
  const uEnd =
    spec.underlyingLimit < 0
      ? input.length
      : Math.min(spec.underlyingOffset + spec.underlyingLimit, input.length)
  const slice = input.subarray(spec.underlyingOffset, uEnd)
  return decryptBlockSlice(
    dataKey,
    initialNonce,
    spec.blocks,
    spec.discard,
    limit,
    slice,
  )
}
