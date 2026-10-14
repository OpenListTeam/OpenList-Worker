import test from "node:test"
import assert from "node:assert/strict"
import { buildDavChildHref, generateWebDavXml } from "./xml"

/**
 * WebDAV PROPFIND 的 href 回归测试（Issue #110，修复 Issue #104）。
 *
 * RFC 4918 §8.3 规定 href 有两种合法形态：相对引用（path-absolute，客户端按
 * Request-URI 解析）或完整 absolute-URI，§8.3.1 的示例里
 * `'/sample/'` 与 `'http://example.com/sample/'` 均合法；本实现选相对引用。
 * 同时要求：同一个 Multi-Status 内格式一致、href 前缀须与 Request-URI 一致、
 * 集合标识符应以 '/' 结尾。
 *
 * 因此测试的基准一律是**真实请求路径**（`URL.pathname`，已百分号编码），
 * 而不是硬编码的挂载前缀。
 */

const hrefs = (xml: string): string[] =>
  [...xml.matchAll(/<d:href>([^<]*)<\/d:href>/g)].map((m) => m[1])

/** 取出 XML 解析后的真实 href（反转义），用于断言语义而非字面量 */
function decodedHrefs(xml: string): string[] {
  return hrefs(xml).map((h) =>
    h
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'"),
  )
}

const collectionFlags = (xml: string): boolean[] =>
  xml
    .split("<d:response>")
    .slice(1)
    .map((b) => /<d:collection\/>/.test(b))

test("根目录：href 与请求路径一致且以 / 结尾", () => {
  const xml = generateWebDavXml("/dav/", [])
  assert.deepEqual(hrefs(xml), ["/dav/"])
})

test("子目录：自身与子项都带挂载前缀", () => {
  // Issue #104 的真实场景：PROPFIND /dav/wewe，Depth: 1
  const xml = generateWebDavXml("/dav/wewe", [
    { name: "WESSSDQ", size: 0, isFolder: true, modified: "2026-10-04T00:00:00Z" },
    { name: "70rop", size: 0, isFolder: true, modified: "2026-10-04T00:00:00Z" },
    { name: "a.txt", size: 12, isFolder: false, modified: "2026-10-04T00:00:00Z" },
  ])
  assert.deepEqual(hrefs(xml), [
    "/dav/wewe/",
    "/dav/wewe/WESSSDQ/",
    "/dav/wewe/70rop/",
    "/dav/wewe/a.txt",
  ])
})

test("请求不带尾斜杠时，集合 href 补上斜杠", () => {
  assert.deepEqual(hrefs(generateWebDavXml("/dav/wewe", [])), ["/dav/wewe/"])
  assert.deepEqual(hrefs(generateWebDavXml("/dav/wewe/", [])), ["/dav/wewe/"])
})

test("目录带尾斜杠、文件不带", () => {
  const xml = generateWebDavXml("/dav/dir", [
    { name: "sub", size: 0, isFolder: true, modified: "2026-10-04T00:00:00Z" },
    { name: "file.bin", size: 3, isFolder: false, modified: "2026-10-04T00:00:00Z" },
  ])
  assert.deepEqual(collectionFlags(xml), [true, true, false])
  const [, dir, file] = hrefs(xml)
  assert.equal(dir, "/dav/dir/sub/")
  assert.equal(file, "/dav/dir/file.bin")
  assert.ok(!file.endsWith("/"), "文件 href 不应有尾斜杠")
})

/**
 * 挂在子路径下（如 https://host/list/dav）时 href 仍须与请求路径一致。
 * 这是把 href 基准从「硬编码挂载前缀」改成「真实请求路径」的原因：
 * 前者会输出 /dav/list/dav/x，与 Request-URI 对不上，客户端直接丢弃记录。
 */
test("子路径挂载时 href 仍与请求路径一致", () => {
  for (const reqPath of ["/list/dav/wewe", "/openlist/dav/wewe", "/dav/wewe"]) {
    const xml = generateWebDavXml(reqPath, [
      { name: "sub", size: 0, isFolder: true, modified: "2026-10-04T00:00:00Z" },
    ])
    for (const h of hrefs(xml)) {
      assert.ok(
        h === reqPath || h.startsWith(reqPath.endsWith("/") ? reqPath : reqPath + "/"),
        `href 必须以请求路径 ${reqPath} 为前缀，实际: ${h}`,
      )
    }
  }
})

test("子项名按段百分号编码（来自解码后的原文）", () => {
  const xml = generateWebDavXml("/dav/wewe", [
    { name: "来自：TOKEN订阅", size: 0, isFolder: true, modified: "2026-10-04T00:00:00Z" },
    { name: "a b&c.txt", size: 1, isFolder: false, modified: "2026-10-04T00:00:00Z" },
    { name: "x#y?z.txt", size: 1, isFolder: false, modified: "2026-10-04T00:00:00Z" },
  ])
  const [, dir, amp, hash] = hrefs(xml)
  assert.equal(dir, "/dav/wewe/%E6%9D%A5%E8%87%AA%EF%BC%9ATOKEN%E8%AE%A2%E9%98%85/")
  assert.equal(amp, "/dav/wewe/a%20b%26c.txt")
  // # 与 ? 会被当成 fragment / query，必须编码
  assert.equal(hash, "/dav/wewe/x%23y%3Fz.txt")
})

/**
 * 自身 href 来自 URL.pathname（已百分号编码），不能再整条编码，否则双重编码。
 * §8.3.1 提醒「合法 URI 里仍可能需要在 XML 字符数据里转义的字符（如 &）」——
 * 本实现对 & 与 ' 做百分号编码而非 XML 实体，原因见 encodeXmlSensitiveChars
 * 的注释（本仓库自己的 parseMultistatusXml 不做实体反转义）。
 */
