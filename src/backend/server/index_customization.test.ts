import assert from "node:assert/strict"
import { test } from "node:test"
import app, {
  EDGEONE_SPA_ROUTE,
  applyCustomizeToHtml,
  setSpaFallbackHtml,
} from "../index"
import { saveDb } from "../internal/model/db"

const template =
  "<!doctype html><html><head><!-- customize head --></head><body><!-- customize body --></body></html>"

const settings = [
  {
    key: "customize_head",
    value:
      '<meta data-value="$&"><!-- customize head --><!-- customize body -->',
  },
  { key: "customize_body", value: "<div>custom body</div>" },
]

const persist = (env: any) =>
  saveDb({ settings, users: [], storages: [], shares: [] }, env)

test(
  "custom HTML injection preserves replacement patterns and removes injected anchors",
  { concurrency: false },
  () => {
    const html = applyCustomizeToHtml(template, settings)
    assert.match(html, /<meta data-value="\$&">/)
    assert.match(html, /<div>custom body<\/div>/)
    assert.doesNotMatch(html, /customize head|customize body/)
  },
)

test(
  "EdgeOne SPA shell injects saved custom head and body",
  { concurrency: false },
  async () => {
    const env: any = {}
    await persist(env)
    setSpaFallbackHtml(template)

    const res = await app.request(
      EDGEONE_SPA_ROUTE,
      { headers: { Accept: "text/html" } },
      env,
    )
    assert.equal(res.status, 200)
    assert.equal(res.headers.get("cache-control"), "no-cache, must-revalidate")
    const html = await res.text()
    assert.match(html, /<meta data-value="\$&">/)
    assert.match(html, /<div>custom body<\/div>/)
  },
)

test(
  "Cloudflare asset shell preserves safe headers and drops stale representation metadata",
  { concurrency: false },
  async () => {
    const env: any = {
      ASSETS: {
        fetch: async () =>
          new Response(template, {
            headers: {
              ETag: '"stale"',
              "Content-Length": "1",
              "Content-Encoding": "identity",
              "Content-Security-Policy": "default-src 'self'",
              "Last-Modified": "Sun, 01 Jan 2023 00:00:00 GMT",
              "Content-Type": "text/html",
            },
          }),
      },
    }
    await persist(env)

    const res = await app.request(
      "/",
      { headers: { Accept: "text/html" } },
      env,
    )
    assert.equal(res.status, 200)
    assert.equal(res.headers.get("etag"), null)
    assert.equal(res.headers.get("content-length"), null)
    assert.equal(res.headers.get("content-encoding"), null)
    assert.equal(res.headers.get("last-modified"), null)
    assert.equal(
      res.headers.get("content-security-policy"),
      "default-src 'self'",
    )
    assert.equal(res.headers.get("cache-control"), "no-cache, must-revalidate")
    assert.match(await res.text(), /<div>custom body<\/div>/)
  },
)

test(
  "Cloudflare non-root HTML response is treated as a SPA shell",
  { concurrency: false },
  async () => {
    const env: any = {
      ASSETS: {
        fetch: async () =>
          new Response(template, {
            headers: { "Content-Type": "text/html" },
          }),
      },
    }
    await persist(env)

    const res = await app.request(
      "/add",
      { headers: { Accept: "text/html" } },
      env,
    )
    assert.equal(res.status, 200)
    assert.match(await res.text(), /<div>custom body<\/div>/)
  },
)

test(
  "Cloudflare 404 fallback fetches and transforms the root shell",
  { concurrency: false },
  async () => {
    const env: any = {
      ASSETS: {
        fetch: async (request: Request) =>
          new URL(request.url).pathname === "/"
            ? new Response(template, {
                headers: { "Content-Type": "text/html" },
              })
            : new Response("missing", { status: 404 }),
      },
    }
    await persist(env)

    const res = await app.request(
      "/add",
      { headers: { Accept: "text/html" } },
      env,
    )
    assert.equal(res.status, 200)
    assert.match(await res.text(), /<div>custom body<\/div>/)
  },
)

test(
  "HEAD returns transformed headers without a body",
  { concurrency: false },
  async () => {
    const env: any = {
      ASSETS: {
        fetch: async () =>
          new Response(template, {
            headers: { "Content-Type": "text/html" },
          }),
      },
    }
    await persist(env)

    const res = await app.request(
      "/",
      { method: "HEAD", headers: { Accept: "text/html" } },
      env,
    )
    assert.equal(res.status, 200)
    assert.equal(res.headers.get("cache-control"), "no-cache, must-revalidate")
    assert.equal(await res.text(), "")
  },
)

test(
  "dynamic SPA route stays available without an Accept header",
  { concurrency: false },
  async () => {
    setSpaFallbackHtml(template)
    const res = await app.request(
      EDGEONE_SPA_ROUTE,
      {},
      { DB_DRIVER: "invalid", DB_FORMAT: "map" },
    )
    assert.equal(res.status, 200)
    assert.equal(await res.text(), template)
  },
)
