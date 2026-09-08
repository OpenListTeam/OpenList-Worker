// Proton SRP-6a authentication (Secure Remote Password)
// Ported from ProtonMail webclient / go-srp semantics.
//
// Proton uses RFC 5054 3072-bit group with a few Proton-specific twists:
//  - g is fixed to 2
//  - the client proof uses XOR(H(N), H(g)) as the leading hash block
//  - authVersion >= 2 introduces the multiplier k = H(N | PAD(g))
//  - authVersion >= 2 derives x from a bcrypt-hashed password (not raw password)
//
// NOTE: This is a faithful port of the public protocol. The bcrypt salt
// encoding is Proton-specific and should be validated end-to-end against a
// real account before production rollout.

import bcrypt from "bcryptjs"

// RFC 5054 3072-bit group prime (N). We receive it from the server in
// /auth/info, so this fallback is only used defensively.
const RFC5054_3072_HEX =
  "FFFFFFFFFFFFFFFFC90FDAA22168C234C4C6628B80DC1CD1" +
  "29024E088A67CC74020BBEA63B139B22514A08798E3404DD" +
  "EF9519B3CD3A431B302B0A6DF25F14374FE1356D6D51C245" +
  "E485B576625E7EC6F44C42E9A637ED6B0BFF5CB6F406B7ED" +
  "EE386BFB5A899FA5AE9F24117C4B1FE649286651ECE45B3D" +
  "C2007CB8A163BF0598DA48361C55D39A69163FA8FD24CF5F" +
  "83655D23DCA3AD961C62F356208552BB9ED529077096966D" +
  "670C354E4ABC9804F1746C08CA18217C32905E462E36CE3B" +
  "E39E772C180E86039B2783A2EC07A28FB5C55DF06F4C52C9" +
  "DE2BCBF6955817183995497CEA956AE515D2261898FA0510" +
  "15728E5A8AAAC42DAD33170D04507A33A85521ABDF1CBA64" +
  "ECFB850458DBEF0A8AEA71575D060C7DB3970F85A6E1E4C7" +
  "ABF5AE8CDB0933D71E8C94E04A25619DCEE3D2261AD2EE6B" +
  "F12FFA06D98A0864D87602733EC86A64521F2B18177B200C" +
  "BBE117577A615D6C770988C0BAD946E208E24FA074E5AB31" +
  "43DB5BFCE0FD108E4B82D120A93AD2CAFFFFFFFFFFFFFFFF"

const G = 2n

// ---------- byte helpers ----------

function bytesToBigInt(bytes: Uint8Array): bigint {
  let hex = "0x"
  for (const b of bytes) hex += b.toString(16).padStart(2, "0")
  return BigInt(hex)
}

function bigIntToBytes(value: bigint, length?: number): Uint8Array {
  let hex = value.toString(16)
  if (hex.length % 2 !== 0) hex = "0" + hex
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16)
  }
  if (length !== undefined && bytes.length < length) {
    const padded = new Uint8Array(length)
    padded.set(bytes, length - bytes.length)
    return padded
  }
  return bytes
}

function concatBytes(...arrays: Uint8Array[]): Uint8Array {
  const total = arrays.reduce((n, a) => n + a.length, 0)
  const out = new Uint8Array(total)
  let off = 0
  for (const a of arrays) {
    out.set(a, off)
    off += a.length
  }
  return out
}

function xorBytes(a: Uint8Array, b: Uint8Array): Uint8Array {
  const len = Math.max(a.length, b.length)
  const out = new Uint8Array(len)
  for (let i = 0; i < len; i++) {
    out[i] = (a[i] || 0) ^ (b[i] || 0)
  }
  return out
}

async function sha256(...parts: Uint8Array[]): Promise<Uint8Array> {
  const data = parts.length === 1 ? parts[0] : concatBytes(...parts)
  const digest = await crypto.subtle.digest("SHA-256", data as BufferSource)
  return new Uint8Array(digest)
}

function fromBase64(s: string): Uint8Array {
  const bin = atob(s)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

function toBase64(bytes: Uint8Array): string {
  let bin = ""
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin)
}

/** Strip a leading 0x00 byte (RFC 5054 primes are often padded). */
function trimLeadingZero(bytes: Uint8Array): Uint8Array {
  if (bytes.length > 1 && bytes[0] === 0) return bytes.slice(1)
  return bytes
}

// ---------- modular arithmetic (BigInt) ----------

function modPow(base: bigint, exp: bigint, mod: bigint): bigint {
  if (mod === 1n) return 0n
  let result = 1n
  let b = base % mod
  let e = exp
  while (e > 0n) {
    if (e & 1n) result = (result * b) % mod
    b = (b * b) % mod
    e >>= 1n
  }
  return result
}

// ---------- bcrypt password hashing (Proton-specific) ----------

