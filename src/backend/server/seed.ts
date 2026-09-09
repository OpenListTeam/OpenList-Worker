import { Hono } from "hono"
import { getUserFromContext } from "./middlewares"
import { canWrite, getActualPath, can, PermissionBit } from "../pkg/permission"
import { assertSafeUrl } from "../pkg/http"
import { safeErrorMessage } from "../pkg/errs"
import { getSettings, resolvePath } from "../internal/model/db"
import {
  flushPendingDriverState,
  getDriver,
  getItem,
  listItems,
  putItem,
} from "../internal/op/storage"
import {
  decodeOss,
  encodeSeed,
  encodeTorrent,
  parseSeed,
} from "../internal/seed/codec"
import { hashReadableStream, TorrentPieceHasher } from "../internal/seed/hash"
import {
  applyHashMatrix,
  DEFAULT_PIECE_SIZE,
  normalizeHashMatrix,
  normalizeSeed,
  normalizeSeedPath,
  SeedFile,
  SeedFormat,
  SeedSource,
  SharingSeed,
} from "../internal/seed/types"

export const seedRouter = new Hono()

const DEFAULT_MAX_SEED_BYTES = 10 * 1024 * 1024
const DEFAULT_MAX_HASH_BYTES = 512 * 1024 * 1024
const DEFAULT_MAX_FILES = 1_000
const DEFAULT_TRANSFER_CHUNK_SIZE = 8 * 1024 * 1024
const DEFAULT_BUFFERED_TRANSFER_MAX = 4 * 1024 * 1024

function envNumber(c: any, key: string, fallback: number): number {
  const raw =
    c.env?.[key] ??
    (typeof process !== "undefined" ? process.env?.[key] : undefined)
  const value = Number(raw)
  return Number.isSafeInteger(value) && value > 0 ? value : fallback
}

function storageContext(c: any) {
  try {
    if (typeof c.executionCtx?.waitUntil !== "function") return undefined
    return {
      waitUntil: (promise: Promise<unknown>) =>
        c.executionCtx.waitUntil(promise),
    }
  } catch {
    return undefined
  }
}

function errorResponse(
  c: any,
  status: 400 | 401 | 403 | 413 | 500 | 501,
  message: string,
) {
  return c.json({ code: status, message, data: null }, status)
}

async function readJson(c: any): Promise<any> {
  const max = envNumber(c, "SEED_MAX_METADATA_SIZE", DEFAULT_MAX_SEED_BYTES)
  const declared = Number(c.req.header("Content-Length") || 0)
  if (declared > max)
    throw new Error(`Seed request exceeds the ${max} byte limit`)
  const text = await c.req.text()
  if (new TextEncoder().encode(text).byteLength > max)
    throw new Error(`Seed request exceeds the ${max} byte limit`)
  if (!text.trim()) return {}
  return JSON.parse(text)
}

function normalizeVirtualPath(value: unknown, fallback = "/"): string {
  const raw = String(value || fallback)
    .replace(/\\/g, "/")
    .trim()
  if (raw.includes("\0")) throw new Error("Path contains an illegal null byte")
  const parts = raw.split("/").filter(Boolean)
  if (parts.some((part) => part === "." || part === ".."))
    throw new Error("Path traversal is not allowed")
  return "/" + parts.join("/")
}

function joinVirtualPath(base: string, relative: string): string {
  return normalizeVirtualPath(`${base.replace(/\/+$/, "")}/${relative}`)
}

function writableActualPath(user: any, value: unknown): string {
  if (!canWrite(user)) throw new Error("Permission denied")
  const virtualPath = normalizeVirtualPath(value)
  if (virtualPath === "/@s" || virtualPath.startsWith("/@s/")) {
    throw new Error("Writing through a share path is not allowed")
  }
  const actualPath = getActualPath(user, virtualPath)
  const basePath = normalizeVirtualPath(user?.base_path || "/")
  if (
    basePath !== "/" &&
    actualPath !== basePath &&
    !actualPath.startsWith(`${basePath}/`)
  ) {
    throw new Error("Target path is outside the user base path")
  }
  return actualPath
}

function contentBytes(value: unknown, encoding?: unknown): Uint8Array {
  if (value instanceof Uint8Array) return value
  if (
    Array.isArray(value) &&
    value.every((item) => Number.isInteger(item) && item >= 0 && item <= 255)
  ) {
    return Uint8Array.from(value)
  }
  if (typeof value !== "string") throw new Error("Seed content is required")
  if (
    encoding === "text" ||
    value.trimStart().startsWith("{") ||
    value.trimStart().startsWith("d")
  ) {
    return new TextEncoder().encode(value)
  }
  return new Uint8Array(Buffer.from(value, "base64"))
}

function detectFormat(value: unknown): SeedFormat | undefined {
  const format = String(value || "")
    .toLowerCase()
    .replace(/^\./, "")
  return format === "oss" || format === "torrent" || format === "cas"
    ? format
    : undefined
}

