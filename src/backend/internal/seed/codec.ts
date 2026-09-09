import { md5, sha1 } from "hash-wasm"
import {
  CasFileEntry,
  CasPayload,
  DEFAULT_PIECE_SIZE,
  normalizeSeed,
  ParsedSeed,
  SEED_FORMAT,
  SEED_VERSION,
  SeedFile,
  SeedFormat,
  SharingSeed,
} from "./types"

type BValue =
  | number
  | string
  | Uint8Array
  | BValue[]
  | { [key: string]: BValue }

const encoder = new TextEncoder()
const decoder = new TextDecoder("utf-8", { fatal: true })
const MAX_BENCODE_DEPTH = 32
const MAX_BENCODE_ITEMS = 100_000

function concatBytes(parts: Uint8Array[]): Uint8Array {
  const length = parts.reduce((sum, part) => sum + part.byteLength, 0)
  const result = new Uint8Array(length)
  let offset = 0
  for (const part of parts) {
    result.set(part, offset)
    offset += part.byteLength
  }
  return result
}

function encodeBencode(value: BValue): Uint8Array {
  if (value instanceof Uint8Array) {
    return concatBytes([encoder.encode(`${value.byteLength}:`), value])
  }
  if (typeof value === "string") return encodeBencode(encoder.encode(value))
  if (typeof value === "number") {
    if (!Number.isSafeInteger(value))
      throw new Error("Bencode integer is out of range")
    return encoder.encode(`i${value}e`)
  }
  if (Array.isArray(value)) {
    return concatBytes([
      encoder.encode("l"),
      ...value.map(encodeBencode),
      encoder.encode("e"),
    ])
  }
  const entries = Object.entries(value).sort(([a], [b]) => {
    const aa = encoder.encode(a)
    const bb = encoder.encode(b)
    const length = Math.min(aa.length, bb.length)
    for (let i = 0; i < length; i++) if (aa[i] !== bb[i]) return aa[i] - bb[i]
    return aa.length - bb.length
  })
  return concatBytes([
    encoder.encode("d"),
    ...entries.flatMap(([key, item]) => [
      encodeBencode(key),
      encodeBencode(item),
    ]),
    encoder.encode("e"),
  ])
}

function decodeBencode(data: Uint8Array): BValue {
  let offset = 0
  let items = 0
  const parse = (depth: number): BValue => {
    if (++items > MAX_BENCODE_ITEMS)
      throw new Error("Bencode item limit exceeded")
    if (depth > MAX_BENCODE_DEPTH)
      throw new Error("Bencode nesting limit exceeded")
    const marker = data[offset]
    if (marker === 0x69) {
      const end = data.indexOf(0x65, ++offset)
      if (end < 0) throw new Error("Unterminated bencode integer")
      const raw = decoder.decode(data.subarray(offset, end))
      if (!/^(0|-?[1-9]\d*)$/.test(raw))
        throw new Error("Invalid bencode integer")
      const value = Number(raw)
      if (!Number.isSafeInteger(value))
        throw new Error("Bencode integer is out of range")
      offset = end + 1
      return value
    }
    if (marker === 0x6c) {
      offset++
      const list: BValue[] = []
      while (offset < data.length && data[offset] !== 0x65)
        list.push(parse(depth + 1))
      if (data[offset++] !== 0x65) throw new Error("Unterminated bencode list")
      return list
    }
    if (marker === 0x64) {
      offset++
      const dict: Record<string, BValue> = {}
      while (offset < data.length && data[offset] !== 0x65) {
        const keyBytes = parse(depth + 1)
        if (!(keyBytes instanceof Uint8Array))
          throw new Error("Bencode dictionary key is not a string")
        const key = decoder.decode(keyBytes)
        dict[key] = parse(depth + 1)
      }
      if (data[offset++] !== 0x65)
        throw new Error("Unterminated bencode dictionary")
      return dict
    }
    if (marker >= 0x30 && marker <= 0x39) {
      const colon = data.indexOf(0x3a, offset)
      if (colon < 0) throw new Error("Invalid bencode byte string")
      const rawLength = decoder.decode(data.subarray(offset, colon))
      if (!/^(0|[1-9]\d*)$/.test(rawLength))
        throw new Error("Invalid bencode byte string length")
      const length = Number(rawLength)
      const start = colon + 1
      const end = start + length
      if (!Number.isSafeInteger(length) || end > data.length)
        throw new Error("Truncated bencode byte string")
      offset = end
      return data.slice(start, end)
    }
    throw new Error("Invalid bencode value")
  }
  const result = parse(0)
  if (offset !== data.length) throw new Error("Trailing bencode data")
  return result
}

