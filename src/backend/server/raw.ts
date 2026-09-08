import { Hono } from "hono"
import { resolvePath } from "../internal/model/db"
import { parseRangeHeader } from "../internal/stream/stream"
import { flushPendingDriverState, getDriver } from "../internal/op/storage"
import { resolveShare } from "../internal/op/share"
import { needDownloadSign, verifyDownloadSign } from "../pkg/sign"
import { safeErrorMessage } from "../pkg/errs"
import { assertSafeUrl } from "../pkg/http"

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
  try {
    const executionCtx = c.executionCtx
    if (!executionCtx || typeof executionCtx.waitUntil !== "function") {
      return undefined
    }
    return {
      waitUntil: (promise: Promise<unknown>) => executionCtx.waitUntil(promise),
    }
  } catch {
    return undefined
  }
}

// 安全代理下载：手动跟随重定向并逐跳做 SSRF 校验。
// 关键修复：默认 fetch 会自动跟随 3xx，导致攻击者先让 raw_url 指向一个
// 通过 isSafeUrl 校验的公网域名，再用 302 跳到内网/云元数据端点，绕过 SSRF。
// 这里禁用自动重定向，对每一跳的 Location 重新断言安全，并在跨域重定向时
// 剥离 Cookie/Authorization 等敏感头，防止认证信息泄露给第三方。
const SAFE_REDIRECT_HEADER_KEYS = new Set([
  "range",
  "user-agent",
  "accept",
  "accept-language",
  "referer",
])