function fileNameFor(seed: SharingSeed, format: SeedFormat): string {
  const base = seed.name.replace(/[\\/:*?"<>|\0]/g, "_") || "seed"
  return `${base}.${format === "torrent" ? "torrent" : format}`
}

function baseName(path: string): string {
  const name = path.split("/").pop() || path
  const dot = name.lastIndexOf(".")
  return dot > 0 ? name.slice(0, dot) : name
}

// deriveSeedName mirrors the Go backend: single file -> file name, multi-file
// with a common base name -> that base, otherwise the common parent folder.
function deriveSeedName(sourceFiles: { virtualPath: string }[]): string {
  if (sourceFiles.length === 0) return "OpenList Seed"
  if (sourceFiles.length === 1) return baseName(sourceFiles[0].virtualPath)
  const commonBase = baseName(sourceFiles[0].virtualPath)
  const allSame = sourceFiles.every(
    (file) => baseName(file.virtualPath) === commonBase,
  )
  if (allSame && commonBase) return commonBase
  const first = sourceFiles[0].virtualPath.split("/").slice(0, -1)
  let common = first
  for (const file of sourceFiles.slice(1)) {
    const parts = file.virtualPath.split("/").slice(0, -1)
    let n = 0
    while (n < common.length && n < parts.length && common[n] === parts[n]) n++
    common = common.slice(0, n)
  }
  const folder = common[common.length - 1]
  return folder || "OpenList Seed"
}

function encodedResult(
  seed: SharingSeed,
  format: SeedFormat,
  bytes: Uint8Array,
  extra: Record<string, unknown> = {},
) {
  const seedData = Buffer.from(bytes).toString("base64")
  return {
    format,
    file_name: fileNameFor(seed, format),
    seed_data: seedData,
    size: bytes.byteLength,
    seed,
    ...extra,
  }
}

function allowedHosts(c: any): string[] {
  const raw =
    c.env?.SEED_SOURCE_ALLOWED_HOSTS ??
    (typeof process !== "undefined"
      ? process.env?.SEED_SOURCE_ALLOWED_HOSTS
      : "")
  return String(raw || "")
    .split(/[\s,;]+/)
    .map((host) => host.toLowerCase())
    .filter(Boolean)
}

function hostAllowed(hostname: string, allowlist: string[]): boolean {
  const host = hostname.toLowerCase()
  return allowlist.some((entry) =>
    entry.startsWith("*.")
      ? host.endsWith(entry.slice(1)) && host !== entry.slice(2)
      : host === entry,
  )
}

function validateSource(c: any, source: SeedSource): URL {
  if (!source.url) throw new Error("Seed source URL is required")
  const requestUrl = new URL(c.req.url)
  const url = new URL(source.url, requestUrl.origin)
  assertSafeUrl(url.toString(), "Seed source")
  if (url.username || url.password)
    throw new Error("Seed source URL credentials are not allowed")
  const type = source.type.toLowerCase()
  const sameOpenList =
    url.origin === requestUrl.origin &&
    (/^\/(api\/)?p\//.test(url.pathname) ||
      url.pathname.startsWith("/d/") ||
      url.pathname.startsWith("/@s/"))
  const shareSource =
    ["share", "openlist-share"].includes(type) &&
    url.pathname.startsWith("/@s/")
  const directSource =
    ["direct", "openlist-direct"].includes(type) && sameOpenList
  if (
    !shareSource &&
    !directSource &&
    !hostAllowed(url.hostname, allowedHosts(c))
  ) {
    throw new Error(
      "Seed source host is not an approved OpenList endpoint or configured domain",
    )
  }
  if (source.expires_at) {
    const expires = Date.parse(source.expires_at)
    if (!Number.isFinite(expires) || expires <= Date.now())
      throw new Error("Seed source has expired")
  }
  return url
}

async function fetchSafe(
  c: any,
  url: URL,
  init: RequestInit = {},
  restrictToSeedSources = false,
): Promise<Response> {
  let current = url
  for (let redirect = 0; redirect <= 3; redirect++) {
    assertSafeUrl(current.toString(), "Seed fetch")
    if (restrictToSeedSources) {
      const requestUrl = new URL(c.req.url)
      const sameOpenList =
        current.origin === requestUrl.origin &&
        (/^\/(api\/)?p\//.test(current.pathname) ||
          current.pathname.startsWith("/@s/"))
      if (!sameOpenList && !hostAllowed(current.hostname, allowedHosts(c))) {
        throw new Error(
          "Seed fetch redirect left the approved source allowlist",
        )
      }
    }
    const response = await fetch(current, { ...init, redirect: "manual" })
    if (response.status < 300 || response.status >= 400) return response
    const location = response.headers.get("Location")
    if (!location)
      throw new Error("Seed fetch redirect is missing a Location header")
    current = new URL(location, current)
  }
  throw new Error("Seed fetch exceeded the redirect limit")
}

async function readStoredSeed(
  c: any,
  user: any,
  path: string,
): Promise<Uint8Array> {
  const actualPath = getActualPath(user, normalizeVirtualPath(path))
  const { item } = await getItem(actualPath, storageContext(c))
  const max = envNumber(c, "SEED_MAX_METADATA_SIZE", DEFAULT_MAX_SEED_BYTES)
  if (item.is_dir || item.size < 0 || item.size > max)
    throw new Error(`Seed file exceeds the ${max} byte limit`)
  const rawUrl =
    item.raw_url || `${new URL(c.req.url).origin}/api/p${actualPath}`
  const headers = item.raw_url_headers || {}
  if (!item.raw_url && c.req.header("Authorization"))
    headers.Authorization = c.req.header("Authorization")!
  const response = await fetchSafe(c, new URL(rawUrl, c.req.url), { headers })
  if (!response.ok)
    throw new Error(`Seed file download failed with HTTP ${response.status}`)
  const declared = Number(response.headers.get("Content-Length") || item.size)
  if (declared > max) throw new Error(`Seed file exceeds the ${max} byte limit`)
  const reader = response.body?.getReader()
  if (!reader) throw new Error("Seed file response has no body")
  const chunks: Uint8Array[] = []
  let total = 0
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    if (!value?.length) continue
    total += value.length
    if (total > max) throw new Error(`Seed file exceeds the ${max} byte limit`)
    chunks.push(value)
  }
  const result = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) {
    result.set(chunk, offset)
    offset += chunk.length
  }
  return result
}

