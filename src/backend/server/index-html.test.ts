import assert from "node:assert/strict"
import { test } from "node:test"

import { saveDb } from "../internal/model/db"
import {
  applyIndexHtmlSettings,
  buildIndexHtml,
  INDEX_HTML_PLACEHOLDERS,
  invalidateIndexHtmlCache,
} from "./index-html"

/**
 * 回归测试：系统全局设置里的自定义头部 / CSS / JS 片段不生效。
 *
 * 根因是 TSWorker 直接把带字面量占位符的 dist/index.html 吐给浏览器，
 * 缺少 Go 版 UpdateIndex() 的服务端替换环节。这里锁住替换行为，防止回退。
 */

/** 与 OpenList-Frontend/dist/index.html 一致的模板骨架（只保留被替换的点）。 */
const TEMPLATE = `<!doctype html>
<html lang="en" translate="no">
  <head>
    <!-- customize head -->
    <meta charset="utf-8" />
    <link rel="apple-touch-icon" href="https://res.oplist.org/logo/logo.png" />
    <link rel="shortcut icon" type="image/ico" href="https://res.oplist.org/logo/logo.svg" />
    <title>Loading...</title>
    <script>
      window.OPENLIST_CONFIG = {
        cdn: undefined,
        main_color: undefined,
      }
    </script>
  </head>
  <body>
    <div id="root"></div>
    <!-- customize body -->
  </body>
</html>
`

const dbWith = (settings: Record<string, string>) => ({
  settings: Object.entries(settings).map(([key, value]) => ({ key, value })),
})

test("customize_head / customize_body 片段必须被注入到 HTML", () => {
  const out = applyIndexHtmlSettings(
    TEMPLATE,
    dbWith({
      customize_head:
        "<style>.logo{display:none}</style><script>console.log('head')</script>",
      customize_body: "<script>console.log('body')</script>",
    }),
  )

  // 占位符必须被消费掉，否则浏览器只会把它当注释
  assert.equal(out.includes(INDEX_HTML_PLACEHOLDERS.customizeHead), false)
  assert.equal(out.includes(INDEX_HTML_PLACEHOLDERS.customizeBody), false)

  // 注入内容必须真的在 head / body 里
  assert.match(out, /<head>[\s\S]*\.logo\{display:none\}[\s\S]*<\/head>/)
  assert.match(out, /console\.log\('head'\)/)
  assert.match(out, /console\.log\('body'\)/)
  // body 片段必须落在 </body> 之前，而不是 head 里
  assert.match(out, /console\.log\('body'\)[\s\S]*<\/body>/)
})

