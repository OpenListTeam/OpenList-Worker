import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import {
  decodeFileName,
  decryptSegment,
  encodeFileName,
  encryptSegment,
  pkcs7Pad,
  pkcs7Unpad,
  type FileNameEncoding,
} from "./vendor/rclone-core"
import { AESCipherBlock, EMECipher } from "./vendor/eme"
import {
  NameCipher,
  addVersion,
  matchVersion,
  normalizeEncryptedSuffix,
  removeVersion,
} from "./names"

const V = JSON.parse(
  readFileSync(
    new URL("./testdata/vectors.rclone-v1.75.2.json", import.meta.url),
    "utf8",
  ),
)
const hex = (b: Uint8Array) =>
  [...b].map((x) => x.toString(16).padStart(2, "0")).join("")
const fromHex = (h: string) =>
  new Uint8Array(h.match(/../g)!.map((b) => parseInt(b, 16)))

// EME-AES wide-block cipher (Halevi-Rogaway), vendored from rclone v1.75.2
// backend/crypt/eme.go; vectors from rfjakob/eme eme_test.go (all-zero key/tweak/input).
test("EME encrypt 16B all-zero matches rfjakob TestEnc16 golden", () => {
  const eme = new EMECipher(new AESCipherBlock(new Uint8Array(32)))
  const out = eme.encrypt(new Uint8Array(16), new Uint8Array(16))
  assert.equal(hex(out), V.eme.enc16_out)
})

test("EME encrypt 2048B all-zero matches rfjakob TestEnc2048 golden", () => {
  const eme = new EMECipher(new AESCipherBlock(new Uint8Array(32)))
  const out = eme.encrypt(new Uint8Array(16), new Uint8Array(2048))
  assert.equal(hex(out), V.eme.enc2048_out)
})

test("EME decrypt reverses encrypt at many lengths", () => {
  const key = fromHex(
    "000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f",
  )
  const eme = new EMECipher(new AESCipherBlock(key))
  for (const len of [16, 32, 48, 64, 128, 240, 1024, 2048]) {
    const tweak = fromHex("0f0e0d0c0b0a09080706050403020100")
    const data = new Uint8Array(len)
    for (let i = 0; i < len; i++) data[i] = (i * 31 + 7) & 0xff
    const ct = eme.encrypt(tweak, data)
    assert.equal(ct.length, len)
    assert.notEqual(hex(ct), hex(data), `no-op at len=${len}`)
    const pt = eme.decrypt(tweak, ct)
    assert.equal(hex(pt), hex(data), `roundtrip failed at len=${len}`)
  }
})

test("EME is deterministic for identical key/tweak/input", () => {
  const eme = new EMECipher(new AESCipherBlock(new Uint8Array(32)))
  const tweak = new Uint8Array(16)
  const data = new Uint8Array(64).fill(0xab)
  assert.equal(hex(eme.encrypt(tweak, data)), hex(eme.encrypt(tweak, data)))
})

test("EME rejects invalid tweak or data lengths", () => {
  const eme = new EMECipher(new AESCipherBlock(new Uint8Array(32)))
  assert.throws(() => eme.encrypt(new Uint8Array(8), new Uint8Array(16)))
  assert.throws(() => eme.encrypt(new Uint8Array(16), new Uint8Array(15)))
  assert.throws(() => eme.encrypt(new Uint8Array(16), new Uint8Array(0)))
  assert.throws(() => eme.encrypt(new Uint8Array(16), new Uint8Array(2064)))
})

// ---------------------------------------------------------------------------
// PKCS7 (rclone crypt name padding)
// ---------------------------------------------------------------------------
test("pkcs7Pad/pkcs7Unpad roundtrip and pad shape", () => {
  for (let len = 1; len <= 33; len++) {
    const data = new Uint8Array(len)
    for (let i = 0; i < len; i++) data[i] = (i * 13 + 5) & 0xff
    const padded = pkcs7Pad(data, 16)
    assert.equal(padded.length % 16, 0, `padded len for ${len}`)
    assert.ok(
      padded.length - len >= 1 && padded.length - len <= 16,
      `pad amount for ${len}`,
    )
    assert.equal(hex(pkcs7Unpad(padded)), hex(data), `roundtrip ${len}`)
  }
  // full block of padding appended when input is block-aligned
  assert.equal(pkcs7Pad(new Uint8Array(16), 16).length, 32)
})

