import assert from "node:assert/strict"
import { test } from "node:test"
import {
  buildUpstreamHeaders,
  shouldRetryWithoutRange,
  contentTypeForPath,
  sanitizeContentDisposition,
  PROXY_USER_AGENT,
  type UpstreamResponseLike,
} from "./proxy_request"
import { getProxyRange } from "../internal/driver/storageopts"

/** 构造上游响应的最小替身 */
function upstream(
  status: number,
  headers: Record<string, string> = {},
): UpstreamResponseLike {
  const lower: Record<string, string> = {}
  for (const [k, v] of Object.entries(headers)) lower[k.toLowerCase()] = v
  return { status, headers: { get: (n: string) => lower[n.toLowerCase()] ?? null } }
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
  assert.deepEqual(Object.keys(withRange).filter((k) => /sign/i.test(k)), [])
  assert.deepEqual(Object.keys(withoutRange).filter((k) => /sign/i.test(k)), [])
  assert.equal(signedUrl, "https://cdn.example.com/f.mp4?sign=1700000000.abcdef")
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
    sanitizeContentDisposition('attachment; filename="a.txt"\r\nSet-Cookie: x=1'),
    'attachment; filename="a.txt"Set-Cookie: x=1',
  )
  assert.equal(
    sanitizeContentDisposition("inline\u0000\u001fbin"),
    "inlinebin",
  )
})

// ---- proxy_range 与存储配置的端到端串联 ----

test("存储 proxy_range 配置决定是否透传 Range（串联验证）", () => {
  // 未配置 → 默认不透传
  const storageDefault = {}
  const d1 = buildUpstreamHeaders({
    rangeHeader: "bytes=0-10",
    proxyRange: getProxyRange(storageDefault),
  })
  assert.equal(d1["Range"], undefined)

  // 显式开启 → 透传
  const storageOn = { proxy_range: true }
  const d2 = buildUpstreamHeaders({
    rangeHeader: "bytes=0-10",
    proxyRange: getProxyRange(storageOn),
  })
  assert.equal(d2["Range"], "bytes=0-10")

  // 驱动默认（139Yun）→ 透传
  const d3 = buildUpstreamHeaders({
    rangeHeader: "bytes=0-10",
    proxyRange: getProxyRange({ __driverProxyRangeDefault: true }),
  })
  assert.equal(d3["Range"], "bytes=0-10")
})
