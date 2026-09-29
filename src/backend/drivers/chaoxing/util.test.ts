import assert from "node:assert/strict"
import { test } from "node:test"
import { createCipheriv } from "node:crypto"

import { aesCbcEncryptBase64 } from "../../pkg/crypto"

const LOGIN_KEY = "u2oh6Vu^HWe4_AES"

function nodeCbcAutoPad(plaintext: string, key: string): string {
  const cipher = createCipheriv("aes-128-cbc", key, key)
  let enc = cipher.update(plaintext, "utf8", "base64")
  enc += cipher.final("base64")
  return enc
}

function pkcs7Pad(buf: Uint8Array): Buffer {
  const padLen = 16 - (buf.length % 16)
  const padded = Buffer.alloc(buf.length + padLen)
  Buffer.from(buf).copy(padded)
  padded.fill(padLen, buf.length)
  return padded
}

test("chaoxing login AES-CBC matches Node crypto (auto-pad path)", async () => {
  const cases = ["testuser", "admin", "密码123", "a".repeat(17)]
  for (const plain of cases) {
    const actual = await aesCbcEncryptBase64(plain, LOGIN_KEY)
    const expected = nodeCbcAutoPad(plain, LOGIN_KEY)
    assert.equal(actual, expected, `plain=${plain}`)
  }
})

test("chaoxing login AES-CBC manual PKCS7 equals auto-pad (Workers path)", () => {
  // In Cloudflare Workers, WebCrypto does NOT auto-pad; our helper pads
  // manually. The manual-pad + no-auto-pad ciphertext must equal the
  // Node auto-pad ciphertext (both apply PKCS#7 to the same message).
  const cases = ["testuser", "admin", "密码123", "a".repeat(17)]
  for (const plain of cases) {
    const auto = nodeCbcAutoPad(plain, LOGIN_KEY)

    const cipher = createCipheriv("aes-128-cbc", LOGIN_KEY, LOGIN_KEY)
    cipher.setAutoPadding(false)
    const padded = pkcs7Pad(new TextEncoder().encode(plain))
    const manual = Buffer.concat([
      cipher.update(padded),
      cipher.final(),
    ]).toString("base64")

    assert.equal(manual, auto, `plain=${plain}`)
  }
})
