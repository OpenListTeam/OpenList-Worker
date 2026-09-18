import assert from "node:assert/strict"
import { test } from "node:test"
import { Hono } from "hono"
import { setupRouter } from "./router"
import { uiStorageError } from "./public"
import {
  getStoreConfigErrorDetail,
  getStoreStatus,
} from "../internal/model/store/backend"

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
  // kv 不可用，但 Blob 可用。默认会降级（见下一条测试），这里用
  // DB_DRIVER_STRICT 关掉降级，专门校验「硬失败时也说得清改成什么」。
  const env: any = {
    DB_DRIVER: "kv",
    DB_FORMAT: "map",
    JWT_SECRET: JWT,
    ESA_BLOB: fakeBlob(),
    DB_DRIVER_STRICT: "true",
  }

  const status = await getStoreStatus(env)
  assert.equal(status.configErrorCode, "DRIVER_UNAVAILABLE")
  assert.match(
    String(status.configError),
    /Auto-detection would pick: DB_DRIVER=blob/,
    "必须告诉用户改成什么（而不是让他自己猜）",
  )
})

test("驱动不可用：截断展示的文案里也必须保留「改成什么」+ 结构化建议", async () => {
  // 前端只拿到截断后的 error_message / issue.message（见 public.ts 的
  // reasonLines：配置类错误只透传前 3 行）。若「Auto-detection would pick」
  // 被排在 message 末尾，用户看到的仍是一段被砍断的说明 —— 这正是「提示不友好」
  // 的根因，因此这里同时锁定顺序与建议字段。
  const env: any = {
    DB_DRIVER: "kv",
    DB_FORMAT: "map",
    JWT_SECRET: JWT,
    ESA_BLOB: fakeBlob(),
    DB_DRIVER_STRICT: "true",
  }

  const data = (await (
    await buildApp().request("/api/public/env_check", { method: "GET" }, env)
  ).json()).data

  assert.match(
    String(data.storage.error_message),
    /Auto-detection would pick: DB_DRIVER=blob/,
    "答案必须落在被透传的前 3 行里，否则前端看到的还是一段被砍断的说明",
  )
  assert.match(String(data.storage.suggestion), /DB_DRIVER=blob/)

  const issue = data.issues.find((i: any) => i.code === "STORAGE_CONFIG_ERROR")
  assert.ok(issue)
  assert.match(
    String(issue.suggestion),
    /DB_DRIVER=blob/,
    "issue 必须带可展示的一行建议",
  )
  assert.ok(
    !String(issue.suggestion).includes("\n"),
    "建议必须是单行短句，否则又变成一段长文",
  )

  // 安装向导只有 init_status 可用（其余接口被 503 拦截），它也要带上建议
  const st = (await (
    await buildApp().request("/api/public/init_status", { method: "GET" }, env)
  ).json()).data
  assert.match(String(st.storage_suggestion), /DB_DRIVER=blob/)
})

test("503 拦截层：文案形状为「截断原因 + 单行建议」", async () => {
  // 全局中间件用 uiStorageError 组装 data.reason / data.suggestion，
  // 与诊断接口共用同一套截断规则，避免两处粒度漂移。
  const env: any = {
    DB_DRIVER: "kv",
    DB_FORMAT: "map",
    JWT_SECRET: JWT,
    ESA_BLOB: fakeBlob(),
    DB_DRIVER_STRICT: "true",
  }
  const detail = await getStoreConfigErrorDetail(env, { silent: true })
  const ui = uiStorageError(detail)

  assert.match(String(ui.reason), /Auto-detection would pick: DB_DRIVER=blob/)
  assert.match(String(ui.suggestion), /DB_DRIVER=blob/)
})

