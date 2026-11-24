// rclone crypt filename obfuscation and name-path policy.
// Ported from rclone v1.75.2 backend/crypt/cipher.go (obfuscateSegment /
// deobfuscateSegment). rclone is MIT licensed, Copyright (C) 2012 Nick
// Craig-Wood - keep this notice.
import {
  decryptSegment,
  encryptSegment,
  errorNotAnEncryptedFile,
  type FileNameEncoding,
} from "./vendor/rclone-core"

export type { FileNameEncoding }

const OBFUSC_QUOTE_RUNE = 0x21 // '!'

// Go utf8.ValidRune: 0..0x10FFFF excluding surrogates
function isValidRune(cp: number): boolean {
  return cp >= 0 && cp <= 0x10ffff && !(cp >= 0xd800 && cp <= 0xdfff)
}

// Deterministic character rotation ("filename_encryption = obfuscate").
// Result is `"<dir>." + rotated` where dir = sum(runes) % 256 (prefix) and the
// rotation distances are augmented by the nameKey.
export function obfuscateSegment(
  plaintext: string,
  nameKey: Uint8Array,
): string {
  if (plaintext === "") return ""
  // JS strings are always valid Unicode; Go's "!." + s path for invalid
  // UTF-8 input cannot occur here.

  let dir = 0
  for (const ch of plaintext) dir += ch.codePointAt(0)!
  dir %= 256

  let result = `${dir}.`
  // augment with nameKey for the real rotation distance
  for (let i = 0; i < nameKey.length; i++) dir += nameKey[i]!

  const out: number[] = []
  for (const ch of plaintext) {
    const rv = ch.codePointAt(0)!
    if (rv === OBFUSC_QUOTE_RUNE) {
      out.push(OBFUSC_QUOTE_RUNE, OBFUSC_QUOTE_RUNE)
    } else if (rv >= 0x30 && rv <= 0x39) {
      const thisdir = (dir % 9) + 1
      out.push(0x30 + ((rv - 0x30 + thisdir) % 10))
    } else if ((rv >= 0x41 && rv <= 0x5a) || (rv >= 0x61 && rv <= 0x7a)) {
      const thisdir = (dir % 25) + 1
      let pos = rv - 0x41
      if (pos >= 26) pos -= 6
      pos = (pos + thisdir) % 52
      if (pos >= 26) pos += 6
      out.push(0x41 + pos)
    } else if (rv >= 0xa0 && rv <= 0xff) {
      const thisdir = (dir % 95) + 1
      out.push(0xa0 + ((rv - 0xa0 + thisdir) % 96))
    } else if (rv >= 0x100) {
      const thisdir = (dir % 127) + 1
      const base = rv - (rv % 256)
      const newRune = base + ((rv - base + thisdir) % 256)
      if (!isValidRune(newRune)) {
        out.push(OBFUSC_QUOTE_RUNE, rv) // quote instead of rotating
      } else {
        out.push(newRune)
      }
    } else {
      out.push(rv) // leave untouched
    }
  }
  return result + String.fromCodePoint(...out)
}

