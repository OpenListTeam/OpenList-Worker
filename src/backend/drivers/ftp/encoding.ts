// FTP Encoding Utility supporting UTF-8, GBK, GB2312, etc.

let iconvModule: any = null

async function getIconv(): Promise<any> {
  if (
    typeof process !== "undefined" &&
    process.release?.name === "node" &&
    !iconvModule
  ) {
    try {
      const modName = "iconv-lite"
      iconvModule =
        (await import(/* @vite-ignore */ modName)).default ||
        (await import(/* @vite-ignore */ modName))
    } catch {}
  }
  return iconvModule
}

export function normalizeEncoding(enc?: string): string {
  const clean = (enc || "").trim().toLowerCase()
  if (!clean || clean === "utf8" || clean === "utf-8") {
    return "utf-8"
  }
  return clean
}

export function encodeFtpString(str: string, encoding: string): Buffer {
  const enc = normalizeEncoding(encoding)
  if (enc === "utf-8") {
    return Buffer.from(str, "utf-8")
  }
  try {
    if (iconvModule) {
      return iconvModule.encode(str, enc)
    }
    const iconv = require("iconv-lite")
    return iconv.encode(str, enc)
  } catch {
    return Buffer.from(str, "utf-8")
  }
}

export function decodeFtpBuffer(
  buf: Buffer | Uint8Array,
  encoding: string,
): string {
  const enc = normalizeEncoding(encoding)
  const buffer = Buffer.isBuffer(buf) ? buf : Buffer.from(buf)
  if (enc === "utf-8") {
    return buffer.toString("utf-8")
  }
  try {
    if (iconvModule) {
      return iconvModule.decode(buffer, enc)
    }
    const iconv = require("iconv-lite")
    return iconv.decode(buffer, enc)
  } catch {
    return buffer.toString("utf-8")
  }
}
