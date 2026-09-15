import { Hono } from "hono"
import { resolvePath } from "../internal/model/db"
import { parseRangeHeader } from "../internal/stream/stream"
import { flushPendingDriverState, getDriver } from "../internal/op/storage"
import { resolveShare } from "../internal/op/share"
import {
  needDownloadSign,
  verifyDownloadSign,
  signDownloadPath,
  getSignPolicy,
  getSignExpiresIn,
} from "../pkg/sign"
import { safeErrorMessage } from "../pkg/errs"
import { assertSafeUrl, getTrustedHosts } from "../pkg/http"
import {
  resolveProxyDecision,
  getDownProxyUrl,
  getDisableProxySign,
} from "../internal/driver/proxy"

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
  allowHosts?: ReadonlySet<string> | string[],
): Promise<Response> {
  const MAX_REDIRECTS = 5
  let current = url
  let currentHeaders = headers
  for (let i = 0; i < MAX_REDIRECTS; i++) {
    try {
      assertSafeUrl(current, "Proxy download", allowHosts)
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

// 原生代理：拉取上游直链并回传字节流（含 Range、缓存头、CORS）。
// 抽成独立函数是因为「webdav_policy=use_proxy_url 但未配置 down_proxy_url」
// 与「驱动强制代理」两种情况都需要走同一套实现。
async function proxyUpstream(
  c: any,
  fileItem: any,
  reqPath: string,
  trustedHosts?: ReadonlySet<string> | string[],
) {
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
    upstreamRes = await safeProxyFetch(fileItem.raw_url, headers, trustedHosts)
  } catch (ssrfErr: any) {
    return c.text(ssrfErr.message || "SSRF blocked", 403)
  }

  // If upstream returns 412 Precondition Failed (e.g. strict OSS check), retry with plain GET without Range
  if (upstreamRes.status === 412) {
    console.warn(
      `[rawRouter] Upstream returned 412 for '${reqPath}', retrying without Range header...`,
    )
    delete headers["Range"]
    upstreamRes = await safeProxyFetch(fileItem.raw_url, headers, trustedHosts)
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
  const defaultContentType = extMap[fileExt] || "application/octet-stream"
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
  c.header("Accept-Ranges", upstreamRes.headers.get("accept-ranges") || "bytes")

  // Forward caching headers
  const etag = upstreamRes.headers.get("etag")
  if (etag) c.header("ETag", etag)
  const lastModified = upstreamRes.headers.get("last-modified")
  if (lastModified) c.header("Last-Modified", lastModified)
  const cacheControl = upstreamRes.headers.get("cache-control")
  if (cacheControl) c.header("Cache-Control", cacheControl)
  // FIX(H-3): 上游响应头已按白名单回显，但对 Content-Disposition 额外
  // 清洗 CR/LF 与控制字符，防止恶意上游注入额外响应头（Set-Cookie/Location）。
  const contentDisposition = upstreamRes.headers.get("content-disposition")
  if (contentDisposition) {
    const safeDisposition = contentDisposition.replace(/[\r\n\u0000-\u001f]+/g, "")
    c.header("Content-Disposition", safeDisposition)
  }

  return c.body(upstreamRes.body as any, upstreamRes.status as any)
}

/**
 * 判断某个 URL 是否指向本站（用于决定是否附带下载签名）。
 * 本站地址通常是 /p/... 之类的相对路径，或与请求同 host 的绝对地址。
 */
function isSameOriginUrl(url: string, c: any): boolean {
  if (url.startsWith("/")) return true
  try {
    const target = new URL(url)
    const host = c.req.header("host") || new URL(c.req.url).host
    return target.host === host
  } catch {
    return false
  }
}

/**
 * 构造 down_proxy_url 形式的下载地址。
 *
 * 对齐 Go internal/common/url.go 的 DownloadProxyURL：模板里的 $path 会被替换为
 * 真实路径；若模板以 / 开头则视为同源相对路径，否则应为 http(s) 绝对地址。
 *
 * 注意：模板不携带本服务实例的密钥，因此 worker 场景下无法预先把签名写进模板，
 * 这里在运行时补签（仅当目标是本站 且 需要签名 且 未禁用 disable_proxy_sign）。
 */
async function buildDownProxyUrl(
  c: any,
  template: string,
  reqPath: string,
  storage: any,
): Promise<string> {
  if (!template) return ""
  const encoded = encodeURI(reqPath.startsWith("/") ? reqPath : "/" + reqPath)

  let url = template.includes("$path")
    ? template.replace(/\$path(?!\w)/g, encoded)
    : template.replace(/\/+$/, "") + encoded

  if (
    isSameOriginUrl(url, c) &&
    !getDisableProxySign(storage) &&
    !/[?&]sign=/.test(url)
  ) {
    try {
      const policy = await getSignPolicy(c)
      if (policy.enabled) {
        const sign = await signDownloadPath(
          c,
          reqPath,
          await getSignExpiresIn(c),
        )
        if (sign) url += (url.includes("?") ? "&" : "?") + "sign=" + sign
      }
    } catch (e: any) {
      console.warn(
        `[rawRouter] failed to sign down_proxy_url for '${reqPath}': ${e?.message || e}`,
      )
    }
  }
  return url
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
          // 管理员配置的受信存储 endpoint host（可能是内网自建 S3/WebDAV/MinIO），
          // 加上全局环境变量 SSRF_ALLOWED_HOSTS，合并为 SSRF 白名单，避免被误拦截。
          const trustedHosts = getTrustedHosts(resolved.storage.addition, c.env)
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
            // 下载模式决策：对齐 Go 的 ShouldProxy()/canProxy() + webdav_policy。
            //   - 驱动强制代理（MustProxy）> 存储 web_proxy > /p、/sd 路径 >
            //     存储 webdav_policy > 驱动默认（PreferProxy）> 302_redirect
            // 存储级 webdav_policy 从此真正生效（此前该字段仅有表单、无逻辑）。
            const decision = resolveProxyDecision(
              resolved.storage,
              normDriver,
              isProxy,
            )

            // use_proxy_url：重定向到管理员配置的下载代理地址（注意与真实的
            // 代理模式区分，后者用 needsProxy 表达，避免误落入 native_proxy）
            if (decision.mode === "use_proxy_url") {
              const downProxy = getDownProxyUrl(resolved.storage)
              if (downProxy) {
                const url = await buildDownProxyUrl(
                  c,
                  downProxy,
                  reqPath,
                  resolved.storage,
                )
                if (url) {
                  try {
                    assertSafeUrl(url, "Redirect download", trustedHosts)
                  } catch (ssrfErr: any) {
                    return c.text(ssrfErr.message || "SSRF blocked", 403)
                  }
                  console.log(
                    `[rawRouter] Redirecting download for '${reqPath}' to configured proxy url via ${resolved.storage.driver}`,
                  )
                  return c.redirect(url, 302)
                }
              }
              console.warn(
                `[rawRouter] webdav_policy=use_proxy_url but down_proxy_url is empty (storage=${resolved.storage.id}); falling back to native proxy`,
              )
              return proxyUpstream(c, fileItem, reqPath)
            }

            if (decision.needsProxy) {
              return proxyUpstream(c, fileItem, reqPath, trustedHosts)
            }

            try {
              assertSafeUrl(fileItem.raw_url, "Redirect download", trustedHosts)
            } catch (ssrfErr: any) {
              return c.text(ssrfErr.message || "SSRF blocked", 403)
            }
            console.log(
              `[rawRouter] Redirecting download for '${reqPath}' via ${resolved.storage.driver}`,
            )
            return c.redirect(fileItem.raw_url, 302)
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
