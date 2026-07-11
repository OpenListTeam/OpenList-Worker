const fsModule = "node:fs/promises"
const fsSyncModule = "node:fs"
const pathModule = "node:path"

let fs: any = null
let createReadStream: any = null
let path: any = null

try {
  fs = await import(fsModule)
  if (fs && fs.default) {
    fs = fs.default
  }
} catch (_) {}

try {
  const fsSync = await import(fsSyncModule)
  createReadStream = fsSync ? fsSync.createReadStream : null
} catch (_) {}

try {
  path = await import(pathModule)
  if (path && path.default) {
    path = path.default
  }
} catch (_) {}

import { resolvePath } from "../model/db"

export interface RangeParams {
  start: number
  end: number
  chunksize: number
}

// Parses the standard Range header
export function parseRangeHeader(rangeHeader: string, fileSize: number): RangeParams {
  const parts = rangeHeader.replace(/bytes=/, "").split("-")
  const start = parseInt(parts[0], 10)
  const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1
  const chunksize = end - start + 1
  return { start, end, chunksize }
}

// Downloads background offline file stream downloads
export async function downloadOfflineFile(urls: string[], virtualDir: string): Promise<void> {
  if (!urls || urls.length === 0) return

  for (const urlStr of urls) {
    try {
      const parsed = new URL(urlStr)
      let filename = parsed.pathname.split("/").pop() || "downloaded_file"
      if (!filename) filename = "downloaded_file"

      const fileVirtualPath = path ? path.join(virtualDir, filename) : (virtualDir + "/" + filename)
      const resolved = await resolvePath(fileVirtualPath)
      if (resolved.isVirtual || !resolved.physical) {
        throw new Error("Cannot download to a virtual path")
      }
      const targetPath = resolved.physical
      
      const res = await fetch(urlStr)
      if (res.ok && res.body) {
        const buffer = await res.arrayBuffer()
        if (fs && path) {
          await fs.mkdir(path.dirname(targetPath), { recursive: true })
          await fs.writeFile(targetPath, Buffer.from(buffer))
        } else {
          throw new Error("Filesystem is not available in this environment")
        }
      }
    } catch (e) {
      console.error("Offline download stream transfer task failed:", e)
    }
  }
}
