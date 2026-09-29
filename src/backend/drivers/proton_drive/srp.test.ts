import test from "node:test"
import assert from "node:assert/strict"
import {
  bytesToBigInt,
  bigIntToBytes,
  modPow,
  hashPassword,
} from "./srp"
import { deriveSaltedKeyPass, getNameHash } from "./crypto"

test("bytesToBigInt / bigIntToBytes roundtrip", () => {
  const bytes = new Uint8Array([0x01, 0x02, 0x03, 0xff])
  const n = bytesToBigInt(bytes)
  assert.equal(n, 0x010203ffn)
  const back = bigIntToBytes(n)
  assert.deepEqual(back, bytes)
})

test("bigIntToBytes pads to requested length", () => {
  const padded = bigIntToBytes(0x01ffn, 4)
  assert.deepEqual(padded, new Uint8Array([0x00, 0x00, 0x01, 0xff]))
})

test("modPow correctness (small known values)", () => {
  assert.equal(modPow(2n, 10n, 1000n), 24n)
  assert.equal(modPow(3n, 5n, 13n), 9n)
  assert.equal(modPow(2n, 0n, 5n), 1n)
  assert.equal(modPow(7n, 1n, 100n), 7n)
  // mod=1 edge case
  assert.equal(modPow(123n, 5n, 1n), 0n)
})

test("hashPassword v<2 returns raw password bytes", () => {
  const out = hashPassword(1, "secret", new Uint8Array(16))
  assert.deepEqual(out, new TextEncoder().encode("secret"))
})

test("hashPassword v>=2 is deterministic bcrypt digest", () => {
  const salt = new Uint8Array(16).fill(0xab)
  const a = hashPassword(4, "password123", salt)
  const b = hashPassword(4, "password123", salt)
  assert.deepEqual(a, b)
  assert.ok(a.length > 0)
})

test("deriveSaltedKeyPass is deterministic and printable ASCII", () => {
  const salt = btoa("\x01\x02\x03\x04\x05\x06\x07\x08\x09\x0a\x0b\x0c\x0d\x0e\x0f\x10")
  const a = deriveSaltedKeyPass("password", salt)
  const b = deriveSaltedKeyPass("password", salt)
  assert.equal(a, b)
  // bcrypt digest is printable ASCII (31 chars)
  assert.match(a, /^[./A-Za-z0-9]{31}$/)
})

test("getNameHash = base64(sha256(name))", async () => {
  const h = await getNameHash("hello")
  // sha256("hello") = 2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824
  const expected = "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824"
  assert.equal(h, btoa(hexToBytes(expected)))
})

function hexToBytes(hex: string): string {
  let bin = ""
  for (let i = 0; i < hex.length; i += 2) {
    bin += String.fromCharCode(parseInt(hex.slice(i, i + 2), 16))
  }
  return bin
}
