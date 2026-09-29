/**
 * 轻量 ZIP 解析器（无外部依赖，兼容 Cloudflare Workers）。
 * 仅支持 ZIP 格式（Deflate/Store）；rar/7z 等格式由上层明确返回「不支持」。
 *
 * 参考：插件 zip 包的解析逻辑（src/utils/zip_plugin.ts 的 extractZipNative）。
 */

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

/** 解析 ZIP 的中央目录，返回条目列表（不包含目录条目，只返回文件） */
export function parseZip(buffer: ArrayBuffer): ZipArchive {
  const view = new DataView(buffer)
  const length = buffer.byteLength

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

  const entries: ZipEntry[] = []
  let currentCdOffset = cdOffset
  for (let i = 0; i < cdCount; i++) {
    if (view.getUint32(currentCdOffset, true) !== 0x02014b50) break

    const compressionMethod = view.getUint16(currentCdOffset + 10, true)
    const compressedSize = view.getUint32(currentCdOffset + 20, true)
    const uncompressedSize = view.getUint32(currentCdOffset + 24, true)
    const fileNameLength = view.getUint16(currentCdOffset + 28, true)
    const extraFieldLength = view.getUint16(currentCdOffset + 30, true)
    const fileCommentLength = view.getUint16(currentCdOffset + 32, true)
    const localHeaderOffset = view.getUint32(currentCdOffset + 42, true)

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

    currentCdOffset +=
      46 + fileNameLength + extraFieldLength + fileCommentLength

    // 跳过目录条目
    if (fileName.endsWith("/")) continue

    // 读 local header 获取数据偏移
    if (view.getUint32(localHeaderOffset, true) !== 0x04034b50) continue
    const localFileNameLen = view.getUint16(localHeaderOffset + 26, true)
    const localExtraLen = view.getUint16(localHeaderOffset + 28, true)
    const dataOffset = localHeaderOffset + 30 + localFileNameLen + localExtraLen

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
): Promise<Uint8Array> {
  const compressed = new Uint8Array(
    buffer,
    entry.dataOffset,
    entry.compressedSize,
  )

  if (entry.compressionMethod === 0) {
    // Store（未压缩）
    return new Uint8Array(compressed)
  }

  if (entry.compressionMethod === 8) {
    // Deflate
    if (typeof DecompressionStream === "undefined") {
      throw new Error("DecompressionStream is not supported in this runtime")
    }
    const ds = new DecompressionStream("deflate-raw")
    const writer = ds.writable.getWriter()
    writer.write(compressed)
    writer.close()
    const out = await new Response(ds.readable).arrayBuffer()
    return new Uint8Array(out)
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