test("pkcs7Unpad rejects invalid padding", () => {
  assert.throws(() => pkcs7Unpad(new Uint8Array(16))) // last byte 0
  const bad = new Uint8Array(16)
  bad.fill(3, 0, 16) // claims 3 bytes of pad but bytes inconsistent? all 3 -> valid; make inconsistent:
  bad[15] = 5
  bad[12] = 5
  bad[13] = 5
  bad[14] = 4
  assert.throws(() => pkcs7Unpad(bad))
})

// ---------------------------------------------------------------------------
// Filename encodings + segment goldens (cipher_test.go, empty password ->
// all-zero nameKey/nameTweak, so vectors cover PKCS7+EME+encoding end to end)
// ---------------------------------------------------------------------------
for (const enc of ["base32", "base64", "base32768"] as FileNameEncoding[]) {
  test(`encryptSegment/decryptSegment goldens (${enc})`, () => {
    const zero = new Uint8Array(32)
    const tweak = new Uint8Array(16)
    let ok = true
    for (const [plain, want] of V[enc] as [string, string][]) {
      const got = encryptSegment(zero, tweak, enc, plain)
      if (got !== want) {
        ok = false
        console.log(
          `  enc ${enc} ${JSON.stringify(plain)}: got ${JSON.stringify(got)} want ${JSON.stringify(want)}`,
        )
      }
      const back = decryptSegment(zero, tweak, enc, want)
      if (back !== plain) {
        ok = false
        console.log(
          `  dec ${enc} ${JSON.stringify(want)}: got ${JSON.stringify(back)}`,
        )
      }
    }
    assert.ok(ok)
    assert.equal((V[enc] as [string, string][]).length, 17)
  })
}

test("segment encoding is deterministic for the same name", () => {
  const zero = new Uint8Array(32)
  const tweak = new Uint8Array(16)
  assert.equal(
    encryptSegment(zero, tweak, "base64", "hello world.txt"),
    encryptSegment(zero, tweak, "base64", "hello world.txt"),
  )
})

test("segment decrypt error semantics match rclone", () => {
  const zero = new Uint8Array(32)
  const tweak = new Uint8Array(16)
  // trailing '=' is rejected by the base32 decoder
  assert.throws(
    () => decryptSegment(zero, tweak, "base32", "p0e52nreeaj0a5ea7s64m4j72="),
    /bad base32 filename encoding/,
  )
  // 17-byte ciphertext is not a multiple of the 16-byte block size
  const odd = encodeFileName("base32", new Uint8Array(17))
  assert.throws(
    () => decryptSegment(zero, tweak, "base32", odd),
    /not a multiple of blocksize/,
  )
  // >2048-byte ciphertext is rejected
  const huge = encodeFileName("base32", new Uint8Array(2064))
  assert.throws(
    () => decryptSegment(zero, tweak, "base32", huge),
    /too long after base32 decode/,
  )
  // corrupted segment cannot be decrypted (decode or PKCS7 unpad fails)
  const good = encryptSegment(zero, tweak, "base32", "1")
  const mid = good.length >> 1
  const corrupted =
    good.slice(0, mid) + (good[mid] === "a" ? "b" : "a") + good.slice(mid + 1)
  assert.notEqual(corrupted, good)
  assert.throws(() => decryptSegment(zero, tweak, "base32", corrupted))
})

test("encodeFileName/decodeFileName roundtrip at all lengths", () => {
  for (const enc of ["base32", "base64", "base32768"] as FileNameEncoding[]) {
    for (let len = 1; len <= 40; len++) {
      const data = new Uint8Array(len)
      for (let i = 0; i < len; i++) data[i] = (i * 17 + 3) & 0xff
      assert.equal(
        hex(decodeFileName(enc, encodeFileName(enc, data))),
        hex(data),
        `${enc} len=${len}`,
      )
    }
  }
})

// ---------------------------------------------------------------------------
// Version strings (rclone lib/version): strip before encrypt/decrypt of the
// last segment, restore after; restore inserts before the extension.
// ---------------------------------------------------------------------------
const stamp = { y: 2001, mo: 2, d: 3, h: 4, mi: 5, s: 6, ms: 123 }

test("matchVersion/removeVersion/addVersion basics", () => {
  assert.ok(matchVersion("a-v2001-02-03-040506-123"))
  assert.ok(!matchVersion("hello"))
  const r = removeVersion("123-v2001-02-03-040506-123.txt")
  assert.equal(r.without, "123.txt")
  assert.deepEqual(r.stamp, stamp)
  assert.equal(
    addVersion(r.without, r.stamp!),
    "123-v2001-02-03-040506-123.txt",
  )
  // no version -> unchanged
  const n = removeVersion("53.!!lipps")
  assert.equal(n.stamp, null)
  assert.equal(n.without, "53.!!lipps")
})

