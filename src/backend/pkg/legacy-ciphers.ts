/**
 * DES / 3DES-CBC（PKCS#7）纯 JS 实现。
 *
 * ## 为什么用 crypto-js 而不是 WebCrypto
 *
 * WebCrypto（CF Workers / 浏览器 / Node 的 `crypto.subtle`）**都不提供 DES/3DES**
 * （DES 早已从 WebCrypto 规范中移除）；本仓库的边缘构建还会把 `node:crypto`
 * 换成抛错 shim（见 `scripts/node-shim.mjs`）。而 `crypto-js` 已在本仓库依赖里
 * （多个网盘驱动在用，已被打进产物），其 `TripleDES` 支持 8 / 16 / 24 字节密钥：
 *
 *   - 8 字节  → 单 DES（EDE(K,K,K) ≡ DES，已与 OpenSSL `des-ede3-cbc` 交叉验证一致）
 *   - 24 字节 → 3-key 3DES（168-bit，已与 OpenSSL 交叉验证一致）
 *
 * ## 安全性提醒（务必知悉）
 *
 * 两者都**只应作为兼容手段**，不应用于保护真实数据：
 *   - 单 DES 有效密钥仅 56-bit，可被专用硬件在小时级暴力破解；
 *   - 3DES 的 64-bit 分组在数据量大时受 Sweet32 攻击影响，NIST SP 800-131A
 *     已不再认可其用于加密。
 * 因此本项目把 `des-cbc-hmac` / `3des-cbc-hmac` 实现为「CBC + 独立的
 * HMAC-SHA256（Encrypt-then-MAC）」以保证**完整性**，但**不提供**任何强度承诺；
 * 需要真正的静态加密请使用 `aes-256-gcm` 或 `chacha20-poly1305`。
 *
 * 该模块只做「字节进、字节出」，十六进制编解码与密钥派生由 `crypto.ts` 负责。
 */
import CryptoJS from "crypto-js"

/** Uint8Array → crypto-js WordArray（按字节，不依赖 lib-typedarrays） */
function bytesToWordArray(bytes: Uint8Array): any {
  const words: number[] = []
  for (let i = 0; i < bytes.length; i++) {
    words[i >>> 2] |= bytes[i] << (24 - (i % 4) * 8)
  }
  return CryptoJS.lib.WordArray.create(words, bytes.length)
}

/** crypto-js WordArray → Uint8Array */
function wordArrayToBytes(wa: any): Uint8Array {
  const sigBytes = Number(wa?.sigBytes ?? 0)
  const words: number[] = wa?.words ?? []
  const out = new Uint8Array(sigBytes)
  for (let i = 0; i < sigBytes; i++) {
    out[i] = (words[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff
  }
  return out
}

const DES_BLOCK = 8

/**
 * DES / 3DES-CBC 加密（PKCS#7 填充）。
 *
 * @param keyBytes 8 字节 → 单 DES；16 字节 → 2-key 3DES；24 字节 → 3-key 3DES
 * @param iv 必须为 8 字节（DES 分组长度）
 */
export function desCbcEncrypt(
  plain: Uint8Array,
  keyBytes: Uint8Array,
  iv: Uint8Array,
): Uint8Array {
  if (iv.length !== DES_BLOCK) throw new Error("DES IV must be 8 bytes")
  const out = CryptoJS.TripleDES.encrypt(
    bytesToWordArray(plain),
    bytesToWordArray(keyBytes),
    {
      iv: bytesToWordArray(iv),
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    },
  )
  return wordArrayToBytes(out.ciphertext)
}

/** DES / 3DES-CBC 解密（校验并去除 PKCS#7 填充） */
export function desCbcDecrypt(
  cipher: Uint8Array,
  keyBytes: Uint8Array,
  iv: Uint8Array,
): Uint8Array {
  if (iv.length !== DES_BLOCK) throw new Error("DES IV must be 8 bytes")
  const out = CryptoJS.TripleDES.decrypt(
    { ciphertext: bytesToWordArray(cipher) } as any,
    bytesToWordArray(keyBytes),
    {
      iv: bytesToWordArray(iv),
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    },
  )
  return wordArrayToBytes(out)
}
