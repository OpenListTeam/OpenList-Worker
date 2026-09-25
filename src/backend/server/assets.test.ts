import assert from "node:assert/strict"
import { test } from "node:test"
import { saveDb } from "../internal/model/db"
import {
  resolveCdnUrl,
  injectCdnIntoHtml,
  getIndexHtmlWithCdn,
  parseFrontendVersion,
  extractEntryAsset,
  cdnAssetRedirect,
} from "./assets"

const env: any = {}

/** 与官方前端产物同构的最小 HTML：含 OPENLIST_CONFIG 与动态 base 脚本 */
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

const LOCAL_HTML = INDEX_HTML.replace(
  '    <meta name="frontend-version" content="4.2.6">\n',
  "",
)

/** 在指定 fetch 实现下运行 fn，结束后恢复 globalThis.fetch */
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
 * log 收集 "METHOD url" 便于断言调用次数与顺序。
 */
function cdnImpl(opts: { asset?: boolean; html?: string | null; log?: string[] }) {
  return async (url: string, init?: any) => {
    const method = (init?.method || "GET").toUpperCase()
    opts.log?.push(`${method} ${url}`)
    if (method === "HEAD") {
      return new Response(null, { status: opts.asset === false ? 404 : 200 })
    }
    if (opts.html === null) return new Response("not found", { status: 404 })
    return new Response(opts.html ?? INDEX_HTML, {
      status: 200,
      headers: { "content-type": "text/html" },
    })
  }
}

// ---------------------------------------------------------------- version stamp

test("parseFrontendVersion: 解析构建期版本戳", () => {
  assert.equal(parseFrontendVersion(INDEX_HTML), "4.2.6")
  assert.equal(parseFrontendVersion(LOCAL_HTML), "")
  assert.equal(parseFrontendVersion("<html></html>"), "")
})

// ------------------------------------------------------------- extractEntryAsset

test("extractEntryAsset: 取 preloads 里的 module 入口", () => {
  const html = `<script>(function(){
var preloads = [{"parentTagName":"head","tagName":"script","attrs":{"type":"module","crossorigin":"","src":"/assets/index-CelfHslL.js"}},{"parentTagName":"head","tagName":"link","attrs":{"rel":"stylesheet","crossorigin":"","href":"/assets/index-MlAvXon-.css"}}];
})();</script>`
  assert.equal(extractEntryAsset(html), "/assets/index-CelfHslL.js")
})

test("extractEntryAsset: 退化取任意 /assets/*.js 引用", () => {
  assert.equal(
    extractEntryAsset('<script data-src="/assets/index-legacy-Exg5IBbL.js"></script>'),
    "/assets/index-legacy-Exg5IBbL.js",
  )
  assert.equal(
    extractEntryAsset("<script src=/assets/app-abc123.js></script>"),
    "/assets/app-abc123.js",
  )
})

test("extractEntryAsset: 无 /assets 引用时返回空串", () => {
  assert.equal(extractEntryAsset("<html><body>no assets</body></html>"), "")
})

// ---------------------------------------------------------------- resolveCdnUrl

test("resolveCdnUrl: 未配置 ASSET_URLS 返回空串", async () => {
  assert.equal(await resolveCdnUrl({}), "")
  assert.equal(await resolveCdnUrl({ ASSET_URLS: "" }), "")
})

test("resolveCdnUrl: 无 $version 时原样返回（零存储开销）", async () => {
  const url = "https://cdn.example.com/dist"
  assert.equal(await resolveCdnUrl({ ASSET_URLS: url }), url)
})

test("resolveCdnUrl: $version 优先取 HTML 构建期版本戳", async () => {
  // 即使 DB 里有 Frontend: v9.9.9，也应优先用与 dist 同源的 meta 版本
  await saveDb(
    {
      settings: [{ key: "version", value: "v4.2.3 - Frontend: v9.9.9" }],
      users: [],
      storages: [],
      shares: [],
    },
    env,
  )
  const got = await resolveCdnUrl(
    { ASSET_URLS: "https://cdn.example.com/@pkg@$version/dist" },
    INDEX_HTML,
  )
  assert.equal(got, "https://cdn.example.com/@pkg@4.2.6/dist")
})

