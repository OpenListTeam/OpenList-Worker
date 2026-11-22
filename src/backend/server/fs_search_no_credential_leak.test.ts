import assert from "node:assert/strict"
import http from "node:http"
import { test, after } from "node:test"
import { Hono } from "hono"
import { fsRouter } from "./fs"
import { rawRouter } from "./raw"
import { saveDb } from "../internal/model/db"
import { search } from "../internal/op/search"

/**
 * Issue #204 回归测试：[BUG] 启用 guest 后 /api/fs/search 对未认证访客泄露
 * 上游存储凭据（raw_url_headers）。
 *
 * 现象（issue 原文，WebDAV 上游 Koofr + Basic 认证）：
 *   POST /api/fs/search {"parent":"/","keywords":"","scope":0,"page":1,"per_page":0}
 *   → HTTP 200，结果项里带
 *     "raw_url": "https://<上游WEBDAV主机>/dav/Koofr/..."
 *     "raw_url_headers": { "Authorization": "Basic <REDACTED base64>" }
 *   该 Basic 凭据解码后就是上游 WebDAV 账号口令，实测可直接绕过 OpenList
 *   访问后端存储（405/200 而非 401）；S3 场景下 raw_url 则是预签名 URL。
 *
 * 根因：
 *   1. WebDAV 驱动的 list() 会为每个文件项填充 raw_url（上游直链）与
 *      raw_url_headers（getLink() → getAuthHeaders() 的 Basic 认证头）；
 *   2. op/search.ts 的 walk() 把 listItems() 返回的驱动原始对象原样收进
 *      matches 并序列化返回——SearchResultItem extends FileItem，没有任何
 *      脱敏。对比：/fs/list 在 handler 层做了字段白名单，/fs/get 返回的是
 *      本站 /api/p、/api/d 地址；Go 版搜索响应只有节点元数据，两者都不泄露。
 *   3. 放大条件：getUserFromContext 对无 Authorization 头的请求回退到
 *      guest 账号（与 Go Auth(false) 对齐），guest 启用时未认证访客即可
 *      调用全部读接口。
 *
 * 修复：search() 出口统一经 toPublicFileItem() 白名单脱敏（FileItem 层），
 *   剥离 raw_url / raw_url_headers / raw_url_error，sign 恒为空（下载签名
 *   由 server 层统一签发；admin 索引/扫描也复用 search()，落库数据随之干净）。
 *
 * 测试方式：起一个本地 mock WebDAV 上游（强制 Basic 认证），挂真实
 * WebdavDriver，端到端复现 issue 的请求路径。
 */

const UPSTREAM_USER = "koofr-user"
const UPSTREAM_PASS = "koofr-Secret-123"
const UPSTREAM_AUTH =
  "Basic " + Buffer.from(`${UPSTREAM_USER}:${UPSTREAM_PASS}`).toString("base64")

const DAV_MODIFIED = "Wed, 12 Nov 2025 08:00:00 GMT"

/** 单个 multistatus <d:response> 条目 */
function davEntry(
  href: string,
  name: string,
  folder: boolean,
  size = 0,
): string {
  return (
    `<d:response><d:href>${href}</d:href>` +
    `<d:propstat><d:prop>` +
    `<d:displayname>${name}</d:displayname>` +
    `<d:resourcetype>${folder ? "<d:collection/>" : ""}</d:resourcetype>` +
    (folder ? "" : `<d:getcontentlength>${size}</d:getcontentlength>`) +
    `<d:getlastmodified>${DAV_MODIFIED}</d:getlastmodified>` +
    `</d:prop><d:status>HTTP/1.1 200 OK</d:status></d:propstat></d:response>`
  )
}

const DAV_MULTISTATUS = (entries: string[]) =>
  `<?xml version="1.0" encoding="utf-8"?>` +
  `<d:multistatus xmlns:d="DAV:">${entries.join("")}</d:multistatus>`

/**
 * mock 上游 WebDAV 服务器（模拟 Koofr 这类 Basic 认证的 WebDAV 服务）。
 * 目录树：
 *   /dav/               (collection)
 *     ├── docs/         (collection)
 *     │     └── plan.txt      (45 bytes)
 *     └── secret.json         (123 bytes)
 */
