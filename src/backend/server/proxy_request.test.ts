import assert from "node:assert/strict"
import { test } from "node:test"
import {
  buildUpstreamHeaders,
  shouldRetryWithoutRange,
  contentTypeForPath,
  sanitizeContentDisposition,
  decideProxyPayloadAction,
  exceedsProxyPayloadLimit,
  getProxyPayloadLimit,
  isAuthBoundDownload,
  rawUrlNeedsPrivateHeaders,
  upstreamBodySize,
  DEFAULT_EDGEONE_PAYLOAD_LIMIT,
  PROXY_USER_AGENT,
  type UpstreamResponseLike,
} from "./proxy_request"
import { getProxyRange } from "../internal/driver/storageopts"
import { resolveProxyDecision } from "../internal/driver/proxy"

/** 构造上游响应的最小替身 */
function upstream(
  status: number,
  headers: Record<string, string> = {},
): UpstreamResponseLike {
  const lower: Record<string, string> = {}
  for (const [k, v] of Object.entries(headers)) lower[k.toLowerCase()] = v
  return {
    status,
    headers: { get: (n: string) => lower[n.toLowerCase()] ?? null },
  }
}

// ---- Range 透传决策（proxy_range）----

test("proxy_range=true 时透传客户端 Range", () => {
  const headers = buildUpstreamHeaders({
    rangeHeader: "bytes=0-1023",
    proxyRange: true,
  })
  assert.equal(headers["Range"], "bytes=0-1023")
})

test("proxy_range=false 时丢弃 Range（上游不支持 Range 的场景）", () => {
  const headers = buildUpstreamHeaders({
    rangeHeader: "bytes=0-1023",
    proxyRange: false,
  })
  assert.equal(headers["Range"], undefined)
})

test("proxy_range=true 但客户端未发 Range 时不凭空添加", () => {
  const headers = buildUpstreamHeaders({ rangeHeader: null, proxyRange: true })
  assert.equal(headers["Range"], undefined)
})

// ---- 与签名的交互（评审重点）----

test("Range 透传不改变签名：签名绑定 URL，与请求头无关", () => {
  // 模拟带签名的直链，两种情况下的 raw_url 必须完全一致，
  // 证明丢弃/保留 Range 都不需要重新计算签名。
  const signedUrl = "https://cdn.example.com/f.mp4?sign=1700000000.abcdef"
  const withRange = buildUpstreamHeaders({
    rangeHeader: "bytes=100-200",
    proxyRange: true,
  })
  const withoutRange = buildUpstreamHeaders({
    rangeHeader: "bytes=100-200",
    proxyRange: false,
  })
  // 请求头中不包含任何签名相关内容，签名只存在于 URL 上
  assert.deepEqual(
    Object.keys(withRange).filter((k) => /sign/i.test(k)),
    [],
  )
  assert.deepEqual(
    Object.keys(withoutRange).filter((k) => /sign/i.test(k)),
    [],
  )
  assert.equal(
    signedUrl,
    "https://cdn.example.com/f.mp4?sign=1700000000.abcdef",
  )
})

test("412 兜底重试时丢失 Range，但签名 URL 可复用（只需换请求头）", () => {
  const headers = buildUpstreamHeaders({
    rangeHeader: "bytes=0-99",
    proxyRange: true,
  })
  assert.equal(headers["Range"], "bytes=0-99")

  // 上游严格校验 Range，返回 412
  assert.equal(shouldRetryWithoutRange(headers, upstream(412)), true)

  // 删除 Range 后重试：签名仍在 URL 上，无需重新计算
  delete headers["Range"]
  assert.equal(headers["Range"], undefined)
  assert.equal(shouldRetryWithoutRange(headers, upstream(412)), false)
})

test("带签名 + Range 命中上游不支持 Range 的 200 分支时也走兜底", () => {
  const headers = buildUpstreamHeaders({
    rawUrlHeaders: { Authorization: "Bearer token-from-driver" },
    rangeHeader: "bytes=500-999",
    proxyRange: true,
  })
  // 上游忽略 Range 直接回 200 且无 Content-Range
  assert.equal(shouldRetryWithoutRange(headers, upstream(200, {})), true)
  // 驱动自带的 Authorization 头在兜底后必须保留
  delete headers["Range"]
  assert.equal(headers["Authorization"], "Bearer token-from-driver")
})

