// Telegram 驱动：StorageDriver 语义单测。
//
// 通过把 driver / util / index / types 复制到隔离目录 + 注入桩 store.ts，
// 在不加载真实 DB、不触网的前提下覆盖路径映射与增删改查。
// 被测对象是真实源码（逐字复制），只有 store 与 fetch 被替换。

import test from "node:test"
import assert from "node:assert/strict"
import { INDEX_VERSION, indexKey, parseIndex } from "./index"
import type { IndexEntry } from "./index"
import { DriverTelegram } from "./driver"

// ---------- 桩：内存版索引存储（经构造注入） ----------

interface MemStore {
  [k: string]: string
}

function makeStore(): { store: any; reset: () => void; snapshot: () => MemStore } {
  const DB: MemStore = {}
  return {
    store: {
      async load(key: string) {
        return parseIndex(__dbSnapshot()[key])
      },
      async save(key: string, idx: any) {
        DB[key] = JSON.stringify(idx)
      },
    },
    reset: () => {
      for (const k of Object.keys(DB)) delete DB[k]
    },
    snapshot: () => DB,
  }
}

const MEM = makeStore()
const __resetDb = MEM.reset
const __dbSnapshot = MEM.snapshot

// ---------- 桩：Telegram HTTP ----------

interface Call {
  method: string
  body?: any
}

const calls: Call[] = []
let nextMessageId = 100
let nextFileId = 1

function reply(result: any) {
  return new Response(JSON.stringify({ ok: true, result }), {
    headers: { "Content-Type": "application/json" },
  })
}

function err(description: string, code = 400, params?: any) {
  return new Response(
    JSON.stringify({ ok: false, error_code: code, description, parameters: params }),
    { headers: { "Content-Type": "application/json" } },
  )
}

function resetApi() {
  calls.length = 0
  nextMessageId = 100
  nextFileId = 1
}

async function fakeFetch(url: string, init?: any): Promise<Response> {
  const method = String(url).split("/").pop() || ""
  let body: any = {}
  if (init?.body) {
    try {
      body = JSON.parse(init.body)
    } catch {
      body = { _raw: true }
    }
  }
  calls.push({ method, body })

  switch (method) {
    case "getMe":
      return reply({ id: 42, username: "testbot" })
    case "getChat":
      return reply({ id: -100999, type: "supergroup", description: "" })
    case "sendMessage":
      return reply({ message_id: nextMessageId++, date: 1700000000 })
    case "sendDocument": {
      const id = nextMessageId++
      return reply({
        message_id: id,
        date: 1700000000,
        document: { file_id: `file${nextFileId++}`, file_unique_id: "u" },
      })
    }
    case "copyMessage": {
      const id = nextMessageId++
      return reply({
        message_id: id,
        date: 1700000000,
        document: { file_id: `file${nextFileId++}`, file_unique_id: "u" },
      })
    }
    case "deleteMessage":
      return reply(true)
    case "getFile":
      return reply({
        file_id: "x",
        file_unique_id: "u",
        file_path: "documents/file_1.txt",
        file_size: 5,
      })
    default:
      return err("unexpected method " + method)
  }
}

const g: any = globalThis as any
g.fetch = fakeFetch

const ADD = {
  bot_token: "123456:AAtesttokenAAAAAAAAAAAAAAAAAAA",
  chat_id: "-100999",
}

function newDriver(rootPath?: string) {
  return new DriverTelegram({ ...ADD, root_path: rootPath }, MEM.store)
}

function topOf(key: string): IndexEntry[] {
  return parseIndex(__dbSnapshot()[key]).dirs[""] || []
}

// ------------------------------------------------------------------

test("init 调用 getMe 并在 DB 中建立索引行", async () => {
  __resetDb()
  resetApi()
  const d = newDriver()
  await d.init()
  assert.ok(calls.some((c) => c.method === "getMe"))
  const key = indexKey(ADD.bot_token, ADD.chat_id)
  assert.ok(__dbSnapshot()[key] !== undefined, "索引行应被创建")
  assert.deepEqual(parseIndex(__dbSnapshot()[key]), { v: INDEX_VERSION, dirs: {} })
})

