/**
 * 轻量 ZIP 解析器（无外部依赖，兼容 Cloudflare Workers）。
 * 仅支持 ZIP 格式（Deflate/Store）；rar/7z 等格式由上层明确返回「不支持」。
 *
 * 参考：插件 zip 包的解析逻辑（src/utils/zip_plugin.ts 的 extractZipNative）。
 *
 * 安全限制可通过环境变量覆盖（非法值回退默认）：
 *   MAX_ZIP_ENTRIES             最大条目数（默认 10000）
 *   MAX_ZIP_ENTRY_UNCOMPRESSED  单条目解压后大小上限（默认 64MB）
 */
import { secureWarn } from "../../pkg/secure-log"

export interface ZipEntry {
  /** 归档内路径（目录以 / 结尾） */
  name: string
  isDir: boolean
  /** 解压后大小 */
  size: number
  /** 压缩后大小 */
  compressedSize: number
  /** 压缩方式：0=Store, 8=Deflate */
  compressionMethod: number
  /** 数据在 buffer 中的偏移 */
  dataOffset: number
  /** 修改时间 */
  modified: string
}

export interface ZipArchive {
  entries: ZipEntry[]
}

export const DEFAULT_MAX_ZIP_ENTRIES = 10000
export const DEFAULT_MAX_ZIP_ENTRY_UNCOMPRESSED = 64 * 1024 * 1024

export interface ZipLimits {
  maxEntries: number
  maxUncompressed: number
}

function readZipLimit(key: string, fallback: number, env?: any): number {
  const e = env && typeof env === "object" ? env : {}
  const raw =
    e[key] !== undefined && e[key] !== null && String(e[key]) !== ""
      ? e[key]
      : typeof process !== "undefined"
        ? process.env?.[key]
        : undefined
  if (raw === undefined || raw === null || String(raw).trim() === "")
    return fallback
  const n = parseInt(String(raw), 10)
  if (!Number.isFinite(n) || n <= 0) return fallback
  return n
}

/** 解析 ZIP 安全限制（每次调用读取 env，便于按部署覆盖）。 */
export function getZipLimits(env?: any): ZipLimits {
  return {
    maxEntries: readZipLimit("MAX_ZIP_ENTRIES", DEFAULT_MAX_ZIP_ENTRIES, env),
    maxUncompressed: readZipLimit(
      "MAX_ZIP_ENTRY_UNCOMPRESSED",
      DEFAULT_MAX_ZIP_ENTRY_UNCOMPRESSED,
      env,
    ),
  }
}

/** 解析 ZIP 的中央目录，返回条目列表（不包含目录条目，只返回文件） */
export function parseZip(buffer: ArrayBuffer, env?: any): ZipArchive {
  const limits = getZipLimits(env)
  const view = new DataView(buffer)
  const length = buffer.byteLength
  if (length < 22) throw new Error("Invalid ZIP: file is too small")

  // 1. 定位 End of Central Directory (EOCD)
  let eocdOffset = -1
  const minOffset = Math.max(0, length - 22 - 65557)
  for (let i = length - 22; i >= minOffset; i--) {
    if (view.getUint32(i, true) === 0x06054b50) {
      eocdOffset = i
      break
    }
  }
  if (eocdOffset === -1) {
    throw new Error("Invalid ZIP: End of Central Directory not found")
  }

  const cdCount = view.getUint16(eocdOffset + 10, true)
  const cdOffset = view.getUint32(eocdOffset + 16, true)
  if (cdCount > limits.maxEntries) {
    secureWarn("[security] blocked ZIP entry count", {
      entries: cdCount,
      limit: limits.maxEntries,
    })
    throw new Error("Invalid ZIP: too many entries")
  }
  if (cdOffset + 4 > length) {
    throw new Error("Invalid ZIP: central directory is out of bounds")
  }

  const entries: ZipEntry[] = []
  let currentCdOffset = cdOffset
  for (let i = 0; i < cdCount; i++) {
    if (currentCdOffset + 46 > length) {
      throw new Error("Invalid ZIP: truncated central directory")
    }
    if (view.getUint32(currentCdOffset, true) !== 0x02014b50) break

    const compressionMethod = view.getUint16(currentCdOffset + 10, true)
    const compressedSize = view.getUint32(currentCdOffset + 20, true)
    const uncompressedSize = view.getUint32(currentCdOffset + 24, true)
    const fileNameLength = view.getUint16(currentCdOffset + 28, true)
    const extraFieldLength = view.getUint16(currentCdOffset + 30, true)
    const fileCommentLength = view.getUint16(currentCdOffset + 32, true)
    const localHeaderOffset = view.getUint32(currentCdOffset + 42, true)

    const nextCdOffset =
      currentCdOffset +
      46 +
      fileNameLength +
      extraFieldLength +
      fileCommentLength
    if (nextCdOffset > length) {
      throw new Error("Invalid ZIP: central directory entry is out of bounds")
    }

    // modified: DOS date/time at offset +12
    const modTime = view.getUint16(currentCdOffset + 12, true)
    const modDate = view.getUint16(currentCdOffset + 14, true)
    const modified = dosDateTimeToIso(modDate, modTime)

    const fileNameBytes = new Uint8Array(
      buffer,
      currentCdOffset + 46,
      fileNameLength,
    )
    const fileName = new TextDecoder("utf-8").decode(fileNameBytes)

    currentCdOffset = nextCdOffset

    // 跳过目录条目
    if (fileName.endsWith("/")) continue

    // 读 local header 获取数据偏移
    if (localHeaderOffset + 30 > length) {
      throw new Error("Invalid ZIP: local header is out of bounds")
    }
    if (view.getUint32(localHeaderOffset, true) !== 0x04034b50) continue
    const localFileNameLen = view.getUint16(localHeaderOffset + 26, true)
    const localExtraLen = view.getUint16(localHeaderOffset + 28, true)
    const dataOffset = localHeaderOffset + 30 + localFileNameLen + localExtraLen
    if (dataOffset + compressedSize > length) {
      throw new Error("Invalid ZIP: entry data is out of bounds")
    }

    entries.push({
      name: fileName.replace(/\\/g, "/"),
      isDir: false,
      size: uncompressedSize,
      compressedSize,
      compressionMethod,
      dataOffset,
      modified,
    })
  }

  return { entries }
}

