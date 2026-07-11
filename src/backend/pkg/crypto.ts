
const cryptoModule = "node:crypto";
let crypto: any = null;

try {
  crypto = await import(cryptoModule);
  if (crypto && crypto.default) {
    crypto = crypto.default;
  }
} catch (_) {
  try {
    crypto = await import("crypto");
    if (crypto && crypto.default) {
      crypto = crypto.default;
    }
  } catch (_) {}
}

/**
 * Crypto utilities for OpenList.
 */

export function md5(data: string | Buffer): string {
  if (!crypto) throw new Error("crypto module is not available in this environment");
  return crypto.createHash("md5").update(data).digest("hex");
}

export function sha1(data: string | Buffer): string {
  if (!crypto) throw new Error("crypto module is not available in this environment");
  return crypto.createHash("sha1").update(data).digest("hex");
}

export function sha256(data: string | Buffer): string {
  if (!crypto) throw new Error("crypto module is not available in this environment");
  return crypto.createHash("sha256").update(data).digest("hex");
}

export function hmacSha256(data: string | Buffer, key: string): string {
  if (!crypto) throw new Error("crypto module is not available in this environment");
  return crypto.createHmac("sha256", key).update(data).digest("hex");
}

/**
 * Encrypt data with AES-256-GCM
 */
export function encrypt(data: string, key: string): string {
  if (!crypto) throw new Error("crypto module is not available in this environment");
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", crypto.scryptSync(key, "salt", 32), iv);
  let encrypted = cipher.update(data, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag().toString("hex");
  return `${iv.toString("hex")}:${authTag}:${encrypted}`;
}

/**
 * Decrypt data with AES-256-GCM
 */
export function decrypt(encryptedData: string, key: string): string {
  if (!crypto) throw new Error("crypto module is not available in this environment");
  const [ivHex, authTagHex, encrypted] = encryptedData.split(":");
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const decipher = crypto.createDecipheriv("aes-256-gcm", crypto.scryptSync(key, "salt", 32), iv);
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

export function randomString(length: number): string {
  if (!crypto) {
    // Basic fallback if crypto is somehow not loaded yet or unavailable
    const chars = "abcdef0123456789";
    let result = "";
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
  return crypto.randomBytes(length).toString("hex").substring(0, length);
}
