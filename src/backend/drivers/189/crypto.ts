import CryptoJS from "crypto-js"

/**
 * 跨平台 RSA PKCS#1 v1.5 加密与 ASN.1 解析实现。
 * 纯 TypeScript + BigInt 实现，无需 Node.js 原生 crypto 模块，
 * 100% 兼容 Cloudflare Workers (V8 Isolates)、浏览器以及 Node.js。
 */

function base64ToBytes(b64: string): Uint8Array {
  const clean = b64.replace(/\s+/g, "")
  const bin = atob(clean)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) {
    bytes[i] = bin.charCodeAt(i)
  }
  return bytes
}

function bytesToBase64(bytes: Uint8Array): string {
  let bin = ""
  for (let i = 0; i < bytes.length; i++) {
    bin += String.fromCharCode(bytes[i])
  }
  return btoa(bin)
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
}

function bytesToBigInt(bytes: Uint8Array): bigint {
  let res = 0n
  for (let i = 0; i < bytes.length; i++) {
    res = (res << 8n) | BigInt(bytes[i])
  }
  return res
}

function bigIntToBytes(num: bigint, length: number): Uint8Array {
  const bytes = new Uint8Array(length)
  let temp = num
  for (let i = length - 1; i >= 0; i--) {
    bytes[i] = Number(temp & 0xffn)
    temp >>= 8n
  }
  return bytes
}

function modPow(base: bigint, exp: bigint, mod: bigint): bigint {
  let res = 1n
  base = base % mod
  while (exp > 0n) {
    if (exp % 2n === 1n) {
      res = (res * base) % mod
    }
    base = (base * base) % mod
    exp /= 2n
  }
  return res
}

interface RsaPublicKey {
  n: bigint
  e: bigint
  keyLength: number // in bytes
}

/**
 * 解析 PEM 或 Base64 格式的 RSA 公钥（支持 SubjectPublicKeyInfo 与 PKCS#1 RSAPublicKey 格式）
 */
function parseRsaPublicKey(pemOrBase64: string): RsaPublicKey {
  let cleanB64 = pemOrBase64
    .replace(/-----BEGIN[^-]+-----/g, "")
    .replace(/-----END[^-]+-----/g, "")
    .replace(/\s+/g, "")

  const der = base64ToBytes(cleanB64)

  // ASN.1 DER 简单解析获取所有 INTEGER
  let offset = 0
  function readTagAndLength(): {
    tag: number
    length: number
    dataStart: number
  } {
    const tag = der[offset++]
    let len = der[offset++]
    if (len & 0x80) {
      const numBytes = len & 0x7f
      len = 0
      for (let i = 0; i < numBytes; i++) {
        len = (len << 8) | der[offset++]
      }
    }
    const dataStart = offset
    return { tag, length: len, dataStart }
  }

  const integers: Uint8Array[] = []

  function scanAsn1(start: number, end: number) {
    let p = start
    while (p < end) {
      const tag = der[p++]
      let len = der[p++]
      if (len & 0x80) {
        const numBytes = len & 0x7f
        len = 0
        for (let i = 0; i < numBytes; i++) {
          len = (len << 8) | der[p++]
        }
      }
      const dataStart = p
      p += len

      if (tag === 0x02) {
        // INTEGER
        let intData = der.subarray(dataStart, dataStart + len)
        if (intData[0] === 0x00 && intData.length > 1) {
          intData = intData.subarray(1)
        }
        integers.push(intData)
      } else if (tag === 0x30 || (tag & 0x20) !== 0) {
        // SEQUENCE or constructed
        scanAsn1(dataStart, dataStart + len)
      } else if (tag === 0x03) {
        // BIT STRING
        const unusedBits = der[dataStart]
        if (unusedBits === 0) {
          scanAsn1(dataStart + 1, dataStart + len)
        }
      }
    }
  }

  scanAsn1(0, der.length)

  if (integers.length < 2) {
    throw new Error(
      "Failed to parse RSA public key: insufficient integers found",
    )
  }

  // 最大的 INTEGER 为 modulus (n)，较小的为 exponent (e)
  let nBytes = integers[0]
  let eBytes = integers[1]
  if (nBytes.length < eBytes.length) {
    const tmp = nBytes
    nBytes = eBytes
    eBytes = tmp
  }

  return {
    n: bytesToBigInt(nBytes),
    e: bytesToBigInt(eBytes),
    keyLength: nBytes.length,
  }
}