async function parseBodySeed(c: any, user: any, body: any) {
  if (body.seed && typeof body.seed === "object") {
    return { format: "oss" as const, seed: normalizeSeed(body.seed) }
  }
  const max = envNumber(c, "SEED_MAX_METADATA_SIZE", DEFAULT_MAX_SEED_BYTES)
  const hasInlineData =
    body.seed_data || body.content || body.data || body.torrent_data
  const bytes =
    body.seed_path || (body.path && !hasInlineData)
      ? await readStoredSeed(c, user, String(body.seed_path || body.path))
      : contentBytes(
          body.seed_data ?? body.content ?? body.data ?? body.torrent_data,
          body.encoding,
        )
  if (bytes.byteLength > max)
    throw new Error(`Seed content exceeds the ${max} byte limit`)
  return parseSeed(
    bytes,
    detectFormat(
      body.format || body.from_format || body.file_name?.split(".").pop(),
    ),
  )
}

interface SourceFile {
  virtualPath: string
  relativePath: string
  size: number
  modified: string
  rawUrl: string
  headers: Record<string, string>
}

async function collectSourceFiles(
  c: any,
  user: any,
  requested: unknown,
): Promise<SourceFile[]> {
  const paths = Array.isArray(requested) ? requested : [requested]
  if (
    !paths.length ||
    paths.some((path) => typeof path !== "string" || !path.trim())
  ) {
    throw new Error("paths must contain at least one path")
  }
  const maxFiles = envNumber(c, "SEED_MAX_FILES", DEFAULT_MAX_FILES)
  const result: SourceFile[] = []
  const visit = async (
    virtualPath: string,
    relativePath: string,
  ): Promise<void> => {
    if (result.length >= maxFiles)
      throw new Error(`Seed file count exceeds the ${maxFiles} file limit`)
    const actualPath = getActualPath(user, virtualPath)
    const { item } = await getItem(actualPath, storageContext(c))
    if (!item.is_dir) {
      const rawUrl =
        item.raw_url || `${new URL(c.req.url).origin}/api/p${actualPath}`
      const headers = { ...(item.raw_url_headers || {}) }
      if (!item.raw_url && c.req.header("Authorization"))
        headers.Authorization = c.req.header("Authorization")!
      result.push({
        virtualPath: actualPath,
        relativePath: normalizeSeedPath(relativePath),
        size: item.size,
        modified: item.modified || "",
        rawUrl,
        headers,
      })
      return
    }
    const { content } = await listItems(actualPath, storageContext(c))
    for (const child of content) {
      const childVirtual = joinVirtualPath(virtualPath, child.name)
      const childRelative = `${relativePath.replace(/\/$/, "")}/${child.name}`
      await visit(childVirtual, childRelative)
    }
  }
  for (const raw of paths) {
    const virtualPath = normalizeVirtualPath(raw)
    const name = virtualPath.split("/").filter(Boolean).pop() || "root"
    await visit(virtualPath, name)
  }
  if (!result.length) throw new Error("No files were found for seed generation")
  return result
}

function conversionDiagnostics(
  seed: SharingSeed,
  format: SeedFormat,
): string[] {
  if (format === "cas") {
    const diagnostics: string[] = []
    for (const file of seed.files) {
      if (!file.hashes.md5)
        diagnostics.push(`${file.path}: missing whole-file MD5`)
      const hasLegacyAggregate = !!file.cas_slice_md5
      const hasFixedPieces =
        seed.piece_size === DEFAULT_PIECE_SIZE &&
        file.hashes.pieces.md5.length > 0
      if (
        file.size > DEFAULT_PIECE_SIZE &&
        !hasLegacyAggregate &&
        !hasFixedPieces
      ) {
        diagnostics.push(
          `${file.path}: missing legacy slice MD5 or complete 10 MiB MD5 pieces`,
        )
      }
    }
    return diagnostics
  }
  if (format === "torrent") {
    const diagnostics: string[] = []
    seed.files.forEach((file, index) => {
      if (!file.hashes.pieces.sha1.length)
        diagnostics.push(`${file.path}: missing SHA-1 piece hashes`)
      if (
        seed.files.length > 1 &&
        index < seed.files.length - 1 &&
        file.size % seed.piece_size !== 0
      ) {
        diagnostics.push(`${file.path}: piece boundary crosses the next file`)
      }
    })
    return diagnostics
  }
  return []
}

function seedDiagnostics(seed: SharingSeed) {
  return {
    oss: conversionDiagnostics(seed, "oss"),
    torrent: conversionDiagnostics(seed, "torrent"),
    cas: conversionDiagnostics(seed, "cas"),
  }
}

function seedConversionStates(seed: SharingSeed) {
  return Object.fromEntries(
    (["oss", "torrent", "cas"] as SeedFormat[]).map((format) => {
      const missing = conversionDiagnostics(seed, format)
      return [format, { feasible: missing.length === 0, missing }]
    }),
  )
}

async function saveEncodedSeed(
  c: any,
  user: any,
  path: unknown,
  bytes: Uint8Array,
): Promise<void> {
  if (!path) return
  const actualPath = writableActualPath(user, path)
  await putItem(actualPath, Buffer.from(bytes), storageContext(c))
}