const upstreamReady: Promise<{ server: http.Server; origin: string }> = (() => {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const auth = req.headers["authorization"]
      if (auth !== UPSTREAM_AUTH) {
        res.writeHead(401, { "WWW-Authenticate": 'Basic realm="koofr"' })
        res.end()
        return
      }

      const origin = `http://127.0.0.1:${(server.address() as any).port}`
      const pathname = new URL(req.url!, origin).pathname.replace(/\/+$/, "")

      if (req.method === "PROPFIND") {
        const depth = String(req.headers["depth"] || "0")
        const root = [
          davEntry("/dav/", "dav", true),
          davEntry("/dav/docs/", "docs", true),
          davEntry("/dav/secret.json", "secret.json", false, 123),
          davEntry("/dav/docs/plan.txt", "plan.txt", false, 45),
        ]
        if (pathname === "/dav") {
          res.writeHead(207, { "Content-Type": "application/xml" })
          // self 条目必须在最前（解析器按首个 href 命中判 self）
          res.end(DAV_MULTISTATUS(depth === "0" ? [root[0]] : root))
          return
        }
        if (pathname === "/dav/docs") {
          res.writeHead(207, { "Content-Type": "application/xml" })
          res.end(
            DAV_MULTISTATUS(depth === "0" ? [root[1]] : [root[1], root[3]]),
          )
          return
        }
        if (pathname === "/dav/secret.json") {
          res.writeHead(207, { "Content-Type": "application/xml" })
          res.end(DAV_MULTISTATUS([root[2]]))
          return
        }
        res.writeHead(404)
        res.end()
        return
      }

      if (req.method === "GET" && pathname === "/dav/secret.json") {
        res.writeHead(200, { "Content-Type": "application/json" })
        res.end('{"hello":"koofr"}')
        return
      }

      res.writeHead(405)
      res.end()
    })
    server.listen(0, "127.0.0.1", () => {
      const port = (server.address() as any).port
      resolve({ server, origin: `http://127.0.0.1:${port}` })
    })
  })
})()

after(async () => {
  const { server } = await upstreamReady
  await new Promise<void>((resolve) => server.close(() => resolve()))
})

/** 挂一个启用 guest 的库 + 指向 mock 上游的 WebDAV 存储（对齐 issue 前置条件） */
async function saveGuestDb(storageId: string) {
  const { origin } = await upstreamReady
  const env: any = {}
  await saveDb(
    {
      settings: [{ key: "sign_all", value: "true" }],
      users: [
        {
          id: 2,
          username: "guest",
          password: "",
          role: 1,
          permission: 0,
          base_path: "/",
          disabled: false, // ← issue 的关键前置：guest 处于启用状态
        },
      ],
      storages: [
        {
          id: storageId,
          driver: "WebDav",
          mount_path: "/webdav",
          addition: JSON.stringify({
            address: `${origin}/dav`,
            username: UPSTREAM_USER,
            password: UPSTREAM_PASS,
            vendor: "other",
            root_folder_path: "/",
          }),
          modified: "2026-01-01T00:00:00.000Z",
          disabled: false,
          web_proxy: true,
        },
      ],
      shares: [],
      metas: [],
    },
    env,
  )
  return env
}

const appOf = () => {
  const app = new Hono()
  app.route("/api/fs", fsRouter)
  app.route("/api/p", rawRouter)
  return app
}

test("fs/search: 启用 guest 时未认证访客的搜索结果不得携带上游凭据（Issue #204）", async () => {
  await saveGuestDb("s-search-guest")
  const app = appOf()

  // 与 issue 复现步骤完全一致：无 Authorization 头 → 匿名回退 guest
  const res = await app.request("/api/fs/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      parent: "/",
      keywords: "",
      scope: 0,
      page: 1,
      per_page: 50,
    }),
  })
  assert.equal(res.status, 200)
  const body: any = await res.json()
  assert.equal(body.code, 200, `fs/search failed: ${JSON.stringify(body)}`)

  const content = body.data?.content || []
  assert.ok(
    content.length >= 2,
    `search should traverse into the mount point and find files, got ${content.length}`,
  )

  // 核心断言：整个响应体不得出现上游直链/鉴权头痕迹
  const bodyText = JSON.stringify(body)
  assert.ok(!bodyText.includes("raw_url"), "response must not contain raw_url")
  assert.ok(
    !bodyText.toLowerCase().includes("authorization"),
    "response must not contain authorization headers",
  )
  assert.ok(
    !bodyText.includes("Basic "),
    "upstream Basic credential must not leak",
  )

  for (const item of content) {
    assert.ok(!("raw_url" in item), `raw_url leaked for ${item.name}`)
    assert.ok(
      !("raw_url_headers" in item),
      `raw_url_headers leaked for ${item.name}`,
    )
    assert.ok(!("raw_url_error" in item))
    assert.equal(item.sign, "", "driver-side sign must not be exposed")
    assert.ok(typeof item.name === "string")
    assert.ok(typeof item.parent === "string")
    assert.ok(typeof item.size === "number")
    assert.ok(typeof item.is_dir === "boolean")
  }

  // 脱敏的同时搜索功能本身不能坏：能搜到挂载点内的文件与元数据
  const secret = content.find((i: any) => i.name === "secret.json")
  assert.ok(secret, "secret.json should be found under /webdav")
  assert.equal(secret.parent, "/webdav")
  assert.equal(secret.size, 123)
  assert.equal(secret.is_dir, false)
  const plan = content.find((i: any) => i.name === "plan.txt")
  assert.ok(plan, "plan.txt should be found under /webdav/docs")
  assert.equal(plan.parent, "/webdav/docs")
})

