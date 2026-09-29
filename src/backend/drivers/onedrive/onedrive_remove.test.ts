import assert from "node:assert/strict"
import { test } from "node:test"
import { Onedrive } from "./driver"

/**
 * 调用约定（src/backend/internal/op/storage.ts 的 removeItems/moveItems）：
 *
 *   await driver.remove(virtualPath, resolved.physical, [name])
 *   await driver.move(srcDir, dstDir, [name], srcPhys, dstPhys)
 *
 * 即 physicalPath / srcPhys / dstPhys 都是【目标项自身】的物理路径（已含文件名），
 * driver 不得再把 name 拼接到路径后面，否则会指向 `<item>/<name>`：
 * DELETE 404 → 静默失败，对象仍然存在。
 *
 * 构造 `new Onedrive({})` 不联网，不调 init()（fixture 没有 refresh_token）；
 * 401 会触发 refreshToken 真实联网，所以 mock fetch 一律返回 2xx。
 */

type Call = { method: string; url: string; body?: string }

/** 按 (method, url) 分派的 Graph API mock，记录所有请求以便断言目标路径 */
function mockGraph(calls: Call[]) {
  return async (input: any, init: any = {}) => {
    const url = new URL(String(typeof input === "string" ? input : input.url))
    const method = String(init.method || "GET").toUpperCase()
    calls.push({
      method,
      url: url.toString(),
      body: typeof init.body === "string" ? init.body : undefined,
    })

    // DELETE → 204 无 body；GET → 目标父目录解析；PATCH → 更新项
    if (method === "DELETE") return new Response(null, { status: 204 })
    const json = JSON.stringify(
      method === "GET"
        ? { id: "parent-id", parentReference: { driveId: "d1" } }
        : {},
    )
    return new Response(json, {
      status: 200,
      headers: { "content-type": "application/json" },
    })
  }
}

function withMock<T>(calls: Call[], fn: () => Promise<T>): Promise<T> {
  const original = globalThis.fetch
  globalThis.fetch = mockGraph(calls) as any
  return fn().finally(() => {
    globalThis.fetch = original
  })
}

test("OneDrive remove() 删除目标项自身路径，不拼接 name", async () => {
  const calls: Call[] = []

  await withMock(calls, () =>
    new Onedrive({}).remove("/d/a.txt", "/d/a.txt", ["a.txt"]),
  )

  const deletes = calls.filter((c) => c.method === "DELETE")
  assert.equal(
    deletes.length,
    1,
    `应恰好发出 1 次 DELETE，实际请求：${calls.map((c) => c.method).join(", ") || "(无)"}`,
  )
  assert.equal(
    deletes[0].url,
    "https://graph.microsoft.com/v1.0/me/drive/root:/d/a.txt:",
    "DELETE 必须指向项自身路径（结尾裸冒号），即 physicalPath 本身",
  )
  const pathname = decodeURIComponent(new URL(deletes[0].url).pathname)
  assert.ok(
    !pathname.includes("a.txt/a.txt"),
    `路径不得出现二次拼接的 a.txt/a.txt，实际：${pathname}`,
  )
})

test("OneDrive move() 先 GET 目标父目录，再 PATCH 源项自身路径", async () => {
  const calls: Call[] = []

  await withMock(calls, () =>
    new Onedrive({}).move(
      "/d",
      "/d/bak",
      ["a.txt"],
      "/d/a.txt",
      "/d/bak/a.txt",
    ),
  )

  const getIdx = calls.findIndex((c) => c.method === "GET")
  const patchIdx = calls.findIndex((c) => c.method === "PATCH")
  assert.ok(
    getIdx >= 0 && patchIdx >= 0,
    `move 应先 GET 目标父目录再 PATCH 源项，实际请求：${calls.map((c) => c.method).join(", ") || "(无)"}`,
  )
  assert.ok(
    getIdx < patchIdx,
    "GET（解析目标父目录）必须先于 PATCH（更新源项）",
  )

  const getPathname = decodeURIComponent(new URL(calls[getIdx].url).pathname)
  assert.equal(
    getPathname,
    "/v1.0/me/drive/root:/d/bak:",
    "GET 应指向 dstPhys 去掉末段后的目标父目录",
  )

  const patchPathname = decodeURIComponent(
    new URL(calls[patchIdx].url).pathname,
  )
  assert.equal(
    patchPathname,
    "/v1.0/me/drive/root:/d/a.txt:",
    "PATCH 必须指向源项自身路径（srcPhys），即结尾裸冒号",
  )
  assert.ok(
    !patchPathname.includes("a.txt/a.txt"),
    `PATCH 路径不得出现二次拼接的 a.txt/a.txt，实际：${patchPathname}`,
  )

  const body = JSON.parse(calls[patchIdx].body || "{}")
  assert.equal(
    body.name,
    "a.txt",
    `PATCH body 的 name 应取 dstPhys 末段，实际：${body.name}`,
  )
  assert.equal(
    body.parentReference?.id,
    "parent-id",
    "PATCH body 应携带 GET 解析出的目标父目录 id",
  )
})
