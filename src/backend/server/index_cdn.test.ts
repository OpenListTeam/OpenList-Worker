import assert from "node:assert/strict"
import { test } from "node:test"
import app, { setSpaFallbackHtml } from "../index"

/** 本地构建的 index.html（含构建期版本戳） */
const INDEX_HTML = `<!doctype html>
<html>
  <head>
    <meta name="frontend-version" content="4.2.6">
    <script>
      window.OPENLIST_CONFIG = {
        cdn: undefined,
        base_path: undefined,
        api: undefined,
        main_color: undefined,
      }
      window.__dynamic_base__ = window.OPENLIST_CONFIG.cdn || ""
    </script>
    <script type="module" src="/assets/index-LOCAL.js"></script>
  </head>
  <body><div id="root"></div></body>
</html>`

/** 模拟 CDN 上的 index.html：哈希与本地不同（正是修复前 404 的根源） */
const CDN_HTML = INDEX_HTML.replace("index-LOCAL.js", "index-CDN.js")

// 模拟 Cloudflare Workers 的 ASSETS 静态资源绑定
function makeFakeAssets() {
  return {
    fetch(req: Request) {
      const url = new URL(req.url)
      // / 与 /index.html 返回 SPA 壳；其它路径 404（触发 SPA 兜底）
      if (url.pathname === "/" || url.pathname === "/index.html") {
        return new Response(INDEX_HTML, {
          status: 200,
          headers: { "content-type": "text/html; charset=utf-8" },
        })
      }
      return new Response("not found", { status: 404 })
    },
  }
}

const headers = { accept: "text/html,application/xhtml+xml" }

/** 在指定 fetch 实现下运行 fn（模拟 Worker 对 CDN 的外呼），结束后恢复 */
async function withFetch(fn: any, impl: any) {
  const original = globalThis.fetch
  globalThis.fetch = impl as any
  try {
    return await fn()
  } finally {
    globalThis.fetch = original
  }
}

const okCdn = async (url: string) =>
  new Response(CDN_HTML, { status: 200, headers: { "content-type": "text/html" } })

test("集成[ASSETS 路径]: 从 CDN 拉取 HTML 并注入 cdn（哈希与 CDN 一致）", async () => {
  let requested = ""
  const env = { ASSETS: makeFakeAssets(), ASSET_URLS: "https://cdn-i1.example.com/dist" }
  const res = await withFetch(
    () => app.request("/", { headers }, env as any),
    async (url: string) => {
      requested = url
      return okCdn(url)
    },
  )
  assert.equal(res.status, 200)
  assert.equal(requested, "https://cdn-i1.example.com/dist/index.html")
  const html = await res.text()
  // 下发的必须是 CDN 的 HTML（含 CDN 的哈希），而非本地 HTML
  assert.match(html, /index-CDN\.js/)
  assert.doesNotMatch(html, /cdn: undefined/)
  assert.match(html, /cdn: 'https:\/\/cdn-i1\.example\.com\/dist'/)
  assert.match(html, /window\.__dynamic_base__/)
})

test("集成[ASSETS 路径]: 未配置 ASSET_URLS 时 / 原样返回（cdn: undefined 保留）", async () => {
  const env = { ASSETS: makeFakeAssets() }
  const res = await withFetch(
    () => app.request("/", { headers }, env as any),
    async () => {
      throw new Error("不应发起网络请求")
    },
  )
  assert.equal(res.status, 200)
  const html = await res.text()
  assert.match(html, /cdn: undefined/)
})

test("集成[零开销直通]: 未配置 ASSET_URLS 时 HTML 入口流式透传（不缓冲 body）", async () => {
  // 未配置 CDN 时不应把 HTML 读成字符串再重建：那会让每次页面导航都白付一次
  // 缓冲与解析。这里断言 body 流被原样透传（同一对象），证明没有走 text()。
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(INDEX_HTML))
      controller.close()
    },
  })
  const env = {
    ASSETS: {
      fetch: () =>
        new Response(stream, {
          status: 200,
          headers: { "content-type": "text/html; charset=utf-8" },
        }),
    },
  }
  const res = await withFetch(
    () => app.request("/", { headers }, env as any),
    async () => {
      throw new Error("不应发起网络请求")
    },
  )
  assert.equal(res.status, 200)
  assert.equal(res.body, stream, "必须透传静态层的 body 流")
  assert.equal(res.headers.get("cache-control"), "no-cache, must-revalidate")
  assert.equal(res.headers.get("content-type"), "text/html; charset=utf-8")
  assert.match(await res.text(), /cdn: undefined/)
})

