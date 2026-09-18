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

/**
 * 模拟 CDN 外呼。
 *   HEAD <cdn>/<asset>     → 资产存在性探测（asset=false 时 404）
 *   GET  <cdn>/index.html  → html=null 时 404，否则返回该 HTML
 */
function cdnImpl(opts: { asset?: boolean; html?: string | null; log?: string[] }) {
  return async (url: string, init?: any) => {
    const method = (init?.method || "GET").toUpperCase()
    opts.log?.push(`${method} ${url}`)
    if (method === "HEAD") {
      return new Response(null, { status: opts.asset === false ? 404 : 200 })
    }
    if (opts.html === null) return new Response("not found", { status: 404 })
    return new Response(opts.html ?? CDN_HTML, {
      status: 200,
      headers: { "content-type": "text/html" },
    })
  }
}

test("集成[本地 HTML 路径]: CDN 有本地哈希时用本地 HTML，不拉 CDN 的 index.html", async () => {
  // npmmirror 等禁止访问 .html 的 CDN 只能靠这条路径（等价 Go Release 版行为）
  const log: string[] = []
  const env = {
    ASSETS: makeFakeAssets(),
    ASSET_URLS: "https://registry.npmmirror.com/@pkg/4.2.6/files/dist",
  }
  const res = await withFetch(
    () => app.request("/", { headers }, env as any),
    cdnImpl({ asset: true, log }),
  )
  assert.equal(res.status, 200)
  assert.deepEqual(log, [
    "HEAD https://registry.npmmirror.com/@pkg/4.2.6/files/dist/assets/index-LOCAL.js",
  ])
  const html = await res.text()
  assert.match(html, /index-LOCAL\.js/)
  assert.doesNotMatch(html, /cdn: undefined/)
  assert.match(
    html,
    /cdn: 'https:\/\/registry\.npmmirror\.com\/@pkg\/4\.2\.6\/files\/dist'/,
  )
})

test("集成[CDN HTML 路径]: 本地哈希不在 CDN 上时改用 CDN 的 index.html（哈希同源）", async () => {
  const log: string[] = []
  const env = { ASSETS: makeFakeAssets(), ASSET_URLS: "https://cdn-i1.example.com/dist" }
  const res = await withFetch(
    () => app.request("/", { headers }, env as any),
    cdnImpl({ asset: false, log }),
  )
  assert.equal(res.status, 200)
  assert.deepEqual(log, [
    "HEAD https://cdn-i1.example.com/dist/assets/index-LOCAL.js",
    "GET https://cdn-i1.example.com/dist/index.html",
  ])
  const html = await res.text()
  // 下发的必须是 CDN 的 HTML（含 CDN 的哈希），而非本地 HTML
  assert.match(html, /index-CDN\.js/)
  assert.doesNotMatch(html, /cdn: undefined/)
  assert.match(html, /cdn: 'https:\/\/cdn-i1\.example\.com\/dist'/)
  assert.match(html, /window\.__dynamic_base__/)
})

test("集成[静态资源兜底]: 源站缺失的 /assets/* 302 到 CDN（对齐 Go 版）", async () => {
  const env = {
    ASSETS: makeFakeAssets(),
    ASSET_URLS: "https://cdn-redirect.example.com/dist",
  }
  const res = await withFetch(
    () =>
      app.request(
        "/assets/missing-chunk.js",
        { headers: { accept: "*/*" } },
        env as any,
      ),
    async () => {
      throw new Error("302 不应外呼 CDN")
    },
  )
  assert.equal(res.status, 302)
  assert.equal(
    res.headers.get("location"),
    "https://cdn-redirect.example.com/dist/assets/missing-chunk.js",
  )
})

test("集成[静态资源兜底]: 前端路由不重定向，仍走 SPA 兜底", async () => {
  const env = {
    ASSETS: makeFakeAssets(),
    ASSET_URLS: "https://cdn-redirect2.example.com/dist",
  }
  const res = await withFetch(
    () => app.request("/login", { headers }, env as any),
    cdnImpl({ asset: true }),
  )
  assert.equal(res.status, 200)
  assert.match(await res.text(), /cdn: 'https:\/\/cdn-redirect2\.example\.com\/dist'/)
})

