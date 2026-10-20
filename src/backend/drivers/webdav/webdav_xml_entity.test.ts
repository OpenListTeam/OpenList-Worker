import assert from "node:assert/strict"
import { test } from "node:test"
import { parseMultistatusXml } from "./util"

test("displayname 中的 XML 实体被反转义 (#140)", () => {
  const xml = `<?xml version="1.0"?><d:multistatus xmlns:d="DAV:">
<d:response><d:href>/dav/One Hundred %26 Two.mp3</d:href>
<d:propstat><d:prop><d:displayname>One Hundred &amp; Two.mp3</d:displayname></d:prop>
<d:status>HTTP/1.1 200 OK</d:status></d:propstat></d:response>
</d:multistatus>`
  const { items } = parseMultistatusXml(xml, "/dav")
  assert.equal(items.length, 1)
  assert.equal(items[0].name, "One Hundred & Two.mp3")
})

test("href 含 XML 实体时先 XML 解码再 URI 解码（无 displayname 时回退 hrefBaseName）", () => {
  const xml = `<?xml version="1.0"?><d:multistatus xmlns:d="DAV:">
<d:response><d:href>/dav/It%27s%20a%20&amp;%20test.txt</d:href>
<d:propstat><d:prop><d:resourcetype/></d:prop>
<d:status>HTTP/1.1 200 OK</d:status></d:propstat></d:response>
</d:multistatus>`
  const { items } = parseMultistatusXml(xml, "/dav")
  assert.equal(items.length, 1)
  // href 内的 &amp; 先经 XML 解码为 &，再 decodeURIComponent 得 "It's a & test.txt"
  assert.equal(items[0].name, "It's a & test.txt")
  assert.equal(items[0].path, "/dav/It's a & test.txt")
})

test("href 先 XML 解码再 URI 解码，不双重解码百分号编码的字面实体", () => {
  // 上游真实文件名是字面量 "A&amp;B.txt"（XML 里 href 为 %26amp%3B）：
  // 仅应解一层——XML 解码无动作，URI 解码后仍是 "A&amp;B.txt"
  const xml = `<?xml version="1.0"?><d:multistatus xmlns:d="DAV:">
<d:response><d:href>/dav/A%26amp%3BB.txt</d:href>
<d:propstat><d:prop><d:resourcetype/></d:prop>
<d:status>HTTP/1.1 200 OK</d:status></d:propstat></d:response>
</d:multistatus>`
  const { items } = parseMultistatusXml(xml, "/dav")
  assert.equal(items.length, 1)
  assert.equal(items[0].name, "A&amp;B.txt")
  assert.equal(items[0].path, "/dav/A&amp;B.txt")
})

test("未知实体与纯文本名不被误改", () => {
  const xml = `<?xml version="1.0"?><d:multistatus xmlns:d="DAV:">
<d:response><d:href>/dav/plain.txt</d:href>
<d:propstat><d:prop><d:displayname>plain &nbsp; unknown &weird; &#39;ok&#x27;</d:displayname></d:prop>
<d:status>HTTP/1.1 200 OK</d:status></d:propstat></d:response>
</d:multistatus>`
  const { items } = parseMultistatusXml(xml, "/dav")
  assert.equal(items.length, 1)
  // 未知实体 &nbsp; / &weird; 保留原样；数字引用 &#39; / &#x27; 解码为引号
  assert.equal(items[0].name, "plain &nbsp; unknown &weird; 'ok'")
})

test("越界/代理区数字引用透传不崩溃（畸形上游防 DoS）", () => {
  const xml = `<?xml version="1.0"?><d:multistatus xmlns:d="DAV:">
<d:response><d:href>/dav/edge.txt</d:href>
<d:propstat><d:prop><d:displayname>edge &#x110000; &#xD800; &#x1F600;</d:displayname></d:prop>
<d:status>HTTP/1.1 200 OK</d:status></d:propstat></d:response>
</d:multistatus>`
  const { items } = parseMultistatusXml(xml, "/dav")
  assert.equal(items.length, 1)
  // >0x10FFFF 与代理区透传原样（不抛 RangeError）；合法增补平面正常解码
  assert.equal(items[0].name, "edge &#x110000; &#xD800; \u{1F600}")
})

test("XML 1.0 非法码点透传原文，不进入解析后的 name", () => {
  const xml = `<?xml version="1.0"?><d:multistatus xmlns:d="DAV:">
<d:response><d:href>/dav/invalid.txt</d:href>
<d:propstat><d:prop><d:displayname>invalid &#0; &#xFFFE; &#xFFFF; &#x1; &#x9;ok&#x9;</d:displayname></d:prop>
<d:status>HTTP/1.1 200 OK</d:status></d:propstat></d:response>
</d:multistatus>`
  const { items } = parseMultistatusXml(xml, "/dav")
  assert.equal(items.length, 1)
  // NUL、#xFFFE/#xFFFF 非字符、其它控制字符透传原文；#x9/#xA/#xD 是 XML 1.0 合法 Char，正常解码为 \t
  assert.equal(items[0].name, "invalid &#0; &#xFFFE; &#xFFFF; &#x1; \tok\t")
})
