import test from "node:test"
import assert from "node:assert/strict"
import { Hono } from "hono"
import { encrypt, decrypt } from "./crypto"
import { hashPassword, authRouter, getOrInitUsers } from "../server/auth"
import { saveDb, getDb } from "../internal/model/db"

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

test("getOrInitUsers preserves a legacy PBKDF2 admin hash instead of silently resetting to admin/admin", async () => {
  const env: any = {}
  // 隔离 CI 环境变量：若 CI 设置了 ADMIN_PASSWORD，getOrInitUsers 会优先取
  // process.env.ADMIN_PASSWORD，导致断言失败
  delete process.env.ADMIN_PASSWORD
  // Simulate leftover from the PBKDF2 build (PR #33 era): stored hash is
  // `pbkdf2:100000:<salt>:<hash>`, unverifiable by the current SHA-256 scheme.
  const fakePdkdf2Hash = `pbkdf2:100000:${"a".repeat(64)}:${"b".repeat(64)}`
  await saveDb(
    {
      settings: [],
      users: [
        {
          id: 1,
          username: "admin",
          password: fakePdkdf2Hash,
          role: 2,
          permission: 0,
          base_path: "/",
          disabled: false,
        },
        {
          id: 2,
          username: "guest",
          password: "",
          role: 1,
          permission: 0,
          base_path: "/",
          disabled: false,
        },
      ],
      storages: [],
      shares: [],
    },
    env,
  )

  // FIX(F-11): this test used to assert the OPPOSITE — that the legacy hash
  // was reset so that admin/admin could log in. That "upgrade reopens the
  // admin account to a well-known password" behavior was itself a
  // vulnerability; the fix deliberately preserves an unverifiable legacy
  // hash (with a warning logged) and never falls back to a default.
  const { users } = await getOrInitUsers(env)
  const admin = users.find((u: any) => u.username === "admin")
  assert.equal(
    admin.password,
    fakePdkdf2Hash,
    "a legacy-format hash must be preserved, never silently reset",
  )
  assert.notEqual(admin.password, await hashPassword("admin"))

  const app = new Hono()
  app.route("/api/auth", authRouter)
  const res = await app.request("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "admin", password: "admin" }),
  })
  assert.notEqual(
    res.status,
    200,
    "admin/admin must NOT log in against a preserved legacy hash",
  )
})
