export const SEED_FORMAT = "openlist-sharing-seed" as const
export const SEED_VERSION = 1 as const
export const DEFAULT_PIECE_SIZE = 10 * 1024 * 1024

export type SeedFormat = "oss" | "torrent" | "cas"
export type SeedHashAlgorithm = "md5" | "sha1" | "sha256"

export interface SeedSource {
  type: string
  url: string
  expires_at: string
  share_id: string
}

export interface SeedChannel {
  driver: string
  mount_path: string
}

export interface SeedHashes {
  md5: string
  sha1: string
  sha256: string
  pieces: Record<SeedHashAlgorithm, string[]>
}

export interface SeedFile {
  path: string
  size: number
  modified: string
  comment: string
  hashes: SeedHashes
  sources: SeedSource[]
  cas_slice_md5: string
  cas_create_time: string
  missing_channels: string[]
}

export interface SharingSeed {
  format: typeof SEED_FORMAT
  version: typeof SEED_VERSION
  name: string
  comment: string
  created_at: string
  created_by: string
  piece_size: number
  trackers: string[]
  channels: SeedChannel[]
  files: SeedFile[]
}

export interface CasFileEntry {
  name: string
  size: number
  md5: string
  sliceMd5: string
  create_time: string
  slice_md5s?: string[]
  slice_size?: number
}

export interface CasPayload {
  name: string
  size: number
  md5: string
  sliceMd5: string
  create_time: string
  slice_md5s?: string[]
  slice_size?: number
  files?: CasFileEntry[]
}

export interface ParsedSeed {
  format: SeedFormat
  seed: SharingSeed
  info_hash?: string
  cas?: CasPayload
}

const HEX_LENGTHS: Record<SeedHashAlgorithm, number> = {
  md5: 32,
  sha1: 40,
  sha256: 64,
}

function text(value: unknown): string {
  return typeof value === "string" ? value : ""
}

const MAX_SEED_PATH_DEPTH = 64
const MAX_SEED_PATH_LENGTH = 4096

function normalizeRelativePath(value: unknown): string {
  const raw = text(value).trim()
  if (raw.length > MAX_SEED_PATH_LENGTH) {
    throw new Error("Seed file path exceeds the maximum length")
  }
  const parts = raw.split("/")
  if (parts.length > MAX_SEED_PATH_DEPTH) {
    throw new Error("Seed file path exceeds the maximum depth")
  }
  if (
    raw.includes("\0") ||
    raw.includes("\\") ||
    raw.startsWith("/") ||
    parts.length === 0 ||
    parts.some((part) => !part || part === "." || part === "..")
  ) {
    throw new Error("Seed file path must be a safe relative path")
  }
  return parts.join("/")
}

function normalizeHash(value: unknown, algorithm: SeedHashAlgorithm): string {
  const hash = text(value).toLowerCase()
  if (hash && !new RegExp(`^[0-9a-f]{${HEX_LENGTHS[algorithm]}}$`).test(hash)) {
    throw new Error(`Invalid ${algorithm} hash`)
  }
  return hash
}

function normalizeSources(value: unknown): SeedSource[] {
  if (!Array.isArray(value)) return []
  return value.map((item) => {
    if (!item || typeof item !== "object")
      throw new Error("Invalid seed source")
    const type = text((item as any).type)
    const url = text((item as any).url)
    if (!type || !url) throw new Error("Seed source type and URL are required")
    try {
      const parsed = new URL(url)
      if (!parsed.protocol) throw new Error("missing scheme")
    } catch {
      throw new Error("Seed source URL must be absolute")
    }
    return {
      type,
      url,
      expires_at: text((item as any).expires_at),
      share_id: text((item as any).share_id),
    }
  })
}

