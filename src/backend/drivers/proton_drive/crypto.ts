// ProtonDrive cryptography helpers built on top of openpgp (v6).
//
// Proton's trust chain:
//   user private key  (unlocked with saltedKeyPass)
//     └─ address private keys (unlocked with token decrypted by user key,
//                              or directly by saltedKeyPass for legacy keys)
//           └─ share private key (unlocked with passphrase decrypted by addr key)
//                 └─ root node key  (unlocked with NodePassphrase decrypted by share key)
//                       └─ child node keys (unlocked with NodePassphrase decrypted by parent key)
//                             └─ file name / content session key
//
// NOTE: saltedKeyPass is the bcrypt(password, keySalt) digest (printable ASCII),
// so it can be safely passed to openpgp as a string passphrase.

import * as openpgp from "openpgp"
import bcrypt from "bcryptjs"

export type KeyRing = openpgp.PrivateKey[]

// bcrypt uses its own base64 alphabet.
const BCRYPT_CHARS =
  "./ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"

function bytesToBcryptBase64(bytes: Uint8Array): string {
  let out = ""
  let bits = 0
  let acc = 0
  for (const b of bytes) {
    acc = (acc << 8) | b
    bits += 8
    while (bits >= 6) {
      bits -= 6
      out += BCRYPT_CHARS[(acc >> bits) & 0x3f]
    }
  }
  if (bits > 0) out += BCRYPT_CHARS[(acc << (6 - bits)) & 0x3f]
  return out
}

function fromBase64(s: string): Uint8Array {
  const bin = atob(s)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

export function toBase64(bytes: Uint8Array): string {
  let bin = ""
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin)
}

async function sha256(data: Uint8Array): Promise<Uint8Array> {
  return new Uint8Array(await crypto.subtle.digest("SHA-256", data as BufferSource))
}

/**
 * Derive the salted key passphrase used to unlock Proton private keys.
 * This is bcrypt(password, keySalt, cost=10); the raw 31-char bcrypt digest
 * (printable ASCII) is used as the OpenPGP passphrase string.
 */
export function deriveSaltedKeyPass(password: string, keySaltBase64: string): string {
  const saltBytes = fromBase64(keySaltBase64)
  const saltChars = bytesToBcryptBase64(saltBytes).padEnd(22, ".")
  const fullSalt = `$2a$10$${saltChars}`
  const fullHash = bcrypt.hashSync(password, fullSalt)
  // fullHash = $2a$10$<22 salt><31 digest>
  return fullHash.slice(fullSalt.length)
}

/** Unlock a single armored private key with a passphrase. */
export async function unlockPrivateKey(
  armoredKey: string,
  passphrase: string,
): Promise<openpgp.PrivateKey> {
  const key = await openpgp.readPrivateKey({ armoredKey })
  return openpgp.decryptKey({ privateKey: key, passphrase })
}

/** Read an armored public key. */
export async function readPublicKey(armoredKey: string): Promise<openpgp.PublicKey> {
  return openpgp.readKey({ armoredKey })
}

/** Decrypt an armored OpenPGP message into UTF-8 text using a keyring. */
export async function decryptArmoredText(
  armored: string,
  keyRing: KeyRing,
): Promise<string> {
  const message = await openpgp.readMessage({ armoredMessage: armored })
  const { data } = await openpgp.decrypt({
    message,
    decryptionKeys: keyRing,
    format: "utf8",
  })
  return data as string
}

/** Decrypt an armored OpenPGP message into bytes using a keyring. */
export async function decryptArmoredBinary(
  armored: string,
  keyRing: KeyRing,
): Promise<Uint8Array> {
  const message = await openpgp.readMessage({ armoredMessage: armored })
  const { data } = await openpgp.decrypt({
    message,
    decryptionKeys: keyRing,
    format: "binary",
  })
  return data as Uint8Array
}

