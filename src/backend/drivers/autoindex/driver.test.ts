import test from "node:test"
import assert from "node:assert/strict"
import { parseAutoIndexHTML, parseSize, parseTime } from "./util"
import { AutoIndexDriver, normalizeAutoIndexAddition } from "./driver"

test("parseSize supports Go-aligned units", () => {
  assert.equal(parseSize("1K"), 1024)
  assert.equal(parseSize("1KB"), 1024)
  assert.equal(parseSize("1KiB"), 1024)
  assert.equal(parseSize("2M"), 2 * 1024 * 1024)
  assert.equal(parseSize("2MB"), 2 * 1024 * 1024)
  assert.equal(parseSize("2MiB"), 2 * 1024 * 1024)
  assert.equal(parseSize("3G"), 3 * 1024 * 1024 * 1024)
  assert.equal(parseSize("3GiB"), 3 * 1024 * 1024 * 1024)
  assert.equal(parseSize("1.5K"), Math.round(1.5 * 1024))
  assert.equal(parseSize("123"), 123)
})

test("parseSize handles empty / dash / invalid", () => {
  assert.equal(parseSize(""), 0)
  assert.equal(parseSize("-"), 0)
  assert.equal(parseSize("  -  "), 0)
  assert.equal(parseSize("abc"), 0)
})

test("parseTime parses ISO-like datetime", () => {
  const iso = parseTime("2026-01-02 10:30", "")
  // toISOString 输出 UTC，本地时区差异下仅断言日期部分稳定
  assert.match(iso, /^2026-01-02T\d{2}:\d{2}/)
})

test("parseAutoIndexHTML extracts files, dirs, size and modified", () => {
  const html = `<html><body><pre>
<a href="../">../</a>
<a href="movie.mp4">movie.mp4</a> 123M
<a href="subdir/">subdir/</a>
</pre></body></html>`

  const nodes = parseAutoIndexHTML(
    html,
    "//pre/a",
    "@href",
    "string(following-sibling::text()[1])",
    "string(following-sibling::text()[2])",
    [".."],
  )

  assert.equal(nodes.length, 2)
  assert.equal(nodes[0].name, "movie.mp4")
  assert.equal(nodes[0].isDir, false)
  assert.match(nodes[0].size ?? "", /123M/)

  assert.equal(nodes[1].name, "subdir")
  assert.equal(nodes[1].isDir, true)
})

test("normalizeAutoIndexAddition fills defaults", () => {
  const a = normalizeAutoIndexAddition({ url: "example.com/files" })
  assert.equal(a.url, "https://example.com/files/")
  assert.equal(a.item_xpath, "//pre/a")
  assert.equal(a.name_xpath, "@href")
})

test("AutoIndexDriver instantiation", () => {
  const driver = new AutoIndexDriver({ url: "https://example.com/files/" })
  assert.ok(driver)
})