function asDict(value: BValue, field: string): Record<string, BValue> {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    value instanceof Uint8Array
  ) {
    throw new Error(`${field} must be a dictionary`)
  }
  return value
}

function asBytes(value: BValue | undefined): Uint8Array {
  return value instanceof Uint8Array ? value : new Uint8Array()
}

function asString(value: BValue | undefined): string {
  if (value instanceof Uint8Array) return decoder.decode(value)
  return typeof value === "string" ? value : ""
}

function asNumber(value: BValue | undefined): number {
  return typeof value === "number" ? value : 0
}

function asStringList(value: BValue | undefined): string[] {
  if (!Array.isArray(value)) return []
  return value.map((item) => asString(item)).filter(Boolean)
}

function toBencodeValue(value: unknown): BValue {
  if (value === null || value === undefined) return ""
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    value instanceof Uint8Array
  )
    return value
  if (typeof value === "boolean") return value ? 1 : 0
  if (Array.isArray(value)) return value.map(toBencodeValue)
  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, toBencodeValue(item)]),
    )
  }
  return String(value)
}

function fromBencodeValue(value: BValue): unknown {
  if (value instanceof Uint8Array) return decoder.decode(value)
  if (Array.isArray(value)) return value.map(fromBencodeValue)
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, fromBencodeValue(item)]),
    )
  }
  return value
}

function hexToBytes(value: string): Uint8Array {
  if (!value || value.length % 2 !== 0 || !/^[0-9a-f]+$/i.test(value))
    return new Uint8Array()
  const result = new Uint8Array(value.length / 2)
  for (let i = 0; i < result.length; i++)
    result[i] = parseInt(value.slice(i * 2, i * 2 + 2), 16)
  return result
}