test("init 缺少凭据时报错，且不泄露 token", async () => {
  __resetDb()
  resetApi()
  const d = new DriverTelegram({ bot_token: "", chat_id: "" }, MEM.store)
  await assert.rejects(() => d.init(), (e: Error) => {
    assert.match(e.message, /bot_token/)
    assert.ok(!e.message.includes("123456"), "错误信息不得回显 token")
    return true
  })
})

test("put 后 list 能看到文件，且 raw_url 为空以走 createReadStream", async () => {
  __resetDb()
  resetApi()
  const d = newDriver()
  await d.init()

  await d.put("", "/hello.txt", Buffer.from("hello"))
  const items = await d.list("", "/")
  assert.equal(items.length, 1)
  assert.equal(items[0].name, "hello.txt")
  assert.equal(items[0].is_dir, false)
  assert.equal(items[0].size, 5)
  assert.equal(items[0].raw_url, "", "不得缓存会过期的 Telegram 直链")
  assert.ok(calls.some((c) => c.method === "sendDocument"))
})

test("目录优先排序，且同层按名称排序", async () => {
  __resetDb()
  resetApi()
  const d = newDriver()
  await d.init()
  await d.put("", "/b.txt", Buffer.from("b"))
  await d.put("", "/a.txt", Buffer.from("a"))
  await d.mkdir("", "/zdir")
  await d.mkdir("", "/adir")
  const names = (await d.list("", "/")).map((i) => i.name)
  assert.deepEqual(names, ["adir", "zdir", "a.txt", "b.txt"])
})

test("mkdir / rename / remove 的索引语义", async () => {
  __resetDb()
  resetApi()
  const d = newDriver()
  await d.init()

  await d.mkdir("", "/docs")
  await d.mkdir("", "/docs/empty")
  assert.deepEqual((await d.list("", "/docs")).map((i) => i.name), ["empty"])

  await d.rename("", "/docs", "papers")
  assert.deepEqual((await d.list("", "/")).map((i) => i.name), ["papers"])
  assert.deepEqual((await d.list("", "/papers")).map((i) => i.name), ["empty"])

  await d.remove("", "/", ["papers"])
  assert.deepEqual((await d.list("", "/")).map((i) => i.name), [])
})

test("目录改名时后代路径整体迁移", async () => {
  __resetDb()
  resetApi()
  const d = newDriver()
  await d.init()
  await d.mkdir("", "/a")
  await d.mkdir("", "/a/b")
  await d.mkdir("", "/a/b/c")
  await d.put("", "/a/b/c/f.txt", Buffer.from("x"))

  await d.rename("", "/a", "z")

  assert.deepEqual((await d.list("", "/z/b/c")).map((i) => i.name), ["f.txt"])
  const key = indexKey(ADD.bot_token, ADD.chat_id)
  assert.deepEqual(Object.keys(parseIndex(__dbSnapshot()[key]).dirs).sort(), [
    "", "/z", "/z/b", "/z/b/c",
  ])
})

test("删除目录会递归删除其中所有文件的 Telegram 消息", async () => {
  __resetDb()
  resetApi()
  const d = newDriver()
  await d.init()
  await d.mkdir("", "/tree")
  await d.mkdir("", "/tree/sub")
  await d.put("", "/tree/one.txt", Buffer.from("1"))
  await d.put("", "/tree/sub/two.txt", Buffer.from("2"))

  calls.length = 0
  await d.remove("", "/", ["tree"])

  const deleted = calls.filter((c) => c.method === "deleteMessage")
  assert.equal(deleted.length, 2, "两条文件消息都应被删除")
  const key = indexKey(ADD.bot_token, ADD.chat_id)
  assert.deepEqual(Object.keys(parseIndex(__dbSnapshot()[key]).dirs), [], "删空后索引不应残留空目录键")
})

test("root_path 把驱动挂到聊天的子目录下", async () => {
  __resetDb()
  resetApi()
  const d = newDriver("/vault")
  await d.init()

  await d.put("", "/vault/a.txt", Buffer.from("a"))
  const key = indexKey(ADD.bot_token, ADD.chat_id)
  assert.deepEqual(Object.keys(parseIndex(__dbSnapshot()[key]).dirs).sort(), [""])

  // 挂载点之下可见；挂载点之外不可见
  assert.deepEqual((await d.list("", "/vault")).map((i) => i.name), ["a.txt"])
  await assert.rejects(() => d.list("", "/other"), /不在 root_path/)
})

