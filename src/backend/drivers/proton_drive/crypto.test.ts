import test from "node:test"
import assert from "node:assert/strict"
import * as openpgp from "openpgp"
import {
  encryptText,
  decryptArmoredText,
  decryptArmoredBinary,
  unlockPrivateKey,
  decryptSessionKeyPacket,
  decryptBinaryWithSessionKey,
  toBase64,
} from "./crypto"

test("filename encrypt/decrypt roundtrip (unicode)", async () => {
  const { privateKey: armoredPriv, publicKey: armoredPub } =
    await openpgp.generateKey({
      type: "ecc",
      curve: "curve25519Legacy",
      userIDs: [{ name: "t", email: "t@example.com" }],
      passphrase: "pass",
    })
  const priv = await openpgp.readPrivateKey({ armoredKey: armoredPriv })
  const unlocked = await openpgp.decryptKey({ privateKey: priv, passphrase: "pass" })
  const pub = await openpgp.readKey({ armoredKey: armoredPub })

  const name = "我的文件 (副本).txt"
  const encrypted = await encryptText(name, [pub])
  const decrypted = await decryptArmoredText(encrypted, [unlocked])
  assert.equal(decrypted, name)
})

test("binary encrypt/decrypt roundtrip", async () => {
  const { privateKey: armoredPriv, publicKey: armoredPub } =
    await openpgp.generateKey({
      type: "ecc",
      curve: "curve25519Legacy",
      userIDs: [{ name: "t", email: "t@example.com" }],
    })
  const priv = await openpgp.readPrivateKey({ armoredKey: armoredPriv })
  const pub = await openpgp.readKey({ armoredKey: armoredPub })

  const data = new Uint8Array([0, 1, 2, 3, 255, 254, 128])
  const msg = await openpgp.createMessage({ binary: data })
  const armored = await openpgp.encrypt({
    message: msg,
    encryptionKeys: pub,
    format: "armored",
  })
  const decrypted = await decryptArmoredBinary(armored, [priv])
  assert.deepEqual(decrypted, data)
})

test("session key decrypt + binary decrypt chain", async () => {
  const { privateKey: armoredPriv, publicKey: armoredPub } =
    await openpgp.generateKey({
      type: "ecc",
      curve: "curve25519Legacy",
      userIDs: [{ name: "t", email: "t@example.com" }],
    })
  const priv = await openpgp.readPrivateKey({ armoredKey: armoredPriv })
  const pub = await openpgp.readKey({ armoredKey: armoredPub })

  const data = new Uint8Array([10, 20, 30, 40, 50])
  const msg = await openpgp.createMessage({ binary: data })
  const encrypted = await openpgp.encrypt({
    message: msg,
    encryptionKeys: pub,
    format: "binary",
  })
  const encMsg = await openpgp.readMessage({ binaryMessage: encrypted })
  const sessionKeys = await openpgp.decryptSessionKeys({
    message: encMsg,
    decryptionKeys: [priv],
  })
  assert.equal(sessionKeys.length, 1)
  const plain = await decryptBinaryWithSessionKey(
    encrypted,
    sessionKeys as unknown as openpgp.SessionKey[],
  )
  assert.deepEqual(plain, data)
})

test("unlockPrivateKey with wrong passphrase throws", async () => {
  const { privateKey: armoredPriv } = await openpgp.generateKey({
    type: "ecc",
    curve: "curve25519Legacy",
    userIDs: [{ name: "t", email: "t@example.com" }],
    passphrase: "correct",
  })
  await assert.rejects(() => unlockPrivateKey(armoredPriv, "wrong"))
})

test("toBase64 matches btoa", () => {
  assert.equal(toBase64(new Uint8Array([0x48, 0x69])), btoa("Hi"))
})