/**
 * RSA PKCS#1 v1.5 加密
 * @param data 待加密数据（字符串或字节数组）
 * @param pubKeyPEM 公钥内容
 * @param toHex 输出为十六进制字符串（true）还是 Base64 字符串（false）
 */
export function rsaEncode(
  data: string | Uint8Array,
  pubKeyPEM: string,
  toHex: boolean = false,
): string {
  const { n, e, keyLength } = parseRsaPublicKey(pubKeyPEM)
  const dataBytes =
    typeof data === "string" ? new TextEncoder().encode(data) : data

  if (dataBytes.length > keyLength - 11) {
    throw new Error(
      `Data too long for RSA key size: ${dataBytes.length} > ${keyLength - 11}`,
    )
  }

  // PKCS#1 v1.5 padding: 0x00 || 0x02 || PS (non-zero random bytes) || 0x00 || data
  const psLength = keyLength - dataBytes.length - 3
  const ps = new Uint8Array(psLength)
  const randomBytes = new Uint8Array(psLength * 2)
  crypto.getRandomValues(randomBytes)
  let rIdx = 0
  for (let i = 0; i < psLength; i++) {
    let b = randomBytes[rIdx++]
    while (b === 0) {
      if (rIdx >= randomBytes.length) {
        crypto.getRandomValues(randomBytes)
        rIdx = 0
      }
      b = randomBytes[rIdx++]
    }
    ps[i] = b
  }

  const em = new Uint8Array(keyLength)
  em[0] = 0x00
  em[1] = 0x02
  em.set(ps, 2)
  em[2 + psLength] = 0x00
  em.set(dataBytes, 3 + psLength)

  const m = bytesToBigInt(em)
  const c = modPow(m, e, n)
  const cipherBytes = bigIntToBytes(c, keyLength)

  if (toHex) {
    return bytesToHex(cipherBytes)
  }
  return bytesToBase64(cipherBytes)
}

/**
 * AES-128-ECB PKCS7 加密（天翼云盘上传参数加密）
 */
export function aes128EcbEncryptHex(
  text: string,
  key16Bytes: string | Uint8Array,
): string {
  const keyWA =
    typeof key16Bytes === "string"
      ? CryptoJS.enc.Utf8.parse(key16Bytes.slice(0, 16))
      : CryptoJS.lib.WordArray.create(Array.from(key16Bytes.slice(0, 16)), 16)
  const dataWA = CryptoJS.enc.Utf8.parse(text)
  const encrypted = CryptoJS.AES.encrypt(dataWA, keyWA, {
    mode: CryptoJS.mode.ECB,
    padding: CryptoJS.pad.Pkcs7,
  })
  return encrypted.ciphertext.toString(CryptoJS.enc.Hex)
}

/**
 * HMAC-SHA1 签名（十六进制输出）
 */
export function hmacSha1Hex(data: string, key: string): string {
  return CryptoJS.HmacSHA1(data, key).toString(CryptoJS.enc.Hex)
}

/** MD5 helpers used by the 189Cloud multi-part upload protocol. */
function toWordArray(data: Uint8Array | string) {
  return typeof data === "string"
    ? CryptoJS.enc.Utf8.parse(data)
    : CryptoJS.lib.WordArray.create(data as any)
}

export function md5Hex(data: Uint8Array | string): string {
  return CryptoJS.MD5(toWordArray(data)).toString(CryptoJS.enc.Hex)
}

export function md5Base64(data: Uint8Array | string): string {
  return CryptoJS.MD5(toWordArray(data)).toString(CryptoJS.enc.Base64)
}

/**
 * 生成 189 专用的 UUID 格式随机字符串
 */
export function randomUUID189(
  pattern: string = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx",
): string {
  return pattern.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === "x" ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

/**
 * 生成 189 URL 查询缓存随机数
 */
export function randomNoCache(): string {
  return (
    "0." +
    Math.floor(Math.random() * 1e17)
      .toString()
      .padStart(17, "0")
  )
}
