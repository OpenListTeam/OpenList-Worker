import { Hono } from "hono"
import { resolvePath } from "../internal/model/db"
import { parseRangeHeader } from "../internal/stream/stream"
import { getDriver } from "../internal/op/storage"

let fsPromises: any = null
let createReadStream: any = null

async function initNodeModules() {
  if (
    typeof process !== "undefined" &&
    process.release?.name === "node" &&
    !fsPromises
  ) {
    try {
      fsPromises = await import("fs/promises")
      createReadStream = (await import("fs")).createReadStream
    } catch (e) {}
  }
}

export const rawRouter = new Hono()

rawRouter.get("/*", async (c) => {
  await initNodeModules()

  const isProxy =
    c.req.query("proxy") === "true" ||
    c.req.path.startsWith("/p") ||
    c.req.path.startsWith("/api/p") ||
    c.req.path.startsWith("/sd") ||
    c.req.path.startsWith("/api/sd")

  const rawPath = c.req.path
    .replace(/^\/api\/raw/, "")
    .replace(/^\/api\/d/, "")
    .replace(/^\/api\/sd/, "")
    .replace(/^\/api\/p/, "")
    .replace(/^\/raw/, "")
    .replace(/^\/d/, "")
    .replace(/^\/sd/, "")
    .replace(/^\/p/, "")

  const reqPath = decodeURIComponent(rawPath)

  try {
    const resolved = await resolvePath(reqPath)

    if (resolved.isVirtual || !resolved.physical) {
      return c.text("Cannot download virtual directory path", 400)
    }

    if (resolved.storage) {
      const normDriver = (resolved.storage.driver || "")
        .toLowerCase()
        .replace(/_/g, "")

      // Remote cloud drivers: fetch download link via driver.get()
      if (normDriver !== "local") {
        try {
          const driver = await getDriver(
            resolved.storage.driver,
            resolved.storage,
          )
          const fileItem = await driver.get(reqPath, resolved.physical)

          if (fileItem && fileItem.raw_url) {
            if (isProxy) {
              console.log(
                `[rawRouter] Proxying download for '${reqPath}' via ${resolved.storage.driver}`,
              )
              const headers: Record<string, string> = {
                "User-Agent":
                  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
              }
              if (normDriver.includes("quark") || normDriver.includes("uc")) {
                headers["Referer"] = "https://pan.quark.cn/"
              } else if (normDriver.includes("aliyun")) {
                headers["Referer"] = "https://www.aliyundrive.com/"
              }
              const rangeReq = c.req.header("Range")
              if (rangeReq) {
                headers["Range"] = rangeReq
              }

              const upstreamRes = await fetch(fileItem.raw_url, { headers })

              c.header("Access-Control-Allow-Origin", "*")
              c.header("Access-Control-Allow-Methods", "GET, OPTIONS, HEAD")
              c.header("Access-Control-Allow-Headers", "*")

              const defaultContentType = reqPath.toLowerCase().endsWith(".pdf")
                ? "application/pdf"
                : "application/octet-stream"
              const contentType =
                upstreamRes.headers.get("content-type") || defaultContentType
              c.header("Content-Type", contentType)

              if (upstreamRes.headers.get("content-length")) {
                c.header(
                  "Content-Length",
                  upstreamRes.headers.get("content-length")!,
                )
              }
              if (upstreamRes.headers.get("content-range")) {
                c.header(
                  "Content-Range",
                  upstreamRes.headers.get("content-range")!,
                )
                c.header("Accept-Ranges", "bytes")
              }

              return c.body(upstreamRes.body as any, upstreamRes.status as any)
            } else {
              console.log(
                `[rawRouter] Redirecting download for '${reqPath}' via ${resolved.storage.driver}`,
              )
              return c.redirect(fileItem.raw_url, 302)
            }
          }
        } catch (e: any) {
          console.error(
            `[rawRouter] Driver get failed for '${reqPath}':`,
            e.message,
          )
          return c.text(`Download failed: ${e.message}`, 500)
        }
      }
    }

    // Fallback: Local file system streaming
    if (!fsPromises || !createReadStream) {
      return c.text("Local file streaming not supported in Edge Runtime", 500)
    }

    const stat = await fsPromises.stat(resolved.physical)
    if (stat.isDirectory()) {
      return c.text("Cannot download directory", 400)
    }

    c.header("Access-Control-Allow-Origin", "*")
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
    console.error(`[rawRouter] Download 404 for '${reqPath}':`, err.message)
    return c.text(`Not found: ${err.message || err}`, 404)
  }
})