test("显式驱动不可用但有可用后端：必须先降级保站点可用，而不是整站 503", async () => {
  // 复现 issue #62 的核心场景：CF 上只配了 DB_DRIVER/DB_FORMAT/JWT_SECRET，
  // 写了 DB_DRIVER=kv 却没绑 KV namespace（D1/Blob 反而是可用的）。
  // 修前：每个 API 请求都被 503 拦截，前端反复重试、整站打不开。
  // 修后：降级到 auto 会选中的后端，站点可用；同时以 warning 暴露事实与建议。
  const env: any = {
    DB_DRIVER: "kv",
    DB_FORMAT: "map",
    JWT_SECRET: JWT,
    ESA_BLOB: fakeBlob(),
  }

  // 1) 不再是配置错误 → 全局 503 拦截不会再触发
  assert.equal(
    (await getStoreConfigErrorDetail(env, { silent: true })).message,
    null,
    "降级后不得再判定为配置错误（否则仍会 503 死循环）",
  )
  const status = await getStoreStatus(env)
  assert.equal(status.driver, "blob", "必须真的切到 auto 会选中的后端")
  assert.equal(status.fallback?.from, "kv")
  assert.equal(status.fallback?.to, "blob")

  // 2) 诊断接口：ready=true（可用），但必须给出 warning 级降级提示 + 建议
  const data = (await (
    await buildApp().request("/api/public/env_check", { method: "GET" }, env)
  ).json()).data
  assert.equal(data.ready, true, "站点必须可用")
  assert.equal(data.storage.available, true)
  assert.equal(data.storage.error_code, null, "不再有配置错误码")
  assert.equal(data.storage.fallback_from, "kv")
  assert.equal(data.storage.fallback_to, "blob")

  const warn = data.issues.find(
    (i: any) => i.code === "STORAGE_DRIVER_FALLBACK",
  )
  assert.ok(warn, "必须告知用户发生了降级")
  assert.equal(warn.level, "warning", "降级不是 error：站点可用")
  assert.match(String(warn.message), /falling back to the auto-detected backend/)
  assert.match(String(warn.suggestion), /DB_DRIVER=blob/)

  // 3) 安装向导同样能看到该提示
  const st = (await (
    await buildApp().request("/api/public/init_status", { method: "GET" }, env)
  ).json()).data
  assert.equal(st.storage_error, null)
  assert.match(String(st.storage_warning), /falling back/)
  assert.match(String(st.storage_suggestion), /DB_DRIVER=blob/)
})

test("DB_DRIVER_STRICT：写在 process.env 里同样生效（Node/EdgeOne 路径）", async () => {
  // aws-lambda 适配器把 c.env 设成 { event, requestContext, context }，
  // 控制台变量只出现在 process.env —— 开关若只读 env 就会静默失效。
  const env: any = {
    DB_DRIVER: "kv",
    DB_FORMAT: "map",
    JWT_SECRET: JWT,
    ESA_BLOB: fakeBlob(),
  }
  process.env.DB_DRIVER_STRICT = "true"
  try {
    const status = await getStoreStatus(env)
    assert.equal(
      status.configErrorCode,
      "DRIVER_UNAVAILABLE",
      "process.env 中的 DB_DRIVER_STRICT 必须能关掉降级",
    )
  } finally {
    delete process.env.DB_DRIVER_STRICT
  }
})

test("CF 场景：只配 DB_DRIVER/DB_FORMAT/JWT_SECRET 且已绑 D1，kv 写错也能正常用", async () => {
  // 用户实际报的场景：CF 上只设了 DB_DRIVER=kv、DB_FORMAT=map、JWT_SECRET，
  // 但没有 kv_namespaces 绑定（D1 是绑好的）。修前：全部 API 503，
  // 前端反复重试、整站打不开、日志不停刷同一条错误。
  const fakeD1 = {
    prepare: () => ({
      first: async () => ({ "1": 1 }),
      run: async () => ({}),
      all: async () => ({ results: [] }),
      bind: () => ({ first: async () => ({}), run: async () => ({}) }),
    }),
    batch: async () => [],
    exec: async () => ({}),
  }
  const env: any = {
    DB_DRIVER: "kv",
    DB_FORMAT: "map",
    JWT_SECRET: JWT,
    DB: fakeD1,
  }

  // 1) 不再判为配置错误 ⇒ 全局 503 拦截不触发，站点可正常打开与初始化
  assert.equal(
    (await getStoreConfigErrorDetail(env, { silent: true })).message,
    null,
    "配置失误不得再让整站 503",
  )

  // 2) 真的落到 D1 上（而不是内存/其它），且事实可被诊断接口看到
  const status = await getStoreStatus(env)
  assert.equal(status.driver, "d1")
  assert.equal(status.fallback?.from, "kv")
  assert.equal(status.fallback?.to, "d1")

  const data = (await (
    await buildApp().request("/api/public/env_check", { method: "GET" }, env)
  ).json()).data
  assert.equal(data.ready, true, "站点必须可用")
  assert.equal(data.storage.fallback_to, "d1")
  const warn = data.issues.find((i: any) => i.code === "STORAGE_DRIVER_FALLBACK")
  assert.ok(warn, "必须提示已降级")
  assert.match(String(warn.suggestion), /DB_DRIVER=d1/)
  assert.ok(
    !data.issues.some((i: any) => i.level === "error"),
    "降级不是错误：不应留下 error 级问题把向导卡住",
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
