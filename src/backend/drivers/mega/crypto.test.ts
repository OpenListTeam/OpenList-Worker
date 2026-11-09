import assert from "node:assert/strict"
import crypto from "node:crypto"
import test from "node:test"
import {
  aesCbcDecrypt,
  aesCbcEncrypt,
  aesEcbDecrypt,
  aesEcbEncrypt,
  b64ToBytes,
  bytesToB64Url,
  decodeMegaPrivateKey,
  decryptSessionId,
  encodeMpi,
  nodeCipherKey,
  prepareKey,
  prepareKeyV2,
  stringhash,
  utf8ToBytes,
} from "./crypto"

function nodeAes(
  mode: "ecb" | "cbc",
  operation: "encrypt" | "decrypt",
  key: Buffer,
  data: Buffer,
  iv?: Buffer,
): Buffer {
  const factory =
    operation === "encrypt" ? crypto.createCipheriv : crypto.createDecipheriv
  const cipher = factory(`aes-128-${mode}`, key, iv || Buffer.alloc(0))
  cipher.setAutoPadding(false)
  return Buffer.concat([cipher.update(data), cipher.final()])
}

function nodePrepareKey(password: string): Buffer {
  let pkey: Buffer = Buffer.from([
    147, 196, 103, 227, 125, 176, 199, 164, 209, 190, 63, 129, 1, 82, 203, 86,
  ])
  const pw = Buffer.from(password)
  for (let round = 65536; round--; ) {
    for (let j = 0; j < pw.length; j += 16) {
      const key = Buffer.alloc(16)
      for (let i = 0; i < 16; i += 4) {
        if (i + j < pw.length) pw.copy(key, i, i + j, i + j + 4)
      }
      pkey = nodeAes("ecb", "encrypt", key, pkey)
    }
  }
  return pkey
}

function nodeStringHash(value: string, key: Buffer): Buffer {
  const input = Buffer.from(value)
  const words = [0, 0, 0, 0]
  for (let i = 0; i < input.length; i += 4) {
    if (input.length - i < 4) {
      const rest = input.length - i
      words[(i / 4) & 3] ^= input.readIntBE(i, rest) << ((4 - rest) * 8)
    } else {
      words[(i / 4) & 3] ^= input.readInt32BE(i)
    }
  }
  let hash: Buffer = Buffer.alloc(16)
  for (let i = 0; i < 4; i++) hash.writeInt32BE(words[i], i * 4)
  const cipher = crypto.createCipheriv("aes-128-ecb", key, Buffer.alloc(0))
  for (let i = 16384; i--; ) hash = cipher.update(hash)
  return hash
}

test("AES-ECB / AES-CBC match the runtime implementation", () => {
  const key = crypto.randomBytes(16)
  const plain = crypto.randomBytes(64)
  const iv = crypto.randomBytes(16)

  const ecb = aesEcbEncrypt(key, plain)
  assert.deepEqual(Buffer.from(ecb), nodeAes("ecb", "encrypt", key, plain))
  assert.deepEqual(Buffer.from(aesEcbDecrypt(key, ecb)), plain)

  const cbc = aesCbcEncrypt(key, iv, plain)
  assert.deepEqual(Buffer.from(cbc), nodeAes("cbc", "encrypt", key, plain, iv))
  assert.deepEqual(Buffer.from(aesCbcDecrypt(key, iv, cbc)), plain)
})

test("prepareKey implements the 65536 round MEGA derivation", () => {
  for (const password of ["password123", "correct horse battery staple!"]) {
    const expected = nodePrepareKey(password)
    assert.deepEqual(Buffer.from(prepareKey(password)), expected)
  }
})

test("stringhash produces the MEGA v1 user handle", () => {
  const userKey = prepareKey("password123")
  const expected = nodeStringHash("test@example.com", Buffer.from(userKey))
  const actual = stringhash("test@example.com", userKey)
  assert.deepEqual(Buffer.from(actual), expected)
  assert.equal(bytesToB64Url(actual), "jNU3r9rZg4C2B6ywq7xwEw")
})

test("prepareKeyV2 matches PBKDF2-SHA512 with the account salt", async () => {
  const salt = crypto.randomBytes(16)
  const expected = crypto.pbkdf2Sync("password123", salt, 100_000, 32, "sha512")
  const actual = await prepareKeyV2("password123", new Uint8Array(salt))
  assert.deepEqual(Buffer.from(actual), expected)
})

test("node key and attributes round-trip", () => {
  const masterKey = crypto.randomBytes(16)
  const folderKey = crypto.randomBytes(16)
  const storedKey = aesEcbEncrypt(masterKey, folderKey)
  const decryptedKey = aesEcbDecrypt(masterKey, storedKey)
  assert.deepEqual(Buffer.from(decryptedKey), folderKey)

  const attributes = Buffer.from('MEGA{"n":"测试目录"}')
  const padded = Buffer.alloc(Math.ceil(attributes.length / 16) * 16)
  attributes.copy(padded)
  const encrypted = aesCbcEncrypt(
    nodeCipherKey(decryptedKey),
    new Uint8Array(16),
    padded,
  )
  const plain = aesCbcDecrypt(
    nodeCipherKey(folderKey),
    new Uint8Array(16),
    encrypted,
  )
  let end = 0
  while (end < plain.length && plain[end] !== 0) end++
  assert.equal(
    new TextDecoder().decode(plain.subarray(0, end)),
    'MEGA{"n":"测试目录"}',
  )
})

function parseDer(
  buffer: Buffer,
  offset: number,
): { value: Buffer; next: number } {
  let length = buffer[offset + 1]
  let cursor = offset + 2
  if (length & 0x80) {
    const count = length & 0x7f
    length = 0
    for (let i = 0; i < count; i++) length = (length << 8) | buffer[cursor++]
  }
  return {
    value: buffer.subarray(cursor, cursor + length),
    next: cursor + length,
  }
}

function modPow(base: bigint, exponent: bigint, modulus: bigint): bigint {
  let result = 1n
  let b = base % modulus
  let e = exponent
  while (e > 0n) {
    if (e & 1n) result = (result * b) % modulus
    b = (b * b) % modulus
    e >>= 1n
  }
  return result
}

test("MEGA private key + csid decrypt to the session id", () => {
  const { privateKey } = crypto.generateKeyPairSync("rsa", {
    modulusLength: 2048,
  })
  const der = privateKey.export({ type: "pkcs1", format: "der" })
  const sequence = parseDer(der, 0)
  const integers: bigint[] = []
  let cursor = 0
  while (cursor < sequence.value.length) {
    const item = parseDer(sequence.value, cursor)
    integers.push(BigInt(`0x${item.value.toString("hex") || "0"}`))
    cursor = item.next
  }
  const [, n, e, d, p, q] = integers
  assert.equal(p * q, n)

  const sidBytes = crypto.randomBytes(43)
  const cipher = modPow(BigInt(`0x${sidBytes.toString("hex")}`), e, n)
  const csid = encodeMpi(cipher)

  const privk = Buffer.concat([
    encodeMpi(p),
    encodeMpi(q),
    encodeMpi(d),
    encodeMpi(0n),
  ])
  const key = decodeMegaPrivateKey(new Uint8Array(privk))
  assert.equal(key.p, p)
  assert.equal(key.q, q)
  assert.equal(decryptSessionId(key, csid), sidBytes.toString("base64url"))
  assert.equal(b64ToBytes(sidBytes.toString("base64url")).length, 43)
  assert.equal(utf8ToBytes("fixture").length, 7)
})
