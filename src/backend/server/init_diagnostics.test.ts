import assert from "node:assert/strict"
import { test } from "node:test"
import { Hono } from "hono"
import { setupRouter } from "./router"
import { getStoreStatus } from "../internal/model/store/backend"

/**
 * 「问题必须能被用户看见」的回归测试。
 *
 * 历史现象：环境自检显示一切正常（ready=true），初始化却返回一个没有原因的
 * 500；用户既不知道是组合写错、绑定没配，还是后端读不到。
 *
 * 因此这里锁定三件事：
 *   1. 无效「驱动 × 格式」组合被识别为 INVALID_COMBINATION 并给出支持列表；
 *   2. 驱动不可用时错误里写明需要什么（逐驱动提示）；
 *   3. 这些原因通过 /env_check（issue + error_code）与 /init_status
 *      （storage_error / db_load_error）以及 /init/setup 的 data.code/reason
 *      透给前端。
 */

const JWT = "0123456789abcdef0123456789abcdef"

const buildApp = () => {
  const api = new Hono()
  setupRouter(api)
  const app = new Hono()
  app.route("/api", api)
  return app
}

const jsonPost = (body: any) =>
  ({
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  }) as any

function fakeKv() {
  const store = new Map<string, string>()
  return {
    get: async (k: string) => store.get(k) ?? null,
    put: async (k: string, v: string) => {
      store.set(k, String(v))
      return true
    },
    delete: async (k: string) => {
      store.delete(k)
    },
    list: async () => ({ keys: [...store.keys()] }),
  }
}

function fakeBlob() {
  const store = new Map<string, string>()
  return {
    get: async (k: string) => {
      const v = store.get(k)
      return v === undefined ? null : { text: async () => v }
    },
    put: async (k: string, v: string) => {
      store.set(k, String(v))
    },
    delete: async (k: string) => {
      store.delete(k)
    },
    head: async (k: string) => (store.has(k) ? { key: k } : null),
    list: async () => ({ keys: [...store.keys()].map((name) => ({ name })) }),
  }
}

test("无效组合：env_check 必须给出 STORAGE_INVALID_COMBINATION 与具体原因", async () => {
  const env: any = {
    DB_DRIVER: "kv",
    DB_FORMAT: "sql",
    JWT_SECRET: JWT,
    KV: fakeKv(),
  }

  // 解析阶段就该拒绝，并说明该驱动支持哪些格式
  const status = await getStoreStatus(env)
  assert.equal(status.configErrorCode, "INVALID_COMBINATION")
  assert.match(String(status.configError), /Invalid storage combination/)
  assert.match(String(status.configError), /DB_FORMAT="sql"/)
  assert.match(String(status.configError), /supports: map \| key/)

  const res = await buildApp().request("/api/public/env_check", { method: "GET" }, env)
  const data = (await res.json()).data
  assert.equal(data.ready, false, "非法组合不得被报告为就绪")
  assert.equal(data.storage.available, false)
  assert.equal(data.storage.error_code, "INVALID_COMBINATION")
  assert.match(String(data.storage.error_message), /Invalid storage combination/)

  const issue = data.issues.find(
    (i: any) => i.code === "STORAGE_INVALID_COMBINATION",
  )
  assert.ok(issue, "必须给出专门的 issue 代码，而不是笼统的配置错误")
  assert.match(String(issue.message), /Unsupported storage combination/)
  assert.ok(String(issue.docUrl).startsWith("http"))
})

test("无效组合：init/setup 的 500 必须带上 code 与 reason（契约文案不变）", async () => {
  const env: any = {
    DB_DRIVER: "blob",
    DB_FORMAT: "sql",
    JWT_SECRET: JWT,
    ESA_BLOB: fakeBlob(),
  }

  const res = await buildApp().request(
    "/api/public/init/setup",
    jsonPost({ username: "admin", password: "admin1234" }),
    env,
  )
  assert.equal(res.status, 500)
  const json: any = await res.json()
  assert.equal(
    json.message,
    "database is not readable; refusing to initialize to avoid overwriting existing config",
    "对外 message 保持兼容",
  )
  assert.equal(json.data?.code, "INVALID_COMBINATION")
  assert.match(String(json.data?.reason), /Invalid storage combination/)
  assert.match(
    String(json.data?.reason),
    /d1 \| do \| mysql/,
    "reason 要包含可操作的修复方向",
  )

  // 前端还可以通过轮询 init_status 拿到同一原因
  const st = (await (
    await buildApp().request("/api/public/init_status", { method: "GET" }, env)
  ).json()).data
  assert.match(String(st.db_load_error), /Invalid storage combination/)
})

test("驱动不可用：错误必须写明该驱动需要什么（d1 示例）", async () => {
  const env: any = { DB_DRIVER: "d1", DB_FORMAT: "map", JWT_SECRET: JWT }

  const status = await getStoreStatus(env)
  assert.equal(status.configErrorCode, "DRIVER_UNAVAILABLE")
  assert.match(String(status.configError), /d1_databases/)

  const data = (await (
    await buildApp().request("/api/public/env_check", { method: "GET" }, env)
  ).json()).data
  assert.equal(data.storage.error_code, "DRIVER_UNAVAILABLE")
  assert.match(String(data.storage.error_message), /d1_databases/)
  assert.ok(
    data.issues.some((i: any) => i.code === "STORAGE_CONFIG_ERROR"),
    "驱动不可用仍归为配置错误",
  )
})

test("驱动不可用：错误里必须给出「auto 会选谁」的可操作答案", async () => {
  // kv 不可用，但 Blob 可用 → 应直接建议 DB_DRIVER=blob，用户抄一下即可
  const env: any = {
    DB_DRIVER: "kv",
    DB_FORMAT: "map",
    JWT_SECRET: JWT,
    ESA_BLOB: fakeBlob(),
  }

  const status = await getStoreStatus(env)
  assert.equal(status.configErrorCode, "DRIVER_UNAVAILABLE")
  assert.match(
    String(status.configError),
    /Auto-detection would pick: DB_DRIVER=blob/,
    "必须告诉用户改成什么（而不是让他自己猜）",
  )
})

test("init_status：存储配置错误时必须返回 storage_error，而不是无声的 false", async () => {
  const env: any = {
    DB_DRIVER: "blob",
    DB_FORMAT: "sql",
    JWT_SECRET: JWT,
    ESA_BLOB: fakeBlob(),
  }
  const data = (await (
    await buildApp().request("/api/public/init_status", { method: "GET" }, env)
  ).json()).data

  assert.equal(data.initialized, false)
  assert.equal(data.ready, false)
  assert.match(
    String(data.storage_error),
    /Invalid storage combination/,
    "前端据此解释「为什么不能初始化」",
  )
})

test("init_status：存储正常时 storage_error 必须为 null（不产生误导）", async () => {
  const env: any = {
    DB_DRIVER: "kv",
    DB_FORMAT: "map",
    JWT_SECRET: JWT,
    KV: fakeKv(),
  }
  const data = (await (
    await buildApp().request("/api/public/init_status", { method: "GET" }, env)
  ).json()).data
  assert.equal(data.storage_error, null)
})
