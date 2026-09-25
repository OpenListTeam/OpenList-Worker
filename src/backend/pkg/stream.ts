/**
 * Stream utilities for OpenList.
 * Uses Web Streams API for cross-runtime compatibility (Cloudflare Workers / Node.js).
 */

export interface RangeParams {
  start: number
  end: number
  total: number
  size: number
}

/**
 * Parse Range header
 * 支持 RFC 7233 标准形式：
 * - `bytes=start-end`（闭区间，end 超出文件大小时按规范收敛到 total-1）
 * - `bytes=start-`（从 start 到末尾）
 * - `bytes=-suffix`（取文件末尾 suffix 字节）
 * 非法/多段/不可满足的 Range 返回 undefined（调用方应回退为全量 200 响应）
 * @param rangeHeader Range header string
 * @param total Total file size
 */
export function parseRange(
  rangeHeader: string | undefined | null,
  total: number,
): RangeParams | undefined {
  if (!rangeHeader || total <= 0) {
    return undefined
  }

  const match = rangeHeader.trim().match(/^bytes=(\d*)-(\d*)$/)
  if (!match) {
    return undefined
  }

  let start: number
  let end: number

  if (match[1] === "" && match[2] === "") {
    // "bytes=-" 无法确定任何区间
    return undefined
  }

  if (match[1] === "") {
    // 后缀形式 "bytes=-N"：取文件末尾 N 字节
    const suffix = parseInt(match[2], 10)
    if (isNaN(suffix) || suffix <= 0) {
      return undefined
    }
    start = Math.max(0, total - suffix)
    end = total - 1
  } else {
    start = parseInt(match[1], 10)
    end = match[2] === "" ? total - 1 : parseInt(match[2], 10)
    if (isNaN(start) || isNaN(end)) {
      return undefined
    }
    if (end >= total) {
      end = total - 1 // 按规范收敛，而不是拒绝
    }
  }

  if (start >= total || start > end) {
    return undefined
  }

  return {
    start,
    end,
    total,
    size: end - start + 1,
  }
}

/**
 * Convert a buffer / Uint8Array to a Web ReadableStream
 */
export function bufferToStream(
  buffer: Uint8Array | ArrayBuffer,
): ReadableStream<Uint8Array> {
  const data = buffer instanceof ArrayBuffer ? new Uint8Array(buffer) : buffer
  return new ReadableStream({
    start(controller) {
      controller.enqueue(data)
      controller.close()
    },
  })
}

/**
 * Convert a Web ReadableStream to a Uint8Array buffer
 */
export async function streamToBuffer(
  stream: ReadableStream<Uint8Array>,
): Promise<Uint8Array> {
  const chunks: Uint8Array[] = []
  const reader = stream.getReader()
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      if (value) chunks.push(value)
    }
  } finally {
    reader.releaseLock()
  }
  const totalLength = chunks.reduce((sum, c) => sum + c.length, 0)
  const result = new Uint8Array(totalLength)
  let offset = 0
  for (const chunk of chunks) {
    result.set(chunk, offset)
    offset += chunk.length
  }
  return result
}
