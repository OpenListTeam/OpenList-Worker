import assert from "node:assert/strict"

import { test } from "node:test"
import { Hono } from "hono"
import { setupRouter } from "./router"
import { getStoreStatus } from "../internal/model/store/backend"

/**
 * 三条常见部署约束的回归测试。
 *
 * 背景：部署文档给出三条「必须满足」的约束，但检查逻辑此前有两处与之不符：
 *
 *   1. blob 只支持 map（blob 是「整存整取的单文档」存储，摊平成多条键的 key
 *      格式在 blob 上写不出、也 list 不出真实结构）。
 *      旧实现只做「能力探测」（有没有 get/put/delete/list），因此 blob + key
 *      被误判为合法组合，要等到真正读写才炸。
 *
 *   2. JWT_SECRET「必须手动配置」其实不准确 —— 支持自动生成并持久化。
 *      但旧实现存在**自死锁**：`ready = storageAvailable && jwtReady`，
 *      而自动生成只在提交初始化时执行，向导却被 ready 挡住进不到那一步；
 *      且 JWT 侧读的是 openlist_jwt_secret、自动生成写的是
 *      openlist_encryption_secret，两个槽位名不同 → 「自动生成」永远不可见。
 *
 *   3. 合法的「驱动 × 格式」矩阵应只有：
 *        blob + map
 *        kv / cfkv + map / key
 *        d1 / do / mysql + map / key / sql
 *      其余皆为无效组合。
 */

const JWT = "0123456789abcdef0123456789abcdef"

const buildApp = () => {
  const api = new Hono()
  setupRouter(api)
  const app = new Hono()
  app.route("/api", api)
  return app
}