// ---------------------------------------------------------------------------
// 二次校验：Range 协商后上游实际回传的大小
//
// 前置上限检查是按「客户端请求的分片」估算的，但 Range 兜底重试（删掉 Range 重试）
// 与「上游忽略 Range 直接回 200」都会让上游回传整份文件；这条路径必须按上游给出
// 的实际长度复核，否则小分片请求会把整份文件塞进云函数响应体（EdgeOne 6 MiB）。
// ---------------------------------------------------------------------------

test("upstreamBodySize: Content-Length 优先，Content-Range 兜底", () => {
  assert.equal(
    upstreamBodySize(upstream(200, { "content-length": "12345" }).headers),
    12345,
  )
  // 只有 Content-Range 时取分段长度（206 分片）
  assert.equal(
    upstreamBodySize(
      upstream(206, { "content-range": "bytes 0-1048575/524288000" }).headers,
    ),
    1048576,
  )
  // 无任何长度信息 → 0（未知，交给调用方决定是否放行）
  assert.equal(upstreamBodySize(upstream(200, {}).headers), 0)
  assert.equal(upstreamBodySize(null), 0)
  assert.equal(
    upstreamBodySize(upstream(200, { "content-length": "abc" }).headers),
    0,
  )
})

test("Range + 签名 + 上限交互：412 重试后按完整文件大小判定（无需重签）", () => {
  const signedUrl = "https://cdn.example.com/f.mp4?sign=1700000000.abcdef"
  const headers = buildUpstreamHeaders({
    rangeHeader: "bytes=0-1048575", // 只想取 1 MiB
    proxyRange: true,
  })
  assert.equal(headers["Range"], "bytes=0-1048575")

  // 前置检查：按 1 MiB 分片估算 → 通过
  assert.equal(
    decideProxyPayloadAction({
      size: 500 * MiB,
      range: headers["Range"],
      payloadLimit: EDGE_LIMIT,
      authBound: false,
    }),
    "proxy",
  )

  // 上游 412 → 去掉 Range 重试；签名在 URL 上，重试无需重新计算
  assert.equal(shouldRetryWithoutRange(headers, upstream(412)), true)
  delete headers["Range"]
  assert.equal(shouldRetryWithoutRange(headers, upstream(412)), false)
  assert.equal(
    signedUrl,
    "https://cdn.example.com/f.mp4?sign=1700000000.abcdef",
  )

  // 重试后上游回了整份文件 → 二次校验按实际大小判定为超限，降级 302
  const retried = upstream(200, { "content-length": String(500 * MiB) })
  const actual = upstreamBodySize(retried.headers)
  assert.equal(actual, 500 * MiB)
  assert.equal(
    decideProxyPayloadAction({
      size: actual,
      payloadLimit: EDGE_LIMIT,
      authBound: false,
    }),
    "redirect",
  )
})

test("Range + 上限交互：正常的 206 分片不会被二次校验误伤", () => {
  const partial = upstream(206, {
    "content-length": String(1 * MiB),
    "content-range": `bytes 0-${1 * MiB - 1}/${500 * MiB}`,
  })
  const actual = upstreamBodySize(partial.headers)
  assert.equal(actual, 1 * MiB)
  assert.equal(
    decideProxyPayloadAction({
      size: actual,
      payloadLimit: EDGE_LIMIT,
      authBound: false,
    }),
    "proxy",
  )
})

test("Range + 上限交互：整份文件超限且必须带鉴权头时返回可读 413", () => {
  const retried = upstream(200, { "content-length": String(500 * MiB) })
  const actual = upstreamBodySize(retried.headers)
  assert.equal(
    decideProxyPayloadAction({
      size: actual,
      payloadLimit: EDGE_LIMIT,
      authBound: isAuthBoundDownload("webdav", {
        Authorization: "Basic dXNlcjpwYXNz",
      }),
    }),
    "too-large",
  )
})

// ---- shouldRetryWithoutRange 边界 ----

test("未带 Range 的请求永不触发兜底重试", () => {
  const headers = buildUpstreamHeaders({ proxyRange: false })
  assert.equal(shouldRetryWithoutRange(headers, upstream(412)), false)
  assert.equal(shouldRetryWithoutRange(headers, upstream(200)), false)
})

test("正常 206 分片响应不触发重试", () => {
  const headers = buildUpstreamHeaders({
    rangeHeader: "bytes=0-99",
    proxyRange: true,
  })
  assert.equal(
    shouldRetryWithoutRange(
      headers,
      upstream(206, { "content-range": "bytes 0-99/1000" }),
    ),
    false,
  )
})