export function deobfuscateSegment(
  ciphertext: string,
  nameKey: Uint8Array,
): string {
  if (ciphertext === "") return ""
  const dot = ciphertext.indexOf(".")
  if (dot === -1) throw new Error(errorNotAnEncryptedFile)
  const before = ciphertext.slice(0, dot)
  const after = ciphertext.slice(dot + 1)

  if (before === "!") {
    // no rotation happened (original was not valid unicode)
    return after
  }
  // Go strconv.Atoi: optional sign + decimal digits, within int64
  if (!/^[+-]?\d+$/.test(before)) throw new Error(errorNotAnEncryptedFile)
  let dir: bigint
  try {
    dir = BigInt(before)
  } catch {
    throw new Error(errorNotAnEncryptedFile)
  }
  if (dir < -(2n ** 63n) || dir > 2n ** 63n - 1n)
    throw new Error(errorNotAnEncryptedFile)
  // add the nameKey to get the real rotate distance
  for (let i = 0; i < nameKey.length; i++) dir += BigInt(nameKey[i]!)

  const out: number[] = []
  let inQuote = false
  for (const ch of after) {
    const rv = ch.codePointAt(0)!
    if (inQuote) {
      out.push(rv)
      inQuote = false
    } else if (rv === OBFUSC_QUOTE_RUNE) {
      inQuote = true
    } else if (rv >= 0x30 && rv <= 0x39) {
      const thisdir = Number(dir % 9n) + 1
      let newRune = 0x30 + (rv - 0x30) - thisdir
      if (newRune < 0x30) newRune += 10
      out.push(newRune)
    } else if ((rv >= 0x41 && rv <= 0x5a) || (rv >= 0x61 && rv <= 0x7a)) {
      const thisdir = Number(dir % 25n) + 1
      let pos = rv - 0x41
      if (pos >= 26) pos -= 6
      pos -= thisdir
      if (pos < 0) pos += 52
      if (pos >= 26) pos += 6
      out.push(0x41 + pos)
    } else if (rv >= 0xa0 && rv <= 0xff) {
      const thisdir = Number(dir % 95n) + 1
      let newRune = 0xa0 + (rv - 0xa0) - thisdir
      if (newRune < 0xa0) newRune += 96
      out.push(newRune)
    } else if (rv >= 0x100) {
      const thisdir = Number(dir % 127n) + 1
      const base = rv - (rv % 256)
      let newRune = base + (rv - base - thisdir)
      if (newRune < base) newRune += 256
      out.push(newRune)
    } else {
      out.push(rv)
    }
  }
  return String.fromCodePoint(...out)
}

// ---------------------------------------------------------------------------
// Version strings (rclone lib/version): B2-style "-vYYYY-MM-DD-HHMMSS-mmm"
// kept in plain text on file names. Strip before encrypt/decrypt of the last
// segment, restore afterwards (inserted before the extension).
// ---------------------------------------------------------------------------
export interface VersionStamp {
  y: number
  mo: number
  d: number
  h: number
  mi: number
  s: number
  ms: number
}

const VERSION_FORMAT_LEN = 23 // len("-v2006-01-02-150405.000")
const VERSION_RE = /-v\d{4}-\d{2}-\d{2}-\d{6}-\d{3}/

export function matchVersion(fileName: string): boolean {
  return VERSION_RE.test(fileName)
}

// Go path.Ext: suffix from the final dot of the final path element
function splitExt(fileName: string): [string, string] {
  for (let i = fileName.length - 1; i >= 0 && fileName[i] !== "/"; i--) {
    if (fileName[i] === ".") {
      const base = fileName.slice(0, i)
      const ext = fileName.slice(i)
      // ".file" splits to base == "", ext == ".file" -> swap
      if (base === "") return [ext, ""]
      return [base, ext]
    }
  }
  return [fileName, ""]
}

function daysInMonth(y: number, mo: number): number {
  if (mo === 2) {
    const leap = y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0)
    return leap ? 29 : 28
  }
  return [31, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][mo - 1]!
}

// Strict parse of "-vYYYY-MM-DD-HHMMSS.mmm" mirroring Go time.Parse range
// checks (verified empirically against Go 1.26: month 1-12, day 1..daysIn,
// hour<24, minute<60, second<60).
function parseVersionStamp(s: string): VersionStamp | null {
  const m = /^-v(\d{4})-(\d{2})-(\d{2})-(\d{2})(\d{2})(\d{2})\.(\d{3})$/.exec(s)
  if (!m) return null
  const [y, mo, d, h, mi, sec, ms] = m.slice(1).map(Number) as [
    number,
    number,
    number,
    number,
    number,
    number,
    number,
  ]
  if (mo < 1 || mo > 12) return null
  if (d < 1 || d > daysInMonth(y, mo)) return null
  if (h > 23 || mi > 59 || sec > 59) return null
  return { y, mo, d, h, mi, s: sec, ms }
}

export function removeVersion(fileName: string): {
  stamp: VersionStamp | null
  without: string
} {
  const [base, ext] = splitExt(fileName)
  if (base.length < VERSION_FORMAT_LEN)
    return { stamp: null, without: fileName }
  if (base[base.length - 4] !== "-") return { stamp: null, without: fileName }
  const versionStart = base.length - VERSION_FORMAT_LEN
  // replace the "-xxx" millisecond separator with "." for parsing
  const parseBase = base.slice(0, -4) + "." + base.slice(-3)
  const stamp = parseVersionStamp(parseBase.slice(versionStart))
  if (!stamp) return { stamp: null, without: fileName }
  return { stamp, without: base.slice(0, versionStart) + ext }
}

