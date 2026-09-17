import assert from "node:assert/strict"
import { test } from "node:test"
import { Hono } from "hono"
import { setupRouter } from "./router"

/**
 * 初始化流程回归测试（对应 issue #62）。
 *
 * 三个必须长期成立的不变量：
 *   1. 「读取持久化后端成功但为空」（全新部署）**必须允许** POST /init/setup，
 *      否则会出现「读不到 → 不许初始化 → 永远读不到」的死锁；
 *   2. 「读取持久化后端失败」**必须拒绝**初始化，避免把兜底空壳写回存储、
 *      覆盖真实配置（数据库被清空）；
 *   3. 配置了 ADMIN_PASS 时，安装页只轮询 /init_status 也应能完成初始化
 *      （否则表现为「配了 ADMIN_PASS 仍反复跳 /@init」）。
 */

const buildApp = () => {
  const api = new Hono()
  setupRouter(api)
  const app = new Hono()
  app.route("/api", api)
  return app
}

/** 一个符合 Web KV 形态、内容可控的 KV binding 替身。 */
function fakeKv(overrides: Partial<Record<"get" | "put" | "delete" | "list", any>> = {}) {
  const store = new Map<string, string>()
  return {
    __store: store,
    get: async (key: string) => store.get(key) ?? null,
    put: async (key: string, value: string) => {
      store.set(key, String(value))
      return true
    },
    delete: async (key: string) => {
      store.delete(key)
    },
    list: async () => ({ keys: [...store.keys()] }),
    ...overrides,
  }
}

function kvEnv(overrides: any = {}) {
  return {
    DB_DRIVER: "kv",
    DB_FORMAT: "map",
    JWT_SECRET: "0123456789abcdef0123456789abcdef",
    KV: fakeKv(),
    ...overrides,
  }
}

const setupRequest = (body: Record<string, any>) =>
  ({
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  }) as any

test("init/setup：全新空存储首次初始化必须成功并真正落盘", async () => {
  const env: any = kvEnv()
  const res = await buildApp().request(
    "/api/public/init/setup",
    setupRequest({ username: "admin", password: "admin1234", site_title: "My List" }),
    env,
  )

  assert.equal(
    res.status,
    200,
    "empty-but-readable backend must be initializable (issue #62 现象 3)",
  )
  const json: any = await res.json()
  assert.equal(json.code, 200)
  assert.equal(json.data, null)
  assert.equal(
    env.KV.__store.has("openlist_config"),
    true,
    "初始化必须真正写入持久化后端",
  )

  // 初始化完成后 init_status 必须报告已初始化 + 密钥就绪。
  const status = await buildApp().request(
    "/api/public/init_status",
    { method: "GET" },
    env,
  )
  const statusJson: any = await status.json()
  assert.equal(statusJson.data.initialized, true)
  assert.equal(statusJson.data.ready, true)
})

test("init/setup：读取持久化后端失败时必须拒绝（不得用空壳覆盖真实配置）", async () => {
  const env: any = kvEnv({
    KV: fakeKv({
      get: async () => {
        throw new Error("kv unreachable")
      },
    }),
  })

  const res = await buildApp().request(
    "/api/public/init/setup",
    setupRequest({ username: "admin", password: "admin1234" }),
    env,
  )

  assert.equal(res.status, 500, "read failure must still be rejected")
  const json: any = await res.json()
  assert.match(String(json.message), /not readable/)
})

test("init_status：配置 ADMIN_PASS 时，安装页轮询即可完成初始化", async () => {
  const env: any = kvEnv({ ADMIN_PASS: "auto-init-pass" })

  const res = await buildApp().request(
    "/api/public/init_status",
    { method: "GET" },
    env,
  )
  const json: any = await res.json()

  assert.equal(
    json.data.initialized,
    true,
    "ADMIN_PASS must take effect on the init page (issue #62 现象 2)",
  )
  assert.equal(
    env.KV.__store.has("openlist_config"),
    true,
    "自动初始化必须真正落盘",
  )

  // 幂等：再次轮询不应产生额外变化，也不应报错。
  const again = await buildApp().request(
    "/api/public/init_status",
    { method: "GET" },
    env,
  )
  assert.equal((await again.json()).data.initialized, true)
})

test("init_status：未配置 ADMIN_PASS 时不得写入占位库", async () => {
  const env: any = kvEnv()
  await buildApp().request("/api/public/init_status", { method: "GET" }, env)

  // 注：initialized 的取值不做断言 —— isolate 级内存里可能已有别的 env 建立
  // 过的可信快照（loadDb 会保留它以避免误判为「未初始化」），这是刻意行为。
  // 本用例只锁定「未配置 ADMIN_PASS 时不产生任何写入」这一不变量。
  assert.equal(
    env.KV.__store.size,
    0,
    "未配置 ADMIN_PASS 时应等待安装向导，而不是抢写未初始化的占位库",
  )
})

test("KV 探测日志：DB_DRIVER 为非 KV 驱动时不再输出误导性告警", async () => {
  // 该告警曾被误读为 500 的根因（审计日志等路径会触发 KV 探测）。
  // 对 d1 部署而言 KV 探测本就无关，不应再产生这条日志。
  const warns: string[] = []
  const original = console.warn
  console.warn = (...args: any[]) => {
    warns.push(args.map((a) => String(a)).join(" "))
  }
  try {
    const { getKvBinding } = await import("../internal/model/store/json")
    await getKvBinding({ DB_DRIVER: "d1" })
  } finally {
    console.warn = original
  }

  assert.equal(
    warns.some((w) => w.includes("no KV-style binding found")),
    false,
    "d1 部署不应看到 KV 探测告警",
  )
})
