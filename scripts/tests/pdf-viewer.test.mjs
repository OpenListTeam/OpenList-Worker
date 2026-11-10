import assert from "node:assert/strict"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import vm from "node:vm"
import { test } from "node:test"
import {
  installPdfViewer,
  PDF_VIEWER_PATH,
  patchPdfPageTree,
  patchPdfRangeCache,
} from "../fetch-pdf-viewer.mjs"

const source = fs.readFileSync(
  new URL("../pdf-viewer-bridge.mjs", import.meta.url),
  "utf8",
)

async function harness({
  failBoot = false,
  failOpen = false,
  cancelBoot = false,
  autoPrint = false,
  retryPages = null,
  failCache = false,
} = {}) {
  const documentEvents = new Map(),
    messages = [],
    opens = [],
    options = {}
  let receive
  let pagehide
  let printInstalled = 0
  let prints = 0
  const historyUrls = []
  let installedRetryPages
  const cached = []
  let stale
  const document = { documentElement: { style: {} } }
  const parent = {
    document: {
      addEventListener: (type, fn) => documentEvents.set(type, fn),
      removeEventListener: (type, fn) => {
        if (documentEvents.get(type) === fn) documentEvents.delete(type)
      },
    },
    postMessage: (data, origin) => messages.push({ ...data, origin }),
  }
  const window = {
    PDFViewerApplicationOptions: {
      setAll: (values) => Object.assign(options, values),
    },
    addEventListener: (type, fn) => {
      if (type === "message") receive = fn
      if (type === "pagehide") pagehide = fn
    },
  }
  const app = {
    initializedPromise: Promise.resolve(),
    pdfViewer: { pagesPromise: Promise.resolve() },
    triggerPrinting: async () => prints++,
    open: async (args) => {
      opens.push(args)
      if (failOpen) throw new Error("bad PDF")
    },
  }
  const context = vm.createContext({
    parent,
    window,
    document,
    location: {
      origin: "https://drive.example",
      search: `?locale=zh-CN&theme=dark${autoPrint ? `&openlistPrint=1${retryPages ? `&openlistPrintPages=${encodeURIComponent(retryPages)}` : ""}` : ""}`,
      href: `https://drive.example/static/pdfjs/web/viewer.html?locale=zh-CN&theme=dark&openlistPrint=1${retryPages ? `&openlistPrintPages=${encodeURIComponent(retryPages)}` : ""}`,
    },
    history: { replaceState: (_state, _title, url) => historyUrls.push(url) },
    URL,
    URLSearchParams,
    loadPrint: async () => ({
      installPdfPrintPreparation: (viewer, target, options) => {
        assert.equal(target, window)
        installedRetryPages = options.retryPages
        assert.equal(viewer, app)
        printInstalled++
        return () => printInstalled--
      },
    }),
    loadCache: async () => {
      if (failCache) throw new Error("missing cache module")
      return {
        installPdfRangeCache: (target, hooks) => {
          assert.equal(target, window)
          stale = hooks.onStale
          return { begin: (url, identity) => cached.push({ url, identity }) }
        },
      }
    },
    loadViewer: async () => {
      if (cancelBoot) {
        pagehide()
        assert.equal(documentEvents.size, 0)
        throw new Error("iframe navigation cancelled boot")
      }
      if (failBoot) throw new Error("missing module")
      const configure = documentEvents.get("webviewerloaded")
      configure({ detail: { source: {} } })
      assert.deepEqual(options, {})
      configure({ detail: { source: window } })
      // These must be set before PDF.js starts its document/network services.
      assert.equal(options.disableAutoFetch, true)
      assert.equal(options.disableStream, true)
      assert.equal(options.disableRange, false)
      assert.equal(options.disablePreferences, true)
      assert.equal(options.defaultUrl, "")
      return { PDFViewerApplication: app }
    },
  })
  await vm.runInContext(
    `(async () => {${source
      .replace('import("./viewer.mjs")', "loadViewer()")
      .replace('import("./openlist-print.mjs")', "loadPrint()")
      .replace('import("./openlist-cache.mjs")', "loadCache()")}})()`,
    context,
  )
  return {
    options,
    messages,
    opens,
    document,
    window,
    parent,
    documentEvents,
    printInstalled: () => printInstalled,
    pagehide: () => pagehide?.(),
    prints: () => prints,
    historyUrls,
    retryPages: () => installedRetryPages,
    cached,
    stale: () => stale(),
    message: async (
      data,
      origin = "https://drive.example",
      sender = parent,
    ) => {
      receive?.({ data, origin, source: sender })
      await new Promise(setImmediate)
    },
  }
}

