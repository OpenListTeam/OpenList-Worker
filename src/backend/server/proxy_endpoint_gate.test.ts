import assert from "node:assert/strict"
import { test } from "node:test"
import { Hono } from "hono"
import { rawRouter } from "./raw"
import { saveDb } from "../internal/model/db"

/**
 * `/p` 公开代理端点的准入判定 —— 对齐 Go server/handles/down.go 的 canProxy()：
 * 未开启代理、且扩展名也不在 proxy_types / text_types 里时返回
 * 403 `proxy not allowed`（Go 只对 /p 与归档 /ap 做该检查，/d、/sd 不做）。
 *
 * 这里只覆盖**拒绝**路径：拒绝发生在取上游下载链接之前，因此不会访问网络。
 * 「允许」路径（web_proxy / MustProxy / text_types / proxy_types / use_proxy_url）
 * 由 internal/driver/proxy.test.ts 的 canUseProxyEndpoint 单测覆盖。
 */

const dbWith = (storage: any, settings: any[] = []) => ({
  settings: [
    { key: "proxy_types", value: "m3u8,url" },
    { key: "text_types", value: "txt,md,srt,lrc" },
    ...settings,
  ],
  users: [
    {
      id: 1,
      username: "admin",
      password: "x",
      role: 2,
      permission: 0,
      base_path: "/",
      disabled: false,
    },
  ],
  storages: [
    {
      id: 1,
      mount_path: "/one",
      driver: "Onedrive",
      addition: "{}",
      status: "work",
      disabled: false,
      ...storage,
    },
  ],
  shares: [],
  metas: [],
})

const appOf = () => {
  const app = new Hono()
  app.route("/p", rawRouter)
  return app
}

test("/p：未开启代理的存储 + 非文本扩展名 → 403 proxy not allowed", async () => {
  const env: any = {}
  await saveDb(dbWith({}), env)
  const res = await appOf().request("/p/one/movie.mp4", { method: "GET" }, env)
  assert.equal(res.status, 403)
  assert.match(await res.text(), /proxy not allowed/)
})

test("/p：无扩展名的路径同样被拒绝", async () => {
  const env: any = {}
  await saveDb(dbWith({}), env)
  const res = await appOf().request("/p/one/binaryblob", { method: "GET" }, env)
  assert.equal(res.status, 403)
})

test("/p：关闭代理但属于 text_types 的文本文件仍然放行（不再 403）", async () => {
  // 放行后进入下游逻辑（取链接），此处只断言「没有被准入检查拦下」；
  // 使用不会产生网络请求的路径：目录式结尾会让后续逻辑直接返回 4xx。
  const env: any = {}
  await saveDb(dbWith({ driver: "NotADriver" }), env)
  const res = await appOf().request("/p/one/readme.md", { method: "GET" }, env)
  assert.notEqual(res.status, 403)
})
