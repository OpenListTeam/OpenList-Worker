import assert from "node:assert/strict"
import { test } from "node:test"
import { saveDb } from "../internal/model/db"
import {
  resolveCdnUrl,
  injectCdnIntoHtml,
  getIndexHtmlWithCdn,
  parseFrontendVersion,
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

// ---------------------------------------------------------------- version stamp

test("parseFrontendVersion: 解析构建期版本戳", () => {
  assert.equal(parseFrontendVersion(INDEX_HTML), "4.2.6")
  assert.equal(parseFrontendVersion(LOCAL_HTML), "")
  assert.equal(parseFrontendVersion("<html></html>"), "")
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
  await saveDb({ settings: [], users: [], storages: [], shares: [] }, env)
  const got = await resolveCdnUrl(
    { ASSET_URLS: "https://cdn.example.com/@pkg@$version/dist" },
    LOCAL_HTML,
  )
  assert.equal(got, "https://cdn.example.com/@pkg@latest/dist")
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

test("getIndexHtmlWithCdn: 从 CDN 拉取 HTML 并注入 cdn（修复哈希错配的 404）", async () => {
  let called = 0
  let requested = ""
  const cdnHtml = INDEX_HTML.replace("index-LOCAL.js", "index-CDN.js")
  const out = await withFetch(
    () => getIndexHtmlWithCdn({ ASSET_URLS: "https://cdn-a.example.com/dist" }, LOCAL_HTML),
    async (url: string) => {
      called++
      requested = url
      return new Response(cdnHtml, {
        status: 200,
        headers: { "content-type": "text/html" },
      })
    },
  )
  assert.equal(called, 1)
  assert.equal(requested, "https://cdn-a.example.com/dist/index.html")
  // 下发的是 CDN 的 HTML（哈希与 CDN 资产一致）且已注入 cdn
  assert.match(out, /index-CDN\.js/)
  assert.match(out, /cdn: 'https:\/\/cdn-a\.example\.com\/dist'/)
})

test("getIndexHtmlWithCdn: 模块级缓存命中，不重复外呼", async () => {
  let called = 0
  const impl = async () =>
    new Response(INDEX_HTML, { status: 200, headers: { "content-type": "text/html" } })
  const url = "https://cdn-cache.example.com/dist"
  await withFetch(
    () => getIndexHtmlWithCdn({ ASSET_URLS: url }, LOCAL_HTML),
    async () => {
      called++
      return impl()
    },
  )
  await withFetch(
    () => getIndexHtmlWithCdn({ ASSET_URLS: url }, LOCAL_HTML),
    async () => {
      called++
      return impl()
    },
  )
  assert.equal(called, 1, "第二次应命中缓存")
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
    () => getIndexHtmlWithCdn({ ASSET_URLS: "https://cdn-404.example.com/dist" }, LOCAL_HTML),
    async () => new Response("not found", { status: 404 }),
  )
  assert.equal(out404, LOCAL_HTML)

  const outJson = await withFetch(
    () => getIndexHtmlWithCdn({ ASSET_URLS: "https://cdn-json.example.com/dist" }, LOCAL_HTML),
    async () =>
      new Response('{"error":"blocked"}', {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
  )
  assert.equal(outJson, LOCAL_HTML, "CDN 的 JSON 错误页不能被当作 HTML 下发")
})

test("getIndexHtmlWithCdn: $version 用本地 HTML 的版本戳解析 CDN 地址", async () => {
  let requested = ""
  await withFetch(
    () =>
      getIndexHtmlWithCdn(
        { ASSET_URLS: "https://cdn-ver.example.com/@pkg@$version/dist" },
        INDEX_HTML,
      ),
    async (url: string) => {
      requested = url
      return new Response(INDEX_HTML, { status: 200 })
    },
  )
  assert.equal(requested, "https://cdn-ver.example.com/@pkg@4.2.6/dist/index.html")
})
