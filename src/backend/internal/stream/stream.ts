import { resolvePath } from "../model/db"

export interface RangeParams {
  start: number
  end: number
  chunksize: number
}

/**
 * 解析标准 Range header（RFC 7233）。
 * 支持 `bytes=start-end` / `bytes=start-` / `bytes=-suffix`（末尾 N 字节）；
 * end 超出文件大小时按规范收敛到 fileSize-1。
 * 非法 / 多段 / 不可满足的 Range 返回 null，调用方应回退为全量 200 响应。
 *
 * 此前的实现对 `bytes=-N`（部分播放器拖动进度条时发送）会解析出 start=NaN，
 * 直接传给 fs.createReadStream 会同步抛 ERR_OUT_OF_RANGE 导致下载 500。
 */
export function parseRangeHeader(
  rangeHeader: string,
  fileSize: number,
): RangeParams | null {
  if (!rangeHeader || !Number.isFinite(fileSize) || fileSize <= 0) {
    return null
  }

  const match = rangeHeader.trim().match(/^bytes=(\d*)-(\d*)$/)
  if (!match) {
    return null
  }

  let start: number
  let end: number

  if (match[1] === "" && match[2] === "") {
    // "bytes=-" 无法确定任何区间
    return null
  }

  if (match[1] === "") {
    // 后缀形式 "bytes=-N"：取文件末尾 N 字节
    const suffix = parseInt(match[2], 10)
    if (isNaN(suffix) || suffix <= 0) {
      return null
    }
    start = Math.max(0, fileSize - suffix)
    end = fileSize - 1
  } else {
    start = parseInt(match[1], 10)
    end = match[2] === "" ? fileSize - 1 : parseInt(match[2], 10)
    if (isNaN(start) || isNaN(end)) {
      return null
    }
    if (end >= fileSize) {
      end = fileSize - 1 // 按规范收敛，而不是返回错误切片
    }
  }

  if (start >= fileSize || start > end) {
    return null
  }

  return { start, end, chunksize: end - start + 1 }
}

let fs: any = null
let path: any = null

async function initNodeModules() {
  if (
    typeof process !== "undefined" &&
    process.release?.name === "node" &&
    !fs
  ) {
    try {
      fs = await import("fs/promises")
      path = await import("path")
    } catch (e) {}
  }
}

// Downloads background offline file stream downloads
export async function downloadOfflineFile(
  urls: string[],
  virtualDir: string,
): Promise<void> {
  await initNodeModules()
  if (!fs || !path) {
    console.warn("downloadOfflineFile requires Node.js filesystem access")
    return
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
        throw new Error("Cannot download to a virtual path")
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
