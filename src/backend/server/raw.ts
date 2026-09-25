import { Hono } from "hono"
import { getSettings, resolvePath } from "../internal/model/db"
import { parseRangeHeader } from "../internal/stream/stream"
import { flushPendingDriverState, getDriver } from "../internal/op/storage"
import { resolveShare } from "../internal/op/share"
import {
  needDownloadSign,
  verifyDownloadSign,
  signDownloadPath,
  getSignExpiresIn,
} from "../pkg/sign"
import { safeErrorMessage } from "../pkg/errs"
import { encodeDownloadPath } from "../pkg/path"
import { assertSafeUrl, getTrustedHosts } from "../pkg/http"
import {
  resolveProxyDecision,
  getDownProxyUrl,
  getDisableProxySign,
  canUseProxyEndpoint,
  normalizeExtList,
} from "../internal/driver/proxy"
import { getProxyRange } from "../internal/driver/storageopts"
import {
  buildUpstreamHeaders,
  shouldRetryWithoutRange,
  contentTypeForPath,
  sanitizeContentDisposition,
  decideProxyPayloadAction,
  exceedsProxyPayloadLimit,
  getProxyPayloadLimit,
  isAuthBoundDownload,
  upstreamBodySize,
} from "./proxy_request"

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

/**
 * 平台上限导致的 413 文案。
 *
 * 说明「为什么代理不了」与「有哪些替代路径」，避免用户只看到平台自带的
 * CLOUD_FUNCTION_PAYLOAD_TOO_LARGE 错误页（那里没有任何可操作信息）。
 * 措辞不写死平台：限制可能来自 EdgeOne 的自动判定，也可能来自管理员配置的
 * RAW_PROXY_MAX_BYTES（例如 Vercel / 阿里云 ESA 上的同类限制）。
 */
function payloadLimitMessage(c: any, label: string, size: number): string {
  const limit = getProxyPayloadLimit(c)
  const mib = (bytes: number) => Math.floor(bytes / 1024 / 1024)
  return (
    `文件过大，当前部署平台无法代理下载（${size} 字节 > 上限 ${limit} 字节 ≈ ${mib(limit)} MiB）。` +
    `当前运行环境对函数单次请求/响应 body 有硬上限（EdgeOne 云函数为 6 MiB，错误码 ` +
    `CLOUD_FUNCTION_PAYLOAD_TOO_LARGE / HTTP 413），` +
    `${label} 无法提供可直连的下载链接（或直链必须携带私有鉴权头），只能经服务端转发，` +
    `因此无法绕过该上限。` +
    `建议：改用返回公开直链的存储、或在自托管环境（Docker / Node）部署；` +
    `确需放开限制可设置 RAW_PROXY_MAX_BYTES=0（或按平台实际上限调整该值）。`
  )
}