async function loadDefaultMatrix(): Promise<Record<string, any> | undefined> {
  try {
    const settings = await getSettings()
    const raw = settings["seed_default_matrix"]
    if (raw) {
      const parsed = JSON.parse(String(raw))
      if (parsed && typeof parsed === "object") return parsed
    }
  } catch {
    // ignore malformed settings
  }
  return undefined
}

async function resolveSeedSiteUrl(c: any): Promise<string> {
  try {
    const settings = await getSettings()
    const configured = String(settings["seed_site_url"] || "").trim()
    if (configured) return configured.replace(/\/+$/, "")
  } catch {
    // fall through to the request origin
  }
  return new URL(c.req.url).origin
}

async function resolveSeedMatrix(
  c: any,
  input: unknown,
  formats: SeedFormat[],
) {
  const explicit =
    input && typeof input === "object" ? (input as Record<string, any>) : null
  const hasExplicit = !!explicit?.md5 || !!explicit?.sha1 || !!explicit?.sha256
  if (!hasExplicit) {
    try {
      const settings = await getSettings()
      const raw = settings["seed_default_matrix"]
      if (raw) {
        const parsed = JSON.parse(String(raw))
        if (parsed?.md5 || parsed?.sha1 || parsed?.sha256) {
          return normalizeHashMatrix(parsed, formats)
        }
      }
    } catch {
      // fall through to the default matrix
    }
  }
  return normalizeHashMatrix(hasExplicit ? input : undefined, formats)
}

async function generateSeed(
  c: any,
  user: any,
  body: any,
  formats: SeedFormat[],
): Promise<{ seed: SharingSeed; torrentPieces: string[] }> {
  const pieceSize = formats.includes("cas")
    ? DEFAULT_PIECE_SIZE
    : Number(body.piece_size || DEFAULT_PIECE_SIZE)
  if (
    !Number.isSafeInteger(pieceSize) ||
    pieceSize < 16 * 1024 ||
    pieceSize > 64 * 1024 * 1024
  ) {
    throw new Error("Invalid piece_size")
  }
  const matrix = await resolveSeedMatrix(c, body.hash_matrix, formats)
  const fileComments =
    body.file_comments && typeof body.file_comments === "object"
      ? body.file_comments
      : {}
  const sourceFiles = await collectSourceFiles(c, user, body.paths ?? body.path)
  const maxBytes = envNumber(c, "SEED_MAX_HASH_BYTES", DEFAULT_MAX_HASH_BYTES)
  const totalSize = sourceFiles.reduce((sum, file) => sum + file.size, 0)
  if (!Number.isSafeInteger(totalSize) || totalSize > maxBytes) {
    throw new Error(`Seed input exceeds the ${maxBytes} byte hashing limit`)
  }
  const torrentHasher = await TorrentPieceHasher.create(pieceSize)
  const siteUrl = await resolveSeedSiteUrl(c)
  const files: SeedFile[] = []
  for (const file of sourceFiles) {
    const response = await fetchSafe(c, new URL(file.rawUrl, c.req.url), {
      headers: file.headers,
    })
    if (!response.ok)
      throw new Error(
        `Source download failed with HTTP ${response.status}: ${file.virtualPath}`,
      )
    if (!response.body)
      throw new Error(`Source download has no body: ${file.virtualPath}`)
    const result = await hashReadableStream(
      response.body,
      pieceSize,
      file.size,
      maxBytes,
      torrentHasher,
    )
    const comment = String(
      fileComments[file.relativePath] ?? fileComments[file.virtualPath] ?? "",
    )
    files.push(
      applyHashMatrix(
        {
          path: file.relativePath,
          size: result.size,
          modified: file.modified,
          comment,
          hashes: result.hashes,
          cas_slice_md5: "",
          cas_create_time: "",
          missing_channels: [],
          sources:
            body.include_direct_source === true || body.include_sources === true
              ? [
                  {
                    type: "openlist-direct",
                    url: `${siteUrl}/d${file.virtualPath}`,
                    expires_at: "",
                    share_id: "",
                  },
                ]
              : [],
        },
        matrix,
      ),
    )
  }
  return {
    torrentPieces: torrentHasher.digest(),
    seed: normalizeSeed({
      name: String(body.name || deriveSeedName(sourceFiles)),
      comment: String(body.comment || "Generated by OpenList"),
      created_at: new Date().toISOString(),
      created_by: String(body.created_by || "OpenList"),
      piece_size: pieceSize,
      trackers: Array.isArray(body.trackers) ? body.trackers : [],
      channels: Array.isArray(body.channels) ? body.channels : [],
      files,
    }),
  }
}

function chooseSource(
  c: any,
  file: SeedFile,
): { source: SeedSource; url: URL } | undefined {
  for (const source of file.sources) {
    try {
      return { source, url: validateSource(c, source) }
    } catch {
      continue
    }
  }
  return undefined
}

