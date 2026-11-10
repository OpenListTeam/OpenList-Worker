// Loaded by the local PDF.js HTML entry, before its generic viewer initializes.
// Never put a signed file URL in the iframe's location or persist it in settings.
const origin = location.origin
const query = new URLSearchParams(location.search)
const send = (type) => parent.postMessage({ type }, origin)
const configure = (event) => {
  if (event.detail?.source !== window) return
  window.PDFViewerApplicationOptions.setAll({
    defaultUrl: "",
    disablePreferences: true,
    disableHistory: true,
    disableRange: false,
    disableStream: true,
    disableAutoFetch: true,
    isEvalSupported: false,
    enableScripting: false,
    enableAltTextModelDownload: false,
    localeProperties: { lang: query.get("locale") || "en-US" },
    viewerCssTheme: query.get("theme") === "dark" ? 2 : 1,
  })
}
parent.document.addEventListener("webviewerloaded", configure)
const cleanup = () =>
  parent.document.removeEventListener("webviewerloaded", configure)
// The parent outlives the iframe: release its listener even if navigation
// cancels the module fetch before the viewer finishes booting.
window.addEventListener("pagehide", cleanup, { once: true })
try {
  // Reopened documents read their earlier ranges from the browser's cache.
  // Loaded alongside the viewer; without it only the speed-up is lost.
  const loadingRangeCache = import("./openlist-cache.mjs")
    .then(({ installPdfRangeCache }) =>
      installPdfRangeCache(window, {
        onStale: () => send("openlist:pdf:stale"),
      }),
    )
    .catch(() => null)
  const { PDFViewerApplication: app } = await import("./viewer.mjs")
  await app.initializedPromise
  cleanup()
  const { installPdfPrintPreparation } = await import("./openlist-print.mjs")
  const printAfterOpen = query.get("openlistPrint") === "1"
  const cleanupPrint = installPdfPrintPreparation(app, window, {
    retryPages: printAfterOpen ? query.get("openlistPrintPages") : null,
  })
  window.addEventListener("pagehide", cleanupPrint, { once: true })
  if (printAfterOpen) {
    const viewerUrl = new URL(location.href)
    viewerUrl.searchParams.delete("openlistPrint")
    viewerUrl.searchParams.delete("openlistPrintPages")
    history.replaceState(null, "", viewerUrl.href)
  }
  const rangeCache = await loadingRangeCache
  let opened = false
  window.addEventListener("message", (event) => {
    if (event.origin !== origin || event.source !== parent) return
    if (event.data?.type === "openlist:pdf:theme") {
      document.documentElement.style.colorScheme =
        event.data.theme === "dark" ? "dark" : "light"
      return
    }
    if (
      opened ||
      event.data?.type !== "openlist:pdf:open" ||
      typeof event.data.url !== "string"
    )
      return
    let url
    try {
      url = new URL(event.data.url, origin)
    } catch {
      return
    }
    if (!["https:", "http:"].includes(url.protocol)) return
    opened = true
    // Keyed by the file identity the app supplies, never by the signed URL.
    rangeCache?.begin(url.href, event.data.cache)
    // Calling open directly supports CORS-enabled signed storage URLs; the
    // generic demo's ?file= origin restriction does not apply to this embed.
    app
      .open({ url: url.href, originalUrl: event.data.filename || url.href })
      .then(async () => {
        if (!printAfterOpen) return
        await app.pdfViewer.pagesPromise
        await app.triggerPrinting()
      })
      .catch(() => send("openlist:pdf:error"))
  })
  send("openlist:pdf:ready")
} catch {
  cleanup()
  send("openlist:pdf:error")
}
