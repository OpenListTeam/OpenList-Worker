import assert from "node:assert/strict"
import { test } from "node:test"
import { Hono } from "hono"
import { getItem } from "../internal/op/storage"
import { saveDb } from "../internal/model/db"
import { canUseProxyEndpoint } from "../internal/driver/proxy"
import { rawRouter } from "./raw"

/**
 * #66 后续：`raw_url` 的端点前缀必须与存储自身的代理配置匹配。
 *
 * `/p` 与 `/d` 不是等价的：
 *   - `/p` 会先跑 Go 的 `canProxy()`（`MustProxy || WebProxy || webdav_policy=
 *     use_proxy_url || proxy_types || text_types`），不通过直接
 *     `403 proxy not allowed`；
 *   - `/d` 不受该门禁限制（Go 的 `/d` 走 `ShouldProxy`）。
 *
 * 因此 raw_url 恒为 `/api/p` 时，凡是没有开启代理的存储，只要从预览页点「下载」
 * （或让 `img/video` 去取 raw_url）就会 403；而文件列表右键下载走 `/d`，所以看起来
 * 「只有预览页下载坏掉」。
 */

const storageRow = (driver: string, extra: Record<string, any> = {}) => ({
  id: "s1",
  driver,
  mount_path: "/np",
  addition: "{}",
  modified: "2026-01-01T00:00:00.000Z",
  disabled: false,
  ...extra,
})

const dbWith = (storages: any[], settings: any[] = []) => ({
  settings,
  users: [],
  storages,
  shares: [],
  metas: [],
})

const appOf = () => {
  const app = new Hono()
  app.route("/api/p", rawRouter)
  app.route("/api/d", rawRouter)
  return app
}

test("非代理存储：raw_url 用 /api/d（/p 会被 canProxy 拒绝）", async () => {
  const env: any = {}
  await saveDb(dbWith([storageRow("gen")]), env)

  const { rawUrl } = await getItem("/np", { env })
  assert.equal(rawUrl, "/api/d/np")
})

test("web_proxy=true 的存储：raw_url 用 /api/p", async () => {
  const env: any = {}
  await saveDb(dbWith([storageRow("gen", { web_proxy: true })]), env)

  const { rawUrl } = await getItem("/np", { env })
  assert.equal(rawUrl, "/api/p/np")
})

test("扩展名命中 proxy_types / text_types 时才允许 /p", () => {
  const storage = storageRow("gen")
  const check = (filename: string, proxyTypes: unknown, textTypes: unknown) =>
    canUseProxyEndpoint({
      storage,
      driver: "gen",
      filename,
      proxyTypes,
      textTypes,
    })

  assert.equal(check("/np/a.exe", [], []), false)
  assert.equal(check("/np/a.exe", ["exe"], []), true)
  assert.equal(check("/np/a.txt", [], ["txt"]), true)
})

test("HTTP 层面：/p 对非代理存储回 403 proxy not allowed，/d 不受该门禁限制", async () => {
  const env: any = {}
  await saveDb(dbWith([storageRow("gen")]), env)
  const app = appOf()

  const viaProxy = await app.request("/api/p/np/a.exe", { method: "GET" })
  assert.equal(viaProxy.status, 403)
  assert.match(await viaProxy.text(), /proxy not allowed/)

  // 同一路径走 /d：不触发 canProxy 门禁（这里会因驱动不存在而 404，但不能是 403）
  const viaDirect = await app.request("/api/d/np/a.exe", { method: "GET" })
  assert.notEqual(
    viaDirect.status,
    403,
    "/d 不应受 canProxy() 限制，否则非代理存储的下载/预览会全部 403",
  )
})
