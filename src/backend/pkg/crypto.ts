
import * as crypto from "node:crypto";

/**
 * Crypto utilities for OpenList.
 */

export function md5(data: string | Uint8Array | ArrayBuffer): string {
  const input = data instanceof ArrayBuffer ? new Uint8Array(data) : data;
  return crypto.createHash("md5").update(input as any).digest("hex");
}

export function sha1(data: string | Uint8Array | ArrayBuffer): string {
  const input = data instanceof ArrayBuffer ? new Uint8Array(data) : data;
  return crypto.createHash("sha1").update(input as any).digest("hex");
}

export function sha256(data: string | Uint8Array | ArrayBuffer): string {
  const input = data instanceof ArrayBuffer ? new Uint8Array(data) : data;
  return crypto.createHash("sha256").update(input as any).digest("hex");
}

export function hmacSha256(data: string | Uint8Array | ArrayBuffer, key: string): string {
  const input = data instanceof ArrayBuffer ? new Uint8Array(data) : data;
  return crypto.createHmac("sha256", key).update(input as any).digest("hex");
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

const hexToUint8Array = (hex: string) => {
  const view = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    view[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return view;
};

/**
 * Decrypt data with AES-256-GCM
 */
export function decrypt(encryptedData: string, key: string): string {
  const [ivHex, authTagHex, encrypted] = encryptedData.split(":");
  const iv = hexToUint8Array(ivHex);
  const authTag = hexToUint8Array(authTagHex);
  const decipher = crypto.createDecipheriv("aes-256-gcm", crypto.scryptSync(key, "salt", 32), iv);
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

export function randomString(length: number): string {
  return crypto.randomBytes(length).toString("hex").substring(0, length);
}