async function uploadStreamToDriver(
  c: any,
  user: any,
  file: SeedFile,
  targetPath: string,
  source?: { source: SeedSource; url: URL },
  rapidOnly = false,
): Promise<{ status: "saved" | "reused"; method: string }> {
  const actualTarget = writableActualPath(user, targetPath)
  const parts = actualTarget.split("/").filter(Boolean)
  const name = parts.pop()
  if (!name) throw new Error("Target file name is required")
  const dir = "/" + parts.join("/")
  const resolved = await resolvePath(actualTarget)
  const resolvedDir = await resolvePath(dir)
  if (resolved.isVirtual || resolvedDir.isVirtual || !resolved.storage) {
    throw new Error("Target storage was not found")
  }
  const driver = await getDriver(resolved.storage.driver, resolved.storage)
  const dynamic = driver as any
  const metadata = {
    size: file.size,
    md5: file.hashes.md5,
    sha1: file.hashes.sha1,
    sha256: file.hashes.sha256,
    hashes: file.hashes,
  }
  try {
    if (typeof dynamic.rapidUpload === "function") {
      const result = await dynamic.rapidUpload(
        actualTarget,
        resolved.physical,
        metadata,
      )
      if (result === true || result?.reuse || result?.success)
        return { status: "reused", method: "rapidUpload" }
    }
    if (typeof dynamic.putRapid === "function") {
      const result = await dynamic.putRapid(
        actualTarget,
        resolved.physical,
        metadata,
      )
      if (result === true || result?.reuse || result?.success)
        return { status: "reused", method: "putRapid" }
    }

    let uploadSession: any
    if (typeof dynamic.createUploadSession === "function") {
      uploadSession = await dynamic.createUploadSession(
        dir,
        resolvedDir.physical,
        name,
        file.size,
        file.hashes.md5,
      )
      if (uploadSession?.reuse)
        return { status: "reused", method: "multipart-rapid" }
    }
    if (rapidOnly)
      throw new Error(
        "capability unavailable: target driver did not reuse the available hashes",
      )
    if (!source)
      throw new Error(
        "capability unavailable: no rapid-upload match and no approved source URL",
      )
    const response = await fetchSafe(c, source.url, {}, true)
    if (!response.ok || !response.body)
      throw new Error(`Source download failed with HTTP ${response.status}`)

    if (
      uploadSession?.session &&
      typeof dynamic.uploadPart === "function" &&
      typeof dynamic.completeUploadSession === "function"
    ) {
      const chunkSize = Math.min(
        envNumber(c, "SEED_TRANSFER_CHUNK_SIZE", DEFAULT_TRANSFER_CHUNK_SIZE),
        16 * 1024 * 1024,
      )
      const reader = response.body.getReader()
      let pending = new Uint8Array(0)
      let partNumber = 1
      let transferred = 0
      const partMd5s: string[] = []
      while (true) {
        const { done, value } = await reader.read()
        if (value?.length) {
          transferred += value.length
          if (transferred > file.size)
            throw new Error("Source exceeds the declared file size")
          const combined = new Uint8Array(pending.length + value.length)
          combined.set(pending)
          combined.set(value, pending.length)
          pending = combined
          while (pending.length >= chunkSize) {
            const part = pending.slice(0, chunkSize)
            pending = pending.slice(chunkSize)
            const result = await dynamic.uploadPart(
              uploadSession.session,
              partNumber++,
              Buffer.from(part),
            )
            if (result?.partMd5) partMd5s.push(result.partMd5)
          }
        }
        if (done) break
      }
      if (transferred !== file.size)
        throw new Error("Source size does not match seed metadata")
      if (pending.length || file.size === 0) {
        const result = await dynamic.uploadPart(
          uploadSession.session,
          partNumber,
          Buffer.from(pending),
        )
        if (result?.partMd5) partMd5s.push(result.partMd5)
      }
      await dynamic.completeUploadSession(uploadSession.session, partMd5s)
      return { status: "saved", method: "multipart-stream" }
    }

    if (typeof dynamic.putStream === "function") {
      await dynamic.putStream(
        actualTarget,
        resolved.physical,
        response.body,
        file.size,
        metadata,
      )
      return { status: "saved", method: "putStream" }
    }

    const bufferedMax = envNumber(
      c,
      "SEED_BUFFERED_TRANSFER_MAX",
      DEFAULT_BUFFERED_TRANSFER_MAX,
    )
    if (file.size <= bufferedMax) {
      const bytes = new Uint8Array(await response.arrayBuffer())
      if (bytes.byteLength !== file.size)
        throw new Error("Source size does not match seed metadata")
      await driver.put(actualTarget, resolved.physical!, Buffer.from(bytes))
      return { status: "saved", method: "bounded-buffer" }
    }
    throw new Error(
      "capability unavailable: target driver has no streaming or multipart upload API",
    )
  } finally {
    await flushPendingDriverState(
      resolved.storage.driver,
      resolved.storage,
      driver,
      storageContext(c),
    )
  }
}

seedRouter.get("/capabilities", async (c) => {
  const user = await getUserFromContext(c)
  if (!user || user.disabled) return errorResponse(c, 401, "Unauthorized")
  let target: Record<string, unknown> | undefined
  const path = c.req.query("path")
  if (path) {
    try {
      const actual = getActualPath(user, normalizeVirtualPath(path))
      const resolved = await resolvePath(actual)
      if (!resolved.isVirtual && resolved.storage) {
        const driver = await getDriver(
          resolved.storage.driver,
          resolved.storage,
        )
        const dynamic = driver as any
        target = {
          driver: resolved.storage.driver,
          rapid_upload:
            typeof dynamic.rapidUpload === "function" ||
            typeof dynamic.putRapid === "function" ||
            typeof dynamic.createUploadSession === "function",
          stream_upload:
            typeof dynamic.putStream === "function" ||
            (typeof dynamic.createUploadSession === "function" &&
              typeof dynamic.uploadPart === "function" &&
              typeof dynamic.completeUploadSession === "function"),
        }
      }
    } catch (error) {
      target = { error: safeErrorMessage(error) }
    }
  }
  return c.json({
    code: 200,
    message: "success",
    data: {
      formats: ["oss", "torrent", "cas"],
      version: 1,
      hash_algorithms: ["md5", "sha1", "sha256"],
      incremental_hashing: true,
      torrent_v1: true,
      extensions: ["x-openlist", "x-cas"],
      offline_download: "conditional",
      queue_adapter: false,
      limits: {
        metadata_bytes: envNumber(
          c,
          "SEED_MAX_METADATA_SIZE",
          DEFAULT_MAX_SEED_BYTES,
        ),
        hash_bytes: envNumber(c, "SEED_MAX_HASH_BYTES", DEFAULT_MAX_HASH_BYTES),
        files: envNumber(c, "SEED_MAX_FILES", DEFAULT_MAX_FILES),
      },
      target,
    },
  })
})