test("200 但带 Content-Range 时不重试（部分上游用 200 表达分片）", () => {
  const headers = buildUpstreamHeaders({
    rangeHeader: "bytes=0-99",
    proxyRange: true,
  })
  assert.equal(
    shouldRetryWithoutRange(
      headers,
      upstream(200, { "content-range": "bytes 0-99/1000" }),
    ),
    false,
  )
})

test("404 / 500 等错误不因带 Range 而重试", () => {
  const headers = buildUpstreamHeaders({
    rangeHeader: "bytes=0-99",
    proxyRange: true,
  })
  assert.equal(shouldRetryWithoutRange(headers, upstream(404)), false)
  assert.equal(shouldRetryWithoutRange(headers, upstream(500)), false)
})

// ---- 请求头构造 ----

test("User-Agent：未提供时补默认值，已提供时不覆盖", () => {
  const auto = buildUpstreamHeaders({ proxyRange: false })
  assert.equal(auto["User-Agent"], PROXY_USER_AGENT)

  const custom = buildUpstreamHeaders({
    rawUrlHeaders: { "User-Agent": "MyClient/1.0" },
    proxyRange: false,
  })
  assert.equal(custom["User-Agent"], "MyClient/1.0")
})

test("驱动提供的头优先保留（Cookie / Referer）", () => {
  const headers = buildUpstreamHeaders({
    rawUrlHeaders: { Cookie: "sid=abc", Referer: "https://pan.example.com/" },
    proxyRange: false,
  })
  assert.equal(headers["Cookie"], "sid=abc")
  assert.equal(headers["Referer"], "https://pan.example.com/")
})

// ---- 响应头处理 ----

test("Content-Type 按扩展名回退", () => {
  assert.equal(contentTypeForPath("/a/b.pdf"), "application/pdf")
  assert.equal(contentTypeForPath("/a/b.MP4"), "video/mp4")
  assert.equal(contentTypeForPath("/a/b.unknown"), "application/octet-stream")
  assert.equal(contentTypeForPath("/noext"), "application/octet-stream")
})

test("Content-Disposition 清洗 CR/LF 与控制字符（防响应头注入）", () => {
  assert.equal(
    sanitizeContentDisposition(
      'attachment; filename="a.txt"\r\nSet-Cookie: x=1',
    ),
    'attachment; filename="a.txt"Set-Cookie: x=1',
  )
  assert.equal(sanitizeContentDisposition("inline\u0000\u001fbin"), "inlinebin")
})

// ---- proxy_range 与存储配置的端到端串联 ----

test("存储 proxy_range 配置决定是否透传 Range（串联验证）", () => {
  // 未配置 → 默认透传（Go 的透明代理总是转发客户端头）
  const d1 = buildUpstreamHeaders({
    rangeHeader: "bytes=0-10",
    proxyRange: getProxyRange({}),
  })
  assert.equal(d1["Range"], "bytes=0-10")

  // 显式开启 → 透传
  const d2 = buildUpstreamHeaders({
    rangeHeader: "bytes=0-10",
    proxyRange: getProxyRange({ proxy_range: true }),
  })
  assert.equal(d2["Range"], "bytes=0-10")

  // 显式关闭 → 丢弃（用于明确拒绝 Range 的上游）
  const d3 = buildUpstreamHeaders({
    rangeHeader: "bytes=0-10",
    proxyRange: getProxyRange({ proxy_range: false }),
  })
  assert.equal(d3["Range"], undefined)
})

// ---------------------------------------------------------------------------
// 平台载荷上限保护
//
// EdgeOne 云函数对函数请求/响应 body 有 6 MiB 硬上限，超限时平台在网关层直接
// 返回 413 + CLOUD_FUNCTION_PAYLOAD_TOO_LARGE。native_proxy 会把整份文件当作
// 响应体回传，所以超过上限的代理下载必须降级为 302 直链（或给出可读的 413）。
// ---------------------------------------------------------------------------

const MiB = 1024 * 1024
const EDGE_LIMIT = DEFAULT_EDGEONE_PAYLOAD_LIMIT