/** Encrypt UTF-8 text into an armored OpenPGP message for the given keys. */
export async function encryptText(
  text: string,
  encryptionKeys: openpgp.Key[],
  signingKey?: openpgp.PrivateKey,
): Promise<string> {
  const message = await openpgp.createMessage({ text })
  return openpgp.encrypt({
    message,
    encryptionKeys,
    signingKeys: signingKey ? [signingKey] : undefined,
    format: "armored",
  }) as unknown as string
}

/**
 * Proton name hash: base64(SHA-256(plaintext name)).
 * Used for dedup / rename / move bookkeeping.
 */
export async function getNameHash(name: string): Promise<string> {
  const bytes = await sha256(new TextEncoder().encode(name))
  return toBase64(bytes)
}

/**
 * Decrypt a detached session key (e.g. a file's ContentKeyPacket) with a keyring.
 * The ContentKeyPacket is a public-key-encrypted session key packet.
 */
export async function decryptSessionKeyPacket(
  armoredKeyPacket: string,
  keyRing: KeyRing,
): Promise<openpgp.SessionKey> {
  const message = await openpgp.readMessage({ armoredMessage: armoredKeyPacket })
  const sessionKeys = await openpgp.decryptSessionKeys({
    message,
    decryptionKeys: keyRing,
  })
  if (!sessionKeys.length) {
    throw new Error("failed to decrypt session key")
  }
  return sessionKeys[0] as unknown as openpgp.SessionKey
}

/** Decrypt a binary OpenPGP message using an already-decrypted session key. */
export async function decryptBinaryWithSessionKey(
  binaryMessage: Uint8Array,
  sessionKeys: openpgp.SessionKey[],
): Promise<Uint8Array> {
  const message = await openpgp.readMessage({ binaryMessage })
  const { data } = await openpgp.decrypt({
    message,
    sessionKeys,
    format: "binary",
  })
  return data as Uint8Array
}

/** Generate a fresh random OpenPGP key pair (used for new node/content keys). */
export async function generateKeyPair(
  userIds: { name: string; email: string }[],
): Promise<{ privateKey: string; publicKey: string }> {
  return openpgp.generateKey({
    type: "ecc",
    curve: "curve25519Legacy",
    userIDs: userIds,
  })
}

/**
 * Decrypt a link's XAttr (base64 OpenPGP-encrypted protobuf) and extract the
 * decrypted file size (FileSystemAttr.Size, protobuf field 1 varint).
 * Falls back to 0 on any parse/decrypt failure.
 */
export async function decryptXAttrSize(
  xattrBase64: string,
  keyRing: KeyRing,
): Promise<number> {
  if (!xattrBase64) return 0
  try {
    const xattrBytes = fromBase64(xattrBase64)
    const message = await openpgp.readMessage({ binaryMessage: xattrBytes })
    const { data } = await openpgp.decrypt({
      message,
      decryptionKeys: keyRing,
      format: "binary",
    })
    return parseProtobufVarintSize(data as Uint8Array)
  } catch {
    return 0
  }
}

/** Minimal protobuf walker: extract field 1 (varint) = file size. */
function parseProtobufVarintSize(bytes: Uint8Array): number {
  let i = 0
  while (i < bytes.length) {
    const tag = bytes[i++]
    const fieldNum = tag >> 3
    const wireType = tag & 0x07
    if (wireType === 0) {
      let value = 0n
      let shift = 0n
      while (i < bytes.length) {
        const b = bytes[i++]
        value |= BigInt(b & 0x7f) << shift
        if ((b & 0x80) === 0) break
        shift += 7n
      }
      if (fieldNum === 1) return Number(value)
    } else if (wireType === 2) {
      let len = 0
      let shift = 0
      while (i < bytes.length) {
        const b = bytes[i++]
        len |= (b & 0x7f) << shift
        if ((b & 0x80) === 0) break
        shift += 7
      }
      i += len
    } else if (wireType === 1) {
      i += 8
    } else if (wireType === 5) {
      i += 4
    } else {
      break
    }
  }
  return 0
}