seedRouter.post("/capabilities", async (c) => {
  const user = await getUserFromContext(c)
  if (!user || user.disabled) return errorResponse(c, 401, "Unauthorized")
  try {
    const body = await readJson(c)
    if (Array.isArray(body.paths) && body.paths.length > 0) {
      const sourceFiles = await collectSourceFiles(c, user, body.paths)
      const settings = await getSettings()
      const trackers = String(settings["seed_default_trackers"] || "")
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
      return c.json({
        code: 200,
        message: "success",
        data: {
          formats: { oss: true, torrent: true, cas: true },
          files: sourceFiles.map((file) => ({
            path: file.virtualPath,
            name: file.relativePath,
            size: file.size,
            available_hashes: [],
            requires_download: true,
            requires_fetch: true,
            estimated_traffic: file.size,
            streamable: true,
            share_available: true,
            direct_source_available: true,
          })),
          existing_hashes: [],
          estimated_traffic: sourceFiles.reduce(
            (total, file) => total + file.size,
            0,
          ),
          default_matrix: await loadDefaultMatrix(),
          trackers,
        },
      })
    }
    const parsed = await parseBodySeed(c, user, body)
    const targetPath = getActualPath(user, normalizeVirtualPath(body.path))
    const resolved = await resolvePath(targetPath)
    if (resolved.isVirtual || !resolved.storage)
      throw new Error("Target storage was not found")
    const driver = await getDriver(resolved.storage.driver, resolved.storage)
    const dynamic = driver as any
    const rapid =
      typeof dynamic.rapidUpload === "function" ||
      typeof dynamic.putRapid === "function" ||
      typeof dynamic.createUploadSession === "function"
    const streaming =
      typeof dynamic.putStream === "function" ||
      (typeof dynamic.createUploadSession === "function" &&
        typeof dynamic.uploadPart === "function" &&
        typeof dynamic.completeUploadSession === "function")
    const bufferedMax = envNumber(
      c,
      "SEED_BUFFERED_TRANSFER_MAX",
      DEFAULT_BUFFERED_TRANSFER_MAX,
    )
    const files = parsed.seed.files.map((file) => {
      const hasRapidHash =
        !!file.hashes.md5 || !!file.hashes.sha1 || !!file.hashes.sha256
      const hasSource = !!chooseSource(c, file)
      let method = "download_required"
      if (rapid && hasRapidHash) method = "rapid_upload"
      else if (hasSource && streaming) method = "stream_upload"
      else if (hasSource && file.size <= bufferedMax) method = "bounded_upload"
      return {
        path: file.path,
        method,
        requires_download: method === "download_required",
      }
    })
    return c.json({
      code: 200,
      message: "success",
      data: {
        driver: resolved.storage.driver,
        policy: String(body.policy || "inherit"),
        files,
      },
    })
  } catch (error) {
    return errorResponse(c, 400, safeErrorMessage(error))
  }
})

seedRouter.post("/generate", async (c) => {
  const user = await getUserFromContext(c)
  if (!user || user.disabled) return errorResponse(c, 401, "Unauthorized")
  try {
    const body = await readJson(c)
    if ((body.save_path || body.output_path) && !canWrite(user))
      return errorResponse(c, 403, "Permission denied")
    const requestedFormats: unknown[] = Array.isArray(body.formats)
      ? body.formats
      : [body.format || "oss"]
    const detectedFormats = requestedFormats.map(detectFormat)
    if (detectedFormats.some((format: SeedFormat | undefined) => !format)) {
      throw new Error("A valid output format is required")
    }
    const formats = detectedFormats as SeedFormat[]
    const { seed, torrentPieces } = await generateSeed(c, user, body, formats)
    const outputDirectory =
      body.output_path ||
      (Array.isArray(body.formats) ? body.save_path : undefined)
    const outputs = []
    for (const format of formats) {
      const diagnostics = conversionDiagnostics(seed, format)
      if (diagnostics.length) {
        outputs.push({ format, convertible: false, diagnostics })
        continue
      }
      const bytes =
        format === "torrent"
          ? await encodeTorrent(seed, torrentPieces)
          : await encodeSeed(seed, format)
      const savePath = outputDirectory
        ? joinVirtualPath(
            normalizeVirtualPath(outputDirectory),
            fileNameFor(seed, format),
          )
        : body.save_path
      await saveEncodedSeed(c, user, savePath, bytes)
      outputs.push(
        encodedResult(seed, format, bytes, {
          convertible: true,
          ...(savePath ? { path: savePath } : {}),
        }),
      )
    }
    return c.json({
      code: 200,
      message: "success",
      data: Array.isArray(body.formats)
        ? { seed, outputs, artifacts: outputs }
        : outputs[0],
    })
  } catch (error) {
    const message = safeErrorMessage(error)
    return errorResponse(
      c,
      message.includes("limit") || message.includes("exceeds") ? 413 : 400,
      message,
    )
  }
})