test("resolveCdnUrl: 无版本戳时回退 DB 的 Frontend: 字段", async () => {
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
  const got = await resolveCdnUrl(
    { ASSET_URLS: "https://cdn.example.com/@pkg@$version/dist" },
    LOCAL_HTML,
  )
  assert.equal(got, "https://cdn.example.com/@pkg@v1.2.0/dist")
})

test("resolveCdnUrl: 版本不可得时回退 latest", async () => {
  await saveDb(
    { settings: [], users: [], storages: [], shares: [] },
    env,
    { force: true },
  )
  const got = await resolveCdnUrl(
    { ASSET_URLS: "https://cdn.example.com/@pkg@$version/dist" },
    LOCAL_HTML,
  )
  assert.equal(got, "https://cdn.example.com/@pkg@latest/dist")
})

// ------------------------------------------------------------ cdnAssetRedirect

test("cdnAssetRedirect: 静态资源目录缺失时 302 到 CDN", async () => {
  // 对齐 Go 版 static.go 的 folders 重定向
  const env = { ASSET_URLS: "https://cdn.example.com/dist" }
  assert.equal(
    await cdnAssetRedirect(env, "/assets/index-abc.js"),
    "https://cdn.example.com/dist/assets/index-abc.js",
  )
  assert.equal(
    await cdnAssetRedirect(env, "/images/light.webp"),
    "https://cdn.example.com/dist/images/light.webp",
  )
  assert.equal(
    await cdnAssetRedirect(env, "/static/fonts/a.woff2?v=1"),
    "https://cdn.example.com/dist/static/fonts/a.woff2?v=1",
  )
})

test("cdnAssetRedirect: 非静态目录 / 未配置 CDN 时不重定向", async () => {
  assert.equal(await cdnAssetRedirect({}, "/assets/index-abc.js"), "")
  const env = { ASSET_URLS: "https://cdn.example.com/dist" }
  // 前端路由必须走 SPA 兜底，不能重定向到 CDN
  assert.equal(await cdnAssetRedirect(env, "/login"), "")
  assert.equal(await cdnAssetRedirect(env, "/@manage/storage"), "")
  // 目录本身（无尾随路径）不重定向
  assert.equal(await cdnAssetRedirect(env, "/assets"), "")
  assert.equal(await cdnAssetRedirect(env, "/assets/"), "")
})

test("cdnAssetRedirect: $version 无本地 HTML 时按 env 解析", async () => {
  await saveDb(
    { settings: [], users: [], storages: [], shares: [] },
    env,
    { force: true },
  )
  const got = await cdnAssetRedirect(
    { ASSET_URLS: "https://cdn.example.com/@pkg@$version/dist" },
    "/assets/x.js",
  )
  assert.equal(got, "https://cdn.example.com/@pkg@latest/dist/assets/x.js")
})

// ------------------------------------------------------------- injectCdnIntoHtml

test("injectCdnIntoHtml: 替换 cdn: undefined，保留其它占位符", () => {
  const out = injectCdnIntoHtml(INDEX_HTML, "https://cdn.example.com/dist")
  assert.doesNotMatch(out, /cdn: undefined/)
  assert.match(out, /cdn: 'https:\/\/cdn\.example\.com\/dist'/)
  assert.match(out, /base_path: undefined/)
  assert.match(out, /main_color: undefined/)
})

test("injectCdnIntoHtml: 空 cdn 原样返回", () => {
  assert.equal(injectCdnIntoHtml(INDEX_HTML, ""), INDEX_HTML)
})

test("injectCdnIntoHtml: 无占位符的 HTML 原样返回", () => {
  const plain = "<html><body>no config</body></html>"
  assert.equal(injectCdnIntoHtml(plain, "https://cdn.example.com"), plain)
})

