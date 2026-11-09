import assert from "node:assert/strict"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { test } from "node:test"
import { Hono } from "hono"
import { webdavRouter } from "./webdav"
import { rawRouter } from "./raw"
import { saveDb } from "../internal/model/db"
import { verifyDownloadSign } from "../pkg/sign"

/**
 * Issue #175 回归测试：[BUG] 将 OpenList 以 WebDAV 挂载第三方，播放视频失败。
 *
 * 现象（issue 原文）：
 *   http request https://example.com/dav/r2/example.mp4 failure, status: 401
 *   response: sign verify failed
 *   目录浏览正常、文件也能列出来，一点播放就 401（Infuse / WebDAV 挂载）。
 *
 * 根因：WebDAV 的 GET/HEAD 只是把 getItem() 给的 rawUrl（`/api/p/<path>` 或
 * `/api/d/<path>`）302 出去，**从不补签名**。而 /d、/p 没有 Auth 中间件，是否
 * 放行只取决于 needDownloadSign：sign_all、link_expiration、存储级 enable_sign、
 * 密码 meta 任一命中就必须带 `?sign=`，否则直接 401 sign verify failed。
 * 该路径与 Issue #66（/fs/get 的 raw_url 缺签名）同源，当时只修了 /fs/get。
 */

const tmpRoots: string[] = []

/** 建一个临时目录并放入一个真实文件，挂成 Local 存储的根。 */
function makeLocalRoot(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "openlist-dav-sign-"))
  fs.writeFileSync(path.join(root, "a.mp4"), "fake-mp4-bytes")
  tmpRoots.push(root)
  return root
}

/**
 * 一般用户（role=0）+ 仅 WEBDAV_READ 权限 + base_path 受限，
 * 复刻 issue 里「创建一般用户，给予 WebDAV 读取权限」的场景。
 * 密码留空：webdavAuth 对空密码用户接受 `Basic base64("alice:")`。
 */
const dbWith = (
  root: string,
  settings: Array<{ key: string; value: string }> = [],
) => ({
  settings,
  users: [
    {
      id: 1,
      username: "alice",
      password: "",
      role: 0,
      permission: 1 << 8, // WEBDAV_READ
      base_path: "/local",
      disabled: false,
    },
    {
      id: 2,
      username: "guest",
      password: "",
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
  app.route("/dav", webdavRouter)
  app.route("/api/p", rawRouter)
  app.route("/api/d", rawRouter)
  return app
}

const DAV_AUTH = {
  Authorization: `Basic ${Buffer.from("alice:").toString("base64")}`,
}

const signOf = (url: string) =>
  new URL(url, "http://localhost").searchParams.get("sign") || ""

test("WebDAV GET 重定向必须带签名，且该签名能通过 raw 端点验签（Issue #175）", async () => {
  const env: any = {}
  const root = makeLocalRoot()
  await saveDb(dbWith(root, [{ key: "sign_all", value: "true" }]), env)

  const app = appOf()
  const res = await app.request("/dav/a.mp4", { headers: DAV_AUTH })
  assert.equal(res.status, 302)

  const location = res.headers.get("Location") || ""
  assert.ok(
    /^\/api\/[pd]\/local\/a\.mp4/.test(location),
    `WebDAV must redirect to the raw endpoint, got ${location}`,
  )
  // 缺这一条就是 bug 本体：客户端随后拿到 401 sign verify failed
  assert.ok(
    /[?&]sign=/.test(location),
    `redirect target must carry the download sign, got ${location}`,
  )
  assert.equal(
    await verifyDownloadSign(env, "/local/a.mp4", signOf(location)),
    true,
  )

  // 端到端：跟随 302（浏览器/播放器行为）不能再 401
  const hit = await app.request(location, { method: "GET" })
  assert.notEqual(
    hit.status,
    401,
    "raw target from the WebDAV redirect must pass signature verification",
  )
})

test("WebDAV HEAD 同样带签名（播放器常用先探测再拉流）", async () => {
  const env: any = {}
  const root = makeLocalRoot()
  await saveDb(dbWith(root, [{ key: "sign_all", value: "true" }]), env)

  const res = await appOf().request("/dav/a.mp4", {
    method: "HEAD",
    headers: DAV_AUTH,
  })
  assert.equal(res.status, 302)
  const location = res.headers.get("Location") || ""
  assert.ok(/[?&]sign=/.test(location), `got ${location}`)
  assert.equal(
    await verifyDownloadSign(env, "/local/a.mp4", signOf(location)),
    true,
  )
})

test("不需要签名时不追加 sign（保持公开直链语义）", async () => {
  const env: any = {}
  const root = makeLocalRoot()
  await saveDb(dbWith(root), env)

  const res = await appOf().request("/dav/a.mp4", { headers: DAV_AUTH })
  assert.equal(res.status, 302)
  const location = res.headers.get("Location") || ""
  assert.equal(
    /[?&]sign=/.test(location),
    false,
    `public path keeps a bare raw url, got ${location}`,
  )
})

test("被篡改的签名仍应 401（对照，证明断言有效）", async () => {
  const env: any = {}
  const root = makeLocalRoot()
  await saveDb(dbWith(root, [{ key: "sign_all", value: "true" }]), env)

  const res = await appOf().request("/dav/a.mp4", { headers: DAV_AUTH })
  const location = res.headers.get("Location") || ""
  const sign = signOf(location)
  const tampered = sign.slice(0, -1) + (sign.endsWith("a") ? "b" : "a")
  const hit = await appOf().request(
    `${location.split("?")[0]}?sign=${encodeURIComponent(tampered)}`,
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
