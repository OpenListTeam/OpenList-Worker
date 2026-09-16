import assert from "node:assert/strict"
import { test } from "node:test"
import app, { setSpaFallbackHtml } from "../index"

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

test("集成[ASSETS 路径]: 配置 ASSET_URLS 时 / 返回注入 cdn 的 HTML", async () => {
  const env = { ASSETS: makeFakeAssets(), ASSET_URLS: "https://cdn.example.com/dist" }
  const res = await app.request("/", { headers }, env as any)
  assert.equal(res.status, 200)
  const html = await res.text()
  assert.doesNotMatch(html, /cdn: undefined/, "cdn: undefined 必须被替换")
  assert.match(html, /cdn: 'https:\/\/cdn\.example\.com\/dist'/, "应注入配置的 CDN 地址")
  assert.match(html, /window\.__dynamic_base__/, "前端启动脚本应保留")
})

test("集成[ASSETS 路径]: 未配置 ASSET_URLS 时 / 原样返回（cdn: undefined 保留）", async () => {
  const env = { ASSETS: makeFakeAssets() }
  const res = await app.request("/", { headers }, env as any)
  assert.equal(res.status, 200)
  const html = await res.text()
  assert.match(html, /cdn: undefined/, "未配置时应保持 cdn: undefined")
})

test("集成[ASSETS 兜底]: SPA 路由 /login 返回注入 cdn 的 HTML", async () => {
  const env = { ASSETS: makeFakeAssets(), ASSET_URLS: "https://cdn.example.com/dist" }
  // /login 在 ASSETS 里 404 -> 走 SPA 兜底 fetch "/" -> 注入
  const res = await app.request("/login", { headers }, env as any)
  assert.equal(res.status, 200)
  const html = await res.text()
  assert.match(html, /cdn: 'https:\/\/cdn\.example\.com\/dist'/)
})

test("集成[spaFallbackHtml 路径]: EdgeOne/ESA 无 ASSETS 绑定时注入 cdn", async () => {
  setSpaFallbackHtml(INDEX_HTML)
  const env = { ASSET_URLS: "https://cdn.example.com/dist" }
  const res = await app.request("/manage", { headers }, env as any)
  assert.equal(res.status, 200)
  const html = await res.text()
  assert.doesNotMatch(html, /cdn: undefined/)
  assert.match(html, /cdn: 'https:\/\/cdn\.example\.com\/dist'/)
})

test("集成: ASSET_URLS 含 $version 时正确解析", async () => {
  const env = {
    ASSETS: makeFakeAssets(),
    ASSET_URLS: "https://cdn.jsdelivr.net/npm/@openlist-frontend/openlist-frontend@$version/dist",
  }
  const res = await app.request("/", { headers }, env as any)
  assert.equal(res.status, 200)
  const html = await res.text()
  // version 设置缺失 -> 回退 latest
  assert.match(html, /cdn: 'https:\/\/cdn\.jsdelivr\.net\/npm\/@openlist-frontend\/openlist-frontend@latest\/dist'/)
})