async function safeProxyFetch(
  url: string,
  headers: Record<string, string>,
): Promise<Response> {
  const MAX_REDIRECTS = 5
  let current = url
  let currentHeaders = headers
  for (let i = 0; i < MAX_REDIRECTS; i++) {
    try {
      assertSafeUrl(current, "Proxy download")
    } catch (e: any) {
      throw new Error(e?.message || "SSRF blocked: restricted destination")
    }

    const res = await fetch(current, {
      headers: currentHeaders,
      redirect: "manual",
    })

    const location = res.headers.get("location")
    if (res.status >= 300 && res.status < 400 && location) {
      current = new URL(location, current).toString()
      const next: Record<string, string> = {}
      for (const [k, v] of Object.entries(currentHeaders)) {
        if (SAFE_REDIRECT_HEADER_KEYS.has(k.toLowerCase()) && v) next[k] = v
      }
      currentHeaders = next
      continue
    }
    return res
  }
  throw new Error("Proxy download blocked: too many redirects")
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
      // 分享密码优先从 cookie（browser-password）读取，避免密码出现在 URL 中；
      // 兼容旧版 ?pwd= 参数（已有分享链接/收藏夹里的旧链接仍可用）。
      const cookieHeader = c.req.header("Cookie") || ""
      const cookiePwdRaw =
        cookieHeader
          .split(";")
          .map((s) => s.trim())
          .find((s) => s.startsWith("browser-password="))
          ?.split("=")
          .slice(1)
          .join("=") || ""
      let cookiePwd: string
      try {
        cookiePwd = cookiePwdRaw ? decodeURIComponent(cookiePwdRaw) : ""
      } catch {
        cookiePwd = cookiePwdRaw
      }
      const sharePwd = c.req.query("pwd") || cookiePwd
      const shareRes = await resolveShare(reqPath, sharePwd, c.env)
      if (!shareRes.ok) {
        return c.text(shareRes.error || "Share not found", 404)
      }
      if (shareRes.virtualList || !shareRes.realPath) {
        return c.text("Cannot download share root", 400)
      }
      reqPath = shareRes.realPath
    } else {
      // 对齐 Go server/router.go：
      //   r.GET("/d/*path", middlewares.PathParse, middlewares.Down(sign.Verify), ...)
      //   r.GET("/p/*path", middlewares.PathParse, middlewares.Down(sign.Verify), ...)
      //
      // 这两个端点**没有 Auth 中间件**，是设计上的「公开下载端点」——
      // 直链要能被 <video src>、<img src>、播放器、下载器直接消费，而这些
      // 客户端无法携带 Authorization 头。访问控制完全由 needSign 决定：
      // 需要签名时校验签名，不需要时公开放行。
      //
      // 此前 TS 版在此处强制要求登录用户，与 Go 不符：guest 存在时靠 guest
      // 兜底看不出问题，guest 一被禁用，列目录/播放视频就全部 401。
      if (await needDownloadSign(c, reqPath)) {
        const sign = c.req.query("sign") || ""
        const ok = await verifyDownloadSign(c, reqPath, sign)
        if (!ok) {
          return c.text("sign verify failed", 401)
        }
      }
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
            // WebDAV 等需要认证的驱动：强制使用代理模式，避免重定向导致认证丢失
            const needsProxy =
              isProxy ||
              normDriver === "webdav" ||
              normDriver === "sharepoint" ||
              normDriver === "onedrive" ||
              normDriver === "onedriveapp" ||
              normDriver === "weiyun" ||
              normDriver === "tencentweiyun"
            if (needsProxy) {
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

              let upstreamRes: Response
              try {
                upstreamRes = await safeProxyFetch(fileItem.raw_url, headers)
              } catch (ssrfErr: any) {
                return c.text(ssrfErr.message || "SSRF blocked", 403)
              }

              // If upstream returns 412 Precondition Failed (e.g. strict OSS check), retry with plain GET without Range
              if (upstreamRes.status === 412) {
                console.warn(
                  `[rawRouter] Upstream returned 412 for '${reqPath}', retrying without Range header...`,
                )
                delete headers["Range"]
                upstreamRes = await safeProxyFetch(fileItem.raw_url, headers)
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
              // FIX(H-3): 上游响应头已按白名单回显，但对 Content-Disposition 额外
              // 清洗 CR/LF 与控制字符，防止恶意上游注入额外响应头（Set-Cookie/Location）。
              const contentDisposition = upstreamRes.headers.get(
                "content-disposition",
              )
              if (contentDisposition) {
                const safeDisposition = contentDisposition.replace(
                  /[\r\n\u0000-\u001f]+/g,
                  "",
                )
                c.header("Content-Disposition", safeDisposition)
              }

              return c.body(upstreamRes.body as any, upstreamRes.status as any)
            } else {
              try {
                assertSafeUrl(fileItem.raw_url, "Redirect download")
              } catch (ssrfErr: any) {
                return c.text(ssrfErr.message || "SSRF blocked", 403)
              }
              console.log(
                `[rawRouter] Redirecting download for '${reqPath}' via ${resolved.storage.driver}`,
              )
              return c.redirect(fileItem.raw_url, 302)
            }
          } else if (
            typeof (driver as any).createReadStream === "function" &&
            fileItem &&
            !fileItem.is_dir
          ) {
            c.header("Access-Control-Allow-Origin", "*")
            const size = fileItem.size || 0
            const rangeHeader = c.req.header("Range")
            if (rangeHeader && size > 0) {
              const { start, end, chunksize } = parseRangeHeader(
                rangeHeader,
                size,
              )
              const stream = await (driver as any).createReadStream(
                resolved.physical,
                { start, end },
              )
              c.header("Content-Range", `bytes ${start}-${end}/${size}`)
              c.header("Accept-Ranges", "bytes")
              c.header("Content-Length", chunksize.toString())
              c.header("Content-Type", "application/octet-stream")
              return c.body(stream as any, 206)
            } else {
              if (size > 0) c.header("Content-Length", size.toString())
              c.header("Accept-Ranges", "bytes")
              c.header("Content-Type", "application/octet-stream")
              const stream = await (driver as any).createReadStream(
                resolved.physical,
              )
              return c.body(stream as any)
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
          return c.text(`Download failed: ${safeErrorMessage(e)}`, 500)
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
    return c.text(`Not found: ${safeErrorMessage(err, "file not found")}`, 404)
  }
})