seedRouter.post("/parse", async (c) => {
  const user = await getUserFromContext(c)
  if (!user || user.disabled) return errorResponse(c, 401, "Unauthorized")
  try {
    const body = await readJson(c)
    const parsed = await parseBodySeed(c, user, body)
    const totalSize = parsed.seed.files.reduce(
      (sum, file) => sum + file.size,
      0,
    )
    const hasSource = parsed.seed.files.some((file) => !!chooseSource(c, file))
    const hasRapidHashes = parsed.seed.files.some(
      (file) => !!file.hashes.md5 || !!file.hashes.sha1 || !!file.hashes.sha256,
    )
    return c.json({
      code: 200,
      message: "success",
      data: {
        format: parsed.format,
        seed: parsed.seed,
        files: parsed.seed.files,
        total_size: totalSize,
        diagnostics: seedDiagnostics(parsed.seed),
        conversions: seedConversionStates(parsed.seed),
        capabilities: {
          rapid_upload: hasRapidHashes,
          offline_download: hasSource,
          transfer: hasSource,
          convert: true,
          edit: true,
          recalculate: true,
        },
        direct_preview: false,
        ...(parsed.info_hash ? { info_hash: parsed.info_hash } : {}),
      },
    })
  } catch (error) {
    return errorResponse(c, 400, safeErrorMessage(error))
  }
})

seedRouter.post("/convert", async (c) => {
  const user = await getUserFromContext(c)
  if (!user || user.disabled) return errorResponse(c, 401, "Unauthorized")
  try {
    const body = await readJson(c)
    if (body.save_path && !canWrite(user))
      return errorResponse(c, 403, "Permission denied")
    const target = detectFormat(
      body.to_format || body.target_format || body.output_format,
    )
    if (!target) throw new Error("A valid target format is required")
    const parsed = await parseBodySeed(c, user, body)
    const diagnostics = conversionDiagnostics(parsed.seed, target)
    if (diagnostics.length) {
      return c.json({
        code: 200,
        message: "success",
        data: { convertible: false, diagnostics },
      })
    }
    const bytes = await encodeSeed(parsed.seed, target)
    await saveEncodedSeed(c, user, body.save_path, bytes)
    return c.json({
      code: 200,
      message: "success",
      data: encodedResult(parsed.seed, target, bytes, { convertible: true }),
    })
  } catch (error) {
    return errorResponse(c, 400, safeErrorMessage(error))
  }
})

function applySeedChannelUpdate(
  seed: SharingSeed,
  driverName: string,
  mountPath: string,
  successByPath: Map<string, boolean>,
) {
  if (!driverName) return
  let anySuccess = false
  for (const ok of successByPath.values()) {
    if (ok) {
      anySuccess = true
      break
    }
  }
  if (
    anySuccess &&
    !seed.channels.some((channel) => channel.driver === driverName)
  ) {
    seed.channels.push({ driver: driverName, mount_path: mountPath })
  }
  for (const file of seed.files) {
    if (!successByPath.has(file.path)) continue
    const ok = successByPath.get(file.path)!
    if (ok) {
      file.missing_channels = file.missing_channels.filter(
        (channel) => channel !== driverName,
      )
    } else if (!file.missing_channels.includes(driverName)) {
      file.missing_channels.push(driverName)
    }
  }
}

async function transferHandler(c: any, rapidOnly: boolean) {
  const user = await getUserFromContext(c)
  if (!canWrite(user)) return errorResponse(c, 403, "Permission denied")
  if (!rapidOnly && !can(user, PermissionBit.OFFLINE_DOWNLOAD)) {
    return errorResponse(c, 403, "Offline download permission is required")
  }
  try {
    const body = await readJson(c)
    const parsed = await parseBodySeed(c, user, body)
    const targetRoot = normalizeVirtualPath(
      body.target_path || body.destination || body.path || "/",
    )
    const selected = new Set<string>(
      Array.isArray(body.files)
        ? body.files.map((path: unknown) => String(path))
        : [],
    )
    const selectedIndexes = new Set<number>(
      Array.isArray(body.selected_files)
        ? body.selected_files.map((index: unknown) => Number(index))
        : [],
    )
    if (
      [...selectedIndexes].some(
        (index) =>
          !Number.isSafeInteger(index) ||
          index < 0 ||
          index >= parsed.seed.files.length,
      )
    ) {
      throw new Error("selected_files contains an invalid index")
    }
    let targetDriver = ""
    let targetMountPath = ""
    try {
      const resolved = await resolvePath(getActualPath(user, targetRoot))
      if (!resolved.isVirtual && resolved.storage) {
        targetDriver = resolved.storage.driver || ""
        targetMountPath = resolved.storage.mount_path || ""
      }
    } catch {
      // channel update is best-effort when the target storage is unavailable
    }
    const files = parsed.seed.files.filter((file, index) =>
      selected.size
        ? selected.has(file.path)
        : selectedIndexes.size
          ? selectedIndexes.has(index)
          : true,
    )
    const results: Array<Record<string, unknown>> = []
    const successByPath = new Map<string, boolean>()
    let saved = 0
    for (const file of files) {
      const target = joinVirtualPath(targetRoot, file.path)
      const source = chooseSource(c, file)
      try {
        if (!rapidOnly && !source) {
          throw new Error(
            "capability unavailable: offline download requires an approved source URL",
          )
        }
        const result = await uploadStreamToDriver(
          c,
          user,
          file,
          target,
          source,
          rapidOnly,
        )
        saved++
        successByPath.set(file.path, true)
        results.push({ path: file.path, target, ...result })
      } catch (error) {
        successByPath.set(file.path, false)
        results.push({
          path: file.path,
          target,
          status: "unavailable",
          error: safeErrorMessage(error),
        })
      }
    }
    if (saved === 0) {
      return c.json(
        {
          code: 501,
          message: rapidOnly
            ? "capability unavailable: target driver cannot reuse hashes and no transferable source is available"
            : "capability unavailable: no approved source and streaming upload combination is available",
          data: { results },
        },
        501,
      )
    }
    const payload: Record<string, unknown> = {
      total: results.length,
      saved,
      results,
    }
    if (body.update_channel === true && targetDriver) {
      applySeedChannelUpdate(
        parsed.seed,
        targetDriver,
        targetMountPath,
        successByPath,
      )
      const bytes = await encodeSeed(parsed.seed, parsed.format)
      payload.seed_data = Buffer.from(bytes).toString("base64")
      payload.seed = parsed.seed
    }
    return c.json({ code: 200, message: "success", data: payload })
  } catch (error) {
    return errorResponse(c, 400, safeErrorMessage(error))
  }
}