test("集成[降级]: 两条路径都不可用（CDN 拦截 .html）时不注入 cdn", async () => {
  const env = {
    ASSETS: makeFakeAssets(),
    ASSET_URLS: "https://registry.npmmirror.com/@pkg/9.9.9/files/dist",
  }
  const res = await withFetch(
    () => app.request("/", { headers }, env as any),
    cdnImpl({ asset: false, html: null }),
  )
  assert.equal(res.status, 200)
  const html = await res.text()
  assert.match(html, /cdn: undefined/, "两条路径都不可用时必须回退源站资源")
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
    cdnImpl({ asset: true }),
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

test("集成[ASSETS 兜底]: SPA 路由 /login 同样注入 cdn", async () => {
  const env = { ASSETS: makeFakeAssets(), ASSET_URLS: "https://cdn-i2.example.com/dist" }
  // /login 在 ASSETS 里 404 -> 走 SPA 兜底 fetch "/" -> 再走 CDN 注入
  const res = await withFetch(
    () => app.request("/login", { headers }, env as any),
    cdnImpl({ asset: true }),
  )
  assert.equal(res.status, 200)
  const html = await res.text()
  assert.match(html, /cdn: 'https:\/\/cdn-i2\.example\.com\/dist'/)
})

test("集成[spaFallbackHtml 路径]: EdgeOne/ESA 无 ASSETS 绑定时注入 cdn", async () => {
  setSpaFallbackHtml(INDEX_HTML)
  const env = { ASSET_URLS: "https://cdn-i3.example.com/dist" }
  const res = await withFetch(
    () => app.request("/manage", { headers }, env as any),
    cdnImpl({ asset: true }),
  )
  assert.equal(res.status, 200)
  const html = await res.text()
  assert.doesNotMatch(html, /cdn: undefined/)
  assert.match(html, /cdn: 'https:\/\/cdn-i3\.example\.com\/dist'/)
})

test("集成: $version 用构建期版本戳解析（不再落 latest）", async () => {
  const log: string[] = []
  const env = {
    ASSETS: makeFakeAssets(),
    ASSET_URLS:
      "https://cdn.jsdelivr.net/npm/@openlist-frontend/openlist-frontend@$version/dist",
  }
  const res = await withFetch(
    () => app.request("/", { headers }, env as any),
    cdnImpl({ asset: true, log }),
  )
  assert.equal(res.status, 200)
  assert.deepEqual(log, [
    "HEAD https://cdn.jsdelivr.net/npm/@openlist-frontend/openlist-frontend@4.2.6/dist/assets/index-LOCAL.js",
  ])
  const html = await res.text()
  assert.match(
    html,
    /cdn: 'https:\/\/cdn\.jsdelivr\.net\/npm\/@openlist-frontend\/openlist-frontend@4\.2\.6\/dist'/,
  )
})

test("集成[SPA 兜底]: 未配置 ASSET_URLS 时流式透传 body 与状态码", async () => {
  // /login 在 ASSETS 里 404 -> 走 SPA 兜底 fetch "/"。
  // 兜底不应把 body 读成字符串再重建：那会让每次深链刷新都白付一次缓冲，
  // 并丢掉静态层的流式透传。
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(INDEX_HTML))
      controller.close()
    },
  })
  const env = {
    ASSETS: {
      fetch: (req: Request) =>
        new URL(req.url).pathname === "/"
          ? new Response(stream, {
              status: 200,
              headers: { "content-type": "text/html; charset=utf-8" },
            })
          : new Response("not found", { status: 404 }),
    },
  }
  const res = await withFetch(
    () => app.request("/login", { headers }, env as any),
    async () => {
      throw new Error("不应发起网络请求")
    },
  )
  assert.equal(res.status, 200)
  assert.equal(res.body, stream, "必须透传静态层的 body 流")
  assert.equal(res.headers.get("cache-control"), "no-cache, must-revalidate")
  assert.match(await res.text(), /cdn: undefined/)
})

test("集成[SPA 兜底]: 非 2xx 保留原状态码，不包装成 200 空壳", async () => {
  // 兜底子请求（fetch "/"）返回 404 时，若仍构造 status: 200 的响应，会把真实
  // 错误掩盖成「一个 200 的 HTML 空壳」，让 4xx/5xx 排查失去线索。
  const env = {
    ASSETS: {
      fetch: () =>
        new Response("not found", {
          status: 404,
          headers: { "content-type": "text/plain" },
        }),
    },
  }
  const res = await withFetch(
    () => app.request("/login", { headers }, env as any),
    async () => {
      throw new Error("未配置 ASSET_URLS，不应发起网络请求")
    },
  )
  assert.equal(res.status, 404)
})

test("集成[SPA 兜底]: 配置 ASSET_URLS 时非 2xx 也不改写（307 透传）", async () => {
  const env = {
    ASSETS: {
      fetch: () =>
        new Response(null, { status: 307, headers: { location: "/index.html" } }),
    },
    ASSET_URLS: "https://cdn-i5.example.com/dist",
  }
  const res = await withFetch(
    () => app.request("/login", { headers }, env as any),
    async () => {
      throw new Error("非 2xx 不应触发 CDN 注入")
    },
  )
  assert.equal(res.status, 307)
  assert.equal(res.headers.get("location"), "/index.html")
})
