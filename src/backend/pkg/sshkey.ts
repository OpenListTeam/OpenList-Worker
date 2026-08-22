/**
 * OpenSSH public key parser and SHA256 fingerprint generator
 * using standard Web Crypto and pure TypeScript (no Node.js modules).
 */

function base64Encode(bytes: Uint8Array): string {
  let bin = ""
  for (let i = 0; i < bytes.length; i++) {
    bin += String.fromCharCode(bytes[i])
  }
  return btoa(bin)
}

function base64Decode(b64: string): Uint8Array<ArrayBuffer> | null {
  const clean = String(b64 || "")
    .replace(/[\s\r\n]/g, "")
    .replace(/-/g, "+")
    .replace(/_/g, "/")
  const pad = clean.length % 4
  const padded = pad ? clean + "=".repeat(4 - pad) : clean
  try {
    const bin = atob(padded)
    const out = new Uint8Array(bin.length)
    for (let i = 0; i < bin.length; i++) {
      out[i] = bin.charCodeAt(i)
    }
    return out
  } catch {
    return null
  }
}

/** Known SSH public key algorithm prefixes (RFC 4253 + common extensions). */
const KNOWN_KEY_TYPES = [
  "ssh-rsa",
  "ssh-dss",
  "ssh-ed25519",
  "ecdsa-sha2-nistp256",
  "ecdsa-sha2-nistp384",
  "ecdsa-sha2-nistp521",
  "sk-ssh-ed25519@openssh.com",
  "sk-ecdsa-sha2-nistp256@openssh.com",
  "sk-ssh-ed25519@openssh.com.webauthn",
  "sk-ecdsa-sha2-nistp256@openssh.com.webauthn",
]

export interface ParsedSshKey {
  type: string
  /** Raw base64 blob (the key material, without padding issues). */
  blobBase64: string
  comment: string
}

/**
 * Parse an OpenSSH authorized_keys line like
 * `ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAI... user@host`.
 * Returns null when the line is not a valid public key.
 */
export function parseSshKey(keyText: string): ParsedSshKey | null {
  const parts = String(keyText || "")
    .trim()
    .split(/\s+/)
  if (parts.length < 2) return null
  const type = parts[0]
  if (!KNOWN_KEY_TYPES.includes(type)) return null
  const blob = base64Decode(parts[1])
  if (!blob || blob.length < 16) return null
  return {
    type,
    blobBase64: parts[1].replace(/[\s\r\n]/g, ""),
    comment: parts.slice(2).join(" ") || "",
  }
}

/**
 * Compute the OpenSSH-style SHA256 fingerprint: `SHA256:<base64-no-padding>`.
 */
export async function sshKeyFingerprint(
  keyText: string,
): Promise<string | null> {
  const parsed = parseSshKey(keyText)
  if (!parsed) return null
  const bytes = base64Decode(parsed.blobBase64)
  if (!bytes) return null
  const digest = await crypto.subtle.digest(
    "SHA-256",
    bytes.buffer.slice(
      bytes.byteOffset,
      bytes.byteOffset + bytes.byteLength,
    ) as ArrayBuffer,
  )
  const hash = new Uint8Array(digest)
  // OpenSSH fingerprint base64 has no padding
  return "SHA256:" + base64Encode(hash).replace(/=+$/, "")
}

/** Generate a short unique key id (string, matching the frontend type). */
export function newSshKeyId(): string {
  const g = globalThis as any
  if (typeof g.crypto?.randomUUID === "function") {
    return g.crypto.randomUUID()
  }
  return (
    Date.now().toString(36) +
    "-" +
    Math.random().toString(36).slice(2, 10) +
    Math.random().toString(36).slice(2, 10)
  )
}
