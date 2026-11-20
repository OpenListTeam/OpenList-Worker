import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import { isRcloneFormat, legacyDecrypt, legacyEncryptedSize } from "./legacy"
import { deobfuscatePassword, obscure, reveal } from "./obscure"

const V = JSON.parse(
  readFileSync(
    new URL("./testdata/vectors.rclone-v1.75.2.json", import.meta.url),
    "utf8",
  ),
)
const FIX = JSON.parse(
  readFileSync(
    new URL("./testdata/legacy-fixtures.json", import.meta.url),
    "utf8",
  ),
)
const hex = (b: Uint8Array) =>
  [...b].map((x) => x.toString(16).padStart(2, "0")).join("")
const fromHex = (h: string) =>
  new Uint8Array(h.match(/../g)!.map((b) => parseInt(b, 16)))

// ---------------------------------------------------------------------------
// Legacy pre-rclone AES-CTR format (read-only compatibility)
// [16B nonce][16B reserved][AES-256-CTR]; scrypt dkLen=64, raw salt
// ---------------------------------------------------------------------------
test("legacyDecrypt reads every frozen fixture byte-exactly", () => {
  assert.equal(FIX.fixtures.length, 15)
  for (const f of FIX.fixtures as {
    password: string
    salt: string
    plainSize: number
    plainHex: string
    encHex: string
  }[]) {
    const out = legacyDecrypt(f.password, f.salt, fromHex(f.encHex))
    assert.equal(
      hex(out),
      f.plainHex,
      `fixture ${f.password}/${f.salt}/${f.plainSize}`,
    )
    assert.equal(out.length, f.plainSize)
    assert.equal(legacyEncryptedSize(f.plainSize), fromHex(f.encHex).length)
  }
})

test("legacyDecrypt rejects files shorter than the 32B header", () => {
  assert.throws(
    () => legacyDecrypt("potato", "", new Uint8Array(31)),
    /过短|too short/i,
  )
})

test("isRcloneFormat distinguishes the two content formats", () => {
  const rcloneEnc = fromHex("52434c4f4e450000" + V.data.nonce + V.data.file1_ct)
  assert.equal(isRcloneFormat(rcloneEnc), true)
  const legacyEnc = fromHex((FIX.fixtures as { encHex: string }[])[1]!.encHex)
  assert.equal(isRcloneFormat(legacyEnc), false)
  assert.equal(isRcloneFormat(new Uint8Array(8)), false)
})

// ---------------------------------------------------------------------------
// rclone "obscure" password obfuscation (fs/config/obscure)
// ---------------------------------------------------------------------------
test("obscure matches obscure_test.go goldens", () => {
  const ivA = new TextEncoder().encode("aaaaaaaaaaaaaaaa")
  const ivB = new TextEncoder().encode("bbbbbbbbbbbbbbbb")
  for (const c of V.obscure.cases as {
    plaintext: string
    iv: string
    want: string
  }[]) {
    const iv = new TextEncoder().encode(c.iv)
    assert.equal(
      obscure(c.plaintext, iv),
      c.want,
      `obscure(${JSON.stringify(c.plaintext)})`,
    )
    assert.equal(reveal(c.want), c.plaintext, `reveal(${c.want})`)
  }
  void ivA
  void ivB
})

test("obscure uses a random IV when none is given and reveal roundtrips", () => {
  const a = obscure("hunter2")
  const b = obscure("hunter2")
  assert.notEqual(a, b) // random IV
  assert.equal(reveal(a), "hunter2")
  assert.equal(reveal(b), "hunter2")
})

test("reveal rejects inputs that are too short", () => {
  assert.throws(() => reveal("YWFhYQ"), /too short/)
})

test("deobfuscatePassword handles the ___Obfuscated___ prefix (crypt.go)", () => {
  const stored = obscure(
    "topsecret",
    new TextEncoder().encode("aaaaaaaaaaaaaaaa"),
  )
  assert.equal(deobfuscatePassword(`___Obfuscated___${stored}`), "topsecret")
  // no prefix -> returned unchanged
  assert.equal(deobfuscatePassword("plainpassword"), "plainpassword")
})

// ---------------------------------------------------------------------------
// CryptCipher facade: dual-format content read (rclone magic -> secretbox,
// otherwise legacy AES-CTR with the legacy KDF)
// ---------------------------------------------------------------------------
test("CryptCipher.decryptData dispatches on magic (dual-format read)", async () => {
  const { CryptCipher } = await import("./cipher")
  const c = new CryptCipher("potato", "", {
    mode: "off",
    dirNameEncrypt: false,
    filenameEncoding: "base64",
    encryptedSuffix: ".bin",
  })
  // legacy fixture readable through the facade
  const f = (
    FIX.fixtures as {
      password: string
      salt: string
      plainHex: string
      encHex: string
    }[]
  ).find(
    (x) =>
      x.password === "potato" && x.salt === "" && x.plainHex.length === 200,
  )!
  const dec = c.decryptData(fromHex(f.encHex))
  assert.equal(hex(dec), f.plainHex)
  // rclone format readable through the facade (own writes)
  const pt = new Uint8Array([9, 8, 7, 6, 5])
  const enc = c.encryptData(pt)
  assert.equal(isRcloneFormat(enc), true)
  assert.equal(hex(c.decryptData(enc)), hex(pt))
  assert.equal(c.encryptedSize(5), enc.length)
  assert.equal(c.decryptedSize(enc.length), 5)
})
