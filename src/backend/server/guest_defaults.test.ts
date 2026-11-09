import assert from "node:assert/strict"
import { test } from "node:test"
import { Hono } from "hono"
import {
  __resetDbCacheForTest,
  defaultDb,
  getDb,
  saveDb,
} from "../internal/model/db"
import { memoryDriver } from "../internal/model/store/driver/memory"
import { getOrInitUsers } from "./auth"
import { getUserFromContext } from "./middlewares"
import { fsRouter } from "./fs"
import { publicRouter } from "./public"

const ADMIN_HASH = "a".repeat(64)

async function freshEnv() {
  for (const key of await memoryDriver.list("openlist_")) {
    await memoryDriver.delete(key)
  }
  __resetDbCacheForTest()
  return {} as any
}

function anonContext(env: any) {
  return {
    req: { header: () => undefined, query: () => undefined },
    env,
  } as any
}

function buildApp() {
  const app = new Hono()
  app.route("/api/fs", fsRouter)
  app.route("/api/public", publicRouter)
  return app
}

async function anonList(env: any) {
  const res = await buildApp().request(
    "/api/fs/list",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: "/" }),
    },
    env,
  )
  return res.status
}

test("默认库：guest 默认禁用，且不引入 Go 没有的 allow_guest 设置项", () => {
  const guest = defaultDb.users.find((u: any) => u.username === "guest")
  assert.equal(guest?.disabled, true, "新装默认不应启用 guest")

  const row = defaultDb.settings.find((s: any) => s.key === "allow_guest")
  assert.equal(row, undefined, "Go 版没有 allow_guest，默认设置里也不应有")
})

test("新装（ADMIN_PASS 首启）：guest 禁用，匿名 401", async () => {
  const env = await freshEnv()
  env.ADMIN_PASS = "admin123"

  const { db } = await getOrInitUsers(env)
  const guest = (db.users || []).find((u: any) => u.username === "guest")
  assert.equal(guest?.disabled, true)

  // 必须真的落盘：清掉模块缓存后重新读取，不能只是内存里的默认值
  __resetDbCacheForTest()
  const reloaded = await getDb(env)
  assert.equal(
    (reloaded.users || []).find((u: any) => u.username === "guest")?.disabled,
    true,
    "新装的 guest 禁用状态必须持久化",
  )

  assert.equal(await anonList(env), 401)
  assert.equal(await getUserFromContext(anonContext(env)), null)

  const settings = await buildApp().request(
    "/api/public/settings",
    { method: "GET" },
    env,
  )
  const body: any = await settings.json()
  assert.equal(body.data.allow_guest, undefined, "公开设置不应输出 allow_guest")
})

test("存量库升级（guest 启用）：不会被静默改成必须登录", async () => {
  const env = await freshEnv()
  await saveDb(
    {
      settings: [],
      users: [
        {
          id: 1,
          username: "admin",
          password: ADMIN_HASH,
          role: 2,
          permission: 0,
          base_path: "/",
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
      storages: [],
      shares: [],
      metas: [],
    } as any,
    env,
  )
  __resetDbCacheForTest()

  const db = await getDb(env)
  assert.equal(
    (db.users || []).find((u: any) => u.username === "guest")?.disabled,
    false,
    "存量库的 guest 状态不应被升级改动",
  )
  assert.equal((await getUserFromContext(anonContext(env)))?.username, "guest")
})

test("新装（安装向导 init/setup）：完成后 guest 仍禁用，匿名 401", async () => {
  const env = await freshEnv()

  const res = await buildApp().request(
    "/api/public/init/setup",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: "admin",
        password: "admin123",
        site_title: "Test",
      }),
    },
    env,
  )
  assert.equal(res.status, 200)

  __resetDbCacheForTest()
  const db = await getDb(env)
  assert.equal(
    (db.users || []).find((u: any) => u.username === "guest")?.disabled,
    true,
  )
  assert.equal(await anonList(env), 401)
})