test("站点标题 / favicon / logo / main_color 一并注入（与 Go 版对齐）", () => {
  const out = applyIndexHtmlSettings(
    TEMPLATE,
    dbWith({
      site_title: "My Cloud Drive",
      favicon: "https://cdn.example.com/fav.ico",
      logo: "https://cdn.example.com/logo-light.png\nhttps://cdn.example.com/logo-dark.png",
      main_color: "#7c3aed",
    }),
  )

  assert.match(out, /<title>My Cloud Drive<\/title>/)
  assert.equal(out.includes("https://res.oplist.org/logo/logo.svg"), false)
  assert.equal(out.includes("https://res.oplist.org/logo/logo.png"), false)
  // logo 只取第一行（浅色主题），与 Go 版 strings.Split(...)[0] 一致
  assert.match(out, /apple-touch-icon" href="https:\/\/cdn\.example\.com\/logo-light\.png"/)
  assert.equal(out.includes("logo-dark.png"), false)
  assert.match(out, /main_color: '#7c3aed'/)
})

test("未配置的设置不得清空占位符（避免图标裂开 / 标题变空）", () => {
  const out = applyIndexHtmlSettings(TEMPLATE, dbWith({}))

  assert.match(out, /<title>Loading...<\/title>/)
  assert.equal(out.includes("https://res.oplist.org/logo/logo.svg"), true)
  assert.equal(out.includes("https://res.oplist.org/logo/logo.png"), true)
  assert.match(out, /main_color: undefined/)
  // 空值跳过替换，占位符原样保留（浏览器视为注释，无副作用）
  assert.equal(out.includes(INDEX_HTML_PLACEHOLDERS.customizeHead), true)
})

test("自定义 JS 中的 $& / $1 不得被当作替换模式解释", () => {
  // String.prototype.replace 会把 $& 展开成匹配到的占位符，
  // 用 split/join 才能保证管理员代码原样落地。
  const snippet = "var re = /a/; var s = 'x'.replace(re, '$&$&'); var g = '$1'"
  const out = applyIndexHtmlSettings(
    TEMPLATE,
    dbWith({
      customize_head: `<script>${snippet}</script>`,
      customize_body: "",
    }),
  )

  assert.match(out, /'x'\.replace\(re, '\$&\$&'\)/)
  assert.match(out, /var g = '\$1'/)
  // 不能被展开成占位符文本
  assert.equal(out.includes("<!-- customize head -->"), false)
})

test("main_color 里的引号 / 反斜杠必须转义，否则内联脚本会语法错误", () => {
  const out = applyIndexHtmlSettings(
    TEMPLATE,
    dbWith({ main_color: "a'b\\c" }),
  )
  assert.match(out, /main_color: 'a\\'b\\\\c'/)
})

test("buildIndexHtml：缓存命中与 saveDb 失效", async () => {
  const env: any = { __cacheKey: "index-html-cache-test" }
  // 用默认 env（无 store 配置）即可，getDb 会退回内存 DB
  await saveDb(
    {
      settings: [{ key: "customize_head", value: "<meta name='v1'>" }],
      users: [],
      storages: [],
      shares: [],
    },
    env,
  )

  const first = await buildIndexHtml(TEMPLATE, env)
  assert.match(first, /<meta name='v1'>/)

  // 命中缓存：同 env 再取一次应返回同一字符串实例
  const second = await buildIndexHtml(TEMPLATE, env)
  assert.equal(second, first)

  // 写入设置必须立刻失效缓存，否则「改完不生效」会以另一种形式复现
  await saveDb(
    {
      settings: [{ key: "customize_head", value: "<meta name='v2'>" }],
      users: [],
      storages: [],
      shares: [],
    },
    env,
  )
  const third = await buildIndexHtml(TEMPLATE, env)
  assert.match(third, /<meta name='v2'>/)
  assert.equal(third.includes("v1"), false)
})

test("buildIndexHtml：显式失效后重建", async () => {
  const env: any = { __cacheKey: "index-html-invalidate-test" }
  await saveDb(
    {
      settings: [{ key: "customize_body", value: "<div id='a'></div>" }],
      users: [],
      storages: [],
      shares: [],
    },
    env,
  )
  const before = await buildIndexHtml(TEMPLATE, env)
  assert.match(before, /<div id='a'><\/div>/)

  invalidateIndexHtmlCache(env)
  const after = await buildIndexHtml(TEMPLATE, env)
  assert.equal(after, before)
})

/**
 * 集成测试：直接打真实 app 的 SPA 兜底路由。
 *
 * 单测 applyIndexHtmlSettings 只能证明「替换函数是对的」，证不了「路由真的调用了
 * 它」—— 而本次 bug 的本质恰恰是路由没调用。这里把真实 app 拉起来跑一遍，
 * 锁死端到端行为。
 */
test("集成：EdgeOne（无 ASSETS）SPA 壳必须注入自定义 head/body", async () => {
  const { default: app, setSpaFallbackHtml } = await import("../index")

  const env: any = { __cacheKey: "e2e-edge-inline" }
  await saveDb(
    {
      settings: [
        { key: "customize_head", value: "<style>body{background:#000}</style>" },
        { key: "customize_body", value: "<script>window.__INJECTED__=1</script>" },
        { key: "site_title", value: "E2E Edge Site" },
      ],
      users: [],
      storages: [],
      shares: [],
    },
    env,
  )

  // 模拟 EdgeOne 构建期内联进来的 SPA 壳
  setSpaFallbackHtml(TEMPLATE)

  // 用一个不存在的深链路由触发 app.all("*") 兜底。
  // 必须带 Accept: text/html —— index.ts 的存储配置错误中间件只在
  // 「MIME 带扩展名 or 浏览器导航请求」时豁免，深链导航正是靠后者放行；
  // 不带这个头会被 503 拦掉（这也是真实浏览器每次导航都会发的头）。
  const res = await app.request(
    "/some/spa/route",
    { method: "GET", headers: { Accept: "text/html,application/xhtml+xml" } },
    env,
  )
  assert.equal(res.status, 200)
  assert.match(res.headers.get("content-type") || "", /text\/html/)
  assert.match(res.headers.get("cache-control") || "", /no-cache/)

  const html = await res.text()
  assert.equal(html.includes("<!-- customize head -->"), false)
  assert.equal(html.includes("<!-- customize body -->"), false)
  assert.match(html, /body\{background:#000\}/)
  assert.match(html, /window\.__INJECTED__=1/)
  assert.match(html, /<title>E2E Edge Site<\/title>/)
})

test("集成：Cloudflare（有 ASSETS）首页与子路由刷新都要注入", async () => {
  const { default: app } = await import("../index")

  const env: any = {
    __cacheKey: "e2e-assets",
    ASSETS: {
      async fetch(req: Request) {
        const pathname = new URL(req.url).pathname
        // 只对 HTML 入口返回模板，其余（含深链）返回 404 以触发 SPA fallback
        if (pathname === "/" || pathname === "/index.html") {
          return new Response(TEMPLATE, {
            status: 200,
            headers: { "Content-Type": "text/html; charset=utf-8" },
          })
        }
        return new Response("not found", { status: 404 })
      },
    },
  }

  await saveDb(
    {
      settings: [
        { key: "customize_head", value: "<meta name='cf-head'>" },
        { key: "customize_body", value: "<script>window.__CF__=1</script>" },
      ],
      users: [],
      storages: [],
      shares: [],
    },
    env,
  )

  const navHeaders = { Accept: "text/html,application/xhtml+xml" }

  // 首页
  const home = await app.request("/", { method: "GET", headers: navHeaders }, env)
  assert.equal(home.status, 200)
  const homeHtml = await home.text()
  assert.match(homeHtml, /<meta name='cf-head'>/)
  assert.match(homeHtml, /window\.__CF__=1/)

  // 深链刷新：走 SPA fallback，必须同样注入
  const deep = await app.request(
    "/login",
    { method: "GET", headers: navHeaders },
    env,
  )
  assert.equal(deep.status, 200)
  const deepHtml = await deep.text()
  assert.match(deepHtml, /<meta name='cf-head'>/)
  assert.match(deepHtml, /window\.__CF__=1/)
})

test("buildIndexHtml：模板缺少占位符时原样返回（不抛错）", async () => {
  const env: any = { __cacheKey: "index-html-no-placeholder-test" }
  await saveDb(
    {
      settings: [{ key: "customize_head", value: "<meta name='x'>" }],
      users: [],
      storages: [],
      shares: [],
    },
    env,
  )
  const plain = "<html><head></head><body>plain</body></html>"
  const out = await buildIndexHtml(plain, env)
  assert.equal(out, plain)
})
