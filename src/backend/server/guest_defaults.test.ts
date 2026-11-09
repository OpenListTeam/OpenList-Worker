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
import { isGuestAllowed } from "../pkg/permission"

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

test("默认库：guest 默认禁用，但 allow_guest 默认行仍为 true（存量兼容）", () => {
  const guest = defaultDb.users.find((u: any) => u.username === "guest")
  assert.equal(guest?.disabled, true, "新装默认不应启用 guest")

  const row = defaultDb.settings.find((s: any) => s.key === "allow_guest")
  assert.ok(row, "allow_guest 必须作为正式设置项存在（否则管理界面无法开关）")
  assert.equal(row.value, "true", "存量库补该行时不能被静默改成必须登录")
  assert.equal(row.group, 1)
  assert.equal(row.type, "bool")
})

test("新装（ADMIN_PASS 首启）：guest 禁用 + allow_guest=false，匿名 401", async () => {
  const env = await freshEnv()
  env.ADMIN_PASS = "admin123"

  const { db } = await getOrInitUsers(env)
  const guest = (db.users || []).find((u: any) => u.username === "guest")
  assert.equal(guest?.disabled, true)
  assert.equal(isGuestAllowed(db.settings), false, "新装应默认关闭匿名访客")

  // 必须真的落盘：清掉模块缓存后重新读取，不能只是内存里的默认值
  __resetDbCacheForTest()
  const reloaded = await getDb(env)
  assert.equal(
    isGuestAllowed(reloaded.settings),
    false,
    "初始化写入的 allow_guest=false 必须持久化",
  )

  const app = new Hono()
  app.route("/api/fs", fsRouter)
  app.route("/api/public", publicRouter)

  const list = await app.request(
    "/api/fs/list",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: "/" }),
    },
    env,
  )
  assert.equal(list.status, 401)

  const settings = await app.request("/api/public/settings", {}, env)
  const body: any = await settings.json()
  assert.equal(body.data.allow_guest, "false")

  assert.equal(await getUserFromContext(anonContext(env)), null)
})

test("存量库升级（无 allow_guest 行、guest 启用）：仍按允许处理，不被强制登录", async () => {
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
  assert.equal(isGuestAllowed(db.settings), true, "存量库升级后不应被静默改成必须登录")
  assert.equal((await getUserFromContext(anonContext(env)))?.username, "guest")
})

test("新装（安装向导 init/setup）：完成后 allow_guest=false，匿名 401", async () => {
  const env = await freshEnv()
  const app = new Hono()
  app.route("/api/public", publicRouter)
  app.route("/api/fs", fsRouter)

  const res = await app.request(
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
  assert.equal(isGuestAllowed(db.settings), false, "setup 完成后必须关闭匿名访客")
  assert.equal(
    (db.users || []).find((u: any) => u.username === "guest")?.disabled,
    true,
  )

  const list = await app.request(
    "/api/fs/list",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: "/" }),
    },
    env,
  )
  assert.equal(list.status, 401)
})
