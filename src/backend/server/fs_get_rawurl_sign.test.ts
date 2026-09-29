import assert from "node:assert/strict"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { test } from "node:test"
import { Hono } from "hono"
import { fsRouter } from "./fs"
import { rawRouter } from "./raw"
import { saveDb } from "../internal/model/db"
import { verifyDownloadSign } from "../pkg/sign"

/**
 * Issue #66 回归测试：[BUG] sign verify failed（下载 401，预览正常）。
 *
 * 现象（issue 原文）：
 *   GET https://xxx/api/p/存储1/7z2602-x64.exe → HTTP/2 401
 *   「下载文件出现 sign verify failed，不下载文件直接预览是正常的」
 *
 * 根因：/fs/get 返回的 raw_url 形如 `/api/p/<path>`，指向的正是需要验签的
 * /p 端点，但**从来没带 ?sign=**；而前端把 raw_url 直接当下载地址用
 *   - 预览页的下载按钮：<a href={objStore.raw_url}>（previews/download.tsx）
 *   - 图片/视频预览：<img src={objStore.raw_url}> / <video src={...}>
 * 不会再自己拼签名（只有文件列表里的 /d、/p 链接才会用 fs/list 返回的 sign）。
 *
 * 于是 sign_all / 存储级 enable_sign / 密码 meta 覆盖时：
 *   - .exe 这类「预览页只是元信息 + 下载按钮」的文件，页面能正常打开，
 *     一点下载就 401 —— 正是 issue 描述的现象；
 * 而 Go 版 server/handles/fsread.go FsGet 会显式补上：
 *   if isEncrypt(meta, reqPath) || setting.GetBool(conf.SignAll) {
 *       query = "?sign=" + sign.Sign(reqPath)
 *   }
 */

const tmpRoots: string[] = []

/** 建一个临时目录并放入一个真实文件，挂成 Local 存储的根。 */
function makeLocalRoot(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "openlist-rawurl-sign-"))
  fs.writeFileSync(path.join(root, "a.exe"), "MZ")
  tmpRoots.push(root)
  return root
}

const dbWith = (
  root: string,
  settings: Array<{ key: string; value: string }> = [],
) => ({
  settings,
  users: [
    {
      id: 1,
      username: "guest",
      password: "xxx",
      role: 1,
      permission: 0,
      base_path: "/",
      disabled: false,
    },
  ],
  storages: [
    {
      id: "s1",
      driver: "Local",
      mount_path: "/local",
      addition: JSON.stringify({ root_folder_path: root }),
      modified: "2026-01-01T00:00:00.000Z",
      disabled: false,
    },
  ],
  shares: [],
  metas: [],
})

const appOf = () => {
  const app = new Hono()
  app.route("/api/fs", fsRouter)
  app.route("/api/p", rawRouter)
  return app
}

const signOf = (rawUrl: string) =>
  new URL(rawUrl, "http://localhost").searchParams.get("sign") || ""

test("fs/get: raw_url 自带签名，且该签名能通过 /p 验签（Issue #66）", async () => {
  const env: any = {}
  const root = makeLocalRoot()
  await saveDb(dbWith(root, [{ key: "sign_all", value: "true" }]), env)

  const app = appOf()
  const res = await app.request("/api/fs/get", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path: "/local/a.exe" }),
  })
  const body: any = await res.json()
  assert.equal(body.code, 200, `fs/get failed: ${JSON.stringify(body)}`)

  const rawUrl: string = body.data.raw_url
  assert.ok(
    rawUrl.startsWith("/api/p/local/a.exe"),
    `raw_url should stay a proxy url, got ${rawUrl}`,
  )
  // 缺这一条就是 bug 本体：前端直接跳 raw_url，服务器却没拿到签名
  assert.ok(
    /[?&]sign=/.test(rawUrl),
    `raw_url must carry the download sign, got ${rawUrl}`,
  )
  // 客户端用的 sign 字段与 raw_url 里的必须一致（前端另一处用它拼 /d 链接）
  assert.equal(signOf(rawUrl), body.data.sign)
  assert.equal(await verifyDownloadSign(env, "/local/a.exe", body.data.sign), true)

  // 端到端：浏览器直接打开 raw_url 不能再 401（issue 里就是这一步）
  const hit = await app.request(rawUrl, { method: "GET" })
  assert.notEqual(
    hit.status,
    401,
    "raw_url returned by /fs/get must be accepted by /p (was 401 before the fix)",
  )
})

test("fs/get: 不需要签名时不追加 sign（保持公开直链语义）", async () => {
  const env: any = {}
  const root = makeLocalRoot()
  await saveDb(dbWith(root), env)

  const res = await appOf().request("/api/fs/get", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path: "/local/a.exe" }),
  })
  const body: any = await res.json()
  assert.equal(body.code, 200)
  assert.equal(body.data.sign, "")
  assert.equal(
    body.data.raw_url,
    "/api/p/local/a.exe",
    "public path keeps a bare proxy url",
  )
})

test("/p 幂等：raw_url 中的签名被篡改即 401（对照，证明断言有效）", async () => {
  const env: any = {}
  const root = makeLocalRoot()
  await saveDb(dbWith(root, [{ key: "sign_all", value: "true" }]), env)

  const app = appOf()
  const res = await app.request("/api/fs/get", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path: "/local/a.exe" }),
  })
  const body: any = await res.json()
  const sign: string = body.data.sign
  const tampered = sign.slice(0, -1) + (sign.endsWith("a") ? "b" : "a")

  const hit = await app.request(
    `/api/p/local/a.exe?sign=${encodeURIComponent(tampered)}`,
    { method: "GET" },
  )
  assert.equal(hit.status, 401)
})

test("cleanup", () => {
  for (const root of tmpRoots) {
    try {
      fs.rmSync(root, { recursive: true, force: true })
    } catch {}
  }
})
