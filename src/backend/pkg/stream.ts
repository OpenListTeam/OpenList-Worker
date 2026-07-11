import { Readable } from "node:stream"

/**
 * Stream utilities for OpenList.
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
 * Convert a buffer to a readable stream
 */
export function bufferToStream(buffer: Buffer): Readable {
  const stream = new Readable()
  stream.push(buffer)
  stream.push(null)
  return stream
}

/**
 * Convert a stream to a buffer
 */
export async function streamToBuffer(stream: Readable): Promise<Buffer> {
  const chunks: any[] = []
  return new Promise((resolve, reject) => {
    stream.on("data", (chunk) => chunks.push(Buffer.from(chunk)))
    stream.on("error", (err) => reject(err))
    stream.on("end", () => resolve(Buffer.concat(chunks)))
  })
}