test("getProxyPayloadLimit: EdgeOne 运行时默认 6 MiB，其它平台不限制", () => {
  assert.equal(EDGE_LIMIT, 6 * MiB)
  assert.equal(
    getProxyPayloadLimit({ env: { EO_REGION: "ap-shanghai" } }),
    EDGE_LIMIT,
  )
  assert.equal(getProxyPayloadLimit({ env: { EDGEONE: "1" } }), EDGE_LIMIT)
  assert.equal(getProxyPayloadLimit({ env: {} }), 0)
})

test("getProxyPayloadLimit: 按 EdgeOne Node 云函数（SCF）与 Blob 绑定识别", () => {
  // EdgeOne Node 云函数跑在腾讯 SCF 上，平台注入该变量（见 store/backend.ts）
  assert.equal(
    getProxyPayloadLimit({
      env: { TENCENTCLOUD_SCF_FUNCTIONNAME: "openlist" },
    }),
    EDGE_LIMIT,
  )
  // 绑定了 Blob 命名空间同样说明运行在 EdgeOne
  assert.equal(getProxyPayloadLimit({ env: { EDGEONE_BLOB: {} } }), EDGE_LIMIT)
})

test("getProxyPayloadLimit: 应用自注入的 __requestOrigin 不构成 EdgeOne 判据", () => {
  // src/backend/index.ts 的中间件在所有平台都会写入 __requestOrigin；
  // 用它判 EdgeOne 会把 Cloudflare / 自托管一并误判，导致 CF 大文件代理被无故降级 302
  assert.equal(
    getProxyPayloadLimit({
      env: { __requestOrigin: "https://x.edgeone.cool" },
    }),
    0,
  )
})

test("getProxyPayloadLimit: RAW_PROXY_MAX_BYTES 覆盖 / 0 关闭 / 非法值回退", () => {
  assert.equal(
    getProxyPayloadLimit({ env: { RAW_PROXY_MAX_BYTES: "1048576" } }),
    1048576,
  )
  // 0 = 关闭限制（自托管恢复「永远代理」）
  assert.equal(
    getProxyPayloadLimit({ env: { EO_REGION: "x", RAW_PROXY_MAX_BYTES: "0" } }),
    0,
  )
  assert.equal(
    getProxyPayloadLimit({
      env: { EO_REGION: "x", RAW_PROXY_MAX_BYTES: "abc" },
    }),
    EDGE_LIMIT,
  )
})

test("exceedsProxyPayloadLimit: 边界值（等于上限不算超限）", () => {
  assert.equal(
    exceedsProxyPayloadLimit(EDGE_LIMIT, undefined, EDGE_LIMIT),
    false,
  )
  assert.equal(
    exceedsProxyPayloadLimit(EDGE_LIMIT + 1, undefined, EDGE_LIMIT),
    true,
  )
  // 平台不限制时永不超限
  assert.equal(exceedsProxyPayloadLimit(9 * 1024 * MiB, undefined, 0), false)
})

test("exceedsProxyPayloadLimit: Range 分片按分片大小判断", () => {
  // 500 MiB 的文件只取 1 MiB 分片 → 不超限，视频拖动进度不受影响
  assert.equal(
    exceedsProxyPayloadLimit(500 * MiB, "bytes=0-1048575", EDGE_LIMIT),
    false,
  )
  // 分片本身超过上限 → 超限
  assert.equal(
    exceedsProxyPayloadLimit(500 * MiB, `bytes=0-${20 * MiB}`, EDGE_LIMIT),
    true,
  )
})

test("exceedsProxyPayloadLimit: 大小未知（0）不拦截，交给平台兜底", () => {
  assert.equal(exceedsProxyPayloadLimit(0, undefined, EDGE_LIMIT), false)
})

test("decideProxyPayloadAction: 未超限时照常原生代理", () => {
  assert.equal(
    decideProxyPayloadAction({
      size: 2 * MiB,
      payloadLimit: EDGE_LIMIT,
      authBound: false,
    }),
    "proxy",
  )
})

test("decideProxyPayloadAction: 超限且可直连 → 降级 302（修复 EdgeOne 下载 413）", () => {
  assert.equal(
    decideProxyPayloadAction({
      size: 200 * MiB,
      payloadLimit: EDGE_LIMIT,
      authBound: false,
    }),
    "redirect",
  )
})

test("decideProxyPayloadAction: 超限但必须带鉴权头 → too-large（返回可读 413）", () => {
  assert.equal(
    decideProxyPayloadAction({
      size: 200 * MiB,
      payloadLimit: EDGE_LIMIT,
      authBound: true,
    }),
    "too-large",
  )
})

