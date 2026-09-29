import assert from "node:assert/strict"
import { test } from "node:test"
import { Hono } from "hono"
import { assetsRouter } from "./assets"

/**
 * 静态资源路由的回归：CDN 重定向**只能**匹配固定目录前缀。
 *
 * 背景（实机复现）：进入文件预览页后刷新，地址形如 `<域名>/存储2/xxx.exe`，
 * 会被原先的贪婪路由 `/:folder/:filepath*` 拦下，未配置 ASSET_URLS 时直接
 * 返回 404 `Static resource not found`，前端来不及走到 SPA 兜底。
 *
 * Go 的对应实现（server/static/static.go）只对
 * `assets / images / streamer / static` 四个目录做 CDN 重定向，其余一律
 * 交给 `noRoute`（返回 index.html）。
 */

/** 模拟 index.ts 的挂载顺序：assetsRouter 位于 SPA 兜底之前 */
const appWithSpaFallback = () => {
  const app = new Hono()
  app.route("/", assetsRouter)
  app.all("*", (c) => c.html("<!doctype html><title>index</title>"))
  return app
}

test("刷新文件预览页（<挂载点>/<文件>）必须落到 SPA 兜底，而不是 404", async () => {
  const app = appWithSpaFallback()
  for (const path of [
    "/%E5%AD%98%E5%82%A82/xxx.exe",
    "/存储2/xxx.exe",
    "/存储2/sub/dir/file.mp4",
  ]) {
    const res = await app.request(path, {
      method: "GET",
      headers: { Accept: "text/html,application/xhtml+xml" },
    })
    assert.equal(res.status, 200, `${path} -> ${res.status}`)
    const body = await res.text()
    assert.match(body, /<title>index<\/title>/, `${path} 未返回 SPA 壳`)
    assert.doesNotMatch(body, /Static resource not found/, `${path} 被 CDN 路由吞掉`)
  }
})

test("未配置 ASSET_URLS 时，/assets/* 放行给本地静态资源（不返回 404 文案）", async () => {
  const res = await appWithSpaFallback().request("/assets/index-abc.js", {
    method: "GET",
  })
  // 单测里没有 ASSETS 绑定，因此会落到 SPA 兜底；关键是不能再返回那句 404
  assert.notEqual(res.status, 404)
  assert.doesNotMatch(await res.text(), /Static resource not found/)
})

test("配置 ASSET_URLS 时，仅四个静态目录 302 到 CDN，且 $version 被替换", async () => {
  const env = { ASSET_URLS: "https://cdn.example.com/dist" }
  const app = appWithSpaFallback()

  for (const folder of ["assets", "images", "streamer", "static"]) {
    const res = await app.request(`/${folder}/a/b.js`, { method: "GET" }, env)
    assert.equal(res.status, 302, `${folder} 未重定向`)
    assert.equal(
      res.headers.get("location"),
      `https://cdn.example.com/dist/${folder}/a/b.js`,
    )
  }

  // 非静态目录不受影响（仍是 SPA 壳）
  const spa = await app.request("/存储2/xxx.exe", { method: "GET" }, env)
  assert.equal(spa.status, 200)
  assert.match(await spa.text(), /<title>index<\/title>/)
})

test("ASSET_URLS 含 $version 占位符时不留占位符（取不到版本则 latest）", async () => {
  const env = {
    ASSET_URLS: "https://cdn.example.com/openlist/$version/files/dist",
  }
  const res = await appWithSpaFallback().request(
    "/assets/app.js",
    { method: "GET" },
    env,
  )
  assert.equal(res.status, 302)
  const location = res.headers.get("location") || ""
  assert.doesNotMatch(location, /\$version/)
  assert.match(location, /\/assets\/app\.js$/)
})

test("logo / favicon 仍然重定向到官方 logo", async () => {
  const res = await appWithSpaFallback().request("/favicon.ico", { method: "GET" })
  assert.equal(res.status, 302)
  assert.equal(res.headers.get("location"), "https://res.oplist.org/logo/logo.svg")
})
