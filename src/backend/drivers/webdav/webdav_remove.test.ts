import assert from "node:assert/strict"
import { test } from "node:test"
import { WebdavDriver } from "./driver"

/**
 * 调用约定（src/backend/internal/op/storage.ts 的 removeItems/moveItems）：
 *
 *   const resolved = await resolvePath(`${dir}/${name}`)
 *   await driver.remove(virtualPath, resolved.physical, [name])
 *
 * physicalPath/srcPhys/dstPhys 是【目标项自身】的物理路径（已含文件名），
 * 调用方恒传单元素 names。driver 不得再把 name 拼到该路径后面，否则
 * DELETE 打到 `<item>/<name>`（WebDAV 对 404 视作成功 → 接口报成功但对象仍在），
 * MOVE 的请求源与 Destination 头源/目标也会错位。
 *
 * 状态码坑：DELETE 返回 204（实现接受 200/204/404）；MOVE 返回 201（绝不能 409，
 * 409 会触发 mkdirAll 重试链，产生额外请求干扰断言）。
 */

type Call = { method: string; url: string; headers: Headers }

/** 记录请求；DELETE 回 204、MOVE 回 201，其余回 200 */
function mockWebdav(calls: Call[]) {
  return async (input: any, init: any = {}) => {
    const url = String(typeof input === "string" ? input : input.url)
    const method = String(init.method || "GET").toUpperCase()
    calls.push({ method, url, headers: new Headers(init.headers || {}) })
    if (method === "DELETE") {
      return new Response(null, { status: 204 })
    }
    if (method === "MOVE") {
      return new Response(null, { status: 201 })
    }
    return new Response(null, { status: 200 })
  }
}

function withMock<T>(calls: Call[], fn: () => Promise<T>): Promise<T> {
  const original = globalThis.fetch
  globalThis.fetch = mockWebdav(calls) as any
  return fn().finally(() => {
    globalThis.fetch = original
  })
}

function makeDriver(rootFolderPath?: string) {
  // 构造不联网，测试不调用 init()；root_folder_path 缺省为 "/"
  return new WebdavDriver({
    address: "https://dav.example.com",
    username: "u",
    password: "p",
    ...(rootFolderPath ? { root_folder_path: rootFolderPath } : {}),
  })
}

test("Webdav remove() DELETE 目标为项自身路径，不再拼一次 name", async () => {
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
  const pathname = decodeURIComponent(new URL(deletes[0].url).pathname)
  assert.equal(
    pathname,
    "/d/a.txt",
    `DELETE 目标应为项自身路径 /d/a.txt，实际 ${pathname}`,
  )
  assert.ok(
    !pathname.includes("a.txt/a.txt"),
    "DELETE 目标不得出现二次拼接的 <item>/<name>",
  )
})

test("Webdav move() 请求源与 Destination 头分别为源/目标项自身路径", async () => {
  const calls: Call[] = []

  await withMock(calls, () =>
    makeDriver().move("/d", "/d/dst", ["a.txt"], "/d/a.txt", "/d/dst/a.txt"),
  )

  const moves = calls.filter((c) => c.method === "MOVE")
  assert.equal(
    moves.length,
    1,
    `应恰好发出 1 次 MOVE 请求，实际 ${moves.length}`,
  )
  const pathname = decodeURIComponent(new URL(moves[0].url).pathname)
  assert.equal(
    pathname,
    "/d/a.txt",
    `MOVE 请求 URL 应为源项自身路径 /d/a.txt，实际 ${pathname}`,
  )
  assert.ok(
    !pathname.includes("a.txt/a.txt"),
    "MOVE 请求 URL 不得出现二次拼接的 <item>/<name>",
  )
  // Headers 不区分大小写，get("destination") 与写入时的 Destination 等价
  const destination = moves[0].headers.get("destination")
  assert.ok(destination, "MOVE 必须携带 Destination 头")
  const destPathname = decodeURIComponent(new URL(destination).pathname)
  assert.equal(
    destPathname,
    "/d/dst/a.txt",
    `Destination 应指向目标项自身路径 /d/dst/a.txt，实际 ${destination}`,
  )
  assert.ok(
    !destPathname.includes("a.txt/a.txt"),
    "Destination 不得出现二次拼接的 <item>/<name>",
  )
  assert.equal(
    calls.filter((c) => c.method === "MKCOL").length,
    0,
    "MOVE 返回 201 不应触发 mkdirAll 重试链",
  )
})

test("Webdav root_folder_path 前缀只拼一次（remove 与 move）", async () => {
  const removeCalls: Call[] = []

  await withMock(removeCalls, () =>
    makeDriver("/root").remove("/d/a.txt", "/d/a.txt", ["a.txt"]),
  )
  const removeDeletes = removeCalls.filter((c) => c.method === "DELETE")
  assert.equal(
    removeDeletes.length,
    1,
    `应恰好发出 1 次 DELETE 请求，实际 ${removeDeletes.length}`,
  )
  const removePath = decodeURIComponent(new URL(removeDeletes[0].url).pathname)
  assert.equal(
    removePath,
    "/root/d/a.txt",
    `DELETE 目标应为 <root>/<项路径> = /root/d/a.txt，实际 ${removePath}`,
  )
  assert.ok(!removePath.includes("/root/root/"), "root 前缀不得被拼两次")
  assert.ok(
    !removePath.includes("a.txt/a.txt"),
    "DELETE 目标不得出现二次拼接的 <item>/<name>",
  )

  const moveCalls: Call[] = []

  await withMock(moveCalls, () =>
    makeDriver("/root").move(
      "/d",
      "/d/dst",
      ["a.txt"],
      "/d/a.txt",
      "/d/dst/a.txt",
    ),
  )
  const rootMoves = moveCalls.filter((c) => c.method === "MOVE")
  assert.equal(
    rootMoves.length,
    1,
    `应恰好发出 1 次 MOVE 请求，实际 ${rootMoves.length}`,
  )
  const srcPath = decodeURIComponent(new URL(rootMoves[0].url).pathname)
  assert.equal(
    srcPath,
    "/root/d/a.txt",
    `MOVE 请求 URL 应为 <root>/<源项路径> = /root/d/a.txt，实际 ${srcPath}`,
  )
  const destination = rootMoves[0].headers.get("destination")
  assert.ok(destination, "MOVE 必须携带 Destination 头")
  const destPath = decodeURIComponent(new URL(destination).pathname)
  assert.equal(
    destPath,
    "/root/d/dst/a.txt",
    `Destination 应为 <root>/<目标项路径> = /root/d/dst/a.txt，实际 ${destPath}`,
  )
  assert.ok(
    !srcPath.includes("/root/root/") && !destPath.includes("/root/root/"),
    "root 前缀不得被拼两次",
  )
})
