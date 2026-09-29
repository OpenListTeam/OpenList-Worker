import assert from "node:assert/strict"
import { test } from "node:test"
import { Hono } from "hono"
import { setupRouter } from "./router"

/**
 * 专用回归测试：EdgeOne / ESA Blob + DB_FORMAT=map 的空存储首次初始化。
 *
 * 为什么单独一个文件：`memoryDb` / `dbTrusted` 是 isolate 级模块状态（与线上
 * 一致），同一进程里先跑过「已初始化」的用例后，新的空后端会被判定为
 * 「可信快照仍存在」而复用旧快照（init/setup 于是返回 400 already initialized）。
 * 独立文件 = 独立进程，才能精确复现「全新部署第一次访问」的初始状态。
 *
 * 被锁定的行为（issue #62 现象 3 的 EdgeOne 分支）：
 *   Blob 的 get 在键不存在时返回 null（不抛错）→ loadDb 认为是
 *   「读取成功但后端为空」→ 必须放行初始化，而不是 500 死锁。
 */
const buildApp = () => {
  const api = new Hono()
  setupRouter(api)
  const app = new Hono()
  app.route("/api", api)
  return app
}

/** ESA Blob 形态的替身：get 返回 Response 形态对象，键不存在时返回 null。 */
function fakeBlob() {
  const store = new Map<string, string>()
  return {
    __store: store,
    get: async (key: string) => {
      const v = store.get(key)
      return v === undefined ? null : { text: async () => v }
    },
    put: async (key: string, value: string) => {
      store.set(key, String(value))
    },
    delete: async (key: string) => {
      store.delete(key)
    },
    head: async (key: string) => (store.has(key) ? { key } : null),
    list: async () => ({ keys: [...store.keys()].map((name) => ({ name })) }),
  }
}

test("EO/ESA Blob + map：全新空存储的首次初始化必须成功", async () => {
  const env: any = {
    DB_DRIVER: "blob",
    DB_FORMAT: "map",
    JWT_SECRET: "0123456789abcdef0123456789abcdef",
    ESA_BLOB: fakeBlob(),
  }

  const res = await buildApp().request(
    "/api/public/init/setup",
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ username: "admin", password: "admin1234" }),
    } as any,
    env,
  )

  assert.equal(
    res.status,
    200,
    "Blob 空存储必须先能通过向导初始化，否则会退化为永远无法安装",
  )
  assert.equal(
    env.ESA_BLOB.__store.has("openlist_config"),
    true,
    "初始化必须真正写入 Blob",
  )

  // 写入后同一实例应能读到已初始化的库。
  const status = await buildApp().request(
    "/api/public/init_status",
    { method: "GET" },
    env,
  )
  assert.equal((await status.json()).data.initialized, true)
})
