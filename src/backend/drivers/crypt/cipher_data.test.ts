import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import { nonceAdd, nonceIncrement } from "./vendor/rclone-core"
import {
  calculateUnderlying,
  decryptBlockSlice,
  decryptData,
  decryptDataRange,
  decryptedSize,
  encryptData,
  encryptedSize,
} from "./data"

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

const zeroKey = new Uint8Array(32)
const MAGIC_HEX = "52434c4f4e450000" // "RCLONE\0\0"

// rclone cipher_test.go TestEncryptedSize (values from the Go table)
test("encryptedSize/decryptedSize match TestEncryptedSize and reverse", () => {
  const rows: [number, number][] = [
    [0, 32],
    [1, 32 + 16 + 1],
    [65536, 32 + 16 + 65536],
    [65537, 32 + 16 + 65536 + 16 + 1],
    [1 << 20, 32 + 16 * (16 + 65536)],
    [(1 << 20) + 65535, 32 + 16 * (16 + 65536) + 16 + 65535],
    [1 << 30, 32 + 16384 * (16 + 65536)],
    [2 ** 40 + 1, 32 + 16777216 * (16 + 65536) + 16 + 1],
  ]
  for (const [plain, enc] of rows) {
    assert.equal(encryptedSize(plain), enc, `enc(${plain})`)
    assert.equal(decryptedSize(enc), plain, `dec(${enc})`)
  }
})

test("decryptedSize error semantics match TestDecryptedSize", () => {
  for (const bad of [0, 1, 7]) {
    assert.throws(
      () => decryptedSize(bad),
      /file is too short to be encrypted/,
      `dec(${bad})`,
    )
  }
  for (const bad of [33, 48, 32 + 16 + 65536 + 1, 32 + 16 + 65536 + 16]) {
    assert.throws(
      () => decryptedSize(bad),
      /file has truncated block header/,
      `dec(${bad})`,
    )
  }
})

// rclone cipher_test.go TestEncryptData: zero dataKey, deterministic nonce
test("encryptData goldens file0/file1/file16 (TestEncryptData)", () => {
  const nonceHex = String(V.data.nonce).toLowerCase()
  const enc1 = encryptData(zeroKey, new Uint8Array([1]), fromHex(V.data.nonce))
  assert.equal(
    hex(enc1),
    MAGIC_HEX + nonceHex + String(V.data.file1_ct).toLowerCase(),
  )
  const enc16 = encryptData(
    zeroKey,
    Uint8Array.from({ length: 16 }, (_, i) => i + 1),
    fromHex(V.data.nonce),
  )
  assert.equal(
    hex(enc16),
    MAGIC_HEX + nonceHex + String(V.data.file16_ct).toLowerCase(),
  )
  // empty plaintext -> header only
  const enc0 = encryptData(zeroKey, new Uint8Array(0), fromHex(V.data.nonce))
  assert.equal(hex(enc0), MAGIC_HEX + nonceHex)
  assert.equal(enc0.length, 32)
})

test("encryptData writes RCLONE magic + 24B nonce header", () => {
  const nonce = new Uint8Array(24)
  for (let i = 0; i < 24; i++) nonce[i] = i + 1
  const enc = encryptData(zeroKey, new Uint8Array(5), nonce)
  assert.equal(hex(enc.subarray(0, 8)), MAGIC_HEX)
  assert.equal(hex(enc.subarray(8, 32)), hex(nonce))
})

test("encryptData/decryptData roundtrip across block boundaries", () => {
  for (const len of [0, 1, 16, 100, 65535, 65536, 65537, 70000, 131072]) {
    const pt = new Uint8Array(len)
    for (let i = 0; i < len; i++) pt[i] = (i * 7 + 13) & 0xff
    const enc = encryptData(zeroKey, pt, fromHex(V.data.nonce))
    assert.equal(enc.length, encryptedSize(len), `size ${len}`)
    const dec = decryptData(zeroKey, enc)
    assert.equal(dec.length, len, `len ${len}`)
    assert.equal(hex(dec), hex(pt), `roundtrip ${len}`)
  }
})

test("encryptData does not mutate the caller's nonce", () => {
  const nonce = fromHex(V.data.nonce)
  const before = hex(nonce)
  encryptData(zeroKey, new Uint8Array(70000), nonce)
  assert.equal(hex(nonce), before)
})

test("decryptData error semantics match rclone", () => {
  assert.throws(
    () => decryptData(zeroKey, new Uint8Array(31)),
    /file is too short to be encrypted/,
  )
  const bad = encryptData(
    zeroKey,
    new Uint8Array([1, 2, 3]),
    fromHex(V.data.nonce),
  )
  const badMagic = bad.slice()
  badMagic[0] = 0x58
  assert.throws(() => decryptData(zeroKey, badMagic), /bad magic string/)
  // truncated block: valid magic + 10 bytes of a block
  const trunc = new Uint8Array(42)
  trunc.set(fromHex(MAGIC_HEX), 0)
  assert.throws(() => decryptData(zeroKey, trunc), /truncated block header/)
  // corrupted block fails authentication
  const corrupt = bad.slice()
  corrupt[corrupt.length - 1] = (corrupt[corrupt.length - 1]! ^ 0xff) & 0xff
  assert.throws(() => decryptData(zeroKey, corrupt), /failed to authenticate/)
})

