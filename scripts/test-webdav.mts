import app from "../src/backend/index"
import { getDriver } from "../src/backend/internal/op/storage"
import { WebdavDriver, normalizeWebdavAddition } from "../src/backend/drivers/webdav/driver"
import { parseMultistatusXml, WebdavClient, joinPath, pathEscape } from "../src/backend/drivers/webdav/util"

let pass = 0
let fail = 0

async function test(name: string, fn: () => Promise<void> | void) {
  try {
    await fn()
    pass++
    console.log(`✅ ${name}`)
  } catch (e: any) {
    fail++
    console.error(`❌ ${name}:`, e.message)
  }
}

// 1. Test XML Parsing
await test("WebDAV Multistatus XML 解析", () => {
  const sampleXml = `<?xml version="1.0" encoding="utf-8" ?>
<D:multistatus xmlns:D="DAV:">
  <D:response>
    <D:href>/remote.php/dav/files/admin/testdir/</D:href>
    <D:propstat>
      <D:prop>
        <D:displayname>testdir</D:displayname>
        <D:resourcetype><D:collection/></D:resourcetype>
        <D:getlastmodified>Thu, 20 Aug 2026 12:00:00 GMT</D:getlastmodified>
      </D:prop>
      <D:status>HTTP/1.1 200 OK</D:status>
    </D:propstat>
  </D:response>
  <D:response>
    <D:href>/remote.php/dav/files/admin/testdir/subfolder/</D:href>
    <D:propstat>
      <D:prop>
        <D:displayname>subfolder</D:displayname>
        <D:resourcetype><D:collection/></D:resourcetype>
        <D:getlastmodified>Thu, 20 Aug 2026 12:30:00 GMT</D:getlastmodified>
      </D:prop>
      <D:status>HTTP/1.1 200 OK</D:status>
    </D:propstat>
  </D:response>
  <D:response>
    <D:href>/remote.php/dav/files/admin/testdir/sample%20file.mp4</D:href>
    <D:propstat>
      <D:prop>
        <D:displayname>sample file.mp4</D:displayname>
        <D:getcontentlength>10485760</D:getcontentlength>
        <D:getcontenttype>video/mp4</D:getcontenttype>
        <D:getetag>"abcdef123456"</D:getetag>
        <D:getlastmodified>Thu, 20 Aug 2026 13:00:00 GMT</D:getlastmodified>
      </D:prop>
      <D:status>HTTP/1.1 200 OK</D:status>
    </D:propstat>
  </D:response>
</D:multistatus>`

  const { self, items } = parseMultistatusXml(sampleXml, "/remote.php/dav/files/admin/testdir/")
  if (!self) throw new Error("Self item not recognized")
  if (!self.isFolder) throw new Error("Self item should be folder")
  if (items.length !== 2) throw new Error(`Expected 2 items, got ${items.length}`)

  const folder = items.find((i) => i.name === "subfolder")
  if (!folder || !folder.isFolder) throw new Error("Subfolder item missing or not marked as folder")

  const file = items.find((i) => i.name === "sample file.mp4")
  if (!file) throw new Error("File item missing")
  if (file.isFolder) throw new Error("File item marked as folder")
  if (file.size !== 10485760) throw new Error(`Expected size 10485760, got ${file.size}`)
  if (file.contentType !== "video/mp4") throw new Error(`Expected contentType video/mp4, got ${file.contentType}`)
  if (file.etag !== "abcdef123456") throw new Error(`Expected etag abcdef123456, got ${file.etag}`)
})

// 2. Test Path Utilities
await test("WebDAV 路径辅助函数", () => {
  if (joinPath("/a/b", "c/d") !== "/a/b/c/d") throw new Error("joinPath failed")
  if (joinPath("/a/b/", "/c/d") !== "/a/b/c/d") throw new Error("joinPath trailing/leading slashes failed")
  if (pathEscape("test dir/file 1.txt") !== "test%20dir/file%201.txt") throw new Error("pathEscape failed")
})

// 3. Test Driver Addition Normalization
await test("WebDAV Addition 参数标准化", () => {
  const norm = normalizeWebdavAddition({
    address: "https://dav.example.com/webdav/ ",
    username: " user1 ",
    password: "secret",
    root_folder_path: "myroot",
  })
  if (norm.address !== "https://dav.example.com/webdav/") throw new Error("address trim failed")
  if (norm.username !== "user1") throw new Error("username trim failed")
  if (norm.root_folder_path !== "/myroot") throw new Error("root_folder_path leading slash failed")
  if (norm.vendor !== "other") throw new Error("vendor default failed")
  if (norm.order_by !== "name") throw new Error("order_by default failed")
})

// 4. Test Storage Driver Factory Integration
await test("Storage Driver 工厂获取 WebDav", async () => {
  const driver = await getDriver("WebDav", {
    id: 100,
    driver: "WebDav",
    modified: "2026-08-21T00:00:00Z",
    addition: JSON.stringify({
      address: "https://dav.example.com",
      username: "user",
      password: "pass",
    }),
  })
  if (!driver) throw new Error("Driver instantiation returned null")
  if (!(driver instanceof WebdavDriver)) throw new Error("Driver is not instance of WebdavDriver")
})