test("viewer initializes lazy loading, locale and theme before accepting a file", async () => {
  const h = await harness()
  assert.equal(h.options.enableScripting, false)
  assert.equal(h.options.isEvalSupported, false)
  assert.equal(h.options.localeProperties.lang, "zh-CN")
  assert.equal(h.options.viewerCssTheme, 2)
  assert.equal(h.documentEvents.size, 0)
  assert.deepEqual(h.messages, [
    { type: "openlist:pdf:ready", origin: "https://drive.example" },
  ])
  assert.equal(h.opens.length, 0)
  assert.equal(h.printInstalled(), 1)
  h.pagehide()
  assert.equal(h.printInstalled(), 0)
})
test("retry consumes its one-shot print flag and prints only after a trusted open", async () => {
  const h = await harness({ autoPrint: true, retryPages: "5,7-9" })
  assert.equal(h.retryPages(), "5,7-9")
  assert.equal(h.historyUrls.length, 1)
  assert.equal(
    new URL(h.historyUrls[0]).searchParams.has("openlistPrint"),
    false,
  )
  assert.equal(
    new URL(h.historyUrls[0]).searchParams.has("openlistPrintPages"),
    false,
  )
  assert.equal(h.prints(), 0)
  await h.message(
    { type: "openlist:pdf:open", url: "/a.pdf?sign=secret" },
    "https://other.example",
  )
  assert.equal(h.prints(), 0)
  await h.message({ type: "openlist:pdf:open", url: "/a.pdf?sign=secret" })
  assert.equal(h.prints(), 1)
  await h.message({ type: "openlist:pdf:open", url: "/a.pdf?sign=secret" })
  assert.equal(h.prints(), 1)
  assert.ok(h.historyUrls.every((url) => !url.includes("secret")))
})
test("signed cross-origin storage URLs keep their full signature and file name", async () => {
  const h = await harness()
  const url =
    "https://b2.example/file/a%20b.pdf?Authorization=opaque%2Btoken&part=1#page=2"
  await h.message({ type: "openlist:pdf:open", url, filename: "a b.pdf" })
  assert.equal(h.opens[0].url, url)
  assert.equal(h.opens[0].originalUrl, "a b.pdf")
})
test("the file identity reaches the range cache with the exact opened URL", async () => {
  const h = await harness()
  const cache = { key: "1|/docs/a.pdf|4096|2026-01-01T00:00:00Z", size: 4096 }
  await h.message({
    type: "openlist:pdf:open",
    url: "/p/docs/a.pdf?sign=secret",
    cache,
  })
  assert.deepEqual(h.cached, [
    { url: "https://drive.example/p/docs/a.pdf?sign=secret", identity: cache },
  ])
  assert.equal(h.opens[0].url, h.cached[0].url)
  h.stale()
  assert.deepEqual(h.messages.at(-1), {
    type: "openlist:pdf:stale",
    origin: "https://drive.example",
  })
  assert.ok(h.messages.every((m) => !JSON.stringify(m).includes("secret")))
})
test("a missing cache module leaves the viewer fully usable", async () => {
  const h = await harness({ failCache: true })
  await h.message({ type: "openlist:pdf:open", url: "/a.pdf", cache: {} })
  assert.deepEqual(
    h.messages.map((message) => message.type),
    ["openlist:pdf:ready"],
  )
  assert.equal(h.opens.length, 1)
  assert.equal(h.cached.length, 0)
})
test("only the same-origin parent can open a document or change the theme", async () => {
  const h = await harness()
  for (const [origin, sender] of [
    ["https://other.example", h.parent],
    ["https://drive.example", {}],
  ]) {
    await h.message(
      { type: "openlist:pdf:open", url: "/a.pdf" },
      origin,
      sender,
    )
    await h.message(
      { type: "openlist:pdf:theme", theme: "light" },
      origin,
      sender,
    )
  }
  assert.equal(h.opens.length, 0)
  assert.equal(h.document.documentElement.style.colorScheme, undefined)
  await h.message({ type: "openlist:pdf:theme", theme: "light" })
  assert.equal(h.document.documentElement.style.colorScheme, "light")
  assert.equal(h.opens.length, 0)
})
test("malformed or executable URLs do not consume the one-document handshake", async () => {
  const h = await harness()
  for (const url of [
    null,
    5,
    "http://[",
    "javascript:alert(1)",
    "data:application/pdf,foo",
  ])
    await h.message({ type: "openlist:pdf:open", url })
  assert.equal(h.opens.length, 0)
  await h.message({ type: "openlist:pdf:open", url: "/d/a%20b.pdf?sign=123" })
  await h.message({ type: "openlist:pdf:open", url: "/other.pdf" })
  assert.equal(h.opens.length, 1)
  assert.equal(h.opens[0].url, "https://drive.example/d/a%20b.pdf?sign=123")
})
test("document and module failures notify the parent without exposing signed URLs", async () => {
  const boot = await harness({ failBoot: true })
  assert.equal(boot.documentEvents.size, 0)
  assert.deepEqual(
    boot.messages.map((message) => message.type),
    ["openlist:pdf:error"],
  )
  const file = await harness({ failOpen: true })
  await file.message({
    type: "openlist:pdf:open",
    url: "/broken.pdf?secret=123",
  })
  assert.deepEqual(
    file.messages.map((message) => message.type),
    ["openlist:pdf:ready", "openlist:pdf:error"],
  )
  assert.ok(
    file.messages.every(
      (message) => !JSON.stringify(message).includes("secret"),
    ),
  )
})
test("release checksum failures cannot replace an existing deployed viewer", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pdf-viewer-test-"))
  try {
    const archive = path.join(dir, "bad.zip"),
      dist = path.join(dir, "dist"),
      target = path.join(dist, PDF_VIEWER_PATH)
    fs.mkdirSync(target, { recursive: true })
    fs.writeFileSync(path.join(target, "existing"), "keep")
    fs.writeFileSync(archive, "not the official release")
    assert.throws(() => installPdfViewer(dist, archive), /checksum mismatch/)
    assert.equal(fs.readFileSync(path.join(target, "existing"), "utf8"), "keep")
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

test("navigation during boot releases the listener held by the parent", async () => {
  const h = await harness({ cancelBoot: true })
  assert.equal(h.documentEvents.size, 0)
  assert.equal(h.opens.length, 0)
})

test("page-tree optimization rejects changed or duplicated upstream code", () => {
  assert.throws(
    () => patchPdfPageTree("unrecognized worker"),
    /Unexpected PDF.js page-tree/,
  )
  const guard = `if (currentNode === this.toplevelPagesDict && lastKid instanceof Ref && !pageDictCache.has(lastKid)) {
          pageDictCache.put(lastKid, xref.fetchAsync(lastKid));
        }`
  assert.throws(
    () => patchPdfPageTree(guard + guard),
    /Unexpected PDF.js page-tree/,
  )
})

test("range-cache hook rejects changed or duplicated upstream code", () => {
  const call =
    "fetchUrl(url, headers, withCredentials, this._abortController).then("
  const source = `\nfunction fetchUrl(a) {}\n${call}x);\n${call}y);`
  const patched = patchPdfRangeCache(source)
  assert.equal(patched.split(`openListFetchUrl${call.slice(8)}`).length, 3)
  assert.equal(patched.split("\nfunction fetchUrl(").length, 2)
  for (const changed of [
    "unrecognized API",
    source + call,
    source.replace(call, ""),
    source + "\nfunction fetchUrl(b) {}",
  ])
    assert.throws(
      () => patchPdfRangeCache(changed),
      /Unexpected PDF.js document fetch/,
    )
})