test("version handling follows Go time.Parse validation", () => {
  // Feb 29 only in leap years (verified against Go time.Parse)
  assert.equal(removeVersion("x-v2024-02-29-120000-000").without, "x")
  assert.equal(
    removeVersion("x-v2023-02-29-120000-000").without,
    "x-v2023-02-29-120000-000",
  )
  assert.equal(
    removeVersion("x-v2023-02-30-120000-000").without,
    "x-v2023-02-30-120000-000",
  )
  assert.equal(
    removeVersion("x-v2023-13-01-120000-000").without,
    "x-v2023-13-01-120000-000",
  )
  assert.equal(
    removeVersion("x-v2023-01-01-240000-000").without,
    "x-v2023-01-01-240000-000",
  )
  assert.equal(
    removeVersion("x-v2023-01-01-120060-000").without,
    "x-v2023-01-01-120060-000",
  )
  // ms up to 999 passes
  assert.equal(removeVersion("x-v2023-01-01-120000-999").without, "x")
  // dot-file splitExt edge: extension becomes the whole name, version sits in "base"
  const d = removeVersion(".file-v2001-02-03-040506-123")
  assert.equal(d.without, ".file")
  assert.deepEqual(d.stamp, stamp)
})

test("normalizeEncryptedSuffix matches rclone setEncryptedSuffix", () => {
  assert.equal(normalizeEncryptedSuffix("none"), "")
  assert.equal(normalizeEncryptedSuffix("NONE"), "")
  assert.equal(normalizeEncryptedSuffix(".jpg"), ".jpg")
  assert.equal(normalizeEncryptedSuffix("jpg"), ".jpg") // missing dot is added
  assert.equal(normalizeEncryptedSuffix(""), ".")
})

// ---------------------------------------------------------------------------
// High-level name API (cipher.go EncryptFileName/DecryptFileName/
// EncryptDirName/DecryptDirName + TestNonStandardDecryptFileName)
// ---------------------------------------------------------------------------
const zeroKey = new Uint8Array(32)
const zeroTweak = new Uint8Array(16)
const mk = (
  mode: "off" | "standard" | "obfuscate",
  opts: Partial<ConstructorParameters<typeof NameCipher>[0]> = {},
) =>
  new NameCipher({
    nameKey: zeroKey,
    nameTweak: zeroTweak,
    mode,
    dirNameEncrypt: true,
    filenameEncoding: "base32",
    encryptedSuffix: ".bin",
    ...opts,
  })

test("off mode appends the suffix on encrypt and strips it on decrypt", () => {
  const c = mk("off")
  assert.equal(c.encryptFileName("1/12/123"), "1/12/123.bin")
  assert.equal(c.decryptFileName("1/12/123.bin"), "1/12/123")
  assert.equal(c.encryptDirName("1/12"), "1/12") // dirs keep their name
  // custom suffix
  const jpg = mk("off", { encryptedSuffix: ".jpg" })
  assert.equal(jpg.encryptFileName("1/12/123"), "1/12/123.jpg")
  assert.equal(jpg.decryptFileName("1/12/123.jpg"), "1/12/123")
  // "none" -> no suffix at all
  const bare = mk("off", { encryptedSuffix: normalizeEncryptedSuffix("none") })
  assert.equal(bare.encryptFileName("1/12/123"), "1/12/123")
  assert.equal(bare.decryptFileName("1/12/123"), "1/12/123")
})

test("off mode decrypt error semantics match TestNonStandardDecryptFileName", () => {
  const c = mk("off")
  assert.throws(
    () => c.decryptFileName("1/12/123.bix"),
    /not an encrypted file - does not match suffix/,
  )
  assert.throws(
    () => c.decryptFileName(".bin"),
    /not an encrypted file - does not match suffix/,
  )
})

for (const enc of ["base32", "base64", "base32768"] as FileNameEncoding[]) {
  test(`standard mode versioned goldens (${enc})`, () => {
    const c = mk("standard", { filenameEncoding: enc })
    for (const [plain, want] of V.versioned[`standard_${enc}`] as [
      string,
      string,
    ][]) {
      assert.equal(
        c.encryptFileName(plain),
        want,
        `enc ${JSON.stringify(plain)}`,
      )
      assert.equal(
        c.decryptFileName(want),
        plain,
        `dec ${JSON.stringify(want)}`,
      )
    }
    const dn = mk("standard", { filenameEncoding: enc, dirNameEncrypt: false })
    for (const [plain, want] of V.versioned[`standard_${enc}_dirnameoff`] as [
      string,
      string,
    ][]) {
      assert.equal(
        dn.encryptFileName(plain),
        want,
        `enc-off ${JSON.stringify(plain)}`,
      )
      assert.equal(
        dn.decryptFileName(want),
        plain,
        `dec-off ${JSON.stringify(want)}`,
      )
    }
  })
}

