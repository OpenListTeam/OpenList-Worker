// rclone crypt v1 兼容的加密实现（内容加密，AES-CTR）
// 移植自 OpenList Go 版 drivers/crypt（其底层使用 rclone/backend/crypt）。
//
// 文件格式（v1）：
//   [nonce: 16 bytes][reserved: 16 bytes][AES-256-CTR 加密数据]
//   即 32 字节文件头 + 密文。EncryptedSize = plainSize + 32。
//
// 密钥派生（scrypt，与 rclone crypt 完全一致）：
//   scrypt(password, salt, N=16384, r=8, p=1, dkLen=64)
//   dataKey = dk[0:32]（数据加密密钥）
//   nameKey = dk[32:64]（文件名加密密钥，off 模式下未使用）
import { scrypt } from "hash-wasm"

const FILE_HEADER_SIZE = 32
const NONCE_SIZE = 16

export class CryptCipher {
  private dataKey: CryptoKey

  private constructor(dataKey: CryptoKey) {
    this.dataKey = dataKey
  }

  static async create(password: string, salt: string): Promise<CryptCipher> {
    if (!password) {
      throw new Error("[Crypt] password 不能为空")
    }
    const dk = (await scrypt({
      password,
      salt: salt || "",
      costFactor: 16384, // N = 2^14，必须是 2 的幂
      blockSize: 8, // r
      parallelism: 1, // p
      hashLength: 64, // dkLen
      outputType: "binary",
    })) as Uint8Array
    const dataKey = await crypto.subtle.importKey(
      "raw",
      dk.slice(0, 32),
      { name: "AES-CTR" },
      false,
      ["encrypt", "decrypt"],
    )
    return new CryptCipher(dataKey)
  }

  encryptedSize(plainSize: number): number {
    return plainSize + FILE_HEADER_SIZE
  }

  decryptedSize(encryptedSize: number): number {
    return Math.max(0, encryptedSize - FILE_HEADER_SIZE)
  }

  /** 加密明文，返回 32 字节头 + 密文 */
  async encrypt(plain: Uint8Array): Promise<Uint8Array> {
    const nonce = crypto.getRandomValues(new Uint8Array(NONCE_SIZE))
    const header = new Uint8Array(FILE_HEADER_SIZE)
    header.set(nonce, 0)
    crypto.getRandomValues(header.subarray(NONCE_SIZE))
    const ciphertext = new Uint8Array(
      await crypto.subtle.encrypt(
        { name: "AES-CTR", counter: nonce as BufferSource, length: 128 },
        this.dataKey,
        plain as BufferSource,
      ),
    )
    const out = new Uint8Array(FILE_HEADER_SIZE + ciphertext.length)
    out.set(header, 0)
    out.set(ciphertext, FILE_HEADER_SIZE)
    return out
  }

  /** 解密（data 必须包含 32 字节头） */
  async decrypt(data: Uint8Array): Promise<Uint8Array> {
    if (data.length < FILE_HEADER_SIZE) {
      throw new Error("[Crypt] 加密文件过短（缺少文件头）")
    }
    const nonce = data.slice(0, NONCE_SIZE)
    const ciphertext = data.slice(FILE_HEADER_SIZE)
    return new Uint8Array(
      await crypto.subtle.decrypt(
        { name: "AES-CTR", counter: nonce as BufferSource, length: 128 },
        this.dataKey,
        ciphertext as BufferSource,
      ),
    )
  }
}
