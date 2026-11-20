import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import { deobfuscateSegment, obfuscateSegment } from "./names"

const V = JSON.parse(
  readFileSync(
    new URL("./testdata/vectors.rclone-v1.75.2.json", import.meta.url),
    "utf8",
  ),
)

// rclone cipher.go obfuscateSegment/deobfuscateSegment (TestNonStandardEncryptFileName)
test("obfuscate goldens with zero nameKey (cipher_test.go)", () => {
  const zero = new Uint8Array(32)
  for (const [plain, want] of V.obfuscate as [string, string][]) {
    assert.equal(
      obfuscateSegment(plain, zero),
      want,
      `enc ${JSON.stringify(plain)}`,
    )
    assert.equal(
      deobfuscateSegment(want, zero),
      plain,
      `dec ${JSON.stringify(want)}`,
    )
  }
  assert.equal((V.obfuscate as unknown[]).length, 6)
})

test("obfuscate uses nameKey in the rotation distance", () => {
  const key = new Uint8Array(32).fill(0x42)
  // verified against Go rclone cipher.go obfuscateSegment
  assert.equal(obfuscateSegment("123", key), "150.567")
  assert.equal(deobfuscateSegment("150.567", key), "123")
  const zero = new Uint8Array(32)
  assert.notEqual(obfuscateSegment("123", zero), obfuscateSegment("123", key))
})

test("obfuscate leaves the dir prefix and quotes in place", () => {
  const zero = new Uint8Array(32)
  assert.match(obfuscateSegment("hello.txt", zero), /^\d+\./)
  // U+E000 rotates inside its 256-block (verified against Go)
  assert.equal(obfuscateSegment("", zero), "0.")
  // '!' is quoted as '!!'; '.' and other symbols pass through untouched
  assert.equal(obfuscateSegment("!hello", zero), "53.!!lipps")
})

test("deobfuscate passthrough and error semantics match rclone", () => {
  const zero = new Uint8Array(32)
  // "!." prefix means "no rotation happened" (original not valid unicode)
  assert.equal(deobfuscateSegment("!.raw.name", zero), "raw.name")
  assert.equal(obfuscateSegment("", zero), "")
  assert.equal(deobfuscateSegment("", zero), "")
  // no dot at all -> not an encrypted file
  assert.throws(
    () => deobfuscateSegment("nodot", zero),
    /not an encrypted file/,
  )
  // prefix is not a number -> not an encrypted file
  assert.throws(
    () => deobfuscateSegment("x.abc", zero),
    /not an encrypted file/,
  )
})

test("obfuscate/deobfuscate roundtrip property (500 strings)", () => {
  const key = new Uint8Array(32)
  for (let i = 0; i < 32; i++) key[i] = (i * 37 + 11) & 0xff
  let seed = 0x243f6a88
  const rnd = (n: number) => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff
    return seed % n
  }
  const charset =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.-_ !éè你好Αβ"
  for (let t = 0; t < 500; t++) {
    let s = ""
    const len = rnd(24)
    for (let i = 0; i < len; i++) s += charset[rnd(charset.length)]!
    const enc = obfuscateSegment(s, key)
    const dec = deobfuscateSegment(enc, key)
    assert.equal(
      dec,
      s,
      `roundtrip ${JSON.stringify(s)} -> ${JSON.stringify(enc)}`,
    )
  }
})
