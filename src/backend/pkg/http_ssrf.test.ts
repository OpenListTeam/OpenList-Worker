import test from "node:test"
import assert from "node:assert/strict"
import { isSafeUrl } from "./http"

/**
 * isSafeUrl 的 SSRF 回归测试。
 *
 * 重点覆盖 IPv4-mapped IPv6：WHATWG URL 会把 `http://[::ffff:169.254.169.254]/`
 * 的 hostname 归一化成 `[::ffff:a9fe:a9fe]`，因此对 hostname 做
 * `includes("::ffff:169.254.")` 这类子串匹配永远命中不到 —— 攻击者据此可
 * 直达云元数据 / loopback / 私网。判定必须走数值分组。
 */

test("blocks IPv4-mapped IPv6 in every textual form", () => {
  // 全部等价于内网 / 元数据地址，只是十六进制压缩写法不同
  const mapped = [
    "http://[::ffff:169.254.169.254]/", // 云元数据（长写法会被归一化成 a9fe:a9fe）
    "http://[::ffff:a9fe:a9fe]/", // 同上，压缩写法
    "http://[::ffff:7f00:1]/", // 127.0.0.1
    "http://[::ffff:127.0.0.1]/", // 同上，点分写法
    "http://[::ffff:127.1]/", // 短写 127.1
    "http://[0:0:0:0:0:ffff:127.0.0.1]/", // 全展开写法
    "http://[::ffff:a00:1]/", // 10.0.0.1
    "http://[::ffff:c0a8:101]/", // 192.168.1.1
    "http://[::ffff:ac10:1]/", // 172.16.0.1
    "http://[::ffff:0:0]/", // 0.0.0.0
  ]
  for (const url of mapped) {
    assert.equal(isSafeUrl(url), false, `must block ${url}`)
  }
})

test("blocks native IPv6 loopback, link-local and unique-local", () => {
  for (const url of [
    "http://[::1]/", // loopback
    "http://[::]/", // unspecified
    "http://[fe80::1]/", // link-local
    "http://[febf::1]/", // link-local 上界
    "http://[fc00::1]/", // unique local
    "http://[fd00::1]/", // unique local
    "http://[fdff::1]/", // unique local 上界
  ]) {
    assert.equal(isSafeUrl(url), false, `must block ${url}`)
  }
})

test("blocks IPv4 private / loopback / metadata ranges", () => {
  for (const url of [
    "http://127.0.0.1/",
    "http://127.1/",
    "http://0.0.0.0/",
    "http://10.0.0.1/",
    "http://172.16.0.1/",
    "http://172.31.255.255/",
    "http://192.168.1.1/",
    "http://169.254.169.254/latest/meta-data/",
    "http://100.100.100.200/", // 阿里云元数据
    "http://100.64.0.1/", // CGNAT
  ]) {
    assert.equal(isSafeUrl(url), false, `must block ${url}`)
  }
})

test("blocks non-http protocols and dangerous hostnames", () => {
  for (const url of [
    "file:///etc/passwd",
    "gopher://127.0.0.1/",
    "ftp://127.0.0.1/",
    "http://localhost/",
    "http://metadata.google.internal/",
    "http://2130706433/", // 整数 IP
    "http://0x7f000001/", // 十六进制 IP
    "http://0177.0.0.1/", // 前导零
    "http://127.0.0.1.nip.io/", // rebinding 服务
    "http://localtest.me/",
  ]) {
    assert.equal(isSafeUrl(url), false, `must block ${url}`)
  }
})

/**
 * 回归重点：旧的子串匹配把 "::1" 当黑名单，于是任何尾段形如 ::1 / ::1111 的
 * 合法公网 IPv6 都被误杀。2606:4700:4700::1111 就是 1.1.1.1 的 IPv6，
 * 2400:cb00::1 属于 ARIN 公网段。误杀会直接打断真实下载链路。
 */
test("does not over-block legitimate public IPv6 literals", () => {
  for (const url of [
    "http://[2606:4700:4700::1111]/", // Cloudflare DNS 1.1.1.1
    "http://[2400:cb00::1]/", // 公网，2400::/12
    "http://[2001:4860:4860::8888]/", // Google DNS
    "http://[2a00:1450:4001:81f::200e]/", // Google
  ]) {
    assert.equal(isSafeUrl(url), true, `must allow ${url}`)
  }
})

test("does not regress normal public hosts", () => {
  for (const url of [
    "https://example.com/x",
    "https://cdn.jsdelivr.net/npm/pkg/file.js",
    "https://storage.googleapis.com/bucket/object",
    // 腾讯云 COS 的 hostname 含 10 位数字 AppID，不能被当成整数 IP 拦截
    "https://bucket-1250000000.cos.ap-guangzhou.myqcloud.com/a.txt",
  ]) {
    assert.equal(isSafeUrl(url), true, `must allow ${url}`)
  }
})

test("allowHosts only exempts exact host matches", () => {
  const allow = ["dav.example.com", "minio.internal"]

  // 白名单内的 host 放行（hostname 不含端口，故换端口同样放行）
  assert.equal(isSafeUrl("https://dav.example.com/x", allow), true)
  assert.equal(isSafeUrl("https://minio.internal:9000/x", allow), true)

  // 白名单不得「传染」：未列出的危险 host 仍必须被拦
  assert.equal(isSafeUrl("http://127.0.0.1/x", allow), false)
  assert.equal(isSafeUrl("http://169.254.169.254/latest/meta-data/", allow), false)
  assert.equal(isSafeUrl("http://[::ffff:7f00:1]/", allow), false)
  // 子域精确匹配之外的 host 不会因父域在白名单而被放行到内网语义上
  assert.equal(isSafeUrl("https://other.example.com/x", allow), true)
})