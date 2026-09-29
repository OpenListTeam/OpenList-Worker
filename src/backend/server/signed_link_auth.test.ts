import assert from "node:assert/strict"
import { test } from "node:test"
import { Hono } from "hono"
import { rawRouter } from "./raw"
import { saveDb } from "../internal/model/db"
import { signDownloadPath, needDownloadSign, metaCoversPath } from "../pkg/sign"

/**
 * /p、/d 下载端点的鉴权语义 —— 对齐 Go 实现。
 *
 * Go server/router.go：
 *   r.GET("/d/*path", middlewares.PathParse, middlewares.Down(sign.Verify), ...)
 *   r.GET("/p/*path", middlewares.PathParse, middlewares.Down(sign.Verify), ...)
 *
 * 这两条路由**没有 Auth 中间件**。是否放行完全由
 * server/middlewares.needSign 决定：
 *   sign_all || storage.EnableSign || (meta.Password != "" && 覆盖该路径)
 * 都不满足时，端点是公开的。
 *
 * TS 版曾在此处额外要求登录用户，导致 guest 被禁用后
 * 列目录 / 播放视频全部 401。
 */

const dbWith = (
  settings: Array<{ key: string; value: string }> = [],
  metas: any[] = [],
) => ({
  settings,
  users: [
    {
      id: 1,
      username: "admin",
      password: "xxx",
      role: 2,
      permission: 0,
      base_path: "/",
      disabled: false,
    },
  ],
  storages: [],
  shares: [],
  metas,
})

const appOf = () => {
  const app = new Hono()
  app.route("/p", rawRouter)
  return app
}

// ---------------------------------------------------------------------------
// needSign 判定（对齐 Go middlewares.needSign）
// ---------------------------------------------------------------------------

test("needSign: false by default (sign_all off, no meta) — endpoint is public", async () => {
  const env: any = {}
  await saveDb(dbWith(), env)
  assert.equal(await needDownloadSign({ env }, "/README.md"), false)
})

test("needSign: true when sign_all is enabled", async () => {
  const env: any = {}
  await saveDb(dbWith([{ key: "sign_all", value: "true" }]), env)
  assert.equal(await needDownloadSign({ env }, "/README.md"), true)
})

test("needSign: true when a password-protected meta covers the path", async () => {
  const env: any = {}
  await saveDb(
    dbWith([], [{ id: 1, path: "/private", password: "s3cr3t", p_sub: true }]),
    env,
  )
  assert.equal(await needDownloadSign({ env }, "/private/a/b.txt"), true)
  // 未被 meta 覆盖的路径仍然公开
  assert.equal(await needDownloadSign({ env }, "/public/c.txt"), false)
})

test("needSign: meta without password does not require sign", async () => {
  const env: any = {}
  await saveDb(
    dbWith([], [{ id: 1, path: "/x", password: "", p_sub: true }]),
    env,
  )
  assert.equal(await needDownloadSign({ env }, "/x/y.txt"), false)
})

test("metaCoversPath mirrors Go common.MetaCoversPath", () => {
  assert.equal(metaCoversPath("/a", "/a", false), true)
  assert.equal(metaCoversPath("/a", "/a/b", false), false)
  assert.equal(metaCoversPath("/a", "/a/b/c", true), true)
  assert.equal(metaCoversPath("/a", "/b/c", true), false)
})

// ---------------------------------------------------------------------------
// 端点行为
// ---------------------------------------------------------------------------

test("public endpoint: anonymous request is not 401 when no sign required", async () => {
  const env: any = {}
  await saveDb(dbWith(), env)

  const res = await appOf().request("/p/README.md", { method: "GET" })
  // 测试库无该存储 → 路径解析失败（非 401）
  assert.notEqual(
    res.status,
    401,
    `Public endpoint must not 401 anonymously (got ${res.status})`,
  )
})

test("sign_all on: valid sign is accepted without any Authorization header", async () => {
  const env: any = {}
  await saveDb(dbWith([{ key: "sign_all", value: "true" }]), env)

  const sign = await signDownloadPath({ env }, "/README.md", 3600)
  const res = await appOf().request(
    `/p/README.md?sign=${encodeURIComponent(sign)}`,
    { method: "GET" },
  )
  assert.notEqual(
    res.status,
    401,
    `Valid sign must be accepted (got ${res.status})`,
  )
})

test("sign_all on: missing sign is rejected with 401", async () => {
  const env: any = {}
  await saveDb(dbWith([{ key: "sign_all", value: "true" }]), env)

  const res = await appOf().request("/p/README.md", { method: "GET" })
  assert.equal(res.status, 401)
})

test("sign_all on: tampered sign is rejected with 401", async () => {
  const env: any = {}
  await saveDb(dbWith([{ key: "sign_all", value: "true" }]), env)

  const sign = await signDownloadPath({ env }, "/README.md", 3600)
  const tampered = sign.slice(0, -1) + (sign.endsWith("a") ? "b" : "a")
  const res = await appOf().request(
    `/p/README.md?sign=${encodeURIComponent(tampered)}`,
    { method: "GET" },
  )
  assert.equal(res.status, 401)
})

test("sign_all on: sign issued for another path is rejected with 401", async () => {
  const env: any = {}
  await saveDb(dbWith([{ key: "sign_all", value: "true" }]), env)

  const sign = await signDownloadPath({ env }, "/secret.md", 3600)
  const res = await appOf().request(
    `/p/README.md?sign=${encodeURIComponent(sign)}`,
    { method: "GET" },
  )
  assert.equal(res.status, 401)
})

test("sign_all on: expired sign is rejected with 401", async () => {
  const env: any = {}
  await saveDb(dbWith([{ key: "sign_all", value: "true" }]), env)

  const sign = await signDownloadPath({ env }, "/README.md", -10)
  const res = await appOf().request(
    `/p/README.md?sign=${encodeURIComponent(sign)}`,
    { method: "GET" },
  )
  assert.equal(res.status, 401)
})

test("password-protected meta: missing sign is rejected even with sign_all off", async () => {
  const env: any = {}
  await saveDb(
    dbWith([], [{ id: 1, path: "/private", password: "s3cr3t", p_sub: true }]),
    env,
  )

  const res = await appOf().request("/p/private/a.txt", { method: "GET" })
  assert.equal(
    res.status,
    401,
    "Password-protected paths must require a sign (parity with Go needSign)",
  )
})