function bytesToHex(value: Uint8Array): string {
  return Array.from(value, (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
  )
}

function torrentPieceHashes(seed: SharingSeed): string[] {
  if (seed.files.length > 1) {
    for (const file of seed.files.slice(0, -1)) {
      if (file.size % seed.piece_size !== 0) {
        throw new Error(
          "Cannot convert this multi-file seed to a standard torrent: a file boundary splits a piece",
        )
      }
    }
  }
  return seed.files.flatMap((file) => file.hashes.pieces.sha1)
}

async function buildCasExtension(
  file: SeedFile,
  pieceSize: number,
): Promise<Record<string, BValue> | undefined> {
  if (!file.hashes.md5) return undefined
  let sliceMd5 = file.cas_slice_md5 ? file.cas_slice_md5.toUpperCase() : ""
  const hashes = file.hashes.pieces.md5.map((hash) => hash.toUpperCase())
  if (!sliceMd5 && hashes.length > 0 && pieceSize === DEFAULT_PIECE_SIZE) {
    sliceMd5 =
      hashes.length > 1
        ? (await md5(hashes.join("\n"))).toUpperCase()
        : hashes[0]
  }
  if (!sliceMd5) return undefined
  return {
    cloud: "189",
    file_md5: file.hashes.md5.toUpperCase(),
    slice_md5: sliceMd5,
    slice_md5s: hashes,
    slice_size: pieceSize,
  }
}

export function encodeOss(seed: SharingSeed): Uint8Array {
  return encoder.encode(JSON.stringify(normalizeSeed(seed), null, 2))
}

export function decodeOss(data: Uint8Array): SharingSeed {
  const value = JSON.parse(decoder.decode(data))
  if (
    value?.format !== SEED_FORMAT ||
    Number(value?.version) !== SEED_VERSION ||
    !value?.created_at ||
    !value?.created_by
  ) {
    throw new Error("Invalid or incomplete OpenList sharing seed")
  }
  return normalizeSeed(value)
}

async function buildCasFileEntry(
  file: SeedFile,
  pieceSize: number,
): Promise<CasFileEntry> {
  if (!file.hashes.md5)
    throw new Error(`CAS requires a whole-file MD5 for ${file.path}`)
  let sliceMd5 = file.cas_slice_md5 ? file.cas_slice_md5.toUpperCase() : ""
  if (
    !sliceMd5 &&
    file.hashes.pieces.md5.length > 0 &&
    pieceSize === DEFAULT_PIECE_SIZE
  ) {
    const hashes = file.hashes.pieces.md5.map((hash) => hash.toUpperCase())
    sliceMd5 =
      hashes.length > 1
        ? (await md5(hashes.join("\n"))).toUpperCase()
        : hashes[0]
  }
  if (!sliceMd5) {
    if (file.size > DEFAULT_PIECE_SIZE) {
      throw new Error(
        `CAS requires a legacy slice MD5 or complete 10 MiB MD5 pieces for ${file.path}`,
      )
    }
    sliceMd5 = file.hashes.md5.toUpperCase()
  }
  const entry: CasFileEntry = {
    name: file.path.split("/").pop() || file.path,
    size: file.size,
    md5: file.hashes.md5,
    sliceMd5,
    create_time: file.cas_create_time || String(Math.floor(Date.now() / 1000)),
  }
  if (file.hashes.pieces.md5.length > 0) {
    entry.slice_md5s = file.hashes.pieces.md5.map((hash) => hash.toUpperCase())
    entry.slice_size = pieceSize || DEFAULT_PIECE_SIZE
  }
  return entry
}

export async function encodeCas(seedInput: SharingSeed): Promise<Uint8Array> {
  const seed = normalizeSeed(seedInput)
  if (seed.files.length === 0) throw new Error("CAS requires at least one file")
  let payload: CasPayload
  if (seed.files.length === 1) {
    const entry = await buildCasFileEntry(seed.files[0], seed.piece_size)
    payload = {
      name: entry.name,
      size: entry.size,
      md5: entry.md5,
      sliceMd5: entry.sliceMd5,
      create_time: entry.create_time,
      slice_md5s: entry.slice_md5s,
      slice_size: entry.slice_size,
    }
  } else {
    const entries: CasFileEntry[] = []
    let totalSize = 0
    for (const file of seed.files) {
      const entry = await buildCasFileEntry(file, seed.piece_size)
      entries.push(entry)
      totalSize += entry.size
    }
    payload = {
      name: seed.name,
      size: totalSize,
      md5: "",
      sliceMd5: "",
      create_time: "",
      files: entries,
    }
  }
  return encoder.encode(Buffer.from(JSON.stringify(payload)).toString("base64"))
}

export function decodeCas(data: Uint8Array): ParsedSeed {
  const trimmed = decoder.decode(data).trim()
  let decoded = trimmed
  try {
    decoded = Buffer.from(trimmed, "base64").toString("utf8")
    JSON.parse(decoded)
  } catch {
    decoded = trimmed
  }
  const value = JSON.parse(decoded) as Partial<CasPayload> & {
    files?: CasFileEntry[]
  }

  const fileFromEntry = (entry: CasFileEntry): SeedFile => {
    if (
      !entry.name ||
      !Number.isSafeInteger(entry.size) ||
      Number(entry.size) < 0 ||
      !entry.md5
    ) {
      throw new Error("Invalid CAS file entry")
    }
    const md5Hash = String(entry.md5).toLowerCase()
    const sliceMd5 = String(entry.sliceMd5 || entry.md5).toLowerCase()
    if (!/^[0-9a-f]{32}$/i.test(md5Hash) || !/^[0-9a-f]{32}$/i.test(sliceMd5)) {
      throw new Error("Invalid CAS hash")
    }
    const pieceMd5s = Array.isArray(entry.slice_md5s)
      ? entry.slice_md5s.map((hash) => String(hash).toLowerCase())
      : []
    return {
      path: entry.name,
      size: Number(entry.size),
      modified: "",
      comment: "",
      hashes: {
        md5: md5Hash,
        sha1: "",
        sha256: "",
        pieces: { md5: pieceMd5s, sha1: [], sha256: [] },
      },
      sources: [],
      cas_slice_md5: sliceMd5,
      cas_create_time: entry.create_time || "",
      missing_channels: [],
    }
  }

  // Multi-file extension.
  if (Array.isArray(value.files) && value.files.length > 0) {
    const files = value.files.map(fileFromEntry)
    const cas: CasPayload = {
      name: String(value.name),
      size: files.reduce((sum, file) => sum + file.size, 0),
      md5: "",
      sliceMd5: "",
      create_time: "",
      files: value.files,
    }
    return {
      format: "cas",
      cas,
      seed: normalizeSeed({
        name: value.name,
        comment: "Imported from OpenList CAS metadata",
        created_at: new Date().toISOString(),
        created_by: "OpenList",
        piece_size: DEFAULT_PIECE_SIZE,
        files,
      }),
    }
  }

  if (
    !value.name ||
    !Number.isSafeInteger(value.size) ||
    Number(value.size) < 0 ||
    !value.md5
  ) {
    throw new Error("Invalid CAS payload")
  }
  const md5Hash = String(value.md5).toLowerCase()
  const sliceMd5 = String(value.sliceMd5 || value.md5)
  if (!/^[0-9a-f]{32}$/i.test(md5Hash) || !/^[0-9a-f]{32}$/i.test(sliceMd5)) {
    throw new Error("Invalid CAS hash")
  }
  const created = Number(value.create_time)
  const cas: CasPayload = {
    name: String(value.name),
    size: Number(value.size),
    md5: md5Hash,
    sliceMd5,
    create_time: String(value.create_time || ""),
    slice_md5s: value.slice_md5s,
    slice_size: value.slice_size,
  }
  return {
    format: "cas",
    cas,
    seed: normalizeSeed({
      name: value.name,
      comment: "Imported from OpenList CAS metadata",
      created_at:
        Number.isFinite(created) && created > 0
          ? new Date(created * 1000).toISOString()
          : new Date().toISOString(),
      created_by: "OpenList",
      piece_size: value.slice_size || DEFAULT_PIECE_SIZE,
      files: [
        fileFromEntry({
          name: value.name,
          size: Number(value.size),
          md5: md5Hash,
          sliceMd5: sliceMd5,
          create_time: String(value.create_time || ""),
          slice_md5s: value.slice_md5s,
          slice_size: value.slice_size,
        }),
      ],
    }),
  }
}

export async function encodeTorrent(
  seedInput: SharingSeed,
  generatedPieceHashes?: string[],
): Promise<Uint8Array> {
  const seed = normalizeSeed(seedInput)
  const pieceHashes = generatedPieceHashes || torrentPieceHashes(seed)
  if (pieceHashes.some((hash) => hash.length !== 40))
    throw new Error("Torrent conversion requires SHA-1 piece hashes")
  const info: Record<string, BValue> = {
    name: seed.name,
    "piece length": seed.piece_size,
    pieces: concatBytes(pieceHashes.map(hexToBytes)),
  }
  if (seed.files.length === 1) {
    info.length = seed.files[0].size
    if (seed.files[0].hashes.md5) info.md5sum = seed.files[0].hashes.md5
  } else {
    info.files = seed.files.map((file) => {
      const entry: Record<string, BValue> = {
        length: file.size,
        path: file.path.split("/"),
      }
      if (file.hashes.md5) entry.md5sum = file.hashes.md5
      return entry
    })
  }
  const root: Record<string, BValue> = {
    info,
    comment: seed.comment,
    "created by": seed.created_by,
    "creation date":
      Math.floor(new Date(seed.created_at).getTime() / 1000) ||
      Math.floor(Date.now() / 1000),
    "x-openlist": toBencodeValue(seed),
  }
  if (seed.trackers.length) {
    root.announce = seed.trackers[0]
    root["announce-list"] = seed.trackers.map((tracker) => [tracker])
  }
  if (seed.files.length === 1) {
    const cas = await buildCasExtension(seed.files[0], seed.piece_size)
    if (cas) root["x-cas"] = cas
  }
  return encodeBencode(root)
}

function decodeTorrentFiles(
  info: Record<string, BValue>,
  name: string,
  pieces: string[],
  pieceSize: number,
  casExtension?: Record<string, BValue>,
): SeedFile[] {
  const rawFiles = Array.isArray(info.files) ? info.files : null
  const entries = rawFiles
    ? rawFiles.map((raw) => {
        const file = asDict(raw, "torrent file")
        return {
          path: (Array.isArray(file.path) ? file.path.map(asString) : []).join(
            "/",
          ),
          size: asNumber(file.length),
          md5: asString(file.md5sum),
        }
      })
    : [{ path: name, size: asNumber(info.length), md5: asString(info.md5sum) }]
  let pieceOffset = 0
  return entries.map((entry, index) => {
    const pieceCount = entry.size > 0 ? Math.ceil(entry.size / pieceSize) : 0
    const aligned = index === entries.length - 1 || entry.size % pieceSize === 0
    const sha1Pieces =
      aligned && pieceOffset + pieceCount <= pieces.length
        ? pieces.slice(pieceOffset, pieceOffset + pieceCount)
        : []
    pieceOffset += pieceCount
    const casSliceMd5 =
      entries.length === 1 && casExtension
        ? asString(casExtension.slice_md5)
        : ""
    const casCreateTime =
      entries.length === 1 && casExtension
        ? asString(casExtension.create_time)
        : ""
    return {
      path: entry.path,
      size: entry.size,
      modified: "",
      comment: "",
      hashes: {
        md5: entry.md5.toLowerCase(),
        sha1: "",
        sha256: "",
        pieces: { md5: [], sha1: sha1Pieces, sha256: [] },
      },
      sources: [],
      cas_slice_md5: casSliceMd5.toLowerCase(),
      cas_create_time: casCreateTime,
      missing_channels: [],
    }
  })
}

export async function decodeTorrent(data: Uint8Array): Promise<ParsedSeed> {
  const root = asDict(decodeBencode(data), "torrent root")
  const info = asDict(root.info, "torrent info")
  const infoHash = await sha1(encodeBencode(info))
  const name = asString(info.name)
  const pieceSize = asNumber(info["piece length"])
  const pieceBytes = asBytes(info.pieces)
  if (!name || pieceSize <= 0 || pieceBytes.length % 20 !== 0)
    throw new Error("Invalid torrent info dictionary")
  const totalSize = Array.isArray(info.files)
    ? info.files.reduce<number>(
        (sum, raw) => sum + asNumber(asDict(raw, "torrent file").length),
        0,
      )
    : asNumber(info.length)
  const expectedPieces = totalSize > 0 ? Math.ceil(totalSize / pieceSize) : 0
  if (pieceBytes.length / 20 !== expectedPieces)
    throw new Error("Torrent piece count mismatch")
  if (root["x-openlist"]) {
    const seed = normalizeSeed(fromBencodeValue(root["x-openlist"]))
    validateOpenListTorrentConsistency(seed, info, name, pieceSize)
    return { format: "torrent", seed, info_hash: infoHash }
  }
  const pieces: string[] = []
  for (let i = 0; i < pieceBytes.length; i += 20)
    pieces.push(bytesToHex(pieceBytes.subarray(i, i + 20)))
  const trackers = [
    asString(root.announce),
    ...(Array.isArray(root["announce-list"])
      ? root["announce-list"].flatMap((tier) => asStringList(tier))
      : []),
  ].filter((value, index, list) => value && list.indexOf(value) === index)
  const createdAt = asNumber(root["creation date"])
  const casExtension = root["x-cas"]
    ? asDict(root["x-cas"], "x-cas")
    : undefined
  const seed = normalizeSeed({
    name,
    comment: asString(root.comment),
    created_at:
      createdAt > 0
        ? new Date(createdAt * 1000).toISOString()
        : new Date().toISOString(),
    created_by: asString(root["created by"]) || "OpenList",
    piece_size: pieceSize,
    trackers,
    channels: [],
    files: decodeTorrentFiles(info, name, pieces, pieceSize, casExtension),
  })
  return { format: "torrent", seed, info_hash: infoHash }
}

function validateOpenListTorrentConsistency(
  seed: SharingSeed,
  info: Record<string, BValue>,
  name: string,
  pieceSize: number,
): void {
  if (seed.name !== name || seed.piece_size !== pieceSize) {
    throw new Error("x-openlist metadata conflicts with torrent info")
  }
  const rawFiles = Array.isArray(info.files) ? info.files : null
  if (!rawFiles) {
    if (
      seed.files.length !== 1 ||
      seed.files[0].size !== asNumber(info.length)
    ) {
      throw new Error("x-openlist file list conflicts with torrent info")
    }
    return
  }
  if (seed.files.length !== rawFiles.length) {
    throw new Error("x-openlist file count conflicts with torrent info")
  }
  rawFiles.forEach((raw, index) => {
    const file = asDict(raw, "torrent file")
    const path = (Array.isArray(file.path) ? file.path.map(asString) : []).join(
      "/",
    )
    if (
      seed.files[index].path !== path ||
      seed.files[index].size !== asNumber(file.length)
    ) {
      throw new Error(`x-openlist file ${index} conflicts with torrent info`)
    }
  })
}

export async function parseSeed(
  data: Uint8Array,
  formatHint?: SeedFormat,
): Promise<ParsedSeed> {
  if (formatHint === "oss") return { format: "oss", seed: decodeOss(data) }
  if (formatHint === "torrent") return decodeTorrent(data)
  if (formatHint === "cas") return decodeCas(data)
  const first = decoder
    .decode(data.subarray(0, Math.min(data.length, 32)))
    .trimStart()[0]
  if (first === "{") return { format: "oss", seed: decodeOss(data) }
  if (first === "d") return decodeTorrent(data)
  return decodeCas(data)
}

export async function encodeSeed(
  seed: SharingSeed,
  format: SeedFormat,
): Promise<Uint8Array> {
  if (format === "oss") return encodeOss(seed)
  if (format === "torrent") return encodeTorrent(seed)
  return encodeCas(seed)
}

export const bencodeForTest = { encode: encodeBencode, decode: decodeBencode }
