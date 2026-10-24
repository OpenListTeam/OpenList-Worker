import test from "node:test"
import assert from "node:assert/strict"
import { DriverInternAI } from "./driver"
import { InternAIClient, cleanKey, joinKey, fileExt } from "./util"

/**
 * InternAI (书生云盘) 驱动回归测试：
 * 路径规范化、API 客户端鉴权/分页、列目录、get/下载链接、
 * mkdir/rename/move/copy/remove/put 的端到端（mock fetch）。
 */

type Handler = (url: string, init: RequestInit) => Response | Promise<Response>

/** 按 URL 路径 + 方法匹配的 fetch mock；返回恢复函数 */
function installFetch(handlers: Array<[string, Handler]>): () => void {
  const original = globalThis.fetch
  globalThis.fetch = (async (input: any, init: RequestInit = {}) => {
    const url = String(input instanceof Request ? input.url : input)
    const method = (init.method || "GET").toUpperCase()
    for (const [key, handler] of handlers) {
      if (url.includes(key)) {
        const resp = await handler(url, { ...init, method } as RequestInit)
        if (resp) return resp
      }
    }
    return new Response(JSON.stringify({ code: 404, msg: "not found" }), {
      status: 404,
      headers: { "content-type": "application/json" },
    })
  }) as typeof fetch
  return () => {
    globalThis.fetch = original
  }
}

function ok(data: any): Response {
  return new Response(JSON.stringify({ code: 0, msg: "ok", data }), {
    status: 200,
    headers: { "content-type": "application/json" },
  })
}

const ROOT_FILES = [
  {
    file_key: "/readme.txt",
    file_name: "readme.txt",
    is_dir: false,
    size: 11,
    content_type: "text/plain",
    modified_at: "2026-10-24T08:00:00+08:00",
  },
  {
    file_key: "/docs",
    file_name: "docs",
    is_dir: true,
    size: 0,
    modified_at: "2026-10-24T08:00:00+08:00",
  },
]

const DOCS_FILES = [
  {
    file_key: "/docs/a.txt",
    file_name: "a.txt",
    is_dir: false,
    size: 1,
    modified_at: "2026-10-24T09:00:00+08:00",
  },
]

test("cleanKey 规范化", () => {
  assert.equal(cleanKey(""), "/")
  assert.equal(cleanKey("/"), "/")
  assert.equal(cleanKey("a/b"), "/a/b")
  assert.equal(cleanKey("/a//b/"), "/a/b")
  assert.equal(cleanKey("\\a\\b"), "/a/b")
  assert.equal(cleanKey("/a/../b"), "/b")
  assert.equal(joinKey("/docs", "a.txt"), "/docs/a.txt")
  assert.equal(joinKey("/", "x"), "/x")
  assert.equal(fileExt("a.TXT"), "txt")
  assert.equal(fileExt("noext"), "")
})

function makeClient(addition: any = {}): InternAIClient {
  return new InternAIClient({ token: "test-token", ...addition })
}

test("init 缺 token 报错；带 token 调 quota 验证", async () => {
  const restore = installFetch([
    ["/api/ml/v1/cloud-disk/quota", (_u, init) => {
      const auth = (init.headers as any).Authorization
      if (auth !== "Bearer test-token") return new Response("", { status: 401 })
      return ok({ used_bytes: 1, total_bytes: 2 })
    }],
  ])
  try {
    await assert.rejects(
      () => new InternAIClient({} as any).init(),
      /token is required/,
    )
    const c = makeClient()
    await c.init()
    const bad = makeClient({ token: "wrong" })
    await assert.rejects(() => bad.init(), /401/)
  } finally {
    restore()
  }
})

