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

let fs: any = null;
let path: any = null;

async function initNodeModules() {
  if (typeof process !== 'undefined' && process.release?.name === 'node' && !fs) {
    try {
      fs = await import('fs/promises');
      path = await import('path');
    } catch(e) {}
  }
}

// Downloads background offline file stream downloads
export async function downloadOfflineFile(urls: string[], virtualDir: string): Promise<void> {
  await initNodeModules();
  if (!fs || !path) {
    console.warn("downloadOfflineFile requires Node.js filesystem access");
    return;
  }
  
  if (!urls || urls.length === 0) return
  for (const urlStr of urls) {
    try {
      const parsed = new URL(urlStr)
      let filename = parsed.pathname.split("/").pop() || "downloaded_file"
      if (!filename) filename = "downloaded_file"
      const fileVirtualPath = path.join(virtualDir, filename)
      const resolved = await resolvePath(fileVirtualPath)
      
      if (resolved.isVirtual || !resolved.physical) {
        throw new Error("无法下载到虚拟路径")
      }
      const targetPath = resolved.physical
      
      const res = await fetch(urlStr)
      if (res.ok && res.body) {
        const buffer = await res.arrayBuffer()
        await fs.mkdir(path.dirname(targetPath), { recursive: true })
        await fs.writeFile(targetPath, Buffer.from(buffer))
      }
    } catch (e) {
      console.error("Offline download stream transfer task failed:", e)
    }
  }
}