test("自身 href 不双重编码，且裸 & 被百分号编码", () => {
  // URL.pathname 已把 %20 / 非 ASCII 编码好
  const encodedPathname = new URL("https://h/dav/a%20b/%E4%B8%AD?x=1").pathname
  const xml = generateWebDavXml(encodedPathname, [])
  const h = hrefs(xml)[0]
  assert.equal(h, "/dav/a%20b/%E4%B8%AD/") // 没有出现 %2520
  assert.ok(!h.includes("%25"), "不应出现双重编码")

  // & 是 URI 合法字符，但放进 XML 文本必须处理
  const ampPath = new URL("https://h/dav/R&D").pathname
  assert.equal(ampPath, "/dav/R&D", "前提：& 在 pathname 中保持原样")
  const xml2 = generateWebDavXml(ampPath, [])
  assert.ok(!/&/.test(xml2), "输出中不应出现裸 &")
  assert.ok(!/&(amp|lt|gt|quot|apos);/.test(xml2), "不应使用 XML 实体")
  assert.equal(hrefs(xml2)[0], "/dav/R%26D/")
  // decodeURIComponent 后应还原为原始路径
  assert.equal(decodeURIComponent(hrefs(xml2)[0].replace("/dav", "")), "/R&D/")
})

test("apostrophe 也被百分号编码（与 & 同类）", () => {
  const p = new URL("https://h/dav/it's").pathname
  assert.equal(p, "/dav/it's")
  const xml = generateWebDavXml(p, [])
  assert.ok(!/\x27|'/.test(hrefs(xml)[0]), "href 不应含裸 apostrophe")
  assert.equal(decodeURIComponent(hrefs(xml)[0].replace("/dav", "")), "/it's/")
})

/**
 * 互操作：本仓库自己的 WebDAV 驱动用正则取 href 文本且不做 XML 实体反转义，
 * 因此输出必须不含任何实体，否则驱动侧会把 &amp; 当成字面量名字。
 */
test("输出不含任何 XML 实体，可被朴素正则解析器直接消费", () => {
  const xml = generateWebDavXml(new URL("https://h/dav/R&D").pathname, [
    { name: "a&b", size: 0, isFolder: true, modified: "2026-10-04T00:00:00Z" },
    { name: "c'd", size: 0, isFolder: false, modified: "2026-10-04T00:00:00Z" },
  ])
  assert.ok(!xml.includes("&amp;"), "不得出现 &amp;")
  assert.ok(!xml.includes("&lt;"), "不得出现 &lt;")
  assert.ok(!xml.includes("&apos;"), "不得出现 &apos;")

  // 模拟 parseMultistatusXml 的取名逻辑：strip 尾斜杠后取末段并 decodeURIComponent
  const derived = decodedHrefs(xml).map((h) => {
    const clean = h.replace(/\/+$/, "")
    return decodeURIComponent(clean.split("/").pop() || "")
  })
  assert.deepEqual(derived, ["R&D", "a&b", "c'd"])
})

test("自身 href 中的 < 不会提前截断标签", () => {
  // < 在 pathname 里会被编码成 %3C；但若上层传入未编码的 <，也不能破坏 XML
  const xml = generateWebDavXml("/dav/a%3Cb", [])
  assert.equal(hrefs(xml).length, 1, "href 不应被 < 截断")
  assert.equal(hrefs(xml)[0], "/dav/a%3Cb/")
})

test("路径分隔符不被编码成 %2F", () => {
  assert.equal(hrefs(generateWebDavXml("/dav/a/b/c", []))[0], "/dav/a/b/c/")
  assert.equal(
    buildDavChildHref("/dav/a/b/", "c", false),
    "/dav/a/b/c",
  )
})

test("孤立代理项不抛错（encodeURIComponent 会抛 URIError）", () => {
  // 损坏的存储元数据可能给出非法 UTF-16；不能因此把整个 PROPFIND 打成 500
  const xml = generateWebDavXml("/dav/\uD800", [
    { name: "\uDC00", size: 1, isFolder: false, modified: "2026-10-04T00:00:00Z" },
  ])
  assert.ok(xml.includes("<d:multistatus"))
})

test("同一个响应内所有 href 格式一致（RFC 4918 §8.3 要求）", () => {
  const xml = generateWebDavXml("/dav/dir", [
    { name: "sub", size: 0, isFolder: true, modified: "2026-10-04T00:00:00Z" },
    { name: "f.txt", size: 1, isFolder: false, modified: "2026-10-04T00:00:00Z" },
  ])
  // 全部是相对引用（以 / 开头），不得混入 absolute-URI（http://…）
  for (const h of hrefs(xml)) {
    assert.ok(h.startsWith("/"), `href 应为相对引用: ${h}`)
    assert.ok(!/^https?:/i.test(h))
  }
})

test("XML 结构完整且标签配平", () => {
  const xml = generateWebDavXml("/dav/x", [
    { name: "f", size: 5, isFolder: false, modified: "2026-10-04T00:00:00Z" },
  ])
  assert.ok(xml.startsWith('<?xml version="1.0" encoding="utf-8" ?>'))
  assert.ok(xml.includes('<d:multistatus xmlns:d="DAV:">'))
  assert.ok(xml.trimEnd().endsWith("</d:multistatus>"))
  assert.equal((xml.match(/<d:response>/g) || []).length, 2)
  assert.equal((xml.match(/<\/d:response>/g) || []).length, 2)
  assert.equal((xml.match(/<d:href>/g) || []).length, 2)
})