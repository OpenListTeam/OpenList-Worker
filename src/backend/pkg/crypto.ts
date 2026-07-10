
import crypto from "node:crypto";

/**
 * Crypto utilities for OpenList.
 */

export function md5(data: string | Buffer): string {
  return crypto.createHash("md5").update(data).digest("hex");
}

export function sha1(data: string | Buffer): string {
  return crypto.createHash("sha1").update(data).digest("hex");
}

export function sha256(data: string | Buffer): string {
  return crypto.createHash("sha256").update(data).digest("hex");
}

export function hmacSha256(data: string | Buffer, key: string): string {
  return crypto.createHmac("sha256", key).update(data).digest("hex");
}

/**
 * Encrypt data with AES-256-GCM
 */
export function encrypt(data: string, key: string): string {
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
  return crypto.randomBytes(length).toString("hex").substring(0, length);
}