// 原生代理：拉取上游直链并回传字节流（含 Range、缓存头、CORS）。
// 抽成独立函数是因为「webdav_policy=use_proxy_url 但未配置 down_proxy_url」
// 与「驱动强制代理」两种情况都需要走同一套实现。
async function proxyUpstream(
  c: any,
  fileItem: any,
  reqPath: string,
  trustedHosts?: ReadonlySet<string> | string[],
  opts: {
    /** 存储的 proxy_range（是否透传客户端 Range） */
    proxyRange?: boolean
    /** 驱动名（用于强制代理判定与日志） */
    driver?: string
    /** 存储行（bunny_storage 等条件能力需要） */
    storage?: any
    /** 全局设置 proxy_ignore_headers */
    ignoreHeaders?: unknown
  } = {},
) {
  const proxyRange = opts.proxyRange ?? false
  const driver = opts.driver ?? ""
  // ---- 平台载荷上限保护 ----
  // native_proxy 会把整份文件当作云函数响应体回传，超过平台上限时请求根本到不了
  // 本函数（平台直接返回 413 错误页），因此在这里提前决策：能直连就降级 302，
  // 不能直连则返回可读的 413。详见 server/proxy_request.ts 顶部说明。
  const authBound = isAuthBoundDownload(
    driver,
    fileItem.raw_url_headers,
    opts.storage,
  )
  const payloadAction = decideProxyPayloadAction({
    size: Number(fileItem.size) || 0,
    // proxy_range 关闭时不透传 Range，上游返回的是完整文件
    range: proxyRange ? c.req.header("Range") : undefined,
    payloadLimit: getProxyPayloadLimit(c),
    authBound,
  })

  if (payloadAction === "redirect") {
    try {
      assertSafeUrl(fileItem.raw_url, "Redirect download", trustedHosts)
    } catch (ssrfErr: any) {
      return c.text(ssrfErr.message || "SSRF blocked", 403)
    }
    console.warn(
      `[rawRouter] Falling back to 302 direct link for '${reqPath}': ${fileItem.size} bytes exceeds ` +
        `the ${getProxyPayloadLimit(c)}-byte payload limit of this runtime — native proxy would hit ` +
        `CLOUD_FUNCTION_PAYLOAD_TOO_LARGE`,
    )
    return c.redirect(fileItem.raw_url, 302)
  }

  if (payloadAction === "too-large") {
    console.warn(
      `[rawRouter] Refusing to proxy '${reqPath}': ${fileItem.size} bytes exceeds the ` +
        `${getProxyPayloadLimit(c)}-byte payload limit of this runtime and no direct link can be ` +
        `handed to the browser (driver=${driver}, authBound=${authBound})`,
    )
    return c.json(
      {
        code: 413,
        message: payloadLimitMessage(
          c,
          driver || "该存储",
          Number(fileItem.size) || 0,
        ),
        data: null,
      },
      413,
    )
  }

  // 构造上游请求头（含 proxy_range 的 Range 透传决策 + proxy_ignore_headers）
  const headers: Record<string, string> = buildUpstreamHeaders({
    rawUrlHeaders: fileItem.raw_url_headers,
    rangeHeader: c.req.header("Range"),
    proxyRange,
    ignoreHeaders: opts.ignoreHeaders,
  })

  let upstreamRes: Response
  try {
    upstreamRes = await safeProxyFetch(fileItem.raw_url, headers, trustedHosts)
  } catch (ssrfErr: any) {
    return c.text(ssrfErr.message || "SSRF blocked", 403)
  }

  // 上游不支持 Range 的兜底：412（严格 OSS 校验）或「带 Range 却回了 200」
  // 时去掉 Range 重试一次，保证请求最终能成功。
  // 注意：签名绑定 URL 中的路径与过期时间、与请求头无关，故重试无需重新签名。
  if (shouldRetryWithoutRange(headers, upstreamRes)) {
    console.warn(
      `[rawRouter] Upstream ignored/refused Range (status=${upstreamRes.status}) for '${reqPath}', retrying without Range header...`,
    )
    delete headers["Range"]
    upstreamRes = await safeProxyFetch(fileItem.raw_url, headers, trustedHosts)
  }

  // ---- 二次校验：按上游实际回传的大小再判一次 ----
  // 前面的检查按「客户端请求的分片」估算，但 Range 兜底重试（删掉 Range 重试）
  // 或上游忽略 Range 直接回 200 时，回传的是整份文件，可能远超该估算值。
  // 这里用上游的 Content-Length / Content-Range 复核，避免小分片请求把整份文件
  // 塞进云函数响应体（EdgeOne 6 MiB → CLOUD_FUNCTION_PAYLOAD_TOO_LARGE）。
  const actualBodySize = upstreamBodySize(upstreamRes.headers)
  const secondCheck = decideProxyPayloadAction({
    size: actualBodySize,
    payloadLimit: getProxyPayloadLimit(c),
    authBound,
  })
  if (secondCheck !== "proxy") {
    // 只拿到了响应头，先把上游 body 取消，避免继续下载整份文件
    try {
      await upstreamRes.body?.cancel()
    } catch {}
    console.warn(
      `[rawRouter] Upstream body is ${actualBodySize} bytes after Range negotiation ` +
        `(status=${upstreamRes.status}) for '${reqPath}', which exceeds the ` +
        `${getProxyPayloadLimit(c)}-byte payload limit of this runtime — ` +
        `refusing to stream it (decision=${secondCheck}).`,
    )
    if (secondCheck === "redirect") {
      try {
        assertSafeUrl(fileItem.raw_url, "Redirect download", trustedHosts)
      } catch (ssrfErr: any) {
        return c.text(ssrfErr.message || "SSRF blocked", 403)
      }
      return c.redirect(fileItem.raw_url, 302)
    }
    return c.json(
      {
        code: 413,
        message: payloadLimitMessage(c, driver || "该存储", actualBodySize),
        data: null,
      },
      413,
    )
  }

  // CORS headers
  c.header("Access-Control-Allow-Origin", "*")
  c.header("Access-Control-Allow-Methods", "GET, OPTIONS, HEAD")
  c.header(
    "Access-Control-Expose-Headers",
    "Content-Range, Accept-Ranges, Content-Length, Content-Disposition",
  )

  // Content-Type: prefer upstream, fallback by extension
  c.header(
    "Content-Type",
    upstreamRes.headers.get("content-type") || contentTypeForPath(reqPath),
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
    c.header(
      "Content-Disposition",
      sanitizeContentDisposition(contentDisposition),
    )
  }

  return c.body(upstreamRes.body as any, upstreamRes.status as any)
}

/**
 * 构造 down_proxy_url 形式的下载地址（对齐 Go common.GenerateDownProxyURL）。
 *
 * Go 的实现是：
 *   fmt.Sprintf("%s%s%s", strings.Split(DownProxyURL, "\n")[0],
 *                        utils.EncodePath(reqPath, true), query)
 * 即**总是**把编码后的真实路径拼在模板之后、并在未禁用时补上 `?sign=`：
 *   - 模板里没有 `$path` 概念（全仓库搜不到该占位符）；TS 额外支持 `$path`
 *     替换，属于向后兼容的超集，无 `$path` 的模板行为与 Go 完全一致。
 *   - 补签只看 `disable_proxy_sign`，**不限定同源**：down_proxy_url 的典型
 *     用法正是指向另一个域名（CDN / 前置代理 / 同实例的另一域名），此前
 *     只在"与请求同 host"时才补签，会让这类配置重定向到一个必然 401 的地址。
 *
 * 注意：模板不携带本服务实例的密钥，因此 worker 场景下无法预先把签名写进模板，
 * 只能在运行时补签。
 */
