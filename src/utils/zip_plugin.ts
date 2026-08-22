import { PluginItem, PluginType } from "~/types"
import { loadScriptIIFE } from "./load_external"

export interface ExtractedPluginPackage {
  manifest: Partial<PluginItem>
  files: {
    manifestFile?: string
    scriptFile?: string
    styleFile?: string
    iconFile?: string
    readmeFile?: string
  }
}

/**
 * Parse a ZIP file and extract plugin files (manifest, scripts, styles, icon)
 */
export async function parsePluginZip(
  file: File | ArrayBuffer,
): Promise<ExtractedPluginPackage> {
  const buffer = file instanceof File ? await file.arrayBuffer() : file
  const extractedFiles = await extractZipEntries(buffer)

  // 1. Locate manifest file (plugin.json, manifest.json, or openlist-plugin.json)
  const manifestFileName = Object.keys(extractedFiles).find((name) => {
    const lower = name.toLowerCase()
    return (
      lower === "plugin.json" ||
      lower.endsWith("/plugin.json") ||
      lower === "manifest.json" ||
      lower.endsWith("/manifest.json") ||
      lower === "openlist-plugin.json"
    )
  })

  let manifest: Partial<PluginItem> = {}
  if (manifestFileName && extractedFiles[manifestFileName]) {
    try {
      const text = new TextDecoder("utf-8").decode(
        extractedFiles[manifestFileName],
      )
      manifest = JSON.parse(text)
    } catch (e: any) {
      throw new Error(
        `无法解析插件清单文件 (${manifestFileName}): ${e.message}`,
      )
    }
  }

  // Find prefix folder if files are nested inside a root folder (e.g. repo-main/)
  let prefix = ""
  if (manifestFileName && manifestFileName.includes("/")) {
    prefix = manifestFileName.slice(0, manifestFileName.lastIndexOf("/") + 1)
  }

  // 2. Find JavaScript entry file if script_content is not embedded in manifest
  let scriptFile = ""
  if (!manifest.script_content) {
    const candidateJs = Object.keys(extractedFiles).find((name) => {
      const rel = prefix ? name.replace(prefix, "") : name
      const lower = rel.toLowerCase()
      return (
        lower === "index.js" ||
        lower === "main.js" ||
        lower === "plugin.js" ||
        lower === "script.js" ||
        (manifest.entry_url && lower === manifest.entry_url.toLowerCase())
      )
    })
    if (candidateJs) {
      scriptFile = candidateJs
      manifest.script_content = new TextDecoder("utf-8").decode(
        extractedFiles[candidateJs],
      )
    }
  }

  // 3. Find CSS stylesheet if style_content is not embedded in manifest
  let styleFile = ""
  if (!manifest.style_content) {
    const candidateCss = Object.keys(extractedFiles).find((name) => {
      const rel = prefix ? name.replace(prefix, "") : name
      const lower = rel.toLowerCase()
      return (
        lower === "style.css" || lower === "index.css" || lower === "main.css"
      )
    })
    if (candidateCss) {
      styleFile = candidateCss
      manifest.style_content = new TextDecoder("utf-8").decode(
        extractedFiles[candidateCss],
      )
    }
  }

  // 4. Find icon if not specified
  let iconFile = ""
  if (!manifest.icon) {
    const candidateIcon = Object.keys(extractedFiles).find((name) => {
      const rel = prefix ? name.replace(prefix, "") : name
      const lower = rel.toLowerCase()
      return (
        lower === "icon.svg" ||
        lower === "icon.png" ||
        lower === "icon.jpg" ||
        lower === "logo.svg" ||
        lower === "logo.png"
      )
    })
    if (candidateIcon) {
      iconFile = candidateIcon
      const bytes = extractedFiles[candidateIcon]
      const ext = candidateIcon.toLowerCase().endsWith(".svg")
        ? "image/svg+xml"
        : "image/png"
      const base64 = uint8ArrayToBase64(bytes)
      manifest.icon = `data:${ext};base64,${base64}`
    }
  }

  // Fallback default ID and name if missing
  if (!manifest.id) {
    if (file instanceof File) {
      manifest.id = file.name
        .replace(/\.zip$/i, "")
        .toLowerCase()
        .replace(/[^a-z0-9_-]/g, "-")
    } else {
      manifest.id = "oplist-plugin-" + Math.random().toString(36).slice(2, 8)
    }
  }
  if (!manifest.name) {
    manifest.name = manifest.id
  }
  if (!manifest.version) {
    manifest.version = "1.0.0"
  }
  if (!manifest.type) {
    manifest.type = "ui" as PluginType
  }
  if (manifest.enabled === undefined) {
    manifest.enabled = true
  }

  return {
    manifest,
    files: {
      manifestFile: manifestFileName,
      scriptFile,
      styleFile,
      iconFile,
    },
  }
}