export function normalizeSeed(input: unknown): SharingSeed {
  if (!input || typeof input !== "object")
    throw new Error("Invalid seed payload")
  const value = input as any
  if (value.format !== undefined && value.format !== SEED_FORMAT) {
    throw new Error("Unsupported seed format")
  }
  if (value.version !== undefined && Number(value.version) !== SEED_VERSION) {
    throw new Error("Unsupported seed version")
  }
  const pieceSize = Number(value.piece_size || DEFAULT_PIECE_SIZE)
  if (
    !Number.isSafeInteger(pieceSize) ||
    pieceSize < 16 * 1024 ||
    pieceSize > 64 * 1024 * 1024
  ) {
    throw new Error("Invalid piece_size")
  }
  if (
    !Array.isArray(value.files) ||
    value.files.length === 0 ||
    value.files.length > 100_000
  ) {
    throw new Error("Seed file count must be between 1 and 100000")
  }
  const files: SeedFile[] = value.files.map((file: any) => {
    if (!file || typeof file !== "object") throw new Error("Invalid seed file")
    const size = Number(file.size)
    if (!Number.isSafeInteger(size) || size < 0)
      throw new Error("Invalid seed file size")
    const hashes = file.hashes || {}
    const pieces = hashes.pieces || {}
    const expectedPieces = size > 0 ? Math.ceil(size / pieceSize) : 0
    const normalizedPieces = (algorithm: SeedHashAlgorithm): string[] => {
      if (!Array.isArray(pieces[algorithm])) return []
      const values = pieces[algorithm].map((hash: unknown) =>
        normalizeHash(hash, algorithm),
      )
      if (values.length !== 0 && values.length !== expectedPieces) {
        throw new Error(
          `${algorithm} piece count is ${values.length}, expected ${expectedPieces}`,
        )
      }
      return values
    }
    return {
      path: normalizeRelativePath(file.path),
      size,
      modified: text(file.modified),
      comment: text(file.comment),
      hashes: {
        md5: normalizeHash(hashes.md5, "md5"),
        sha1: normalizeHash(hashes.sha1, "sha1"),
        sha256: normalizeHash(hashes.sha256, "sha256"),
        pieces: {
          md5: normalizedPieces("md5"),
          sha1: normalizedPieces("sha1"),
          sha256: normalizedPieces("sha256"),
        },
      },
      sources: normalizeSources(file.sources),
      cas_slice_md5: normalizeHash(file.cas_slice_md5, "md5"),
      cas_create_time: text(file.cas_create_time),
      missing_channels: Array.isArray(file.missing_channels)
        ? file.missing_channels.map(text).filter(Boolean)
        : [],
    }
  })
  const seen = new Set<string>()
  for (const file of files) {
    if (seen.has(file.path))
      throw new Error(`Duplicate seed file path: ${file.path}`)
    seen.add(file.path)
  }
  const name = text(value.name) || files[0].path.split("/")[0]
  if (!name.trim() || name === "." || name === ".." || /[\\/\0]/.test(name)) {
    throw new Error("Invalid seed name")
  }
  return {
    format: SEED_FORMAT,
    version: SEED_VERSION,
    name,
    comment: text(value.comment),
    created_at: text(value.created_at) || new Date().toISOString(),
    created_by: text(value.created_by) || "OpenList",
    piece_size: pieceSize,
    trackers: Array.isArray(value.trackers)
      ? value.trackers.map(text).filter(Boolean)
      : [],
    channels: Array.isArray(value.channels)
      ? value.channels.map((channel: any) => {
          if (
            !channel ||
            typeof channel !== "object" ||
            !text(channel.driver).trim()
          ) {
            throw new Error("Seed channel driver is required")
          }
          const mountPath = text(channel.mount_path)
          if (/[?#\0]/.test(mountPath))
            throw new Error(
              "Seed channel mount_path contains invalid characters",
            )
          return { driver: text(channel.driver).trim(), mount_path: mountPath }
        })
      : [],
    files,
  }
}

export interface SeedHashSelection {
  whole: boolean
  pieces: boolean
}

export interface SeedHashMatrix {
  md5: SeedHashSelection
  sha1: SeedHashSelection
  sha256: SeedHashSelection
}

export function normalizeHashMatrix(
  input: unknown,
  formats: SeedFormat[],
): SeedHashMatrix {
  const value = (input && typeof input === "object" ? input : {}) as Record<
    string,
    any
  >
  const select = (algorithm: SeedHashAlgorithm): SeedHashSelection => ({
    whole: !!value[algorithm]?.whole,
    pieces: !!value[algorithm]?.pieces,
  })
  let matrix: SeedHashMatrix = {
    md5: select("md5"),
    sha1: select("sha1"),
    sha256: select("sha256"),
  }
  const allEmpty =
    !matrix.md5.whole &&
    !matrix.md5.pieces &&
    !matrix.sha1.whole &&
    !matrix.sha1.pieces &&
    !matrix.sha256.whole &&
    !matrix.sha256.pieces
  if (allEmpty) {
    matrix = {
      md5: { whole: true, pieces: true },
      sha1: { whole: true, pieces: true },
      sha256: { whole: true, pieces: true },
    }
  }
  for (const format of formats) {
    if (format === "torrent") matrix.sha1 = { whole: true, pieces: true }
    if (format === "cas") matrix.md5 = { whole: true, pieces: true }
  }
  return matrix
}

export function applyHashMatrix(
  file: SeedFile,
  matrix: SeedHashMatrix,
): SeedFile {
  const hashes: SeedHashes = {
    md5: matrix.md5.whole ? file.hashes.md5 : "",
    sha1: matrix.sha1.whole ? file.hashes.sha1 : "",
    sha256: matrix.sha256.whole ? file.hashes.sha256 : "",
    pieces: {
      md5: matrix.md5.pieces ? file.hashes.pieces.md5 : [],
      sha1: matrix.sha1.pieces ? file.hashes.pieces.sha1 : [],
      sha256: matrix.sha256.pieces ? file.hashes.pieces.sha256 : [],
    },
  }
  return { ...file, hashes }
}

export function normalizeSeedPath(path: string): string {
  return normalizeRelativePath(path)
}
