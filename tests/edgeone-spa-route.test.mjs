import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import { test } from "node:test"
import { middleware } from "../middleware.js"

const SPA_ROUTE = "/__openlist_spa__"

function run(pathname, { accept = "text/html", method = "GET" } = {}) {
  let target
  const result = middleware({
    request: new Request(`https://example.com${pathname}`, {
      method,
      headers: { Accept: accept },
    }),
    next: () => "next",
    rewrite: (value) => {
      target = value
      return "rewrite"
    },
  })
  return { result, target }
}

test("EdgeOne sends HTML navigation through the dynamic SPA route", () => {
  for (const pathname of ["/", "/index.html", "/add", "/@manage/storage"]) {
    assert.deepEqual(run(pathname), { result: "rewrite", target: SPA_ROUTE })
  }
})

test("EdgeOne leaves backend, asset, and non-navigation requests alone", () => {
  for (const pathname of [
    "/api/public/settings",
    "/d/example.txt",
    "/p/example.txt",
    "/sd/example.txt",
    "/dav/example.txt",
    "/s3/example.txt",
    "/kv-list",
    "/health",
  ]) {
    assert.deepEqual(run(pathname), { result: "next", target: undefined })
  }
  assert.deepEqual(run("/assets/app.js", { accept: "*/*" }), {
    result: "next",
    target: undefined,
  })
  assert.deepEqual(run("/", { method: "POST" }), {
    result: "next",
    target: undefined,
  })
})

test("EdgeOne keeps the platform SPA fallback after filesystem and functions", async () => {
  const config = JSON.parse(
    await readFile(new URL("../edgeone.json", import.meta.url)),
  )
  assert.equal(config.rewrites[0].destination, "/index.html")
})
