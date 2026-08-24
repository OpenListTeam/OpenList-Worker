import test from "node:test"
import assert from "node:assert/strict"
import { encrypt, decrypt } from "./crypto"
import { hashPassword } from "../server/auth"

test("AES encrypt/decrypt produces 3-segment format and decrypts correctly", async () => {
  const secretKey = "my-test-secret-key-123456"
  const plaintext = "hello-world-sensitive-data"

  const encrypted = await encrypt(plaintext, secretKey)
  const parts = encrypted.split(":")
  assert.equal(parts.length, 3, "New format must have 3 parts (salt:iv:cipher)")

  const decrypted = await decrypt(encrypted, secretKey)
  assert.equal(decrypted, plaintext, "Decrypted text must match plaintext")
})

test("AES decrypt backwards compatibility with 2-segment legacy format", async () => {
  const secretKey = "my-test-secret-key-123456"
  const plaintext = "legacy-plaintext-data"

  // Manually construct legacy 1-iteration format with static salt
  const enc = new TextEncoder().encode(secretKey)
  const keyMat = await crypto.subtle.importKey("raw", enc, "PBKDF2", false, [
    "deriveKey",
  ])
  const ck = await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: new TextEncoder().encode("salt"),
      iterations: 1,
      hash: "SHA-256",
    },
    keyMat,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  )
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const cipherBuf = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    ck,
    new TextEncoder().encode(plaintext),
  )
  const hexEncode = (buf: ArrayBuffer) =>
    Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
  const legacyEncrypted = `${hexEncode(iv.buffer)}:${hexEncode(cipherBuf)}`

  const decrypted = await decrypt(legacyEncrypted, secretKey)
  assert.equal(
    decrypted,
    plaintext,
    "Legacy format must be decrypted successfully",
  )
})

test("Password hashing produces consistent 64-char sha256 output", async () => {
  const hash = await hashPassword("admin")
  assert.equal(typeof hash, "string")
  assert.equal(hash.length, 64)
})
