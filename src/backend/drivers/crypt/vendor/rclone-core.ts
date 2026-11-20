// rclone crypt low-level primitives (filename segment crypto + encodings).
// Derived from rclone v1.75.2 backend/crypt/cipher.go via
// github.com/fyears/rclone-crypt src/index.ts. rclone and fyears/rclone-crypt
// are MIT licensed, Copyright (C) 2012 Nick Craig-Wood - keep this notice.
// Modified: restructured to free functions, synced to noble 2.x, EME from ./eme.
import { base32hex, base64url } from "rfc4648"
import * as base32768 from "base32768"
import { AESCipherBlock, EMECipher } from "./eme"

export type FileNameEncoding = "base32" | "base64" | "base32768"

// rclone cipher.go error strings (exact wording kept for 1:1 behavior)
export const errorBadDecryptUTF8 = "bad decryption - utf-8 invalid"
export const errorBadDecryptControlChar =
  "bad decryption - contains control chars"
export const errorNotAMultipleOfBlocksize = "not a multiple of blocksize"
export const errorTooShortAfterDecode = "too short after base32 decode"
export const errorTooLongAfterDecode = "too long after base32 decode"
export const errorEncryptedFileTooShort = "file is too short to be encrypted"
export const errorEncryptedFileBadHeader = "file has truncated block header"
export const errorEncryptedBadMagic = "not an encrypted file - bad magic string"
export const errorEncryptedBadBlock =
  "failed to authenticate decrypted block - bad password?"
export const errorBadBase32Encoding = "bad base32 filename encoding"
export const errorNotAnEncryptedFile =
  "not an encrypted file - does not match suffix"
export const errorSuffixMissingDot =
  "suffix config setting should include a '.'"

export const nameCipherBlockSize = 16

// ---------------------------------------------------------------------------
// PKCS7 (rclone backend/crypt/pkcs7 semantics: always 1..blockSize pad bytes)
// ---------------------------------------------------------------------------
export function pkcs7Pad(data: Uint8Array, blockSize: number): Uint8Array {
  const padLen = blockSize - (data.length % blockSize)
  const out = new Uint8Array(data.length + padLen)
  out.set(data)
  out.fill(padLen, data.length)
  return out
}

export function pkcs7Unpad(data: Uint8Array): Uint8Array {
  if (data.length === 0) throw new Error("pkcs7: invalid padding")
  const padLen = data[data.length - 1]!
  if (padLen < 1 || padLen > data.length)
    throw new Error("pkcs7: invalid padding")
  for (let i = data.length - padLen; i < data.length; i++) {
    if (data[i] !== padLen) throw new Error("pkcs7: invalid padding")
  }
  return data.slice(0, data.length - padLen)
}

// ---------------------------------------------------------------------------
// Filename encodings (rclone cipher.go encodeFileNameBase32/Base64/Base32768)
// ---------------------------------------------------------------------------
export function encodeFileName(enc: FileNameEncoding, ct: Uint8Array): string {
  if (enc === "base32") {
    return base32hex.stringify(ct, { pad: false }).toLowerCase()
  } else if (enc === "base64") {
    return base64url.stringify(ct, { pad: false })
  } else if (enc === "base32768") {
    return base32768.encode(ct)
  }
  throw new Error(`unknown fileNameEnc=${enc}`)
}

export function decodeFileName(enc: FileNameEncoding, s: string): Uint8Array {
  if (enc === "base32") {
    if (s.endsWith("=")) {
      throw new Error(errorBadBase32Encoding)
    }
    return base32hex.parse(s.toUpperCase(), { loose: true })
  } else if (enc === "base64") {
    return base64url.parse(s, { loose: true })
  } else if (enc === "base32768") {
    return base32768.decode(s)
  }
  throw new Error(`unknown fileNameEnc=${enc}`)
}

// ---------------------------------------------------------------------------
// Path segments (cipher.go encryptSegment/decryptSegment)
// EME-AES with nameTweak over PKCS7-padded UTF-8, deterministic per nameKey.
// ---------------------------------------------------------------------------
export function encryptSegment(
  nameKey: Uint8Array,
  nameTweak: Uint8Array,
  enc: FileNameEncoding,
  plaintext: string,
): string {
  if (plaintext === "") return ""
  const padded = pkcs7Pad(
    new TextEncoder().encode(plaintext),
    nameCipherBlockSize,
  )
  const eme = new EMECipher(new AESCipherBlock(nameKey))
  return encodeFileName(enc, eme.encrypt(nameTweak, padded))
}

export function decryptSegment(
  nameKey: Uint8Array,
  nameTweak: Uint8Array,
  enc: FileNameEncoding,
  ciphertext: string,
): string {
  if (ciphertext === "") return ""
  const raw = decodeFileName(enc, ciphertext)
  if (raw.length % nameCipherBlockSize !== 0) {
    throw new Error(errorNotAMultipleOfBlocksize)
  }
  if (raw.length === 0) {
    throw new Error(errorTooShortAfterDecode)
  }
  if (raw.length > 2048) {
    throw new Error(errorTooLongAfterDecode)
  }
  const eme = new EMECipher(new AESCipherBlock(nameKey))
  const padded = eme.decrypt(nameTweak, raw)
  return new TextDecoder().decode(pkcs7Unpad(padded))
}

// ---------------------------------------------------------------------------
// Nonce arithmetic for the 24-byte secretbox nonce (cipher.go nonce type):
// little-endian counter semantics - increment wraps byte-wise with carry;
// add(x) is addition of a uint64 with carry into the upper bytes.
// ---------------------------------------------------------------------------
export function nonceCarry(i: number, n: Uint8Array): void {
  for (; i < n.length; i++) {
    const digit = n[i]!
    const newDigit = (digit + 1) & 0xff
    n[i] = newDigit
    if (newDigit >= digit) break // exit if no carry
  }
}

export function nonceIncrement(n: Uint8Array): void {
  nonceCarry(0, n)
}

export function nonceAdd(x: number | bigint, n: Uint8Array): void {
  let y = BigInt.asUintN(64, BigInt(x))
  let carryNum = 0n
  for (let i = 0; i < 8; i++) {
    const sum = carryNum + BigInt(n[i]!) + (y & 0xffn)
    n[i] = Number(sum & 0xffn)
    y >>= 8n
    carryNum = sum >> 8n
  }
  if (carryNum !== 0n) nonceCarry(8, n)
}

// ---------------------------------------------------------------------------
// AES-256-CTR with a full 128-bit big-endian counter (Go crypto/aes+NewCTR
// and WebCrypto AES-CTR length:128 semantics). Used by the legacy pre-rclone
// content format and by fs/config/obscure. XOR keystream, so it works both
// for encryption and decryption.
// ---------------------------------------------------------------------------
import { unsafe } from "@noble/ciphers/aes.js"

export function aesCtrCrypt(
  key: Uint8Array,
  counter16: Uint8Array,
  data: Uint8Array,
): Uint8Array {
  if (counter16.length !== 16) throw new Error("counter must be 16 bytes")
  const encKey = unsafe.expandKeyLE(key)
  const out = new Uint8Array(data.length)
  const counter = Uint8Array.from(counter16)
  const ks = new Uint8Array(16)
  for (let off = 0; off < data.length; off += 16) {
    ks.set(counter)
    unsafe.encryptBlock(encKey, ks)
    const n = Math.min(16, data.length - off)
    for (let i = 0; i < n; i++) out[off + i] = data[off + i]! ^ ks[i]!
    for (let i = 15; i >= 0; i--) {
      counter[i] = counter[i]! + 1
      if (counter[i] !== 0) break
    }
  }
  return out
}
