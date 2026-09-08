export function isCloud189DirectDownload(
  path: string,
  driver: string,
): boolean {
  const normalized = driver.toLowerCase().replace(/[^a-z0-9]/g, "")
  return (
    /^\/(?:api\/)?d\//.test(path) &&
    ["189", "189cloud", "cloud189", "ctyun", "189pan"].includes(normalized)
  )
}

// Match upstream redirect headers: signed CDN links must not be cached.
export function directDownloadResponse(url: string): Response {
  return new Response(null, {
    status: 302,
    headers: {
      Location: url,
      "Referrer-Policy": "no-referrer",
      "Cache-Control": "max-age=0, no-cache, no-store, must-revalidate",
    },
  })
}
