import assert from "node:assert/strict"
import fs from "node:fs"
import http from "node:http"
import path from "node:path"
import { after, before, test } from "node:test"
import { PDF_VIEWER_PATH } from "../fetch-pdf-viewer.mjs"

// Reopening a document must be served from the browser's persistent cache.
// The deployed viewer, a real Chromium and real Range responses are used; the
// file is same-origin, like the Worker's /p proxy, and is never intercepted.
const { chromium } = await import(
  process.env.PDF_TEST_PLAYWRIGHT_MODULE || "playwright"
)
const dist = path.resolve(process.env.PDF_TEST_DIST || "dist")
const CHUNK = 65536

function fixture(pages, label) {
  let source = "%PDF-1.7\n",
    offsets = [0]
  const object = (id, value) => {
    offsets[id] = Buffer.byteLength(source)
    source += `${id} 0 obj\n${value}\nendobj\n`
  }
  object(1, "<< /Type /Catalog /Pages 2 0 R >>")
  object(
    2,
    `<< /Type /Pages /Count ${pages} /Kids [${Array.from({ length: pages }, (_, i) => `${4 + i * 2} 0 R`).join(" ")}] >>`,
  )
  object(3, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>")
  for (let page = 0; page < pages; page++) {
    const id = 4 + page * 2
    object(
      id,
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 300] /Resources << /Font << /F1 3 0 R >> >> /Contents ${id + 1} 0 R >>`,
    )
    const content = `BT /F1 12 Tf 20 250 Td (${label} page ${page + 1}) Tj ET\n`
    object(
      id + 1,
      `<< /Length ${Buffer.byteLength(content)} >>\nstream\n${content}endstream`,
    )
    // Spread the pages over many 64 KiB ranges without large images.
    if (pages > 1) source += `%${"padding".repeat(19000)}\n`
  }
  const xref = Buffer.byteLength(source)
  source += `xref\n0 ${offsets.length}\n0000000000 65535 f \n`
  for (const offset of offsets.slice(1))
    source += `${String(offset).padStart(10, "0")} 00000 n \n`
  source += `trailer\n<< /Size ${offsets.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`
  return Buffer.from(source)
}

const files = new Map()
const requests = []
const mime = {
  ".html": "text/html",
  ".mjs": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".ftl": "text/plain",
  ".wasm": "application/wasm",
}
const server = http.createServer((req, res) => {
  const url = new URL(req.url, "http://localhost")
  if (url.pathname === "/test.html") {
    res.setHeader("Content-Type", "text/html")
    res.end(`<!doctype html><iframe id="pdf" style="width:100vw;height:100vh;border:0" src="/${PDF_VIEWER_PATH}/web/viewer.html?locale=en-US&theme=light"></iframe><script>
const query = new URLSearchParams(location.search), frame = document.getElementById("pdf")
window.messages = []
addEventListener("message", (event) => {
  if (event.origin !== location.origin || event.source !== frame.contentWindow) return
  messages.push(event.data.type)
  if (event.data.type !== "openlist:pdf:ready") return
  const cache = query.has("key") ? { key: query.get("key"), size: Number(query.get("size")) } : undefined
  frame.contentWindow.postMessage({ type: "openlist:pdf:open", url: query.get("file"), filename: "cache-test.pdf", cache }, location.origin)
})
</script>`)
    return
  }
  const file = files.get(url.pathname)
  if (file) {
    const match = /^bytes=(\d+)-(\d+)$/.exec(req.headers.range || "")
    assert.ok(!req.headers.range || match, "single byte range expected")
    const begin = match ? Number(match[1]) : 0
    const end = match
      ? Math.min(Number(match[2]), file.body.length - 1)
      : file.body.length - 1
    requests.push({
      path: url.pathname,
      sign: url.searchParams.get("sign"),
      range: req.headers.range,
    })
    res.statusCode = match ? 206 : 200
    res.setHeader("Content-Type", "application/pdf")
    res.setHeader("Content-Length", end - begin + 1)
    res.setHeader("Accept-Ranges", "bytes")
    res.setHeader("Cache-Control", "private, no-store")
    res.setHeader("ETag", file.etag)
    if (match)
      res.setHeader(
        "Content-Range",
        `bytes ${begin}-${end}/${file.body.length}`,
      )
    res.end(file.body.subarray(begin, end + 1))
    return
  }
  const asset = path.join(dist, url.pathname)
  if (
    !asset.startsWith(`${dist}${path.sep}`) ||
    !fs.existsSync(asset) ||
    !fs.statSync(asset).isFile()
  ) {
    res.writeHead(404).end()
    return
  }
  res.setHeader(
    "Content-Type",
    mime[path.extname(asset)] || "application/octet-stream",
  )
  fs.createReadStream(asset).pipe(res)
})

let browser, page, origin
const errors = []
before(async () => {
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve))
  origin = `http://127.0.0.1:${server.address().port}`
  browser = await chromium.launch({
    ...(process.env.PDF_BROWSER_EXECUTABLE
      ? { executablePath: process.env.PDF_BROWSER_EXECUTABLE }
      : {}),
    args: ["--no-sandbox"],
  })
  page = await browser.newPage({ viewport: { width: 1000, height: 700 } })
  page.on("pageerror", (error) => errors.push(error.message))
})
after(async () => {
  await browser?.close()
  await new Promise((resolve) => {
    server.close(resolve)
    server.closeAllConnections()
  })
})

const viewer = async () =>
  (await page.locator("iframe").elementHandle()).contentFrame()
const rendered = (frame, number) =>
  frame.waitForFunction(
    (index) =>
      window.PDFViewerApplication?.pdfViewer?.getPageView(index)
        ?.renderingState === 3,
    number - 1,
    { timeout: 15000 },
  )
const pageText = (frame, number) =>
  frame.evaluate(async (pageNumber) => {
    const pdfPage =
      await window.PDFViewerApplication.pdfDocument.getPage(pageNumber)
    const content = await pdfPage.getTextContent()
    return content.items.map((item) => item.str).join("")
  }, number)
const stored = (frame, key, size) =>
  frame.evaluate(
    async ([key, size]) => {
      const { createDocumentCache } = await import("./openlist-cache.mjs")
      return (await createDocumentCache(window).lookup(key, size)).count
    },
    [key, size],
  )
// Writes follow the reads asynchronously; wait until the chunk count is stable.
async function settled(frame, key, size) {
  let count = -1,
    quiet = 0
  while (quiet < 4) {
    await page.waitForTimeout(100)
    const next = await stored(frame, key, size)
    quiet = next === count ? quiet + 1 : 0
    count = next
  }
  return count
}
async function open(name, { key, size, sign = "first" } = {}) {
  // Let the previous viewer's requests end before counting the next ones.
  await page.goto("about:blank")
  requests.length = 0
  const query = new URLSearchParams({ file: `/p/${name}?sign=${sign}` })
  if (key) {
    query.set("key", key)
    query.set("size", String(size))
  }
  await page.goto(`${origin}/test.html?${query}`)
  await page.waitForSelector("iframe")
  const frame = await viewer()
  // PDF.js may restore the page viewed last; wait for the visible one.
  await frame.waitForFunction(
    () => {
      const viewer = window.PDFViewerApplication?.pdfViewer
      return (
        viewer?.getPageView(viewer.currentPageNumber - 1)?.renderingState === 3
      )
    },
    null,
    { timeout: 15000 },
  )
  return frame
}

test("a reopened PDF renders from the persistent cache without any request", async () => {
  const body = fixture(16, "Persistent")
  files.set("/p/large.pdf", { body, etag: '"v1"' })
  const key = "1|/docs/large.pdf|v1",
    size = body.length

  let frame = await open("large.pdf", { key, size })
  assert.equal(await pageText(frame, 1), "Persistent page 1")
  const first = requests.length
  assert.ok(first > 1, "the first open reads its ranges from the network")
  assert.ok(requests.some((request) => request.range))
  const partial = await settled(frame, key, size)
  assert.ok(partial > 0 && partial < Math.ceil(size / CHUNK))

  // A new page load and a new signature: nothing in memory, same file identity.
  frame = await open("large.pdf", { key, size, sign: "second" })
  assert.equal(
    await frame.evaluate(() => window.PDFViewerApplication.pagesCount),
    16,
  )
  assert.equal(await pageText(frame, 1), "Persistent page 1")
  assert.deepEqual(
    requests,
    [],
    "the reopened document must not hit the network",
  )

  // Unread pages still come from the network, exactly once.
  await frame.evaluate(
    () => (window.PDFViewerApplication.pdfViewer.currentPageNumber = 16),
  )
  await rendered(frame, 16)
  assert.equal(await pageText(frame, 16), "Persistent page 16")
  assert.ok(requests.length > 0)
  assert.ok(
    requests.every((request) => request.range && request.sign === "second"),
  )
  assert.ok((await settled(frame, key, size)) > partial)

  frame = await open("large.pdf", { key, size, sign: "third" })
  await frame.evaluate(
    () => (window.PDFViewerApplication.pdfViewer.currentPageNumber = 16),
  )
  await rendered(frame, 16)
  assert.equal(await pageText(frame, 16), "Persistent page 16")
  assert.deepEqual(requests, [])
  assert.deepEqual(errors, [])
})

test("a file below the Range threshold is cached from its single download", async () => {
  const body = fixture(1, "Small")
  assert.ok(body.length < 2 * CHUNK)
  files.set("/p/small.pdf", { body, etag: '"s1"' })
  const key = "1|/docs/small.pdf|s1",
    size = body.length
  let frame = await open("small.pdf", { key, size })
  assert.equal(await pageText(frame, 1), "Small page 1")
  assert.deepEqual(
    requests.map((request) => request.range),
    [undefined],
  )
  assert.equal(await settled(frame, key, size), 1)
  frame = await open("small.pdf", { key, size, sign: "second" })
  assert.equal(await pageText(frame, 1), "Small page 1")
  assert.deepEqual(requests, [])
  assert.deepEqual(errors, [])
})

test("a new size or modification time never reuses the previous bytes", async () => {
  const body = fixture(16, "Replaced")
  files.set("/p/large.pdf", { body, etag: '"v2"' })
  const frame = await open("large.pdf", {
    key: "1|/docs/large.pdf|v2",
    size: body.length,
  })
  assert.equal(await pageText(frame, 1), "Replaced page 1")
  assert.ok(requests.length > 1)
  assert.equal(requests[0].range, undefined)
  // Another account must not read this account's cached copy either.
  await open("large.pdf", { key: "2|/docs/large.pdf|v2", size: body.length })
  assert.ok(requests.length > 1)
  assert.deepEqual(errors, [])
})

test("content that changed behind an unchanged listing is dropped and reported", async () => {
  const body = fixture(16, "Original")
  files.set("/p/stale.pdf", { body, etag: '"a"' })
  const key = "1|/docs/stale.pdf|same",
    size = body.length
  let frame = await open("stale.pdf", { key, size })
  assert.ok((await settled(frame, key, size)) > 0)

  const replaced = fixture(16, "Rewrite!")
  assert.equal(replaced.length, size)
  files.set("/p/stale.pdf", { body: replaced, etag: '"b"' })
  frame = await open("stale.pdf", { key, size })
  assert.deepEqual(requests, [])
  await frame.evaluate(
    () => (window.PDFViewerApplication.pdfViewer.currentPageNumber = 16),
  )
  await page.waitForFunction(() =>
    window.messages.includes("openlist:pdf:stale"),
  )
  assert.equal(await stored(frame, key, size), 0)

  // The app reloads the viewer without the cache; the next open starts clean.
  frame = await open("stale.pdf", { key, size })
  assert.equal(await pageText(frame, 1), "Rewrite! page 1")
  assert.equal(requests[0].range, undefined)
  assert.ok((await settled(frame, key, size)) > 0)
  assert.ok(
    !(await page.evaluate(() => window.messages)).includes(
      "openlist:pdf:stale",
    ),
  )
})

test("a listing that disagrees with the served size disables caching", async () => {
  const body = fixture(16, "Mismatch")
  files.set("/p/mismatch.pdf", { body, etag: '"m"' })
  const key = "1|/docs/mismatch.pdf|m",
    size = body.length + 1
  const frame = await open("mismatch.pdf", { key, size })
  assert.equal(await pageText(frame, 1), "Mismatch page 1")
  assert.equal(await settled(frame, key, size), 0)
  await open("mismatch.pdf", { key, size })
  assert.ok(requests.length > 1)
})

test("documents without an identity keep the uncached behaviour", async () => {
  const body = fixture(16, "Plain")
  files.set("/p/plain.pdf", { body, etag: '"p"' })
  for (let attempt = 0; attempt < 2; attempt++) {
    const frame = await open("plain.pdf")
    assert.equal(await pageText(frame, 1), "Plain page 1")
    assert.ok(requests.length > 1)
    assert.equal(requests[0].range, undefined)
  }
})

test("whole documents round-trip and the least recently used are evicted", async () => {
  const frame = await open("plain.pdf")
  const result = await frame.evaluate(async (chunk) => {
    const { createDocumentCache, readDocument, storeDocument, clearDocuments } =
      await import("./openlist-cache.mjs")
    const bytes = (length, seed) =>
      Uint8Array.from({ length }, (_, index) => (index * 31 + seed) % 251)
    const same = async (blob, expected) => {
      const actual = new Uint8Array(await blob.arrayBuffer())
      return (
        actual.length === expected.length &&
        actual.every((value, index) => value === expected[index])
      )
    }
    await clearDocuments()
    let clock = 1000
    const cache = createDocumentCache(window, {
      now: () => clock,
      limits: { maxBytes: 5 * chunk, maxAge: 5000 },
    })
    const a = bytes(chunk + 100, 1),
      b = bytes(2 * chunk, 2),
      c = bytes(chunk * 2 - 1, 3)
    const out = {}
    out.storedA = await cache.storeDocument("a", a.length, new Blob([a]))
    clock += 10
    out.storedB = await cache.storeDocument("b", b.length, new Blob([b]))
    out.readA = await same(await cache.readDocument("a", a.length), a)
    out.readB = await same(await cache.readDocument("b", b.length), b)
    out.otherSize = await cache.readDocument("b", b.length - 1)
    out.afterOtherSize = await cache.readDocument("b", b.length)
    out.wrongSize = await cache.storeDocument("d", 10, new Blob([a]))
    // "a" was read last before "b" was dropped; adding "c" evicts nothing else
    // until the total exceeds five chunks.
    clock += 10
    out.storedB2 = await cache.storeDocument("b", b.length, new Blob([b]))
    clock += 10
    out.touchA = !!(await cache.readDocument("a", a.length))
    clock += 10
    out.storedC = await cache.storeDocument("c", c.length, new Blob([c]))
    out.evictedB = (await cache.readDocument("b", b.length)) === null
    out.keptA = await same(await cache.readDocument("a", a.length), a)
    out.keptC = await same(await cache.readDocument("c", c.length), c)
    clock += 6000
    out.expired = await cache.prune()
    out.afterExpiry = await cache.readDocument("c", c.length)
    out.sharedStore = await storeDocument("s", a.length, new Blob([a]))
    out.sharedRead = await same(await readDocument("s", a.length), a)
    await clearDocuments()
    out.cleared = await readDocument("s", a.length)
    return out
  }, CHUNK)
  assert.deepEqual(result, {
    storedA: true,
    storedB: true,
    readA: true,
    readB: true,
    otherSize: null,
    afterOtherSize: null,
    wrongSize: false,
    storedB2: true,
    touchA: true,
    storedC: true,
    evictedB: true,
    keptA: true,
    keptC: true,
    expired: ["a", "c"],
    afterExpiry: null,
    sharedStore: true,
    sharedRead: true,
    cleared: null,
  })
})
