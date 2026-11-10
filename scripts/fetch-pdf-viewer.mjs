import { createHash } from "node:crypto"
import { execFileSync } from "node:child_process"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { fileURLToPath } from "node:url"

// Keep the frontend URLs in sync with this revision: the viewer entry in
// previews/pdf.tsx and the cache module in utils/document-cache.ts (both set by
// document-cache.patch; frontend-document-cache.test.mjs checks them).
// Bump the revision whenever the viewer/bridge changes, so caches never mix.
export const PDF_VIEWER_PATH = "static/pdfjs/6.3.289-openlist6"
const ARCHIVE_URL =
  "https://github.com/mozilla/pdf.js/releases/download/v6.3.289/pdfjs-6.3.289-legacy-dist.zip"
const ARCHIVE_SHA256 =
  "51683fac4aff7dd31ed91e9ab735a2098a78d50899d1ec529aed6dc8aa19400d"
const scripts = path.dirname(fileURLToPath(import.meta.url))

export function patchPdfRangeFetch(source) {
  // Chromium can serialize same-URL Range requests behind its HTTP cache even
  // when the response is no-store. Bypass that cache on the range fetch itself;
  // keep the initial full reader and PDF.js's in-memory chunk cache unchanged.
  const before = `function fetchUrl(url, headers, withCredentials, abortController) {
  return fetch(url, {
    method: "GET",
    headers,
    signal: abortController.signal,
    mode: "cors",
    credentials: withCredentials ? "include" : "same-origin",
    redirect: "follow"
  });
}`
  if (source.split(before).length !== 2)
    throw new Error("Unexpected PDF.js range fetch code")
  const after = before.replace(
    '    method: "GET",',
    '    ...(headers.has("Range") ? { cache: "no-store" } : {}),\n    method: "GET",',
  )
  return (
    "/* OpenList customization: bypass browser HTTP cache for PDF ranges. */\n" +
    source.replace(before, after)
  )
}

export function patchPdfRangeCache(source) {
  // Send both document requests (the initial one and every range) through the
  // optional hook installed by openlist-cache.mjs. Without a hook, or for any
  // other URL, the request above is issued exactly as before.
  const call =
    "fetchUrl(url, headers, withCredentials, this._abortController).then("
  const helper = "\nfunction fetchUrl("
  if (source.split(call).length !== 3 || source.split(helper).length !== 2)
    throw new Error("Unexpected PDF.js document fetch code")
  return (
    "/* OpenList customization: persistent document range cache hook. */\n" +
    source
      .replaceAll(call, `openListFetchUrl${call.slice("fetchUrl".length)}`)
      .replace(
        helper,
        `
function openListFetchUrl(url, headers, withCredentials, abortController) {
  const request = () => fetchUrl(url, headers, withCredentials, abortController);
  const cache = globalThis.openListPdfFetch;
  return typeof cache === "function" ? cache(url, headers, request) : request();
}${helper}`,
      )
  )
}

export function patchPdfPageTree(source) {
  // PDF.js validates the last page before resolving document loading. In a
  // nested /Pages node, the original walk fetches every preceding leaf in
  // sequence. Prefetch those required dictionaries as it already does at the
  // root; keep first-page/arbitrary-page reads lazy and preserve validation.
  const before = `if (currentNode === this.toplevelPagesDict && lastKid instanceof Ref && !pageDictCache.has(lastKid)) {
          pageDictCache.put(lastKid, xref.fetchAsync(lastKid));
        }`
  const after = `if ((currentNode === this.toplevelPagesDict || (Number.isInteger(count) && count > 0 && currentPageIndex + count === pageIndex + 1)) && lastKid instanceof Ref && !pageDictCache.has(lastKid)) {
          const pagePromise = xref.fetchAsync(lastKid);
          // Navigation or a malformed sibling can stop the walk before await.
          // Retain rejection for the actual reader without an unhandled promise.
          pagePromise.catch(() => {});
          pageDictCache.put(lastKid, pagePromise);
        }`
  if (source.split(before).length !== 2)
    throw new Error("Unexpected PDF.js page-tree prefetch code")
  return (
    "/* OpenList customization: parallelize required nested page-tree reads. */\n" +
    source.replace(before, after)
  )
}

