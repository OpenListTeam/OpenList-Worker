import assert from "node:assert/strict"
import { test } from "node:test"
import { saveDb } from "../internal/model/db"
import { resolveCdnUrl, injectCdnIntoHtml } from "./assets"

const env: any = {}

const INDEX_HTML = `<!doctype html>
<html>
  <head>
    <script>
      window.OPENLIST_CONFIG = {
        cdn: undefined,
        base_path: undefined,
        api: undefined,
        main_color: undefined,
      }
      window.__dynamic_base__ = window.OPENLIST_CONFIG.cdn || ""
    </script>
  </head>
  <body><div id="root"></div></body>
</html>`

test("resolveCdnUrl: returns empty string when ASSET_URLS is unset", async () => {
  assert.equal(await resolveCdnUrl({}), "")
  assert.equal(await resolveCdnUrl({ ASSET_URLS: "" }), "")
})

test("resolveCdnUrl: returns URL as-is when no $version placeholder", async () => {
  const url = "https://cdn.example.com/dist"
  assert.equal(await resolveCdnUrl({ ASSET_URLS: url }), url)
})

test("resolveCdnUrl: $version falls back to 'latest' when version setting missing", async () => {
  await saveDb({ settings: [], users: [], storages: [], shares: [] }, env)
  const got = await resolveCdnUrl({
    ASSET_URLS: "https://cdn.example.com/@pkg@$version/dist",
  })
  assert.equal(got, "https://cdn.example.com/@pkg@latest/dist")
})

test("resolveCdnUrl: $version resolved from version setting with Frontend: vX.Y.Z", async () => {
  await saveDb(
    {
      settings: [
        {
          key: "version",
          value: "v4.2.3 (Commit: abc) - Frontend: v1.2.0 - Build at: 2026",
        },
      ],
      users: [],
      storages: [],
      shares: [],
    },
    env,
  )
  const got = await resolveCdnUrl({
    ASSET_URLS: "https://cdn.example.com/@pkg@$version/dist",
  })
  assert.equal(got, "https://cdn.example.com/@pkg@v1.2.0/dist")
})

test("resolveCdnUrl: skips DB read when no $version (no storage dependency)", async () => {
  // 即便存储未配置（无 KV），无 $version 时也不应抛错
  const got = await resolveCdnUrl({ ASSET_URLS: "https://cdn.example.com/dist" })
  assert.equal(got, "https://cdn.example.com/dist")
})

test("injectCdnIntoHtml: no-op when ASSET_URLS is unset", async () => {
  const out = await injectCdnIntoHtml(INDEX_HTML, {})
  assert.equal(out, INDEX_HTML)
  // 确保 cdn 仍为 undefined
  assert.match(out, /cdn: undefined/)
})

test("injectCdnIntoHtml: replaces cdn: undefined with configured CDN", async () => {
  const out = await injectCdnIntoHtml(INDEX_HTML, {
    ASSET_URLS: "https://cdn.example.com/dist",
  })
  assert.doesNotMatch(out, /cdn: undefined/)
  assert.match(out, /cdn: 'https:\/\/cdn\.example\.com\/dist'/)
  // 其他占位符不受影响
  assert.match(out, /base_path: undefined/)
  assert.match(out, /main_color: undefined/)
})

test("injectCdnIntoHtml: graceful on HTML without OPENLIST_CONFIG placeholder", async () => {
  const plain = "<html><body>no config here</body></html>"
  const out = await injectCdnIntoHtml(plain, {
    ASSET_URLS: "https://cdn.example.com/dist",
  })
  assert.equal(out, plain)
})

test("injectCdnIntoHtml: CDN URL with $ characters survives replacement", async () => {
  // 确认 cdn URL 中的 $ 不会被 String.replace 当作特殊模式
  const out = await injectCdnIntoHtml(INDEX_HTML, {
    ASSET_URLS: "https://cdn.example.com/$$x/dist",
  })
  assert.match(out, /cdn: 'https:\/\/cdn\.example\.com\/\$\$x\/dist'/)
})