// bcrypt uses its own base64 alphabet (order differs from standard base64).
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
  if (bits > 0) {
    out += BCRYPT_CHARS[(acc << (6 - bits)) & 0x3f]
  }
  return out
}

/**
 * Derive the "hashed password" used as SRP private key input (x).
 * authVersion >= 2: Proton bcrypt-hashes the password with the auth salt
 * (cost 10) and uses the raw bcrypt digest (last 23 bytes of the bcrypt
 * output) as the hashed password.
 * authVersion < 2: the raw password is used directly.
 */
function hashPassword(
  authVersion: number,
  password: string,
  salt: Uint8Array,
): Uint8Array {
  if (authVersion < 2) {
    return new TextEncoder().encode(password)
  }

  // Build a bcrypt salt string ($2a$10$<22-char salt>) from the 16-byte salt.
  const saltChars = bytesToBcryptBase64(salt).padEnd(22, ".")
  const fullSalt = `$2a$10$${saltChars}`
  const fullHash = bcrypt.hashSync(password, fullSalt)
  // fullHash = $2a$10$<22 salt><31 hash>; the raw bcrypt digest is the last
  // 31 bcrypt-base64 chars = 184 bits = 23 bytes.
  const hashPart = fullHash.slice(fullSalt.length)
  const hashBytes = bcryptBase64ToBytes(hashPart)
  return hashBytes
}

function bcryptBase64ToBytes(s: string): Uint8Array {
  const out: number[] = []
  let acc = 0
  let bits = 0
  for (const ch of s) {
    const v = BCRYPT_CHARS.indexOf(ch)
    if (v < 0) continue
    acc = (acc << 6) | v
    bits += 6
    if (bits >= 8) {
      bits -= 8
      out.push((acc >> bits) & 0xff)
    }
  }
  return new Uint8Array(out)
}

// ---------- public API ----------

export interface SRPAuthInfo {
  Modulus: string // base64
  ServerEphemeral: string // base64
  Salt: string // base64
  Version: number
  SRPSession: string
}

export interface SRPClientProof {
  ClientEphemeral: string // base64
  ClientProof: string // base64
  SRPSession: string
}

export async function computeSRPClientProof(
  username: string,
  password: string,
  info: SRPAuthInfo,
): Promise<SRPClientProof> {
  const version = info.Version ?? 4

  // Server-provided values
  const modulusBytes = trimLeadingZero(fromBase64(info.Modulus))
  const N = bytesToBigInt(modulusBytes)
  const B = bytesToBigInt(fromBase64(info.ServerEphemeral))
  const saltBytes = fromBase64(info.Salt)

  // Proton throws when B is a multiple of N (invalid server ephemeral)
  if (B % N === 0n) {
    throw new Error("invalid server ephemeral (B % N == 0)")
  }

  // Hash password (bcrypt for v>=2, raw otherwise)
  const hashedPassword = hashPassword(version, password, saltBytes)
  const xHash = await sha256(saltBytes, hashedPassword)
  const x = bytesToBigInt(xHash)

  // Random client secret (256-bit)
  const clientSecretBytes = crypto.getRandomValues(new Uint8Array(32))
  const a = bytesToBigInt(clientSecretBytes)

  // A = g^a mod N
  const A = modPow(G, a, N)
  const ABytes = bigIntToBytes(A, modulusBytes.length)

  // k = H(N | PAD(g)) for v>=2, else 0
  let k = 0n
  if (version >= 2) {
    const gBytes = bigIntToBytes(G, modulusBytes.length)
    const kHash = await sha256(modulusBytes, gBytes)
    k = bytesToBigInt(kHash)
  }

  // u = H(A | B)
  const BBytes = bigIntToBytes(B, modulusBytes.length)
  const uHash = await sha256(ABytes, BBytes)
  const u = bytesToBigInt(uHash)

  // S = (B - k * g^x) ^ (a + u*x) mod N
  const gx = modPow(G, x, N)
  let base = (B - (k * gx) % N) % N
  if (base < 0n) base += N
  const exp = a + u * x
  const S = modPow(base, exp, N)
  const SBytes = bigIntToBytes(S, modulusBytes.length)

  // Client proof = H( H(N) XOR H(g) | H(username) | salt | A | B | S )
  const hN = await sha256(modulusBytes)
  const hG = await sha256(bigIntToBytes(G))
  const hU = await sha256(new TextEncoder().encode(username))
  const leading = xorBytes(hN, hG)
  const proof = await sha256(leading, hU, saltBytes, ABytes, BBytes, SBytes)

  return {
    ClientEphemeral: toBase64(ABytes),
    ClientProof: toBase64(proof),
    SRPSession: info.SRPSession,
  }
}

export { toBase64, fromBase64, bytesToBigInt, bigIntToBytes, modPow, hashPassword }
