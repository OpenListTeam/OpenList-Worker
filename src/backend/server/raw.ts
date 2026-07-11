import { Hono } from "hono"
import fs from "fs/promises"
import { createReadStream } from "fs"
import { resolvePath } from "../internal/model/db"
import { parseRangeHeader } from "../internal/stream/stream"
import { getDriver } from "../internal/op/storage"
import { getFile } from "../drivers/onedrive/util"
import { Onedrive } from "../drivers/onedrive/driver"

export const rawRouter = new Hono()

rawRouter.get("/*", async (c) => {
  const reqPath = decodeURIComponent(
    c.req.path
      .replace(/^\/api\/raw/, "")
      .replace(/^\/d/, "")
      .replace(/^\/sd/, "")
      .replace(/^\/p/, ""),
  )

  try {
    const resolved = await resolvePath(reqPath)
    if (resolved.isVirtual || !resolved.physical) {
      return c.text("Cannot download virtual path", 400)
    }

    if (
      resolved.storage &&
      resolved.storage.driver.toLowerCase() === "onedrive"
    ) {
      const driver = (await getDriver(
        resolved.storage.driver,
        resolved.storage,
      )) as Onedrive
      const f = await getFile(driver, resolved.physical)
      const downloadUrl = f["@microsoft.graph.downloadUrl"]
      if (downloadUrl) {
        return c.redirect(downloadUrl)
      }
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