function fakeKv() {
  const store = new Map<string, string>()
  return {
    __store: store,
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
    __store: store,
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

// ─────────────────────────────────────────────────────────────────────────────
// 约束 1：blob 只支持 map
// ─────────────────────────────────────────────────────────────────────────────

test("blob + map：合法组合（ESA_BLOB 已绑定时不应报组合错误）", async () => {
  const env: any = {
    DB_DRIVER: "blob",
    DB_FORMAT: "map",
    JWT_SECRET: JWT,
    ESA_BLOB: fakeBlob(),
  }
  const status = await getStoreStatus(env)
  assert.notEqual(
    status.configErrorCode,
    "INVALID_COMBINATION",
    "blob + map 是文档明确支持的组合，不得判为非法",
  )
})

test("blob + key：必须判为 INVALID_COMBINATION（blob 是单文档存储，不支持 key）", async () => {
  const env: any = {
    DB_DRIVER: "blob",
    DB_FORMAT: "key",
    JWT_SECRET: JWT,
    ESA_BLOB: fakeBlob(),
  }

  const status = await getStoreStatus(env)
  assert.equal(
    status.configErrorCode,
    "INVALID_COMBINATION",
    "blob 只支持 map；key 会把对象摊平成多条键，而 blob 只能整存整取",
  )
  assert.match(String(status.configError), /DB_FORMAT="key"/)
  // 支持列表必须精确到该驱动，而不是笼统的「map | key」
  assert.match(
    String(status.configError),
    /supports: map/,
    "错误里必须指出 blob 只支持 map",
  )

  const res = await buildApp().request(
    "/api/public/env_check",
    { method: "GET" },
    env,
  )
  const data = (await res.json()).data
  assert.equal(data.ready, false, "无效组合不得被报告为就绪")

  const issue = data.issues.find(
    (i: any) => i.code === "STORAGE_INVALID_COMBINATION",
  )
  assert.ok(issue, "必须给出 STORAGE_INVALID_COMBINATION")
  // 约束 4：必须带一句话修复建议（此前该分支 suggestion 为 null）
  assert.ok(
    issue.suggestion && String(issue.suggestion).length > 0,
    "无效组合必须给出「改成什么」的建议，否则用户只知道错、不知道怎么办",
  )
  assert.match(String(issue.suggestion), /DB_FORMAT=map/)
})

test("blob + sql：必须判为 INVALID_COMBINATION", async () => {
  const env: any = {
    DB_DRIVER: "blob",
    DB_FORMAT: "sql",
    JWT_SECRET: JWT,
    ESA_BLOB: fakeBlob(),
  }
  const status = await getStoreStatus(env)
  assert.equal(status.configErrorCode, "INVALID_COMBINATION")
})

// ─────────────────────────────────────────────────────────────────────────────
// 约束 3：合法「驱动 × 格式」矩阵
// ─────────────────────────────────────────────────────────────────────────────

test("合法矩阵：仅文档列出的组合被接受，其余皆 INVALID_COMBINATION", async () => {
  // 每个驱动都在 env 里把所需 binding/凭据全部提供，确保「拒绝」只可能来自
  // 组合校验本身，而不是驱动不可用（DRIVER_UNAVAILABLE）等其它原因。
  const baseEnv: any = {
    JWT_SECRET: JWT,
    ESA_BLOB: fakeBlob(),
    KV: fakeKv(),
    DB: {
      prepare: () => ({
        bind: () => ({ all: async () => ({ results: [] }), run: async () => ({}) }),
      }),
      batch: async () => [],
      dump: async () => new ArrayBuffer(0),
      exec: async () => ({ count: 0 }),
    },
    DO: { idFromName: (n: string) => n, get: () => ({ fetch: async () => new Response("{}") }) },
    CF_ACCOUNT: "acct",
    CF_KV_UUID: "uuid",
    CF_API_KEY: "key",
    MYSQL_URLS: "mysql://u:p@h:3306/d",
  }

  const expected: Record<string, string[]> = {
    blob: ["map"],
    kv: ["map", "key"],
    cfkv: ["map", "key"],
    d1: ["map", "key", "sql"],
    do: ["map", "key", "sql"],
    mysql: ["map", "key", "sql"],
  }

  for (const [driver, allowed] of Object.entries(expected)) {
    for (const format of ["map", "key", "sql"]) {
      const env = { ...baseEnv, DB_DRIVER: driver, DB_FORMAT: format }
      const status = await getStoreStatus(env)
      const isInvalid = status.configErrorCode === "INVALID_COMBINATION"
      const shouldBeValid = allowed.includes(format)
      assert.equal(
        isInvalid,
        !shouldBeValid,
        `${driver} + ${format}：期望 ${shouldBeValid ? "合法" : "非法"}，` +
          `实际 configErrorCode=${status.configErrorCode}`,
      )
    }
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// 约束 2：JWT_SECRET 可自动生成，不应阻断安装
// ─────────────────────────────────────────────────────────────────────────────

test("未配置 JWT_SECRET：ready 仍应为 true（存储可用即可开始安装）", async () => {
  const env: any = {
    DB_DRIVER: "kv",
    DB_FORMAT: "map",
    KV: fakeKv(),
    // 故意不配 JWT_SECRET
  }

  const res = await buildApp().request(
    "/api/public/env_check",
    { method: "GET" },
    env,
  )
  const data = (await res.json()).data

  assert.equal(
    data.ready,
    true,
    "ready 只表示「存储就绪、可以开始安装」。若把 jwtReady 也算进去，会形成" +
      "自死锁：自动生成密钥只在提交初始化时执行，而向导被 ready 挡住进不到那一步",
  )
  assert.equal(data.jwt.ready, false, "密钥确实尚未就绪，UI 仍需提示")

  const issue = data.issues.find((i: any) => i.code === "JWT_SECRET_MISSING")
  assert.ok(issue, "仍要给出提示，让用户知道可以手动配置更稳妥")
  assert.equal(
    issue.level,
    "warning",
    "缺密钥不是 error：存储可用时 setup 会自动生成并持久化",
  )
  assert.match(String(issue.suggestion), /let setup generate one/)
})

test("未配置 JWT_SECRET：初始化成功后必须自动生成并持久化密钥", async () => {
  const kv = fakeKv()
  const env: any = {
    DB_DRIVER: "kv",
    DB_FORMAT: "map",
    KV: kv,
    // 故意不配 JWT_SECRET
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

  assert.equal(res.status, 200, "未配置 JWT_SECRET 不应阻断初始化")

  // 自动生成的密钥必须落到加密密钥槽位，并被 JWT 侧可见（否则就是
  // 「看着生成了、实际没生效」：JWT 侧读的是另一个槽位名）。
  const generated = kv.__store.get("openlist_encryption_secret")
  assert.ok(
    generated && generated.length > 0,
    "setup 必须把自动生成的密钥持久化到 openlist_encryption_secret",
  )

  // 再来一次 env_check：此时密钥已就绪
  const after = await buildApp().request(
    "/api/public/env_check",
    { method: "GET" },
    env,
  )
  const afterData = (await after.json()).data
  assert.equal(
    afterData.jwt.ready,
    true,
    "自动生成之后，jwt.ready 必须变为 true —— 这正是「自动生成是否真的生效」的判定",
  )
  assert.equal(afterData.jwt.source, "env-or-persisted")

  // 关键不变量：JWT 侧实际使用的密钥必须**就是** setup 生成的那把。
  // 历史 bug：JWT 读 openlist_jwt_secret、setup 写
  // openlist_encryption_secret —— 两个槽位名不同，于是 JWT 侧看不到生成结果，
  // 又自己生成一把写入另一个槽位。结果是「生成了一份，却有两把在漂移」，
  // 多实例验签互相失败、冷启动即换钥。这里直接比对密钥值。
  const { getJwtSecret, resetJwtSecretCache } = await import("./middlewares")
  resetJwtSecretCache()
  const jwtSecret = await getJwtSecret({ env })
  assert.equal(
    jwtSecret,
    generated,
    "JWT 签名密钥必须复用 setup 自动生成的密钥，而不是另起一把" +
      "（同名密钥分离会导致「自动生成看着生效、实际验签失败」）",
  )
})