test("injectCdnIntoHtml: CDN URL 中的 $ 不被当作特殊模式", () => {
  const out = injectCdnIntoHtml(INDEX_HTML, "https://cdn.example.com/$$x/dist")
  assert.match(out, /cdn: 'https:\/\/cdn\.example\.com\/\$\$x\/dist'/)
})

test("injectCdnIntoHtml: CDN URL 中的引号 / 反斜杠被转义", () => {
  // 注入值最终是内联脚本里的 JS 字符串字面量：未转义的 ' 会提前闭合字符串，
  // window.OPENLIST_CONFIG 语法报错 -> 整站白屏。
  const cdn = "https://cdn.example.com/a'b\\c/dist"
  const out = injectCdnIntoHtml(INDEX_HTML, cdn)
  assert.doesNotMatch(out, /cdn: undefined/)
  const literal = out.match(/cdn:\s*('(?:[^'\\]|\\.)*')/)?.[1]
  assert.ok(literal, `注入结果中应存在 cdn 字面量，实际：${out}`)
  // 只考察字面量本身的语义：按 JS 转义规则还原后必须等于原始 URL
  const decoded = literal.slice(1, -1).replace(/\\(.)/g, "$1")
  assert.equal(decoded, cdn, "字面量必须还原成原始 URL")
})

// ------------------------------------------------------------ getIndexHtmlWithCdn

test("getIndexHtmlWithCdn: 未配置 ASSET_URLS 时返回本地 HTML", async () => {
  const out = await withFetch(() => getIndexHtmlWithCdn({}, LOCAL_HTML), async () => {
    throw new Error("不应发起网络请求")
  })
  assert.equal(out, LOCAL_HTML)
})

test("getIndexHtmlWithCdn: 非 http(s) scheme 直接回退本地 HTML", async () => {
  const out = await withFetch(
    () => getIndexHtmlWithCdn({ ASSET_URLS: "ftp://cdn.example.com/dist" }, LOCAL_HTML),
    async () => {
      throw new Error("不应发起网络请求")
    },
  )
  assert.equal(out, LOCAL_HTML)
})

test("getIndexHtmlWithCdn: CDN 上有本地哈希资产时用本地 HTML（不拉 CDN 的 index.html）", async () => {
  // npmmirror 等禁止访问 .html 的 CDN 只能靠这条路径（等价 Go Release 版行为）
  const log: string[] = []
  const out = await withFetch(
    () =>
      getIndexHtmlWithCdn(
        { ASSET_URLS: "https://registry.npmmirror.com/@pkg/1.0.0/files/dist" },
        INDEX_HTML,
      ),
    cdnImpl({ asset: true, log }),
  )
  assert.deepEqual(log, [
    "HEAD https://registry.npmmirror.com/@pkg/1.0.0/files/dist/assets/index-LOCAL.js",
  ])
  // 下发的必须是本地 HTML（哈希与本地 dist 一致），且已注入 cdn
  assert.match(out, /index-LOCAL\.js/)
  assert.match(
    out,
    /cdn: 'https:\/\/registry\.npmmirror\.com\/@pkg\/1\.0\.0\/files\/dist'/,
  )
})

test("getIndexHtmlWithCdn: 本地哈希不在 CDN 上时改用 CDN 的 index.html（哈希同源）", async () => {
  const log: string[] = []
  const cdnHtml = INDEX_HTML.replace("index-LOCAL.js", "index-CDN.js")
  const out = await withFetch(
    () => getIndexHtmlWithCdn({ ASSET_URLS: "https://cdn-a.example.com/dist" }, LOCAL_HTML),
    cdnImpl({ asset: false, html: cdnHtml, log }),
  )
  assert.deepEqual(log, [
    "HEAD https://cdn-a.example.com/dist/assets/index-LOCAL.js",
    "GET https://cdn-a.example.com/dist/index.html",
  ])
  assert.match(out, /index-CDN\.js/)
  assert.match(out, /cdn: 'https:\/\/cdn-a\.example\.com\/dist'/)
})

