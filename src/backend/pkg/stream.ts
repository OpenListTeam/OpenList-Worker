/**
 * Stream utilities for OpenListNext.
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
 * @param rangeHeader Range header string
 * @param total Total file size
 */
export function parseRange(
  rangeHeader: string | undefined | null,
  total: number,
): RangeParams | undefined {
  if (!rangeHeader || !rangeHeader.startsWith("bytes=")) {
    return undefined
  }

  const parts = rangeHeader.replace(/bytes=/, "").split("-")
  const start = parseInt(parts[0], 10)
  const end = parts[1] ? parseInt(parts[1], 10) : total - 1

  if (isNaN(start) || start >= total || end >= total || start > end) {
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
