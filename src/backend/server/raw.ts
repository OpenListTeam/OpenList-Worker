import { Hono } from "hono"
import fs from "fs/promises"
import { createReadStream } from "fs"
import { resolvePath } from "../internal/model/db"
import { parseRangeHeader } from "../internal/stream/stream"

export const rawRouter = new Hono()

rawRouter.get("/*", async (c) => {
  const reqPath = decodeURIComponent(c.req.path.replace(/^\/api\/raw/, ""))

  try {
    const resolved = await resolvePath(reqPath)
    if (resolved.isVirtual || !resolved.physical) {
      return c.text("Cannot download virtual path", 400)
    }
    
    const stat = await fs.stat(resolved.physical)
    if (stat.isDirectory()) {
      return c.text("Cannot download directory", 400)
    }

    const rangeHeader = c.req.header("Range")
    if (rangeHeader) {
      const { start, end, chunksize } = parseRangeHeader(rangeHeader, stat.size)
      const stream = createReadStream(resolved.physical, { start, end })
      
      c.header("Content-Range", `bytes ${start}-${end}/${stat.size}`)
      c.header("Accept-Ranges", "bytes")
      c.header("Content-Length", chunksize.toString())
      c.header("Content-Type", "application/octet-stream")

      return c.body(stream as any, 206)
    } else {
      c.header("Content-Length", stat.size.toString())
      c.header("Accept-Ranges", "bytes")
      const stream = createReadStream(resolved.physical)
      return c.body(stream as any)
    }
  } catch (err: any) {
    return c.text("Not found", 404)
  }
})