test("standard mode decrypt is case-insensitive for base32", () => {
  const c = mk("standard", { filenameEncoding: "base32" })
  assert.equal(c.decryptFileName("P0E52NREEAJ0A5EA7S64M4J72S"), "1")
})

test("standard mode path decrypt error semantics", () => {
  const c = mk("standard", { filenameEncoding: "base32" })
  // one extra byte in front -> not a multiple of blocksize
  assert.throws(
    () =>
      c.decryptFileName(
        encodeFileName("base32", new Uint8Array([1])) +
          "/p0e52nreeaj0a5ea7s64m4j72s",
      ),
    /not a multiple of blocksize/,
  )
})

test("obfuscate mode versioned goldens (dirNameEncrypt on/off)", () => {
  const c = mk("obfuscate")
  for (const [plain, want] of V.versioned.obfuscate as [string, string][]) {
    assert.equal(c.encryptFileName(plain), want, `enc ${JSON.stringify(plain)}`)
    assert.equal(c.decryptFileName(want), plain, `dec ${JSON.stringify(want)}`)
  }
  const dn = mk("obfuscate", { dirNameEncrypt: false })
  for (const [plain, want] of V.versioned.obfuscate_dirnameoff as [
    string,
    string,
  ][]) {
    assert.equal(
      dn.encryptFileName(plain),
      want,
      `enc-off ${JSON.stringify(plain)}`,
    )
    assert.equal(
      dn.decryptFileName(want),
      plain,
      `dec-off ${JSON.stringify(want)}`,
    )
  }
})

test("obfuscate mode decrypt matches TestNonStandardDecryptFileName rows", () => {
  const c = mk("obfuscate")
  assert.equal(c.decryptFileName("!.hello"), "hello")
  assert.throws(() => c.decryptFileName("hello"), /not an encrypted file/)
  assert.equal(c.decryptFileName("161.ä"), "¡")
  assert.equal(c.decryptFileName("160.ς"), "Π")
  const dn = mk("obfuscate", { dirNameEncrypt: false })
  assert.equal(dn.decryptFileName("1/12/123/53.!!lipps"), "1/12/123/!hello")
  assert.equal(
    dn.decryptFileName("1/12/123/53-v2001-02-03-040506-123.!!lipps"),
    "1/12/123/!hello-v2001-02-03-040506-123",
  )
})

test("TestVersionedDirName semantics for both modes", () => {
  const dir = "dir-v2001-02-03-040506-123"
  for (const mode of ["standard", "obfuscate"] as const) {
    const c = mk(mode)
    const encryptedDir = c.encryptDirName(dir)
    const encryptedFile = c.encryptFileName(`${dir}/file.txt`)
    assert.equal(
      encryptedDir,
      encryptedFile.split("/").slice(0, -1).join("/"),
      `${mode}: dirname agrees`,
    )
    assert.equal(c.decryptDirName(encryptedDir), dir, `${mode}: dir roundtrip`)
    const encFileSame = c.encryptFileName(dir)
    assert.notEqual(encryptedDir, encFileSame, `${mode}: file form differs`)
    assert.ok(
      encFileSame.includes("-v2001-02-03-040506-123"),
      `${mode}: version kept plain`,
    )
    assert.equal(c.decryptFileName(encFileSame), dir, `${mode}: file roundtrip`)
    // legacy dir name (file form) still decrypts via fallback
    assert.equal(c.decryptDirName(encFileSame), dir, `${mode}: legacy fallback`)
    // bad in both forms -> error
    assert.throws(
      () => c.decryptDirName("!!!-v2001-02-03-040506-123"),
      String(mode),
    )
  }
})

test("EncryptDirName passthrough rules", () => {
  assert.equal(mk("off").encryptDirName("a/b"), "a/b")
  assert.equal(
    mk("standard", { dirNameEncrypt: false }).encryptDirName("a/b"),
    "a/b",
  )
  assert.notEqual(mk("standard").encryptDirName("a/b"), "a/b")
})