// 5. Test Admin API /driver/names and /driver/info with Login Token
const loginRes = await app.request("/api/auth/login", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ username: "admin", password: "admin" }),
})
const loginJson: any = await loginRes.json()
const token = loginJson.data?.token
const authHeaders = { Authorization: `Bearer ${token}` }

await test("Admin API /driver/names 包含 WebDav", async () => {
  const res = await app.request("/api/admin/driver/names", { headers: authHeaders })
  const json = await res.json()
  if (json.code !== 200) throw new Error(`status code ${json.code}`)
  if (!json.data.includes("WebDav")) throw new Error("WebDav not found in /driver/names")
})

await test("Admin API /driver/info?driver=WebDav 返回正确元数据", async () => {
  const res = await app.request("/api/admin/driver/info?driver=WebDav", { headers: authHeaders })
  const json = await res.json()
  if (json.code !== 200) throw new Error(`status code ${json.code}`)
  if (json.data.name !== "WebDav") throw new Error(`Expected driver name WebDav, got ${json.data.name}`)
  const fieldNames = (json.data.additional || []).map((f: any) => f.name)
  for (const expected of ["vendor", "address", "username", "password", "root_folder_path", "tls_insecure_skip_verify", "order_by", "order_direction"]) {
    if (!fieldNames.includes(expected)) throw new Error(`Missing expected field: ${expected}`)
  }
})

// 6. Test WebdavDriver operations with mocked fetch
await test("WebDavDriver 接口模拟测试 (list, get, mkdir, rename, remove, put)", async () => {
  const driver = new WebdavDriver({
    address: "https://dav.mock.test/webdav",
    username: "testuser",
    password: "testpass",
    root_folder_path: "/data",
  })

  const mockXml = `<?xml version="1.0" encoding="utf-8" ?>
<D:multistatus xmlns:D="DAV:">
  <D:response>
    <D:href>/webdav/data/</D:href>
    <D:propstat>
      <D:prop>
        <D:resourcetype><D:collection/></D:resourcetype>
      </D:prop>
      <D:status>HTTP/1.1 200 OK</D:status>
    </D:propstat>
  </D:response>
  <D:response>
    <D:href>/webdav/data/movie.mkv</D:href>
    <D:propstat>
      <D:prop>
        <D:displayname>movie.mkv</D:displayname>
        <D:getcontentlength>2048</D:getcontentlength>
        <D:getcontenttype>video/x-matroska</D:getcontenttype>
        <D:getlastmodified>Thu, 20 Aug 2026 12:00:00 GMT</D:getlastmodified>
      </D:prop>
      <D:status>HTTP/1.1 200 OK</D:status>
    </D:propstat>
  </D:response>
</D:multistatus>`

  const originalFetch = globalThis.fetch
  try {
    (globalThis as any).fetch = async (url: string, init?: RequestInit) => {
      const method = (init?.method || "GET").toUpperCase()
      if (method === "PROPFIND") {
        return new Response(mockXml, {
          status: 207,
          headers: { "Content-Type": "application/xml" },
        })
      }
      if (method === "MKCOL") {
        return new Response("", { status: 201 })
      }
      if (method === "MOVE" || method === "COPY") {
        return new Response("", { status: 201 })
      }
      if (method === "DELETE") {
        return new Response(null, { status: 204 })
      }
      if (method === "PUT") {
        return new Response("", { status: 201 })
      }
      return new Response("Not Found", { status: 404 })
    }

    const items = await driver.list("/data", "/")
    if (items.length !== 1) throw new Error(`Expected 1 item, got ${items.length}`)
    if (items[0].name !== "movie.mkv") throw new Error(`Expected item name movie.mkv, got ${items[0].name}`)
    if (items[0].type !== 2) throw new Error(`Expected file type 2 (video), got ${items[0].type}`)
    if (!items[0].raw_url) throw new Error("raw_url should be set")
    if (!items[0].raw_url_headers?.Authorization?.startsWith("Basic ")) {
      throw new Error("Authorization header should be Basic auth")
    }

    const file = await driver.get("/data/movie.mkv", "/movie.mkv")
    if (file.name !== "movie.mkv") throw new Error(`Expected file name movie.mkv, got ${file.name}`)

    await driver.mkdir("/data/newdir", "/newdir")
    await driver.rename("/data/movie.mkv", "/movie.mkv", "renamed.mkv")
    await driver.move("/data", "/data/backup", ["movie.mkv"], "/", "/backup")
    await driver.copy("/data", "/data/backup", ["movie.mkv"], "/", "/backup")
    await driver.remove("/data", "/movie.mkv", [])
    await driver.put("/data/test.txt", "/test.txt", Buffer.from("hello world"))
  } finally {
    globalThis.fetch = originalFetch
  }
})

console.log(`\nWebDAV 测试结果: ${pass} 通过, ${fail} 失败`)
if (fail > 0) process.exit(1)
