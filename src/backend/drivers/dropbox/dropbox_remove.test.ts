import assert from "node:assert/strict"
import { test } from "node:test"
import { DropboxDriver } from "./driver"

/**
 * 调用约定（src/backend/internal/op/storage.ts 的 removeItems/moveItems）：
 *
 *   const resolved = await resolvePath(`${dir}/${name}`)
 *   await driver.remove(virtualPath, resolved.physical, [name])
 *
 * 即 physicalPath/srcPhys/dstPhys 是【目标项自身】的物理路径（已含文件名），
 * 调用方恒传单元素 names。driver 不得再把 name 拼到该路径后面，否则 body.path
 * 变成 `<item>/<name>`：delete_v2/move_v2 找不到该路径 → 404 报错，
 * 目标项既没被删除也没被移动。
 */

type Call = { method: string; url: string; body: string }

/** 记录请求，恒返回 200 + application/json（util.request 走 res.json() 分支） */
function mockDropbox(calls: Call[]) {
  return async (input: any, init: any = {}) => {
    const url = String(typeof input === "string" ? input : input.url)
    calls.push({
      method: String(init.method || "GET").toUpperCase(),
      url,
      body: typeof init.body === "string" ? init.body : "",
    })
    return new Response("{}", {
      status: 200,
      headers: { "content-type": "application/json" },
    })
  }
}

function withMock<T>(calls: Call[], fn: () => Promise<T>): Promise<T> {
  const original = globalThis.fetch
  globalThis.fetch = mockDropbox(calls) as any
  return fn().finally(() => {
    globalThis.fetch = original
  })
}

function makeDriver() {
  // access_token 必填：util.request 发现无 token 会先联网 refreshToken()，
  // 测试不调用 init()，也不允许出现 oauth2/token 请求。
  return new DropboxDriver({
    access_token: "tok",
    refresh_token: "r",
    client_id: "id",
    client_secret: "sec",
  })
}

test("Dropbox remove() 删除项自身路径，不再拼一次 name", async () => {
  const calls: Call[] = []

  await withMock(calls, () =>
    makeDriver().remove("/d/a.txt", "/d/a.txt", ["a.txt"]),
  )

  const deletes = calls.filter(
    (c) => c.url === "https://api.dropboxapi.com/2/files/delete_v2",
  )
  assert.equal(
    deletes.length,
    1,
    `应恰好发出 1 次 files/delete_v2 请求，实际 ${deletes.length}`,
  )
  const body = JSON.parse(deletes[0].body)
  assert.equal(
    body.path,
    "/d/a.txt",
    `delete 的 path 应为项自身路径 /d/a.txt，实际 ${body.path}`,
  )
  assert.ok(
    !String(body.path).endsWith("/a.txt/a.txt"),
    "path 不得出现二次拼接的 <item>/<name>",
  )
  assert.ok(
    calls.every((c) => !c.url.includes("/oauth2/token")),
    "已带 access_token，不应触发 token 刷新请求",
  )
})

test("Dropbox move() 的 from_path/to_path 分别为源/目标项自身路径", async () => {
  const calls: Call[] = []

  await withMock(calls, () =>
    makeDriver().move("/d", "/d/dst", ["a.txt"], "/d/a.txt", "/d/dst/a.txt"),
  )

  const moves = calls.filter(
    (c) => c.url === "https://api.dropboxapi.com/2/files/move_v2",
  )
  assert.equal(
    moves.length,
    1,
    `应恰好发出 1 次 files/move_v2 请求，实际 ${moves.length}`,
  )
  const body = JSON.parse(moves[0].body)
  assert.equal(
    body.from_path,
    "/d/a.txt",
    `from_path 应为源项自身路径 /d/a.txt，实际 ${body.from_path}`,
  )
  assert.equal(
    body.to_path,
    "/d/dst/a.txt",
    `to_path 应为目标项自身路径 /d/dst/a.txt，实际 ${body.to_path}`,
  )
  assert.ok(
    !String(body.from_path).endsWith("/a.txt/a.txt"),
    "from_path 不得出现二次拼接的 <item>/<name>",
  )
  assert.ok(
    !String(body.to_path).endsWith("/a.txt/a.txt"),
    "to_path 不得出现二次拼接的 <item>/<name>",
  )
  assert.ok(
    calls.every((c) => !c.url.includes("/oauth2/token")),
    "已带 access_token，不应触发 token 刷新请求",
  )
})