// nonce arithmetic (rclone cipher.go nonce.carry/increment/add)
test("nonceIncrement is a 24-byte little-endian +1 with carry", () => {
  const n = new Uint8Array(24)
  nonceIncrement(n)
  assert.equal(hex(n), "01" + "00".repeat(23))
  const wrap = new Uint8Array(24).fill(0xff)
  nonceIncrement(wrap)
  assert.equal(hex(wrap), "00".repeat(24))
  const chain = new Uint8Array(24)
  chain[0] = 0xff
  chain[1] = 0xff
  nonceIncrement(chain)
  assert.equal(hex(chain.subarray(0, 4)), "00000100")
})

test("nonceAdd matches BigInt little-endian addition (Go nonce.add)", () => {
  let seed = 0x1234abcd
  const rndByte = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff
    return (seed >> 16) & 0xff
  }
  const toBig = (n: Uint8Array) => {
    let v = 0n
    for (let i = n.length - 1; i >= 0; i--) v = (v << 8n) | BigInt(n[i]!)
    return v
  }
  const fromBig = (v: bigint) => {
    const out = new Uint8Array(24)
    for (let i = 0; i < 24; i++) {
      out[i] = Number(v & 0xffn)
      v >>= 8n
    }
    return out
  }
  for (const x of [1, 255, 256, 65536, 2 ** 32, 2 ** 40 + 7]) {
    for (let t = 0; t < 20; t++) {
      const n = new Uint8Array(24)
      for (let i = 0; i < 24; i++) n[i] = rndByte()
      const expect = fromBig((toBig(n) + BigInt(x)) % (1n << 192n))
      nonceAdd(x, n)
      assert.equal(hex(n), hex(expect), `add ${x}`)
    }
  }
})

// ---------------------------------------------------------------------------
// Range decryption (cipher.go calculateUnderlying + decrypter RangeSeek)
// ---------------------------------------------------------------------------
test("calculateUnderlying matches Go goldens", () => {
  const rows: [number, number, number, number, number, number][] = [
    // offset, limit, underlyingOffset, underlyingLimit, discard, blocks
    [0, -1, 32, -1, 0, 0],
    [0, 100, 32, 65552, 0, 0],
    [1000, 2000, 32, 65552, 1000, 0],
    [65536, 65536, 65584, 65552, 0, 1],
    [65530, 100, 32, 131104, 65530, 0],
    [70000, -1, 65584, -1, 4464, 1],
    [70000, 100000, 65584, 131104, 4464, 1],
    [131071, 2, 65584, 131104, 65535, 1],
    [100000, 50000, 65584, 131104, 34464, 1],
  ]
  for (const [offset, limit, uo, ul, d, b] of rows) {
    assert.deepEqual(
      calculateUnderlying(offset, limit),
      { underlyingOffset: uo, underlyingLimit: ul, discard: d, blocks: b },
      `offset=${offset} limit=${limit}`,
    )
  }
})

test("decryptDataRange equals full-decrypt slice at many offsets", () => {
  const pt = new Uint8Array(140000)
  for (let i = 0; i < pt.length; i++) pt[i] = (i * 11 + 5) & 0xff
  const enc = encryptData(zeroKey, pt, fromHex(V.data.nonce))
  const full = decryptData(zeroKey, enc)
  const cases: [number, number][] = [
    [0, 100],
    [0, -1],
    [1000, 2000],
    [65530, 100],
    [65536, 65536],
    [70000, -1],
    [70000, 100000],
    [131071, 2],
    [100000, 50000],
    [0, 140000],
    [139999, 1],
  ]
  for (const [offset, limit] of cases) {
    const got = decryptDataRange(zeroKey, enc, offset, limit)
    const end = limit < 0 ? full.length : Math.min(offset + limit, full.length)
    assert.equal(
      got.length,
      end - offset,
      `len offset=${offset} limit=${limit}`,
    )
    assert.equal(
      hex(got),
      hex(full.subarray(offset, end)),
      `slice offset=${offset} limit=${limit}`,
    )
  }
})

test("decryptBlockSlice decrypts a Range fetch without the rest of the file", () => {
  // simulate a Range fetch: only the underlying bytes are available
  const pt = new Uint8Array(200000)
  for (let i = 0; i < pt.length; i++) pt[i] = (i * 13 + 7) & 0xff
  const enc = encryptData(zeroKey, pt, fromHex(V.data.nonce))
  const spec = calculateUnderlying(70000, 50000)
  const uStart = spec.underlyingOffset
  const uEnd =
    spec.underlyingLimit < 0 ? enc.length : uStart + spec.underlyingLimit
  const fetched = enc.subarray(uStart, Math.min(uEnd, enc.length))
  const got = decryptBlockSlice(
    zeroKey,
    fromHex(V.data.nonce),
    spec.blocks,
    spec.discard,
    50000,
    fetched,
  )
  assert.equal(hex(got), hex(pt.subarray(70000, 120000)))
  // to-EOF form: count < 0 reads the fetched slice to the end
  const spec2 = calculateUnderlying(70000, -1)
  const fetched2 = enc.subarray(spec2.underlyingOffset)
  const got2 = decryptBlockSlice(
    zeroKey,
    fromHex(V.data.nonce),
    spec2.blocks,
    spec2.discard,
    -1,
    fetched2,
  )
  assert.equal(hex(got2), hex(pt.subarray(70000)))
})