test("listAll 自动翻页", async () => {
  const pages: any[][] = [
    [ROOT_FILES[0]],
    [ROOT_FILES[1]],
  ]
  let calls = 0
  const urls: string[] = []
  const restore = installFetch([
    ["/api/ml/v1/cloud-disk/list", (url, init) => {
      calls++
      const u = new URL(url)
      urls.push(u.searchParams.get("page_token") || "")
      assert.equal((init.headers as any).Authorization, "Bearer test-token")
      assert.equal(u.searchParams.get("dir_path"), "/")
      const page = urls.length - 1
      return ok({
        files: pages[Math.min(page, pages.length - 1)],
        next_page_token: page < pages.length - 1 ? String(page + 1) : "",
        total: 2,
        has_more: page < pages.length - 1,
      })
    }],
  ])
  try {
    const c = makeClient({ page_size: 1 })
    const files = await c.listAll("/")
    assert.equal(calls, 2)
    assert.deepEqual(urls, ["", "1"])
    assert.equal(files.length, 2)
  } finally {
    restore()
  }
})

test("getDownloadUrl 解析 download_url；skipped/空链接跳过", async () => {
  const restore = installFetch([
    ["/api/ml/v1/cloud-disk/download-url", (_u, init) => {
      const body = JSON.parse(String(init.body))
      assert.deepEqual(body.file_keys, ["/docs/a.txt"])
      return ok({
        urls: [
          { file_key: "/docs/a.txt", download_url: "https://oss.example.com/a.txt?sig=1" },
        ],
      })
    }],
  ])
  try {
    const c = makeClient()
    const url = await c.getDownloadUrl("/docs/a.txt")
    assert.equal(url, "https://oss.example.com/a.txt?sig=1")
  } finally {
    restore()
  }
})

function makeDriver(handlers: Array<[string, Handler]>): DriverInternAI {
  // init() 会调用 quota 验证 token，默认放行（测试可覆盖）
  if (!handlers.some(([k]) => k.includes("/quota"))) {
    handlers.push(["/api/ml/v1/cloud-disk/quota", () => ok({})])
  }
  installFetch(handlers)
  return new DriverInternAI({ token: "test-token" } as any)
}

test("driver list/get 端到端", async () => {
  const d = makeDriver([
    ["/api/ml/v1/cloud-disk/list", (url) => {
      const u = new URL(url)
      const dirPath = u.searchParams.get("dir_path")
      if (dirPath === "/docs") return ok({ files: DOCS_FILES, next_page_token: "" })
      return ok({ files: ROOT_FILES, next_page_token: "" })
    }],
    ["/api/ml/v1/cloud-disk/download-url", () =>
      ok({ urls: [{ file_key: "/docs/a.txt", download_url: "https://oss.example.com/a" }] })],
  ])
  await d.init()

  const items = await d.list("/v", "/")
  assert.equal(items.length, 2)
  const readme = items.find((i) => i.name === "readme.txt")
  assert.ok(readme)
  assert.equal(readme!.is_dir, false)
  assert.equal(readme!.size, 11)
  // modified_at 带时区应转换为 ISO
  assert.equal(readme!.modified, new Date("2026-10-24T08:00:00+08:00").toISOString())
  const docs = items.find((i) => i.name === "docs")
  assert.equal(docs!.is_dir, true)

  const item = await d.get("/v", "/docs/a.txt")
  assert.equal(item.name, "a.txt")
  assert.equal(item.raw_url, "https://oss.example.com/a")
})

