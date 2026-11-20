import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import { DEFAULT_SALT, deriveKeys } from "./kdf"

const V = JSON.parse(
  readFileSync(
    new URL("./testdata/vectors.rclone-v1.75.2.json", import.meta.url),
    "utf8",
  ),
)
const hex = (b: Uint8Array) =>
  [...b].map((x) => x.toString(16).padStart(2, "0")).join("")

// rclone cipher_test.go TestKey (v1.75.2): scrypt(password, salt||defaultSalt, 16384, 8, 1, 80)
test("deriveKeys matches rclone TestKey golden: potato/defaultSalt", () => {
  const k = deriveKeys("potato", "")
  const exp = V.kdf["potato/"]
  assert.equal(hex(k.dataKey), exp.dataKey.toLowerCase())
  assert.equal(hex(k.nameKey), exp.nameKey.toLowerCase())
  assert.equal(hex(k.nameTweak), exp.nameTweak.toLowerCase())
})

test("deriveKeys is case sensitive: Potato/defaultSalt", () => {
  const k = deriveKeys("Potato", "")
  const exp = V.kdf["Potato/"]
  assert.equal(hex(k.dataKey), exp.dataKey.toLowerCase())
  assert.equal(hex(k.nameKey), exp.nameKey.toLowerCase())
  assert.equal(hex(k.nameTweak), exp.nameTweak.toLowerCase())
})

test("deriveKeys uses provided salt: potato/sausage", () => {
  const k = deriveKeys("potato", "sausage")
  const exp = V.kdf["potato/sausage"]
  assert.equal(hex(k.dataKey), exp.dataKey.toLowerCase())
  assert.equal(hex(k.nameKey), exp.nameKey.toLowerCase())
  assert.equal(hex(k.nameTweak), exp.nameTweak.toLowerCase())
})

// rclone cipher.go Key(): empty password -> all-zero keys (used by tests)
test("deriveKeys empty password gives all-zero keys regardless of salt", () => {
  for (const salt of ["", "sausage"]) {
    const k = deriveKeys("", salt)
    assert.ok(
      k.dataKey.every((b) => b === 0),
      `dataKey not zero for salt=${salt}`,
    )
    assert.ok(
      k.nameKey.every((b) => b === 0),
      `nameKey not zero for salt=${salt}`,
    )
    assert.ok(
      k.nameTweak.every((b) => b === 0),
      `nameTweak not zero for salt=${salt}`,
    )
  }
})

test("deriveKeys key material sizes are 32/32/16", () => {
  const k = deriveKeys("potato", "")
  assert.equal(k.dataKey.length, 32)
  assert.equal(k.nameKey.length, 32)
  assert.equal(k.nameTweak.length, 16)
})

test("DEFAULT_SALT is the rclone fixed salt", () => {
  assert.equal(hex(DEFAULT_SALT), "a80df43a8fbd0308a7cab83e581f86b1")
})