test("getIndexHtmlWithCdn: 探测失败且 CDN 拦截 .html 时降级为不注入", async () => {
  // npmmirror registry 端点：.html 返回 451 {"error":"blocked"}，资产探测也失败
  const log: string[] = []
  const out = await withFetch(
    () =>
      getIndexHtmlWithCdn(
        { ASSET_URLS: "https://registry.npmmirror.com/@pkg/9.9.9/files/dist" },
        LOCAL_HTML,
      ),
    cdnImpl({ asset: false, html: null, log }),
  )
  assert.deepEqual(log, [
    "HEAD https://registry.npmmirror.com/@pkg/9.9.9/files/dist/assets/index-LOCAL.js",
    "GET https://registry.npmmirror.com/@pkg/9.9.9/files/dist/index.html",
  ])
  assert.equal(out, LOCAL_HTML)
  assert.match(out, /cdn: undefined/, "两条路径都不可用时绝不能注入失效地址")
})

test("getIndexHtmlWithCdn: 模块级缓存命中，不重复外呼", async () => {
  const log: string[] = []
  const url = "https://cdn-cache.example.com/dist"
  const impl = cdnImpl({ asset: true, log })
  const first = await withFetch(
    () => getIndexHtmlWithCdn({ ASSET_URLS: url }, INDEX_HTML),
    impl,
  )
  const second = await withFetch(
    () => getIndexHtmlWithCdn({ ASSET_URLS: url }, INDEX_HTML),
    impl,
  )
  assert.equal(first, second)
  assert.equal(log.length, 1, "第二次应命中缓存")
})

test("getIndexHtmlWithCdn: CDN 不可达时回退本地 HTML 且【不注入】cdn（避免白屏）", async () => {
  const out = await withFetch(
    () => getIndexHtmlWithCdn({ ASSET_URLS: "https://cdn-down.example.com/dist" }, LOCAL_HTML),
    async () => {
      throw new Error("network error")
    },
  )
  assert.equal(out, LOCAL_HTML)
  assert.match(out, /cdn: undefined/, "CDN 不可用时绝不能注入失效地址，否则全量资产 404")
})

test("getIndexHtmlWithCdn: CDN 返回 404 / 非 HTML 时回退本地 HTML", async () => {
  const out404 = await withFetch(
    () =>
      getIndexHtmlWithCdn(
        { ASSET_URLS: "https://cdn-404.example.com/dist" },
        LOCAL_HTML,
      ),
    cdnImpl({ asset: false, html: null }),
  )
  assert.equal(out404, LOCAL_HTML)

  const outJson = await withFetch(
    () =>
      getIndexHtmlWithCdn(
        { ASSET_URLS: "https://cdn-json.example.com/dist" },
        LOCAL_HTML,
      ),
    async (url: string, init?: any) => {
      if ((init?.method || "GET").toUpperCase() === "HEAD") {
        return new Response(null, { status: 404 })
      }
      return new Response('{"error":"blocked"}', {
        status: 200,
        headers: { "content-type": "application/json" },
      })
    },
  )
  assert.equal(outJson, LOCAL_HTML, "CDN 的 JSON 错误页不能被当作 HTML 下发")
})

test("getIndexHtmlWithCdn: $version 用本地 HTML 的版本戳解析 CDN 地址", async () => {
  const log: string[] = []
  await withFetch(
    () =>
      getIndexHtmlWithCdn(
        { ASSET_URLS: "https://cdn-ver.example.com/@pkg@$version/dist" },
        INDEX_HTML,
      ),
    cdnImpl({ asset: false, log }),
  )
  assert.deepEqual(log, [
    "HEAD https://cdn-ver.example.com/@pkg@4.2.6/dist/assets/index-LOCAL.js",
    "GET https://cdn-ver.example.com/@pkg@4.2.6/dist/index.html",
  ])
})