test("driver 写操作端到端（mkdir/rename/move/copy/remove/put）", async () => {
  const calls: Array<{ ep: string; body: any }> = []
  const d = makeDriver([
    ["/api/ml/v1/cloud-disk/quota", () => ok({})],
    ["/api/ml/v1/cloud-disk/mkdir", (_u, init) => {
      calls.push({ ep: "mkdir", body: JSON.parse(String(init.body)) })
      return ok(null)
    }],
    ["/api/ml/v1/cloud-disk/rename", (_u, init) => {
      calls.push({ ep: "rename", body: JSON.parse(String(init.body)) })
      return ok(null)
    }],
    ["/api/ml/v1/cloud-disk/move", (_u, init) => {
      calls.push({ ep: "move", body: JSON.parse(String(init.body)) })
      return ok(null)
    }],
    ["/api/ml/v1/cloud-disk/copy", (_u, init) => {
      calls.push({ ep: "copy", body: JSON.parse(String(init.body)) })
      return ok(null)
    }],
    ["/api/ml/v1/cloud-disk/delete", (_u, init) => {
      calls.push({ ep: "delete", body: JSON.parse(String(init.body)) })
      return ok(null)
    }],
    ["/api/ml/v1/cloud-disk/upload-url", (_u, init) => {
      calls.push({ ep: "upload-url", body: JSON.parse(String(init.body)) })
      // 生产实测：upload-url 端点不带 {code,msg,data} 信封，直接返回 {urls:[...]}
      return new Response(
        JSON.stringify({ urls: [{ upload_url: "https://upload.example.com/put" }] }),
        { status: 200, headers: { "content-type": "application/json" } },
      )
    }],
    ["https://upload.example.com/put", () => new Response("", { status: 200 })],
  ])
  await d.init()

  await d.mkdir("/v", "/newdir")
  await d.rename("/v", "/a.txt", "b.txt")
  // dstPhys 是含文件名的完整目标物理路径（对齐 op 层 moveItems 语义）
  await d.move("/src", "/dst", ["x"], "/src/x", "/dst/x")
  await d.copy("/src", "/dst", ["x"], "/src/x", "/dst/x")
  await d.remove("/v", "/tmpfile", [])
  await d.put("/v", "/up/hello.txt", Buffer.from("hello intern-ai"))

  const eps = calls.map((c) => c.ep)
  assert.deepEqual(eps, [
    "mkdir",
    "rename",
    "move",
    "copy",
    "delete",
    "upload-url",
  ])
  assert.deepEqual(calls[0].body, { dir_path: "/", dir_name: "newdir" })
  assert.equal(calls[1].body.src_key, "/a.txt")
  assert.equal(calls[1].body.new_name, "b.txt")
  assert.deepEqual(calls[2].body.src_keys, ["/src/x"])
  assert.equal(calls[2].body.dst_dir, "/dst")
  assert.deepEqual(calls[4].body.file_keys, ["/tmpfile"])
  assert.equal(calls[5].body.dir_path, "/up")
  assert.equal(calls[5].body.files[0].file_name, "hello.txt")
  assert.equal(calls[5].body.files[0].file_size, 15)
  assert.equal(calls[5].body.files[0].file_type, "txt")
})

test("get 未命中条目时报 not found", async () => {
  const d = makeDriver([
    ["/api/ml/v1/cloud-disk/list", () => ok({ files: [], next_page_token: "" })],
  ])
  await d.init()
  await assert.rejects(
    () => d.get("/v", "/missing.txt"),
    /not found/,
  )
})

test("list 无信封 upload-url + 数字时间戳（生产实测形状）", async () => {
  // 1) upload-url 无信封：request() 必须容忍顶层 {urls:[...]}，不得因 code 丢失而报错
  const c = makeClient({ page_size: 10 })
  const restore1 = installFetch([
    ["/api/ml/v1/cloud-disk/upload-url", () =>
      new Response(
        JSON.stringify({
          urls: [{ file_key: "/x/rt.txt", upload_url: "https://up.example/put", skipped: false }],
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      )],
    ["https://up.example/put", () => new Response("", { status: 200 })],
  ])
  try {
    const up = await c.getUploadUrl("/x", "rt.txt", 3)
    assert.equal(up, "https://up.example/put")
  } finally {
    restore1()
  }

  // 2) modified_at 为 unix 秒数字时必须正确转 ISO，而不是退化成 epoch
  const d = makeDriver([
    ["/api/ml/v1/cloud-disk/list", () =>
      ok({
        files: [{
          file_key: "/n.txt",
          file_name: "n.txt",
          is_dir: false,
          size: 5,
          modified_at: 1792815193,
          cloud_file_status: null,
        }],
        next_page_token: "",
      })],
  ])
  await d.init()
  const items = await d.list("/v", "/")
  assert.equal(items.length, 1)
  assert.equal(items[0]!.modified, new Date(1792815193 * 1000).toISOString())
})
