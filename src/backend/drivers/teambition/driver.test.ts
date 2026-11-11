import test from "node:test"
import assert from "node:assert/strict"
import { DriverTeambition } from "./driver"
import { DriverTeambitionAddition } from "./types"

/**
 * 对齐 Go drivers/teambition 的回归测试：
 * 1) root_folder_id 对齐 Go driver.RootID（留空才用项目根目录）
 * 2) move/copy 的目标目录必须由「目标物理路径」推导，不能用挂载后的虚拟路径
 * 3) 非 2xx 且空响应体时必须报错，不能静默返回空列表
 */

const BASE = "https://www.teambition.com"

interface Fixture {
  folders?: Record<string, any[]>
  works?: Record<string, any[]>
}

function installFetch(fixture: Fixture) {
  const original = globalThis.fetch
  const calls: { method: string; url: string; body?: any }[] = []

  globalThis.fetch = (async (input: any, init?: any) => {
    const url = String(input)
    const method = init?.method || "GET"
    calls.push({
      method,
      url,
      body: typeof init?.body === "string" ? init.body : undefined,
    })
    const parsed = new URL(url)
    const parentId = parsed.searchParams.get("_parentId") || ""

    if (parsed.pathname === "/api/collections") {
      return new Response(JSON.stringify(fixture.folders?.[parentId] || []), {
        status: 200,
        headers: { "content-type": "application/json" },
      })
    }
    if (parsed.pathname === "/api/works") {
      return new Response(JSON.stringify(fixture.works?.[parentId] || []), {
        status: 200,
        headers: { "content-type": "application/json" },
      })
    }
    if (parsed.pathname.endsWith("/move") || parsed.pathname.endsWith("/fork")) {
      return new Response("{}", {
        status: 200,
        headers: { "content-type": "application/json" },
      })
    }
    if (parsed.pathname === "/api/collections/COL-A") {
      return new Response("{}", {
        status: 200,
        headers: { "content-type": "application/json" },
      })
    }
    return new Response("", { status: 404 })
  }) as typeof fetch

  return {
    calls,
    restore: () => {
      globalThis.fetch = original
    },
  }
}

const ADDITION: DriverTeambitionAddition = {
  region: "china",
  cookie: "tb_cookie=1",
  project_id: "PROJ",
}

test("根目录使用 root_folder_id（对齐 Go RootID）", async () => {
  const fx = installFetch({
    folders: {
      RID: [{ _id: "C1", title: "docs", updated: "2024-01-01T00:00:00.000Z" }],
    },
  })
  try {
    const driver = new DriverTeambition({ ...ADDITION, root_folder_id: "RID" })
    const items = await driver.list("/", "/")
    assert.equal(items.length, 1)
    assert.equal(items[0].name, "docs")
    assert.equal(items[0].sign, "C1")

    const collectionCalls = fx.calls.filter((c) => c.url.includes("/api/collections"))
    assert.equal(collectionCalls.length, 1)
    assert.equal(
      new URL(collectionCalls[0].url).searchParams.get("_parentId"),
      "RID",
    )
  } finally {
    fx.restore()
  }
})

test("未配置 root_folder_id 时使用项目根目录（空 _parentId）", async () => {
  const fx = installFetch({ folders: { "": [] }, works: { "": [] } })
  try {
    const driver = new DriverTeambition(ADDITION)
    const items = await driver.list("/", "/")
    assert.deepEqual(items, [])
    const first = new URL(fx.calls[0].url)
    assert.equal(first.searchParams.get("_parentId"), "")
    assert.equal(first.searchParams.get("_projectId"), "PROJ")
    assert.equal(first.searchParams.get("order"), "fileNameAsc")
  } finally {
    fx.restore()
  }
})

test("move 以目标物理路径的父目录作为目标，而非虚拟挂载路径", async () => {
  const fx = installFetch({
    folders: {
      RID: [
        { _id: "A", title: "a", updated: "2024-01-01T00:00:00.000Z" },
        { _id: "B", title: "b", updated: "2024-01-01T00:00:00.000Z" },
      ],
      A: [],
      B: [],
    },
    works: {
      A: [{ _id: "W1", fileName: "f.txt", fileSize: 3, updated: "2024-01-01T00:00:00.000Z" }],
      B: [],
    },
  })
  try {
    const driver = new DriverTeambition({ ...ADDITION, root_folder_id: "RID" })
    await driver.move(
      "/mnt/a",
      "/mnt/b",
      ["f.txt"],
      "/a/f.txt",
      "/b/f.txt",
    )
    const moveCall = fx.calls.find((c) => c.url.includes("/api/works/W1/move"))
    assert.ok(moveCall, `未发出 move 请求: ${JSON.stringify(fx.calls)}`)
    assert.equal(moveCall!.method, "PUT")
    assert.deepEqual(JSON.parse(moveCall!.body || "{}"), { _parentId: "B" })
    // 不应把挂载前缀 "mnt" 当作项目内目录去解析
    assert.equal(
      fx.calls.some((c) => c.url.includes("mnt")),
      false,
    )
  } finally {
    fx.restore()
  }
})

test("非 2xx 且空响应体时报错，不静默返回空目录", async () => {
  const original = globalThis.fetch
  globalThis.fetch = (async () => new Response("", { status: 401 })) as typeof fetch
  try {
    const driver = new DriverTeambition(ADDITION)
    await assert.rejects(() => driver.list("/", "/"), /HTTP 401/)
  } finally {
    globalThis.fetch = original
  }
})

test("上传在 Worker 运行时明确报不支持", async () => {
  const driver = new DriverTeambition(ADDITION)
  await assert.rejects(
    () => driver.put("/a", "/a/x.txt", new Uint8Array([1])),
    /not supported/,
  )
})