test("同名覆盖上传会删除旧消息，不留孤儿", async () => {
  __resetDb()
  resetApi()
  const d = newDriver()
  await d.init()
  await d.put("", "/x.txt", Buffer.from("first"))
  calls.length = 0
  await d.put("", "/x.txt", Buffer.from("second"))
  assert.equal(calls.filter((c) => c.method === "deleteMessage").length, 1)
  const items = await d.list("", "/")
  assert.equal(items.length, 1)
  assert.equal(items[0].size, 6)
})

test("拒绝非法文件名与同名冲突", async () => {
  __resetDb()
  resetApi()
  const d = newDriver()
  await d.init()
  await d.mkdir("", "/a")
  await assert.rejects(() => d.mkdir("", "/a"), /已存在/)
  await assert.rejects(() => d.mkdir("", "/.."), /非法名称/)
  await assert.rejects(() => d.mkdir("", "/" + "x".repeat(300)), /过长/)
})

test("copy 目录保留空目录，并使用新 message_id/file_id", async () => {
  __resetDb()
  resetApi()
  const d = newDriver()
  await d.init()
  await d.mkdir("", "/src")
  await d.mkdir("", "/src/empty")       // 空目录：最容易在复制中丢失
  await d.mkdir("", "/src/withfile")
  await d.put("", "/src/withfile/f.bin", Buffer.from("data"))
  await d.mkdir("", "/dst")

  await d.copy("", "/dst", ["src"], "/", "/dst")

  assert.deepEqual((await d.list("", "/dst/src")).map((i) => i.name).sort(), [
    "empty",
    "withfile",
  ])
  const copied = await d.list("", "/dst/src/withfile")
  assert.equal(copied.length, 1)
  // 源与目标的 message_id 必须不同（确实发生了 Telegram 侧复制）
  const srcItems = await d.list("", "/src/withfile")
  assert.notEqual(copied[0].sign, srcItems[0].sign)

  // 删除源后，目标副本仍在
  await d.remove("", "/", ["src"])
  assert.equal((await d.list("", "/dst/src/withfile")).length, 1)
})

test("move = copy + remove，源目录不再保留", async () => {
  __resetDb()
  resetApi()
  const d = newDriver()
  await d.init()
  await d.mkdir("", "/from")
  await d.mkdir("", "/to")
  await d.put("", "/from/a.txt", Buffer.from("aa"))

  await d.move("", "/to", ["a.txt"], "/from", "/to")
  assert.deepEqual((await d.list("", "/to")).map((i) => i.name), ["a.txt"])
  assert.deepEqual((await d.list("", "/from")).map((i) => i.name), [])
})

test("超过 20MB 的文件在 list 中就给出明确原因", async () => {
  __resetDb()
  resetApi()
  const d = newDriver()
  await d.init()
  await d.put("", "/big.bin", Buffer.alloc(21 * 1024 * 1024))
  const items = await d.list("", "/")
  assert.equal(items.length, 1)
  assert.match(items[0].raw_url_error || "", /20MB/)
})

test("createReadStream 取新鲜直链并透传 Range", async () => {
  __resetDb()
  resetApi()
  const d = newDriver()
  await d.init()
  await d.put("", "/r.txt", Buffer.from("hello"))

  let seenUrl = ""
  let seenHeaders: any = null
  g.fetch = async (url: string, init?: any) => {
    if (String(url).includes("/file/bot")) {
      seenUrl = url
      seenHeaders = init?.headers
      return new Response("hello", { status: 206 })
    }
    return fakeFetch(url, init)
  }
  await d.createReadStream("/r.txt", { start: 0, end: 2 })
  assert.match(seenUrl, /\/file\/bot.*\/documents\/file_1\.txt$/)
  assert.equal(seenHeaders.Range, "bytes=0-2")
  g.fetch = fakeFetch
})

test("错误信息中不出现 bot_token", async () => {
  __resetDb()
  resetApi()
  const d = newDriver()
  await d.init()
  g.fetch = async () => err("Bad Request: chat not found")
  await assert.rejects(
    () => d.put("", "/z.txt", Buffer.from("z")),
    (e: Error) => {
      assert.ok(!e.message.includes("123456"), "不得回显 token: " + e.message)
      assert.ok(!e.message.includes("AAtest"), "不得回显 token: " + e.message)
      assert.match(e.message, /chat not found/)
      return true
    },
  )
  g.fetch = fakeFetch
})