const pad = (n: number, w: number) => String(n).padStart(w, "0")

export function addVersion(fileName: string, stamp: VersionStamp): string {
  const [base, ext] = splitExt(fileName)
  const v =
    `-v${pad(stamp.y, 4)}-${pad(stamp.mo, 2)}-${pad(stamp.d, 2)}` +
    `-${pad(stamp.h, 2)}${pad(stamp.mi, 2)}${pad(stamp.s, 2)}-${pad(stamp.ms, 3)}`
  return base + v + ext
}

// ---------------------------------------------------------------------------
// High-level name API (rclone cipher.go EncryptFileName/DecryptFileName/
// EncryptDirName/DecryptDirName)
// ---------------------------------------------------------------------------
export type NameEncryptionMode = "off" | "standard" | "obfuscate"

export interface NameCipherOptions {
  nameKey: Uint8Array
  nameTweak: Uint8Array
  mode: NameEncryptionMode
  dirNameEncrypt: boolean
  filenameEncoding: FileNameEncoding
  /** normalized via normalizeEncryptedSuffix */
  encryptedSuffix: string
}

// rclone cipher.go setEncryptedSuffix
export function normalizeEncryptedSuffix(suffix: string): string {
  if (suffix.toLowerCase() === "none") return ""
  return suffix.startsWith(".") ? suffix : "." + suffix
}

export class NameCipher {
  constructor(private readonly o: NameCipherOptions) {}

  encryptFileName(input: string): string {
    if (this.o.mode === "off") return input + this.o.encryptedSuffix
    return this.mapPath(input, true, true)
  }

  encryptDirName(input: string): string {
    if (this.o.mode === "off" || !this.o.dirNameEncrypt) return input
    return this.mapPath(input, true, false)
  }

  decryptFileName(input: string): string {
    if (this.o.mode === "off") {
      const rem = input.length - this.o.encryptedSuffix.length
      if (rem === 0 || !input.endsWith(this.o.encryptedSuffix)) {
        throw new Error(errorNotAnEncryptedFile)
      }
      const decrypted = input.slice(0, rem)
      if (matchVersion(decrypted)) {
        const { without } = removeVersion(decrypted)
        if (without === "") throw new Error(errorNotAnEncryptedFile)
      }
      return decrypted
    }
    return this.mapPath(input, false, true)
  }

  decryptDirName(input: string): string {
    if (this.o.mode === "off" || !this.o.dirNameEncrypt) return input
    try {
      return this.mapPath(input, false, false)
    } catch (err) {
      // rclone <= 1.76 wrote dir names in the file form (version left plain);
      // still decrypt those so they appear in listings
      const base = input.split("/").pop() ?? ""
      if (matchVersion(base)) {
        try {
          return this.mapPath(input, false, true)
        } catch {
          // fall through to the original error
        }
      }
      throw err
    }
  }

  // rclone cipher.go encryptFileName/decryptFileName body
  private mapPath(
    input: string,
    encrypt: boolean,
    stripVersion: boolean,
  ): string {
    const segments = input.split("/")
    for (let i = 0; i < segments.length; i++) {
      if (!this.o.dirNameEncrypt && i !== segments.length - 1) continue

      let stamp: VersionStamp | null = null
      if (
        stripVersion &&
        i === segments.length - 1 &&
        matchVersion(segments[i]!)
      ) {
        const r = removeVersion(segments[i]!)
        if (r.stamp) {
          segments[i] = r.without
          stamp = r.stamp
        }
      }

      if (encrypt) {
        segments[i] =
          this.o.mode === "standard"
            ? encryptSegment(
                this.o.nameKey,
                this.o.nameTweak,
                this.o.filenameEncoding,
                segments[i]!,
              )
            : obfuscateSegment(segments[i]!, this.o.nameKey)
      } else {
        segments[i] =
          this.o.mode === "standard"
            ? decryptSegment(
                this.o.nameKey,
                this.o.nameTweak,
                this.o.filenameEncoding,
                segments[i]!,
              )
            : deobfuscateSegment(segments[i]!, this.o.nameKey)
      }

      if (stamp) segments[i] = addVersion(segments[i]!, stamp)
    }
    return segments.join("/")
  }
}