export function patchPdfPrintRange(source) {
  // Keep the stock annotation handling, progress, cancellation and native print
  // service. Restrict readiness, page sizes and rendering to the chosen pages.
  const replacements = [
    [
      "if (!this.pdfViewer.pageViewsReady) {",
      "if (!(this.pdfViewer.openListPrintPages ? this.pdfViewer.openListPrintPages.every(pageNumber => this.pdfViewer.getPageView(pageNumber - 1)?.pdfPage) : this.pdfViewer.pageViewsReady)) {",
    ],
    [
      "getPagesOverview() {\n    let initialOrientation;\n    return this._pages.map(pageView => {",
      "getPagesOverview() {\n    let initialOrientation;\n    const pageNumbers = this.openListPrintPages;\n    const pages = pageNumbers ? pageNumbers.map(pageNumber => this._pages[pageNumber - 1]) : this._pages;\n    return pages.map((pageView, index) => {\n      const pageNumber = pageNumbers?.[index] ?? index + 1;",
    ],
    [
      "width: viewport.height,\n          height: viewport.width,",
      "pageNumber,\n          width: viewport.height,\n          height: viewport.width,",
    ],
    [
      "width: viewport.width,\n        height: viewport.height,\n        rotation: viewport.rotation",
      "pageNumber,\n        width: viewport.width,\n        height: viewport.height,\n        rotation: viewport.rotation",
    ],
    [
      "renderPage(this, this.pdfDocument, index + 1, this.pagesOverview[index],",
      "renderPage(this, this.pdfDocument, this.pagesOverview[index].pageNumber ?? index + 1, this.pagesOverview[index],",
    ],
    [
      "function getXfaHtmlForPrinting(printContainer, pdfDocument) {",
      "function getXfaHtmlForPrinting(printContainer, pdfDocument, pageNumbers = null) {",
    ],
    [
      "for (const xfaPage of xfaHtml.children) {",
      "for (const xfaPage of pageNumbers ? pageNumbers.map(pageNumber => xfaHtml.children[pageNumber - 1]) : xfaHtml.children) {",
    ],
    [
      "getXfaHtmlForPrinting(this.printContainer, this.pdfDocument);",
      "getXfaHtmlForPrinting(this.printContainer, this.pdfDocument, this.pagesOverview.map(page => page.pageNumber));",
    ],
  ]
  for (const [before, after] of replacements) {
    if (source.split(before).length !== 2)
      throw new Error("Unexpected PDF.js print range code")
    source = source.replace(before, after)
  }
  return (
    "/* OpenList customization: print only selected PDF pages. */\n" + source
  )
}

export function installPdfViewer(dist, archive) {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "openlist-pdfjs-"))
  try {
    const zip = archive || path.join(temp, "pdfjs.zip")
    if (!archive)
      execFileSync("curl", ["-fL", "--retry", "3", "-o", zip, ARCHIVE_URL], {
        stdio: "inherit",
      })
    const digest = createHash("sha256")
      .update(fs.readFileSync(zip))
      .digest("hex")
    if (digest !== ARCHIVE_SHA256)
      throw new Error("PDF.js release checksum mismatch")
    const extracted = path.join(temp, "release")
    execFileSync("unzip", ["-q", zip, "-d", extracted])
    const worker = path.join(extracted, "build/pdf.worker.mjs")
    fs.writeFileSync(worker, patchPdfPageTree(fs.readFileSync(worker, "utf8")))
    const api = path.join(extracted, "build/pdf.mjs")
    fs.writeFileSync(
      api,
      patchPdfRangeCache(patchPdfRangeFetch(fs.readFileSync(api, "utf8"))),
    )
    const viewer = path.join(extracted, "web/viewer.mjs")
    fs.writeFileSync(
      viewer,
      patchPdfPrintRange(fs.readFileSync(viewer, "utf8")),
    )
    const entry = path.join(extracted, "web/viewer.html")
    const html = fs.readFileSync(entry, "utf8")
    if (!html.includes('<script src="viewer.mjs" type="module"></script>'))
      throw new Error("Unexpected PDF.js viewer entry")
    fs.writeFileSync(
      entry,
      html
        .replace("<html ", '<html data-openlist-pdf-viewer="range" ')
        .replace(
          '<script src="viewer.mjs" type="module"></script>',
          '<script src="openlist.mjs" type="module"></script>',
        ),
    )
    fs.copyFileSync(
      path.join(scripts, "pdf-viewer-bridge.mjs"),
      path.join(extracted, "web/openlist.mjs"),
    )
    fs.copyFileSync(
      path.join(scripts, "pdf-print-preparation.mjs"),
      path.join(extracted, "web/openlist-print.mjs"),
    )
    fs.copyFileSync(
      path.join(scripts, "pdf-range-cache.mjs"),
      path.join(extracted, "web/openlist-cache.mjs"),
    )
    // Retain LICENSE, fonts, CMaps, WASM and locales. Demo PDFs/maps aren't used.
    function prune(dir) {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name)
        if (entry.isDirectory()) prune(full)
        else if (entry.name.endsWith(".map") || entry.name.endsWith(".pdf"))
          fs.rmSync(full)
      }
    }
    prune(extracted)
    const target = path.join(dist, PDF_VIEWER_PATH)
    fs.rmSync(target, { recursive: true, force: true })
    fs.mkdirSync(path.dirname(target), { recursive: true })
    fs.cpSync(extracted, target, { recursive: true })
    console.log(`  PDF.js range viewer ready: ${PDF_VIEWER_PATH}`)
  } finally {
    fs.rmSync(temp, { recursive: true, force: true })
  }
}