test("fs/search 修复后凭据仍只在服务端使用：/fs/get + /p 全链路可下载", async () => {
  const { origin } = await upstreamReady
  await saveGuestDb("s-search-download")
  const app = appOf()

  // 负向对照：证明 mock 上游的凭据是真实生效的（无凭据 → 401，同 issue 的验证方式）
  const noAuth = await fetch(`${origin}/dav/secret.json`)
  assert.equal(noAuth.status, 401)
  const withAuth = await fetch(`${origin}/dav/secret.json`, {
    headers: { Authorization: UPSTREAM_AUTH },
  })
  assert.equal(withAuth.status, 200)

  // /fs/get 依旧工作：返回的是本站代理地址 + 签名，不含上游鉴权头
  const res = await app.request("/api/fs/get", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path: "/webdav/secret.json" }),
  })
  assert.equal(res.status, 200)
  const body: any = await res.json()
  assert.equal(body.code, 200, `fs/get failed: ${JSON.stringify(body)}`)
  const getBodyText = JSON.stringify(body)
  assert.ok(
    !getBodyText.includes("Basic "),
    "/fs/get must not leak upstream credentials",
  )
  assert.ok(!("raw_url_headers" in (body.data || {})))
  const rawUrl: string = body.data.raw_url
  assert.ok(
    rawUrl.startsWith("/api/p/webdav/secret.json"),
    `raw_url should stay a site proxy url, got ${rawUrl}`,
  )
  assert.ok(/[?&]sign=/.test(rawUrl), "raw_url must carry the download sign")

  // 端到端：凭据只在服务端使用，经 /p 代理仍能拿到文件内容
  const hit = await app.request(rawUrl, { method: "GET" })
  assert.equal(hit.status, 200, `proxy download failed: ${hit.status}`)
  assert.equal(await hit.text(), '{"hello":"koofr"}')
})

test("search(): op 层出口统一脱敏（覆盖 admin 索引/扫描落库场景）", async () => {
  await saveGuestDb("s-search-op")
  const result = await search({
    parent: "/",
    keywords: "",
    page: 1,
    per_page: 50,
  })
  const text = JSON.stringify(result)
  assert.ok(
    !text.includes("raw_url"),
    "op search result must not contain raw_url",
  )
  assert.ok(
    !text.includes("Basic "),
    "op search result must not contain upstream credentials",
  )
  const secret = result.content.find((i) => i.name === "secret.json")
  assert.ok(secret, "op search should find secret.json")
  assert.equal(secret.parent, "/webdav")
  assert.equal(secret.sign, "")
})

test("search(): 普通登录用户（非 guest）的搜索结果同样不泄露", async () => {
  const env = await saveGuestDb("s-search-user")
  const result = await search(
    {
      parent: "/",
      keywords: "",
      page: 1,
      per_page: 50,
      user: {
        id: 10,
        username: "alice",
        role: 1,
        permission: 0,
        base_path: "/",
      },
    },
    env,
  )
  const text = JSON.stringify(result)
  assert.ok(
    !text.includes("raw_url"),
    "authenticated user search must not contain raw_url",
  )
  assert.ok(
    !text.includes("Basic "),
    "authenticated user search must not contain upstream credentials",
  )
  assert.ok(result.content.length >= 2)
})
