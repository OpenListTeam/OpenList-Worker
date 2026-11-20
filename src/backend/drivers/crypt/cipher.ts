// rclone crypt facade: key material + filename cipher + content crypto.
// New writes use the rclone secretbox format (./data); reads dispatch on the
// "RCLONE\0\0" magic and fall back to the legacy AES-CTR format (./legacy)
// so data written before the rclone migration stays downloadable.
//
// Algorithm stack (rclone v1.75.2 backend/crypt, MIT - see vendor/ for ports).
import { deriveKeys } from "./kdf"
import {
  NameCipher,
  type FileNameEncoding,
  type NameEncryptionMode,
} from "./names"
import {
  decryptBlockSlice,
  decryptData,
  decryptDataRange,
  decryptedSize,
  encryptData,
  encryptedSize,
} from "./data"
import { isRcloneFormat, legacyDecrypt } from "./legacy"

export interface CipherOptions {
  mode: NameEncryptionMode
  dirNameEncrypt: boolean
  filenameEncoding: FileNameEncoding
  /** validated/normalized by the caller (driver init) */
  encryptedSuffix: string
}

export class CryptCipher {
  readonly names: NameCipher
  readonly dataKey: Uint8Array
  private readonly legacyPassword: string
  private readonly legacySalt: string

  constructor(password: string, salt: string, opts: CipherOptions) {
    const keys = deriveKeys(password, salt)
    this.dataKey = keys.dataKey
    this.names = new NameCipher({
      nameKey: keys.nameKey,
      nameTweak: keys.nameTweak,
      mode: opts.mode,
      dirNameEncrypt: opts.dirNameEncrypt,
      filenameEncoding: opts.filenameEncoding,
      encryptedSuffix: opts.encryptedSuffix,
    })
    // legacy data was derived with dkLen=64 and the raw salt
    this.legacyPassword = password
    this.legacySalt = salt
  }

  encryptedSize(plainSize: number): number {
    return encryptedSize(plainSize)
  }

  decryptedSize(encSize: number): number {
    return decryptedSize(encSize)
  }

  encryptData(plain: Uint8Array): Uint8Array {
    return encryptData(this.dataKey, plain)
  }

  decryptData(input: Uint8Array): Uint8Array {
    if (isRcloneFormat(input)) return decryptData(this.dataKey, input)
    return legacyDecrypt(this.legacyPassword, this.legacySalt, input)
  }

  decryptDataRange(
    input: Uint8Array,
    offset: number,
    limit: number,
  ): Uint8Array {
    return decryptDataRange(this.dataKey, input, offset, limit)
  }

  decryptBlockSlice(
    initialNonce: Uint8Array,
    blocks: number,
    discard: number,
    count: number,
    slice: Uint8Array,
  ): Uint8Array {
    return decryptBlockSlice(
      this.dataKey,
      initialNonce,
      blocks,
      discard,
      count,
      slice,
    )
  }
}