async function buildDownProxyUrl(
  c: any,
  template: string,
  reqPath: string,
  storage: any,
): Promise<string> {
  if (!template) return ""
  const encoded = encodeDownloadPath(reqPath)

  let url = template.includes("$path")
    ? template.replace(/\$path(?!\w)/g, encoded)
    : template.replace(/\/+$/, "") + encoded

  if (!getDisableProxySign(storage) && !/[?&]sign=/.test(url)) {
    try {
      const sign = await signDownloadPath(
        c,
        reqPath,
        await getSignExpiresIn(c),
      )
      if (sign) url += (url.includes("?") ? "&" : "?") + "sign=" + sign
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

  // /p 是「公开代理端点」：Go 会对它做 canProxy() 检查，不通过直接 403。
  // /d、/sd 不做该检查（Go 里它们走 ShouldProxy），因此这里单独判定。
  const isProxyEndpoint =
    c.req.path.startsWith("/p") || c.req.path.startsWith("/api/p")

  // Strip the route prefix once, preserving mount names such as /pikpak_webdav.
  const rawPath = c.req.path.replace(
    /^\/(?:api\/)?(?:raw|sd|d|p)(?=\/|$)/,
    "",
  )

  // 非法百分号转义（如手工拼出的 `/api/p/100%.txt`）会让 decodeURIComponent
  // 抛 URIError。Go 侧因为 raw_url 走 EncodePath 编码过 `%`，正常流程不会出现；
  // 但外部/手工 URL 仍可能出现，这里按 400 处理而不是冒泡成 500。
  let reqPath0: string
  try {
    reqPath0 = decodeURIComponent(rawPath)
  } catch {
    return c.text("Bad Request: malformed path encoding", 400)
  }

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

      // 全局代理相关设置（对齐 Go：proxy_types / text_types / proxy_ignore_headers）。
      // 读失败时按空列表处理：proxy_types/text_types 为空只会让扩展名规则不生效，
      // 不会误拦既有请求。
      const settings: Record<string, any> = await getSettings().catch(
        () => ({}) as Record<string, any>,
      )
      const proxyTypes = normalizeExtList(settings.proxy_types)
      const textTypes = normalizeExtList(settings.text_types)
      const proxyOpts = {
        proxyRange: getProxyRange(resolved.storage),
        driver: resolved.storage.driver,
        storage: resolved.storage,
        ignoreHeaders: settings.proxy_ignore_headers,
      }

      // /p 是公开代理端点，对齐 Go handles.Proxy() 的 canProxy() 检查：
      // 未开启代理、且扩展名也不在 proxy_types / text_types 里 → 403 proxy not allowed。
      // （Go 只对 /p 与归档 /ap 做此限制，/d、/sd 不做，故这里仅判 /p 端点。）
      if (
        isProxyEndpoint &&
        !canUseProxyEndpoint({
          storage: resolved.storage,
          driver: normDriver,
          filename: reqPath,
          proxyTypes,
          textTypes,
        })
      ) {
        console.warn(
          `[rawRouter] proxy not allowed for '${reqPath}' ` +
            `(storage=${resolved.storage.id}, driver=${resolved.storage.driver})`,
        )
        return c.text("proxy not allowed", 403)
      }

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
              { filename: reqPath, proxyTypes },
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
              return proxyUpstream(
                c,
                fileItem,
                reqPath,
                trustedHosts,
                proxyOpts,
              )
            }

            if (decision.needsProxy) {
              return proxyUpstream(
                c,
                fileItem,
                reqPath,
                trustedHosts,
                proxyOpts,
              )
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
            // 服务端回传字节流（此分支没有 raw_url，无法降级为直链）
            // → 同样受平台响应体上限约束，超限时直接给出可读的 413。
            const streamSize = Number(fileItem.size) || 0
            if (
              exceedsProxyPayloadLimit(
                streamSize,
                c.req.header("Range"),
                getProxyPayloadLimit(c),
              )
            ) {
              console.warn(
                `[rawRouter] Refusing to stream '${reqPath}': ${streamSize} bytes exceeds the ` +
                  `${getProxyPayloadLimit(c)}-byte payload limit of this runtime.`,
              )
              return c.json(
                {
                  code: 413,
                  message: payloadLimitMessage(
                    c,
                    resolved.storage.driver,
                    streamSize,
                  ),
                  data: null,
                },
                413,
              )
            }
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

    // 本地文件直读同样受平台响应体上限约束（EdgeOne / Vercel 等 Serverless）
    if (
      exceedsProxyPayloadLimit(
        Number(stat.size) || 0,
        c.req.header("Range"),
        getProxyPayloadLimit(c),
      )
    ) {
      return c.json(
        {
          code: 413,
          message: payloadLimitMessage(c, "local", Number(stat.size) || 0),
          data: null,
        },
        413,
      )
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