/** 解压单个条目，返回其内容 */
export async function extractZipEntry(
  buffer: ArrayBuffer,
  entry: ZipEntry,
  env?: any,
): Promise<Uint8Array> {
  const limits = getZipLimits(env)
  const compressed = new Uint8Array(
    buffer,
    entry.dataOffset,
    entry.compressedSize,
  )

  if (entry.compressionMethod === 0) {
    // Store（未压缩）
    if (compressed.length > limits.maxUncompressed) {
      secureWarn("[security] blocked ZIP entry size", {
        entry: entry.name,
        size: compressed.length,
        limit: limits.maxUncompressed,
      })
      throw new Error("ZIP entry exceeds the uncompressed size limit")
    }
    return new Uint8Array(compressed)
  }

  if (entry.compressionMethod === 8) {
    // Deflate
    if (typeof DecompressionStream === "undefined") {
      throw new Error("DecompressionStream is not supported in this runtime")
    }
    if (entry.size > limits.maxUncompressed) {
      secureWarn("[security] blocked ZIP entry size", {
        entry: entry.name,
        size: entry.size,
        limit: limits.maxUncompressed,
      })
      throw new Error("ZIP entry exceeds the uncompressed size limit")
    }
    const ds = new DecompressionStream("deflate-raw")
    const writer = ds.writable.getWriter()
    await writer.write(compressed)
    await writer.close()
    const reader = ds.readable.getReader()
    const chunks: Uint8Array[] = []
    let total = 0
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      if (!value?.length) continue
      total += value.length
      if (total > limits.maxUncompressed) {
        await reader.cancel()
        secureWarn("[security] blocked ZIP entry decompressed size", {
          entry: entry.name,
          size: total,
          limit: limits.maxUncompressed,
        })
        throw new Error("ZIP entry exceeds the uncompressed size limit")
      }
      chunks.push(value)
    }
    const out = new Uint8Array(total)
    let offset = 0
    for (const chunk of chunks) {
      out.set(chunk, offset)
      offset += chunk.length
    }
    return out
  }

  throw new Error(
    `Unsupported ZIP compression method: ${entry.compressionMethod}`,
  )
}

function dosDateTimeToIso(dosDate: number, dosTime: number): string {
  const year = 1980 + ((dosDate >> 9) & 0x7f)
  const month = (dosDate >> 5) & 0x0f
  const day = dosDate & 0x1f
  const hour = (dosTime >> 11) & 0x1f
  const minute = (dosTime >> 5) & 0x3f
  const second = (dosTime & 0x1f) * 2
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${year}-${pad(month)}-${pad(day)}T${pad(hour)}:${pad(minute)}:${pad(second)}Z`
}