seedRouter.post("/rapid_upload", (c) => transferHandler(c, true))
seedRouter.post("/offline_download", (c) => transferHandler(c, false))

seedRouter.post("/update", async (c) => {
  const user = await getUserFromContext(c)
  if (!user || user.disabled) return errorResponse(c, 401, "Unauthorized")
  try {
    const body = await readJson(c)
    if (body.save_path && !canWrite(user))
      return errorResponse(c, 403, "Permission denied")
    const parsed = await parseBodySeed(c, user, body)
    const patch =
      body.patch && typeof body.patch === "object" ? body.patch : body
    const options =
      body.options && typeof body.options === "object" ? body.options : {}
    const comment = patch.comment ?? options.comment
    const recalculate = !!(patch.recalculate ?? options.recalculate)
    const seed = normalizeSeed({
      ...parsed.seed,
      name: patch.name ?? parsed.seed.name,
      comment: comment ?? parsed.seed.comment,
      trackers: patch.trackers ?? parsed.seed.trackers,
      channels: patch.channels ?? parsed.seed.channels,
      files: patch.files ?? parsed.seed.files,
    })
    const fileComments =
      body.file_comments && typeof body.file_comments === "object"
        ? body.file_comments
        : {}
    const fileSources =
      body.file_sources && typeof body.file_sources === "object"
        ? body.file_sources
        : {}
    for (const file of seed.files) {
      if (fileComments[file.path] !== undefined)
        file.comment = String(fileComments[file.path])
      if (Array.isArray(fileSources[file.path])) {
        for (const source of fileSources[file.path]) validateSource(c, source)
        file.sources = fileSources[file.path]
      }
    }
    if (recalculate) {
      const pieceSize = Number(
        body.piece_size || parsed.seed.piece_size || DEFAULT_PIECE_SIZE,
      )
      if (
        !Number.isSafeInteger(pieceSize) ||
        pieceSize < 16 * 1024 ||
        pieceSize > 64 * 1024 * 1024
      ) {
        throw new Error("Invalid piece_size")
      }
      seed.piece_size = pieceSize
      const matrix = normalizeHashMatrix(body.hash_matrix, [parsed.format])
      const recalcFiles = Array.isArray(body.recalc_files)
        ? body.recalc_files
        : []
      if (!recalcFiles.length)
        throw new Error("recalculate requires at least one recalc_files entry")
      const recalcMap = new Map<string, string>()
      for (const rf of recalcFiles) {
        if (typeof rf?.source_path === "string" && rf.source_path.trim()) {
          recalcMap.set(String(rf.path), rf.source_path)
        }
      }
      const torrentHasher = await TorrentPieceHasher.create(pieceSize)
      const maxBytes = envNumber(
        c,
        "SEED_MAX_HASH_BYTES",
        DEFAULT_MAX_HASH_BYTES,
      )
      for (const file of seed.files) {
        const sourcePath = recalcMap.get(file.path)
        if (!sourcePath) continue
        const sourceFiles = await collectSourceFiles(c, user, [sourcePath])
        if (sourceFiles.length !== 1)
          throw new Error(
            `Recalculate path must resolve to exactly one file: ${sourcePath}`,
          )
        const sf = sourceFiles[0]
        const response = await fetchSafe(c, new URL(sf.rawUrl, c.req.url), {
          headers: sf.headers,
        })
        if (!response.ok || !response.body)
          throw new Error(
            `Recalculate download failed with HTTP ${response.status}`,
          )
        const result = await hashReadableStream(
          response.body,
          pieceSize,
          sf.size,
          maxBytes,
          torrentHasher,
        )
        file.hashes = applyHashMatrix(
          { ...file, hashes: result.hashes },
          matrix,
        ).hashes
        file.size = result.size
        file.cas_slice_md5 = ""
        file.cas_create_time = ""
      }
    }
    for (const file of seed.files)
      for (const source of file.sources) validateSource(c, source)
    const format =
      detectFormat(body.output_format || body.to_format) || parsed.format
    const bytes = await encodeSeed(seed, format)
    await saveEncodedSeed(c, user, body.save_path, bytes)
    return c.json({
      code: 200,
      message: "success",
      data: encodedResult(seed, format, bytes),
    })
  } catch (error) {
    return errorResponse(c, 400, safeErrorMessage(error))
  }
})

export const seedTestHelpers = {
  contentBytes,
  decodeOss,
  hostAllowed,
  normalizeVirtualPath,
}
