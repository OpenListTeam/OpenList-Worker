import assert from "node:assert/strict"
import { test } from "node:test"
import { YandexDriver } from "./driver"

/**
 * 调用约定（src/backend/internal/op/storage.ts 的 removeItems/moveItems）：
 *
 *   const resolved = await resolvePath(`${dir}/${name}`)
 *   await driver.remove(virtualPath, resolved.physical, [name])
 *
 * physicalPath/srcPhys/dstPhys 是【目标项自身】的物理路径（已含文件名），
 * 调用方恒传单元素 names。driver 不得再把 name 拼到该路径后面，否则
 * `?path=<item>/<name>` 指向不存在的对象 → DELETE 404 报错，
 * move 的 from/path 源/目标错位。
 *
 * 注意：路径在 query 参数里（不在 pathname），断言必须读 searchParams。
 */

type Call = { method: string; url: string }

/** 记录请求，恒返回 2xx + application/json：
 *  401 会触发 refreshToken() 联网，content-type 决定 util 的解析分支 */
function mockYandex(calls: Call[]) {
  return async (input: any, init: any = {}) => {
    const url = String(typeof input === "string" ? input : input.url)
    calls.push({
      method: String(init.method || "GET").toUpperCase(),
      url,
    })
    return new Response("{}", {
      status: 200,
      headers: { "content-type": "application/json" },
    })
  }
}

function withMock<T>(calls: Call[], fn: () => Promise<T>): Promise<T> {
  const original = globalThis.fetch
  globalThis.fetch = mockYandex(calls) as any
  return fn().finally(() => {
    globalThis.fetch = original
  })
}

function makeDriver() {
  // 测试不调用 init()，client 的 accessToken 为空；只要 mock 返回 2xx 就不会
  // 触发 401 → refreshToken() 联网。
  return new YandexDriver({
    refresh_token: "r",
    use_online_api: true,
  })
}

test("Yandex remove() 的 path query 为项自身路径，不再拼一次 name", async () => {
  const calls: Call[] = []

  await withMock(calls, () =>
    makeDriver().remove("/d/a.txt", "/d/a.txt", ["a.txt"]),
  )

  const deletes = calls.filter((c) => c.method === "DELETE")
  assert.equal(
    deletes.length,
    1,
    `应恰好发出 1 次 DELETE 请求，实际 ${deletes.length}`,
  )
  const url = new URL(deletes[0].url)
  assert.equal(
    url.origin + url.pathname,
    "https://cloud-api.yandex.net/v1/disk/resources",
    `DELETE 应打到 /v1/disk/resources，实际 ${url.origin}${url.pathname}`,
  )
  const path = url.searchParams.get("path")
  assert.equal(
    path,
    "/d/a.txt",
    `path query 应为项自身路径 /d/a.txt，实际 ${path}`,
  )
  assert.ok(
    !String(path).endsWith("/a.txt/a.txt"),
    "path query 不得出现二次拼接的 <item>/<name>",
  )
  assert.ok(
    calls.every((c) => !c.url.includes("api.oplist.org")),
    "不应触发在线 renewapi 的 token 刷新请求",
  )
})

test("Yandex move() 的 from/path query 分别为源/目标项自身路径", async () => {
  const calls: Call[] = []

  await withMock(calls, () =>
    makeDriver().move("/d", "/d/dst", ["a.txt"], "/d/a.txt", "/d/dst/a.txt"),
  )

  const moves = calls.filter((c) => c.method === "POST")
  assert.equal(
    moves.length,
    1,
    `应恰好发出 1 次 POST move 请求，实际 ${moves.length}`,
  )
  const url = new URL(moves[0].url)
  assert.equal(
    url.origin + url.pathname,
    "https://cloud-api.yandex.net/v1/disk/resources/move",
    `move 应打到 /v1/disk/resources/move，实际 ${url.origin}${url.pathname}`,
  )
  const from = url.searchParams.get("from")
  const path = url.searchParams.get("path")
  assert.equal(
    from,
    "/d/a.txt",
    `from query 应为源项自身路径 /d/a.txt，实际 ${from}`,
  )
  assert.equal(
    path,
    "/d/dst/a.txt",
    `path query 应为目标项自身路径 /d/dst/a.txt，实际 ${path}`,
  )
  assert.ok(
    !String(from).endsWith("/a.txt/a.txt"),
    "from query 不得出现二次拼接的 <item>/<name>",
  )
  assert.ok(
    !String(path).endsWith("/a.txt/a.txt"),
    "path query 不得出现二次拼接的 <item>/<name>",
  )
  assert.ok(
    calls.every((c) => !c.url.includes("api.oplist.org")),
    "不应触发在线 renewapi 的 token 刷新请求",
  )
})
