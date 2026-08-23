import { Hono } from "hono"
import { resolvePath } from "../internal/model/db"
import { parseRangeHeader } from "../internal/stream/stream"
import { flushPendingDriverState, getDriver } from "../internal/op/storage"
import { resolveShare } from "../internal/op/share"

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

const getStorageRequestContext = (c: any) => {
  const executionCtx = c.executionCtx
  if (!executionCtx || typeof executionCtx.waitUntil !== "function") {
    return undefined
  }
  return {
    waitUntil: (promise: Promise<unknown>) => executionCtx.waitUntil(promise),
  }
}

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

  const reqPath0 = decodeURIComponent(rawPath)

  try {
    let reqPath = reqPath0
    // Share download: /sd/{shareId}/... — map to the real storage path
    const isSharePath =
      c.req.path.startsWith("/api/sd") || c.req.path.startsWith("/sd")
    if (isSharePath) {
      const shareRes = await resolveShare(
        reqPath,
        c.req.query("pwd") || "",
        c.env,
      )
      if (!shareRes.ok) {
        return c.text(shareRes.error || "Share not found", 404)
      }
      if (shareRes.virtualList || !shareRes.realPath) {
        return c.text("Cannot download share root", 400)
      }
      reqPath = shareRes.realPath
    }

    const resolved = await resolvePath(reqPath)

    if (resolved.isVirtual || !resolved.physical) {
      return c.text("Cannot download virtual directory path", 400)
    }

    if (resolved.storage) {
      const normDriver = (resolved.storage.driver || "")
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "")

      // Remote cloud drivers: fetch download link via driver.get()
      if (normDriver !== "local") {
        try {
          const driver = await getDriver(
            resolved.storage.driver,
            resolved.storage,
          )
          let fileItem
          try {
            fileItem = await driver.get(reqPath, resolved.physical)
          } finally {
            await flushPendingDriverState(
              resolved.storage.driver,
              resolved.storage,
              driver,
              getStorageRequestContext(c),
            )
          }

          if (fileItem && fileItem.raw_url) {
            if (isProxy) {
              console.log(
                `[rawRouter] Proxying download for '${reqPath}' via ${resolved.storage.driver}`,
              )
              // Start with driver-provided headers (Cookie, Referer, etc.)
              const headers: Record<string, string> = {
                ...(fileItem.raw_url_headers || {}),
              }
              // Ensure a User-Agent is set (don't override if driver already set one)
              if (!headers["User-Agent"]) {
                headers["User-Agent"] =
                  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
              }
              // Forward Range header for video/audio/PDF seeking
              const rangeReq = c.req.header("Range")
              if (rangeReq) headers["Range"] = rangeReq

              let upstreamRes = await fetch(fileItem.raw_url, { headers })

              // If upstream returns 412 Precondition Failed (e.g. strict OSS check), retry with plain GET without Range
              if (upstreamRes.status === 412) {
                console.warn(
                  `[rawRouter] Upstream returned 412 for '${reqPath}', retrying without Range header...`,
                )
                delete headers["Range"]
                upstreamRes = await fetch(fileItem.raw_url, { headers })
              }

              // CORS headers
              c.header("Access-Control-Allow-Origin", "*")
              c.header("Access-Control-Allow-Methods", "GET, OPTIONS, HEAD")
              c.header(
                "Access-Control-Expose-Headers",
                "Content-Range, Accept-Ranges, Content-Length, Content-Disposition",
              )

              // Content-Type: prefer upstream, fallback by extension
              const extMap: Record<string, string> = {
                pdf: "application/pdf",
                mp4: "video/mp4",
                webm: "video/webm",
                mkv: "video/x-matroska",
                mp3: "audio/mpeg",
                flac: "audio/flac",
                m3u8: "application/vnd.apple.mpegurl",
                ts: "video/mp2t",
                png: "image/png",
                jpg: "image/jpeg",
                jpeg: "image/jpeg",
                gif: "image/gif",
                webp: "image/webp",
                svg: "image/svg+xml",
              }
              const fileExt = reqPath.split(".").pop()?.toLowerCase() || ""
              const defaultContentType =
                extMap[fileExt] || "application/octet-stream"
              c.header(
                "Content-Type",
                upstreamRes.headers.get("content-type") || defaultContentType,
              )

              // Forward range/length headers
              const contentLength = upstreamRes.headers.get("content-length")
              if (contentLength) c.header("Content-Length", contentLength)
              const contentRange = upstreamRes.headers.get("content-range")
              if (contentRange) c.header("Content-Range", contentRange)
              // Always advertise range support so video/audio players can seek
              c.header(
                "Accept-Ranges",
                upstreamRes.headers.get("accept-ranges") || "bytes",
              )

              // Forward caching headers
              const etag = upstreamRes.headers.get("etag")
              if (etag) c.header("ETag", etag)
              const lastModified = upstreamRes.headers.get("last-modified")
              if (lastModified) c.header("Last-Modified", lastModified)
              const cacheControl = upstreamRes.headers.get("cache-control")
              if (cacheControl) c.header("Cache-Control", cacheControl)
              const contentDisposition = upstreamRes.headers.get(
                "content-disposition",
              )
              if (contentDisposition)
                c.header("Content-Disposition", contentDisposition)

              return c.body(upstreamRes.body as any, upstreamRes.status as any)
            } else {
              console.log(
                `[rawRouter] Redirecting download for '${reqPath}' via ${resolved.storage.driver}`,
              )
              return c.redirect(fileItem.raw_url, 302)
            }
          } else {
            const detail =
              fileItem?.raw_url_error ||
              (fileItem?.is_dir
                ? "该条目是文件夹，不可作为文件下载。"
                : "该存储驱动未返回下载链接（raw_url 为空）。")
            return c.text(
              `File not found or no download link available: ${reqPath}\n${detail}`,
              404,
            )
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
    console.error(`[rawRouter] Download 404 for '${reqPath0}':`, err.message)
    return c.text(`Not found: ${err.message || err}`, 404)
  }
})