/**
 * Native ZIP parser utilizing DecompressionStream / fallback
 */
async function extractZipEntries(
  buffer: ArrayBuffer,
): Promise<Record<string, Uint8Array>> {
  try {
    return await extractZipNative(buffer)
  } catch (err) {
    // Fallback to fflate via CDN if native decompression encounters an edge case
    return await extractZipFallback(buffer)
  }
}

async function extractZipNative(
  buffer: ArrayBuffer,
): Promise<Record<string, Uint8Array>> {
  const view = new DataView(buffer)
  const length = buffer.byteLength
  const files: Record<string, Uint8Array> = {}

  // 1. Locate End of Central Directory record (EOCD)
  let eocdOffset = -1
  for (let i = length - 22; i >= Math.max(0, length - 65557); i--) {
    if (view.getUint32(i, true) === 0x06054b50) {
      eocdOffset = i
      break
    }
  }
  if (eocdOffset === -1) {
    throw new Error(
      "Invalid ZIP file: End of Central Directory signature not found",
    )
  }

  const cdCount = view.getUint16(eocdOffset + 10, true)
  const cdOffset = view.getUint32(eocdOffset + 16, true)

  let currentCdOffset = cdOffset
  for (let i = 0; i < cdCount; i++) {
    if (view.getUint32(currentCdOffset, true) !== 0x02014b50) {
      break
    }
    const compressionMethod = view.getUint16(currentCdOffset + 10, true)
    const compressedSize = view.getUint32(currentCdOffset + 20, true)
    const uncompressedSize = view.getUint32(currentCdOffset + 24, true)
    const fileNameLength = view.getUint16(currentCdOffset + 28, true)
    const extraFieldLength = view.getUint16(currentCdOffset + 30, true)
    const fileCommentLength = view.getUint16(currentCdOffset + 32, true)
    const localHeaderOffset = view.getUint32(currentCdOffset + 42, true)

    const fileNameBytes = new Uint8Array(
      buffer,
      currentCdOffset + 46,
      fileNameLength,
    )
    const fileName = new TextDecoder("utf-8").decode(fileNameBytes)

    currentCdOffset +=
      46 + fileNameLength + extraFieldLength + fileCommentLength

    // Skip directories
    if (fileName.endsWith("/")) continue

    // Read local header to find data offset
    if (view.getUint32(localHeaderOffset, true) !== 0x04034b50) {
      continue
    }
    const localFileNameLen = view.getUint16(localHeaderOffset + 26, true)
    const localExtraLen = view.getUint16(localHeaderOffset + 28, true)
    const dataOffset = localHeaderOffset + 30 + localFileNameLen + localExtraLen

    const compressedData = new Uint8Array(buffer, dataOffset, compressedSize)

    if (compressionMethod === 0) {
      // Stored / Uncompressed
      files[fileName] = new Uint8Array(compressedData)
    } else if (compressionMethod === 8) {
      // Deflate
      if (typeof DecompressionStream !== "undefined") {
        const ds = new DecompressionStream("deflate-raw")
        const writer = ds.writable.getWriter()
        writer.write(compressedData)
        writer.close()
        const decompressedStream = await new Response(ds.readable).arrayBuffer()
        files[fileName] = new Uint8Array(decompressedStream)
      } else {
        throw new Error(
          "DecompressionStream is not supported in this environment",
        )
      }
    }
  }

  return files
}

async function extractZipFallback(
  buffer: ArrayBuffer,
): Promise<Record<string, Uint8Array>> {
  if (typeof window !== "undefined" && !(window as any).fflate) {
    await loadScriptIIFE(
      "https://cdn.jsdelivr.net/npm/fflate@0.8.2/umd/index.js",
      "fflate-lib",
    )
  }
  const fflate = (window as any).fflate
  if (!fflate) {
    throw new Error("无法加载 ZIP 解压模块")
  }

  return new Promise((resolve, reject) => {
    fflate.unzip(
      new Uint8Array(buffer),
      (err: any, unzipped: Record<string, Uint8Array>) => {
        if (err) reject(err)
        else resolve(unzipped)
      },
    )
  })
}

function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = ""
  const len = bytes.byteLength
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}