test("集成[编码头]: 注入 cdn 时清掉 content-encoding/content-length", async () => {
  // HTML 被读成字符串后重新构造响应，若保留 content-encoding: gzip，
  // 浏览器会把明文按 gzip 解析而报错；content-length 同理必须重算。
  const env = {
    ASSETS: {
      fetch: () =>
        new Response(INDEX_HTML, {
          status: 200,
          headers: {
            "content-type": "text/html; charset=utf-8",
            "content-encoding": "gzip",
            "content-length": String(INDEX_HTML.length),
          },
        }),
    },
    ASSET_URLS: "https://cdn-i4.example.com/dist",
  }
  const res = await withFetch(
    () => app.request("/", { headers }, env as any),
    async (url: string) => okCdn(url),
  )
  assert.equal(res.status, 200)
  assert.equal(res.headers.get("content-encoding"), null)
  assert.equal(res.headers.get("content-length"), null)
  assert.match(
    await res.text(),
    /cdn: 'https:\/\/cdn-i4\.example\.com\/dist'/,
  )
})

test("集成[降级]: CDN 不可达时回退本地 HTML 且不注入 cdn（不白屏）", async () => {
  const env = { ASSETS: makeFakeAssets(), ASSET_URLS: "https://cdn-down.example.com/dist" }
  const res = await withFetch(
    () => app.request("/", { headers }, env as any),
    async () => {
      throw new Error("network error")
    },
  )
  assert.equal(res.status, 200)
  const html = await res.text()
  assert.match(html, /cdn: undefined/, "CDN 故障时必须回退源站资源，而非注入失效地址")
})

test("集成[ASSETS 兜底]: SPA 路由 /login 同样从 CDN 拉取并注入", async () => {
  const env = { ASSETS: makeFakeAssets(), ASSET_URLS: "https://cdn-i2.example.com/dist" }
  // /login 在 ASSETS 里 404 -> 走 SPA 兜底 fetch "/" -> 再走 CDN 拉取
  const res = await withFetch(
    () => app.request("/login", { headers }, env as any),
    async (url: string) => okCdn(url),
  )
  assert.equal(res.status, 200)
  const html = await res.text()
  assert.match(html, /cdn: 'https:\/\/cdn-i2\.example\.com\/dist'/)
})

test("集成[spaFallbackHtml 路径]: EdgeOne/ESA 无 ASSETS 绑定时从 CDN 拉取并注入", async () => {
  setSpaFallbackHtml(INDEX_HTML)
  const env = { ASSET_URLS: "https://cdn-i3.example.com/dist" }
  const res = await withFetch(
    () => app.request("/manage", { headers }, env as any),
    async (url: string) => okCdn(url),
  )
  assert.equal(res.status, 200)
  const html = await res.text()
  assert.doesNotMatch(html, /cdn: undefined/)
  assert.match(html, /cdn: 'https:\/\/cdn-i3\.example\.com\/dist'/)
})

test("集成: $version 用构建期版本戳解析（不再落 latest）", async () => {
  let requested = ""
  const env = {
    ASSETS: makeFakeAssets(),
    ASSET_URLS:
      "https://cdn.jsdelivr.net/npm/@openlist-frontend/openlist-frontend@$version/dist",
  }
  const res = await withFetch(
    () => app.request("/", { headers }, env as any),
    async (url: string) => {
      requested = url
      return okCdn(url)
    },
  )
  assert.equal(res.status, 200)
  assert.equal(
    requested,
    "https://cdn.jsdelivr.net/npm/@openlist-frontend/openlist-frontend@4.2.6/dist/index.html",
  )
  const html = await res.text()
  assert.match(
    html,
    /cdn: 'https:\/\/cdn\.jsdelivr\.net\/npm\/@openlist-frontend\/openlist-frontend@4\.2\.6\/dist'/,
  )
})