test("decideProxyPayloadAction: proxy_range 关闭时 Range 不能掩盖超限", () => {
  // proxy_range 关闭 → 上游返回完整文件，调用方必须传 range=undefined
  assert.equal(
    decideProxyPayloadAction({
      size: 500 * MiB,
      range: undefined,
      payloadLimit: EDGE_LIMIT,
      authBound: false,
    }),
    "redirect",
  )
})

test("isAuthBoundDownload: 强制代理驱动与私有头判定", () => {
  // Go MustProxy（OnlyProxy / NoLinkURL）→ 没有可公开的直链
  assert.equal(isAuthBoundDownload("Googledrive", undefined), true)
  assert.equal(isAuthBoundDownload("WeiYun", undefined), true)
  // 预授权直链（OneDrive 的 @microsoft.graph.downloadUrl 无需私有头）
  assert.equal(isAuthBoundDownload("Onedrive", undefined), false)
  // Go 里只有 PreferProxy 的驱动不算强制代理，但直链带 Cookie 时仍不可降级
  assert.equal(isAuthBoundDownload("baidunetdisk", undefined), false)
  assert.equal(isAuthBoundDownload("baidunetdisk", { Cookie: "ndus=1" }), true)
  assert.equal(
    isAuthBoundDownload("webdav", { Authorization: "Basic xxx" }),
    true,
  )
  // 只有 UA / Referer 不算私有头（如 115open 的 UA、S3 的 Referer）
  assert.equal(
    isAuthBoundDownload("s3", {
      "User-Agent": "openlist",
      Referer: "https://x",
    }),
    false,
  )
  assert.equal(rawUrlNeedsPrivateHeaders({ cookie: "sid=1" }), true)
  assert.equal(rawUrlNeedsPrivateHeaders({ "X-Emby-Token": "t" }), false)
  assert.equal(rawUrlNeedsPrivateHeaders(null), false)
})

test("串联：web_proxy=true 的 OneDrive 大文件在 EdgeOne 上降级为 302", () => {
  // 决策层要求原生代理（存储开启了 web_proxy）
  const decision = resolveProxyDecision(
    { driver: "Onedrive", web_proxy: true },
    "onedrive",
    false,
  )
  assert.equal(decision.needsProxy, true)
  assert.equal(decision.source, "web_proxy")

  // 上限层把超限的代理降级为直链，避免平台 413
  const action = decideProxyPayloadAction({
    size: 200 * MiB,
    payloadLimit: EDGE_LIMIT,
    authBound: isAuthBoundDownload("onedrive", undefined),
  })
  assert.equal(action, "redirect")
})

test("串联：WebDAV（带 Authorization）大文件在 EdgeOne 上拒绝代理而非平台报错", () => {
  const decision = resolveProxyDecision({ driver: "WebDav" }, "webdav", false)
  assert.equal(decision.needsProxy, true)

  const action = decideProxyPayloadAction({
    size: 200 * MiB,
    payloadLimit: EDGE_LIMIT,
    authBound: isAuthBoundDownload("webdav", {
      Authorization: "Basic dXNlcjpwYXNz",
    }),
  })
  assert.equal(action, "too-large")
})

// ---------------------------------------------------------------------------
// proxy_ignore_headers（对齐 Go conf.ProxyIgnoreHeaders，默认 authorization,referer）
// ---------------------------------------------------------------------------

test("buildUpstreamHeaders：proxy_ignore_headers 命中时不转发该客户端头", () => {
  const ignored = buildUpstreamHeaders({
    rawUrlHeaders: { Referer: "https://driver.example/" },
    rangeHeader: "bytes=0-10",
    proxyRange: true,
    ignoreHeaders: "range,user-agent",
  })
  assert.equal(ignored["Range"], undefined)
  assert.equal(ignored["User-Agent"], undefined)
  // 驱动自己声明的头不受影响（Go 也是先过滤客户端头、再套用驱动 override）
  assert.equal(ignored["Referer"], "https://driver.example/")

  // 默认忽略列表（authorization,referer）不影响 Range 与兜底 UA
  const kept = buildUpstreamHeaders({
    rangeHeader: "bytes=0-10",
    proxyRange: true,
    ignoreHeaders: "authorization,referer",
  })
  assert.equal(kept["Range"], "bytes=0-10")
  assert.equal(typeof kept["User-Agent"], "string")
})
